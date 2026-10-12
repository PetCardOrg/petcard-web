import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoAttach, IoShieldCheckmark, IoTimeOutline } from "react-icons/io5";
import type { AnexoResponseDto, EntidadeComAnexo } from "@petcardorg/shared";
import { ApiError } from "../../services/api";
import {
  enviarAnexo,
  obterLinkDoAnexo,
  removerAnexo,
  verificarAnexo,
} from "../../services/anexo.service";

const ANEXO_TIPOS_ACEITOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const ANEXO_TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;

interface Props {
  token: string;
  petId: string;
  entidade: EntidadeComAnexo;
  entidadeId: string;
  anexos: AnexoResponseDto[];
  /** Id do veterinário logado: só ele remove o que ele mesmo enviou. */
  veterinarioId: string;
  /** Recarrega o prontuário depois de qualquer alteração. */
  onChanged: () => void;
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/**
 * Comprovantes de um registro de saúde, na visão do veterinário.
 *
 * O que o veterinário anexa já nasce verificado; o que o tutor anexou espera
 * a conferência — o botão "Marcar como verificado" é o atestado, gravado com o
 * nome e o CRMV de quem o deu.
 */
export function AnexosDoRegistro({
  token,
  petId,
  entidade,
  entidadeId,
  anexos,
  veterinarioId,
  onChanged,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function executar(
    chave: string,
    acao: () => Promise<void>,
    fallback: string,
  ) {
    setBusy(chave);
    setErro(null);
    try {
      await acao();
    } catch (err) {
      setErro(err instanceof ApiError && err.detail ? err.detail : fallback);
    } finally {
      setBusy(null);
    }
  }

  async function handleEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    // Permite escolher o mesmo arquivo de novo depois de um erro.
    e.target.value = "";
    if (!arquivo) return;

    if (!ANEXO_TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro(t("petProfile.anexos.tipoInvalido"));
      return;
    }
    if (arquivo.size > ANEXO_TAMANHO_MAXIMO_BYTES) {
      setErro(t("petProfile.anexos.grandeDemais"));
      return;
    }

    await executar(
      "enviar",
      async () => {
        await enviarAnexo(token, petId, { entidade, entidadeId }, arquivo);
        onChanged();
      },
      t("petProfile.anexos.erroEnviar"),
    );
  }

  async function handleAbrir(anexo: AnexoResponseDto) {
    // A aba abre antes do await: depois dele o navegador já não considera o
    // clique como origem e bloqueia o pop-up.
    const aba = window.open("about:blank", "_blank");
    await executar(
      `abrir-${anexo.id}`,
      async () => {
        try {
          const { url } = await obterLinkDoAnexo(token, anexo.id);
          if (aba) {
            aba.opener = null;
            aba.location.href = url;
          } else {
            window.location.href = url;
          }
        } catch (err) {
          aba?.close();
          throw err;
        }
      },
      t("petProfile.anexos.erroAbrir"),
    );
  }

  async function handleVerificar(anexo: AnexoResponseDto) {
    await executar(
      `verificar-${anexo.id}`,
      async () => {
        await verificarAnexo(token, anexo.id);
        onChanged();
      },
      t("petProfile.anexos.erroVerificar"),
    );
  }

  async function handleRemover(anexo: AnexoResponseDto) {
    if (!window.confirm(t("petProfile.anexos.confirmarRemocao"))) return;
    await executar(
      `remover-${anexo.id}`,
      async () => {
        await removerAnexo(token, anexo.id);
        onChanged();
      },
      t("petProfile.anexos.erroRemover"),
    );
  }

  return (
    <div className="vet-anexos" data-testid={`anexos-${entidadeId}`}>
      <div className="vet-anexos-header">
        <span className="vet-anexos-title">
          {t("petProfile.anexos.titulo")}
        </span>
        <button
          type="button"
          className="vet-anexos-add"
          disabled={busy === "enviar"}
          onClick={() => inputRef.current?.click()}
        >
          <IoAttach size={14} />
          {busy === "enviar"
            ? t("petProfile.anexos.enviando")
            : t("petProfile.anexos.adicionar")}
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={ANEXO_TIPOS_ACEITOS.join(",")}
          data-testid={`anexo-input-${entidadeId}`}
          onChange={(e) => void handleEscolher(e)}
        />
      </div>

      {anexos.length === 0 && (
        <p className="vet-anexos-empty">{t("petProfile.anexos.vazio")}</p>
      )}

      {anexos.map((anexo) => (
        <div key={anexo.id} className="vet-anexo-row">
          <div className="vet-anexo-info">
            <span className="vet-anexo-name">{anexo.nome_arquivo}</span>
            <span className="vet-anexo-meta">
              {formatarTamanho(anexo.tamanho_bytes)} · {anexo.enviado_por_nome}
            </span>
            {anexo.verificado ? (
              <span
                className="vet-anexo-badge vet-anexo-badge-ok"
                data-testid={`anexo-verificado-${anexo.id}`}
              >
                <IoShieldCheckmark size={12} />
                {t("petProfile.anexos.verificadoPor", {
                  name: anexo.verificado_por_nome,
                  crmv: anexo.verificado_por_crmv,
                })}
              </span>
            ) : (
              <span
                className="vet-anexo-badge vet-anexo-badge-pending"
                data-testid={`anexo-pendente-${anexo.id}`}
              >
                <IoTimeOutline size={12} />
                {t("petProfile.anexos.aguardando")}
              </span>
            )}
          </div>
          <div className="vet-anexo-actions">
            <button
              type="button"
              disabled={busy === `abrir-${anexo.id}`}
              onClick={() => void handleAbrir(anexo)}
            >
              {t("petProfile.anexos.abrir")}
            </button>
            {!anexo.verificado && (
              <button
                type="button"
                disabled={busy === `verificar-${anexo.id}`}
                onClick={() => void handleVerificar(anexo)}
              >
                {t("petProfile.anexos.verificar")}
              </button>
            )}
            {anexo.enviado_por_tipo === "VET" &&
              anexo.enviado_por_id === veterinarioId && (
                <button
                  type="button"
                  className="vet-record-delete"
                  disabled={busy === `remover-${anexo.id}`}
                  onClick={() => void handleRemover(anexo)}
                >
                  {t("petProfile.anexos.remover")}
                </button>
              )}
          </div>
        </div>
      ))}

      {erro && (
        <p className="vet-anexos-error" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
