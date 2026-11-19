import { z } from "zod";
import { api } from "@/shared/api/http";
import type { LicenseData } from "@/presentation/features/catalog/LicenseDetails";

const plate = z
  .string()
  .trim()
  .toUpperCase()
  .transform((value) => value.replace(/[ -]/g, ""))
  .pipe(z.string().regex(/^[A-Z0-9]{4,12}$/, "Ingresa una placa válida."));

export const loadSchema = z
  .object({
    locationId: z.uuid("Selecciona un punto de embarque."),
    ruc: z
      .string()
      .trim()
      .regex(/^\d{11}$/, "El RUC debe tener 11 dígitos."),
    legalName: z.string().trim().min(1, "Ingresa la razón social.").max(200),
    documentType: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z][A-Z0-9_]{0,19}$/, "Ingresa el tipo de documento."),
    documentNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9.-]{1,39}$/, "Ingresa un documento válido."),
    firstNames: z.string().trim().min(1, "Ingresa los nombres.").max(120),
    lastNames: z.string().trim().min(1, "Ingresa los apellidos.").max(120),
    licenseNumber: z.string().trim().toUpperCase().max(60),
    licenseId: z.union([z.uuid(), z.literal("")]).optional(),
    licenseVerification: z.string().max(12000).optional(),
    phone: z.string().trim().max(40),
    tractorPlate: plate,
    trailerPlate: z
      .string()
      .trim()
      .pipe(
        z.union([z.literal(""), plate], {
          error: "Ingresa una placa de carreta válida o deja el campo vacío.",
        }),
      ),
    unitDescription: z.string().trim().max(200),
    notes: z.string().trim().max(1000),
    externalFields: z
      .array(
        z.enum([
          "ruc",
          "legalName",
          "firstNames",
          "lastNames",
          "licenseNumber",
          "tractorPlate",
          "trailerPlate",
        ]),
      )
      .optional(),
  })
  .refine(
    ({ documentType, documentNumber }) =>
      documentType !== "DNI" || /^\d{8}$/.test(documentNumber),
    {
      path: ["documentNumber"],
      message: "El DNI debe tener 8 dígitos.",
    },
  )
  .refine(
    ({ tractorPlate, trailerPlate }) =>
      trailerPlate === "" || tractorPlate !== trailerPlate,
    {
      path: ["trailerPlate"],
      message: "La placa de carreta debe ser distinta de la del tracto.",
    },
  );

export type LoadInput = z.infer<typeof loadSchema>;
export type Load = {
  id: string;
  locationId: string;
  businessDate: string;
  orderNumber: number;
  createdAt: string;
  createdBy: string;
  status: "REGISTERED" | "CANCELLED";
  version: number;
  snapshot: LoadInput & { locationName: string; trailerType: string; licenseDetails?: LicenseData };
};

export async function createLoad(
  input: LoadInput,
  key: string,
  ownerId: string,
) {
  return (
    await api.post<Load>("/loads", input, {
      expectedUserId: ownerId,
      headers: { "Idempotency-Key": key },
    })
  ).data;
}

export async function getLoad(id: string) {
  return (await api.get<Load>(`/loads/${id}`)).data;
}

export async function updateLoad(
  id: string,
  changes: {
    version: number;
    notes?: string;
    unitDescription?: string;
    status?: "CANCELLED";
  },
) {
  return (await api.patch<Load>(`/loads/${id}`, changes)).data;
}
