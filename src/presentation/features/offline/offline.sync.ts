import axios from "axios";
import { queryClient } from "@/config/query";
import { api } from "@/shared/api/http";
import { useAuthStore } from "@/presentation/features/auth/auth.store";
import type { Location } from "@/presentation/features/catalog/catalog.api";
import { createLoad } from "@/presentation/features/loads/loads.api";
import { offlineDB, type LocalLoad, type LocalStatus } from "./offline.db";

const leaseDuration = 90_000;
const batchSize = 15;
const statuses: LocalStatus[] = ["PENDING_SYNC", "SYNC_ERROR", "SYNCING"];
let active: Promise<boolean> | undefined;

function currentWriter(ownerId: string) {
  const { status, session } = useAuthStore.getState();
  return status === "authenticated" && session?.user.id === ownerId &&
    (session.user.role === "ADMIN" || session.user.role === "OPERATOR");
}

export async function refreshLocalLocations(ownerId: string, force = false): Promise<Location[]> {
  const cached = await offlineDB.locations.get(ownerId);
  if (!force && cached && Date.now() - cached.updatedAt < 180_000) return cached.locations;
  const locations: Location[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data } = await api.get<Location[]>("/locations", {
      expectedUserId: ownerId, params: { limit: 100, offset },
    });
    locations.push(...data.filter((point) => point.isActive).map(({ id, name, isActive }) => ({ id, name, isActive })));
    if (data.length < 100) break;
  }
  if (currentWriter(ownerId)) await offlineDB.locations.put({ ownerId, locations, updatedAt: Date.now() });
  return locations;
}

async function claim(id: string, ownerId: string) {
  return offlineDB.transaction("rw", offlineDB.loads, async () => {
    const entry = await offlineDB.loads.get(id);
    if (!entry?.input || entry.ownerId !== ownerId || !statuses.includes(entry.status)) return;
    const now = Date.now();
    if (entry.status === "SYNCING" && (entry.leaseUntil ?? 0) > now) return;
    if (entry.status === "SYNC_ERROR" && (entry.retryAt ?? 0) > now) return;
    const lease = { status: "SYNCING" as const, leaseId: crypto.randomUUID(), leaseUntil: now + leaseDuration };
    await offlineDB.loads.update(id, lease);
    return { ...entry, input: entry.input, ...lease };
  });
}

async function settle(id: string, leaseId: string, change: Partial<LocalLoad>) {
  await offlineDB.transaction("rw", offlineDB.loads, async () => {
    const entry = await offlineDB.loads.get(id);
    if (entry?.leaseId !== leaseId) return;
    await offlineDB.loads.update(id, {
      ...change, leaseId: undefined, leaseUntil: undefined, updatedAt: Date.now(),
    });
  });
}

async function run(ownerId: string) {
  if (!currentWriter(ownerId)) return false;
  try {
    const { data } = await api.get<{ status: string }>("/health/ready", { expectedUserId: ownerId, timeout: 4000 });
    if (data.status !== "ready") return false;
  } catch {
    return false;
  }
  try {
    await refreshLocalLocations(ownerId);
  } catch {
    // A failed location refresh does not discard the queue.
  }
  const entries = await offlineDB.loads.where("[ownerId+status]")
    .anyOf(statuses.map((status) => [ownerId, status])).toArray();
  let sent = 0;
  for (const item of entries.sort((a, b) => a.updatedAt - b.updatedAt)) {
    if (sent >= batchSize || !currentWriter(ownerId)) break;
    const entry = await claim(item.id, ownerId);
    if (!entry) continue;
    sent += 1;
    let saved;
    try {
      saved = await createLoad(entry.input, entry.id, ownerId);
      if (!saved?.id || !Number.isInteger(saved.orderNumber) || !saved.businessDate) {
        throw new Error("Respuesta de confirmación inválida.");
      }
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || axios.isCancel(error) || !currentWriter(ownerId)) {
        await settle(entry.id, entry.leaseId, { status: "PENDING_SYNC" });
        break;
      }
      if (status === 400 || status === 403 || status === 404 || status === 409 || status === 422) {
        const issue = status === 403 || status === 404
          ? "Revisa tu acceso y el estado del punto de embarque."
          : status === 400 ? "Revisa los datos del registro." : "Revisa el punto, los vehículos y los datos del catálogo.";
        await settle(entry.id, entry.leaseId, { status: "CONFLICT", issue, issueStatus: status });
        continue;
      }
      await settle(entry.id, entry.leaseId, { status: "SYNC_ERROR", issue: "El servidor todavía no confirmó el registro.", retryAt: Date.now() + 30_000 });
      break;
    }
    await settle(entry.id, entry.leaseId, {
      status: "SYNCED", input: undefined, issue: undefined, issueStatus: undefined, retryAt: undefined,
      locationName: saved.snapshot?.locationName || entry.locationName,
      official: { id: saved.id, orderNumber: saved.orderNumber, businessDate: saved.businessDate },
    });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["loads-list"] });
  }
  return true;
}

export function syncLocalLoads(ownerId: string) {
  active ??= run(ownerId).finally(() => { active = undefined; });
  return active;
}
