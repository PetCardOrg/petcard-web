import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicCard } from "./card.service";

const BASE = "http://localhost:3000";

describe("getPublicCard", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("busca a carteira pública pelo token, sem Authorization", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ pet_name: "Rex" }),
    } as Response);

    const card = await getPublicCard("tok-123");

    expect(card).toEqual({ pet_name: "Rex" });
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/cards/tok-123`, {
      method: "GET",
      headers: {},
      body: undefined,
    });
  });
});
