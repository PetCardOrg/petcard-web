import { describe, expect, it } from "vitest";
import { formatarData } from "./datas";

describe("formatarData", () => {
  it("mostra o dia de calendário sem voltar um dia por fuso", () => {
    expect(formatarData("2026-08-18")).toBe(
      new Date(2026, 7, 18).toLocaleDateString(),
    );
  });

  it("formata instantes pelo fuso do navegador", () => {
    const instante = "2026-08-18T10:00:00Z";
    expect(formatarData(instante)).toBe(
      new Date(instante).toLocaleDateString(),
    );
  });
});
