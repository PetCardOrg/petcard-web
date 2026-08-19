import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adicionarPetAtendido,
  fetchDashboardPets,
  removerPetAtendido,
} from "./dashboard.service";

const BASE = "http://localhost:3000";

describe("fetchDashboardPets", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ items: [], total: 0 }),
    } as Response);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function calledUrl(): string {
    return fetchMock.mock.calls[0][0] as string;
  }

  it("sem query não anexa querystring", async () => {
    await fetchDashboardPets("jwt");
    expect(calledUrl()).toBe(`${BASE}/veterinarios/dashboard/pets`);
  });

  it("monta a querystring com page, pageSize e search", async () => {
    await fetchDashboardPets("jwt", {
      page: 2,
      pageSize: 10,
      search: "rex",
    });
    expect(calledUrl()).toBe(
      `${BASE}/veterinarios/dashboard/pets?page=2&pageSize=10&search=rex`,
    );
  });

  it("ignora page=0 (falsy) e inclui apenas o que foi informado", async () => {
    await fetchDashboardPets("jwt", { page: 0, search: "bob" });
    expect(calledUrl()).toBe(`${BASE}/veterinarios/dashboard/pets?search=bob`);
  });

  it("envia o token no header de autorização", async () => {
    await fetchDashboardPets("jwt-xyz");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: { Authorization: "Bearer jwt-xyz" },
    });
  });
});

describe("vínculo do veterinário com o pet", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ pet_id: "p1", novo: true }),
    } as Response);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adiciona o pet mandando o token do QR no corpo", async () => {
    const res = await adicionarPetAtendido("jwt", "tok-do-qr");

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/veterinarios/me/pets`);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ token: "tok-do-qr" }),
    });
    expect(res).toMatchObject({ pet_id: "p1" });
  });

  it("remove o pet pelo id, não pelo token", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      statusText: "No Content",
      json: () => Promise.resolve(null),
    } as Response);

    await removerPetAtendido("jwt", "p1");

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/veterinarios/me/pets/p1`);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
  });
});
