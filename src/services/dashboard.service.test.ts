import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDashboardPets } from "./dashboard.service";

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
