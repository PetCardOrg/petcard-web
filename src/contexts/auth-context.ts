import { createContext } from "react";
import type { VetRegisterRequest, VetUser } from "../services/auth.service";

interface AuthState {
  token: string | null;
  user: VetUser | null;
  loading: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  /**
   * Cadastra e já autentica.
   *
   * A situação do CRMV não sai daqui: quem precisa dela consulta
   * `GET /veterinarios/me/crmv`, que continua valendo depois do cadastro.
   */
  register: (dto: VetRegisterRequest) => Promise<void>;
  logout: () => void;
  /** Reconsulta `GET /auth/veterinario/profile` para atualizar nome/foto exibidos. */
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
