# Guia de Deploy Online no Render (Full-Stack KDP Book Engine)

Este projeto foi configurado com uma arquitetura **Full-Stack completa** pronta para o Render, combinando o frontend interativo (React + Vite) e o servidor backend Node.js (Express + TypeScript + APIs da Amazon e Agentes KDP) em uma única aplicação web de alta performance.

---

## Opção 1: Deploy com 1 Clique via Blueprint (Recomendado)

Como o arquivo [`render.yaml`](file:///c:/Users/User/Desktop/criador-de-livros/render.yaml) já está na raiz do seu repositório:

1. No seu painel do **Render** (`https://dashboard.render.com`), clique no botão **"+ New"** no canto superior direito.
2. Selecione **"Blueprint"**.
3. Conecte o repositório `https://github.com/leopalmeira/criador-de-livros.git`.
4. O Render detectará automaticamente o arquivo `render.yaml` com todas as configurações:
   - **Nome:** `criador-de-livros`
   - **Ambiente:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check:** `/api/health`
5. Clique em **"Apply"** e aguarde o build ser concluído.

---

## Opção 2: Deploy Manual como Web Service

Se preferir criar diretamente pela tela de "Create a new Service" (que você já está aberta):

1. Clique na opção **"Web Services"** (a segunda opção da primeira linha: *Dynamic web app. Ideal for full-stack apps, API servers, and mobile backends*).
2. Conecte sua conta do GitHub e selecione o repositório `criador-de-livros` (ou cole `https://github.com/leopalmeira/criador-de-livros.git`).
3. Preencha as configurações:
   - **Name:** `criador-de-livros`
   - **Region:** *Oregon (US West)* ou *Frankfurt (EU)*
   - **Branch:** `main`
   - **Root Directory:** *(deixe em branco para usar a raiz)*
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
4. Em **Environment Variables (Opcional)**:
   - `NODE_ENV` = `production`
   - `GEMINI_API_KEY` = `(sua chave do Google AI Studio Gemini)`
5. Clique em **"Create Web Service"**.

---

## O que está incluso no Servidor Online:

- **Frontend SPA**: Carregamento instantâneo do estúdio, navegação nas 12 etapas, modal de geração completa com IA e painel de oportunidades.
- **Backend Node.js Express**:
  - `GET /api/health` — Verificação de saúde e liveness do Render.
  - `GET /api/amazon/search` — Scraping e busca de livros em tempo real na Amazon Books.
  - `GET /api/amazon/suggestions` — Sugestões oficiais da barra de busca da Amazon.
  - `POST /api/covers/generate` — Motor de capas no backend com Gemini & Imagen 3.
  - `GET /api/covers/:projectId/:fileName` — Entrega de imagens geradas em alta resolução.
  - `POST /api/kdp-agents` — Agentes especializados de SEO, copy, título e outline.

---

## Sincronização Contínua (CI/CD Automático)

Sempre que fizermos um commit e envio para a branch `main` do GitHub:
```bash
git push origin main
```
O Render detectará a alteração e fará o build e deploy automaticamente em tempo real sem que você precise fazer nada!
