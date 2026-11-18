import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { useAuthStore } from "@/presentation/features/auth/auth.store";
import { formatDatePE } from "@/shared/lib/dates";
import { changeLocalLoad, type LocalLoad, type LocalStatus } from "./offline.db";
import { syncLocalLoads } from "./offline.sync";
import { useLocalLoads } from "./useLocalData";

const labels: Record<LocalStatus, string> = {
  DRAFT: "Borrador", PENDING_SYNC: "Pendiente", SYNCING: "Sincronizando",
  SYNCED: "Sincronizado", SYNC_ERROR: "Por reintentar", CONFLICT: "Requiere revisión",
};

export default function PendingPage() {
  const ownerId = useAuthStore((state) => state.session?.user.id ?? "");
  const entries = useLocalLoads(ownerId);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function sync() {
    setBusy(true);
    try {
      if (!await syncLocalLoads(ownerId)) {
        toast.info("La API no está disponible o la sesión cambió. Tus registros siguen en este dispositivo.");
      }
    } catch {
      toast.error("No se pudo acceder a la cola local.");
    } finally {
      setBusy(false);
    }
  }

  async function change(entry: LocalLoad, action: Parameters<typeof changeLocalLoad>[2]) {
    try {
      await changeLocalLoad(entry.id, ownerId, action);
      if (action === "retry") await sync();
      if (action === "edit-invalid") void navigate(`/registros/nuevo?draft=${entry.id}`);
    } catch {
      toast.error("No se pudo actualizar el registro local.");
    }
  }

  async function requestPersistence() {
    try {
      const kept = await navigator.storage?.persist?.();
      if (kept) toast.success("El navegador concedió almacenamiento persistente.");
      else toast.info("El navegador no concedió almacenamiento persistente.");
    } catch {
      toast.error("No se pudo solicitar almacenamiento persistente.");
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Registros en este dispositivo</h1>
        <Button disabled={busy} onClick={() => void sync()}>{busy ? "Comprobando…" : "Sincronizar ahora"}</Button>
      </div>
      <Card><CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Los borradores y pendientes se guardan en este navegador. Borrar los datos del sitio elimina los que aún no se sincronizaron.
        </p>
        {typeof navigator.storage?.persist === "function" &&
          <Button variant="outline" size="sm" onClick={() => void requestPersistence()}>Solicitar almacenamiento persistente</Button>}
      </CardContent></Card>
      {!entries && <p role="status">Cargando registros locales…</p>}
      {Boolean(entries?.error) && <p role="alert" className="text-destructive">El navegador no permite acceder al almacenamiento local.</p>}
      {entries?.data?.length === 0 && <p className="text-sm text-muted-foreground">No hay borradores ni registros pendientes.</p>}
      {entries?.data?.map((entry) => <Card key={entry.id}><CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">{entry.locationName}</h2>
          <Badge variant={entry.status === "CONFLICT" ? "outline" : "secondary"}>{labels[entry.status]}</Badge>
        </div>
        {entry.input && <p className="text-sm text-muted-foreground">
          {[entry.input.legalName, entry.input.tractorPlate].filter(Boolean).join(" · ") || "Registro sin completar"}
        </p>}
        {entry.issue && <p className="text-sm text-muted-foreground">{entry.issue}</p>}
        {entry.official && <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>Orden {entry.official.orderNumber} · {formatDatePE(entry.official.businessDate)}</span>
          <Link className="underline" to={`/registros/${entry.official.id}`}>Ver registro</Link>
        </div>}
        {entry.status === "DRAFT" && <div className="flex flex-wrap items-center gap-3">
          <Link className="text-sm underline" to={`/registros/nuevo?draft=${entry.id}`}>Continuar borrador</Link>
          <Button variant="ghost" size="sm" onClick={() => {
            if (window.confirm("¿Eliminar este borrador local?")) void change(entry, "delete-draft");
          }}>Eliminar borrador</Button>
        </div>}
        {(entry.status === "SYNC_ERROR" || entry.status === "CONFLICT") && <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void change(entry, "retry")}>Reintentar envío</Button>
          {entry.issueStatus === 400 &&
            <Button variant="outline" size="sm" onClick={() => void change(entry, "edit-invalid")}>Corregir datos</Button>}
        </div>}
      </CardContent></Card>)}
    </section>
  );
}
