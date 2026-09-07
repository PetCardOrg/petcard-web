import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { LostPetPage } from "./LostPetPage";
import { ApiError } from "../../services/api";

vi.mock("../../services/coleira.service", () => ({
  getColeiraPublica: vi.fn(),
  registrarLeitura: vi.fn(),
}));

import {
  getColeiraPublica,
  registrarLeitura,
} from "../../services/coleira.service";

const getMock = vi.mocked(getColeiraPublica);
const leituraMock = vi.mocked(registrarLeitura);

type GetCurrentPosition = (
  sucesso: PositionCallback,
  erro: PositionErrorCallback,
) => void;

function comGeolocation(impl: GetCurrentPosition | null) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: impl === null ? undefined : { getCurrentPosition: impl },
  });
}

const posicaoConcedida: GetCurrentPosition = (sucesso) =>
  sucesso({
    coords: { latitude: -3.73, longitude: -38.52, accuracy: 12 },
  } as GeolocationPosition);

const permissaoNegada: GetCurrentPosition = (_sucesso, erro) =>
  erro({ code: 1, message: "denied" } as GeolocationPositionError);

const PET = {
  pet_id: "p1",
  pet_name: "Rex",
  species: "DOG",
  breed: "Labrador",
  sex: "MALE",
  photo_url: undefined,
  tutor_name: "Alice",
  tutor_phone: "+55 85 99999-0000",
};

function renderizar() {
  render(
    <MemoryRouter initialEntries={["/achei/tok-abc"]}>
      <Routes>
        <Route path="/achei/:token" element={<LostPetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LostPetPage", () => {
  beforeEach(() => {
    getMock.mockReset();
    leituraMock.mockReset();
    getMock.mockResolvedValue(PET);
    leituraMock.mockResolvedValue({ id: "scan-1" });
    comGeolocation(posicaoConcedida);
  });

  it("avisa o tutor com a localização assim que abre, sem clique", async () => {
    renderizar();

    await waitFor(() =>
      expect(leituraMock).toHaveBeenCalledWith("tok-abc", {
        latitude: -3.73,
        longitude: -38.52,
        accuracy_meters: 12,
      }),
    );
    expect(await screen.findByText(/recebeu um aviso/i)).toBeVisible();
  });

  // O ponto da página: quem nega o GPS ainda assim aciona o aviso, porque
  // "seu pet foi encontrado" já é a informação urgente.
  it("avisa o tutor mesmo com a localização negada, e oferece tentar de novo", async () => {
    comGeolocation(permissaoNegada);
    renderizar();

    await waitFor(() =>
      expect(leituraMock).toHaveBeenCalledWith("tok-abc", undefined),
    );
    expect(
      await screen.findByRole("button", { name: /compartilhar minha/i }),
    ).toBeVisible();
  });

  it("reenvia com localização quando a pessoa usa o botão de resgate", async () => {
    comGeolocation(permissaoNegada);
    renderizar();
    const botao = await screen.findByRole("button", {
      name: /compartilhar minha/i,
    });

    comGeolocation(posicaoConcedida);
    await userEvent.click(botao);

    await waitFor(() => expect(leituraMock).toHaveBeenCalledTimes(2));
    expect(leituraMock.mock.calls[1][1]).toMatchObject({ latitude: -3.73 });
  });

  it("mostra o telefone do tutor como link de chamada", async () => {
    renderizar();

    const link = await screen.findByRole("link", { name: /ligar para/i });
    expect(link).toHaveAttribute("href", "tel:+5585999990000");
  });

  // O telefone é opcional no cadastro; sem ele a página não pode virar um
  // beco sem saída para quem está com o animal.
  it("explica o que fazer quando o tutor não tem telefone", async () => {
    getMock.mockResolvedValue({ ...PET, tutor_phone: undefined });
    renderizar();

    expect(await screen.findByText(/não cadastrou telefone/i)).toBeVisible();
    expect(screen.queryByRole("link", { name: /ligar/i })).toBeNull();
  });

  it("não expõe histórico clínico do pet", async () => {
    renderizar();
    await screen.findByText("Rex");

    expect(screen.queryByText(/vacina/i)).toBeNull();
    expect(screen.queryByText(/medica/i)).toBeNull();
  });

  it("mostra estado próprio para coleira inexistente", async () => {
    getMock.mockRejectedValue(new ApiError(404, "Not Found"));
    renderizar();

    expect(await screen.findByText(/coleira não encontrada/i)).toBeVisible();
    expect(leituraMock).not.toHaveBeenCalled();
  });
});
