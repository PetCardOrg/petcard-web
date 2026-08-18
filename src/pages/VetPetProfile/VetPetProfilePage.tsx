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
  IoAdd,
  IoClose,
} from "react-icons/io5";
import { useAuth } from "../../hooks/useAuth";
import {
  fetchPetProfile,
  createClinicalNote,
  createMedication,
  createVaccine,
  createDeworming,
  updateHealthRecord,
  deleteHealthRecord,
} from "../../services/pet-profile.service";
import type {
  PetProfileData,
  RecordKind,
} from "../../services/pet-profile.service";
import type { CreateNotaClinicaDto } from "@petcardorg/shared";
import { HealthRecordModal } from "./HealthRecordModal";
import {
  emptyForm,
  type HealthRecordForm,
  type HealthRecordType,
} from "./healthRecordValidation";
import { verificarCrmv } from "../../services/crmv.service";
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
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tutorName = (location.state as { tutor_name?: string })?.tutor_name;

  const [data, setData] = useState<PetProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Bloqueio por CRMV não verificado (api#113): erro acionável, não falha genérica.
  const [crmvBloqueado, setCrmvBloqueado] = useState<string | null>(null);
  const [verificandoCrmv, setVerificandoCrmv] = useState(false);
  const [erroVerificacao, setErroVerificacao] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "timeline" | "vaccines" | "dewormings" | "medications" | "notes"
  >("timeline");

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateNotaClinicaDto>({
    diagnostico: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Registro clínico pelo veterinário (web#34): um modal por tipo, aberto pelo
  // botão da própria aba.
  const [recordType, setRecordType] = useState<HealthRecordType | null>(null);
  const [recordSubmitting, setRecordSubmitting] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  // Registro em edição. `null` = criando; preenchido = alterando aquele id.
  const [editing, setEditing] = useState<{
    id: string;
    initial: HealthRecordForm;
  } | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError(false);
    setCrmvBloqueado(null);
    try {
      const result = await fetchPetProfile(token, id);
      setData(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        return;
      }
      if (err instanceof ApiError && err.isCrmvNaoVerificado) {
        setCrmvBloqueado(err.detail ?? t("petProfile.crmv.blocked"));
        return;
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token, id, logout, t]);

  const handleVerificarCrmv = useCallback(async () => {
    if (!token) return;
    setVerificandoCrmv(true);
    setErroVerificacao(null);
    try {
      const status = await verificarCrmv(token);
      if (status.verified) {
        await load();
      } else {
        setErroVerificacao(
          t("petProfile.crmv.refused", {
            situacao: status.situacao ?? "-",
          }),
        );
      }
    } catch (err) {
      setErroVerificacao(
        err instanceof ApiError && err.detail
          ? err.detail
          : t("petProfile.crmv.failed"),
      );
    } finally {
      setVerificandoCrmv(false);
    }
  }, [token, load, t]);

  useEffect(() => {
    load();
  }, [load]);

  const timeline = data ? buildTimeline(data) : [];
  const speciesColors =
    SPECIES_COLORS[data?.pet.species ?? ""] ?? SPECIES_COLORS.OTHER;

  function formatDate(d: Date | string) {
    return new Date(d).toLocaleDateString();
  }

  function openForm() {
    setFormData({ diagnostico: "" });
    setSubmitError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !id || !formData.diagnostico.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const dto: CreateNotaClinicaDto = {
        diagnostico: formData.diagnostico.trim(),
      };
      if (formData.prescricao?.trim()) {
        dto.prescricao = formData.prescricao.trim();
      }
      if (formData.observacoes?.trim()) {
        dto.observacoes = formData.observacoes.trim();
      }
      await createClinicalNote(token, id, dto);
      setShowForm(false);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        return;
      }
      setSubmitError(t("petProfile.form.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  /** Campos do registro, no formato que a API recebe. */
  function toDto(kind: HealthRecordType, form: HealthRecordForm) {
    const notes = form.notes.trim() || undefined;
    if (kind === "medication") {
      return {
        medication_name: form.name.trim(),
        dosage: form.dosage.trim(),
        frequency: form.frequency.trim(),
        start_date: form.start_date,
        ...(form.end_date ? { end_date: form.end_date } : {}),
        notes,
      };
    }
    const nome =
      kind === "vaccine"
        ? { vaccine_name: form.name.trim() }
        : { product_name: form.name.trim() };
    return {
      ...nome,
      applied_at: form.applied_at,
      ...(form.next_dose_at ? { next_dose_at: form.next_dose_at } : {}),
      notes,
    };
  }

  async function handleRecordSubmit(form: HealthRecordForm) {
    if (!token || !id || !recordType) return;

    setRecordSubmitting(true);
    setRecordError(null);
    try {
      if (editing) {
        await updateHealthRecord(
          token,
          recordType as RecordKind,
          editing.id,
          toDto(recordType, form),
        );
        setRecordType(null);
        setEditing(null);
        await load();
        return;
      }
      const notes = form.notes.trim() || undefined;
      if (recordType === "medication") {
        await createMedication(token, id, {
          pet_id: id,
          medication_name: form.name.trim(),
          dosage: form.dosage.trim(),
          frequency: form.frequency.trim(),
          start_date: form.start_date,
          ...(form.end_date ? { end_date: form.end_date } : {}),
          notes,
        });
      } else if (recordType === "vaccine") {
        await createVaccine(token, id, {
          pet_id: id,
          vaccine_name: form.name.trim(),
          applied_at: form.applied_at,
          ...(form.next_dose_at ? { next_dose_at: form.next_dose_at } : {}),
          notes,
        });
      } else {
        await createDeworming(token, id, {
          pet_id: id,
          product_name: form.name.trim(),
          applied_at: form.applied_at,
          ...(form.next_dose_at ? { next_dose_at: form.next_dose_at } : {}),
          notes,
        });
      }
      setRecordType(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        return;
      }
      setRecordError(t("petProfile.recordForm.submitError"));
    } finally {
      setRecordSubmitting(false);
    }
  }

  async function handleDelete(kind: RecordKind, recordId: string) {
    if (!token) return;
    if (!window.confirm(t("petProfile.recordActions.confirmDelete"))) return;

    try {
      await deleteHealthRecord(token, kind, recordId);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        return;
      }
      setRecordError(t("petProfile.recordActions.deleteError"));
    }
  }

  /**
   * Ações só nos registros do próprio veterinário: a API recusa os demais
   * (regra de autoria da petcard-api#129), e botão que falha ao ser clicado
   * é pior que botão ausente.
   */
  function acoesDoRegistro(
    kind: HealthRecordType,
    registro: { id: string; veterinario_id?: string },
    initial: HealthRecordForm,
  ) {
    if (!user || registro.veterinario_id !== user.id) return null;
    return (
      <div className="vet-record-actions">
        <button
          type="button"
          onClick={() => {
            setRecordError(null);
            setEditing({ id: registro.id, initial });
            setRecordType(kind);
          }}
        >
          {t("petProfile.recordActions.edit")}
        </button>
        <button
          type="button"
          className="vet-record-delete"
          onClick={() => void handleDelete(kind as RecordKind, registro.id)}
        >
          {t("petProfile.recordActions.delete")}
        </button>
      </div>
    );
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

        {crmvBloqueado && !loading && (
          <div className="vet-pet-profile-state-card">
            <div className="vet-pet-profile-state-icon vet-pet-profile-error-icon">
              <IoAlertCircle size={36} color="#e63946" />
            </div>
            <h3>{t("petProfile.crmv.title")}</h3>
            <p className="vet-crmv-message">{crmvBloqueado}</p>
            <button
              type="button"
              onClick={handleVerificarCrmv}
              disabled={verificandoCrmv}
            >
              {verificandoCrmv
                ? t("petProfile.crmv.verifying")
                : t("petProfile.crmv.verify")}
            </button>
            {erroVerificacao && (
              <p className="vet-note-form-error">{erroVerificacao}</p>
            )}
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
                  <button
                    type="button"
                    className="vet-pet-profile-add-note-btn"
                    onClick={() => {
                      setRecordError(null);
                      setRecordType("vaccine");
                    }}
                  >
                    <IoAdd size={18} />
                    {t("petProfile.recordForm.add.vaccine")}
                  </button>

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
                          {acoesDoRegistro("vaccine", v, {
                            ...emptyForm(),
                            name: v.vaccine_name,
                            applied_at: v.applied_at,
                            next_dose_at: v.next_dose_at ?? "",
                            notes: v.notes ?? "",
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === "dewormings" && (
                <>
                  <button
                    type="button"
                    className="vet-pet-profile-add-note-btn"
                    onClick={() => {
                      setRecordError(null);
                      setRecordType("deworming");
                    }}
                  >
                    <IoAdd size={18} />
                    {t("petProfile.recordForm.add.deworming")}
                  </button>

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
                          {acoesDoRegistro("deworming", d, {
                            ...emptyForm(),
                            name: d.product_name,
                            applied_at: d.applied_at,
                            next_dose_at: d.next_dose_at ?? "",
                            notes: d.notes ?? "",
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === "medications" && (
                <>
                  <button
                    type="button"
                    className="vet-pet-profile-add-note-btn"
                    onClick={() => {
                      setRecordError(null);
                      setRecordType("medication");
                    }}
                  >
                    <IoAdd size={18} />
                    {t("petProfile.recordForm.add.medication")}
                  </button>

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
                          {acoesDoRegistro("medication", m, {
                            ...emptyForm(),
                            name: m.medication_name,
                            dosage: m.dosage,
                            frequency: m.frequency,
                            start_date: m.start_date,
                            end_date: m.end_date ?? "",
                            notes: m.notes ?? "",
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === "notes" && (
                <>
                  <button
                    type="button"
                    className="vet-pet-profile-add-note-btn"
                    onClick={openForm}
                  >
                    <IoAdd size={18} />
                    {t("petProfile.form.addNote")}
                  </button>

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

        {showForm && (
          <div className="vet-note-modal-overlay" onClick={closeForm}>
            <div
              className="vet-note-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="vet-note-modal-header">
                <h3>{t("petProfile.form.title")}</h3>
                <button
                  type="button"
                  className="vet-note-modal-close"
                  onClick={closeForm}
                >
                  <IoClose size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="vet-note-form">
                <div className="vet-note-form-field">
                  <label htmlFor="diagnostico">
                    {t("petProfile.form.diagnostico")}{" "}
                    <span className="vet-note-required">*</span>
                  </label>
                  <textarea
                    id="diagnostico"
                    rows={3}
                    required
                    placeholder={t("petProfile.form.diagnosticoPlaceholder")}
                    value={formData.diagnostico}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        diagnostico: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="vet-note-form-field">
                  <label htmlFor="prescricao">
                    {t("petProfile.form.prescricao")}
                  </label>
                  <textarea
                    id="prescricao"
                    rows={3}
                    placeholder={t("petProfile.form.prescricaoPlaceholder")}
                    value={formData.prescricao ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        prescricao: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="vet-note-form-field">
                  <label htmlFor="observacoes">
                    {t("petProfile.form.observacoes")}
                  </label>
                  <textarea
                    id="observacoes"
                    rows={3}
                    placeholder={t("petProfile.form.observacoesPlaceholder")}
                    value={formData.observacoes ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        observacoes: e.target.value,
                      }))
                    }
                  />
                </div>

                {submitError && (
                  <p className="vet-note-form-error">{submitError}</p>
                )}

                <div className="vet-note-form-actions">
                  <button
                    type="button"
                    className="vet-note-form-cancel"
                    onClick={closeForm}
                    disabled={submitting}
                  >
                    {t("petProfile.form.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="vet-note-form-submit"
                    disabled={submitting || !formData.diagnostico.trim()}
                  >
                    {submitting
                      ? t("petProfile.form.submitting")
                      : t("petProfile.form.submit")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {recordType && (
          <HealthRecordModal
            key={editing?.id ?? "novo"}
            type={recordType}
            submitting={recordSubmitting}
            submitError={recordError}
            initial={editing?.initial}
            onClose={() => {
              setRecordType(null);
              setEditing(null);
            }}
            onSubmit={handleRecordSubmit}
          />
        )}
      </main>
    </div>
  );
}
