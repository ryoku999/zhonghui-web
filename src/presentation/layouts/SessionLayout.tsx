import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { BookOpen, ClipboardList, FilePlus, Inbox, LayoutDashboard, MapPin, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/presentation/components/ui/button";
import { logout } from "@/presentation/features/auth/auth.api";
import { useAuthStore } from "@/presentation/features/auth/auth.store";
import { useLocalLoads } from "@/presentation/features/offline/useLocalData";

export default function SessionLayout() {
  const user = useAuthStore((state) => state.session?.user);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const links = [
    { to: "/", label: "Resumen", icon: LayoutDashboard },
    { to: "/registros", label: "Registros", icon: ClipboardList },
    ...((user?.role === "ADMIN" || user?.role === "OPERATOR")
      ? [
        { to: "/registros/nuevo", label: "Nuevo registro", icon: FilePlus },
        { to: "/pendientes", label: "Pendientes", icon: Inbox },
      ]
      : []),
    { to: "/puntos-de-embarque", label: "Puntos de embarque", icon: MapPin },
    { to: "/catalogos", label: "Catálogos", icon: BookOpen },
    ...(user?.role === "ADMIN" ? [
      { to: "/usuarios", label: "Usuarios", icon: Users },
      { to: "/auditoria", label: "Auditoría", icon: ShieldCheck },
    ] : []),
  ];

  async function endSession() {
    setPending(true);
    setFailed(false);
    try {
      await logout();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3 sm:px-6">
        <Link to="/" className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-lg font-semibold tracking-tight">zhonghui</span>
          <span className="text-xs text-muted-foreground">Registro de transportistas</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="max-w-40 truncate text-sm text-muted-foreground">{user?.displayName}</span>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => void endSession()}>
            {pending ? "Cerrando…" : "Cerrar sesión"}
          </Button>
        </div>
      </header>
      <div className="grid md:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="min-w-0 border-b bg-background md:min-h-[calc(100svh-4rem)] md:border-r md:border-b-0">
          <nav aria-label="Navegación principal" className="flex gap-1 overflow-x-auto p-2 md:flex-col md:p-3">
            {links.map(({ to, label, icon: Icon }) => <NavLink end key={to} to={to}
              className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive
                ? "bg-primary font-medium text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Icon aria-hidden="true" className="size-4 shrink-0" />{label}
              {to === "/pendientes" && user && <PendingCount ownerId={user.id} />}
            </NavLink>)}
          </nav>
        </aside>
        <main className="min-w-0 space-y-4 p-4 sm:p-6">
          {failed && <p role="alert" className="text-sm text-destructive">No se pudo cerrar la sesión. Inténtalo de nuevo.</p>}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PendingCount({ ownerId }: { ownerId: string }) {
  const count = useLocalLoads(ownerId)?.data?.filter((entry) => entry.status !== "SYNCED" && entry.status !== "DRAFT").length ?? 0;
  return count > 0 ? <span className="rounded-full bg-muted px-1.5 text-xs text-foreground" aria-label={`${count} envíos pendientes`}>{count}</span> : null;
}
