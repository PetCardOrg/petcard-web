import { apiFetch } from "./api";

export interface CoordenadasCompartilhadas {
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
}

/**
 * Avisa o tutor de que alguém encontrou o pet.
 *
 * As coordenadas são opcionais de propósito: quem recusar compartilhar a
 * localização ainda assim aciona o aviso, que já é a informação mais urgente.
 */
export function registrarLeitura(
  token: string,
  coordenadas?: CoordenadasCompartilhadas,
): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/cards/${token}/scan`, {
    method: "POST",
    body: coordenadas ?? {},
  });
}
