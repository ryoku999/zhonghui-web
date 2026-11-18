import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/presentation/components/ui/card";
import { Badge } from "@/presentation/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { requestMessage } from "@/presentation/features/catalog/catalog.api";
import { formatDatePE, formatDateTimePE } from "@/shared/lib/dates";
import { getDashboard } from "./reports.api";

export default function DashboardPage() {
  const query = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });
  const data = query.data;
  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resumen de operaciones</h1>
          {data && <p className="mt-1 text-sm text-muted-foreground">{formatDatePE(data.from)} al {formatDatePE(data.to)} · Hora de Lima</p>}
        </div>
        <Link className="text-sm font-medium text-primary underline underline-offset-4" to="/registros">Ver todos los registros</Link>
      </header>
      {query.isPending && <p role="status">Cargando resumen…</p>}
      {query.isError && <p role="alert" className="text-destructive">{requestMessage(query.error)}</p>}
      {data && <>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: "Registros totales", value: data.total },
            { label: "Registrados", value: data.registered },
            { label: "Anulados", value: data.cancelled },
            { label: "Puntos con actividad", value: data.locationsWithActivity },
          ].map(({ label, value }) => <Card key={label}>
            <CardContent>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{value.toLocaleString("es-PE")}</p>
            </CardContent>
          </Card>)}
        </div>
        <Card>
          <CardHeader><h2 className="font-semibold">Actividad reciente</h2></CardHeader>
          <CardContent>
            {data.recent.length === 0 ? <p className="text-sm text-muted-foreground">No hay registros en este periodo.</p> :
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Orden</TableHead><TableHead>Punto de embarque</TableHead>
                  <TableHead>Conductor</TableHead><TableHead>Hora de registro</TableHead><TableHead>Estado</TableHead>
                </TableRow></TableHeader>
                <TableBody>{data.recent.map((row) => <TableRow key={row.id}>
                  <TableCell><Link className="font-medium underline" to={`/registros/${row.id}`}>{row.orderNumber}</Link></TableCell>
                  <TableCell>{row.locationName}</TableCell><TableCell>{row.driver}</TableCell>
                  <TableCell>{formatDateTimePE(row.createdAt)}</TableCell>
                  <TableCell><Badge variant={row.status === "CANCELLED" ? "outline" : "secondary"}>
                    {row.status === "CANCELLED" ? "Anulado" : "Registrado"}
                  </Badge></TableCell>
                </TableRow>)}</TableBody>
              </Table>}
          </CardContent>
        </Card>
      </>}
    </section>
  );
}
