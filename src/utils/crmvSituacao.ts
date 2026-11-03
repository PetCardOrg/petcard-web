/**
 * Situação que a API grava quando o nome do cadastro não confere com o
 * titular do CRMV (petcard-api, AUD API-06).
 *
 * Cópia do texto de `SITUACAO_NOME_DIVERGENTE` da API: o contrato ainda não
 * tem um código estável para isso, então mudar o texto lá exige mudar aqui.
 */
export const SITUACAO_NOME_DIVERGENTE =
  "Nome do cadastro não confere com o titular do CRMV";

/** O CRMV foi recusado porque o nome do cadastro não é o do titular? */
export function nomeDivergente(situacao?: string): boolean {
  return situacao === SITUACAO_NOME_DIVERGENTE;
}
