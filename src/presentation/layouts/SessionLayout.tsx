import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Button } from "@/presentation/components/ui/button";
import { logout } from "@/presentation/features/auth/auth.api";
import { useAuthStore } from "@/presentation/features/auth/auth.store";

export default function SessionLayout() {
  const user = useAuthStore((state) => state.session?.user);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

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
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
          <Link to="/" className="mr-auto text-lg font-semibold">zhonghui</Link>
          {user?.role === "ADMIN" && <Link to="/usuarios" className="text-sm underline">Usuarios</Link>}
          <span className="text-sm text-muted-foreground">{user?.displayName}</span>
          <Button variant="outline" disabled={pending} onClick={() => void endSession()}>
            {pending ? "Cerrando…" : "Cerrar sesión"}
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-4 p-6">
        {failed && <p role="alert" className="text-sm text-destructive">No se pudo cerrar la sesión. Inténtalo de nuevo.</p>}
        <Outlet />
      </main>
    </>
  );
}
