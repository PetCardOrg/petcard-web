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
  useAuth: () => ({ token: "jwt", logout: logoutMock }),
}));

vi.mock("../../services/pet-profile.service", () => ({
  fetchPetProfile: vi.fn(),
  createClinicalNote: vi.fn(),
  createMedication: vi.fn(),
  createVaccine: vi.fn(),
  createDeworming: vi.fn(),
}));

vi.mock("../../services/crmv.service", () => ({
  verificarCrmv: vi.fn(),
}));

import {
  createClinicalNote,
  createDeworming,
  createMedication,
  createVaccine,
  fetchPetProfile,
} from "../../services/pet-profile.service";

import { verificarCrmv } from "../../services/crmv.service";

const verificarCrmvMock = vi.mocked(verificarCrmv);
const fetchProfileMock = vi.mocked(fetchPetProfile);
const createNoteMock = vi.mocked(createClinicalNote);
const createMedicationMock = vi.mocked(createMedication);
const createVaccineMock = vi.mocked(createVaccine);
const createDewormingMock = vi.mocked(createDeworming);

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
  });

  it("carrega e exibe o pet no herói", async () => {
    fetchProfileMock.mockResolvedValue(buildProfile());
    render(<VetPetProfilePage />);

    expect(
      await screen.findByRole("heading", { name: "Rex" }),
    ).toBeInTheDocument();
    expect(fetchProfileMock).toHaveBeenCalledWith("jwt", "p1");
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

  it("ordena a timeline da mais recente para a mais antiga", async () => {
    fetchProfileMock.mockResolvedValue(
      buildProfile({
        vaccines: [
          {
            id: "vac",
            vaccine_name: "Antirrábica",
            applied_at: "2026-01-01",
          },
        ],
        clinicalNotes: [
          {
            id: "note",
            veterinario_nome: "Dra. Camila",
            veterinario_crmv: "CE-1",
            diagnostico: "Otite",
            created_at: "2026-03-01",
          },
        ],
      }),
    );
    render(<VetPetProfilePage />);

    const titles = await screen.findAllByText(/Otite|Antirrábica/);
    expect(titles.map((n) => n.textContent)).toEqual(["Otite", "Antirrábica"]);
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

    it("cada aba tem o próprio botão de adicionar", async () => {
      await abrirAba("Vacinas");
      expect(
        screen.getByRole("button", { name: /Nova vacina/ }),
      ).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Medicações" }));
      expect(
        screen.getByRole("button", { name: /Novo medicamento/ }),
      ).toBeInTheDocument();
      // O botão é o da aba aberta, não o de outro tipo.
      expect(
        screen.queryByRole("button", { name: /Nova vacina/ }),
      ).not.toBeInTheDocument();
    });

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
});
