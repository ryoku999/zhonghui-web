import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardHeader } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { list, pageSize, requestMessage, type Location } from "@/presentation/features/catalog/catalog.api";
import HistorySuggestions from "./HistorySuggestions";
import LoadSummary from "./LoadSummary";
import { createLoad, loadSchema, type LoadInput } from "./loads.api";

const defaultValues: LoadInput = {
  locationId: "", ruc: "", legalName: "", documentType: "DNI", documentNumber: "",
  firstNames: "", lastNames: "", licenseNumber: "", licenseId: "", phone: "", tractorPlate: "",
  trailerPlate: "", unitDescription: "", notes: "",
};

export default function NewLoadPage() {
  const { register, control, setValue, handleSubmit, formState: { errors } } = useForm<LoadInput>({
    resolver: zodResolver(loadSchema), defaultValues,
  });
  const [locationId, ruc, documentType, documentNumber, firstNames, license, tractor, trailer] = useWatch({
    control,
    name: ["locationId", "ruc", "documentType", "documentNumber", "firstNames", "licenseNumber", "tractorPlate", "trailerPlate"],
  });
  const [selectedDriver, setSelectedDriver] = useState<{ id: string; type?: string | null; number?: string | null }>();
  const driverId = selectedDriver && selectedDriver.type === documentType.trim().toUpperCase() &&
    selectedDriver.number === documentNumber.trim().toUpperCase() ? selectedDriver.id : undefined;
  const [draft, setDraft] = useState<{ input: LoadInput; key: string }>();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  const navigate = useNavigate();
  const locations = useQuery({
    queryKey: ["load-form-locations"],
    queryFn: async () => {
      const all: Location[] = [];
      for (let page = 0; ; page += 1) {
        const points = await list<Location>("/locations", page);
        all.push(...points.filter((point) => point.isActive));
        if (points.length < pageSize) return all;
      }
    },
  });
  const readOnly = !locationId || !!draft;

  function setField(name: keyof LoadInput, value?: string | null) {
    setValue(name, value ?? "", { shouldValidate: true, shouldDirty: true });
  }

  function field(name: keyof LoadInput, label: string, options?: { inputMode?: "numeric" | "tel"; maxLength?: number }) {
    return (
      <label className="grid min-w-0 gap-1.5 text-sm">
        {label}
        <Input {...options} {...register(name, {
          onChange: name === "licenseNumber" ? () => setField("licenseId", "") : undefined,
        })} aria-invalid={!!errors[name]} />
        {errors[name] && <span className="text-destructive">{errors[name]?.message}</span>}
      </label>
    );
  }

  async function confirm() {
    if (!draft || pending) return;
    setPending(true);
    setFailure("");
    try {
      const saved = await createLoad(draft.input, draft.key);
      void navigate(`/registros/${saved.id}`, { state: { created: true } });
    } catch (error) {
      setFailure(requestMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo registro de transportista</h1>
      <form hidden={!!draft} className="space-y-4" onSubmit={handleSubmit((input) => {
        setFailure("");
        setDraft({ input, key: crypto.randomUUID() });
      })}>
        <input type="hidden" {...register("licenseId")} />
        <Card>
          <CardContent className="space-y-2">
            <label className="grid gap-1.5 text-sm">Punto de embarque
              <select className="h-10 rounded-md border bg-background px-3" {...register("locationId")}
                disabled={locations.isPending || locations.isError} aria-invalid={!!errors.locationId}>
                <option value="">Selecciona un punto</option>
                {locations.data?.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}
              </select>
            </label>
            {errors.locationId && <p className="text-sm text-destructive">{errors.locationId.message}</p>}
            {locations.isError && <p role="alert" className="text-sm text-destructive">{requestMessage(locations.error)}</p>}
            {locations.data?.length === 0 && <p className="text-sm text-muted-foreground">No tienes puntos activos disponibles.</p>}
          </CardContent>
        </Card>
        <fieldset disabled={readOnly} className="space-y-4">
          <Card>
            <CardHeader><h2 className="font-semibold">Empresa</h2></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                {field("ruc", "RUC", { inputMode: "numeric", maxLength: 11 })}
                {field("legalName", "Razón social")}
              </div>
              <HistorySuggestions catalog="companies" term={ruc} label="Buscar por RUC"
                describe={(row) => `${row.ruc} · ${row.legalName}`}
                select={(row) => { setField("ruc", row.ruc); setField("legalName", row.legalName); }} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="font-semibold">Conductor</h2></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                {field("documentType", "Tipo de documento")}
                {field("documentNumber", "Número de documento")}
                {field("firstNames", "Nombres")}
                {field("lastNames", "Apellidos")}
                {field("licenseNumber", "Licencia (opcional)")}
                {field("phone", "Celular (opcional)", { inputMode: "tel" })}
              </div>
              <HistorySuggestions catalog="drivers" term={documentNumber || firstNames} label="Buscar conductor"
                describe={(row) => `${row.firstNames} ${row.lastNames} · ${row.documentNumber}`}
                select={(row) => {
                  setSelectedDriver({ id: row.id, type: row.documentType, number: row.documentNumber });
                  setField("documentType", row.documentType);
                  setField("documentNumber", row.documentNumber);
                  setField("firstNames", row.firstNames);
                  setField("lastNames", row.lastNames);
                  setField("phone", row.phone);
                  setField("licenseNumber", "");
                  setField("licenseId", "");
                }} />
              {driverId && <HistorySuggestions key={driverId} catalog="licenses" filters={{ driverId }} term={license}
                label="Buscar licencias del conductor"
                describe={(row) => [row.licenseNumber, row.issuingCountry, row.expiresOn].filter(Boolean).join(" · ")}
                select={(row) => { setField("licenseNumber", row.licenseNumber); setField("licenseId", row.id); }} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="font-semibold">Vehículos y unidad</h2></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  {field("tractorPlate", "Placa de tracto")}
                  <HistorySuggestions catalog="vehicles" filters={{ type: "TRACTOR" }} term={tractor}
                    label="Buscar tracto" describe={(row) => row.plate ?? ""} select={(row) => setField("tractorPlate", row.plate)} />
                </div>
                <div className="space-y-2">
                  {field("trailerPlate", "Placa de carreta")}
                  <HistorySuggestions catalog="vehicles" term={trailer}
                    label="Buscar carreta" describe={(row) => `${row.plate} · ${row.vehicleType}`}
                    filters={{ type: "TRAILER,SEMITRAILER" }} select={(row) => setField("trailerPlate", row.plate)} />
                </div>
              </div>
              {field("unitDescription", "Unidad (opcional)")}
              <label className="grid gap-1.5 text-sm">Observaciones (opcional)
                <textarea className="min-h-24 rounded-md border bg-background p-2" maxLength={1000} {...register("notes")} />
              </label>
            </CardContent>
          </Card>
          <Button type="submit">Revisar registro</Button>
        </fieldset>
      </form>
      {draft && <Card>
        <CardHeader><h2 className="font-semibold">Confirma los datos del registro</h2></CardHeader>
        <CardContent className="space-y-5">
          <LoadSummary input={draft.input} locationName={locations.data?.find((p) => p.id === draft.input.locationId)?.name ?? "—"} />
          {failure && <p role="alert" className="text-destructive">{failure}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={pending} onClick={() => setDraft(undefined)}>Volver a editar</Button>
            <Button disabled={pending} onClick={() => void confirm()}>{pending ? "Guardando…" : "Confirmar y guardar"}</Button>
          </div>
        </CardContent>
      </Card>}
    </section>
  );
}
