import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getVeterinarioProfile, loginVeterinario } from "./auth.service";

const BASE = "http://localhost:3000";

describe("auth.service", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loginVeterinario faz POST no endpoint do vet com as credenciais", async () => {
    const payload = {
      access_token: "jwt",
      user: { id: "v1", nome: "Dra. Camila" },
    };
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      statusText: "Created",
      json: () => Promise.resolve(payload),
    } as Response);

    const res = await loginVeterinario({
      email: "vet@petcard.com",
      password: "senha123",
    });

    expect(res).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/auth/veterinario/login`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "vet@petcard.com",
          password: "senha123",
        }),
      }),
    );
  });

  it("getVeterinarioProfile envia o token no header e usa GET", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ id: "v1" }),
    } as Response);

    await getVeterinarioProfile("jwt-abc");

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/auth/veterinario/profile`,
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer jwt-abc" },
      }),
    );
  });
});
