import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrmvAviso } from "./CrmvAviso";

vi.mock("../../services/crmv.service", () => ({
  verificarCrmv: vi.fn(),
}));

import { verificarCrmv } from "../../services/crmv.service";
const verificarMock = vi.mocked(verificarCrmv);

describe("CrmvAviso", () => {
  const onVerificado = vi.fn();

  beforeEach(() => {
    verificarMock.mockReset();
    onVerificado.mockReset();
  });

  async function clicarEmVerificar() {
    await userEvent.click(
      screen.getByRole("button", { name: "Verificar meu CRMV" }),
    );
  }

  it("devolve o controle à tela quando o registro é aprovado", async () => {
    verificarMock.mockResolvedValue({ verified: true });
    render(
      <CrmvAviso
        token="jwt-vet"
        mensagem="Acesso barrado"
        onVerificado={onVerificado}
      />,
    );

    await clicarEmVerificar();

    // Sem este retorno o vet verifica o CRMV e continua olhando o bloqueio.
    await waitFor(() => expect(onVerificado).toHaveBeenCalled());
  });

  it("mostra a situação do conselho quando o registro é recusado", async () => {
    verificarMock.mockResolvedValue({ verified: false, situacao: "SUSPENSO" });
    render(
      <CrmvAviso
        token="jwt-vet"
        mensagem="Acesso barrado"
        onVerificado={onVerificado}
      />,
    );

    await clicarEmVerificar();

    // A situação é o que diz ao vet se o problema é o cadastro ou o registro.
    expect(await screen.findByText(/SUSPENSO/)).toBeInTheDocument();
    expect(onVerificado).not.toHaveBeenCalled();
  });
});
