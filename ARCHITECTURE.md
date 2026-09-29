# Arquitetura do Sistema — BookIntel & KDP Book Engine

Este documento detalha a arquitetura de software da plataforma de inteligência de mercado e geração autônoma de livros estruturados para **Amazon KDP**.

---

## 1. Visão Geral da Arquitetura

O sistema opera através de uma arquitetura híbrida de alto desempenho composta por:
1. **Chrome Extension (Manifest V3)**:
   - **Content Script (`src/content/`)**: Injeta barras analíticas de nicho e boxes de estimativa financeira nos resultados de busca e páginas de produto da Amazon em todas as 22 lojas globais.
   - **Background Service Worker (`src/background/`)**: Gerencia mensageria assíncrona, fila de resolução BSR, sincronização em segundo plano e cache.
   - **Workstation Dashboard (`src/dashboard/`)**: Painel corporativo estilo TOTVS/ERP para gestão de nichos, histórico de livros e o estúdio completo de criação editorial com IA.
2. **Book Engine Modular (`src/services/kdp-pipeline.ts` & `src/services/formats/`)**:
   - Orquestrador de 10 agentes especializados que conduzem o livro de uma simples ideia até o pacote KDP (.ZIP) validado.
3. **Format Engine**:
   - Gerador de EPUB 3 em conformidade com o IDPF.
   - Compilador de PDF Interior com paginação, cabeçalhos e margens KDP.
   - Calculador e desenhador de PDF de Capa Completa (*Full-Wrap*) com lombada paramétrica.
   - Empacotador KDP com estrutura padronizada de diretórios.
4. **Provedores de IA Desacoplados (`src/services/ai-service.ts`)**:
   - Suporte unificado para **Ollama (Local)**, **OpenAI (GPT-4o / GPT-4o-mini)**, **Anthropic (Claude 3.5 Sonnet)**, **OpenRouter** e **Google Gemini**.

```
+-----------------------------------------------------------------------------------+
|                            AMAZON 22 MARKETPLACES                                 |
+-----------------------------------------------------------------------------------+
       ▲                                                              ▲
       │ Injeção DOM (Observer Seguro)                                │ Injeção DOM
+-------------------------+                                +------------------------+
|  BookIntel Niche Bar    |                                |  Estimate Box (TOTVS)  |
+-------------------------+                                +------------------------+
       ▲                                                              ▲
       └─────────────────────────────┬────────────────────────────────┘
                                     │
+-----------------------------------------------------------------------------------+
|                        CHROME EXTENSION RUNTIME (MV3)                             |
|  - Background Service Worker (Fila BSR, Cache IndexedDB, Mensageria)              |
+-----------------------------------------------------------------------------------+
                                     │
+-----------------------------------------------------------------------------------+
|                         TOTVS ENTERPRISE DASHBOARD                                |
|  [Nicho & BSR]  |  [Calculadora Royalties]  |  [KDP Book Studio (Item 1-48)]      |
+-----------------------------------------------------------------------------------+
                                     │
       ┌─────────────────────────────┴────────────────────────────┐
       ▼                                                          ▼
+-----------------------------+                           +-------------------------+
|     KDP AGENT PIPELINE      |                           |     FORMAT ENGINE       |
|  1. Concept & Title Agent   |                           |  - EpubBuilder (EPUB 3) |
|  2. Outline Agent           |                           |  - PdfBuilder (Interior)|
|  3. Book Bible Agent        |                           |  - PdfBuilder (FullWrap)|
|  4. Chapter Writer Agent    |                           |  - KdpPackager (ZIP)    |
|  5. Continuity Auditor      |                           +-------------------------+
|  6. Editor & Style Agent    |                                   │
|  7. Fact-Checker            |                                   ▼
|  8. Cover Geometry Agent    |                           +-------------------------+
|  9. Metadata & SEO Agent    |                           |  PACOTE KDP FINAL (.ZIP)|
|  10. Quality Gate Auditor   |                           +-------------------------+
+-----------------------------+
       │
       ▼
+-----------------------------------------------------------------------------------+
|                        LLM PROVIDER ABSTRACTION LAYER                             |
|       [Ollama Local :11434]  |  [OpenAI]  |  [Anthropic]  |  [OpenRouter]         |
+-----------------------------------------------------------------------------------+
```

---

## 2. Camadas do Sistema

### 2.1. Camada de Apresentação (UI Enterprise)
A interface de usuário abandona abordagens informais ou visuais de chatbot e adota o padrão **TOTVS/SAP Enterprise**:
- **Design System Sóbrio**: Paleta Slate-900 (`#0f172a`), bordas sutis Slate-700 (`#334155`), tipografia técnica monoespaçada para métricas e indicadores de estado em tempo real.
- **Split-View Studio**: Navegação estrutural à esquerda, editor de texto com suporte a Markdown no centro, e assistente editorial com versionamento à direita.

### 2.2. Camada de Agentes de IA (`src/services/kdp-pipeline.ts`)
Cada agente é uma função assíncrona pura acoplada a um contrato estrito de dados em JSON (`structuredCompletion`), garantindo que o pipeline possa ser retomado em qualquer etapa sem perda de progresso.

### 2.3. Camada de Formatos e Compilação (`src/services/formats/`)
- `epub-builder.ts`: Constrói dinamicamente os manifestos XML (`container.xml`, `content.opf`, `toc.ncx`, `nav.xhtml`), folha de estilos CSS editorial e arquivos XHTML para cada capítulo.
- `pdf-builder.ts`: Utiliza `jspdf` para diagramar páginas no formato Trim Size selecionado (ex: 6x9 polegadas), calculando quebras de página, margens internas (gutter) e cabeçalhos alternados.
- `kdp-packager.ts`: Utiliza `jszip` para compactar o ecossistema de arquivos exigido pela Amazon KDP.

---

## 3. Segurança e Gestão de Chaves
- **Nenhuma chave de API no código do frontend**: As chaves são fornecidas pelo usuário nas configurações do Dashboard e armazenadas de forma criptografada no `chrome.storage.local`.
- **Suporte 100% Offline / Local**: Para máxima soberania e custo zero, o sistema conecta-se ao **Ollama** executando em `http://localhost:11434` sem enviar dados para a nuvem.
