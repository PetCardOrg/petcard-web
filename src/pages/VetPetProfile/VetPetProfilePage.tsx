import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IoPaw,
  IoAlertCircle,
  IoArrowBack,
  IoMedkit,
  IoBug,
  IoMedical,
  IoDocumentText,
} from "react-icons/io5";
import { useAuth } from "../../hooks/useAuth";
import { fetchPetProfile } from "../../services/pet-profile.service";
import type { PetProfileData } from "../../services/pet-profile.service";
import { ApiError } from "../../services/api";
import "./VetPetProfilePage.css";

interface TimelineItem {
  id: string;
  type: "vaccine" | "deworming" | "medication" | "clinical_note";
  title: string;
  subtitle?: string;
  date: Date;
  details?: string;
}

const SPECIES_COLORS: Record<string, { bg: string; text: string }> = {
  DOG: { bg: "#e6f7fc", text: "#27a9d8" },
  CAT: { bg: "#ede5fc", text: "#6b48c8" },
  BIRD: { bg: "#e5f8ee", text: "#06a77d" },
  OTHER: { bg: "#fef5e6", text: "#d4940a" },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  vaccine: { bg: "#e6f7fc", text: "#27a9d8" },
  deworming: { bg: "#e5f8ee", text: "#06a77d" },
  medication: { bg: "#ede5fc", text: "#6b48c8" },
  clinical_note: { bg: "#fef5e6", text: "#d4940a" },
};

function TypeIcon({
  type,
  size,
  color,
}: {
  type: string;
  size: number;
  color: string;
}) {
  switch (type) {
    case "vaccine":
      return <IoMedkit size={size} color={color} />;
    case "deworming":
      return <IoBug size={size} color={color} />;
    case "medication":
      return <IoMedical size={size} color={color} />;
    case "clinical_note":
      return <IoDocumentText size={size} color={color} />;
    default:
      return <IoPaw size={size} color={color} />;
  }
}

function buildTimeline(data: PetProfileData): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const v of data.vaccines) {
    items.push({
      id: `v-${v.id}`,
      type: "vaccine",
      title: v.vaccine_name,
      subtitle: v.veterinarian_name,
      date: new Date(v.applied_at),
      details: v.notes,
    });
  }

  for (const d of data.dewormings) {
    items.push({
      id: `d-${d.id}`,
      type: "deworming",
      title: d.product_name,
      subtitle: d.veterinarian_name,
      date: new Date(d.applied_at),
      details: d.notes,
    });
  }

  for (const m of data.medications) {
    items.push({
      id: `m-${m.id}`,
      type: "medication",
      title: m.medication_name,
      subtitle: `${m.dosage} — ${m.frequency}`,
      date: new Date(m.start_date),
      details: m.notes,
    });
  }

  for (const n of data.clinicalNotes) {
    items.push({
      id: `n-${n.id}`,
      type: "clinical_note",
      title: n.diagnostico,
      subtitle: `${n.veterinario_nome} — CRMV ${n.veterinario_crmv}`,
      date: new Date(n.created_at),
      details: [n.prescricao, n.observacoes].filter(Boolean).join(" | "),
    });
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  return items;
}

export function VetPetProfilePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tutorName = (location.state as { tutor_name?: string })?.tutor_name;

  const [data, setData] = useState<PetProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "timeline" | "vaccines" | "dewormings" | "medications" | "notes"
  >("timeline");

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError(false);
    try {
      const result = await fetchPetProfile(token, id);
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
  }, [token, id, logout]);

  useEffect(() => {
    load();
  }, [load]);

  const timeline = data ? buildTimeline(data) : [];
  const speciesColors =
    SPECIES_COLORS[data?.pet.species ?? ""] ?? SPECIES_COLORS.OTHER;

  function formatDate(d: Date | string) {
    return new Date(d).toLocaleDateString();
  }

  return (
    <div className="vet-pet-profile">
      <header className="vet-pet-profile-header">
        <button
          type="button"
          className="vet-pet-profile-back"
          onClick={() => navigate("/vet/dashboard")}
        >
          <IoArrowBack size={20} />
        </button>
        <span className="vet-pet-profile-header-title">
          {data?.pet.name ?? t("petProfile.title")}
        </span>
      </header>

      <main className="vet-pet-profile-content">
        {loading && (
          <div className="vet-pet-profile-loading">
            <div className="vet-pet-profile-skeleton-hero" />
            <div className="vet-pet-profile-skeleton-tabs" />
            <div className="vet-pet-profile-skeleton-list">
              {[1, 2, 3].map((i) => (
                <div key={i} className="vet-pet-profile-skeleton-item" />
              ))}
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="vet-pet-profile-state-card">
            <div className="vet-pet-profile-state-icon vet-pet-profile-error-icon">
              <IoAlertCircle size={36} color="#e63946" />
            </div>
            <h3>{t("petProfile.error")}</h3>
            <button type="button" onClick={load}>
              {t("petProfile.retry")}
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Hero */}
            <div className="vet-pet-profile-hero">
              {data.pet.photo_url ? (
                <img
                  src={data.pet.photo_url}
                  alt={data.pet.name}
                  className="vet-pet-profile-photo"
                />
              ) : (
                <div
                  className="vet-pet-profile-avatar"
                  style={{ background: speciesColors.bg }}
                >
                  <IoPaw size={36} color={speciesColors.text} />
                </div>
              )}
              <div className="vet-pet-profile-hero-info">
                <h2>{data.pet.name}</h2>
                {data.pet.breed && (
                  <span className="vet-pet-profile-breed">
                    {data.pet.breed}
                  </span>
                )}
                <div className="vet-pet-profile-meta">
                  <span
                    className="vet-pet-profile-species-pill"
                    style={{
                      background: speciesColors.bg,
                      color: speciesColors.text,
                    }}
                  >
                    {t(`species.${data.pet.species}`)}
                  </span>
                  <span className="vet-pet-profile-sex">
                    {t(`sex.${data.pet.sex}`)}
                  </span>
                  {data.pet.weight && (
                    <span className="vet-pet-profile-weight">
                      {data.pet.weight} kg
                    </span>
                  )}
                  {data.pet.birth_date && (
                    <span className="vet-pet-profile-birth">
                      {formatDate(data.pet.birth_date)}
                    </span>
                  )}
                </div>
                {tutorName && (
                  <span className="vet-pet-profile-tutor">
                    {t("petProfile.tutor")}: {tutorName}
                  </span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="vet-pet-profile-tabs">
              {(
                [
                  "timeline",
                  "vaccines",
                  "dewormings",
                  "medications",
                  "notes",
                ] as const
              ).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`vet-pet-profile-tab ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {t(`petProfile.tabs.${tab}`)}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="vet-pet-profile-tab-content">
              {activeTab === "timeline" && (
                <>
                  {timeline.length === 0 ? (
                    <p className="vet-pet-profile-empty">
                      {t("petProfile.emptyTimeline")}
                    </p>
                  ) : (
                    <div className="vet-pet-profile-timeline">
                      {timeline.map((item) => {
                        const colors = TYPE_COLORS[item.type];
                        return (
                          <div key={item.id} className="vet-timeline-item">
                            <div
                              className="vet-timeline-icon"
                              style={{ background: colors.bg }}
                            >
                              <TypeIcon
                                type={item.type}
                                size={16}
                                color={colors.text}
                              />
                            </div>
                            <div className="vet-timeline-body">
                              <div className="vet-timeline-row">
                                <span className="vet-timeline-title">
                                  {item.title}
                                </span>
                                <span className="vet-timeline-date">
                                  {formatDate(item.date)}
                                </span>
                              </div>
                              {item.subtitle && (
                                <span className="vet-timeline-subtitle">
                                  {item.subtitle}
                                </span>
                              )}
                              {item.details && (
                                <span className="vet-timeline-details">
                                  {item.details}
                                </span>
                              )}
                              <span
                                className="vet-timeline-type-badge"
                                style={{
                                  background: colors.bg,
                                  color: colors.text,
                                }}
                              >
                                {t(`petProfile.types.${item.type}`)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {activeTab === "vaccines" && (
                <>
                  {data.vaccines.length === 0 ? (
                    <p className="vet-pet-profile-empty">
                      {t("petProfile.emptyVaccines")}
                    </p>
                  ) : (
                    <div className="vet-pet-profile-section-list">
                      {data.vaccines.map((v) => (
                        <div key={v.id} className="vet-section-card">
                          <div className="vet-section-card-header">
                            <span className="vet-section-card-title">
                              {v.vaccine_name}
                            </span>
                            <span className="vet-section-card-date">
                              {formatDate(v.applied_at)}
                            </span>
                          </div>
                          {v.veterinarian_name && (
                            <span className="vet-section-card-sub">
                              {v.veterinarian_name}
                            </span>
                          )}
                          {v.next_dose_at && (
                            <span className="vet-section-card-sub">
                              {t("petProfile.nextDose")}:{" "}
                              {formatDate(v.next_dose_at)}
                            </span>
                          )}
                          {v.notes && (
                            <p className="vet-section-card-notes">{v.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === "dewormings" && (
                <>
                  {data.dewormings.length === 0 ? (
                    <p className="vet-pet-profile-empty">
                      {t("petProfile.emptyDewormings")}
                    </p>
                  ) : (
                    <div className="vet-pet-profile-section-list">
                      {data.dewormings.map((d) => (
                        <div key={d.id} className="vet-section-card">
                          <div className="vet-section-card-header">
                            <span className="vet-section-card-title">
                              {d.product_name}
                            </span>
                            <span className="vet-section-card-date">
                              {formatDate(d.applied_at)}
                            </span>
                          </div>
                          {d.veterinarian_name && (
                            <span className="vet-section-card-sub">
                              {d.veterinarian_name}
                            </span>
                          )}
                          {d.next_dose_at && (
                            <span className="vet-section-card-sub">
                              {t("petProfile.nextDose")}:{" "}
                              {formatDate(d.next_dose_at)}
                            </span>
                          )}
                          {d.notes && (
                            <p className="vet-section-card-notes">{d.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === "medications" && (
                <>
                  {data.medications.length === 0 ? (
                    <p className="vet-pet-profile-empty">
                      {t("petProfile.emptyMedications")}
                    </p>
                  ) : (
                    <div className="vet-pet-profile-section-list">
                      {data.medications.map((m) => (
                        <div key={m.id} className="vet-section-card">
                          <div className="vet-section-card-header">
                            <span className="vet-section-card-title">
                              {m.medication_name}
                            </span>
                            <span className="vet-section-card-date">
                              {formatDate(m.start_date)}
                              {m.end_date && ` — ${formatDate(m.end_date)}`}
                            </span>
                          </div>
                          <span className="vet-section-card-sub">
                            {m.dosage} — {m.frequency}
                          </span>
                          {m.notes && (
                            <p className="vet-section-card-notes">{m.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === "notes" && (
                <>
                  {data.clinicalNotes.length === 0 ? (
                    <p className="vet-pet-profile-empty">
                      {t("petProfile.emptyNotes")}
                    </p>
                  ) : (
                    <div className="vet-pet-profile-section-list">
                      {data.clinicalNotes.map((n) => (
                        <div key={n.id} className="vet-section-card">
                          <div className="vet-section-card-header">
                            <span className="vet-section-card-title">
                              {n.diagnostico}
                            </span>
                            <span className="vet-section-card-date">
                              {formatDate(n.created_at)}
                            </span>
                          </div>
                          <span className="vet-section-card-sub">
                            {n.veterinario_nome} — CRMV {n.veterinario_crmv}
                          </span>
                          {n.prescricao && (
                            <div className="vet-section-card-field">
                              <strong>{t("petProfile.prescription")}:</strong>{" "}
                              {n.prescricao}
                            </div>
                          )}
                          {n.observacoes && (
                            <div className="vet-section-card-field">
                              <strong>{t("petProfile.observations")}:</strong>{" "}
                              {n.observacoes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
