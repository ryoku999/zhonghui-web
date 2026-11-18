import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { list, pageSize, requestMessage, type CatalogName, type CatalogRow } from "./catalog.api";
import Pagination from "./Pagination";

const catalogs = {
  companies: { label: "Empresas", hint: "RUC o razón social", columns: [
    ["ruc", "RUC"], ["legalName", "Razón social"],
  ] },
  drivers: { label: "Conductores", hint: "Documento o nombre", columns: [
    ["documentType", "Tipo de documento"], ["documentNumber", "Número"], ["firstNames", "Nombres"],
    ["lastNames", "Apellidos"], ["phone", "Teléfono"],
  ] },
  licenses: { label: "Licencias", hint: "Número de licencia", columns: [
    ["licenseNumber", "Licencia"], ["licenseClass", "Clase"], ["category", "Categoría"],
    ["expiresOn", "Vencimiento"], ["issuingCountry", "País emisor"],
  ] },
  vehicles: { label: "Vehículos", hint: "Placa", columns: [
    ["plate", "Placa"], ["vehicleType", "Tipo"], ["make", "Marca"], ["model", "Modelo"],
  ] },
};

export default function CatalogsPage() {
  const [name, setName] = useState<CatalogName>("companies");
  const [driver, setDriver] = useState<CatalogRow>();
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Catálogos</h1>
      <div className="flex flex-wrap gap-2" aria-label="Seleccionar catálogo">
        {(Object.keys(catalogs) as CatalogName[]).map((key) => (
          <Button key={key} variant={name === key ? "default" : "outline"} aria-pressed={name === key}
            onClick={() => { setName(key); setDriver(undefined); }}>
            {catalogs[key].label}
          </Button>
        ))}
      </div>
      <CatalogResults key={`${name}:${driver?.id ?? ""}`} name={name} driver={driver}
        clearDriver={() => setDriver(undefined)} showLicenses={(row) => { setDriver(row); setName("licenses"); }} />
    </section>
  );
}

function CatalogResults({ name, driver, clearDriver, showLicenses }: {
  name: CatalogName;
  driver?: CatalogRow;
  clearDriver: () => void;
  showLicenses: (row: CatalogRow) => void;
}) {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ q: "", type: "" });
  const config = catalogs[name];
  const results = useQuery({
    queryKey: ["catalog", name, page, filters, driver?.id],
    queryFn: () => list<CatalogRow>(`/${name}`, page, {
      q: filters.q, ...(name === "vehicles" ? { type: filters.type } : {}),
      ...(driver ? { driverId: driver.id } : {}),
    }),
  });

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFilters({ q: String(form.get("q") ?? "").trim(), type: String(form.get("type") ?? "") });
    setPage(0);
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        {driver && <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>Licencias de {driver.firstNames} {driver.lastNames}</span>
          <Button size="sm" variant="outline" onClick={clearDriver}>Ver todas</Button>
        </div>}
        <form onSubmit={search} className="flex flex-wrap items-end gap-3">
          <label className="grid flex-1 gap-1.5 text-sm">{config.hint}
            <Input name="q" maxLength={100} />
          </label>
          {name === "vehicles" && <label className="grid gap-1.5 text-sm">Tipo de vehículo
            <select name="type" className="h-9 rounded-md border bg-background px-2">
              <option value="">Todos</option>
              <option value="TRACTOR">Tracto</option>
              <option value="TRAILER">Remolque</option>
              <option value="SEMITRAILER">Semirremolque</option>
            </select>
          </label>}
          <Button type="submit">Buscar</Button>
        </form>
        {results.isPending && <p role="status">Cargando…</p>}
        {results.isError && <p role="alert" className="text-destructive">{requestMessage(results.error)}</p>}
        {results.data?.length === 0 && <p className="text-sm text-muted-foreground">No hay resultados.</p>}
        {!!results.data?.length && <Table>
          <TableHeader><TableRow>
            {config.columns.map(([field, label]) => <TableHead key={field}>{label}</TableHead>)}
            {name === "drivers" && <TableHead>Licencias</TableHead>}
          </TableRow></TableHeader>
          <TableBody>{results.data.map((row) => <TableRow key={row.id}>
            {config.columns.map(([field]) => <TableCell key={field}>{row[field] || "—"}</TableCell>)}
            {name === "drivers" && <TableCell>
              <Button size="sm" variant="outline" onClick={() => showLicenses(row)}>Ver licencias</Button>
            </TableCell>}
          </TableRow>)}</TableBody>
        </Table>}
        <Pagination page={page} onChange={setPage} hasNext={results.data?.length === pageSize} loading={results.isFetching} />
      </CardContent>
    </Card>
  );
}
