import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getVeterinarioProfile,
  loginVeterinario,
  registerVeterinario,
} from "./auth.service";

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

  it("registerVeterinario faz POST no endpoint público de cadastro", async () => {
    const payload = {
      access_token: "jwt",
      user: { id: "v1", nome: "Dr. Carlos" },
      crmv_verificado: true,
    };
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      statusText: "Created",
      json: () => Promise.resolve(payload),
    } as Response);

    const res = await registerVeterinario({
      nome: "Dr. Carlos",
      email: "carlos@vet.com",
      password: "senha-forte",
      crmv: "CRMV-SP 12345",
    });

    expect(res.crmv_verificado).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/auth/veterinario/register`,
      expect.objectContaining({ method: "POST" }),
    );
    // O cadastro é público: nada de Authorization aqui.
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).not.toHaveProperty("Authorization");
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
