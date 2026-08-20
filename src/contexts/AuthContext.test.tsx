import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "../hooks/useAuth";

vi.mock("../services/auth.service", () => ({
  loginVeterinario: vi.fn(),
  registerVeterinario: vi.fn(),
  getVeterinarioProfile: vi.fn(),
}));

import {
  getVeterinarioProfile,
  loginVeterinario,
  registerVeterinario,
} from "../services/auth.service";

const loginMock = vi.mocked(loginVeterinario);
const registerMock = vi.mocked(registerVeterinario);
const profileMock = vi.mocked(getVeterinarioProfile);

const TOKEN_KEY = "petcard-vet-token";
const vetUser = {
  id: "v1",
  nome: "Dra. Camila",
  email: "vet@petcard.com",
  crmv: "CRMV-CE-1234",
  role: "VET",
};

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthProvider / useAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    loginMock.mockReset();
    registerMock.mockReset();
    profileMock.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("inicia deslogado quando não há token salvo", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(profileMock).not.toHaveBeenCalled();
  });

  it("login persiste o token e popula o usuário", async () => {
    loginMock.mockResolvedValue({ access_token: "jwt-1", user: vetUser });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("vet@petcard.com", "senha123");
    });

    expect(loginMock).toHaveBeenCalledWith({
      email: "vet@petcard.com",
      password: "senha123",
    });
    expect(localStorage.getItem(TOKEN_KEY)).toBe("jwt-1");
    expect(result.current.token).toBe("jwt-1");
    expect(result.current.user).toEqual(vetUser);
  });

  it("register já deixa o vet autenticado, mesmo sem o CRMV verificado", async () => {
    registerMock.mockResolvedValue({
      access_token: "jwt-novo",
      user: vetUser,
      crmv_verificado: false,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.register({
        nome: "Dra. Camila",
        email: "vet@petcard.com",
        password: "senha123",
        crmv: "CRMV-CE-1234",
      });
    });

    // Verificação pendente não barra a entrada: o aviso acionável aparece
    // no destino (api#113).
    expect(localStorage.getItem(TOKEN_KEY)).toBe("jwt-novo");
    expect(result.current.user).toEqual(vetUser);
  });

  it("logout limpa token e usuário do estado e do storage", async () => {
    loginMock.mockResolvedValue({ access_token: "jwt-1", user: vetUser });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("vet@petcard.com", "senha123");
    });
    act(() => result.current.logout());

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it("reidrata o perfil a partir do token salvo no storage", async () => {
    localStorage.setItem(TOKEN_KEY, "jwt-saved");
    profileMock.mockResolvedValue(vetUser);

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.user).toEqual(vetUser));
    expect(profileMock).toHaveBeenCalledWith("jwt-saved");
    expect(result.current.loading).toBe(false);
  });

  it("descarta o token salvo quando o perfil falha (token inválido)", async () => {
    localStorage.setItem(TOKEN_KEY, "jwt-stale");
    profileMock.mockRejectedValue(new Error("401"));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.token).toBeNull());
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
