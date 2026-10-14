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

const locationMock = { state: null as unknown };

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useLocation: () => locationMock,
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
    overrides.password ?? "Senha-forte1!",
  );
  await user.type(
    screen.getByLabelText("Confirmar senha"),
    overrides.confirm ?? overrides.password ?? "Senha-forte1!",
  );
  await user.click(screen.getByRole("button", { name: "Criar conta" }));
}

describe("VetRegisterPage", () => {
  beforeEach(() => {
    registerMock.mockReset();
    navigateMock.mockReset();
    locationMock.state = null;
  });

  it("cadastra e navega para o dashboard", async () => {
    registerMock.mockResolvedValue(undefined);
    render(<VetRegisterPage />);

    await preencher();

    expect(registerMock).toHaveBeenCalledWith({
      nome: "Dra. Camila",
      email: "camila@vet.com",
      crmv: "CRMV-SP 12345",
      password: "Senha-forte1!",
      telefone: undefined,
    });
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/vet/dashboard", {
        replace: true,
        state: undefined,
      }),
    );
  });

  it("envia o telefone quando preenchido", async () => {
    registerMock.mockResolvedValue(undefined);
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

  it("devolve para a carteira do QR quando o cadastro veio de lá", async () => {
    // Sem carregar o redirecionamento, o vet cadastrado cairia no dashboard e
    // teria de escanear o QR de novo para abrir o pet que já tinha na mão.
    locationMock.state = { redirectTo: "/card/tok-123", acessoVet: true };
    registerMock.mockResolvedValue(undefined);
    render(<VetRegisterPage />);

    await preencher();

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/card/tok-123", {
        replace: true,
        state: { acessoVet: true },
      }),
    );
  });

  it("barra senhas divergentes sem chamar a API", async () => {
    render(<VetRegisterPage />);

    await preencher({ password: "Senha-forte1!", confirm: "Outra-senha1!" });

    expect(
      await screen.findByText("As senhas não coincidem."),
    ).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it.each([
    ["curta1!", "A senha deve ter no mínimo 8 caracteres."],
    ["senha-forte1!", "A senha deve conter ao menos uma letra maiúscula."],
    ["Senha-forte!", "A senha deve conter ao menos um número."],
    ["Senhaforte12", "A senha deve conter ao menos um caractere especial."],
  ])("barra a senha fraca %s sem chamar a API", async (senha, mensagem) => {
    render(<VetRegisterPage />);

    await preencher({ password: senha });

    expect(await screen.findByText(mensagem)).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("mostra as regras da senha: cinza até cumprir, verde depois", async () => {
    const user = userEvent.setup();
    render(<VetRegisterPage />);
    const regra = (nome: string) => screen.getByText(nome).closest("li");

    expect(regra("Pelo menos 8 caracteres")).toHaveAttribute(
      "data-met",
      "false",
    );
    expect(regra("Uma letra maiúscula")).toHaveAttribute("data-met", "false");

    await user.type(screen.getByLabelText("Senha"), "Abc");

    expect(regra("Uma letra maiúscula")).toHaveAttribute("data-met", "true");
    expect(regra("Pelo menos 8 caracteres")).toHaveAttribute(
      "data-met",
      "false",
    );
    expect(regra("Um número")).toHaveAttribute("data-met", "false");

    await user.type(screen.getByLabelText("Senha"), "defg1!");

    for (const nome of [
      "Pelo menos 8 caracteres",
      "Uma letra maiúscula",
      "Um número",
      "Um caractere especial",
    ]) {
      expect(regra(nome)).toHaveAttribute("data-met", "true");
    }
  });

  it("o olhinho mostra e oculta a senha e a confirmação", async () => {
    const user = userEvent.setup();
    render(<VetRegisterPage />);

    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Confirmar senha")).toHaveAttribute(
      "type",
      "password",
    );

    const olhos = screen.getAllByRole("button", { name: "Mostrar senha" });
    expect(olhos).toHaveLength(2);

    await user.click(olhos[0]);
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Confirmar senha")).toHaveAttribute(
      "type",
      "password",
    );

    await user.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
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
