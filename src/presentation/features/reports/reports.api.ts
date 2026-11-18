import axios from "axios";
import { api } from "@/shared/api/http";

export type ReportRow = {
  id: string; locationId: string; businessDate: string; createdAt: string;
  orderNumber: number; status: "REGISTERED" | "CANCELLED"; registrar: string;
  locationName: string; ruc: string; legalName: string; documentType: string; documentNumber: string;
  driver: string; licenseNumber: string; phone: string; tractorPlate: string; trailerPlate: string;
  unitDescription: string;
};
export type Page<T> = { items: T[]; hasNext: boolean };
export type Filters = Record<string, string>;
export type Dashboard = {
  from: string; to: string; total: number; registered: number; cancelled: number;
  locationsWithActivity: number; recent: ReportRow[];
};
export type AuditEntry = {
  id: string; actorId: string | null; actorName: string; entity: string; entityId: string;
  action: string; requestId: string | null; createdAt: string;
};

export async function getPage<T>(path: string, filters: Filters, page: number, pageSize: number) {
  return (await api.get<Page<T>>(path, { params: { ...filters, limit: pageSize, offset: page * pageSize } })).data;
}

export async function getDashboard() {
  return (await api.get<Dashboard>("/dashboard")).data;
}

export async function exportLoads(filters: Filters, ids: string[]) {
  let file: Blob;
  try {
    const response = await api.get<Blob>("/reports/loads.xlsx", {
      params: { ...filters, ...(ids.length ? { ids: ids.join(",") } : {}) },
      responseType: "blob",
    });
    file = response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      throw new Error("La exportación supera los 5 000 registros. Acota los filtros.", { cause: error });
    }
    throw new Error("No se pudo descargar el archivo Excel.", { cause: error });
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "registros-zhonghui.xlsx";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formFilters(form: HTMLFormElement): Filters {
  return Object.fromEntries(
    Array.from(new FormData(form), ([key, value]) => [key, String(value).trim()])
      .filter(([, value]) => value !== ""),
  );
}
