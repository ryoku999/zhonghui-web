import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardHeader } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { useAuthStore } from "@/presentation/features/auth/auth.store";
import { requestMessage } from "@/presentation/features/catalog/catalog.api";
import { formatDatePE, formatDateTimePE } from "@/shared/lib/dates";
import LoadSummary from "./LoadSummary";
import { getLoad, updateLoad } from "./loads.api";

export default function LoadDetailPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const user = useAuthStore((state) => state.session?.user);
  const client = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const queryKey = ["loads", id];
  const result = useQuery({ queryKey, queryFn: () => getLoad(id), retry: false });
  const update = useMutation({
    mutationFn: (changes: Parameters<typeof updateLoad>[1]) => updateLoad(id, changes),
    onSuccess: (record) => {
      client.setQueryData(queryKey, record);
      setConfirmCancel(false);
    },
  });

  if (result.isPending) return <p role="status">Cargando registro…</p>;
  if (result.isError) return <p role="alert" className="text-destructive">{requestMessage(result.error)}</p>;
  const record = result.data;
  const canWrite = user?.role === "ADMIN" || (user?.role === "OPERATOR" && user.id === record.createdBy);

  function edit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    update.mutate({
      version: record.version,
      unitDescription: String(fields.get("unitDescription") ?? ""),
      notes: String(fields.get("notes") ?? ""),
    });
  }

  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {location.state?.created && <p className="text-sm text-muted-foreground">Registro guardado</p>}
          <h1 className="text-2xl font-semibold tracking-tight">Orden {record.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">{formatDatePE(record.businessDate)} · {record.snapshot.locationName}</p>
        </div>
        <Badge variant={record.status === "CANCELLED" ? "outline" : "secondary"}>
          {record.status === "CANCELLED" ? "Anulado" : "Registrado"}
        </Badge>
      </div>
      <Card>
        <CardHeader><h2 className="font-semibold">Datos del registro</h2></CardHeader>
        <CardContent className="space-y-4">
          <LoadSummary input={record.snapshot} locationName={record.snapshot.locationName} />
          <p className="text-sm text-muted-foreground">Registrado el {formatDateTimePE(record.createdAt)} (hora de Lima)</p>
        </CardContent>
      </Card>
      {canWrite && record.status === "REGISTERED" && <Card>
        <CardHeader><h2 className="font-semibold">Actualizar registro</h2></CardHeader>
        <CardContent className="space-y-4">
          <form key={record.version} className="space-y-3" onSubmit={edit}>
            <label className="grid gap-1.5 text-sm">Unidad
              <Input name="unitDescription" maxLength={200} defaultValue={record.snapshot.unitDescription} />
            </label>
            <label className="grid gap-1.5 text-sm">Observaciones
              <textarea name="notes" maxLength={1000} defaultValue={record.snapshot.notes}
                className="min-h-24 rounded-md border bg-background p-2" />
            </label>
            <Button type="submit" disabled={update.isPending || confirmCancel}>Guardar cambios</Button>
          </form>
          {update.isError && <div className="flex flex-wrap items-center gap-3">
            <p role="alert" className="text-sm text-destructive">{requestMessage(update.error)}</p>
            <Button size="sm" variant="outline" onClick={() => { update.reset(); void result.refetch(); }}>Recargar registro</Button>
          </div>}
          {confirmCancel ? <div className="space-y-2 border-t pt-4">
            <p className="text-sm">El registro conservará su número oficial y quedará anulado.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={update.isPending} onClick={() => setConfirmCancel(false)}>Volver</Button>
              <Button variant="destructive" disabled={update.isPending}
                onClick={() => update.mutate({ version: record.version, status: "CANCELLED" })}>Confirmar anulación</Button>
            </div>
          </div> : <Button variant="outline" disabled={update.isPending} onClick={() => setConfirmCancel(true)}>Anular registro</Button>}
        </CardContent>
      </Card>}
      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="underline" to="/">Inicio</Link>
        {(user?.role === "ADMIN" || user?.role === "OPERATOR") &&
          <Link className="underline" to="/registros/nuevo">Crear otro registro</Link>}
      </div>
    </section>
  );
}
