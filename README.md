# BookIntel & KDP Studio • Plataforma Profissional de Inteligência e Criação de Livros KDP

O **BookIntel & KDP Studio** é uma extensão Chromium (Manifest V3) e uma plataforma web para pesquisa de livros na Amazon e organização de projetos editoriais voltados ao **Kindle Direct Publishing (KDP)**. Na plataforma web, cada cliente usa uma conta individual; projetos, livros finalizados, arquivos PDF e revisões editoriais são associados à conta no PostgreSQL. A extensão Chromium continua usando os dados locais do navegador.

O aplicativo reúne estimativas de mercado, projetos editoriais, ferramentas de capa e exportação. Estimativas não são dados oficiais da Amazon, conteúdo gerado por IA requer revisão e os arquivos exportados devem ser conferidos no Previewer do KDP antes de qualquer publicação.

### Contas individuais da plataforma web

O servidor usa PostgreSQL por meio de `DATABASE_URL`. Para implantação no Render, crie ou selecione um banco PostgreSQL e configure `DATABASE_URL` no serviço web com a URL interna do banco. O Blueprint não provisiona um banco automaticamente nem escolhe um plano com custo. As tabelas de contas, sessões, projetos, livros finalizados e trabalhos editoriais são criadas pelo servidor quando usadas. Senhas são armazenadas com hash scrypt; sessões usam cookie `HttpOnly`, e os registros editoriais são isolados pelo identificador da conta autenticada. Chaves de provedores de IA permanecem nas configurações locais do navegador, separadas por conta. Projetos antigos que ainda não tinham proprietário não são atribuídos automaticamente a uma conta; continuam preservados no armazenamento local até serem importados explicitamente.

---

## 🚀 Principais Módulos

### 1. Estúdio editorial
- **Fluxo por etapas**: Ajuda a organizar uma ideia em conceito, estrutura, capítulos, metadados e exportações. O resultado precisa de revisão editorial e validação técnica antes de ser publicado.
- **10 Agentes Especializados de IA**:
  1. *Idea Analyst*: Mapeamento de nicho, tamanho e formato.
  2. *Concept Agent*: Proposta de valor e seleção de 3 a 5 opções de títulos.
  3. *Outline Architect*: Estrutura capitular com objetivos pedagógicos e metas de palavras.
  4. *Book Bible*: Memória canônica (personagens/regras para ficção; conceitos/fontes para não-ficção).
  5. *Chapter Writer*: Escrita contextual com base na Bíblia e capítulos anteriores.
  6. *Continuity Auditor*: Detecção automática de inconsistências temporais, físicas ou conceituais.
  7. *Editor & Style*: Revisão de ritmo, concisão, clareza e eliminação de clichês.
  8. *Cover Geometry*: Cálculo paramétrico da lombada KDP (`páginas × espessura + sangria`).
  9. *Metadata & SEO*: Descrição comercial persuasiva em HTML e 7 palavras-chave oficiais.
  10. *Quality Gate*: Checklist editorial básico; não substitui os validadores oficiais nem garante aprovação do KDP.
- **Editor de 3 Colunas**: Navegação estrutural à esquerda, editor Markdown no centro e assistente de IA com versionamento e restauração à direita.
- **Retomada de Projetos**: Projetos da plataforma web são sincronizados com a conta no PostgreSQL e mantidos também no IndexedDB como cache local; projetos interrompidos podem ser continuados em outros dispositivos.
- **Controle de Custos e Tokens**: Exibição transparente de tokens consumidos, chamadas realizadas e custo estimado em R$ (BRL) e $ (USD).
- **Provedores de IA Desacoplados**: Suporte para Ollama (100% local, offline e gratuito), OpenAI (GPT-4o/mini), Anthropic (Claude 3.5 Sonnet) e OpenRouter.

### 2. Format Engine (Compilação e Pacote KDP)
- **EPUB 3 Validado**: Geração estruturada com sumário interativo (`toc.ncx` e `nav.xhtml`) e folha de estilos limpa.
- **PDF Interior Diagramado**: Páginas numeradas, cabeçalhos alternados e cálculo automático de margem interna (*Gutter*).
- **PDF Capa Full-Wrap**: Arquivo aberto contendo Contracapa + Lombada Paramétrica + Capa Frontal + Sangria de 0.125".
- **Exportação do Pacote KDP (.ZIP)**: Criação instantânea da pasta padronizada:
  ```
  [NOME-DO-LIVRO]-KDP/
  ├── ebook/ ([slug].epub)
  ├── paperback/ (interior.pdf & cover-full-wrap.pdf)
  ├── manuscript/ (.pdf, .md, .html)
  ├── cover/ (full-wrap.pdf & cover-prompts.txt)
  ├── metadata/ (metadata.json, description.txt, keywords.txt, categories.txt)
  └── validation/ (quality-report.html)
  ```

### 3. Inteligência de Mercado e Análise da Amazon (Todas as 22 Lojas Globais)
- Cobertura global: `amazon.com.br`, `amazon.com`, `amazon.co.uk`, `amazon.de`, `amazon.fr`, `amazon.es`, `amazon.it`, `amazon.ca`, `amazon.co.jp`, `amazon.com.mx`, `amazon.in`, `amazon.com.au`, `amazon.nl`, `amazon.pl`, `amazon.se`, `amazon.com.be`, `amazon.ae`, `amazon.sa`, `amazon.sg`, `amazon.eg`, `amazon.com.tr`, `amazon.co.za`.
- **Estimate Box TOTVS**: Box compacto injetado diretamente nos cards de busca sem poluição visual ou cascatas infinitas.
- **Cálculo de BSR em Vendas e Faturamento**: Converte o ranking de vendas em média diária/mensal e royalties líquidos estimados (Kindle 70%/35% e Capa Comum).
- **Barra de Nicho**: Visão panorâmica da primeira página com nível de concorrência, concentração de vendas nos Top 3/5/10 e exportação em CSV.

---

## 📂 Documentação do Projeto

| Documento | Descrição |
| :--- | :--- |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Arquitetura técnica da extensão, camadas, runtime e segurança |
| **[AI_AGENTS.md](AI_AGENTS.md)** | Especificação dos 10 agentes de IA, prompts e contratos de dados |
| **[BOOK_PIPELINE.md](BOOK_PIPELINE.md)** | Fluxo editorial detalhado, persistência de estado e retomada |
| **[KDP_PIPELINE.md](KDP_PIPELINE.md)** | Normas técnicas KDP, margens, cálculo de lombada e formatos |
| **[ENVIRONMENT.md](ENVIRONMENT.md)** | Configuração de APIs, Ollama local e compilação da extensão |
| **[DATABASE.md](DATABASE.md)** | Modelagem de dados, IndexedDB, versionamento e retenção de custos |
| **[TESTING.md](TESTING.md)** | Guia da suíte de 24 testes automatizados e validação KDP |

---

## 🛠️ Instalação Rápida no Google Chrome

1. Clone o repositório ou acesse a pasta do projeto:
   ```bash
   cd c:\Users\User\Desktop\criador-de-livros
   ```
2. Instale as dependências e compile:
   ```bash
   npm install
   npm run build
   ```
3. No Google Chrome, abra `chrome://extensions/`;
4. Ative a opção **"Modo do desenvolvedor"** no canto superior direito;
5. Clique em **"Carregar sem compactação"** e selecione a pasta **`dist`** gerada.

---

## 🧪 Testes Automatizados

O projeto inclui uma suíte completa de **24 testes unitários e de ponta a ponta**:

```bash
# Executar toda a suíte de testes
npm test

# Executar o teste E2E do livro completo KDP (Item 47)
npx vitest run tests/e2e-book-generator.test.ts
```

---

## ⚖️ Conformidade e Isenção de Responsabilidade
O sistema organiza, gera e formata os arquivos de acordo com os padrões técnicos do **Amazon Kindle Direct Publishing**. A responsabilidade editorial final, revisão ortográfica, conferência de direitos autorais e submissão na conta KDP é estritamente do autor/usuário.
