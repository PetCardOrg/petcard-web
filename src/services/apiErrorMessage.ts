import type { TFunction } from "i18next";
import { ApiError } from "./api";

/**
 * Status HTTP cuja causa é a mesma em qualquer tela e, por isso, tem texto
 * próprio em `apiErrors`. Fora desta lista (401, 5xx, timeout) vale a mensagem
 * específica da tela, passada como `fallback`.
 */
const STATUS_COM_TEXTO = [400, 403, 404, 409, 413, 415, 429];

/**
 * Mensagem de erro para mostrar ao usuário a partir de uma falha de chamada à
 * API. Nunca devolve `ApiError.detail`: o texto da API vem em inglês (validação
 * dos DTOs e boa parte das exceções), e a web tem tradução própria nos dois
 * idiomas.
 */
export function apiErrorMessage(
  err: unknown,
  fallback: string,
  t: TFunction,
): string {
  if (!(err instanceof ApiError)) return fallback;

  return STATUS_COM_TEXTO.includes(err.status)
    ? t(`apiErrors.${err.status}`)
    : fallback;
}
