import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import "./ProtectedRoute.css";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading, semConexao, tentarReconectar } = useAuth();
  const { t } = useTranslation();

  // A validação do token pode esperar o cold start da API (até 30s): uma tela
  // em branco por esse tempo parece travada.
  if (loading) {
    return (
      <div className="sessao-estado" role="status">
        <p>{t("session.connecting")}</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/vet/login" replace />;
  }

  // Token guardado, mas a API não respondeu. Mandar para o login aqui faria o
  // vet digitar a senha à toa: o token continua valendo.
  if (semConexao) {
    return (
      <div className="sessao-estado" role="alert">
        <h1>{t("session.offline.title")}</h1>
        <p>{t("session.offline.description")}</p>
        <button type="button" onClick={tentarReconectar}>
          {t("session.offline.retry")}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
