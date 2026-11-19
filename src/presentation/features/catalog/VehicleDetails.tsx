import { formatDateTimePE } from "@/shared/lib/dates";

export type VehicleData = {
  id?: string;
  plate: string;
  vehicleType?: string;
  make?: string;
  model?: string;
  modelYear?: number;
  color?: string;
  registrationStatus?: string;
  serialNumber?: string;
  vin?: string;
  engineNumber?: string;
  previousPlate?: string;
  registryOffice?: string;
  registryNotes?: string;
  registryEntries?: { office?: string; number?: string; zone?: string; officeCode?: string }[] | null;
  theftAlert?: string;
  checkedAt?: string;
};

export default function VehicleDetails({ data }: { data: VehicleData }) {
  const fields = [
    ["Placa", data.plate],
    ["Marca", data.make],
    ["Modelo", data.model],
    ["Año de modelo", data.modelYear],
    ["Color", data.color],
    ["Estado registral", data.registrationStatus],
    ["Número de serie", data.serialNumber],
    ["VIN", data.vin],
    ["Número de motor", data.engineNumber],
    ["Placa anterior", data.previousPlate],
    ["Sede registral", data.registryOffice],
    ["Anotaciones", data.registryNotes],
    ["Alerta de robo", data.theftAlert === "" ? "Sin alerta informada" : data.theftAlert],
    ["Consulta SUNARP (hora de Lima)", data.checkedAt && formatDateTimePE(data.checkedAt)],
  ];

  return (
    <div className="space-y-3 text-sm">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.filter(([, value]) => value).map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="wrap-break-word">{value}</dd>
          </div>
        ))}
      </dl>
      {data.registryEntries && data.registryEntries.length > 0 && (
        <div>
          <p className="font-medium">Partidas registrales</p>
          <ul className="list-disc space-y-1 pl-5">
            {data.registryEntries.map(({ office, number, zone, officeCode }, index) => (
              <li key={`${officeCode}:${number}:${index}`}>
                {[
                  number && `Partida ${number}`,
                  office,
                  zone && `Zona ${zone}`,
                  officeCode && `Código de oficina ${officeCode}`,
                ].filter(Boolean).join(" · ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
