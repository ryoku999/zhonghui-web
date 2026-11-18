import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/presentation/features/auth/auth.store";

export default function GuestGuard() {
  const status = useAuthStore((state) => state.status);
  if (status === "loading") return <p className="p-6" role="status">Cargando sesión…</p>;
  return status === "authenticated" ? <Navigate to="/" replace /> : <Outlet />;
}
