import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IoClose } from "react-icons/io5";
import {
  emptyForm,
  validate,
  type FieldErrors,
  type HealthRecordForm,
  type HealthRecordType,
} from "./healthRecordValidation";

interface Props {
  type: HealthRecordType;
  submitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (form: HealthRecordForm) => void;
}

/**
 * Formulário de registro clínico do veterinário (web#34).
 *
 * Um componente para os três tipos: os campos mudam, mas o enquadramento —
 * modal, validação por campo, erro de envio — é o mesmo, e triplicar isso só
 * criaria três lugares para corrigir o mesmo bug.
 */
export function HealthRecordModal({
  type,
  submitting,
  submitError,
  onClose,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<HealthRecordForm>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});

  function set(campo: keyof HealthRecordForm, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    // O erro some assim que o campo é mexido; manter aceso o que a pessoa já
    // está corrigindo é ruído.
    setErrors((prev) => ({ ...prev, [campo]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const encontrados = validate(type, form);
    setErrors(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    onSubmit(form);
  }

  function erro(campo: keyof HealthRecordForm) {
    const chave = errors[campo];
    if (!chave) return null;
    return (
      <span className="vet-field-error" role="alert">
        {t(`petProfile.recordForm.errors.${chave}`)}
      </span>
    );
  }

  const isMedication = type === "medication";

  return (
    <div className="vet-note-modal-overlay">
      <div className="vet-note-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vet-note-modal-header">
          <h3>{t(`petProfile.recordForm.title.${type}`)}</h3>
          <button
            type="button"
            className="vet-note-modal-close"
            onClick={onClose}
            aria-label={t("petProfile.form.cancel")}
          >
            <IoClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="vet-note-form" noValidate>
          <div className="vet-note-form-field">
            <label htmlFor="record-name">
              {t(`petProfile.recordForm.name.${type}`)}{" "}
              <span className="vet-note-required">*</span>
            </label>
            <input
              id="record-name"
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
            {erro("name")}
          </div>

          {isMedication ? (
            <>
              <div className="vet-note-form-field">
                <label htmlFor="record-dosage">
                  {t("petProfile.recordForm.dosage")}{" "}
                  <span className="vet-note-required">*</span>
                </label>
                <input
                  id="record-dosage"
                  type="text"
                  placeholder={t("petProfile.recordForm.dosagePlaceholder")}
                  value={form.dosage}
                  onChange={(e) => set("dosage", e.target.value)}
                />
                {erro("dosage")}
              </div>

              <div className="vet-note-form-field">
                <label htmlFor="record-frequency">
                  {t("petProfile.recordForm.frequency")}{" "}
                  <span className="vet-note-required">*</span>
                </label>
                <input
                  id="record-frequency"
                  type="text"
                  placeholder={t("petProfile.recordForm.frequencyPlaceholder")}
                  value={form.frequency}
                  onChange={(e) => set("frequency", e.target.value)}
                />
                {erro("frequency")}
              </div>

              <div className="vet-note-form-field">
                <label htmlFor="record-start">
                  {t("petProfile.recordForm.startDate")}{" "}
                  <span className="vet-note-required">*</span>
                </label>
                <input
                  id="record-start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => set("start_date", e.target.value)}
                />
                {erro("start_date")}
              </div>

              <div className="vet-note-form-field">
                <label htmlFor="record-end">
                  {t("petProfile.recordForm.endDate")}
                </label>
                <input
                  id="record-end"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => set("end_date", e.target.value)}
                />
                {erro("end_date")}
              </div>
            </>
          ) : (
            <>
              <div className="vet-note-form-field">
                <label htmlFor="record-applied">
                  {t("petProfile.recordForm.appliedAt")}{" "}
                  <span className="vet-note-required">*</span>
                </label>
                <input
                  id="record-applied"
                  type="date"
                  value={form.applied_at}
                  onChange={(e) => set("applied_at", e.target.value)}
                />
                {erro("applied_at")}
              </div>

              <div className="vet-note-form-field">
                <label htmlFor="record-next-dose">
                  {t("petProfile.recordForm.nextDose")}
                </label>
                <input
                  id="record-next-dose"
                  type="date"
                  value={form.next_dose_at}
                  onChange={(e) => set("next_dose_at", e.target.value)}
                />
                {erro("next_dose_at")}
              </div>
            </>
          )}

          <div className="vet-note-form-field">
            <label htmlFor="record-notes">
              {t("petProfile.recordForm.notes")}
            </label>
            <textarea
              id="record-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {submitError && <p className="vet-note-form-error">{submitError}</p>}

          <div className="vet-note-form-actions">
            <button
              type="button"
              className="vet-note-form-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              {t("petProfile.form.cancel")}
            </button>
            <button
              type="submit"
              className="vet-note-form-submit"
              disabled={submitting}
            >
              {submitting
                ? t("petProfile.form.submitting")
                : t("petProfile.form.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
