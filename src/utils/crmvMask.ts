const MAX_DIGITOS = 6;

/**
 * Máscara do CRMV no formato "CE 12345": UF em maiúsculas, espaço, número.
 *
 * Aceita colar "CRMV-CE 12345", "ce12345" ou "CE-12345" e normaliza. O que
 * não cabe no formato (letra depois do número, terceira letra) é descartado.
 */
export function formatCrmv(value: string): string {
  const limpo = value
    .toUpperCase()
    .replace(/^CRMV/, "")
    .replace(/[^A-Z0-9]/g, "");

  const uf = (limpo.match(/^[A-Z]{1,2}/) ?? [""])[0];
  const numero = limpo
    .slice(uf.length)
    .replace(/\D/g, "")
    .slice(0, MAX_DIGITOS);

  if (!numero) return uf;
  return uf ? `${uf} ${numero}` : numero;
}
