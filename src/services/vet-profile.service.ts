import type { DeleteVeterinarioDto } from "@petcardorg/shared";
import { apiFetch } from "./api";

export interface UpdateVeterinarioRequest {
  nome?: string;
  email?: string;
  telefone?: string;
  crmv?: string;
  foto_url?: string;
  /** Obrigatória quando o e-mail muda (AUD API-04). */
  senha_atual?: string;
}

/**
 * A resposta do PATCH é o registro cru do banco (camelCase, com campos
 * internos como `crmvVerifiedAt`) — não o mesmo formato do perfil logado.
 * Por isso o retorno não é tipado: quem chama deve reconsultar
 * `getVeterinarioProfile` para atualizar o que exibe.
 */
export function updateVeterinario(
  token: string,
  dto: UpdateVeterinarioRequest,
): Promise<void> {
  return apiFetch<void>("/veterinarios/me", {
    method: "PATCH",
    body: dto,
    token,
  });
}

/** Exclui a conta. Exige a senha atual no corpo (AUD API-28). */
export function deleteVeterinario(
  token: string,
  dto: DeleteVeterinarioDto,
): Promise<void> {
  return apiFetch<void>("/veterinarios/me", {
    method: "DELETE",
    body: dto,
    token,
  });
}
