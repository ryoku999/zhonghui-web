import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { pageSize, requestMessage } from "@/presentation/features/catalog/catalog.api";
import Pagination from "@/presentation/features/catalog/Pagination";
import { formatDateTimePE } from "@/shared/lib/dates";
import { formFilters, getPage, type AuditEntry, type Filters } from "./reports.api";

const entities: Record<string, string> = { user: "Usuario", loading_location: "Punto de embarque", load_record: "Registro" };
const actions: Record<string, string> = {
  CREATE_USER: "Creó usuario", UPDATE_USER: "Actualizó usuario",
  CREATE_LOCATION: "Creó punto", UPDATE_LOCATION: "Actualizó punto",
  ASSIGN_OPERATOR: "Asignó operador", REMOVE_OPERATOR: "Quitó asignación",
  CREATE_LOAD: "Creó registro", UPDATE_LOAD: "Actualizó registro", CANCEL_LOAD: "Anuló registro",
  BOOTSTRAP_ADMIN: "Creó administrador inicial",
};

export default function AuditPage() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Filters>({});
  const query = useQuery({
    queryKey: ["audit", filters, page],
    queryFn: () => getPage<AuditEntry>("/audit", filters, page, pageSize),
    retry: false,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters(formFilters(event.currentTarget));
    setPage(0);
  }

  return (
    <section className="min-w-0 space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
      <Card><CardContent>
        <form onSubmit={submit} onReset={() => { setFilters({}); setPage(0); }}
          className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1.5 text-sm">Desde<Input name="from" type="date" /></label>
          <label className="grid gap-1.5 text-sm">Hasta<Input name="to" type="date" /></label>
          <label className="grid gap-1.5 text-sm">Entidad
            <select name="entity" className="h-9 rounded-md border bg-background px-2">
              <option value="">Todas</option>
              {Object.entries(entities).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">Acción
            <select name="action" className="h-9 rounded-md border bg-background px-2">
              <option value="">Todas</option>
              {Object.entries(actions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Aplicar filtros</Button><Button type="reset" variant="outline">Limpiar</Button>
          </div>
        </form>
      </CardContent></Card>
      {query.isPending && <p role="status">Cargando auditoría…</p>}
      {query.isError && <p role="alert" className="text-destructive">{requestMessage(query.error)}</p>}
      {query.data?.items.length === 0 && <p className="text-sm text-muted-foreground">No hay eventos que coincidan con los filtros.</p>}
      {!!query.data?.items.length && <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Fecha y hora de Lima</TableHead><TableHead>Usuario</TableHead><TableHead>Acción</TableHead>
            <TableHead>Entidad</TableHead><TableHead>ID de entidad</TableHead><TableHead>ID de solicitud</TableHead>
          </TableRow></TableHeader>
          <TableBody>{query.data.items.map((entry) => <TableRow key={entry.id}>
            <TableCell>{formatDateTimePE(entry.createdAt)}</TableCell><TableCell>{entry.actorName || "Sistema"}</TableCell>
            <TableCell>{actions[entry.action] ?? entry.action}</TableCell>
            <TableCell>{entities[entry.entity] ?? entry.entity}</TableCell>
            <TableCell className="font-mono text-xs">{entry.entityId}</TableCell>
            <TableCell className="font-mono text-xs">{entry.requestId || "—"}</TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </div>}
      <Pagination page={page} onChange={setPage} hasNext={!!query.data?.hasNext} loading={query.isFetching} />
    </section>
  );
}
