# petcard-web — Contexto para Claude Code

> **Plano da M7 (cross-repo, ordem das issues) vive na raiz: `../CLAUDE.md`.** Aqui só as convenções da web.

## O que é

SPA da **área do veterinário** do PetCard. Vite + React 19 + TypeScript. Consome a `petcard-api`. Entregue em M5 (auth do vet + rotas protegidas).

## Stack

- **Vite + React 19 + TypeScript**, `react-router-dom` v7.
- **HTTP:** `apiFetch` próprio em `src/services/api.ts` — não usar `fetch`/axios direto. `VITE_API_URL` aponta pra API (default `http://localhost:3000`).
- **Auth:** token em `localStorage` + React Context (`src/contexts`) + `ProtectedRoute`. Sem refresh token (igual à api).
- **i18n:** `i18next` + `react-i18next`, pt-BR + en-US (`src/i18n`). Strings novas entram nos dois idiomas.
- **DTOs:** `@petcardorg/shared` — não duplicar tipos localmente. Resolver o pacote exige `NODE_AUTH_TOKEN` (PAT `read:packages`).
- **QR:** `html5-qrcode`. **Ícones:** `react-icons`.
- **Estrutura:** `src/{components,contexts,hooks,i18n,pages,services,test}`.

## Testes & cobertura

- **Vitest + Testing Library** (`@testing-library/react` + `jest-dom` + `user-event`), ambiente jsdom. Helpers em `src/test`.
- Comandos: `npm test` (run), `npm run test:watch`, `npm run test:cov`.
- **Cobertura de confiança, não percentual (ADR-006).** Antes de escrever um `it()`: _se quebrar, uma regra de negócio quebrou ou o usuário foi impactado?_ Se não, não escrever — sem teste para service que só monta `fetch` nem para componente visual estático.
- **Catraca (`vitest.config.ts`): statements 84 · branches 80 · functions 73 · lines 84 — freio de regressão, não meta.** Não abaixar sem ADR; também não inventar teste para subir.

## Convenções

- **Lint/format no commit** (husky + lint-staged): `eslint --fix` em `*.{ts,tsx}`, `prettier --write` em `*.{ts,tsx,json,css,md}`.
- `npm run build` = `tsc -b && vite build` — precisa passar type-check.
- CI em `.github/workflows/ci.yml`. **CI verde é o DoD.**
- Git flow, commits e regras cross-repo: ver `../CLAUDE.md`. PR mira `develop`.

## M7 nesta repo

- **web#34** (Fase 1, grupo C): remover QR da tela do vet; vet escreve observações que aparecem no app do tutor. Épico cross-repo — precisa de endpoint de observações na api. Ver ordem completa em `../CLAUDE.md`.
- Deploy Vercel é parte da PC-105; screenshots/README é PC-096.
