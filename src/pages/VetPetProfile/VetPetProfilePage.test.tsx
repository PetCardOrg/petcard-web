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
}));

import {
  createClinicalNote,
  fetchPetProfile,
} from "../../services/pet-profile.service";

const fetchProfileMock = vi.mocked(fetchPetProfile);
const createNoteMock = vi.mocked(createClinicalNote);

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
