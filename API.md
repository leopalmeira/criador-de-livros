# BOOKINTEL PRO — API & Interface de Comunicação (API.md)

Este documento descreve os contratos de dados, endpoints internos e mensagens trocadas entre a interface, o content script da Amazon e o motor editorial.

---

## 1. Mensagens do Chrome Runtime (Background & Content Scripts)

### `GET_PAGE_STATUS`
Enviada pelo popup para inspecionar a página atual da Amazon.
- **Payload Enviado**: `{ type: 'GET_PAGE_STATUS' }`
- **Resposta**:
  ```typescript
  {
    pageType: 'product' | 'search' | 'generic';
    marketplace: string;
    booksCount: number;
    productBook?: ProductBookData;
    listingSummary?: ListingSummaryData;
  }
  ```

### `OPEN_DASHBOARD`
Abre o Estúdio Editorial do BookIntel Pro em uma nova aba.
- **Payload**:
  ```typescript
  {
    type: 'OPEN_DASHBOARD';
    tab?: 'overview' | 'bookCreator' | 'watchlist' | 'niches';
    idea?: string; // Ideia inicial para pré-carregar no Wizard
    asin?: string; // ASIN de livro concorrente para análise
  }
  ```

---

## 2. Métricas de Vendas e Faturamento da Amazon

Calculadas pelo `BsrResolverService` e injetadas nos cards de pesquisa e nas páginas de produto:

| Métrica | Propriedade | Descrição |
| :--- | :--- | :--- |
| **Vendas / Dia** | `dailySalesRangeStr` | Faixa estimada de unidades vendidas diariamente (ex: `31-54 Sales/Day`) |
| **Vendas / Semana** | `weeklySales` | Unidades estimadas na semana (`dailySales * 7`) |
| **Vendas / Mês** | `monthlySales` | Unidades estimadas no mês (`dailySales * 30`) |
| **Faturamento / Dia** | `dailyRevenue` | Faturamento bruto diário em moeda local |
| **Faturamento / Semana** | `weeklyRevenue` | Faturamento bruto semanal em moeda local |
| **Faturamento / Mês** | `monthlyRevenue` | Faturamento bruto mensal em moeda local |
| **Royalties / Dia** | `dailyRoyaltyRangeStr` | Faixa estimada de royalties líquidos pagos ao autor por dia |
| **Royalties / Mês** | `monthlyRoyalty` | Royalties líquidos estimados por mês |

---

## 3. Endpoints do Motor Editorial (`KdpBookPipeline`)

O pipeline editorial é executado através da classe `KdpBookPipeline` com suporte a múltiplos provedores:

### `pipeline.analyzeIdea(idea, language)`
- **Entrada**: Ideia do usuário em linguagem natural.
- **Saída**: Análise completa de mercado, nicho, subnicho, público-alvo, promessa e tipo de livro recomendado.

### `pipeline.generateOutline(concept, bookType, language)`
- **Entrada**: Conceito validado e tipo de livro.
- **Saída**: Lista de capítulos com título, objetivo pedagógico/narrativo, subtópicos, meta de palavras (mínimo 2.000 a 3.500 palavras) e páginas estimadas.

### `pipeline.generateBible(concept, chapters, bookType, language)`
- **Entrada**: Conceito e capítulos planejados.
- **Saída**: Bíblia canônica da obra com personagens, descrições físicas, arcos, conceitos centrais, regras do universo e guia de estilo.

### `pipeline.writeChapter(concept, bible, outline, chapter, bookType, prevSummary, language)`
- **Entrada**: Dados holísticos da obra e contexto do capítulo anterior.
- **Saída**:
  ```typescript
  {
    prose: string;       // Manuscrito integral em Markdown denso (2.000 a 3.500+ palavras)
    wordCount: number;   // Contagem exata de palavras
    notes: string[];     // Parecer da geração
  }
  ```

### `pipeline.generateEditorialMatter(concept, author, language)`
- **Entrada**: Conceito e nome do autor.
- **Saída**: Elementos preliminares e finais (Folha de meio-rosto, folha de rosto, aviso legal de copyright, dedicatória, epígrafe, prefácio, introdução, conclusão, agradecimentos, biografia do autor, referências bibliográficas com checagem de verificação, glossário e apêndices práticos).

### `pipeline.reviewManuscript(concept, chapters, bible, language)`
- **Entrada**: Manuscrito completo e Bíblia.
- **Saída**: Relatório técnico com nota editorial, pontos fortes, oportunidades de expansão e consistência.

### `pipeline.runQualityGate(project)`
- **Entrada**: Projeto consolidado.
- **Saída**: Auditoria rigorosa de publicação KDP (formatação, integridade de capítulos, contagem de palavras, metadados e requisitos de impressão).
