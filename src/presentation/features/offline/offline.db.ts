import Dexie, { type EntityTable } from "dexie";
import type { LoadInput } from "@/presentation/features/loads/loads.api";
import type { Location } from "@/presentation/features/catalog/catalog.api";

export type LocalStatus = "DRAFT" | "PENDING_SYNC" | "SYNCING" | "SYNCED" | "SYNC_ERROR" | "CONFLICT";

export type LocalLoad = {
  id: string;
  ownerId: string;
  locationId: string;
  locationName: string;
  status: LocalStatus;
  input?: LoadInput;
  updatedAt: number;
  leaseId?: string;
  leaseUntil?: number;
  retryAt?: number;
  issue?: string;
  issueStatus?: number;
  official?: { id: string; orderNumber: number; businessDate: string };
};

type LocalLocations = { ownerId: string; locations: Location[]; updatedAt: number };

export const offlineDB = new Dexie("zhonghui-offline") as Dexie & {
  loads: EntityTable<LocalLoad, "id">;
  locations: EntityTable<LocalLocations, "ownerId">;
};

offlineDB.version(1).stores({
  loads: "id, ownerId, [ownerId+status]",
  locations: "ownerId",
});

export async function saveLocalLoad(
  id: string, ownerId: string, input: LoadInput, locationName: string, status: "DRAFT" | "PENDING_SYNC",
) {
  await offlineDB.transaction("rw", offlineDB.loads, async () => {
    const current = await offlineDB.loads.get(id);
    if (current && (current.ownerId !== ownerId || current.status !== "DRAFT")) {
      throw new Error("El registro local ya está en cola.");
    }
    await offlineDB.loads.put({
      id, ownerId, locationId: input.locationId, locationName, input, status, updatedAt: Date.now(),
    });
  });
}

export async function getDraft(id: string, ownerId: string) {
  const load = await offlineDB.loads.get(id);
  return load?.ownerId === ownerId && load.status === "DRAFT" ? load : undefined;
}

export async function changeLocalLoad(id: string, ownerId: string, action: "delete-draft" | "retry" | "edit-invalid") {
  await offlineDB.transaction("rw", offlineDB.loads, async () => {
    const entry = await offlineDB.loads.get(id);
    if (!entry || entry.ownerId !== ownerId) return;
    if (action === "delete-draft" && entry.status === "DRAFT") {
      await offlineDB.loads.delete(id);
    } else if (action === "edit-invalid" && entry.status === "CONFLICT" && entry.issueStatus === 400) {
      await offlineDB.loads.update(id, { status: "DRAFT", issue: undefined, issueStatus: undefined, updatedAt: Date.now() });
    } else if (action === "retry" && (entry.status === "SYNC_ERROR" || entry.status === "CONFLICT")) {
      await offlineDB.loads.update(id, {
        status: "PENDING_SYNC", issue: undefined, issueStatus: undefined, retryAt: undefined, updatedAt: Date.now(),
      });
    }
  });
}
