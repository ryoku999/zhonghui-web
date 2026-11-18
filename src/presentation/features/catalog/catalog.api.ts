import axios from "axios";
import { api } from "@/shared/api/http";
import type { User } from "@/presentation/features/auth/auth.store";

export type Location = { id: string; name: string; isActive: boolean };
export type CatalogName = "companies" | "drivers" | "licenses" | "vehicles";
export type CatalogRow = { id: string } & Record<string, string | null | undefined>;

export const pageSize = 25;

export async function list<T>(path: string, page: number, params?: Record<string, string | boolean>) {
  const response = await api.get<T[]>(path, {
    params: { limit: pageSize, offset: page * pageSize, ...params },
  });
  return response.data;
}

export const locationsApi = {
  create: (name: string) => api.post<Location>("/locations", { name }),
  update: (id: string, changes: Partial<Pick<Location, "name" | "isActive">>) =>
    api.patch<Location>(`/locations/${id}`, changes),
  users: (id: string, page: number) => list<User>(`/locations/${id}/users`, page),
  assign: (id: string, userId: string) => api.put(`/locations/${id}/users/${userId}`),
  remove: (id: string, userId: string) => api.delete(`/locations/${id}/users/${userId}`),
};

export function requestMessage(error: unknown) {
  const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
  return typeof message === "string" ? message : "No se pudo completar la solicitud.";
}
