import type { CarteiraDigitalPublicResponseDto } from "@petcardorg/shared";

import { apiFetch, caminho } from "./api";

export function getPublicCard(
  token: string,
): Promise<CarteiraDigitalPublicResponseDto> {
  return apiFetch<CarteiraDigitalPublicResponseDto>(caminho`/cards/${token}`);
}
