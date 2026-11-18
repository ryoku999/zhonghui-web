import { lazy } from "react";

export const HomePage = lazy(
  () => import("@/presentation/features/test/pages/HomePage"),
);

export const LoginPage = lazy(() => import("@/presentation/features/auth/pages/LoginPage"));
export const UsersPage = lazy(() => import("@/presentation/features/admin/UsersPage"));
export const LocationsPage = lazy(() => import("@/presentation/features/catalog/LocationsPage"));
export const CatalogsPage = lazy(() => import("@/presentation/features/catalog/CatalogsPage"));
export const NewLoadPage = lazy(() => import("@/presentation/features/loads/NewLoadPage"));
export const LoadDetailPage = lazy(() => import("@/presentation/features/loads/LoadDetailPage"));
export const LoadsPage = lazy(() => import("@/presentation/features/reports/LoadsPage"));
export const DashboardPage = lazy(() => import("@/presentation/features/reports/DashboardPage"));
export const AuditPage = lazy(() => import("@/presentation/features/reports/AuditPage"));
