import { useState } from "react";
import { useTranslation } from "react-i18next";
import { verificarCrmv } from "../../services/crmv.service";
import { ApiError } from "../../services/api";
import "./CrmvAviso.css";

interface CrmvAvisoProps {
  token: string | null;
  /** Por que o acesso está barrado — varia conforme a tela que avisa. */
  mensagem: string;
  /** Chamado quando a verificação passa: cada tela refaz o que ficou parado. */
  onVerificado: () => void;
  className?: string;
}

/**
 * Aviso de CRMV não verificado com o botão que resolve o problema.
 *
 * Sem o botão o veterinário fica sem saída: o texto explica o bloqueio, mas
 * a verificação é uma chamada que só a aplicação sabe disparar (api#113).
 * Por isso o aviso é sempre acionável, em qualquer tela onde apareça.
 */
export function CrmvAviso({
  token,
  mensagem,
  onVerificado,
  className,
}: CrmvAvisoProps) {
  const { t } = useTranslation();
  const [verificando, setVerificando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function verificar() {
    if (!token) return;
    setVerificando(true);
    setErro(null);
    try {
      const status = await verificarCrmv(token);
      if (status.verified) {
        onVerificado();
        return;
      }
      // Recusa do conselho não é falha da chamada: dizer qual é a situação
      // é o que permite ao vet corrigir o cadastro.
      setErro(t("crmv.refused", { situacao: status.situacao ?? "-" }));
    } catch (err) {
      setErro(
        err instanceof ApiError && err.detail ? err.detail : t("crmv.failed"),
      );
    } finally {
      setVerificando(false);
    }
  }

  return (
    <div
      className={className ? `crmv-aviso ${className}` : "crmv-aviso"}
      role="status"
    >
      <p className="crmv-aviso-mensagem">{mensagem}</p>
      <button
        type="button"
        className="crmv-aviso-botao"
        onClick={() => void verificar()}
        disabled={verificando || !token}
      >
        {verificando ? t("crmv.verifying") : t("crmv.verify")}
      </button>
      {erro && <p className="crmv-aviso-erro">{erro}</p>}
    </div>
  );
}
