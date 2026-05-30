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
