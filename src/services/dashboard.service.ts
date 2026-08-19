import type { PetAtendidoResponseDto } from "@petcardorg/shared";
import { apiFetch } from "./api";

export interface DashboardPetItem {
  id: string;
  name: string;
  species: string;
  breed?: string;
  photo_url?: string;
  tutor_name: string;
  last_attended_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

export function fetchDashboardPets(
  token: string,
  query: DashboardQuery = {},
): Promise<PaginatedResponse<DashboardPetItem>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);

  const qs = params.toString();
  const path = `/veterinarios/dashboard/pets${qs ? `?${qs}` : ""}`;

  return apiFetch<PaginatedResponse<DashboardPetItem>>(path, { token });
}

/**
 * Vincula ao veterinário o pet cuja carteira foi lida no QR (api#130).
 *
 * A lista do dashboard é um vínculo guardado, não uma dedução dos registros
 * clínicos: sem esta chamada o pet não entra, e apagar um registro não o tira.
 */
export function adicionarPetAtendido(
  token: string,
  cardToken: string,
): Promise<PetAtendidoResponseDto> {
  return apiFetch<PetAtendidoResponseDto>("/veterinarios/me/pets", {
    method: "POST",
    body: { token: cardToken },
    token,
  });
}

/** Tira o pet da lista do veterinário. Não apaga pet nem registros. */
export async function removerPetAtendido(
  token: string,
  petId: string,
): Promise<void> {
  await apiFetch(`/veterinarios/me/pets/${petId}`, {
    method: "DELETE",
    token,
  });
}
