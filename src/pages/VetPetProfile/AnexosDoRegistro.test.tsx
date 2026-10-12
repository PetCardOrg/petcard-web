import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnexosDoRegistro } from "./AnexosDoRegistro";
import { ApiError } from "../../services/api";

vi.mock("../../services/anexo.service", () => ({
  enviarAnexo: vi.fn(),
  obterLinkDoAnexo: vi.fn(),
  verificarAnexo: vi.fn(),
  removerAnexo: vi.fn(),
}));

import {
  enviarAnexo,
  obterLinkDoAnexo,
  removerAnexo,
  verificarAnexo,
} from "../../services/anexo.service";

const doTutor = {
  id: "a1",
  nome_arquivo: "carteirinha.jpg",
  mime_type: "image/jpeg",
  tamanho_bytes: 2048,
  enviado_por_tipo: "TUTOR",
  enviado_por_id: "tutor-1",
  enviado_por_nome: "Ana",
  verificado: false,
};
const doVet = {
  id: "a2",
  nome_arquivo: "receita.pdf",
  mime_type: "application/pdf",
  tamanho_bytes: 4096,
  enviado_por_tipo: "VET",
  enviado_por_id: "vet-1",
  enviado_por_nome: "Dra. Camila",
  verificado: true,
  verificado_por_nome: "Dra. Camila",
  verificado_por_crmv: "CRMV-SP 12345",
};

function renderizar(anexos: unknown[], veterinarioId = "vet-1") {
  const onChanged = vi.fn();
  render(
    <AnexosDoRegistro
      token="jwt"
      petId="p1"
      entidade="VACINA"
      entidadeId="v1"
      anexos={anexos as never}
      veterinarioId={veterinarioId}
      onChanged={onChanged}
    />,
  );
  return onChanged;
}

describe("AnexosDoRegistro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("distingue o comprovante verificado do que aguarda verificação", () => {
    renderizar([doTutor, doVet]);

    expect(screen.getByTestId("anexo-pendente-a1")).toBeInTheDocument();
    expect(screen.getByTestId("anexo-verificado-a2")).toHaveTextContent(
      "Verificado por Dra. Camila (CRMV-SP 12345)",
    );
  });

  it("só oferece verificar o que ainda não foi verificado", () => {
    renderizar([doTutor, doVet]);

    expect(
      screen.getAllByRole("button", { name: "Marcar como verificado" }),
    ).toHaveLength(1);
  });

  it("verifica o comprovante do tutor e recarrega", async () => {
    vi.mocked(verificarAnexo).mockResolvedValue({} as never);
    const onChanged = renderizar([doTutor]);

    await userEvent.click(
      screen.getByRole("button", { name: "Marcar como verificado" }),
    );

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(verificarAnexo).toHaveBeenCalledWith("jwt", "a1");
  });

  it("só permite remover o que o próprio veterinário enviou", () => {
    renderizar([doTutor, doVet]);
    // O do tutor não tem "Remover"; o do vet logado tem.
    expect(screen.getAllByRole("button", { name: "Remover" })).toHaveLength(1);
  });

  it("não oferece remover comprovante enviado por outro veterinário", () => {
    renderizar([doVet], "vet-outro");
    expect(
      screen.queryByRole("button", { name: "Remover" }),
    ).not.toBeInTheDocument();
  });

  it("remove só depois de confirmar", async () => {
    vi.mocked(removerAnexo).mockResolvedValue(undefined);
    const confirmar = vi.spyOn(window, "confirm");
    const onChanged = renderizar([doVet]);

    confirmar.mockReturnValueOnce(false);
    await userEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(removerAnexo).not.toHaveBeenCalled();

    confirmar.mockReturnValueOnce(true);
    await userEvent.click(screen.getByRole("button", { name: "Remover" }));
    await waitFor(() => expect(removerAnexo).toHaveBeenCalledWith("jwt", "a2"));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("envia o arquivo escolhido e recarrega", async () => {
    vi.mocked(enviarAnexo).mockResolvedValue({} as never);
    const onChanged = renderizar([]);
    const arquivo = new File(["%PDF-"], "vacina.pdf", {
      type: "application/pdf",
    });

    await userEvent.upload(screen.getByTestId("anexo-input-v1"), arquivo);

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(enviarAnexo).toHaveBeenCalledWith(
      "jwt",
      "p1",
      { entidade: "VACINA", entidadeId: "v1" },
      arquivo,
    );
  });

  it("recusa no navegador o que a API recusaria, sem enviar", async () => {
    renderizar([]);
    const input = screen.getByTestId("anexo-input-v1");

    // `applyAccept: false`: o input filtra por `accept` e descartaria o arquivo
    // antes da validação que este teste quer exercitar.
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(input, new File(["x"], "a.gif", { type: "image/gif" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Formato não aceito",
    );

    const grande = new File(["x"], "a.pdf", { type: "application/pdf" });
    Object.defineProperty(grande, "size", { value: 11 * 1024 * 1024 });
    await user.upload(input, grande);
    expect(await screen.findByRole("alert")).toHaveTextContent("10 MB");

    expect(enviarAnexo).not.toHaveBeenCalled();
  });

  it("mostra o motivo devolvido pela API quando o envio falha", async () => {
    vi.mocked(enviarAnexo).mockRejectedValue(
      new ApiError(
        400,
        "Bad Request",
        "Cada registro aceita no máximo 10 comprovantes.",
      ),
    );
    const onChanged = renderizar([]);

    await userEvent.upload(
      screen.getByTestId("anexo-input-v1"),
      new File(["%PDF-"], "a.pdf", { type: "application/pdf" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cada registro aceita no máximo 10 comprovantes.",
    );
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("abre o arquivo pelo link temporário", async () => {
    const aba = { opener: {}, location: { href: "" }, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(aba as never);
    vi.mocked(obterLinkDoAnexo).mockResolvedValue({
      url: "https://s3.example/assinado",
      expira_em: new Date(),
    });
    renderizar([doVet]);

    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));

    await waitFor(() =>
      expect(aba.location.href).toBe("https://s3.example/assinado"),
    );
    expect(aba.opener).toBeNull();
  });

  it("fecha a aba em branco quando o link não pôde ser gerado", async () => {
    const aba = { opener: {}, location: { href: "" }, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(aba as never);
    vi.mocked(obterLinkDoAnexo).mockRejectedValue(
      new ApiError(404, "Not Found"),
    );
    renderizar([doVet]);

    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível abrir o comprovante.",
    );
    expect(aba.close).toHaveBeenCalled();
  });
});
