import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicCardPage } from "./PublicCardPage";
import { ApiError } from "../../services/api";

let params: { token?: string } = { token: "tok-123" };
const navigateMock = vi.fn();
let authToken: string | null = null;

vi.mock("react-router-dom", () => ({
  useParams: () => params,
  useNavigate: () => navigateMock,
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ token: authToken }),
}));

vi.mock("../../services/card.service", () => ({
  getPublicCard: vi.fn(),
}));

import { getPublicCard } from "../../services/card.service";
const cardMock = vi.mocked(getPublicCard);

function buildCard(overrides: Record<string, unknown> = {}) {
  return {
    pet_id: "p1",
    pet_name: "Rex",
    species: "DOG",
    sex: "MALE",
    breed: "Labrador",
    weight: 20,
    birth_date: "2023-05-01",
    photo_url: null,
    qr_code_url: null,
    tutor_name: "Alice Tutora",
    vaccines: [
      {
        id: "v1",
        vaccine_name: "Antirrábica",
        applied_at: "2026-01-10",
        next_dose_at: null,
        veterinarian_name: "Dra. Camila",
      },
    ],
    dewormings: [],
    medications: [],
    ...overrides,
  };
}

describe("PublicCardPage", () => {
  beforeEach(() => {
    params = { token: "tok-123" };
    cardMock.mockReset();
    navigateMock.mockReset();
    authToken = null;
  });

  it("renderiza a carteira pública com pet, tutor e vacina", async () => {
    cardMock.mockResolvedValue(buildCard() as never);
    render(<PublicCardPage />);

    expect(await screen.findByText("Rex")).toBeInTheDocument();
    expect(screen.getByText("Alice Tutora")).toBeInTheDocument();
    expect(screen.getByText("Cachorro")).toBeInTheDocument();
    expect(screen.getByText("Antirrábica")).toBeInTheDocument();
    expect(cardMock).toHaveBeenCalledWith("tok-123");
  });

  it("manda o vet deslogado para o login, guardando o pet do QR", async () => {
    cardMock.mockResolvedValue(buildCard() as never);
    render(<PublicCardPage />);
    await screen.findByText("Rex");

    await userEvent.click(
      screen.getByRole("button", { name: "Sou veterinário" }),
    );

    expect(navigateMock).toHaveBeenCalledWith("/vet/login", {
      state: { redirectTo: "/vet/pets/p1" },
    });
  });

  it("leva o vet já autenticado direto ao perfil do pet", async () => {
    authToken = "jwt-vet";
    cardMock.mockResolvedValue(buildCard() as never);
    render(<PublicCardPage />);
    await screen.findByText("Rex");

    await userEvent.click(
      screen.getByRole("button", { name: "Sou veterinário" }),
    );

    expect(navigateMock).toHaveBeenCalledWith("/vet/pets/p1");
  });

  it("mostra 'não encontrada' quando a API responde 404", async () => {
    cardMock.mockRejectedValue(new ApiError(404, "Not Found"));
    render(<PublicCardPage />);

    expect(
      await screen.findByText("Carteira não encontrada"),
    ).toBeInTheDocument();
  });

  it("mostra erro de rede para falhas não-404", async () => {
    cardMock.mockRejectedValue(new ApiError(500, "Internal Server Error"));
    render(<PublicCardPage />);

    expect(await screen.findByText("Erro ao carregar")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeInTheDocument();
  });

  it("trata ausência de token como carteira não encontrada", async () => {
    params = {};
    render(<PublicCardPage />);

    expect(
      await screen.findByText("Carteira não encontrada"),
    ).toBeInTheDocument();
    expect(cardMock).not.toHaveBeenCalled();
  });
});
