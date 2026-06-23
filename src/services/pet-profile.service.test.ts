import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClinicalNote, fetchPetProfile } from "./pet-profile.service";

const BASE = "http://localhost:3000";

describe("pet-profile.service", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetchPetProfile agrega os 5 endpoints do prontuário em paralelo", async () => {
    fetchMock.mockImplementation((url) => {
      const path = String(url).replace(BASE, "");
      const body =
        path === "/pets/p1" ? { id: "p1", name: "Rex" } : [{ id: "rec", path }];
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve(body),
      } as Response);
    });

    const profile = await fetchPetProfile("jwt", "p1");

    expect(profile.pet).toEqual({ id: "p1", name: "Rex" });
    expect(Array.isArray(profile.vaccines)).toBe(true);

    const paths = fetchMock.mock.calls.map((c) =>
      String(c[0]).replace(BASE, ""),
    );
    expect(paths).toEqual(
      expect.arrayContaining([
        "/pets/p1",
        "/pets/p1/vaccines",
        "/pets/p1/dewormings",
        "/pets/p1/medications",
        "/pets/p1/clinical-notes",
      ]),
    );
    // Todas as chamadas autenticadas com o mesmo token.
    for (const call of fetchMock.mock.calls) {
      expect(call[1]).toMatchObject({
        headers: { Authorization: "Bearer jwt" },
      });
    }
  });

  it("createClinicalNote faz POST da nota no pet com token e corpo", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      statusText: "Created",
      json: () => Promise.resolve({ id: "n1" }),
    } as Response);

    const dto = { diagnostico: "Otite", prescricao: "Gotas" };
    await createClinicalNote("jwt", "p1", dto as never);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/pets/p1/clinical-notes`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(dto),
        headers: expect.objectContaining({ Authorization: "Bearer jwt" }),
      }),
    );
  });
});
