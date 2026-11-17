import type {
  CreateVeterinarioDto,
  LoginDto,
  VeterinarioRegisterResponseDto,
  VeterinarioSessionResponseDto,
  VeterinarioSessionUserDto,
} from "@petcardorg/shared";
import { apiFetch } from "./api";

export function loginVeterinario(
  dto: LoginDto,
): Promise<VeterinarioSessionResponseDto> {
  return apiFetch<VeterinarioSessionResponseDto>("/auth/veterinario/login", {
    method: "POST",
    body: dto,
  });
}

export function registerVeterinario(
  dto: CreateVeterinarioDto,
): Promise<VeterinarioRegisterResponseDto> {
  return apiFetch<VeterinarioRegisterResponseDto>(
    "/auth/veterinario/register",
    {
      method: "POST",
      body: dto,
    },
  );
}

export function getVeterinarioProfile(
  token: string,
  options: { timeoutMs?: number } = {},
): Promise<VeterinarioSessionUserDto> {
  return apiFetch<VeterinarioSessionUserDto>("/auth/veterinario/profile", {
    token,
    ...options,
  });
}
