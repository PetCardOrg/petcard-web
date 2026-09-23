import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Config dedicada do Vitest (fora do `tsc -b`, que cobre apenas o vite.config.ts)
// para isolar a tipagem do test runner do build de produção.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Fuso do usuário, não o UTC do CI: data de calendário lida como instante
    // volta um dia só em fuso negativo, e em UTC o bug passa despercebido.
    // TZ: fuso do usuário, não o UTC do CI — data de calendário lida como
    // instante volta um dia só em fuso negativo, e em UTC o bug passaria.
    //
    // VITE_API_URL fixo: sem isto a suíte lê o .env do desenvolvedor, e quem
    // apontasse a API para outro lugar (um proxy, um túnel) via os testes de
    // service quebrarem por um motivo que nada tem a ver com o código.
    env: {
      TZ: "America/Sao_Paulo",
      VITE_API_URL: "http://localhost:3000",
    },
    setupFiles: "./src/test/setup.ts",
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/i18n/**",
        "src/test/**",
        "src/**/*.test.{ts,tsx}",
      ],
      thresholds: {
        statements: 84,
        branches: 80,
        functions: 73,
        lines: 84,
      },
    },
  },
});
