import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FoundPetPanel } from "./FoundPetPanel";

vi.mock("../../services/scan.service", () => ({
  registrarLeitura: vi.fn(),
}));

import { registrarLeitura } from "../../services/scan.service";
const registrarMock = vi.mocked(registrarLeitura);

type GetCurrentPosition = (
  sucesso: PositionCallback,
  erro: PositionErrorCallback,
) => void;

/**
 * Instala um `navigator.geolocation` que responde como o teste mandar, ou o
 * remove por completo (`null`) para simular navegador sem a API.
 */
function comGeolocation(impl: GetCurrentPosition | null) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: impl === null ? undefined : { getCurrentPosition: impl },
  });
}

const posicaoConcedida: GetCurrentPosition = (sucesso) =>
  sucesso({
    coords: { latitude: -3.73, longitude: -38.52, accuracy: 18 },
  } as GeolocationPosition);

const permissaoNegada: GetCurrentPosition = (_sucesso, erro) =>
  erro({
    code: 1,
    message: "User denied Geolocation",
  } as GeolocationPositionError);

describe("FoundPetPanel", () => {
  beforeEach(() => {
    registrarMock.mockReset();
    registrarMock.mockResolvedValue({ id: "scan-1" });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "geolocation");
  });

  function renderizar() {
    render(<FoundPetPanel token="tok-abc" petName="Rex" />);
  }

  async function clicarAvisar() {
    await userEvent.click(screen.getByRole("button", { name: /avisar/i }));
  }

  it("não pede localização antes do clique", () => {
    const spy = vi.fn();
    comGeolocation(spy);
    renderizar();

    expect(spy).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("envia a localização quando a pessoa concede a permissão", async () => {
    comGeolocation(posicaoConcedida);
    renderizar();

    await clicarAvisar();

    await waitFor(() =>
      expect(registrarMock).toHaveBeenCalledWith("tok-abc", {
        latitude: -3.73,
        longitude: -38.52,
        accuracy_meters: 18,
      }),
    );
    expect(await screen.findByText(/localização foi enviada/i)).toBeVisible();
  });

  // O ponto da feature: sem esse caminho, negar o GPS deixaria o tutor sem
  // saber que alguém encontrou o pet.
  it("avisa o tutor mesmo com a permissão negada", async () => {
    comGeolocation(permissaoNegada);
    renderizar();

    await clicarAvisar();

    await waitFor(() =>
      expect(registrarMock).toHaveBeenCalledWith("tok-abc", undefined),
    );
    expect(await screen.findByText(/sem a localização/i)).toBeVisible();
  });

  it("avisa o tutor em navegador sem geolocalização", async () => {
    comGeolocation(null);
    renderizar();

    await clicarAvisar();

    await waitFor(() =>
      expect(registrarMock).toHaveBeenCalledWith("tok-abc", undefined),
    );
  });

  it("mostra erro quando a chamada falha, mantendo o botão disponível", async () => {
    comGeolocation(permissaoNegada);
    registrarMock.mockRejectedValue(new Error("rede fora"));
    renderizar();

    await clicarAvisar();

    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByRole("button", { name: /avisar/i })).toBeEnabled();
  });
});
