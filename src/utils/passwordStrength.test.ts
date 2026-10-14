import { describe, expect, it } from "vitest";
import {
  checkPasswordRules,
  validatePasswordStrength,
} from "./passwordStrength";

describe("validatePasswordStrength", () => {
  it.each([
    ["Curta1!", "tooShort"],
    ["a".repeat(60) + "A1!" + "b".repeat(20), "tooLong"],
    ["senha-forte1!", "noUppercase"],
    ["Senha-forte!", "noNumber"],
    ["Senhaforte12", "noSpecial"],
  ])("recusa %s (%s)", (senha, regra) => {
    expect(validatePasswordStrength(senha)).toBe(regra);
  });

  it("aceita uma senha com maiúscula, número e caractere especial", () => {
    expect(validatePasswordStrength("Petcard@123")).toBeNull();
  });
});

describe("checkPasswordRules", () => {
  it("marca só as regras cumpridas", () => {
    expect(checkPasswordRules("Abc")).toEqual({
      minLength: false,
      uppercase: true,
      number: false,
      special: false,
    });
  });
});
