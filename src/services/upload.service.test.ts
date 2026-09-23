import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadImage } from "./upload.service";

const BASE = "http://localhost:3000";

describe("uploadImage", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      statusText: "Created",
      json: () => Promise.resolve({ url: "https://s3/vets/foto.png" }),
    } as Response);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia a pasta na querystring e o arquivo no FormData", async () => {
    const file = new File(["conteudo"], "foto.png", { type: "image/png" });

    const result = await uploadImage("jwt", file, "vets");

    expect(result).toEqual({ url: "https://s3/vets/foto.png" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/upload/image?folder=vets`);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer jwt" });
    // FormData não vira JSON: sem isso o multipart perde o boundary do browser.
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("file")).toBe(file);
  });
});
