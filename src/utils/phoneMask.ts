const MIN_DIGITS = 10;
const MAX_DIGITS = 11;

export function unformatPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, MAX_DIGITS);
}

export function formatPhoneBR(value: string): string {
  const digits = unformatPhone(value);

  if (digits.length === 0) {
    return "";
  }
  if (digits.length <= 2) {
    return digits.replace(/^(\d*)/, "($1");
  }
  if (digits.length <= 7) {
    return digits.replace(/^(\d{2})(\d*)/, "($1) $2");
  }
  return digits.replace(/^(\d{2})(\d{5})(\d*)/, "($1) $2-$3");
}

/** Telefone é opcional, mas quando preenchido precisa ter DDD + fixo/celular. */
export function isValidPhoneBR(value: string): boolean {
  const digits = unformatPhone(value);
  return (
    digits.length === 0 ||
    (digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS)
  );
}
