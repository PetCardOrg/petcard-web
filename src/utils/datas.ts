/**
 * Datas de calendário (`2026-10-30`) no fuso do navegador.
 *
 * `toISOString()` devolve o dia em UTC: às 23h em São Paulo já é o dia
 * seguinte, e o formulário abria com a data de amanhã e aceitava aplicação
 * no futuro.
 */
export function diaIsoLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Hoje como data de calendário local. */
export function hojeLocal(): string {
  return diaIsoLocal(new Date());
}
