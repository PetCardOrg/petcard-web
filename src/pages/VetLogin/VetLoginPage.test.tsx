import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VetLoginPage } from "./VetLoginPage";
import { ApiError } from "../../services/api";

const loginMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ login: loginMock }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

async function fillAndSubmit(email = "vet@petcard.com", password = "senha123") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("E-mail"), email);
  await user.type(screen.getByLabelText("Senha"), password);
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("VetLoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
    navigateMock.mockReset();
  });

  it("autentica e navega para o dashboard no sucesso", async () => {
    loginMock.mockResolvedValue(undefined);
    render(<VetLoginPage />);

    await fillAndSubmit();

    expect(loginMock).toHaveBeenCalledWith("vet@petcard.com", "senha123");
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/vet/dashboard", {
        replace: true,
      }),
    );
  });

  it("mostra erro de credenciais inválidas no 401 e não navega", async () => {
    loginMock.mockRejectedValue(new ApiError(401, "Unauthorized"));
    render(<VetLoginPage />);

    await fillAndSubmit("vet@petcard.com", "errada");

    expect(
      await screen.findByText("E-mail ou senha inválidos."),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("mostra erro genérico para falhas não-401", async () => {
    loginMock.mockRejectedValue(new ApiError(500, "Internal Server Error"));
    render(<VetLoginPage />);

    await fillAndSubmit();

    expect(
      await screen.findByText("Erro ao fazer login. Tente novamente."),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
