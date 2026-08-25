import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IoArrowBack,
  IoCameraOutline,
  IoPersonCircleOutline,
  IoWarningOutline,
} from "react-icons/io5";
import { useAuth } from "../../hooks/useAuth";
import { ApiError } from "../../services/api";
import { uploadImage } from "../../services/upload.service";
import {
  updateVeterinario,
  deleteVeterinario,
} from "../../services/vet-profile.service";
import "./VetProfilePage.css";

export function VetProfilePage() {
  const { t } = useTranslation();
  const { user, token, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(user?.nome ?? "");
  const [crmv, setCrmv] = useState(user?.crmv ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [telefone, setTelefone] = useState(user?.telefone ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;

    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      const { url } = await uploadImage(token, file, "vets");
      await updateVeterinario(token, { foto_url: url });
      await refreshUser();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        return;
      }
      setPhotoError(t("vetProfile.photo.error"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSaveError(null);
    setSaveSuccess(false);
    setSaving(true);
    try {
      await updateVeterinario(token, {
        nome: nome.trim(),
        crmv: crmv.trim(),
        email: email.trim(),
        telefone: telefone.trim() === "" ? undefined : telefone.trim(),
      });
      await refreshUser();
      setSaveSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        setSaveError(t("vetProfile.form.duplicate"));
      } else if (err instanceof ApiError && err.status === 400) {
        setSaveError(err.detail ?? t("vetProfile.form.invalid"));
      } else {
        setSaveError(t("vetProfile.form.genericError"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteVeterinario(token);
      logout();
      navigate("/vet/login", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        navigate("/vet/login", { replace: true });
        return;
      }
      setDeleteError(t("vetProfile.danger.error"));
      setDeleting(false);
    }
  }

  return (
    <div className="vet-profile">
      <header className="vet-profile-header">
        <button
          type="button"
          className="vet-profile-back"
          aria-label={t("vetProfile.back")}
          onClick={() => navigate("/vet/dashboard")}
        >
          <IoArrowBack size={20} />
        </button>
        <span className="vet-profile-header-title">
          {t("vetProfile.title")}
        </span>
      </header>

      <main className="vet-profile-content">
        <div className="vet-profile-photo-section">
          {user?.foto_url ? (
            <img
              src={user.foto_url}
              alt={user.nome}
              className="vet-profile-photo"
            />
          ) : (
            <div className="vet-profile-avatar">
              <IoPersonCircleOutline size={56} color="#27a9d8" />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="vet-profile-photo-input"
            onChange={handlePhotoChange}
          />
          <button
            type="button"
            className="vet-profile-photo-button"
            disabled={uploadingPhoto}
            onClick={() => fileInputRef.current?.click()}
          >
            <IoCameraOutline size={16} />
            {uploadingPhoto
              ? t("vetProfile.photo.uploading")
              : t("vetProfile.photo.change")}
          </button>
          {photoError && (
            <p className="vet-profile-photo-error">{photoError}</p>
          )}
        </div>

        <form className="vet-profile-form" onSubmit={handleSubmit}>
          <div className="vet-profile-field">
            <label htmlFor="nome">{t("vetProfile.form.nome")}</label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              disabled={saving}
            />
          </div>

          <div className="vet-profile-field">
            <label htmlFor="crmv">{t("vetProfile.form.crmv")}</label>
            <input
              id="crmv"
              type="text"
              value={crmv}
              onChange={(e) => setCrmv(e.target.value)}
              required
              minLength={3}
              maxLength={30}
              disabled={saving}
            />
            <small className="vet-profile-hint">
              {t("vetProfile.form.crmvHint")}
            </small>
          </div>

          <div className="vet-profile-field">
            <label htmlFor="email">{t("vetProfile.form.email")}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
              autoComplete="email"
              disabled={saving}
            />
          </div>

          <div className="vet-profile-field">
            <label htmlFor="telefone">{t("vetProfile.form.telefone")}</label>
            <input
              id="telefone"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder={t("vetProfile.form.telefonePlaceholder")}
              maxLength={20}
              autoComplete="tel"
              disabled={saving}
            />
          </div>

          {saveError && <p className="vet-profile-error">{saveError}</p>}
          {saveSuccess && (
            <p className="vet-profile-success">
              {t("vetProfile.form.success")}
            </p>
          )}

          <button
            type="submit"
            className="vet-profile-submit"
            disabled={saving}
          >
            {saving
              ? t("vetProfile.form.submitting")
              : t("vetProfile.form.submit")}
          </button>
        </form>

        <div className="vet-profile-danger">
          <h3>
            <IoWarningOutline size={18} /> {t("vetProfile.danger.title")}
          </h3>

          {!confirmingDelete ? (
            <>
              <p>{t("vetProfile.danger.description")}</p>
              <button
                type="button"
                className="vet-profile-danger-button"
                onClick={() => setConfirmingDelete(true)}
              >
                {t("vetProfile.danger.button")}
              </button>
            </>
          ) : (
            <div className="vet-profile-danger-confirm">
              <h4>{t("vetProfile.danger.confirmTitle")}</h4>
              <p>{t("vetProfile.danger.confirmDescription")}</p>
              {deleteError && (
                <p className="vet-profile-error">{deleteError}</p>
              )}
              <div className="vet-profile-danger-actions">
                <button
                  type="button"
                  className="vet-profile-danger-cancel"
                  disabled={deleting}
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteError(null);
                  }}
                >
                  {t("vetProfile.danger.cancel")}
                </button>
                <button
                  type="button"
                  className="vet-profile-danger-confirm-button"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                >
                  {deleting
                    ? t("vetProfile.danger.deleting")
                    : t("vetProfile.danger.confirmButton")}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
