import { apiFetch } from "./api";

export interface CrmvStatus {
  verified: boolean;
  situacao?: string;
  verified_at?: string;
}

export function fetchCrmvStatus(token: string): Promise<CrmvStatus> {
  return apiFetch<CrmvStatus>("/veterinarios/me/crmv", { token });
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
): Promise<CrmvStatus> {
  return apiFetch<CrmvStatus>(
    `/veterinarios/me/crmv/verificar${force ? "?force=true" : ""}`,
    { method: "POST", token },
  );
}
