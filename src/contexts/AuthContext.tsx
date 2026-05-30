import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { VetUser } from "../services/auth.service";
import {
  loginVeterinario,
  getVeterinarioProfile,
} from "../services/auth.service";
import { AuthContext } from "./auth-context";

const TOKEN_KEY = "petcard-vet-token";

interface AuthState {
  token: string | null;
  user: VetUser | null;
  loading: boolean;
}

function getInitialState(): AuthState {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) {
    return { token: null, user: null, loading: false };
  }
  return { token: stored, user: null, loading: true };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(getInitialState);

  useEffect(() => {
    if (!state.token || state.user) {
      return;
    }

    getVeterinarioProfile(state.token)
      .then((user) => setState((prev) => ({ ...prev, user, loading: false })))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setState({ token: null, user: null, loading: false });
      });
  }, [state.token, state.user]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginVeterinario({ email, password });
    localStorage.setItem(TOKEN_KEY, response.access_token);
    setState({
      token: response.access_token,
      user: response.user,
      loading: false,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ token: null, user: null, loading: false });
  }, []);

  const value = useMemo(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
