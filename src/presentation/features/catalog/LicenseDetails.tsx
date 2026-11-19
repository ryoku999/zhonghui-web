import { formatDatePE, formatDateTimePE } from "@/shared/lib/dates";

export type LicenseData = {
  licenseNumber: string;
  category?: string | null;
  licenseStatus?: string | null;
  issuedOn?: string | null;
  revalidationOn?: string | null;
  expiresOn?: string | null;
  licenseClass?: string | null;
  issuingCountry?: string | null;
  restrictions?: string[] | null;
  issuingCenter?: string | null;
  isElectronic?: boolean | null;
  checkedAt?: string | null;
};

export default function LicenseDetails({ data }: { data: LicenseData }) {
  const rows = [
    ["Licencia", data.licenseNumber],
    ["Categoría", data.category],
    ["Estado oficial", data.licenseStatus],
    ["Expedición", data.issuedOn && formatDatePE(data.issuedOn)],
    ["Revalidación informada", data.revalidationOn && formatDatePE(data.revalidationOn)],
    ["Centro de emisión", data.issuingCenter],
    ["Formato", data.isElectronic == null ? null : data.isElectronic ? "Electrónica" : "Física"],
    ["Restricciones", data.restrictions == null ? null : data.restrictions.join(", ") || "Ninguna informada"],
    ["Consultado en MTC", data.checkedAt && formatDateTimePE(data.checkedAt)],
    ["Clase", data.licenseClass],
    ["País emisor", data.issuingCountry],
    ["Vencimiento", data.expiresOn && formatDatePE(data.expiresOn)],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {rows.filter(([, value]) => value).map(([label, value]) => <div key={label}>
        <dt className="text-muted-foreground">{label}</dt><dd>{value}</dd>
      </div>)}
    </dl>
  );
}
