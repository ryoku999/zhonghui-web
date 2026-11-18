import { Navigate, Outlet } from "react-router-dom";
import { restoreSession } from "@/presentation/features/auth/auth.api";
import { useAuthStore } from "@/presentation/features/auth/auth.store";
import { Button } from "@/presentation/components/ui/button";

export default function AuthGuard() {
  const status = useAuthStore((state) => state.status);
  if (status === "loading") return <p className="p-6" role="status">Cargando sesión…</p>;
  if (status === "unavailable") return (
    <main className="space-y-3 p-6">
      <p role="alert">No se pudo comprobar tu sesión.</p>
      <Button onClick={() => void restoreSession()}>Reintentar</Button>
    </main>
  );
  return status === "anonymous" ? <Navigate to="/login" replace /> : <Outlet />;
}
