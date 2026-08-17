import { createContext } from "react";
import type { VetRegisterRequest, VetUser } from "../services/auth.service";

interface AuthState {
  token: string | null;
  user: VetUser | null;
  loading: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  /** Cadastra e já autentica. Devolve se o CRMV saiu verificado da consulta. */
  register: (dto: VetRegisterRequest) => Promise<boolean>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
