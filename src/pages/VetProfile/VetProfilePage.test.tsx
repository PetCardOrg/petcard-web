import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VetProfilePage } from "./VetProfilePage";
import { ApiError } from "../../services/api";

const navigateMock = vi.fn();
const logoutMock = vi.fn();
const refreshUserMock = vi.fn();

const authUser = {
  id: "vet-1",
  nome: "Dra. Camila Ferreira",
  email: "camila@vet.com",
  crmv: "CRMV-SP 12345",
  role: "VET",
  telefone: "11999990000",
  foto_url: undefined as string | undefined,
};

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: authUser,
    token: "jwt-123",
    logout: logoutMock,
    refreshUser: refreshUserMock,
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

const uploadImageMock = vi.fn();
vi.mock("../../services/upload.service", () => ({
  uploadImage: (...args: unknown[]) => uploadImageMock(...args),
}));

const updateVeterinarioMock = vi.fn();
const deleteVeterinarioMock = vi.fn();
vi.mock("../../services/vet-profile.service", () => ({
  updateVeterinario: (...args: unknown[]) => updateVeterinarioMock(...args),
  deleteVeterinario: (...args: unknown[]) => deleteVeterinarioMock(...args),
}));

describe("VetProfilePage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    logoutMock.mockReset();
    refreshUserMock.mockReset();
    uploadImageMock.mockReset();
    updateVeterinarioMock.mockReset();
    deleteVeterinarioMock.mockReset();
    authUser.foto_url = undefined;
    authUser.telefone = "11999990000";
  });

  it("pré-preenche o formulário com os dados do veterinário logado", () => {
    render(<VetProfilePage />);

    expect(screen.getByLabelText("Nome completo")).toHaveValue(
      "Dra. Camila Ferreira",
    );
    expect(screen.getByLabelText("E-mail")).toHaveValue("camila@vet.com");
    expect(screen.getByLabelText("Telefone")).toHaveValue("11999990000");
  });

  it("volta ao dashboard ao clicar em voltar", async () => {
    render(<VetProfilePage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Voltar" }));

    expect(navigateMock).toHaveBeenCalledWith("/vet/dashboard");
  });

  it("o botão trocar foto aciona o input de arquivo escondido", async () => {
    render(<VetProfilePage />);
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Trocar foto" }));

    expect(clickSpy).toHaveBeenCalled();
  });

  it("salva nome, e-mail e telefone e mostra sucesso", async () => {
    updateVeterinarioMock.mockResolvedValue(undefined);
    refreshUserMock.mockResolvedValue(undefined);
    render(<VetProfilePage />);

    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Nome completo"));
    await user.type(screen.getByLabelText("Nome completo"), "Dra. Camila S.");
    await user.clear(screen.getByLabelText("E-mail"));
    await user.type(screen.getByLabelText("E-mail"), "camila.s@vet.com");
    await user.clear(screen.getByLabelText("Telefone"));
    await user.type(screen.getByLabelText("Telefone"), "11888887777");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() =>
      expect(updateVeterinarioMock).toHaveBeenCalledWith("jwt-123", {
        nome: "Dra. Camila S.",
        email: "camila.s@vet.com",
        telefone: "11888887777",
      }),
    );
    expect(refreshUserMock).toHaveBeenCalled();
    expect(await screen.findByText("Perfil atualizado.")).toBeInTheDocument();
  });

  it("envia telefone vazio como indefinido", async () => {
    updateVeterinarioMock.mockResolvedValue(undefined);
    refreshUserMock.mockResolvedValue(undefined);
    authUser.telefone = "";
    render(<VetProfilePage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() =>
      expect(updateVeterinarioMock).toHaveBeenCalledWith(
        "jwt-123",
        expect.objectContaining({ telefone: undefined }),
      ),
    );
  });

  it("avisa sobre e-mail duplicado no 409", async () => {
    updateVeterinarioMock.mockRejectedValue(new ApiError(409, "Conflict"));
    render(<VetProfilePage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(
      await screen.findByText("Já existe uma conta com esse e-mail."),
    ).toBeInTheDocument();
  });

  it("desloga em 401 ao salvar", async () => {
    updateVeterinarioMock.mockRejectedValue(new ApiError(401, "Unauthorized"));
    render(<VetProfilePage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(logoutMock).toHaveBeenCalled());
  });

  it("troca a foto: upload seguido de PATCH e refresh do usuário", async () => {
    uploadImageMock.mockResolvedValue({ url: "https://s3/vets/foto.png" });
    updateVeterinarioMock.mockResolvedValue(undefined);
    refreshUserMock.mockResolvedValue(undefined);
    render(<VetProfilePage />);

    const file = new File(["conteudo"], "foto.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, file);

    await waitFor(() =>
      expect(uploadImageMock).toHaveBeenCalledWith("jwt-123", file, "vets"),
    );
    expect(updateVeterinarioMock).toHaveBeenCalledWith("jwt-123", {
      foto_url: "https://s3/vets/foto.png",
    });
    expect(refreshUserMock).toHaveBeenCalled();
  });

  it("exclusão de conta exige duas etapas de confirmação", async () => {
    render(<VetProfilePage />);

    expect(
      screen.queryByRole("button", { name: "Sim, excluir definitivamente" }),
    ).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Excluir conta" }));

    expect(
      screen.getByRole("button", { name: "Sim, excluir definitivamente" }),
    ).toBeInTheDocument();
    expect(deleteVeterinarioMock).not.toHaveBeenCalled();
  });

  it("cancelar a exclusão fecha a confirmação sem chamar a API", async () => {
    render(<VetProfilePage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Excluir conta" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(
      screen.queryByRole("button", { name: "Sim, excluir definitivamente" }),
    ).not.toBeInTheDocument();
    expect(deleteVeterinarioMock).not.toHaveBeenCalled();
  });

  it("confirma a exclusão, limpa a sessão e redireciona ao login", async () => {
    deleteVeterinarioMock.mockResolvedValue(undefined);
    render(<VetProfilePage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Excluir conta" }));
    await user.click(
      screen.getByRole("button", { name: "Sim, excluir definitivamente" }),
    );

    await waitFor(() =>
      expect(deleteVeterinarioMock).toHaveBeenCalledWith("jwt-123"),
    );
    expect(logoutMock).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/vet/login", { replace: true });
  });

  it("mostra erro e permite tentar de novo se a exclusão falhar", async () => {
    deleteVeterinarioMock.mockRejectedValue(
      new ApiError(500, "Internal Server Error"),
    );
    render(<VetProfilePage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Excluir conta" }));
    await user.click(
      screen.getByRole("button", { name: "Sim, excluir definitivamente" }),
    );

    expect(
      await screen.findByText(
        "Não foi possível excluir a conta. Tente de novo.",
      ),
    ).toBeInTheDocument();
    expect(logoutMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
