import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VetRegisterPage } from "./VetRegisterPage";
import { ApiError } from "../../services/api";

const registerMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ register: registerMock }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

async function preencher(
  overrides: { password?: string; confirm?: string } = {},
) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Nome completo"), "Dra. Camila");
  await user.type(screen.getByLabelText("CRMV"), "CRMV-SP 12345");
  await user.type(screen.getByLabelText("E-mail"), "camila@vet.com");
  await user.type(
    screen.getByLabelText("Senha"),
    overrides.password ?? "senha-forte",
  );
  await user.type(
    screen.getByLabelText("Confirmar senha"),
    overrides.confirm ?? overrides.password ?? "senha-forte",
  );
  await user.click(screen.getByRole("button", { name: "Criar conta" }));
}

describe("VetRegisterPage", () => {
  beforeEach(() => {
    registerMock.mockReset();
    navigateMock.mockReset();
  });

  it("cadastra e navega para o dashboard", async () => {
    registerMock.mockResolvedValue(true);
    render(<VetRegisterPage />);

    await preencher();

    expect(registerMock).toHaveBeenCalledWith({
      nome: "Dra. Camila",
      email: "camila@vet.com",
      crmv: "CRMV-SP 12345",
      password: "senha-forte",
      telefone: undefined,
    });
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/vet/dashboard", {
        replace: true,
        state: { crmvVerificado: true },
      }),
    );
  });

  it("envia o telefone quando preenchido", async () => {
    registerMock.mockResolvedValue(true);
    render(<VetRegisterPage />);

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Telefone (opcional)"),
      "11999990000",
    );
    await preencher();

    expect(registerMock).toHaveBeenCalledWith(
      expect.objectContaining({ telefone: "11999990000" }),
    );
  });

  it("entra mesmo sem o CRMV verificado — o aviso aparece na tela do pet", async () => {
    registerMock.mockResolvedValue(false);
    render(<VetRegisterPage />);

    await preencher();

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/vet/dashboard", {
        replace: true,
        state: { crmvVerificado: false },
      }),
    );
  });

  it("barra senhas divergentes sem chamar a API", async () => {
    render(<VetRegisterPage />);

    await preencher({ password: "senha-forte", confirm: "outra-senha" });

    expect(
      await screen.findByText("As senhas não coincidem."),
    ).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("avisa sobre e-mail ou CRMV duplicado no 409", async () => {
    registerMock.mockRejectedValue(new ApiError(409, "Conflict"));
    render(<VetRegisterPage />);

    await preencher();

    expect(
      await screen.findByText("Já existe uma conta com esse e-mail ou CRMV."),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("mostra a mensagem da API no 400 de CRMV mal formatado", async () => {
    registerMock.mockRejectedValue(
      new ApiError(
        400,
        "Bad Request",
        'CRMV "abc" não está num formato reconhecido.',
      ),
    );
    render(<VetRegisterPage />);

    await preencher();

    expect(
      await screen.findByText(/não está num formato reconhecido/),
    ).toBeInTheDocument();
  });

  it("mostra erro genérico para falhas inesperadas", async () => {
    registerMock.mockRejectedValue(new ApiError(500, "Internal Server Error"));
    render(<VetRegisterPage />);

    await preencher();

    expect(
      await screen.findByText("Erro ao criar a conta. Tente novamente."),
    ).toBeInTheDocument();
  });
});
