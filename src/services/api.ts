const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);

  if (!res.ok) {
    throw new ApiError(res.status, res.statusText);
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, statusText: string) {
    super(`${status} ${statusText}`);
    this.name = "ApiError";
    this.status = status;
  }
}
