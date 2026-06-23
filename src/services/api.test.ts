import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./api";

const BASE = "http://localhost:3000";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    json: () => Promise.resolve(body),
  } as Response;
}

describe("apiFetch", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("faz GET sem corpo nem Content-Type por padrão", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    const data = await apiFetch<{ ok: boolean }>("/health");

    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/health`, {
      method: "GET",
      headers: {},
      body: undefined,
    });
  });

  it("serializa o corpo, seta Content-Type e Authorization no POST", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "1" }, 201));

    await apiFetch("/pets", {
      method: "POST",
      body: { name: "Rex" },
      token: "jwt-123",
    });

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/pets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-123",
      },
      body: JSON.stringify({ name: "Rex" }),
    });
  });

  it("retorna undefined em 204 sem chamar json()", async () => {
    const json = vi.fn();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      statusText: "No Content",
      json,
    } as unknown as Response);

    const result = await apiFetch("/pets/1", { method: "DELETE" });

    expect(result).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it("lança ApiError preservando o status em respostas não-ok", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({}),
    } as Response);

    await expect(apiFetch("/auth/profile")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
    });
    await expect(apiFetch("/auth/profile")).rejects.toBeInstanceOf(ApiError);
  });
});
