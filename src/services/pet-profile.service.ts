import type {
  HistoricoClinicoResponseDto,
  UpdateNotaClinicaDto,
  CreateDewormingRecordDto,
  CreateMedicationRecordDto,
  CreateNotaClinicaDto,
  CreateVaccineRecordDto,
  DewormingRecordResponseDto,
  MedicationRecordResponseDto,
  NotaClinicaResponseDto,
  PetResponseDto,
  UpdateDewormingRecordDto,
  UpdateMedicationRecordDto,
  UpdateVaccineRecordDto,
  VaccineRecordResponseDto,
} from "@petcardorg/shared";
import { apiFetch, caminho } from "./api";

export interface PetProfileData {
  pet: PetResponseDto;
  vaccines: VaccineRecordResponseDto[];
  dewormings: DewormingRecordResponseDto[];
  medications: MedicationRecordResponseDto[];
  clinicalNotes: NotaClinicaResponseDto[];
}

export async function createClinicalNote(
  token: string,
  petId: string,
  dto: CreateNotaClinicaDto,
): Promise<NotaClinicaResponseDto> {
  return apiFetch<NotaClinicaResponseDto>(
    caminho`/pets/${petId}/clinical-notes`,
    {
      method: "POST",
      body: dto,
      token,
    },
  );
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
): Promise<MedicationRecordResponseDto> {
  return apiFetch<MedicationRecordResponseDto>(
    caminho`/pets/${petId}/medications`,
    {
      method: "POST",
      body: dto,
      token,
    },
  );
}

export async function createVaccine(
  token: string,
  petId: string,
  dto: CreateVaccineRecordDto,
): Promise<VaccineRecordResponseDto> {
  return apiFetch<VaccineRecordResponseDto>(caminho`/pets/${petId}/vaccines`, {
    method: "POST",
    body: dto,
    token,
  });
}

export async function createDeworming(
  token: string,
  petId: string,
  dto: CreateDewormingRecordDto,
): Promise<DewormingRecordResponseDto> {
  return apiFetch<DewormingRecordResponseDto>(
    caminho`/pets/${petId}/dewormings`,
    {
      method: "POST",
      body: dto,
      token,
    },
  );
}

export async function fetchPetProfile(
  token: string,
  petId: string,
): Promise<PetProfileData> {
  const [pet, vaccines, dewormings, medications, clinicalNotes] =
    await Promise.all([
      apiFetch<PetResponseDto>(caminho`/pets/${petId}`, { token }),
      apiFetch<VaccineRecordResponseDto[]>(caminho`/pets/${petId}/vaccines`, {
        token,
      }),
      apiFetch<DewormingRecordResponseDto[]>(
        caminho`/pets/${petId}/dewormings`,
        {
          token,
        },
      ),
      apiFetch<MedicationRecordResponseDto[]>(
        caminho`/pets/${petId}/medications`,
        {
          token,
        },
      ),
      apiFetch<NotaClinicaResponseDto[]>(
        caminho`/pets/${petId}/clinical-notes`,
        {
          token,
        },
      ),
    ]);

  return { pet, vaccines, dewormings, medications, clinicalNotes };
}

/** Endpoints de alteração e remoção, por tipo de registro (web#34). */
export const RECORD_ENDPOINT = {
  vaccine: "vaccines",
  deworming: "dewormings",
  medication: "medications",
} as const;

export type RecordKind = keyof typeof RECORD_ENDPOINT;

/**
 * Corpo de PATCH em que `null` limpa o campo opcional (AUD WEB-05). A API
 * aceita desde o API-24; os DTOs do shared ainda não tipam o `null` (SH-09).
 */
export type ComLimpeza<T> = { [K in keyof T]?: T[K] | null };

export async function updateHealthRecord(
  token: string,
  kind: RecordKind,
  id: string,
  dto: ComLimpeza<
    | UpdateVaccineRecordDto
    | UpdateDewormingRecordDto
    | UpdateMedicationRecordDto
  >,
): Promise<void> {
  await apiFetch(caminho`/${RECORD_ENDPOINT[kind]}/${id}`, {
    method: "PATCH",
    body: dto,
    token,
  });
}

export async function deleteHealthRecord(
  token: string,
  kind: RecordKind,
  id: string,
): Promise<void> {
  await apiFetch(caminho`/${RECORD_ENDPOINT[kind]}/${id}`, {
    method: "DELETE",
    token,
  });
}

/** Histórico imutável do pet, com registros excluídos e trilha (web#41). */
export async function fetchHistoricoClinico(
  token: string,
  petId: string,
): Promise<HistoricoClinicoResponseDto> {
  return apiFetch<HistoricoClinicoResponseDto>(
    caminho`/pets/${petId}/historico-clinico`,
    { token },
  );
}

export async function updateClinicalNote(
  token: string,
  id: string,
  dto: ComLimpeza<UpdateNotaClinicaDto>,
): Promise<void> {
  await apiFetch(caminho`/clinical-notes/${id}`, {
    method: "PATCH",
    body: dto,
    token,
  });
}

export async function deleteClinicalNote(
  token: string,
  id: string,
): Promise<void> {
  await apiFetch(caminho`/clinical-notes/${id}`, { method: "DELETE", token });
}
