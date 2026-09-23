import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    /**
     * Proxy da API sob o mesmo origin da página.
     *
     * Existe para o teste do QR pelo celular: a página precisa sair por HTTPS
     * (a geolocalização é bloqueada fora de contexto seguro), e uma página
     * HTTPS não pode chamar `http://localhost:3000` — o navegador barra por
     * mixed content. Servindo a API sob `/api` do próprio Vite, basta um túnel
     * e o CORS deixa de existir, porque passa a ser mesma origem.
     *
     * Só vale em desenvolvimento: `vite build` não gera servidor.
     */
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },

    /**
     * O Vite recusa Host desconhecido por proteção contra DNS rebinding, e o
     * domínio do túnel cairia nessa recusa. Liberamos os domínios dos túneis
     * usados no teste manual, em vez de `true`, que abriria para qualquer host.
     */
    allowedHosts: [
      ".ngrok-free.app",
      ".ngrok.io",
      ".ngrok.app",
      ".trycloudflare.com",
      ".loca.lt",
    ],
  },
});
