import type {
  DashboardPetResponseDto,
  DashboardQueryDto,
  PaginatedResponse,
  PetAtendidoResponseDto,
} from "@petcardorg/shared";
import { apiFetch, caminho } from "./api";

export function fetchDashboardPets(
  token: string,
  query: DashboardQueryDto = {},
): Promise<PaginatedResponse<DashboardPetResponseDto>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);

  const qs = params.toString();
  const path = `/veterinarios/dashboard/pets${qs ? `?${qs}` : ""}`;

  return apiFetch<PaginatedResponse<DashboardPetResponseDto>>(path, { token });
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
  await apiFetch(caminho`/veterinarios/me/pets/${petId}`, {
    method: "DELETE",
    token,
  });
}
