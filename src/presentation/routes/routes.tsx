import { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import AuthGuard from "@/presentation/guards/AuthGuard";
import GuestGuard from "@/presentation/guards/GuestGuard";
import RoleGuard from "@/presentation/guards/RoleGuard";
import SessionLayout from "@/presentation/layouts/SessionLayout";
import { CatalogsPage, LocationsPage, LoginPage, UsersPage } from "./lazy-pages";

export const routes = createBrowserRouter([
  {
    element: <GuestGuard />,
    children: [{
      path: "/login",
      element: <Suspense fallback={<p className="p-6" role="status">Cargando…</p>}><LoginPage /></Suspense>,
    }],
  },
  {
    element: <AuthGuard />,
    children: [{
      path: "/",
      element: <SessionLayout />,
      children: [
        { index: true, element: <h1 className="text-xl font-semibold">Inicio</h1> },
        {
          path: "puntos-de-embarque",
          element: <Suspense fallback={<p role="status">Cargando puntos…</p>}><LocationsPage /></Suspense>,
        },
        {
          path: "catalogos",
          element: <Suspense fallback={<p role="status">Cargando catálogos…</p>}><CatalogsPage /></Suspense>,
        },
        {
          element: <RoleGuard role="ADMIN" />,
          children: [{
            path: "usuarios",
            element: <Suspense fallback={<p role="status">Cargando usuarios…</p>}><UsersPage /></Suspense>,
          }],
        },
      ],
    }],
  },
]);
