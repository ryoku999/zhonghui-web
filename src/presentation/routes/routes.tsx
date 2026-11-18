import { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import AuthGuard from "@/presentation/guards/AuthGuard";
import GuestGuard from "@/presentation/guards/GuestGuard";
import RoleGuard from "@/presentation/guards/RoleGuard";
import {
  AuditPage,
  CatalogsPage,
  DashboardPage,
  LoadDetailPage,
  LoadsPage,
  LocationsPage,
  LoginPage,
  NewLoadPage,
  PendingPage,
  SessionLayout,
  UsersPage,
} from "./lazy-pages";

export const routes = createBrowserRouter([
  {
    element: <GuestGuard />,
    children: [
      {
        path: "/login",
        element: (
          <Suspense
            fallback={
              <p className="p-6" role="status">
                Cargando…
              </p>
            }
          >
            <LoginPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        path: "/",
        element: (
          <Suspense
            fallback={
              <p className="p-6" role="status">
                Cargando Zhonghui…
              </p>
            }
          >
            <SessionLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<p role="status">Cargando resumen…</p>}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: "registros",
            element: (
              <Suspense fallback={<p role="status">Cargando registros…</p>}>
                <LoadsPage />
              </Suspense>
            ),
          },
          {
            path: "puntos-de-embarque",
            element: (
              <Suspense fallback={<p role="status">Cargando puntos…</p>}>
                <LocationsPage />
              </Suspense>
            ),
          },
          {
            path: "catalogos",
            element: (
              <Suspense fallback={<p role="status">Cargando catálogos…</p>}>
                <CatalogsPage />
              </Suspense>
            ),
          },
          {
            path: "registros/:id",
            element: (
              <Suspense fallback={<p role="status">Cargando registro…</p>}>
                <LoadDetailPage />
              </Suspense>
            ),
          },
          {
            element: <RoleGuard roles={["ADMIN", "OPERATOR"]} />,
            children: [
              {
                path: "registros/nuevo",
                element: (
                  <Suspense
                    fallback={<p role="status">Cargando formulario…</p>}
                  >
                    <NewLoadPage />
                  </Suspense>
                ),
              },
              {
                path: "pendientes",
                element: (
                  <Suspense
                    fallback={<p role="status">Cargando registros locales…</p>}
                  >
                    <PendingPage />
                  </Suspense>
                ),
              },
            ],
          },
          {
            element: <RoleGuard roles={["ADMIN"]} />,
            children: [
              {
                path: "usuarios",
                element: (
                  <Suspense fallback={<p role="status">Cargando usuarios…</p>}>
                    <UsersPage />
                  </Suspense>
                ),
              },
              {
                path: "auditoria",
                element: (
                  <Suspense fallback={<p role="status">Cargando auditoría…</p>}>
                    <AuditPage />
                  </Suspense>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
]);
