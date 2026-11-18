import { lazy } from "react";

export const HomePage = lazy(
  () => import("@/presentation/features/test/pages/HomePage"),
);

export const LoginPage = lazy(() => import("@/presentation/features/auth/pages/LoginPage"));
export const UsersPage = lazy(() => import("@/presentation/features/admin/UsersPage"));
