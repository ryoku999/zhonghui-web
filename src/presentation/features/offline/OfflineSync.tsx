import { useEffect } from "react";
import { restoreSession } from "@/presentation/features/auth/auth.api";
import { useAuthStore } from "@/presentation/features/auth/auth.store";
import { syncLocalLoads } from "./offline.sync";

export default function OfflineSync() {
  const ownerId = useAuthStore((state) => state.session?.user.id);

  useEffect(() => {
    function check() {
      if (document.visibilityState === "hidden") return;
      const { status, session } = useAuthStore.getState();
      if (status === "unavailable" && navigator.onLine) {
        void restoreSession();
      } else if (status === "authenticated" && session) {
        void syncLocalLoads(session.user.id).catch(() => {
          // Storage failures are surfaced in the local records screen.
        });
      }
    }
    check();
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", check);
    const interval = window.setInterval(check, 30_000);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [ownerId]);
  return null;
}
