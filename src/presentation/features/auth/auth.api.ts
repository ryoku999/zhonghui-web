import axios from "axios";
import { queryClient } from "@/config/query";
import { api, cookieClient } from "@/shared/api/http";
import { useAuthStore, type Session } from "./auth.store";

let pendingRefresh: Promise<Session> | undefined;
let sessionVersion = 0;
type SessionRequest = { sessionVersion?: number; retried?: boolean };

function updateSession(session: Session | null) {
  if (session?.user.id !== useAuthStore.getState().session?.user.id) {
    sessionVersion += 1;
    queryClient.clear();
  }
  useAuthStore.setState({
    session,
    status: session ? "authenticated" : "anonymous",
  });
}

function withSessionLock<T>(callback: () => Promise<T>): Promise<T> {
  return navigator.locks
    ? navigator.locks.request("zhonghui-auth-cookie", callback)
    : callback();
}

export async function login(username: string, password: string) {
  return withSessionLock(async () => {
    const { data } = await cookieClient.post<Session>("/auth/login", { username, password });
    if (useAuthStore.getState().session?.user.id === data.user.id) sessionVersion += 1;
    updateSession(data);
  });
}

function refreshSession() {
  pendingRefresh ??= withSessionLock(async () => {
    try {
      const { data } = await cookieClient.post<Session>("/auth/refresh");
      updateSession(data);
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        updateSession(null);
      }
      throw error;
    }
  }).finally(() => {
    pendingRefresh = undefined;
  });
  return pendingRefresh;
}

export async function restoreSession() {
  useAuthStore.setState({ status: "loading" });
  try {
    await refreshSession();
  } catch {
    if (useAuthStore.getState().status === "loading") {
      useAuthStore.setState({ status: "unavailable" });
    }
  }
}

export async function logout() {
  return withSessionLock(async () => {
    await cookieClient.post("/auth/logout");
    updateSession(null);
  });
}

api.interceptors.request.use((config) => {
  const request = config as typeof config & SessionRequest;
  if (request.sessionVersion !== undefined && request.sessionVersion !== sessionVersion) {
    throw new axios.CanceledError("La sesión cambió.");
  }
  request.sessionVersion ??= sessionVersion;
  const session = useAuthStore.getState().session;
  if (session) config.headers.set("Authorization", `Bearer ${session.accessToken}`);
  return config;
});

api.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
    throw error;
  }
  const config = error.config as typeof error.config & SessionRequest;
  const session = useAuthStore.getState().session;
  if (!session || config.retried || config.sessionVersion !== sessionVersion) throw error;

  const version = sessionVersion;
  config.retried = true;
  if (config.headers.get("Authorization") === `Bearer ${session.accessToken}`) {
    await refreshSession();
  }
  if (sessionVersion !== version) throw error;
  return api.request(config);
});
