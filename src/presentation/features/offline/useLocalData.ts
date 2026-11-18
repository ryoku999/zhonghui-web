import { liveQuery } from "dexie";
import { useEffect, useState } from "react";
import type { Location } from "@/presentation/features/catalog/catalog.api";
import { offlineDB, type LocalLoad } from "./offline.db";

function useLocalData<T>(ownerId: string, read: (owner: string) => Promise<T>) {
  const [result, setResult] = useState<{ ownerId: string; data?: T; error?: unknown }>();
  useEffect(() => {
    const subscription = liveQuery(() => read(ownerId)).subscribe({
      next: (data) => setResult({ ownerId, data }),
      error: (error: unknown) => setResult({ ownerId, error }),
    });
    return () => subscription.unsubscribe();
  }, [ownerId, read]);
  return result?.ownerId === ownerId ? result : undefined;
}

async function loadEntries(ownerId: string): Promise<LocalLoad[]> {
  const entries = await offlineDB.loads.where("ownerId").equals(ownerId).toArray();
  return entries.sort((a, b) => b.updatedAt - a.updatedAt);
}

async function loadLocations(ownerId: string): Promise<Location[] | undefined> {
  return (await offlineDB.locations.get(ownerId))?.locations;
}

export function useLocalLoads(ownerId: string) {
  return useLocalData(ownerId, loadEntries);
}

export function useStoredLocations(ownerId: string) {
  return useLocalData(ownerId, loadLocations);
}
