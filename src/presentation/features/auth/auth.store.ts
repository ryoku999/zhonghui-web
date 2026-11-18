import { create } from "zustand";

export type Role = "ADMIN" | "OPERATOR" | "DOCUMENTATION";

export type User = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
};

export type Session = { accessToken: string; user: User };

type AuthState = {
  status: "loading" | "authenticated" | "anonymous" | "unavailable";
  session: Session | null;
};

export const useAuthStore = create<AuthState>(() => ({
  status: "loading",
  session: null,
}));
