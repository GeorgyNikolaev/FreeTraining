import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiFetch } from "../api/client";
import type {
  AuthSession,
  GuestProgress,
  LoginInput,
  RegisterInput,
  UserOut,
} from "../api/types";
import { applySession, refreshSession, subscribeSession } from "./session";

type AuthState =
  | { status: "loading"; user: null; guestProgress: null }
  | { status: "guest"; user: null; guestProgress: null }
  | { status: "user"; user: UserOut; guestProgress: GuestProgress | null };

type AuthContextValue = AuthState & {
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  mergeGuestProgress: () => Promise<void>;
  discardGuestProgress: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const LOADING: AuthState = { status: "loading", user: null, guestProgress: null };
const GUEST: AuthState = { status: "guest", user: null, guestProgress: null };

function toState(session: AuthSession | null): AuthState {
  return session
    ? { status: "user", user: session.user, guestProgress: session.guest_progress ?? null }
    : GUEST;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>(LOADING);

  useEffect(() => {
    const unsubscribe = subscribeSession((session) => setState(toState(session)));
    // Тихий вход по refresh-cookie: нет cookie — пользователь гость
    void refreshSession();
    return unsubscribe;
  }, []);

  // Прогресс на всех экранах зависит от того, кто вошёл
  const resetData = useCallback(() => queryClient.resetQueries(), [queryClient]);

  const signIn = useCallback(
    async (path: string, input: LoginInput | RegisterInput) => {
      const session = await apiFetch<AuthSession>(path, {
        method: "POST",
        body: JSON.stringify(input),
      });
      applySession(session);
      await resetData();
    },
    [resetData],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      applySession(null);
      await resetData();
    }
  }, [resetData]);

  const settleGuestProgress = useCallback(
    async (action: "merge" | "discard") => {
      await apiFetch(`/api/auth/guest/${action}`, { method: "POST" });
      setState((current) =>
        current.status === "user" ? { ...current, guestProgress: null } : current,
      );
      await resetData();
    },
    [resetData],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: (input) => signIn("/api/auth/login", input),
      register: (input) => signIn("/api/auth/register", input),
      logout,
      mergeGuestProgress: () => settleGuestProgress("merge"),
      discardGuestProgress: () => settleGuestProgress("discard"),
    }),
    [state, signIn, logout, settleGuestProgress],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth используется вне AuthProvider");
  return value;
}

/** Безопасный адрес возврата: только внутренние пути приложения. */
export function safeNext(value: string | null, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function authPath(page: "login" | "register", next: string): string {
  return next === "/" ? `/${page}` : `/${page}?next=${encodeURIComponent(next)}`;
}
