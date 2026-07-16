# 🐾 PetCard Web

[![CI](https://github.com/PetCardOrg/petcard-web/actions/workflows/ci.yml/badge.svg)](https://github.com/PetCardOrg/petcard-web/actions)
[![Coverage](.github/badges/coverage.svg)](https://github.com/PetCardOrg/petcard-web/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Painel web do veterinário no ecossistema PetCard. Interface construída com React.js e Vite para gerenciamento de pacientes, notas clínicas e acesso à carteira digital de saúde pet.

**Projeto de TCC** — Ciência da Computação (2026)

## Ecossistema PetCard

Este repositório faz parte de um conjunto de 5 repos:

| Repositório                                                    | Descrição                          |
| -------------------------------------------------------------- | ---------------------------------- |
| [petcard-api](https://github.com/PetCardOrg/petcard-api)       | Backend NestJS                     |
| **petcard-web**                                                | ← Você está aqui                   |
| [petcard-mobile](https://github.com/PetCardOrg/petcard-mobile) | App do Tutor (React Native / Expo) |
| [petcard-shared](https://github.com/PetCardOrg/petcard-shared) | DTOs e tipos compartilhados        |
| [petcard-docs](https://github.com/PetCardOrg/petcard-docs)     | Documentação e gestão do projeto   |

## Stack

| Camada       | Tecnologia                   |
| ------------ | ---------------------------- |
| Framework    | React.js 19 + Vite 6         |
| Linguagem    | TypeScript 5.x (strict mode) |
| Roteamento   | React Router DOM             |
| HTTP Client  | Axios                        |
| Autenticação | JWT próprio (HS256)          |
| i18n         | i18next (pt-BR / en-US)      |

## Pré-requisitos

- Node.js >= 20 LTS
- npm >= 10
- Backend (petcard-api) rodando em http://localhost:3000
- GitHub Personal Access Token com escopo `read:packages` (para baixar `@petcardorg/shared` do GitHub Packages)

## Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/PetCardOrg/petcard-web.git
cd petcard-web

# 2. Autentique no GitHub Packages (necessário para @petcardorg/shared)
# Crie um token em https://github.com/settings/tokens com escopo read:packages
export NODE_AUTH_TOKEN=<seu_personal_access_token>

# 3. Instale as dependências
npm install

# 4. Configure as variáveis de ambiente
cp .env.example .env
# Ajuste VITE_API_URL se a API não estiver em http://localhost:3000

# 5. Inicie o servidor de desenvolvimento
npm run dev
# Aplicação disponível em http://localhost:5173
```

## Scripts

| Comando           | Descrição                      |
| ----------------- | ------------------------------ |
| `npm run dev`     | Inicia em modo desenvolvimento |
| `npm run build`   | Build de produção              |
| `npm run preview` | Preview do build de produção   |
| `npm run lint`    | Executa ESLint                 |

## Funcionalidades

- Login do veterinário via JWT próprio
- Dashboard com lista de pets atendidos
- Perfil do pet com histórico completo de saúde
- Formulário de nota clínica (escrita reversa)
- Scanner de QR Code para acesso rápido à carteira
- Página pública da carteira digital
- Suporte a português e inglês

## Contribuição

Leia o [CONTRIBUTING.md](https://github.com/PetCardOrg/petcard-docs/blob/main/CONTRIBUTING.md) no repositório petcard-docs.
