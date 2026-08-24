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
  foto_url?: string;
}

export interface VetLoginResponse {
  access_token: string;
  user: VetUser;
}

export interface VetRegisterRequest {
  nome: string;
  email: string;
  password: string;
  crmv: string;
  telefone?: string;
}

export interface VetRegisterResponse extends VetLoginResponse {
  /** Se a consulta ao CFMV durante o cadastro já liberou o acesso clínico. */
  crmv_verificado: boolean;
}

export function loginVeterinario(
  dto: VetLoginRequest,
): Promise<VetLoginResponse> {
  return apiFetch<VetLoginResponse>("/auth/veterinario/login", {
    method: "POST",
    body: dto,
  });
}

export function registerVeterinario(
  dto: VetRegisterRequest,
): Promise<VetRegisterResponse> {
  return apiFetch<VetRegisterResponse>("/auth/veterinario/register", {
    method: "POST",
    body: dto,
  });
}

export function getVeterinarioProfile(token: string): Promise<VetUser> {
  return apiFetch<VetUser>("/auth/veterinario/profile", { token });
}
