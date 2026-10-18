import { describe, expect, it } from "vitest";
import { formatCrmv } from "./crmvMask";

// É o que vai para a consulta paga: um CRMV mal montado vira consulta
// recusada e cobrada.
describe("formatCrmv", () => {
  it.each([
    ["ce12345", "CE 12345"],
    ["CE 12345", "CE 12345"],
    ["ce-12345", "CE 12345"],
    ["CRMV-CE 12345", "CE 12345"],
    ["crmv ce 04269", "CE 04269"],
  ])("normaliza %s para %s", (entrada, esperado) => {
    expect(formatCrmv(entrada)).toBe(esperado);
  });

  it("monta o formato enquanto o vet digita", () => {
    expect(formatCrmv("c")).toBe("C");
    expect(formatCrmv("ce")).toBe("CE");
    expect(formatCrmv("ce1")).toBe("CE 1");
  });

  it("limita a UF a duas letras e o número a seis dígitos", () => {
    expect(formatCrmv("CEX12345")).toBe("CE 12345");
    expect(formatCrmv("CE 1234567")).toBe("CE 123456");
  });
});
