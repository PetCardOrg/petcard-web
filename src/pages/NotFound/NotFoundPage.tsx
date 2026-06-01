import { useTranslation } from "react-i18next";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="card-page">
      <div className="error-state">
        <div className="error-icon">🔍</div>
        <h1>{t("notFoundPage.title")}</h1>
        <p>{t("notFoundPage.description")}</p>
      </div>
    </div>
  );
}
