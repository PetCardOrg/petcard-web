import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { corrigirMeuCrmv, verificarCrmv } from "../../services/crmv.service";
import { ApiError } from "../../services/api";
import "./CrmvAviso.css";

interface CrmvAvisoProps {
  token: string | null;
  /** Por que o acesso está barrado — varia conforme a tela que avisa. */
  mensagem: string;
  /** CRMV atual da conta, para o veterinário corrigir a partir dele. */
  crmvAtual?: string;
  /** Chamado quando a verificação passa: cada tela refaz o que ficou parado. */
  onVerificado: () => void;
  className?: string;
}

function detalheOu(err: unknown, padrao: string): string {
  return err instanceof ApiError && err.detail ? err.detail : padrao;
}

/**
 * Aviso de CRMV não verificado com as duas saídas possíveis.
 *
 * Verificar resolve quem só ainda não foi conferido. Quem digitou o registro
 * errado no cadastro precisa **corrigir** antes: reconsultar o mesmo número
 * errado seria um beco sem saída, e não havia tela de perfil para arrumá-lo.
 */
export function CrmvAviso({
  token,
  mensagem,
  crmvAtual,
  onVerificado,
  className,
}: CrmvAvisoProps) {
  const { t } = useTranslation();
  const [verificando, setVerificando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [corrigindo, setCorrigindo] = useState(false);
  const [crmv, setCrmv] = useState(crmvAtual ?? "");
  const [erro, setErro] = useState<string | null>(null);

  /** Consulta o conselho e destrava a tela, ou explica a recusa. */
  async function consultarConselho(autenticacao: string) {
    const status = await verificarCrmv(autenticacao);
    if (status.verified) {
      onVerificado();
      return;
    }
    // Recusa do conselho não é falha da chamada: dizer qual é a situação
    // é o que permite ao vet corrigir o cadastro.
    setErro(t("crmv.refused", { situacao: status.situacao ?? "-" }));
  }

  async function verificar() {
    if (!token) return;
    setVerificando(true);
    setErro(null);
    try {
      await consultarConselho(token);
    } catch (err) {
      setErro(detalheOu(err, t("crmv.failed")));
    } finally {
      setVerificando(false);
    }
  }

  async function salvarECorrigir(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSalvando(true);
    setErro(null);
    try {
      await corrigirMeuCrmv(token, crmv.trim());
      // Salvar sem conferir não abriria nada: a troca zera a verificação na
      // API, então as duas coisas são uma ação só para o veterinário.
      await consultarConselho(token);
    } catch (err) {
      setErro(
        err instanceof ApiError && err.status === 409
          ? t("crmv.duplicate")
          : detalheOu(err, t("crmv.saveFailed")),
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className={className ? `crmv-aviso ${className}` : "crmv-aviso"}
      role="status"
    >
      <p className="crmv-aviso-mensagem">{mensagem}</p>

      {corrigindo ? (
        <form
          className="crmv-aviso-form"
          onSubmit={(e) => void salvarECorrigir(e)}
        >
          <label htmlFor="crmv-correcao">{t("crmv.fixLabel")}</label>
          <input
            id="crmv-correcao"
            type="text"
            value={crmv}
            onChange={(e) => setCrmv(e.target.value)}
            placeholder={t("crmv.fixPlaceholder")}
            required
            minLength={3}
            disabled={salvando}
          />
          <small className="crmv-aviso-dica">{t("crmv.fixHint")}</small>
          <div className="crmv-aviso-acoes">
            <button
              type="submit"
              className="crmv-aviso-botao"
              disabled={salvando || !token}
            >
              {salvando ? t("crmv.saving") : t("crmv.save")}
            </button>
            <button
              type="button"
              className="crmv-aviso-secundario"
              onClick={() => setCorrigindo(false)}
              disabled={salvando}
            >
              {t("crmv.cancel")}
            </button>
          </div>
        </form>
      ) : (
        <div className="crmv-aviso-acoes">
          <button
            type="button"
            className="crmv-aviso-botao"
            onClick={() => void verificar()}
            disabled={verificando || !token}
          >
            {verificando ? t("crmv.verifying") : t("crmv.verify")}
          </button>
          <button
            type="button"
            className="crmv-aviso-secundario"
            onClick={() => setCorrigindo(true)}
            disabled={verificando}
          >
            {t("crmv.fix")}
          </button>
        </div>
      )}

      {erro && <p className="crmv-aviso-erro">{erro}</p>}
    </div>
  );
}
