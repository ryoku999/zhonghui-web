import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore, type Role } from "@/presentation/features/auth/auth.store";

export default function RoleGuard({ roles }: { roles: Role[] }) {
  const currentRole = useAuthStore((state) => state.session?.user.role);
  return currentRole && roles.includes(currentRole) ? <Outlet /> : <Navigate to="/" replace />;
}
