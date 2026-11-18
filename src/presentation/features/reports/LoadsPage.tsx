import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type RowSelectionState, type SortingState } from "@tanstack/react-table";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@/presentation/components/ui/button";
import { Badge } from "@/presentation/components/ui/badge";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { list, pageSize, requestMessage, type Location } from "@/presentation/features/catalog/catalog.api";
import Pagination from "@/presentation/features/catalog/Pagination";
import { formatDatePE } from "@/shared/lib/dates";
import { exportLoads, formFilters, getPage, type Filters, type ReportRow } from "./reports.api";

async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Copiado al portapapeles.");
  } catch {
    toast.error("No se pudo copiar.");
  }
}

function spreadsheetText(value: string | number) {
  const text = String(value).replace(/[\t\n\r]/g, " ");
  return /^\s*[=+@-]/.test(text) ? "'" + text : text;
}

function copyField(key: keyof ReportRow, header: string): ColumnDef<ReportRow> {
  return {
    accessorKey: key, header, enableSorting: false,
    cell: ({ row }) => {
      const value = String(row.original[key] ?? "");
      return value ? <div className="flex items-center gap-1">
        <span>{value}</span>
        <Button size="icon-sm" variant="ghost" aria-label={`Copiar ${header}`} onClick={() => void copy(value)}><Copy /></Button>
      </div> : "—";
    },
  };
}

const columns: ColumnDef<ReportRow>[] = [
  { id: "select", header: "Selección", enableSorting: false, cell: ({ row }) => <input
    type="checkbox" aria-label={`Seleccionar orden ${row.original.orderNumber}`} checked={row.getIsSelected()}
    onChange={row.getToggleSelectedHandler()} /> },
  { id: "date", accessorKey: "businessDate", header: "Fecha", cell: ({ row }) => formatDatePE(row.original.businessDate) },
  { id: "order", accessorKey: "orderNumber", header: "Orden", cell: ({ row }) => <div className="flex items-center gap-1">
    <Link className="font-medium underline" to={`/registros/${row.original.id}`}>{row.original.orderNumber}</Link>
    <Button size="icon-sm" variant="ghost" aria-label="Copiar número de orden" onClick={() => void copy(String(row.original.orderNumber))}><Copy /></Button>
  </div> },
  { id: "location", accessorKey: "locationName", header: "Punto de embarque" },
  copyField("ruc", "RUC"), copyField("legalName", "Razón social"), copyField("driver", "Conductor"),
  copyField("documentNumber", "Documento"), copyField("licenseNumber", "Licencia"), copyField("phone", "Celular"),
  copyField("tractorPlate", "Tracto"), copyField("trailerPlate", "Carreta"),
  { accessorKey: "unitDescription", header: "Unidad", enableSorting: false },
  { accessorKey: "registrar", header: "Registrado por", enableSorting: false },
  { accessorKey: "status", header: "Estado", enableSorting: false, cell: ({ row }) => <Badge
    variant={row.original.status === "CANCELLED" ? "outline" : "secondary"}>
    {row.original.status === "CANCELLED" ? "Anulado" : "Registrado"}
  </Badge> },
  { id: "copy", header: "Acción", enableSorting: false, cell: ({ row: { original: r } }) => <Button size="sm"
    variant="outline" onClick={() => void copy([
      r.businessDate, r.orderNumber, r.locationName, r.ruc, r.legalName, r.documentType, r.documentNumber, r.driver,
      r.licenseNumber, r.phone, r.tractorPlate, r.trailerPlate, r.unitDescription, r.registrar,
      r.status === "CANCELLED" ? "Anulado" : "Registrado",
    ].map(spreadsheetText).join("\t"))}>Copiar fila</Button> },
];

const emptyRows: ReportRow[] = [];

export default function LoadsPage() {
  const [pageIndex, setPage] = useState(0);
  const [filters, setFilters] = useState<Filters>({});
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [selected, setSelected] = useState<RowSelectionState>({});
  const sort = sorting[0] ?? { id: "date", desc: true };
  const search = { ...filters, sort: sort.id, direction: sort.desc ? "desc" : "asc" };
  const locations = useQuery({
    queryKey: ["report-locations"],
    queryFn: async () => {
      const all: Location[] = [];
      for (let page = 0; ; page += 1) {
        const rows = await list<Location>("/locations", page);
        all.push(...rows);
        if (rows.length < pageSize) return all;
      }
    },
  });
  const results = useQuery({
    queryKey: ["loads-list", search, pageIndex],
    queryFn: () => getPage<ReportRow>("/loads", search, pageIndex, pageSize),
    retry: false,
  });
  const download = useMutation({
    mutationFn: (ids: string[]) => exportLoads(search, ids),
    onError: (error) => toast.error(error.message),
  });
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  // The v8 React adapter manages its own mutable table instance.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: results.data?.items ?? emptyRows, columns, getCoreRowModel: getCoreRowModel(),
    manualPagination: true, manualSorting: true, enableMultiSort: false, enableSortingRemoval: false,
    getRowId: (row) => row.id, state: { sorting, rowSelection: selected, pagination: { pageIndex, pageSize } },
    onSortingChange: (change) => { setSorting(change); setPage(0); },
    onRowSelectionChange: setSelected,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters(formFilters(event.currentTarget));
    setPage(0);
    setSelected({});
  }

  return (
    <section className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Registros de transportistas</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={download.isPending || !results.data?.items.length} onClick={() => download.mutate([])}>Exportar resultados</Button>
          <Button disabled={download.isPending || !selectedIds.length || selectedIds.length > 100}
            onClick={() => download.mutate(selectedIds)}>Exportar selección ({selectedIds.length})</Button>
        </div>
      </div>
      <Card>
        <CardContent>
          <form onSubmit={submit} onReset={() => { setFilters({}); setPage(0); setSelected({}); }}
            className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["from", "Desde", "date"], ["to", "Hasta", "date"], ["ruc", "RUC", "search"], ["driver", "Conductor", "search"],
              ["tractorPlate", "Placa de tracto", "search"], ["trailerPlate", "Placa de carreta", "search"],
              ["orderNumber", "Orden", "number"], ["registrar", "Registrado por", "search"],
            ].map(([name, label, type]) => <label key={name} className="grid min-w-0 gap-1.5 text-sm">
              {label}<Input name={name} type={type} min={type === "number" ? 1 : undefined} maxLength={120} />
            </label>)}
            <label className="grid gap-1.5 text-sm">Punto de embarque
              <select name="locationId" className="h-9 rounded-md border bg-background px-2" disabled={locations.isError}>
                <option value="">Todos los puntos</option>
                {locations.data?.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Aplicar filtros</Button><Button type="reset" variant="outline">Limpiar</Button>
            </div>
          </form>
          {locations.isError && <p role="alert" className="mt-3 text-sm text-destructive">No se pudieron cargar los puntos de embarque.</p>}
        </CardContent>
      </Card>
      {selectedIds.length > 100 && <p role="alert" className="text-sm">Puedes exportar hasta 100 registros seleccionados.</p>}
      {results.isPending && <p role="status">Cargando registros…</p>}
      {results.isError && <p role="alert" className="text-destructive">{requestMessage(results.error)}</p>}
      {results.data?.items.length === 0 && <p className="text-sm text-muted-foreground">No hay registros que coincidan con los filtros.</p>}
      {!!results.data?.items.length && <div className="min-w-0 rounded-lg border bg-card">
        <Table>
          <TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>
            {group.headers.map((header) => {
              const direction = header.column.getIsSorted();
              const label = flexRender(header.column.columnDef.header, header.getContext());
              return <TableHead key={header.id} aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : undefined}>
                {header.column.getCanSort() ? <button type="button" className="font-medium underline decoration-dotted underline-offset-4"
                  onClick={header.column.getToggleSortingHandler()}>{label}{direction === "asc" ? " ↑" : direction === "desc" ? " ↓" : ""}</button> : label}
              </TableHead>;
            })}
          </TableRow>)}</TableHeader>
          <TableBody>{table.getRowModel().rows.map((row) => <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
            {row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
          </TableRow>)}</TableBody>
        </Table>
      </div>}
      <Pagination page={pageIndex} onChange={setPage} hasNext={!!results.data?.hasNext} loading={results.isFetching} />
    </section>
  );
}
