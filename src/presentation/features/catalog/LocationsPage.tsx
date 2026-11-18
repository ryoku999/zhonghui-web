import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardHeader } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { useAuthStore, type User } from "@/presentation/features/auth/auth.store";
import { list, locationsApi, pageSize, requestMessage, type Location } from "./catalog.api";
import Pagination from "./Pagination";

export default function LocationsPage() {
  const isAdmin = useAuthStore((state) => state.session?.user.role === "ADMIN");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const queryClient = useQueryClient();
  const locations = useQuery({
    queryKey: ["locations", page, search],
    queryFn: () => list<Location>("/locations", page, { q: search }),
  });
  const save = useMutation({
    mutationFn: async (change: () => Promise<unknown>) => change(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });
  const selected = locations.data?.find((location) => location.id === selectedId);

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (name) save.mutate(() => locationsApi.create(name), { onSuccess: () => form.reset() });
  }

  function rename(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (name) save.mutate(() => locationsApi.update(id, { name }));
  }

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Puntos de embarque</h1>
      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <form className="flex items-end gap-2" onSubmit={(event) => {
              event.preventDefault();
              setSearch(String(new FormData(event.currentTarget).get("q") ?? "").trim());
              setPage(0);
            }}>
              <label className="grid flex-1 gap-1.5 text-sm">Nombre del punto
                <Input name="q" maxLength={100} />
              </label>
              <Button type="submit" variant="outline">Buscar</Button>
            </form>
            {isAdmin && <form className="flex items-end gap-2" onSubmit={create}>
              <label className="grid flex-1 gap-1.5 text-sm">Nuevo punto
                <Input name="name" maxLength={120} required />
              </label>
              <Button type="submit" disabled={save.isPending}>Crear</Button>
            </form>}
          </div>
          {locations.isPending && <p role="status">Cargando puntos…</p>}
          {locations.isError && <p role="alert" className="text-destructive">{requestMessage(locations.error)}</p>}
          {save.error && <p role="alert" className="text-destructive">{requestMessage(save.error)}</p>}
          {locations.data?.length === 0 && <p className="text-sm text-muted-foreground">No hay puntos disponibles.</p>}
          {!!locations.data?.length && <Table>
            <TableHeader><TableRow>
              <TableHead>Punto de embarque</TableHead><TableHead>Estado</TableHead>
              {isAdmin && <TableHead>Gestión</TableHead>}
            </TableRow></TableHeader>
            <TableBody>{locations.data.map((point) => <TableRow key={point.id}>
              <TableCell className="font-medium">{point.name}</TableCell>
              <TableCell><Badge variant={point.isActive ? "secondary" : "outline"}>
                {point.isActive ? "Activo" : "Inactivo"}
              </Badge></TableCell>
              {isAdmin && <TableCell><Button variant="outline" size="sm" aria-expanded={selectedId === point.id}
                onClick={() => { save.reset(); setSelectedId(selectedId === point.id ? "" : point.id); }}>
                {selectedId === point.id ? "Cerrar gestión" : "Gestionar"}
              </Button></TableCell>}
            </TableRow>)}</TableBody>
          </Table>}
          <Pagination page={page} onChange={setPage} hasNext={locations.data?.length === pageSize} loading={locations.isFetching} />
        </CardContent>
      </Card>
      {isAdmin && selected && <Card>
        <CardHeader><h2 className="font-semibold">{selected.name}</h2></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-end gap-3">
            <form key={`${selected.id}:${selected.name}`} className="flex flex-wrap items-end gap-2"
              onSubmit={(event) => rename(event, selected.id)}>
              <label className="grid gap-1.5 text-sm">Nombre
                <Input name="name" defaultValue={selected.name} maxLength={120} required />
              </label>
              <Button type="submit" variant="outline" disabled={save.isPending}>Guardar nombre</Button>
            </form>
            <Button variant="outline" disabled={save.isPending}
              onClick={() => save.mutate(() => locationsApi.update(selected.id, { isActive: !selected.isActive }))}>
              {selected.isActive ? "Desactivar punto" : "Activar punto"}
            </Button>
          </div>
          <LocationUsers key={selected.id} location={selected} />
        </CardContent>
      </Card>}
    </section>
  );
}

function LocationUsers({ location }: { location: Location }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const assigned = useQuery({
    queryKey: ["location-users", location.id, page],
    queryFn: () => locationsApi.users(location.id, page),
  });
  const candidates = useQuery({
    queryKey: ["operators-for-assignment", search],
    queryFn: () => list<User>("/users", 0, { role: "OPERATOR", onlyActive: true, q: search }),
    enabled: location.isActive,
  });
  const change = useMutation({
    mutationFn: ({ userId, assign }: { userId: string; assign: boolean }) => assign
      ? locationsApi.assign(location.id, userId)
      : locationsApi.remove(location.id, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["location-users", location.id] }),
  });

  function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userId = String(new FormData(event.currentTarget).get("operator") ?? "");
    if (userId) change.mutate({ userId, assign: true });
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <h3 className="font-medium">Operadores asignados</h3>
      {location.isActive && <div className="grid gap-3 md:grid-cols-2">
        <form className="flex items-end gap-2" onSubmit={(event) => {
          event.preventDefault();
          setSearch(String(new FormData(event.currentTarget).get("q") ?? "").trim());
        }}>
          <label className="grid flex-1 gap-1.5 text-sm">Buscar por nombre o usuario
            <Input name="q" maxLength={100} />
          </label>
          <Button type="submit" variant="outline">Buscar operador</Button>
        </form>
        <form className="flex items-end gap-2" onSubmit={assign}>
          <label className="grid flex-1 gap-1.5 text-sm">Operador
            <select key={search} name="operator" required defaultValue="" className="h-9 rounded-md border bg-background px-2">
              <option value="" disabled>Selecciona un operador</option>
              {candidates.data?.map((user) => <option key={user.id} value={user.id}>{user.displayName} ({user.username})</option>)}
            </select>
          </label>
          <Button type="submit" disabled={change.isPending || !candidates.data?.length}>Asignar</Button>
        </form>
      </div>}
      {candidates.isError && <p role="alert" className="text-destructive">{requestMessage(candidates.error)}</p>}
      {change.isError && <p role="alert" className="text-destructive">{requestMessage(change.error)}</p>}
      {assigned.isPending && <p role="status">Cargando asignaciones…</p>}
      {assigned.isError && <p role="alert" className="text-destructive">{requestMessage(assigned.error)}</p>}
      {assigned.data?.length === 0 && <p className="text-sm text-muted-foreground">No hay operadores asignados.</p>}
      {!!assigned.data?.length && <ul className="divide-y rounded-lg border">
        {assigned.data.map((user) => <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <div>
            <p className="text-sm font-medium">{user.displayName}</p>
            <p className="text-xs text-muted-foreground">{user.username}{!user.isActive && " · Inactivo"}</p>
          </div>
          <Button size="sm" variant="outline" disabled={change.isPending}
            onClick={() => change.mutate({ userId: user.id, assign: false })}>
            Quitar asignación
          </Button>
        </li>)}
      </ul>}
      <Pagination page={page} onChange={setPage} hasNext={assigned.data?.length === pageSize} loading={assigned.isFetching} />
    </div>
  );
}
