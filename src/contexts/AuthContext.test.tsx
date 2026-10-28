import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "../hooks/useAuth";
import { API_COLD_START_TIMEOUT_MS, ApiError } from "../services/api";

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
    expect(profileMock).toHaveBeenCalledWith("jwt-saved", expect.anything());
    expect(result.current.loading).toBe(false);
  });

  it("refreshUser reconsulta o perfil e atualiza o usuário exibido", async () => {
    loginMock.mockResolvedValue({ access_token: "jwt-1", user: vetUser });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("vet@petcard.com", "senha123");
    });

    const vetAtualizado = { ...vetUser, nome: "Dra. Camila Ferreira" };
    profileMock.mockResolvedValue(vetAtualizado);

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(profileMock).toHaveBeenCalledWith("jwt-1");
    expect(result.current.user).toEqual(vetAtualizado);
    // Token não deve ser afetado por uma simples atualização de perfil.
    expect(result.current.token).toBe("jwt-1");
  });

  it("refreshUser não chama a API sem token (deslogado)", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(profileMock).not.toHaveBeenCalled();
  });

  it("descarta o token salvo quando a API responde 401 (token inválido)", async () => {
    localStorage.setItem(TOKEN_KEY, "jwt-stale");
    profileMock.mockRejectedValue(new ApiError(401, "Unauthorized"));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.token).toBeNull());
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  /**
   * O cold start do Render passa de 10s. Tratar timeout ou queda de rede como
   * "token inválido" deslogava o vet toda vez que a API estava dormindo.
   */
  it.each([
    ["timeout", new ApiError(0, "Timeout")],
    ["erro de rede", new TypeError("Failed to fetch")],
    ["erro 500", new ApiError(500, "Internal Server Error")],
  ])("mantém o token salvo em %s", async (_caso, erro) => {
    localStorage.setItem(TOKEN_KEY, "jwt-saved");
    profileMock.mockRejectedValue(erro);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.semConexao).toBe(true));
    expect(localStorage.getItem(TOKEN_KEY)).toBe("jwt-saved");
    expect(result.current.token).toBe("jwt-saved");
    expect(result.current.loading).toBe(false);
  });

  it("a validação inicial espera o cold start da API", async () => {
    localStorage.setItem(TOKEN_KEY, "jwt-saved");
    profileMock.mockResolvedValue(vetUser);

    renderHook(() => useAuth(), { wrapper });

    await waitFor(() =>
      expect(profileMock).toHaveBeenCalledWith("jwt-saved", {
        timeoutMs: API_COLD_START_TIMEOUT_MS,
      }),
    );
  });

  it("tentarReconectar recupera a sessão quando a API acorda", async () => {
    localStorage.setItem(TOKEN_KEY, "jwt-saved");
    profileMock.mockRejectedValueOnce(new ApiError(0, "Timeout"));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.semConexao).toBe(true));

    profileMock.mockResolvedValue(vetUser);
    act(() => result.current.tentarReconectar());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.user).toEqual(vetUser));
    expect(result.current.semConexao).toBe(false);
    expect(result.current.loading).toBe(false);
  });
});
