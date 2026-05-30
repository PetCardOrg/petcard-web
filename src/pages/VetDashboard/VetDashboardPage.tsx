import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import "./VetDashboardPage.css";

export function VetDashboardPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <div className="vet-dashboard">
      <header className="vet-dashboard-header">
        <h1 className="vet-dashboard-brand">{t("brand.name")}</h1>
        <div className="vet-dashboard-user">
          <span className="vet-dashboard-username">{user?.nome}</span>
          <button
            type="button"
            className="vet-dashboard-logout"
            onClick={logout}
          >
            {t("vetDashboard.logout")}
          </button>
        </div>
      </header>

      <main className="vet-dashboard-content">
        <h2>{t("vetDashboard.welcome", { name: user?.nome })}</h2>
        <p className="vet-dashboard-crmv">CRMV: {user?.crmv}</p>
      </main>
    </div>
  );
}
