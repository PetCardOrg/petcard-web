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

/**
 * Data para exibir, no formato do navegador.
 *
 * `2026-08-18` é dia de calendário, não instante. Passar isso pelo `Date`
 * faz o navegador interpretar como meia-noite UTC e, em fuso negativo,
 * renderizar o dia anterior — a vacina registrada hoje aparecia como ontem.
 * Instantes (`2026-08-18T10:00:00Z`) seguem pelo `Date` normalmente. Aceita
 * `Date` porque alguns DTOs do shared ainda tipam assim (AUD P14).
 */
export function formatarData(valor: Date | string): string {
  const soData =
    typeof valor === "string" && valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (soData) {
    return new Date(
      Number(soData[1]),
      Number(soData[2]) - 1,
      Number(soData[3]),
    ).toLocaleDateString();
  }
  return new Date(valor).toLocaleDateString();
}
