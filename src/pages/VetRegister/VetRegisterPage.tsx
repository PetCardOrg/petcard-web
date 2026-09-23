import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IoPaw } from "react-icons/io5";
import { useAuth } from "../../hooks/useAuth";
import { ApiError } from "../../services/api";
import { lerRedirecionamentoVet } from "../vetAuthRedirect";
import "../VetLogin/VetLoginPage.css";

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

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [crmv, setCrmv] = useState("");
  const [telefone, setTelefone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

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

        <form className="vet-login-form" onSubmit={handleSubmit}>
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
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("vetRegister.passwordPlaceholder")}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>

          <div className="vet-login-field">
            <label htmlFor="confirmacao">{t("vetRegister.confirm")}</label>
            <input
              id="confirmacao"
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder={t("vetRegister.confirmPlaceholder")}
              required
              maxLength={72}
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>

          <div className="vet-login-field">
            <label htmlFor="crmv">{t("vetRegister.crmv")}</label>
            <input
              id="crmv"
              type="text"
              value={crmv}
              onChange={(e) => setCrmv(e.target.value)}
              placeholder={t("vetRegister.crmvPlaceholder")}
              required
              minLength={3}
              maxLength={30}
              disabled={submitting}
            />
            <small className="vet-login-hint">
              {t("vetRegister.crmvHint")}
            </small>
          </div>

          {error && <p className="vet-login-error">{error}</p>}

          <button
            type="submit"
            className="vet-login-button"
            disabled={submitting}
          >
            {submitting ? t("vetRegister.submitting") : t("vetRegister.submit")}
          </button>
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
