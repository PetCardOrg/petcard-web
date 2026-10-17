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

const consultarCrmvMock = vi.fn();

vi.mock("../../services/crmv.service", () => ({
  consultarCrmv: (crmv: string) => consultarCrmvMock(crmv) as unknown,
}));

const CONSULTA_OK = {
  crmv: "CRMV-SP 12345",
  uf: "SP",
  numero: "12345",
  valido: true,
  nome: "CAMILA FERREIRA",
  situacao: "Ativo",
};

/** Primeiro passo: informa o CRMV e espera os demais campos aparecerem. */
async function informarCrmv(crmv = "sp 12345") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("CRMV"), crmv);
  await user.click(screen.getByRole("button", { name: "Continuar" }));
}

async function preencher(
  overrides: { password?: string; confirm?: string } = {},
) {
  await informarCrmv();
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("E-mail"), "camila@vet.com");
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
    consultarCrmvMock.mockReset();
    consultarCrmvMock.mockResolvedValue(CONSULTA_OK);
    navigateMock.mockReset();
    locationMock.state = null;
  });

  it("cadastra e navega para o dashboard", async () => {
    registerMock.mockResolvedValue(undefined);
    render(<VetRegisterPage />);

    await preencher();

    // Nome do registro oficial e CRMV no formato canônico devolvido pela
    // consulta, não o que foi digitado.
    expect(consultarCrmvMock).toHaveBeenCalledWith("sp 12345");
    expect(registerMock).toHaveBeenCalledWith({
      nome: "CAMILA FERREIRA",
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
    await informarCrmv();
    await user.type(
      await screen.findByLabelText("Telefone (opcional)"),
      "11999990000",
    );
    await user.type(screen.getByLabelText("E-mail"), "camila@vet.com");
    await user.type(screen.getByLabelText("Senha"), "Senha-forte1!");
    await user.type(screen.getByLabelText("Confirmar senha"), "Senha-forte1!");
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

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
    await informarCrmv();
    await screen.findByLabelText("Senha");
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
    await informarCrmv();
    await screen.findByLabelText("Senha");

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

  describe("CRMV primeiro", () => {
    it("só mostra os demais campos depois de consultar o CRMV", async () => {
      render(<VetRegisterPage />);

      expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();

      await informarCrmv();

      expect(await screen.findByLabelText("E-mail")).toBeInTheDocument();
      expect(screen.getByText("Registro Ativo no CFMV")).toBeInTheDocument();
    });

    it("preenche e trava o nome com o registro oficial", async () => {
      render(<VetRegisterPage />);

      await informarCrmv();

      const nome = await screen.findByLabelText("Nome completo");
      expect(nome).toHaveValue("CAMILA FERREIRA");
      expect(nome).toHaveAttribute("readonly");
      expect(screen.getByLabelText("CRMV")).toHaveValue("CRMV-SP 12345");
    });

    it("deixa o nome editável quando o CFMV não informa o nome", async () => {
      consultarCrmvMock.mockResolvedValue({ ...CONSULTA_OK, nome: undefined });
      render(<VetRegisterPage />);

      await informarCrmv();

      const nome = await screen.findByLabelText("Nome completo");
      expect(nome).toHaveValue("");
      expect(nome).not.toHaveAttribute("readonly");
    });

    it("barra CRMV que não está ativo no CFMV", async () => {
      consultarCrmvMock.mockResolvedValue({
        ...CONSULTA_OK,
        valido: false,
        nome: undefined,
        situacao: "Cancelado",
      });
      render(<VetRegisterPage />);

      await informarCrmv();

      expect(
        await screen.findByText(/Não encontramos esse CRMV ativo/),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
    });

    it("avisa CRMV já cadastrado na consulta", async () => {
      consultarCrmvMock.mockRejectedValue(new ApiError(409, "Conflict"));
      render(<VetRegisterPage />);

      await informarCrmv();

      expect(
        await screen.findByText("Já existe uma conta com esse CRMV."),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
    });

    it("segue no preenchimento manual quando o CFMV está fora do ar", async () => {
      // Indisponibilidade de terceiro não pode impedir o cadastro: a API
      // verifica o CRMV depois.
      consultarCrmvMock.mockRejectedValue(new ApiError(502, "Bad Gateway"));
      registerMock.mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<VetRegisterPage />);

      await informarCrmv("CRMV-SP 12345");
      const nome = await screen.findByLabelText("Nome completo");
      expect(nome).not.toHaveAttribute("readonly");
      await user.type(nome, "Dra. Camila");
      await user.type(screen.getByLabelText("E-mail"), "camila@vet.com");
      await user.type(screen.getByLabelText("Senha"), "Senha-forte1!");
      await user.type(
        screen.getByLabelText("Confirmar senha"),
        "Senha-forte1!",
      );
      await user.click(screen.getByRole("button", { name: "Criar conta" }));

      expect(registerMock).toHaveBeenCalledWith(
        expect.objectContaining({ nome: "Dra. Camila", crmv: "CRMV-SP 12345" }),
      );
    });

    it("Alterar volta para o passo do CRMV", async () => {
      const user = userEvent.setup();
      render(<VetRegisterPage />);
      await informarCrmv();
      await screen.findByLabelText("E-mail");

      await user.click(screen.getByRole("button", { name: "Alterar" }));

      expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
      expect(screen.getByLabelText("CRMV")).not.toHaveAttribute("readonly");
    });
  });
});
