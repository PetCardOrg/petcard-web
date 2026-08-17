import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCrmvStatus, verificarCrmv } from "./crmv.service";
import { ApiError } from "./api";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function ok(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    clone() {
      return this;
    },
  };
}

describe("crmv.service", () => {
  it("consulta a situação do CRMV", async () => {
    fetchMock.mockResolvedValue(ok({ verified: true, situacao: "Ativo" }));

    await expect(fetchCrmvStatus("jwt")).resolves.toEqual({
      verified: true,
      situacao: "Ativo",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/veterinarios/me/crmv");
    expect(init.headers.Authorization).toBe("Bearer jwt");
  });

  it("dispara a verificação sem force por padrão", async () => {
    fetchMock.mockResolvedValue(ok({ verified: true }));

    await verificarCrmv("jwt");

    const [url, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(String(url)).not.toContain("force");
  });

  it("passa force=true quando pedido", async () => {
    fetchMock.mockResolvedValue(ok({ verified: true }));

    await verificarCrmv("jwt", true);

    expect(String(fetchMock.mock.calls[0][0])).toContain("force=true");
  });
});

describe("ApiError", () => {
  it("carrega a mensagem devolvida pela API", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: () => Promise.resolve({ message: "CRMV precisa estar verificado" }),
      clone() {
        return this;
      },
    });

    const erro = await verificarCrmv("jwt").catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).detail).toMatch(/CRMV/);
    expect((erro as ApiError).isCrmvNaoVerificado).toBe(true);
  });

  it("não confunde outro 403 com bloqueio de CRMV", () => {
    expect(
      new ApiError(403, "Forbidden", "Pet de outro tutor").isCrmvNaoVerificado,
    ).toBe(false);
  });

  it("tolera corpo de erro sem JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.reject(new Error("não é json")),
      clone() {
        return this;
      },
    });

    const erro = (await verificarCrmv("jwt").catch(
      (e: unknown) => e,
    )) as ApiError;

    expect(erro.status).toBe(500);
    expect(erro.detail).toBeUndefined();
  });
});
