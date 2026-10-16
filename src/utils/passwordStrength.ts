export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/**
 * Regras de senha forte do cadastro (mesmas do mobile e do `IsStrongPassword`
 * do petcard-api). A validação no cliente é só conveniência; quem decide é a
 * API.
 */
export type PasswordRuleId = "minLength" | "uppercase" | "number" | "special";

/** Regras exibidas na listinha ao vivo, na ordem em que aparecem. */
export const PASSWORD_RULES: {
  id: PasswordRuleId;
  test: (password: string) => boolean;
}[] = [
  { id: "minLength", test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { id: "uppercase", test: (p) => /[A-Z]/.test(p) },
  { id: "number", test: (p) => /[0-9]/.test(p) },
  { id: "special", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/** Estado de cada regra para a senha atual (para o checklist ao vivo). */
export function checkPasswordRules(
  password: string,
): Record<PasswordRuleId, boolean> {
  const result = {} as Record<PasswordRuleId, boolean>;
  for (const rule of PASSWORD_RULES) {
    result[rule.id] = rule.test(password);
  }
  return result;
}

export type PasswordRule =
  | "tooShort"
  | "tooLong"
  | "noUppercase"
  | "noNumber"
  | "noSpecial";

/** Devolve a primeira regra violada, ou `null` se a senha é forte. */
export function validatePasswordStrength(
  password: string,
): PasswordRule | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "tooShort";
  if (password.length > PASSWORD_MAX_LENGTH) return "tooLong";
  if (!/[A-Z]/.test(password)) return "noUppercase";
  if (!/[0-9]/.test(password)) return "noNumber";
  if (!/[^A-Za-z0-9]/.test(password)) return "noSpecial";
  return null;
}
