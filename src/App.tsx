import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./config/query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "react-router-dom";
import { routes } from "./presentation/routes/routes";
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "sonner";
import { restoreSession } from "./presentation/features/auth/auth.api";

const OfflineSync = lazy(
  () => import("./presentation/features/offline/OfflineSync"),
);

const App = () => {
  useEffect(() => {
    void restoreSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={routes} />
      <Suspense fallback={null}>
        <OfflineSync />
      </Suspense>
      <Toaster richColors />
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
};
export default App;
