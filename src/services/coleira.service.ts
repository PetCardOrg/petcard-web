import { apiFetch } from "./api";

/**
 * O que a página do achador mostra.
 *
 * Sem histórico clínico: quem lê o QR da coleira é um estranho na rua, e
 * vacina ou medicação não o ajudam a devolver o animal. Esses dados seguem na
 * carteira digital, que tem token e público próprios.
 */
export interface ColeiraPublica {
  pet_id: string;
  pet_name: string;
  species: string;
  breed?: string;
  sex: string;
  photo_url?: string;
  tutor_name: string;
  tutor_phone?: string;
}

export interface CoordenadasCompartilhadas {
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
}

export function getColeiraPublica(token: string): Promise<ColeiraPublica> {
  return apiFetch<ColeiraPublica>(`/coleira/${token}`);
}

/**
 * Avisa o tutor de que alguém encontrou o pet.
 *
 * As coordenadas são opcionais de propósito: quem negar a localização ainda
 * assim aciona o aviso, que já é a informação mais urgente.
 */
export function registrarLeitura(
  token: string,
  coordenadas?: CoordenadasCompartilhadas,
): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/coleira/${token}/leitura`, {
    method: "POST",
    body: coordenadas ?? {},
  });
}
