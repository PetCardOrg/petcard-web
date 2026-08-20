import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VetPetProfilePage } from "./VetPetProfilePage";
import { ApiError } from "../../services/api";
import type { PetProfileData } from "../../services/pet-profile.service";

const navigateMock = vi.fn();
const logoutMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "p1" }),
  useNavigate: () => navigateMock,
  useLocation: () => ({ state: { tutor_name: "Alice Tutora" } }),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    token: "jwt",
    user: { id: "vet-1", nome: "Dra. Camila", crmv: "CRMV-SP 12345" },
    logout: logoutMock,
  }),
}));

vi.mock("../../services/pet-profile.service", () => ({
  fetchPetProfile: vi.fn(),
  createClinicalNote: vi.fn(),
  createMedication: vi.fn(),
  createVaccine: vi.fn(),
  createDeworming: vi.fn(),
  updateHealthRecord: vi.fn(),
  deleteHealthRecord: vi.fn(),
  updateClinicalNote: vi.fn(),
  deleteClinicalNote: vi.fn(),
  fetchHistoricoClinico: vi.fn(),
  RECORD_ENDPOINT: {
    vaccine: "vaccines",
    deworming: "dewormings",
    medication: "medications",
  },
}));

vi.mock("../../services/crmv.service", () => ({
  verificarCrmv: vi.fn(),
}));

import {
  createClinicalNote,
  createDeworming,
  createMedication,
  createVaccine,
  deleteClinicalNote,
  deleteHealthRecord,
  fetchHistoricoClinico,
  fetchPetProfile,
  updateClinicalNote,
  updateHealthRecord,
} from "../../services/pet-profile.service";

import { verificarCrmv } from "../../services/crmv.service";

const verificarCrmvMock = vi.mocked(verificarCrmv);
const fetchProfileMock = vi.mocked(fetchPetProfile);
const createNoteMock = vi.mocked(createClinicalNote);
const createMedicationMock = vi.mocked(createMedication);
const createVaccineMock = vi.mocked(createVaccine);
const createDewormingMock = vi.mocked(createDeworming);
const updateRecordMock = vi.mocked(updateHealthRecord);
const deleteRecordMock = vi.mocked(deleteHealthRecord);
const updateNoteMock = vi.mocked(updateClinicalNote);
const deleteNoteMock = vi.mocked(deleteClinicalNote);
const historicoMock = vi.mocked(fetchHistoricoClinico);

function buildProfile(overrides: Partial<PetProfileData> = {}): PetProfileData {
  return {
    pet: {
      id: "p1",
      name: "Rex",
      species: "DOG",
      breed: "Labrador",
      sex: "MALE",
      birth_date: "2023-05-01",
      weight: 20,
      tutor_id: "t1",
    },
    vaccines: [],
    dewormings: [],
    medications: [],
    clinicalNotes: [],
    ...overrides,
  };
}

describe("VetPetProfilePage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    logoutMock.mockReset();
    fetchProfileMock.mockReset();
    createNoteMock.mockReset();
    createMedicationMock.mockReset();
    createVaccineMock.mockReset();
    createDewormingMock.mockReset();
    updateRecordMock.mockReset();
    deleteRecordMock.mockReset();
    updateNoteMock.mockReset();
    deleteNoteMock.mockReset();
    historicoMock.mockReset();
    // A aba padrão é o histórico; sem retorno padrão todo teste quebraria nele.
    historicoMock.mockResolvedValue({
      pet_id: "p1",
      pet_nome: "Rex",
      itens: [],
    } as never);
  });

  it("mostra erro e refaz a carga ao tentar novamente", async () => {
    fetchProfileMock.mockRejectedValueOnce(new Error("boom"));
    render(<VetPetProfilePage />);

    const retry = await screen.findByRole("button", {
      name: "Tentar novamente",
    });
    fetchProfileMock.mockResolvedValueOnce(buildProfile());
    await userEvent.click(retry);

    expect(
      await screen.findByRole("heading", { name: "Rex" }),
    ).toBeInTheDocument();
  });

  it("desloga quando a carga responde 401", async () => {
    fetchProfileMock.mockRejectedValue(new ApiError(401, "Unauthorized"));
    render(<VetPetProfilePage />);

    await waitFor(() => expect(logoutMock).toHaveBeenCalled());
  });

  it("lista o histórico na ordem devolvida pela API", async () => {
    fetchProfileMock.mockResolvedValue(buildProfile());
    historicoMock.mockResolvedValue({
      pet_id: "p1",
      pet_nome: "Rex",
      itens: [
        {
          entidade: "NOTA_CLINICA",
          entidade_id: "n1",
          titulo: "Otite",
          ocorrido_em: "2026-08-18",
          registrado_em: "2026-08-18T10:00:00Z" as unknown as Date,
          excluido: false,
          acoes: [],
        },
        {
          entidade: "VACINA",
          entidade_id: "v1",
          titulo: "Antirrábica",
          ocorrido_em: "2026-01-10",
          registrado_em: "2026-08-18T10:00:00Z" as unknown as Date,
          excluido: false,
          acoes: [],
        },
      ],
    } as never);
    render(<VetPetProfilePage />);
    await screen.findByRole("heading", { name: "Rex" });

    const titulos = screen
      .getAllByText(/Otite|Antirrábica/)
      .map((el) => el.textContent);
    expect(titulos[0]).toContain("Otite");
  });

  it("mostra o dia de calendário do registro, sem voltar um dia", async () => {
    fetchProfileMock.mockResolvedValue(buildProfile());
    historicoMock.mockResolvedValue({
      pet_id: "p1",
      pet_nome: "Rex",
      itens: [
        {
          entidade: "VACINA",
          entidade_id: "v1",
          titulo: "Antirrábica",
          ocorrido_em: "2026-08-18",
          registrado_em: "2026-08-18T10:00:00Z" as unknown as Date,
          excluido: false,
          acoes: [],
        },
      ],
    } as never);
    render(<VetPetProfilePage />);
    await screen.findByRole("heading", { name: "Rex" });
    await screen.findByText("Antirrábica");

    // Data montada por componentes: em fuso negativo, passar o dia pelo
    // construtor de instante renderiza 17/08.
    const dia = new Date(2026, 7, 18).toLocaleDateString();
    expect(screen.getByText(dia)).toBeInTheDocument();
  });

  it("cria uma nota clínica pelo formulário e recarrega o perfil", async () => {
    fetchProfileMock.mockResolvedValue(buildProfile());
    createNoteMock.mockResolvedValue({} as never);
    render(<VetPetProfilePage />);
    await screen.findByRole("heading", { name: "Rex" });

    await userEvent.click(
      screen.getByRole("button", { name: /Notas Clínicas/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: /Nova Nota/ }));

    await userEvent.type(
      screen.getByLabelText(/Diagnóstico/),
      "  Otite externa  ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(createNoteMock).toHaveBeenCalledWith("jwt", "p1", {
        diagnostico: "Otite externa",
      }),
    );
    // Recarrega o perfil após salvar (chamada inicial + recarga).
    expect(fetchProfileMock).toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(screen.queryByText("Nova Nota Clínica")).not.toBeInTheDocument(),
    );
  });

  it("mostra erro de submissão quando salvar a nota falha", async () => {
    fetchProfileMock.mockResolvedValue(buildProfile());
    createNoteMock.mockRejectedValue(new ApiError(500, "Server Error"));
    render(<VetPetProfilePage />);
    await screen.findByRole("heading", { name: "Rex" });

    await userEvent.click(
      screen.getByRole("button", { name: /Notas Clínicas/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: /Nova Nota/ }));
    await userEvent.type(screen.getByLabelText(/Diagnóstico/), "Otite");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      await screen.findByText(
        "Erro ao salvar a nota clínica. Tente novamente.",
      ),
    ).toBeInTheDocument();
  });
});

describe("VetPetProfilePage — bloqueio por CRMV (api#113)", () => {
  const erroCrmv = new ApiError(
    403,
    "Forbidden",
    "Seu CRMV precisa estar verificado para acessar dados clínicos.",
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra o aviso acionável em vez do erro genérico", async () => {
    fetchProfileMock.mockRejectedValue(erroCrmv);

    render(<VetPetProfilePage />);

    expect(
      await screen.findByText(/CRMV precisa estar verificado/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /verificar meu crmv/i }),
    ).toBeInTheDocument();
    expect(logoutMock).not.toHaveBeenCalled();
  });

  it("recarrega o perfil quando a verificação aprova", async () => {
    fetchProfileMock.mockRejectedValueOnce(erroCrmv);
    verificarCrmvMock.mockResolvedValue({ verified: true, situacao: "Ativo" });
    fetchProfileMock.mockResolvedValueOnce(buildProfile());

    render(<VetPetProfilePage />);
    await userEvent.click(
      await screen.findByRole("button", { name: /verificar meu crmv/i }),
    );

    await waitFor(() =>
      expect(screen.getAllByText("Rex").length).toBeGreaterThan(0),
    );
    expect(fetchProfileMock).toHaveBeenCalledTimes(2);
  });

  it("explica quando o registro é recusado", async () => {
    fetchProfileMock.mockRejectedValue(erroCrmv);
    verificarCrmvMock.mockResolvedValue({
      verified: false,
      situacao: "Suspenso",
    });

    render(<VetPetProfilePage />);
    await userEvent.click(
      await screen.findByRole("button", { name: /verificar meu crmv/i }),
    );

    expect(await screen.findByText(/Suspenso/)).toBeInTheDocument();
  });

  it("não confunde 403 de posse com bloqueio de CRMV", async () => {
    fetchProfileMock.mockRejectedValue(
      new ApiError(403, "Forbidden", "Pet de outro tutor"),
    );

    render(<VetPetProfilePage />);

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /verificar meu crmv/i }),
      ).not.toBeInTheDocument(),
    );
  });
  describe("registro clínico pelo veterinário (web#34)", () => {
    async function abrirAba(nome: string) {
      fetchProfileMock.mockResolvedValue(buildProfile());
      render(<VetPetProfilePage />);
      await screen.findByRole("heading", { name: "Rex" });
      await userEvent.click(screen.getByRole("button", { name: nome }));
    }

    it("registra a vacina do pet", async () => {
      await abrirAba("Vacinas");
      await userEvent.click(
        screen.getByRole("button", { name: /Nova vacina/ }),
      );

      await userEvent.type(screen.getByLabelText(/Vacina/), "Antirrábica");
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => expect(createVaccineMock).toHaveBeenCalled());
      const [, , dto] = createVaccineMock.mock.calls[0];
      expect(dto.vaccine_name).toBe("Antirrábica");
      expect(dto.pet_id).toBe("p1");
    });

    it("registra a vermifugação do pet", async () => {
      await abrirAba("Vermifugações");
      await userEvent.click(
        screen.getByRole("button", { name: /Nova vermifugação/ }),
      );

      await userEvent.type(screen.getByLabelText(/Produto/), "Drontal");
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => expect(createDewormingMock).toHaveBeenCalled());
      const [, , dto] = createDewormingMock.mock.calls[0];
      expect(dto.product_name).toBe("Drontal");
    });

    it("bloqueia dosagem sem quantidade e não chama a API", async () => {
      await abrirAba("Medicações");
      await userEvent.click(
        screen.getByRole("button", { name: /Novo medicamento/ }),
      );

      await userEvent.type(screen.getByLabelText(/Medicamento/), "Amoxicilina");
      await userEvent.type(screen.getByLabelText(/Dosagem/), "bastante");
      await userEvent.type(screen.getByLabelText(/Frequência/), "12/12h");
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      expect(
        await screen.findByText(/dosagem precisa indicar a quantidade/i),
      ).toBeInTheDocument();
      expect(createMedicationMock).not.toHaveBeenCalled();
    });

    it("prescreve o medicamento quando os campos estão válidos", async () => {
      await abrirAba("Medicações");
      await userEvent.click(
        screen.getByRole("button", { name: /Novo medicamento/ }),
      );

      await userEvent.type(screen.getByLabelText(/Medicamento/), "Amoxicilina");
      await userEvent.type(screen.getByLabelText(/Dosagem/), "250mg");
      await userEvent.type(screen.getByLabelText(/Frequência/), "12/12h");
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => expect(createMedicationMock).toHaveBeenCalled());
      const [, , dto] = createMedicationMock.mock.calls[0];
      expect(dto.medication_name).toBe("Amoxicilina");
      expect(dto.dosage).toBe("250mg");
    });
  });
  describe("timeline e ações no registro (web#34)", () => {
    const comRegistros = () =>
      buildProfile({
        vaccines: [
          {
            id: "vac1",
            vaccine_name: "Antirrábica",
            applied_at: "2026-03-01",
            veterinario_id: "vet-1",
            created_at: "2026-08-18T10:00:00Z",
          },
        ],
        dewormings: [
          {
            id: "dew1",
            product_name: "Drontal",
            applied_at: "2026-03-02",
            veterinario_id: "outro-vet",
            created_at: "2026-08-18T11:00:00Z",
          },
        ],
        medications: [
          {
            id: "med1",
            medication_name: "Amoxicilina",
            dosage: "250mg",
            frequency: "12/12h",
            start_date: "2026-03-03",
            veterinario_id: "vet-1",
            created_at: "2026-08-18T12:00:00Z",
          },
        ],
        clinicalNotes: [
          {
            id: "n1",
            veterinario_id: "vet-1",
            veterinario_nome: "Dra. Camila",
            veterinario_crmv: "CRMV-SP 12345",
            diagnostico: "Otite",
            created_at: "2026-03-04T10:00:00Z",
          },
        ],
      });

    it("mostra os quatro tipos no histórico, não só notas clínicas", async () => {
      fetchProfileMock.mockResolvedValue(comRegistros());
      historicoMock.mockResolvedValue({
        pet_id: "p1",
        pet_nome: "Rex",
        itens: [
          {
            entidade: "VACINA",
            entidade_id: "v1",
            titulo: "Antirrábica",
            ocorrido_em: "2026-03-01",
            registrado_em: "2026-08-18T10:00:00Z" as unknown as Date,
            excluido: false,
            acoes: [],
          },
          {
            entidade: "VERMIFUGO",
            entidade_id: "d1",
            titulo: "Drontal",
            ocorrido_em: "2026-03-02",
            registrado_em: "2026-08-18T10:00:00Z" as unknown as Date,
            excluido: false,
            acoes: [],
          },
          {
            entidade: "MEDICACAO",
            entidade_id: "m1",
            titulo: "Amoxicilina",
            ocorrido_em: "2026-03-03",
            registrado_em: "2026-08-18T10:00:00Z" as unknown as Date,
            excluido: false,
            acoes: [],
          },
          {
            entidade: "NOTA_CLINICA",
            entidade_id: "n1",
            titulo: "Otite",
            ocorrido_em: "2026-03-04",
            registrado_em: "2026-08-18T10:00:00Z" as unknown as Date,
            excluido: false,
            acoes: [],
          },
        ],
      } as never);
      render(<VetPetProfilePage />);
      await screen.findByRole("heading", { name: "Rex" });

      expect(await screen.findByText("Antirrábica")).toBeInTheDocument();
      expect(screen.getByText("Drontal")).toBeInTheDocument();
      expect(screen.getByText("Amoxicilina")).toBeInTheDocument();
      expect(screen.getByText("Otite")).toBeInTheDocument();
    });

    it("oferece editar e apagar só no registro do próprio veterinário", async () => {
      fetchProfileMock.mockResolvedValue(comRegistros());
      render(<VetPetProfilePage />);
      await screen.findByRole("heading", { name: "Rex" });

      await userEvent.click(screen.getByRole("button", { name: "Vacinas" }));
      expect(
        screen.getByRole("button", { name: "Editar" }),
      ).toBeInTheDocument();

      // O vermífugo é de outro veterinário: a API recusaria, então nem aparece.
      await userEvent.click(
        screen.getByRole("button", { name: "Vermifugações" }),
      );
      expect(
        screen.queryByRole("button", { name: "Editar" }),
      ).not.toBeInTheDocument();
    });

    it("edita o registro do veterinário", async () => {
      fetchProfileMock.mockResolvedValue(comRegistros());
      render(<VetPetProfilePage />);
      await screen.findByRole("heading", { name: "Rex" });
      await userEvent.click(screen.getByRole("button", { name: "Vacinas" }));
      await userEvent.click(screen.getByRole("button", { name: "Editar" }));

      const campo = screen.getByLabelText(/Vacina/);
      expect(campo).toHaveValue("Antirrábica");
      await userEvent.clear(campo);
      await userEvent.type(campo, "Antirrábica reforço");
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => expect(updateRecordMock).toHaveBeenCalled());
      const [, kind, recordId, dto] = updateRecordMock.mock.calls[0];
      expect(kind).toBe("vaccine");
      expect(recordId).toBe("vac1");
      expect(dto).toMatchObject({ vaccine_name: "Antirrábica reforço" });
    });

    it("apaga o registro depois de confirmar", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      fetchProfileMock.mockResolvedValue(comRegistros());
      render(<VetPetProfilePage />);
      await screen.findByRole("heading", { name: "Rex" });
      await userEvent.click(screen.getByRole("button", { name: "Medicações" }));
      await userEvent.click(screen.getByRole("button", { name: "Apagar" }));

      await waitFor(() => expect(deleteRecordMock).toHaveBeenCalled());
      expect(deleteRecordMock).toHaveBeenCalledWith(
        "jwt",
        "medication",
        "med1",
      );
      confirmSpy.mockRestore();
    });

    it("não apaga quando a confirmação é recusada", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
      fetchProfileMock.mockResolvedValue(comRegistros());
      render(<VetPetProfilePage />);
      await screen.findByRole("heading", { name: "Rex" });
      await userEvent.click(screen.getByRole("button", { name: "Medicações" }));
      await userEvent.click(screen.getByRole("button", { name: "Apagar" }));

      expect(deleteRecordMock).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });
  });
  describe("ordem e data dos registros", () => {
    const perfil = () =>
      buildProfile({
        vaccines: [
          {
            id: "antiga",
            vaccine_name: "Vacina antiga",
            applied_at: "2025-02-02",
            created_at: "2026-08-18T18:00:00Z",
          },
          {
            id: "recente",
            vaccine_name: "Vacina recente",
            applied_at: "2026-01-05",
            created_at: "2026-08-18T09:00:00Z",
          },
        ],
      });

    it("ordena pela data que aparece no item", async () => {
      fetchProfileMock.mockResolvedValue(perfil());
      render(<VetPetProfilePage />);
      await screen.findByRole("heading", { name: "Rex" });
      await userEvent.click(screen.getByRole("button", { name: "Vacinas" }));

      // Ordenar pela data de registro, que é invisível, fazia a lista parecer
      // embaralhada: os registros do seed compartilham o instante de criação.
      const titulos = screen
        .getAllByText(/Vacina (antiga|recente)/)
        .map((el) => el.textContent);
      expect(titulos).toEqual(["Vacina recente", "Vacina antiga"]);
    });

    it("desempata o mesmo dia pelo último registrado", async () => {
      fetchProfileMock.mockResolvedValue(
        buildProfile({
          vaccines: [
            {
              id: "primeira",
              vaccine_name: "Vacina primeira",
              applied_at: "2026-08-18",
              created_at: "2026-08-18T09:00:00Z",
            },
            {
              id: "segunda",
              vaccine_name: "Vacina segunda",
              applied_at: "2026-08-18",
              created_at: "2026-08-18T18:00:00Z",
            },
          ],
        }),
      );
      render(<VetPetProfilePage />);
      await screen.findByRole("heading", { name: "Rex" });
      await userEvent.click(screen.getByRole("button", { name: "Vacinas" }));

      const titulos = screen
        .getAllByText(/Vacina (primeira|segunda)/)
        .map((el) => el.textContent);
      expect(titulos[0]).toBe("Vacina segunda");
    });

    it("mostra o dia aplicado no histórico, sem atrasar um dia por fuso", async () => {
      fetchProfileMock.mockResolvedValue(buildProfile());
      historicoMock.mockResolvedValue({
        pet_id: "p1",
        pet_nome: "Rex",
        itens: [
          {
            entidade: "VACINA",
            entidade_id: "v1",
            titulo: "Antirrábica",
            ocorrido_em: "2026-08-18",
            registrado_em: "2026-08-18T10:00:00Z" as unknown as Date,
            excluido: false,
            acoes: [],
          },
        ],
      } as never);
      render(<VetPetProfilePage />);
      await screen.findByRole("heading", { name: "Rex" });

      const esperado = new Date(2026, 7, 18).toLocaleDateString();
      expect(await screen.findByText(esperado)).toBeInTheDocument();
    });

    it("mostra o dia aplicado na aba, sem atrasar um dia por fuso", async () => {
      fetchProfileMock.mockResolvedValue(
        buildProfile({
          vaccines: [
            {
              id: "v1",
              vaccine_name: "Antirrábica",
              applied_at: "2026-08-18",
              created_at: "2026-08-18T12:00:00Z",
            },
          ],
        }),
      );
      render(<VetPetProfilePage />);
      await screen.findByRole("heading", { name: "Rex" });
      await userEvent.click(screen.getByRole("button", { name: "Vacinas" }));

      // `new Date("2026-08-18")` é meia-noite UTC; em fuso negativo isso
      // renderizava 17/08.
      const esperado = new Date(2026, 7, 18).toLocaleDateString();
      expect(screen.getByText(esperado)).toBeInTheDocument();
    });
  });
  it("mostra quem prescreveu a medicação", async () => {
    fetchProfileMock.mockResolvedValue(
      buildProfile({
        medications: [
          {
            id: "m1",
            medication_name: "Amoxicilina",
            dosage: "250mg",
            frequency: "12/12h",
            start_date: "2026-08-18",
            veterinarian_name: "Dra. Camila Ferreira",
            created_at: "2026-08-18T12:00:00Z",
          },
        ],
      }),
    );
    render(<VetPetProfilePage />);
    await screen.findByRole("heading", { name: "Rex" });
    await userEvent.click(screen.getByRole("button", { name: "Medicações" }));

    // Medicação só tinha o FK do veterinário; sem o nome a tela não mostrava
    // quem prescreveu.
    expect(
      await screen.findByText(/Dra\. Camila Ferreira/),
    ).toBeInTheDocument();
  });
  describe("nota clínica e histórico imutável", () => {
    const comNota = () =>
      buildProfile({
        clinicalNotes: [
          {
            id: "n1",
            veterinario_id: "vet-1",
            veterinario_nome: "Dra. Camila",
            veterinario_crmv: "CRMV-SP 12345",
            diagnostico: "Otite",
            created_at: "2026-08-18T10:00:00Z",
          },
        ],
      });

    it("edita a própria nota clínica", async () => {
      fetchProfileMock.mockResolvedValue(comNota());
      render(<VetPetProfilePage />);
      await screen.findByRole("heading", { name: "Rex" });
      await userEvent.click(
        screen.getByRole("button", { name: "Notas Clínicas" }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Editar" }));

      const campo = screen.getByLabelText(/Diagnóstico/);
      expect(campo).toHaveValue("Otite");
      await userEvent.clear(campo);
      await userEvent.type(campo, "Otite bilateral");
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => expect(updateNoteMock).toHaveBeenCalled());
      const [, notaId, dto] = updateNoteMock.mock.calls[0];
      expect(notaId).toBe("n1");
      expect(dto.diagnostico).toBe("Otite bilateral");
    });

    it("apaga a própria nota depois de confirmar", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      fetchProfileMock.mockResolvedValue(comNota());
      render(<VetPetProfilePage />);
      await screen.findByRole("heading", { name: "Rex" });
      await userEvent.click(
        screen.getByRole("button", { name: "Notas Clínicas" }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Apagar" }));

      await waitFor(() =>
        expect(deleteNoteMock).toHaveBeenCalledWith("jwt", "n1"),
      );
      confirmSpy.mockRestore();
    });

    it("não oferece ações na nota de outro veterinário", async () => {
      fetchProfileMock.mockResolvedValue(
        buildProfile({
          clinicalNotes: [
            {
              id: "n2",
              veterinario_id: "outro-vet",
              veterinario_nome: "Dr. Paulo",
              veterinario_crmv: "CRMV-SP 99999",
              diagnostico: "Dermatite",
              created_at: "2026-08-18T10:00:00Z",
            },
          ],
        }),
      );
      render(<VetPetProfilePage />);
      await screen.findByRole("heading", { name: "Rex" });
      await userEvent.click(
        screen.getByRole("button", { name: "Notas Clínicas" }),
      );

      expect(
        screen.queryByRole("button", { name: "Editar" }),
      ).not.toBeInTheDocument();
    });

    it("mostra no histórico o registro excluído e quem agiu (web#41)", async () => {
      fetchProfileMock.mockResolvedValue(buildProfile());
      historicoMock.mockResolvedValue({
        pet_id: "p1",
        pet_nome: "Rex",
        itens: [
          {
            entidade: "MEDICACAO",
            entidade_id: "med1",
            titulo: "Amoxicilina",
            ocorrido_em: "2026-08-18",
            registrado_em: "2026-08-18T10:00:00Z" as unknown as Date,
            excluido: true,
            veterinario_nome: "Dra. Camila",
            acoes: [
              {
                id: "a1",
                tipo: "CRIACAO",
                autor_tipo: "VET",
                autor_id: "vet-1",
                autor_nome: "Dra. Camila",
                autor_crmv: "CRMV-SP 12345",
                ocorrido_em: "2026-08-18T10:00:00Z" as unknown as Date,
              },
              {
                id: "a2",
                tipo: "EXCLUSAO",
                autor_tipo: "TUTOR",
                autor_id: "tutor-1",
                autor_nome: "Ana Silva",
                ocorrido_em: "2026-08-18T11:00:00Z" as unknown as Date,
              },
            ],
          },
        ],
      } as never);

      render(<VetPetProfilePage />);
      await screen.findByRole("heading", { name: "Rex" });
      await userEvent.click(screen.getByRole("button", { name: "Histórico" }));

      // O caso que a api#117 queria evidenciar: o tutor apagou a prescrição,
      // e o veterinário precisa conseguir ver isso.
      expect(await screen.findByText("Amoxicilina")).toBeInTheDocument();
      expect(
        screen.getAllByText(/excluído da carteira/).length,
      ).toBeGreaterThan(0);
      expect(screen.getByText(/Ana Silva/)).toBeInTheDocument();
      expect(screen.getByText(/CRMV-SP 12345/)).toBeInTheDocument();
    });
  });
});
