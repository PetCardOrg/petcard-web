import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrmvAviso } from "./CrmvAviso";

vi.mock("../../services/crmv.service", () => ({
  verificarCrmv: vi.fn(),
  corrigirMeuCrmv: vi.fn(),
}));

import { corrigirMeuCrmv, verificarCrmv } from "../../services/crmv.service";
const verificarMock = vi.mocked(verificarCrmv);
const corrigirMock = vi.mocked(corrigirMeuCrmv);

describe("CrmvAviso", () => {
  const onVerificado = vi.fn();

  beforeEach(() => {
    verificarMock.mockReset();
    corrigirMock.mockReset();
    corrigirMock.mockResolvedValue(undefined);
    onVerificado.mockReset();
  });

  function renderizar(crmvAtual?: string) {
    render(
      <CrmvAviso
        token="jwt-vet"
        mensagem="Acesso barrado"
        crmvAtual={crmvAtual}
        onVerificado={onVerificado}
      />,
    );
  }

  async function corrigirPara(novo: string) {
    await userEvent.click(
      screen.getByRole("button", { name: "Corrigir meu CRMV" }),
    );
    const campo = screen.getByLabelText("CRMV");
    await userEvent.clear(campo);
    await userEvent.type(campo, novo);
    await userEvent.click(
      screen.getByRole("button", { name: "Salvar e verificar" }),
    );
  }

  async function clicarEmVerificar() {
    await userEvent.click(
      screen.getByRole("button", { name: "Verificar meu CRMV" }),
    );
  }

  it("devolve o controle à tela quando o registro é aprovado", async () => {
    verificarMock.mockResolvedValue({ verified: true });
    renderizar();

    await clicarEmVerificar();

    // Sem este retorno o vet verifica o CRMV e continua olhando o bloqueio.
    await waitFor(() => expect(onVerificado).toHaveBeenCalled());
  });

  it("mostra a situação do conselho quando o registro é recusado", async () => {
    verificarMock.mockResolvedValue({ verified: false, situacao: "SUSPENSO" });
    renderizar();

    await clicarEmVerificar();

    // A situação é o que diz ao vet se o problema é o cadastro ou o registro.
    expect(await screen.findByText(/SUSPENSO/)).toBeInTheDocument();
    expect(onVerificado).not.toHaveBeenCalled();
  });

  it("salva o CRMV corrigido e verifica na mesma ação", async () => {
    verificarMock.mockResolvedValue({ verified: true });
    renderizar("CRMV-SP 00000");

    await corrigirPara("CRMV-SP 12345");

    // Reconsultar o mesmo número errado nunca destravaria: quem se cadastrou
    // com o CRMV trocado só sai daqui corrigindo.
    expect(corrigirMock).toHaveBeenCalledWith("jwt-vet", "CRMV-SP 12345");
    await waitFor(() => expect(onVerificado).toHaveBeenCalled());
  });

  it("não destrava quando o CRMV corrigido também é recusado", async () => {
    verificarMock.mockResolvedValue({
      verified: false,
      situacao: "Não encontrado",
    });
    renderizar("CRMV-SP 00000");

    await corrigirPara("CRMV-SP 11111");

    expect(await screen.findByText(/Não encontrado/)).toBeInTheDocument();
    expect(onVerificado).not.toHaveBeenCalled();
  });
});
