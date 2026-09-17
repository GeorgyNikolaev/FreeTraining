import type { AuthSession } from "../api/types";

/**
 * Access-токен живёт только в памяти вкладки. Refresh-токен лежит в
 * HttpOnly-cookie, поэтому JavaScript его не видит и украсть его через XSS нельзя.
 */
let accessToken: string | null = null;
let inflight: Promise<AuthSession | null> | null = null;

type Listener = (session: AuthSession | null) => void;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  return accessToken;
}

/** Сохраняет выданную сессию и сообщает подписчикам. null — пользователь вышел. */
export function applySession(session: AuthSession | null): void {
  accessToken = session?.access_token ?? null;
  for (const listener of listeners) listener(session);
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function requestRefresh(): Promise<AuthSession | null> {
  try {
    const response = await fetch("/api/auth/refresh", { method: "POST" });
    return response.ok ? ((await response.json()) as AuthSession) : null;
  } catch {
    return null;
  }
}

function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
  // Одновременное обновление из двух вкладок сожгло бы токен одной из них
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request("freetraining-auth-refresh", task) as Promise<T>;
  }
  return task();
}

/** Обновляет пару токенов. Параллельные вызовы делят один запрос. */
export function refreshSession(): Promise<AuthSession | null> {
  inflight ??= withCrossTabLock(requestRefresh)
    .then((session) => {
      applySession(session);
      return session;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
