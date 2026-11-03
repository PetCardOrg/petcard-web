import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { VetRegisterRequest, VetUser } from "../services/auth.service";
import {
  loginVeterinario,
  registerVeterinario,
  getVeterinarioProfile,
} from "../services/auth.service";
import { API_COLD_START_TIMEOUT_MS, ApiError } from "../services/api";
import { AuthContext } from "./auth-context";

const TOKEN_KEY = "petcard-vet-token";

interface AuthState {
  token: string | null;
  user: VetUser | null;
  loading: boolean;
  semConexao: boolean;
}

function getInitialState(): AuthState {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) {
    return { token: null, user: null, loading: false, semConexao: false };
  }
  return { token: stored, user: null, loading: true, semConexao: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(getInitialState);

  // Valida o token salvo. Só um 401 diz que ele não vale: timeout, queda de
  // rede e 5xx são a API dormindo ou fora do ar, e descartar o token nesses
  // casos deslogava o vet a cada cold start do Render.
  const validarTokenSalvo = useCallback((token: string) => {
    getVeterinarioProfile(token, { timeoutMs: API_COLD_START_TIMEOUT_MS })
      .then((user) =>
        setState((prev) => ({
          ...prev,
          user,
          loading: false,
          semConexao: false,
        })),
      )
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          setState({
            token: null,
            user: null,
            loading: false,
            semConexao: false,
          });
          return;
        }
        setState((prev) => ({ ...prev, loading: false, semConexao: true }));
      });
  }, []);

  useEffect(() => {
    if (!state.token || state.user) {
      return;
    }
    validarTokenSalvo(state.token);
  }, [state.token, state.user, validarTokenSalvo]);

  const tentarReconectar = useCallback(() => {
    if (!state.token) return;
    setState((prev) => ({ ...prev, loading: true, semConexao: false }));
    validarTokenSalvo(state.token);
  }, [state.token, validarTokenSalvo]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginVeterinario({ email, password });
    localStorage.setItem(TOKEN_KEY, response.access_token);
    setState({
      token: response.access_token,
      user: response.user,
      loading: false,
      semConexao: false,
    });
  }, []);

  const register = useCallback(async (dto: VetRegisterRequest) => {
    const response = await registerVeterinario(dto);
    localStorage.setItem(TOKEN_KEY, response.access_token);
    setState({
      token: response.access_token,
      user: response.user,
      loading: false,
      semConexao: false,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ token: null, user: null, loading: false, semConexao: false });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!state.token) return;
    const user = await getVeterinarioProfile(state.token);
    setState((prev) => ({ ...prev, user }));
  }, [state.token]);

  const value = useMemo(
    () => ({
      ...state,
      login,
      register,
      logout,
      refreshUser,
      tentarReconectar,
    }),
    [state, login, register, logout, refreshUser, tentarReconectar],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
