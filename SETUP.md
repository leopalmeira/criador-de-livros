# BOOKINTEL PRO — Guia de Instalação e Configuração (SETUP.md)

Este documento orienta a instalação, configuração dos provedores de IA e execução do ecossistema **BookIntel Pro / AI Book Creator**.

---

## 1. Requisitos do Sistema

- **Node.js**: v20.19.0+ ou v22.12.0+
- **NPM**: v9.0.0 ou superior
- **Navegador**: Google Chrome, Brave, Edge ou qualquer navegador baseado em Chromium com suporte a Manifest V3.
- **Hardware (opcional para IA Local)**:
  - IA 100% Local via Ollama: GPU recomendada (ex: NVIDIA RTX 3050+) ou CPU moderna com 16GB+ RAM.
  - Modo Built-in: Roda em qualquer máquina sem dependência de GPU ou internet.

---

## 2. Instalação Passo a Passo

### Passo 1: Instalar Dependências do Projeto
Na raiz do projeto (`c:\Users\User\Desktop\criador-de-livros`), execute:

```bash
npm install
```

### Passo 2: Compilar os Pacotes da Extensão
O projeto utiliza um pipeline duplo de compilação via Vite:
1. `build:main`: Constrói a Dashboard completa (Studio Editorial), Popup de controle e Service Worker (background).
2. `build:content`: Constrói o Content Script injetado nas páginas da Amazon com o analisador de BSR, vendas semanais/mensais e moldura de produto.

Para compilar tudo:
```bash
npm run build
```
Os artefatos finais serão gerados no diretório `dist/`.

### Passo 3: Carregar a Extensão no Navegador
1. Abra o Google Chrome e navegue até:
   ```
   chrome://extensions/
   ```
2. Ative a chave **"Modo do desenvolvedor"** no canto superior direito.
3. Clique no botão **"Carregar sem compactação"** (Load unpacked).
4. Selecione a pasta `dist/` gerada na raiz do projeto (`c:\Users\User\Desktop\criador-de-livros\dist`).
5. A extensão **BookIntel Pro — AI Book Creator** estará ativa imediatamente.

---

## 3. Configuração dos provedores de IA

Configure provedor, modelo e chave na tela **Configurações** da extensão. Não coloque chaves privadas em arquivos `.env` usados pelo Vite: valores incorporados ao bundle podem ser extraídos da extensão distribuída. Para usar Ollama, inicie o serviço local e selecione o modelo instalado. Solicitações para provedores em nuvem enviam o conteúdo do prompt ao serviço correspondente.

---

## 4. Como Executar os Testes

O projeto conta com uma suíte de testes automatizados cobrindo a extração de dados da Amazon, estimadores de BSR, geração ponta a ponta e motor editorial:

```bash
npm test
```

---

## 5. Como Adicionar Novos Tipos de Livro

1. Abra o arquivo [`src/types/book-project.ts`](file:///c:/Users/User/Desktop/criador-de-livros/src/types/book-project.ts).
2. Adicione a chave no tipo `BookType`:
   ```typescript
   export type BookType = 'self-help' | 'business' | 'seu-novo-tipo' | ...;
   ```
3. Registre as diretrizes editoriais no dicionário `BOOK_TYPE_CONFIGS`:
   ```typescript
   'seu-novo-tipo': {
     id: 'seu-novo-tipo',
     label: 'Seu Novo Tipo Editorial',
     category: 'Não-Ficção',
     trimSize: '6x9',
     paperType: 'bw-white',
     targetPages: 180,
     chapterCount: [8, 14],
     wordsPerChapter: [2000, 3500],
     hasCharacters: false,
     hasFactCheck: true,
     editorialRules: ['Clareza', 'Profundidade']
   }
   ```
4. Recompile o projeto com `npm run build`.
