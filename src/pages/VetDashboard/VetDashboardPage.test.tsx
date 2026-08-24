import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VetDashboardPage } from "./VetDashboardPage";
import { ApiError } from "../../services/api";
import type {
  DashboardPetItem,
  PaginatedResponse,
} from "../../services/dashboard.service";

const navigateMock = vi.fn();
const logoutMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { nome: "Dra. Camila" },
    token: "jwt",
    logout: logoutMock,
  }),
}));

vi.mock("../../services/dashboard.service", () => ({
  fetchDashboardPets: vi.fn(),
  removerPetAtendido: vi.fn(),
}));

vi.mock("../../services/crmv.service", () => ({
  fetchCrmvStatus: vi.fn(),
  verificarCrmv: vi.fn(),
  corrigirMeuCrmv: vi.fn(),
}));

import {
  fetchDashboardPets,
  removerPetAtendido,
} from "../../services/dashboard.service";
import { fetchCrmvStatus } from "../../services/crmv.service";
const fetchMock = vi.mocked(fetchDashboardPets);
const removerMock = vi.mocked(removerPetAtendido);
const crmvStatusMock = vi.mocked(fetchCrmvStatus);

function page(
  items: DashboardPetItem[],
  overrides: Partial<PaginatedResponse<DashboardPetItem>> = {},
): PaginatedResponse<DashboardPetItem> {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 10,
    totalPages: 1,
    ...overrides,
  };
}

const rex: DashboardPetItem = {
  id: "p1",
  name: "Rex",
  species: "DOG",
  breed: "Labrador",
  tutor_name: "Alice Tutora",
  last_attended_at: "2026-01-10T12:00:00.000Z",
};

let confirmado = true;

describe("VetDashboardPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    logoutMock.mockReset();
    fetchMock.mockReset();
    removerMock.mockReset();
    removerMock.mockResolvedValue(undefined);
    // Padrão do resto da suíte: CRMV em dia, sem aviso na tela.
    crmvStatusMock.mockReset();
    crmvStatusMock.mockResolvedValue({ verified: true });
    confirmado = true;
    vi.spyOn(window, "confirm").mockImplementation(() => confirmado);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lista os pets atendidos retornados pela API", async () => {
    fetchMock.mockResolvedValue(page([rex]));
    render(<VetDashboardPage />);

    expect(await screen.findByText("Rex")).toBeInTheDocument();
    expect(screen.getByText("Alice Tutora")).toBeInTheDocument();
    expect(screen.getByText("Dra. Camila")).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há pets", async () => {
    fetchMock.mockResolvedValue(page([]));
    render(<VetDashboardPage />);

    expect(
      await screen.findByText("Nenhum pet atendido ainda"),
    ).toBeInTheDocument();
  });

  it("mostra erro e refaz a busca ao clicar em tentar novamente", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    render(<VetDashboardPage />);

    const retry = await screen.findByRole("button", {
      name: "Tentar novamente",
    });
    fetchMock.mockResolvedValueOnce(page([rex]));
    await userEvent.click(retry);

    expect(await screen.findByText("Rex")).toBeInTheDocument();
  });

  it("desloga quando a API responde 401", async () => {
    fetchMock.mockRejectedValue(new ApiError(401, "Unauthorized"));
    render(<VetDashboardPage />);

    await waitFor(() => expect(logoutMock).toHaveBeenCalled());
  });

  it("navega para o perfil do pet ao clicar no card", async () => {
    fetchMock.mockResolvedValue(page([rex]));
    render(<VetDashboardPage />);

    await userEvent.click(await screen.findByText("Rex"));

    expect(navigateMock).toHaveBeenCalledWith("/vet/pets/p1", {
      state: { tutor_name: "Alice Tutora" },
    });
  });

  it("aplica o termo de busca (com debounce) na chamada da API", async () => {
    fetchMock.mockResolvedValue(page([rex]));
    render(<VetDashboardPage />);
    await screen.findByText("Rex");

    await userEvent.type(
      screen.getByPlaceholderText("Buscar por nome do pet ou tutor..."),
      "rex",
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "jwt",
        expect.objectContaining({ search: "rex", page: 1 }),
      ),
    );
  });

  it("avisa e oferece a verificação quando o CRMV está pendente", async () => {
    // Sem o botão o vet leria o aviso e não teria o que fazer com ele: é a
    // primeira tela dele, e o histórico clínico fica barrado até verificar.
    crmvStatusMock.mockResolvedValue({ verified: false });
    fetchMock.mockResolvedValue(page([rex]));
    render(<VetDashboardPage />);

    expect(
      await screen.findByText(/Não conseguimos confirmar seu CRMV/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Verificar meu CRMV" }),
    ).toBeInTheDocument();
  });

  it("não avisa quando o CRMV está verificado", async () => {
    crmvStatusMock.mockResolvedValue({ verified: true });
    fetchMock.mockResolvedValue(page([rex]));
    render(<VetDashboardPage />);
    await screen.findByText("Rex");

    expect(
      screen.queryByText(/Não conseguimos confirmar seu CRMV/),
    ).not.toBeInTheDocument();
  });

  it("desabilita os botões de paginação numa página única", async () => {
    fetchMock.mockResolvedValue(page([rex], { totalPages: 1, page: 1 }));
    render(<VetDashboardPage />);
    await screen.findByText("Rex");

    const pagination = screen
      .getByText(/Página 1 de 1/)
      .closest("div") as HTMLElement;
    const buttons = within(pagination).getAllByRole("button");
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
    }
  });

  describe("remover pet da lista", () => {
    it("tira o pet da lista e recarrega, sem abrir o prontuário", async () => {
      fetchMock.mockResolvedValue(page([rex]));
      render(<VetDashboardPage />);
      await screen.findByText("Rex");

      const buscasAntes = fetchMock.mock.calls.length;
      await userEvent.click(
        screen.getByRole("button", { name: "Tirar Rex da lista" }),
      );

      await waitFor(() =>
        expect(removerMock).toHaveBeenCalledWith("jwt", "p1"),
      );
      // O card inteiro navega: o botão de remover não pode abrir o pet.
      expect(navigateMock).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(fetchMock.mock.calls.length).toBeGreaterThan(buscasAntes),
      );
    });

    it("não remove nada quando o veterinário desiste na confirmação", async () => {
      confirmado = false;
      fetchMock.mockResolvedValue(page([rex]));
      render(<VetDashboardPage />);
      await screen.findByText("Rex");

      await userEvent.click(
        screen.getByRole("button", { name: "Tirar Rex da lista" }),
      );

      expect(removerMock).not.toHaveBeenCalled();
    });

    it("avisa quando a remoção falha", async () => {
      fetchMock.mockResolvedValue(page([rex]));
      removerMock.mockRejectedValue(new ApiError(500, "Boom"));
      render(<VetDashboardPage />);
      await screen.findByText("Rex");

      await userEvent.click(
        screen.getByRole("button", { name: "Tirar Rex da lista" }),
      );

      expect(
        await screen.findByText(
          "Não foi possível tirar o pet da lista. Tente de novo.",
        ),
      ).toBeInTheDocument();
    });

    it("desloga quando a remoção responde 401", async () => {
      fetchMock.mockResolvedValue(page([rex]));
      removerMock.mockRejectedValue(new ApiError(401, "Unauthorized"));
      render(<VetDashboardPage />);
      await screen.findByText("Rex");

      await userEvent.click(
        screen.getByRole("button", { name: "Tirar Rex da lista" }),
      );

      await waitFor(() => expect(logoutMock).toHaveBeenCalled());
    });
  });
});
