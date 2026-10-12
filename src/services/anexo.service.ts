import type {
  AnexoArquivoResponseDto,
  AnexoResponseDto,
  EntidadeComAnexo,
} from "@petcardorg/shared";
import { apiFetch } from "./api";

/** Comprovante de até 10 MB: sobe mais devagar que o teto padrão de 10 s. */
const UPLOAD_TIMEOUT_MS = 60000;

export async function enviarAnexo(
  token: string,
  petId: string,
  alvo: { entidade: EntidadeComAnexo; entidadeId: string },
  arquivo: File,
): Promise<AnexoResponseDto> {
  const form = new FormData();
  form.append("entidade", alvo.entidade);
  form.append("entidade_id", alvo.entidadeId);
  form.append("file", arquivo);
  return apiFetch<AnexoResponseDto>(`/pets/${petId}/anexos`, {
    method: "POST",
    body: form,
    token,
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
}

/** Link temporário: o arquivo é privado e cada abertura pede um novo. */
export async function obterLinkDoAnexo(
  token: string,
  id: string,
): Promise<AnexoArquivoResponseDto> {
  return apiFetch<AnexoArquivoResponseDto>(`/anexos/${id}/arquivo`, { token });
}

/** O veterinário atesta que conferiu o comprovante. */
export async function verificarAnexo(
  token: string,
  id: string,
): Promise<AnexoResponseDto> {
  return apiFetch<AnexoResponseDto>(`/anexos/${id}/verificacao`, {
    method: "POST",
    token,
  });
}

export async function removerAnexo(token: string, id: string): Promise<void> {
  await apiFetch(`/anexos/${id}`, { method: "DELETE", token });
}
