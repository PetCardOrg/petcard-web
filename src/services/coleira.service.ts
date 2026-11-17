import type {
  ColeiraPublicResponseDto,
  PetScanResponseDto,
  RegistrarLeituraDto,
} from "@petcardorg/shared";
import { API_COLD_START_TIMEOUT_MS, apiFetch, caminho } from "./api";

export function getColeiraPublica(
  token: string,
): Promise<ColeiraPublicResponseDto> {
  return apiFetch<ColeiraPublicResponseDto>(caminho`/coleira/${token}`);
}

/**
 * Avisa o tutor de que alguém encontrou o pet.
 *
 * As coordenadas são opcionais de propósito: quem negar a localização ainda
 * assim aciona o aviso, que já é a informação mais urgente.
 */
export function registrarLeitura(
  token: string,
  coordenadas?: RegistrarLeituraDto,
): Promise<PetScanResponseDto> {
  return apiFetch<PetScanResponseDto>(caminho`/coleira/${token}/leitura`, {
    method: "POST",
    body: coordenadas ?? {},
    // Quem abre a página pode ter acabado de acordar a API: cortar em 10s faria
    // o aviso falhar justamente no cold start.
    timeoutMs: API_COLD_START_TIMEOUT_MS,
  });
}
