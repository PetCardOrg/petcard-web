import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";
import { AuthContext } from "../../contexts/auth-context";
import type { AuthContextValue } from "../../contexts/auth-context";

function renderWithAuth(auth: Partial<AuthContextValue>) {
  const value: AuthContextValue = {
    token: null,
    user: null,
    loading: false,
    login: async () => {},
    register: async () => {},
    logout: () => {},
    refreshUser: async () => {},
    semConexao: false,
    tentarReconectar: () => {},
    ...auth,
  };

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
  }

  return render(
    <MemoryRouter initialEntries={["/protegido"]}>
      <Wrapper>
        <Routes>
          <Route
            path="/protegido"
            element={
              <ProtectedRoute>
                <div>Conteúdo protegido</div>
              </ProtectedRoute>
            }
          />
          <Route path="/vet/login" element={<div>Tela de login</div>} />
        </Routes>
      </Wrapper>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("renderiza os filhos quando há token", () => {
    renderWithAuth({ token: "jwt" });
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });

  it("redireciona para /vet/login quando não há token", () => {
    renderWithAuth({ token: null });
    expect(screen.getByText("Tela de login")).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
  });

  it("não renderiza nada enquanto carrega (evita flash de redirect)", () => {
    renderWithAuth({ token: "jwt", loading: true });
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
    expect(screen.queryByText("Tela de login")).not.toBeInTheDocument();
  });

  // Token guardado e API fora do ar: nem conteúdo (sem usuário), nem tela de
  // login (o token ainda vale). O vet escolhe quando tentar de novo.
  it("oferece tentar de novo quando a API não respondeu à validação", async () => {
    const tentarReconectar = vi.fn();
    renderWithAuth({ token: "jwt", semConexao: true, tentarReconectar });

    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
    expect(screen.queryByText("Tela de login")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /tentar de novo/i }),
    );
    expect(tentarReconectar).toHaveBeenCalledTimes(1);
  });
});
