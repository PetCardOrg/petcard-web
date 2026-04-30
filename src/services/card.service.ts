import type { CarteiraDigitalPublicResponseDto } from "@petcardorg/shared";

import { apiFetch } from "./api";

export function getPublicCard(
  token: string,
): Promise<CarteiraDigitalPublicResponseDto> {
  return apiFetch<CarteiraDigitalPublicResponseDto>(`/cards/${token}`);
}
