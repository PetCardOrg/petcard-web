import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
}));

import { fetchDashboardPets } from "../../services/dashboard.service";
const fetchMock = vi.mocked(fetchDashboardPets);

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

describe("VetDashboardPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    logoutMock.mockReset();
    fetchMock.mockReset();
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

  it("navega para o scanner pelo botão de QR", async () => {
    fetchMock.mockResolvedValue(page([rex]));
    render(<VetDashboardPage />);
    await screen.findByText("Rex");

    await userEvent.click(screen.getByRole("button", { name: /Escanear QR/ }));

    expect(navigateMock).toHaveBeenCalledWith("/vet/scan");
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
});
