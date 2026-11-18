import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardHeader } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { useAuthStore } from "@/presentation/features/auth/auth.store";
import { getDraft, saveLocalLoad, type LocalLoad } from "@/presentation/features/offline/offline.db";
import { refreshLocalLocations, syncLocalLoads } from "@/presentation/features/offline/offline.sync";
import { useStoredLocations } from "@/presentation/features/offline/useLocalData";
import HistorySuggestions from "./HistorySuggestions";
import LookupPanel from "@/presentation/features/catalog/LookupPanel";
import LoadSummary from "./LoadSummary";
import { loadSchema, type LoadInput } from "./loads.api";

const defaultValues: LoadInput = {
  locationId: "", ruc: "", legalName: "", documentType: "DNI", documentNumber: "",
  firstNames: "", lastNames: "", licenseNumber: "", licenseId: "", phone: "", tractorPlate: "",
  trailerPlate: "", unitDescription: "", notes: "", externalFields: [],
};

export default function NewLoadPage() {
  const [params] = useSearchParams();
  const draftId = params.get("draft");
  const ownerId = useAuthStore((state) => state.session?.user.id ?? "");
  const previous = useQuery({
    queryKey: ["local-draft", ownerId, draftId], enabled: !!draftId,
    queryFn: async () => (await getDraft(draftId ?? "", ownerId)) ?? null, networkMode: "always", retry: false,
  });
  if (draftId && previous.isPending) return <p role="status">Abriendo borrador…</p>;
  if (draftId && (!previous.data?.input || previous.isError)) {
    return <p role="alert">No se pudo abrir este borrador. <Link className="underline" to="/pendientes">Volver a pendientes</Link></p>;
  }
  return <LoadForm key={`${ownerId}:${draftId ?? "new"}`} ownerId={ownerId} previous={previous.data ?? undefined} />;
}

function LoadForm({ ownerId, previous }: { ownerId: string; previous?: LocalLoad }) {
  const { register, control, setValue, getValues, handleSubmit, formState: { errors } } = useForm<LoadInput>({
    resolver: zodResolver(loadSchema), defaultValues: previous?.input ?? defaultValues,
  });
  const [localId] = useState(() => previous?.id ?? crypto.randomUUID());
  const [locationId, ruc, documentType, documentNumber, firstNames, license, tractor, trailer] = useWatch({
    control,
    name: ["locationId", "ruc", "documentType", "documentNumber", "firstNames", "licenseNumber", "tractorPlate", "trailerPlate"],
  });
  const [selectedDriver, setSelectedDriver] = useState<{ id: string; type?: string | null; number?: string | null }>();
  const driverId = selectedDriver && selectedDriver.type === documentType.trim().toUpperCase() &&
    selectedDriver.number === documentNumber.trim().toUpperCase() ? selectedDriver.id : undefined;
  const [draft, setDraft] = useState<LoadInput>();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  const navigate = useNavigate();
  const locations = useStoredLocations(ownerId);
  const [updatingPoints, setUpdatingPoints] = useState(false);
  const point = locations?.data?.find((item) => item.id === locationId);
  const locationName = point?.name ?? (previous?.locationId === locationId ? previous.locationName : "");
  const readOnly = !locationId || !!draft;

  function setField(name: keyof LoadInput, value?: string | null) {
    setValue(name, value ?? "", { shouldValidate: true, shouldDirty: true });
  }

  function applyExternalField(name: NonNullable<LoadInput["externalFields"]>[number], value?: string) {
    if (!value) return;
    setField(name, value);
    setValue("externalFields", [...new Set([...(getValues("externalFields") ?? []), name])]);
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

  async function persist(input: LoadInput, status: "DRAFT" | "PENDING_SYNC") {
    if (pending || !locationName || (status === "PENDING_SYNC" && !point)) return;
    setPending(true);
    setFailure("");
    try {
      await saveLocalLoad(localId, ownerId, input, locationName, status);
      void navigate("/pendientes");
      if (status === "PENDING_SYNC") void syncLocalLoads(ownerId).catch(() => undefined);
    } catch (error) {
      setFailure(error instanceof Error && error.message === "El registro local ya está en cola."
        ? error.message : "No se pudo guardar en este dispositivo. Revisa el almacenamiento e inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  async function refreshPoints() {
    setUpdatingPoints(true);
    setFailure("");
    try {
      await refreshLocalLocations(ownerId, true);
    } catch {
      setFailure("No se pudieron actualizar los puntos. Los puntos ya guardados siguen disponibles.");
    } finally {
      setUpdatingPoints(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo registro de transportista</h1>
      <form hidden={!!draft} className="space-y-4" onSubmit={handleSubmit((input) => {
        setFailure("");
        if (point) setDraft(input);
      })}>
        <input type="hidden" {...register("licenseId")} />
        <Card>
          <CardContent className="space-y-2">
            <label className="grid gap-1.5 text-sm">Punto de embarque
              <select className="h-10 rounded-md border bg-background px-3" {...register("locationId")}
                aria-invalid={!!errors.locationId}>
                <option value="">Selecciona un punto</option>
                {previous && !locations?.data?.some((item) => item.id === previous.locationId) &&
                  <option value={previous.locationId}>{previous.locationName} (por verificar)</option>}
                {locations?.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            {errors.locationId && <p className="text-sm text-destructive">{errors.locationId.message}</p>}
            {!locations?.data?.length &&
              <p className="text-sm text-muted-foreground">Conéctate para descargar tus puntos activos.</p>}
            {locationId && !point && <p className="text-sm text-muted-foreground">Elige un punto disponible para poner este borrador en cola.</p>}
            <Button type="button" size="sm" variant="outline" disabled={updatingPoints} onClick={() => void refreshPoints()}>
              {updatingPoints ? "Actualizando…" : "Actualizar puntos"}
            </Button>
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
              <LookupPanel key={ruc} kind="sunat" value={ruc}
                onApply={(result) => { applyExternalField("ruc", result.ruc); applyExternalField("legalName", result.legalName); }} />
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
              {documentType.trim().toUpperCase() === "DNI" && <LookupPanel key={documentNumber} kind="mtc" value={documentNumber}
                onApply={(result) => {
                  applyExternalField("firstNames", result.firstNames);
                  applyExternalField("lastNames", result.lastNames);
                  if (result.licenseNumber) {
                    applyExternalField("licenseNumber", result.licenseNumber);
                    setField("licenseId", "");
                  }
                }} />}
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
                  <LookupPanel key={tractor} kind="sunarp" value={tractor}
                    onApply={(result) => applyExternalField("tractorPlate", result.plate)} />
                </div>
                <div className="space-y-2">
                  {field("trailerPlate", "Placa de carreta")}
                  <HistorySuggestions catalog="vehicles" term={trailer}
                    label="Buscar carreta" describe={(row) => `${row.plate} · ${row.vehicleType}`}
                    filters={{ type: "TRAILER,SEMITRAILER" }} select={(row) => setField("trailerPlate", row.plate)} />
                  <LookupPanel key={trailer} kind="sunarp" value={trailer}
                    onApply={(result) => applyExternalField("trailerPlate", result.plate)} />
                </div>
              </div>
              {field("unitDescription", "Unidad (opcional)")}
              <label className="grid gap-1.5 text-sm">Observaciones (opcional)
                <textarea className="min-h-24 rounded-md border bg-background p-2" maxLength={1000} {...register("notes")} />
              </label>
            </CardContent>
          </Card>
          {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={pending || !locationName}
              onClick={() => void persist(getValues(), "DRAFT")}>Guardar borrador</Button>
            <Button type="submit" disabled={pending || !point}>Revisar registro</Button>
          </div>
        </fieldset>
      </form>
      {draft && <Card>
        <CardHeader><h2 className="font-semibold">Confirma los datos del registro</h2></CardHeader>
        <CardContent className="space-y-5">
          <LoadSummary input={draft} locationName={locationName} />
          {failure && <p role="alert" className="text-destructive">{failure}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={pending} onClick={() => setDraft(undefined)}>Volver a editar</Button>
            <Button disabled={pending || !point} onClick={() => void persist(draft, "PENDING_SYNC")}>
              {pending ? "Guardando…" : "Confirmar y guardar"}
            </Button>
          </div>
        </CardContent>
      </Card>}
    </section>
  );
}
