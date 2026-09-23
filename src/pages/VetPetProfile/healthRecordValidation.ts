/**
 * Validação dos formulários de registro clínico do veterinário (web#34).
 *
 * Fica fora do componente porque é a parte que precisa de teste próprio: o
 * formulário só mostra o que estas funções decidem.
 *
 * A API aceita qualquer texto nestes campos (os DTOs do shared usam `IsString`
 * e `IsDateString`), então quem impede um registro clínico sem sentido — dose
 * sem quantidade, próxima dose antes da aplicação — é esta camada.
 */

export type HealthRecordType = "vaccine" | "deworming" | "medication";

export interface HealthRecordForm {
  name: string;
  applied_at: string;
  next_dose_at: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string;
  veterinarian_name: string;
  notes: string;
}

export type FieldErrors = Partial<Record<keyof HealthRecordForm, string>>;

export function emptyForm(): HealthRecordForm {
  const hoje = new Date().toISOString().split("T")[0];
  return {
    name: "",
    applied_at: hoje,
    next_dose_at: "",
    dosage: "",
    frequency: "",
    start_date: hoje,
    end_date: "",
    veterinarian_name: "",
    notes: "",
  };
}

/** `true` para uma data de calendário real; `2026-02-31` não passa. */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const data = new Date(`${value}T00:00:00`);
  if (Number.isNaN(data.getTime())) return false;
  return data.toISOString().split("T")[0] === value;
}

/**
 * Dosagem precisa carregar uma quantidade: "250mg" serve, "bastante" não.
 * É o campo onde texto livre vira risco clínico de verdade.
 */
export function hasQuantity(value: string): boolean {
  return /\d/.test(value);
}

export function validate(
  type: HealthRecordType,
  form: HealthRecordForm,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.name.trim()) {
    errors.name = "required";
  }

  if (type === "medication") {
    if (!form.dosage.trim()) {
      errors.dosage = "required";
    } else if (!hasQuantity(form.dosage)) {
      errors.dosage = "dosageNeedsNumber";
    }

    if (!form.frequency.trim()) {
      errors.frequency = "required";
    }

    if (!isValidDate(form.start_date)) {
      errors.start_date = "invalidDate";
    }

    if (form.end_date) {
      if (!isValidDate(form.end_date)) {
        errors.end_date = "invalidDate";
      } else if (
        isValidDate(form.start_date) &&
        form.end_date < form.start_date
      ) {
        errors.end_date = "endBeforeStart";
      }
    }

    return errors;
  }

  if (!isValidDate(form.applied_at)) {
    errors.applied_at = "invalidDate";
  } else if (form.applied_at > new Date().toISOString().split("T")[0]) {
    // Vacina e vermífugo registram o que já foi aplicado.
    errors.applied_at = "appliedInFuture";
  }

  if (form.next_dose_at) {
    if (!isValidDate(form.next_dose_at)) {
      errors.next_dose_at = "invalidDate";
    } else if (
      isValidDate(form.applied_at) &&
      form.next_dose_at <= form.applied_at
    ) {
      errors.next_dose_at = "nextDoseBeforeApplied";
    }
  }

  return errors;
}
