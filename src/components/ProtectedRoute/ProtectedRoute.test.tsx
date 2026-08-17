import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";
import { AuthContext } from "../../contexts/auth-context";
import type { AuthContextValue } from "../../contexts/auth-context";

function renderWithAuth(auth: Partial<AuthContextValue>) {
  const value: AuthContextValue = {
    token: null,
    user: null,
    loading: false,
    login: async () => {},
    register: async () => true,
    logout: () => {},
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
});
