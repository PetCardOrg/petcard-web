import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VetScanPage } from "./VetScanPage";
import { ApiError } from "../../services/api";

const navigateMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("../../services/card.service", () => ({
  getPublicCard: vi.fn(),
}));

// Estado controlável do scanner mockado (compartilhado com a fábrica do mock).
const scanner = vi.hoisted(() => ({
  cameras: [{ id: "cam1", label: "Back" }] as { id: string; label: string }[],
  startError: null as unknown,
  successCb: null as ((decoded: string) => void) | null,
  stop: vi.fn(() => Promise.resolve()),
}));

vi.mock("html5-qrcode", () => {
  class Html5Qrcode {
    getState() {
      return 2; // SCANNING
    }
    stop = scanner.stop;
    start(
      _constraints: unknown,
      _config: unknown,
      onSuccess: (decoded: string) => void,
    ) {
      if (scanner.startError) return Promise.reject(scanner.startError);
      scanner.successCb = onSuccess;
      return Promise.resolve();
    }
    static getCameras() {
      return Promise.resolve(scanner.cameras);
    }
  }
  return { Html5Qrcode };
});

import { getPublicCard } from "../../services/card.service";
const cardMock = vi.mocked(getPublicCard);

const VALID_TOKEN = "123e4567-e89b-12d3-a456-426614174000";

async function startScanning() {
  await userEvent.click(screen.getByRole("button", { name: "Abrir Câmera" }));
  await screen.findByText("Posicione o QR Code dentro da área de leitura");
}

describe("VetScanPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    cardMock.mockReset();
    scanner.cameras = [{ id: "cam1", label: "Back" }];
    scanner.startError = null;
    scanner.successCb = null;
    scanner.stop.mockClear();
  });

  it("resolve o token lido e navega para o perfil do pet", async () => {
    cardMock.mockResolvedValue({ pet_id: "p1" } as never);
    render(<VetScanPage />);

    await startScanning();
    await act(async () => {
      scanner.successCb?.(`https://card.petcard.app/#/${VALID_TOKEN}`);
    });

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/vet/pets/p1"),
    );
    expect(cardMock).toHaveBeenCalledWith(VALID_TOKEN);
  });

  it("mostra QR inválido quando o conteúdo não tem token", async () => {
    render(<VetScanPage />);

    await startScanning();
    await act(async () => {
      scanner.successCb?.("isto-não-é-um-qr-válido");
    });

    expect(await screen.findByText("QR Code inválido")).toBeInTheDocument();
    expect(cardMock).not.toHaveBeenCalled();
  });

  it("mostra QR inválido quando o token não corresponde a uma carteira (404)", async () => {
    cardMock.mockRejectedValue(new ApiError(404, "Not Found"));
    render(<VetScanPage />);

    await startScanning();
    await act(async () => {
      scanner.successCb?.(VALID_TOKEN);
    });

    expect(await screen.findByText("QR Code inválido")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("mostra 'câmera indisponível' quando não há câmeras", async () => {
    scanner.cameras = [];
    render(<VetScanPage />);

    await userEvent.click(screen.getByRole("button", { name: "Abrir Câmera" }));

    expect(await screen.findByText("Câmera indisponível")).toBeInTheDocument();
  });

  it("mostra 'acesso negado' quando a permissão da câmera é recusada", async () => {
    scanner.startError = new Error("NotAllowedError: permission denied");
    render(<VetScanPage />);

    await userEvent.click(screen.getByRole("button", { name: "Abrir Câmera" }));

    expect(await screen.findByText("Acesso negado")).toBeInTheDocument();
  });

  it("volta para o dashboard pelo botão de voltar", async () => {
    render(<VetScanPage />);

    // O botão de voltar é só ícone (sem nome acessível) e é o 1º do cabeçalho.
    await userEvent.click(screen.getAllByRole("button")[0]);

    expect(navigateMock).toHaveBeenCalledWith("/vet/dashboard");
  });
});
