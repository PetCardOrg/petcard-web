import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IoPaw } from "react-icons/io5";
import { useAuth } from "../../hooks/useAuth";
import { ApiError } from "../../services/api";
import "./VetLoginPage.css";

export function VetLoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      navigate("/vet/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t("vetLogin.invalidCredentials"));
      } else {
        setError(t("vetLogin.genericError"));
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
        <p className="vet-login-subtitle">{t("vetLogin.subtitle")}</p>

        <form className="vet-login-form" onSubmit={handleSubmit}>
          <div className="vet-login-field">
            <label htmlFor="email">{t("vetLogin.email")}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("vetLogin.emailPlaceholder")}
              required
              autoComplete="email"
              disabled={submitting}
            />
          </div>

          <div className="vet-login-field">
            <label htmlFor="password">{t("vetLogin.password")}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("vetLogin.passwordPlaceholder")}
              required
              autoComplete="current-password"
              disabled={submitting}
            />
          </div>

          {error && <p className="vet-login-error">{error}</p>}

          <button
            type="submit"
            className="vet-login-button"
            disabled={submitting}
          >
            {submitting ? t("vetLogin.submitting") : t("vetLogin.submit")}
          </button>
        </form>

        <p className="vet-login-alt">
          {t("vetLogin.noAccount")}{" "}
          <Link to="/vet/register">{t("vetLogin.goToRegister")}</Link>
        </p>
      </div>
    </div>
  );
}
