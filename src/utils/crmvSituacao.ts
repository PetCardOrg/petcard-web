import type { CrmvMotivoRecusa } from "@petcardorg/shared";

/**
 * Valor de `CrmvMotivoRecusa.NOME_DIVERGENTE` (AUD WEB-17): o registro é
 * regular, mas está em nome de outra pessoa.
 *
 * Só o tipo vem do shared. Importar o enum como valor puxaria o pacote
 * inteiro, com os decorators que exigem `reflect-metadata`, para o bundle.
 */
export const MOTIVO_NOME_DIVERGENTE =
  "NOME_DIVERGENTE" as CrmvMotivoRecusa.NOME_DIVERGENTE;

/**
 * O CRMV foi recusado porque o nome do cadastro não é o do titular?
 *
 * Decide pelo `motivo` da API, um código estável. Antes comparava o texto da
 * situação, e mudar a frase na API fazia o aviso próprio sumir sem erro.
 */
export function nomeDivergente(motivo?: CrmvMotivoRecusa): boolean {
  return motivo === MOTIVO_NOME_DIVERGENTE;
}
