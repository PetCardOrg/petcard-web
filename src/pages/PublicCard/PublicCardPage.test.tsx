import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicCardPage } from "./PublicCardPage";
import { ApiError } from "../../services/api";

let params: { token?: string } = { token: "tok-123" };
const navigateMock = vi.fn();
let authToken: string | null = null;

let locationState: Record<string, unknown> | null = null;

vi.mock("react-router-dom", () => ({
  useParams: () => params,
  useNavigate: () => navigateMock,
  useLocation: () => ({ state: locationState }),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ token: authToken }),
}));

vi.mock("../../services/card.service", () => ({
  getPublicCard: vi.fn(),
}));

vi.mock("../../services/dashboard.service", () => ({
  adicionarPetAtendido: vi.fn(),
}));

import { getPublicCard } from "../../services/card.service";
import { adicionarPetAtendido } from "../../services/dashboard.service";
const cardMock = vi.mocked(getPublicCard);
const adicionarMock = vi.mocked(adicionarPetAtendido);

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
    adicionarMock.mockReset();
    adicionarMock.mockResolvedValue({} as never);
    authToken = null;
    locationState = null;
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

    // Volta para a carteira, não para o prontuário: é aqui que o vínculo
    // com o veterinário é criado.
    expect(navigateMock).toHaveBeenCalledWith("/vet/login", {
      state: { redirectTo: "/card/tok-123", acessoVet: true },
    });
    expect(adicionarMock).not.toHaveBeenCalled();
  });

  it("adiciona o pet à lista do vet autenticado e abre o prontuário", async () => {
    authToken = "jwt-vet";
    cardMock.mockResolvedValue(buildCard() as never);
    render(<PublicCardPage />);
    await screen.findByText("Rex");

    await userEvent.click(
      screen.getByRole("button", { name: "Sou veterinário" }),
    );

    // Sem esta chamada o vet abriria o prontuário e o pet não estaria no
    // dashboard dele (api#130).
    await waitFor(() =>
      expect(adicionarMock).toHaveBeenCalledWith("jwt-vet", "tok-123"),
    );
    expect(navigateMock).toHaveBeenCalledWith("/vet/pets/p1");
  });

  it("entra sozinho ao voltar do login, sem pedir outro clique", async () => {
    authToken = "jwt-vet";
    locationState = { acessoVet: true };
    cardMock.mockResolvedValue(buildCard() as never);
    render(<PublicCardPage />);
    await screen.findByText("Rex");

    await waitFor(() =>
      expect(adicionarMock).toHaveBeenCalledWith("jwt-vet", "tok-123"),
    );
    expect(navigateMock).toHaveBeenCalledWith("/vet/pets/p1");
  });

  it("explica o bloqueio quando o CRMV não está verificado", async () => {
    authToken = "jwt-vet";
    adicionarMock.mockRejectedValue(new ApiError(403, "Forbidden"));
    cardMock.mockResolvedValue(buildCard() as never);
    render(<PublicCardPage />);
    await screen.findByText("Rex");

    await userEvent.click(
      screen.getByRole("button", { name: "Sou veterinário" }),
    );

    expect(
      await screen.findByText(
        "Seu CRMV precisa estar verificado para acessar dados clínicos.",
      ),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("não navega quando a vinculação falha", async () => {
    authToken = "jwt-vet";
    adicionarMock.mockRejectedValue(new ApiError(500, "Boom"));
    cardMock.mockResolvedValue(buildCard() as never);
    render(<PublicCardPage />);
    await screen.findByText("Rex");

    await userEvent.click(
      screen.getByRole("button", { name: "Sou veterinário" }),
    );

    expect(
      await screen.findByText(
        "Não foi possível abrir este pet. Tente de novo.",
      ),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
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
  it("não expõe o QR nesta tela, mesmo quando a carteira traz a imagem", async () => {
    // O QR vive só no app do tutor (web#34): quem chega aqui já leu o código.
    cardMock.mockResolvedValue(
      buildCard({ qr_code_url: "https://cdn.petcard/qr/p1.png" }) as never,
    );
    render(<PublicCardPage />);
    await screen.findByText("Rex");

    expect(screen.queryByRole("img", { name: /qr/i })).not.toBeInTheDocument();
  });
});
