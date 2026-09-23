/**
 * Estado que o veterinário carrega ao ser mandado para o login ou o cadastro.
 *
 * `acessoVet` é o que faz a carteira pública retomar sozinha o acesso depois
 * de autenticar. Perder essa marca no caminho não quebra nada visivelmente —
 * só obriga o vet a clicar em "Sou veterinário" uma segunda vez.
 */
export interface VetAuthRedirectState {
  redirectTo?: string;
  acessoVet?: boolean;
}

export function lerRedirecionamentoVet(state: unknown): VetAuthRedirectState {
  return (state as VetAuthRedirectState | null) ?? {};
}
