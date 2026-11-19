import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/presentation/components/ui/button";
import { useAuthStore } from "@/presentation/features/auth/auth.store";
import { api } from "@/shared/api/http";
import LicenseDetails, { type LicenseData } from "./LicenseDetails";
import { requestMessage } from "./catalog.api";

type Company = { ruc: string; legalName: string; taxStatus?: string; taxCondition?: string; fiscalAddress?: string };
type License = LicenseData & { verification?: string };
type Driver = { dni: string; firstNames: string; lastNames: string; licenses: License[]; incomplete: boolean; checkedAt?: string };
type Vehicle = { plate: string; make?: string; model?: string; modelYear?: number; color?: string; registrationStatus?: string };
type LookupResult = { found: boolean; data: Company | Driver | Vehicle | null };
type Suggestion = { ruc?: string; legalName?: string; dni?: string; firstNames?: string; lastNames?: string; licenseNumber?: string; licenseVerification?: string; plate?: string };

export default function LookupPanel({ kind, value, onApply }: {
  kind: "sunat" | "mtc" | "sunarp";
  value: string;
  onApply?: (data: Suggestion) => void;
}) {
  const role = useAuthStore((state) => state.session?.user.role);
  const client = useQueryClient();
  const query = useMutation({
    mutationFn: async () => {
      const key = { sunat: "ruc", mtc: "dni", sunarp: "plate" }[kind];
      return (await api.post<LookupResult>(`/lookups/${kind}`, { [key]: value }, { timeout: 40_000 })).data;
    },
    onSuccess: () => { void client.invalidateQueries({ queryKey: ["catalog"] }); },
  });
  if (role !== "ADMIN" && role !== "OPERATOR") return null;
  const valid = kind === "sunat" ? /^\d{11}$/.test(value.trim()) :
    kind === "mtc" ? /^\d{8}$/.test(value.trim()) :
      /^[A-Z0-9]{6}$/.test(value.toUpperCase().replace(/[ -]/g, ""));
  const data = query.data?.data;
  const label = { sunat: "Consultar SUNAT", mtc: "Consultar MTC", sunarp: "Consultar SUNARP" }[kind];
  return (
    <div className="space-y-2">
      <Button type="button" size="sm" variant="outline" disabled={!valid || query.isPending} onClick={() => query.mutate()}>
        {query.isPending ? "Consultando…" : label}
      </Button>
      {query.isError && <p role="alert" className="text-sm text-destructive">{requestMessage(query.error)} Puedes continuar manualmente.</p>}
      {query.data && !query.data.found && <p className="text-sm text-muted-foreground">El proveedor no encontró datos.</p>}
      {data && "ruc" in data && <div className="space-y-2 rounded-md border p-3 text-sm">
        <p className="font-medium">{data.legalName}</p>
        <p>{[data.ruc, data.taxStatus, data.taxCondition, data.fiscalAddress].filter(Boolean).join(" · ")}</p>
        {onApply && <Button type="button" size="sm" onClick={() => onApply(data)}>Usar datos de SUNAT</Button>}
      </div>}
      {data && "dni" in data && <div className="space-y-2 rounded-md border p-3 text-sm">
        <p className="font-medium">{data.firstNames} {data.lastNames}</p>
        {data.incomplete && <p className="text-muted-foreground">MTC devolvió una respuesta parcial.</p>}
        {onApply && <Button type="button" variant="outline" size="sm" onClick={() => onApply(data)}>Usar datos del conductor</Button>}
        {data.licenses.map((license, i) => <div className="space-y-1 border-t pt-2" key={`${license.licenseNumber}:${i}`}>
          <LicenseDetails data={{ ...license, checkedAt: data.checkedAt }} />
          {onApply && <Button type="button" size="sm" onClick={() => onApply({ ...data, licenseNumber: license.licenseNumber, licenseVerification: license.verification })}>
            Usar esta licencia
          </Button>}
        </div>)}
      </div>}
      {data && "plate" in data && <div className="space-y-2 rounded-md border p-3 text-sm">
        <p className="font-medium">{[data.plate, data.make, data.model].filter(Boolean).join(" · ")}</p>
        <p>{[data.modelYear, data.color, data.registrationStatus].filter(Boolean).join(" · ")}</p>
        {onApply && <Button type="button" size="sm" onClick={() => onApply(data)}>Usar placa vigente</Button>}
      </div>}
    </div>
  );
}
