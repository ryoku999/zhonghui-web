import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./config/query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "react-router-dom";
import { routes } from "./presentation/routes/routes";
import { useEffect } from "react";
import { restoreSession } from "./presentation/features/auth/auth.api";

const App = () => {
  useEffect(() => {
    void restoreSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={routes} />
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
};
export default App;
