import type {
  CreateDewormingRecordDto,
  CreateMedicationRecordDto,
  CreateNotaClinicaDto,
  CreateVaccineRecordDto,
} from "@petcardorg/shared";
import { apiFetch } from "./api";

export interface PetDetail {
  id: string;
  name: string;
  species: string;
  breed?: string;
  sex: string;
  birth_date?: string;
  weight?: number;
  photo_url?: string;
  tutor_id: string;
}

export interface VaccineRecord {
  id: string;
  vaccine_name: string;
  applied_at: string;
  next_dose_at?: string;
  veterinarian_name?: string;
  notes?: string;
}

export interface DewormingRecord {
  id: string;
  product_name: string;
  applied_at: string;
  next_dose_at?: string;
  veterinarian_name?: string;
  notes?: string;
}

export interface MedicationRecord {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  notes?: string;
}

export interface ClinicalNote {
  id: string;
  veterinario_nome: string;
  veterinario_crmv: string;
  diagnostico: string;
  prescricao?: string;
  observacoes?: string;
  created_at: string;
}

export interface PetProfileData {
  pet: PetDetail;
  vaccines: VaccineRecord[];
  dewormings: DewormingRecord[];
  medications: MedicationRecord[];
  clinicalNotes: ClinicalNote[];
}

export async function createClinicalNote(
  token: string,
  petId: string,
  dto: CreateNotaClinicaDto,
): Promise<ClinicalNote> {
  return apiFetch<ClinicalNote>(`/pets/${petId}/clinical-notes`, {
    method: "POST",
    body: dto,
    token,
  });
}

/**
 * Registra a medicação no prontuário do pet (web#34).
 *
 * A prescrição escrita na nota clínica é texto — vale como registro do que foi
 * orientado, mas não gera lembrete nem aparece como medicação ativa no app do
 * tutor. Só este cadastro faz a orientação virar item de saúde de verdade.
 */
export async function createMedication(
  token: string,
  petId: string,
  dto: CreateMedicationRecordDto,
): Promise<MedicationRecord> {
  return apiFetch<MedicationRecord>(`/pets/${petId}/medications`, {
    method: "POST",
    body: dto,
    token,
  });
}

export async function createVaccine(
  token: string,
  petId: string,
  dto: CreateVaccineRecordDto,
): Promise<VaccineRecord> {
  return apiFetch<VaccineRecord>(`/pets/${petId}/vaccines`, {
    method: "POST",
    body: dto,
    token,
  });
}

export async function createDeworming(
  token: string,
  petId: string,
  dto: CreateDewormingRecordDto,
): Promise<DewormingRecord> {
  return apiFetch<DewormingRecord>(`/pets/${petId}/dewormings`, {
    method: "POST",
    body: dto,
    token,
  });
}

export async function fetchPetProfile(
  token: string,
  petId: string,
): Promise<PetProfileData> {
  const [pet, vaccines, dewormings, medications, clinicalNotes] =
    await Promise.all([
      apiFetch<PetDetail>(`/pets/${petId}`, { token }),
      apiFetch<VaccineRecord[]>(`/pets/${petId}/vaccines`, { token }),
      apiFetch<DewormingRecord[]>(`/pets/${petId}/dewormings`, { token }),
      apiFetch<MedicationRecord[]>(`/pets/${petId}/medications`, { token }),
      apiFetch<ClinicalNote[]>(`/pets/${petId}/clinical-notes`, { token }),
    ]);

  return { pet, vaccines, dewormings, medications, clinicalNotes };
}
