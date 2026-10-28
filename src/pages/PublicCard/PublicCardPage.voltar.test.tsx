import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PublicCardPage } from "./PublicCardPage";
import { adicionarPetAtendido } from "../../services/dashboard.service";

/**
 * Histórico de verdade, sem mock do router: o que está sob teste é a pilha de
 * entradas que o Voltar do navegador percorre. A suíte principal mocka o
 * `useNavigate` e não enxerga isso.
 */

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ token: "jwt-vet", user: null }),
}));

vi.mock("../../services/card.service", () => ({
  getPublicCard: vi.fn().mockResolvedValue({
    pet_id: "p1",
    pet_name: "Rex",
    species: "DOG",
    sex: "MALE",
    breed: "Labrador",
    weight: 20,
    birth_date: "2023-05-01",
    photo_url: null,
    qr_code_url: null,
    tutor_name: "Alice Tutora",
    vaccines: [],
    dewormings: [],
    medications: [],
  }),
}));

vi.mock("../../services/dashboard.service", () => ({
  adicionarPetAtendido: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../services/crmv.service", () => ({
  verificarCrmv: vi.fn(),
  corrigirMeuCrmv: vi.fn(),
}));

/** O Voltar do navegador e a barra de endereço, para o teste usar e ler. */
function Navegador() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <>
      <button type="button" onClick={() => void navigate(-1)}>
        Voltar do navegador
      </button>
      <output aria-label="endereço">{pathname}</output>
    </>
  );
}

describe("PublicCardPage — botão Voltar", () => {
  it("depois de QR → login → prontuário, Voltar não devolve o vet ao prontuário", async () => {
    // Como o histórico fica depois do login: a carteira lida no QR e, no
    // lugar do login (que navega com `replace`), a carteira com `acessoVet`.
    render(
      <MemoryRouter
        initialEntries={[
          "/card/tok-123",
          { pathname: "/card/tok-123", state: { acessoVet: true } },
        ]}
        initialIndex={1}
      >
        <Routes>
          <Route path="/card/:token" element={<PublicCardPage />} />
          <Route path="/vet/pets/:id" element={<div>Prontuário</div>} />
        </Routes>
        <Navegador />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Prontuário")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Voltar do navegador" }),
    );

    // Volta para a carteira e fica nela. Antes, a entrada com `acessoVet`
    // reabria o prontuário sozinha e o Voltar não saía do lugar. A carteira
    // chega a aparecer nesse caso, então é preciso esperar o auto-ingresso
    // (se houver) terminar antes de conferir.
    expect(await screen.findByText("Rex")).toBeInTheDocument();
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(vi.mocked(adicionarPetAtendido)).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("endereço")).toHaveTextContent(
      "/card/tok-123",
    );
    expect(screen.queryByText("Prontuário")).not.toBeInTheDocument();
  });
});
