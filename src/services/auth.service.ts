import { apiFetch } from "./api";

export interface VetLoginRequest {
  email: string;
  password: string;
}

export interface VetUser {
  id: string;
  nome: string;
  email: string;
  crmv: string;
  role: string;
  telefone?: string;
}

export interface VetLoginResponse {
  access_token: string;
  user: VetUser;
}

export function loginVeterinario(
  dto: VetLoginRequest,
): Promise<VetLoginResponse> {
  return apiFetch<VetLoginResponse>("/auth/veterinario/login", {
    method: "POST",
    body: dto,
  });
}

export function getVeterinarioProfile(token: string): Promise<VetUser> {
  return apiFetch<VetUser>("/auth/veterinario/profile", { token });
}
