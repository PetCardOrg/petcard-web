import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IoPaw,
  IoAlertCircle,
  IoSearch,
  IoChevronForward,
} from "react-icons/io5";
import { useAuth } from "../../hooks/useAuth";
import { fetchDashboardPets } from "../../services/dashboard.service";
import type {
  DashboardPetItem,
  PaginatedResponse,
} from "../../services/dashboard.service";
import { ApiError } from "../../services/api";
import "./VetDashboardPage.css";

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 400;

const SPECIES_COLORS: Record<string, { bg: string; text: string }> = {
  DOG: { bg: "#e6f7fc", text: "#27a9d8" },
  CAT: { bg: "#ede5fc", text: "#6b48c8" },
  BIRD: { bg: "#e5f8ee", text: "#06a77d" },
  OTHER: { bg: "#fef5e6", text: "#d4940a" },
};

export function VetDashboardPage() {
  const { t } = useTranslation();
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<PaginatedResponse<DashboardPetItem> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (searchTerm: string, pageNum: number) => {
      if (!token) return;
      setLoading(true);
      setError(false);
      try {
        const result = await fetchDashboardPets(token, {
          page: pageNum,
          pageSize: PAGE_SIZE,
          search: searchTerm || undefined,
        });
        setData(result);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          logout();
          return;
        }
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [token, logout],
  );

  useEffect(() => {
    load(search, page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      load(search, 1);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString();
  }

  function getSpeciesColors(species: string) {
    return SPECIES_COLORS[species] ?? SPECIES_COLORS.OTHER;
  }

  return (
    <div className="vet-dashboard">
      <header className="vet-dashboard-header">
        <div className="vet-dashboard-header-left">
          <div className="vet-dashboard-logo-mark">
            <IoPaw size={20} color="#fff" />
          </div>
          <span className="vet-dashboard-brand">{t("brand.name")}</span>
        </div>
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
        <div className="vet-dashboard-title-row">
          <div>
            <h2>{t("vetDashboard.title")}</h2>
            <p className="vet-dashboard-subtitle">
              {t("vetDashboard.subtitle")}
            </p>
          </div>
        </div>

        <div className="vet-dashboard-search">
          <IoSearch size={18} className="vet-dashboard-search-icon" />
          <input
            type="text"
            placeholder={t("vetDashboard.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading && (
          <div className="vet-dashboard-skeletons">
            {[1, 2, 3].map((i) => (
              <div key={i} className="vet-dashboard-skeleton-card">
                <div className="skeleton-avatar" />
                <div className="skeleton-lines">
                  <div className="skeleton-line skeleton-line-name" />
                  <div className="skeleton-line skeleton-line-meta" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="vet-dashboard-state-card vet-dashboard-error-card">
            <div className="vet-dashboard-state-icon vet-dashboard-error-icon">
              <IoAlertCircle size={36} color="#e63946" />
            </div>
            <h3>{t("vetDashboard.error")}</h3>
            <button type="button" onClick={() => load(search, page)}>
              {t("vetDashboard.retry")}
            </button>
          </div>
        )}

        {!loading && !error && data && data.items.length === 0 && (
          <div className="vet-dashboard-state-card vet-dashboard-empty-card">
            <div className="vet-dashboard-state-icon vet-dashboard-empty-icon">
              <IoPaw size={36} color="#27a9d8" />
            </div>
            <h3>{t("vetDashboard.empty")}</h3>
            <p>{t("vetDashboard.emptyDescription")}</p>
          </div>
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <>
            <div className="vet-dashboard-pet-list">
              {data.items.map((pet) => {
                const colors = getSpeciesColors(pet.species);
                return (
                  <div
                    key={pet.id}
                    className="vet-dashboard-pet-card vet-dashboard-pet-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      navigate(`/vet/pets/${pet.id}`, {
                        state: { tutor_name: pet.tutor_name },
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        navigate(`/vet/pets/${pet.id}`, {
                          state: { tutor_name: pet.tutor_name },
                        });
                    }}
                  >
                    {pet.photo_url ? (
                      <img
                        src={pet.photo_url}
                        alt={pet.name}
                        className="vet-pet-card-photo"
                      />
                    ) : (
                      <div
                        className="vet-pet-card-avatar"
                        style={{ background: colors.bg }}
                      >
                        <IoPaw size={24} color={colors.text} />
                      </div>
                    )}
                    <div className="vet-pet-card-info">
                      <span className="vet-pet-card-name">{pet.name}</span>
                      {pet.breed && (
                        <span className="vet-pet-card-breed">{pet.breed}</span>
                      )}
                      <div className="vet-pet-card-meta">
                        <span
                          className="vet-pet-card-species"
                          style={{
                            background: colors.bg,
                            color: colors.text,
                          }}
                        >
                          {t(`species.${pet.species}`)}
                        </span>
                        <span className="vet-pet-card-tutor">
                          {pet.tutor_name}
                        </span>
                        <span className="vet-pet-card-date">
                          {formatDate(pet.last_attended_at)}
                        </span>
                      </div>
                    </div>
                    <IoChevronForward
                      size={18}
                      className="vet-pet-card-chevron"
                    />
                  </div>
                );
              })}
            </div>

            <div className="vet-dashboard-pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t("vetDashboard.pagination.prev")}
              </button>
              <span>
                {t("vetDashboard.pagination.page", {
                  current: data.page,
                  total: data.totalPages,
                })}
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("vetDashboard.pagination.next")}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
