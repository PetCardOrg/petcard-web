import type {
  CrmvConsultaResponseDto,
  CrmvStatusResponseDto,
} from "@petcardorg/shared";
import { apiFetch } from "./api";
import { updateVeterinario } from "./vet-profile.service";

export function fetchCrmvStatus(token: string): Promise<CrmvStatusResponseDto> {
  return apiFetch<CrmvStatusResponseDto>("/veterinarios/me/crmv", { token });
}

/**
 * Dispara a verificação do CRMV na base externa (api#113).
 *
 * A consulta é paga por chamada: sem `force`, a API reaproveita a verificação
 * anterior enquanto ela estiver dentro do prazo.
 */
export function verificarCrmv(
  token: string,
  force = false,
): Promise<CrmvStatusResponseDto> {
  return apiFetch<CrmvStatusResponseDto>(
    `/veterinarios/me/crmv/verificar${force ? "?force=true" : ""}`,
    { method: "POST", token },
  );
}

/**
 * Corrige o CRMV do próprio veterinário (`PATCH /veterinarios/me`).
 *
 * A API zera a verificação junto com a troca, então salvar sozinho não
 * destrava nada — quem chama precisa verificar em seguida.
 */
export function corrigirMeuCrmv(token: string, crmv: string): Promise<void> {
  return updateVeterinario(token, { crmv });
}

/**
 * A consulta ao CFMV passa por um robô de terceiro e leva de 10 a 20 s — acima
 * do teto padrão do `apiFetch` (10 s), que cortava a resposta e mandava o vet
 * para o preenchimento manual mesmo com a consulta dando certo.
 */
const CONSULTA_CRMV_TIMEOUT_MS = 45000;

/**
 * Consulta o CRMV antes do cadastro (rota pública). A API guarda a consulta
 * por alguns minutos, e o cadastro em seguida a reaproveita.
 */
export function consultarCrmv(crmv: string): Promise<CrmvConsultaResponseDto> {
  return apiFetch<CrmvConsultaResponseDto>(
    `/auth/veterinario/crmv?crmv=${encodeURIComponent(crmv.trim())}`,
    { timeoutMs: CONSULTA_CRMV_TIMEOUT_MS },
  );
}
