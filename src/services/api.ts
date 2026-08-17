const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // A mensagem do corpo distingue motivos que compartilham o mesmo status —
    // um 403 por CRMV não verificado pede ação diferente de um 403 por posse.
    let detail: string | undefined;
    try {
      const body: unknown = await res.clone().json();
      const message = (body as { message?: unknown })?.message;
      detail = Array.isArray(message)
        ? message.join(", ")
        : typeof message === "string"
          ? message
          : undefined;
    } catch {
      detail = undefined;
    }
    throw new ApiError(res.status, res.statusText, detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  readonly status: number;
  /** Mensagem devolvida pela API, quando houver. */
  readonly detail?: string;

  constructor(status: number, statusText: string, detail?: string) {
    super(detail ?? `${status} ${statusText}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }

  /** 403 causado por CRMV não verificado (api#113), e não por falta de posse. */
  get isCrmvNaoVerificado(): boolean {
    return this.status === 403 && /CRMV/i.test(this.detail ?? "");
  }
}
