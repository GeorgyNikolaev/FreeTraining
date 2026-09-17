import { getAccessToken, refreshSession } from "../auth/session";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof (body as { detail: unknown }).detail === "string"
    ) {
      return (body as { detail: string }).detail;
    }
  } catch {
    // тело не является JSON — воспользуемся общим текстом
  }
  return `Сервер ответил ошибкой ${response.status}`;
}

async function send(path: string, init: RequestInit | undefined): Promise<Response> {
  const token = getAccessToken();
  try {
    return await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Не удалось связаться с сервером. Он запущен?");
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const hadToken = getAccessToken() !== null;
  let response = await send(path, init);

  // Access-токен истёк или отозван: один раз обновляем и повторяем запрос.
  // Не вышло — пользователь стал гостем, запрос уходит без токена.
  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    const session = await refreshSession();
    if (session || hadToken) {
      response = await send(path, init);
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
