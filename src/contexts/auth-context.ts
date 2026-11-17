import { createContext } from "react";
import type {
  CreateVeterinarioDto,
  VeterinarioSessionUserDto,
} from "@petcardorg/shared";

interface AuthState {
  token: string | null;
  user: VeterinarioSessionUserDto | null;
  loading: boolean;
  /**
   * Há token salvo, mas a API não respondeu à validação (dormindo, fora do ar,
   * erro 5xx). O token não é descartado: só um 401 diz que ele não vale.
   */
  semConexao: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  /**
   * Cadastra e já autentica.
   *
   * A situação do CRMV não sai daqui: quem precisa dela consulta
   * `GET /veterinarios/me/crmv`, que continua valendo depois do cadastro.
   */
  register: (dto: CreateVeterinarioDto) => Promise<void>;
  logout: () => void;
  /** Reconsulta `GET /auth/veterinario/profile` para atualizar nome/foto exibidos. */
  refreshUser: () => Promise<void>;
  /** Refaz a validação do token salvo depois de `semConexao`. */
  tentarReconectar: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
