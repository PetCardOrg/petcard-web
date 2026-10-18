import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IoCheckmarkCircle, IoPaw } from "react-icons/io5";
import { useAuth } from "../../hooks/useAuth";
import { PasswordInput } from "../../components/PasswordInput/PasswordInput";
import { PasswordRulesChecklist } from "../../components/PasswordRulesChecklist/PasswordRulesChecklist";
import { validatePasswordStrength } from "../../utils/passwordStrength";
import { formatCrmv } from "../../utils/crmvMask";
import { ApiError } from "../../services/api";
import { consultarCrmv } from "../../services/crmv.service";
import type { CrmvConsulta } from "../../services/crmv.service";
import { lerRedirecionamentoVet } from "../vetAuthRedirect";
import "../VetLogin/VetLoginPage.css";
import "./VetRegisterPage.css";

/**
 * Onde o cadastro está: o CRMV vem primeiro e destrava o resto.
 * `manual` é a saída quando o CFMV não responde — o vet não fica preso por
 * uma indisponibilidade de terceiro, e a API verifica o CRMV depois.
 */
type EtapaCrmv =
  | { tipo: "pendente" }
  | { tipo: "consultado"; consulta: CrmvConsulta }
  | { tipo: "manual" };

export function VetRegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  // Quem veio da carteira do QR chegou aqui pelo link do login: o cadastro
  // devolve o vet para o pet que ele escaneou, não para o dashboard.
  const location = useLocation();
  const { redirectTo = "/vet/dashboard", acessoVet } = lerRedirecionamentoVet(
    location.state,
  );

  const [crmv, setCrmv] = useState("");
  const [etapa, setEtapa] = useState<EtapaCrmv>({ tipo: "pendente" });
  const [consultando, setConsultando] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const crmvResolvido = etapa.tipo !== "pendente";
  const nomeOficial =
    etapa.tipo === "consultado" ? etapa.consulta.nome : undefined;

  async function handleConsultar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setConsultando(true);

    try {
      const consulta = await consultarCrmv(crmv);
      if (!consulta.valido) {
        setError(t("vetRegister.crmvNotFound"));
        return;
      }
      setCrmv(consulta.crmv);
      if (consulta.nome) setNome(consulta.nome);
      setEtapa({ tipo: "consultado", consulta });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t("vetRegister.crmvDuplicate"));
      } else if (err instanceof ApiError && err.status === 400) {
        setError(err.detail ?? t("vetRegister.invalid"));
      } else if (err instanceof ApiError && err.status === 429) {
        setError(t("vetRegister.crmvTooMany"));
      } else {
        // CFMV fora do ar, timeout, rede: segue no preenchimento manual.
        setError(t("vetRegister.crmvUnavailable"));
        setEtapa({ tipo: "manual" });
      }
    } finally {
      setConsultando(false);
    }
  }

  function handleAlterarCrmv() {
    setEtapa({ tipo: "pendente" });
    setNome("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const regraViolada = validatePasswordStrength(password);
    if (regraViolada) {
      setError(t(`passwordRules.${regraViolada}`));
      return;
    }

    if (password !== confirmacao) {
      setError(t("vetRegister.passwordMismatch"));
      return;
    }

    setSubmitting(true);

    try {
      await register({
        nome,
        email,
        crmv,
        password,
        telefone: telefone.trim() === "" ? undefined : telefone,
      });
      // Quem entra sem verificação vê o aviso com o botão de verificar já no
      // destino (api#113), então o cadastro não precisa travar aqui.
      navigate(redirectTo, {
        replace: true,
        state: acessoVet ? { acessoVet: true } : undefined,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t("vetRegister.duplicate"));
      } else if (err instanceof ApiError && err.status === 400) {
        setError(err.detail ?? t("vetRegister.invalid"));
      } else {
        setError(t("vetRegister.genericError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="vet-login-page">
      <div className="vet-login-card">
        <div className="vet-login-logo">
          <div className="vet-login-logo-mark">
            <IoPaw size={24} color="#fff" />
          </div>
        </div>

        <h1 className="vet-login-title">{t("brand.name")}</h1>
        <p className="vet-login-subtitle">{t("vetRegister.subtitle")}</p>

        <form
          className="vet-login-form"
          onSubmit={crmvResolvido ? handleSubmit : handleConsultar}
        >
          <div className="vet-login-field">
            <label htmlFor="crmv">{t("vetRegister.crmv")}</label>
            <div className="vet-register-crmv-row">
              <input
                id="crmv"
                type="text"
                value={crmv}
                onChange={(e) => setCrmv(formatCrmv(e.target.value))}
                placeholder={t("vetRegister.crmvPlaceholder")}
                required
                minLength={3}
                maxLength={30}
                autoFocus
                readOnly={crmvResolvido}
                disabled={consultando || submitting}
              />
              {crmvResolvido && (
                <button
                  type="button"
                  className="vet-register-link-button"
                  onClick={handleAlterarCrmv}
                  disabled={submitting}
                >
                  {t("vetRegister.crmvChange")}
                </button>
              )}
            </div>
            {etapa.tipo === "consultado" ? (
              <small className="vet-register-crmv-ok">
                <IoCheckmarkCircle size={14} aria-hidden />
                {etapa.consulta.situacao
                  ? t("vetRegister.crmvFound", {
                      situacao: etapa.consulta.situacao,
                    })
                  : t("vetRegister.crmvFoundNoStatus")}
              </small>
            ) : (
              etapa.tipo === "pendente" && (
                <small className="vet-login-hint">
                  {t("vetRegister.crmvHint")}
                </small>
              )
            )}
          </div>

          {!crmvResolvido && (
            <>
              {error && <p className="vet-login-error">{error}</p>}
              <button
                type="submit"
                className="vet-login-button"
                disabled={consultando || crmv.trim().length < 3}
              >
                {consultando
                  ? t("vetRegister.crmvLooking")
                  : t("vetRegister.crmvLookup")}
              </button>
            </>
          )}

          {crmvResolvido && (
            <>
              <div className="vet-login-field">
                <label htmlFor="nome">{t("vetRegister.nome")}</label>
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder={t("vetRegister.nomePlaceholder")}
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  disabled={submitting}
                />
                {nomeOficial && (
                  <small className="vet-login-hint">
                    {t("vetRegister.nomeFromCfmv")}
                  </small>
                )}
              </div>

              <div className="vet-login-field">
                <label htmlFor="email">{t("vetRegister.email")}</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("vetRegister.emailPlaceholder")}
                  required
                  maxLength={254}
                  autoComplete="email"
                  autoFocus={!!nomeOficial}
                  disabled={submitting}
                />
              </div>

              <div className="vet-login-field">
                <label htmlFor="telefone">{t("vetRegister.telefone")}</label>
                <input
                  id="telefone"
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder={t("vetRegister.telefonePlaceholder")}
                  maxLength={20}
                  autoComplete="tel"
                  disabled={submitting}
                />
              </div>

              <div className="vet-login-field">
                <label htmlFor="password">{t("vetRegister.password")}</label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("vetRegister.passwordPlaceholder")}
                  required
                  maxLength={72}
                  autoComplete="new-password"
                  disabled={submitting}
                />
                <PasswordRulesChecklist password={password} />
              </div>

              <div className="vet-login-field">
                <label htmlFor="confirmacao">{t("vetRegister.confirm")}</label>
                <PasswordInput
                  id="confirmacao"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  placeholder={t("vetRegister.confirmPlaceholder")}
                  required
                  maxLength={72}
                  autoComplete="new-password"
                  disabled={submitting}
                />
              </div>

              {error && <p className="vet-login-error">{error}</p>}

              <button
                type="submit"
                className="vet-login-button"
                disabled={submitting}
              >
                {submitting
                  ? t("vetRegister.submitting")
                  : t("vetRegister.submit")}
              </button>
            </>
          )}
        </form>

        <p className="vet-login-alt">
          {t("vetRegister.hasAccount")}{" "}
          <Link to="/vet/login" state={location.state}>
            {t("vetRegister.goToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
