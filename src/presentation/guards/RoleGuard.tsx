import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore, type Role } from "@/presentation/features/auth/auth.store";

export default function RoleGuard({ role }: { role: Role }) {
  const currentRole = useAuthStore((state) => state.session?.user.role);
  return currentRole === role ? <Outlet /> : <Navigate to="/" replace />;
}
