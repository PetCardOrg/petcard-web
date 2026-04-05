# 🐾 PetCard Web

[![CI](https://github.com/PetCardOrg/petcard-web/actions/workflows/ci.yml/badge.svg)](https://github.com/PetCardOrg/petcard-web/actions)
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
| Autenticação | Auth0 (OAuth 2.0)            |
| i18n         | i18next (pt-BR / en-US)      |

## Pré-requisitos

- Node.js >= 20 LTS
- npm >= 10
- Backend (petcard-api) rodando em http://localhost:3000

## Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/PetCardOrg/petcard-web.git
cd petcard-web

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com a URL da API e credenciais Auth0

# 4. Inicie o servidor de desenvolvimento
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

- Login do veterinário via Auth0
- Dashboard com lista de pets atendidos
- Perfil do pet com histórico completo de saúde
- Formulário de nota clínica (escrita reversa)
- Scanner de QR Code para acesso rápido à carteira
- Página pública da carteira digital
- Suporte a português e inglês

## Contribuição

Leia o [CONTRIBUTING.md](https://github.com/PetCardOrg/petcard-docs/blob/main/CONTRIBUTING.md) no repositório petcard-docs.
