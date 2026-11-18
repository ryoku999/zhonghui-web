import type { LoadInput } from "./loads.api";

export default function LoadSummary({ input, locationName }: { input: LoadInput; locationName: string }) {
  const fields = [
    ["Punto de embarque", locationName], ["RUC", input.ruc], ["Razón social", input.legalName],
    ["Documento", `${input.documentType} ${input.documentNumber}`],
    ["Conductor", `${input.firstNames} ${input.lastNames}`], ["Licencia", input.licenseNumber],
    ["Celular", input.phone], ["Tracto", input.tractorPlate], ["Carreta", input.trailerPlate],
    ["Unidad", input.unitDescription], ["Observaciones", input.notes],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="break-words font-medium">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
