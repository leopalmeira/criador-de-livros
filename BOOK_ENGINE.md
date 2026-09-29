# BOOKINTEL PRO — Arquitetura do Book Engine (BOOK_ENGINE.md)

Este documento detalha o núcleo de geração de livros do **BookIntel Pro**, inspirado nos padrões operacionais e scripts do repositório `wesleyscholl/book-generator`.

---

## 1. Visão Geral da Arquitetura

O **Book Engine** converte uma ideia bruta em um livro completo e comercialmente viável para publicação na Amazon KDP, sem expor complexidades técnicas de terminais ou scripts Bash ao usuário.

```
IDEIA EM LINGUAGEM NATURAL
            ↓
  ANÁLISE DE MERCADO & NICHO
            ↓
  ENGENHARIA DE TÍTULO COMERCIAL
            ↓
  SUMÁRIO & ESTRUTURA EDITORIAL (Outline)
            ↓
  BÍBLIA DA OBRA (Memória Persistente)
            ↓
  REDAÇÃO DOS CAPÍTULOS EM ALTA DENSIDADE (2.000–3.500 palavras cada)
            ↓
  AUDITORIA DE CONTINUIDADE & CONSISTÊNCIA
            ↓
  ELEMENTOS EDITORIAIS (Prefácio, Introdução, Conclusão, Referências, Apêndices)
            ↓
  ESTÚDIO DE CAPA & CÁLCULO DE LOMBADA KDP
            ↓
  METADADOS DE SEO COMERCIAL (7 Keywords + Categorias)
            ↓
  COMPILAÇÃO & EMPACOTAMENTO
            ↓
  EPUB 3.0 + PDF MIOLO + PDF CAPA FULL-WRAP + PACOTE KDP (.ZIP)
```

---

## 2. Mapeamento dos Componentes do `book-generator`

| Script Original do `book-generator` | Módulo no BookIntel Pro | Função Editorial Realizada |
| :--- | :--- | :--- |
| `scripts/generate_book.sh` | `KdpBookPipeline` & `executeFullAutomatedPipeline` | Orquestrador mestre ponta a ponta (Ideia → Outline → Redação → Revisão → Empacotamento) |
| `scripts/multi_provider_ai_simple.sh` | `AiService` | Roteador e fallback entre Gemini, OpenAI, Groq, Anthropic, DeepSeek, Ollama e Local Built-in |
| `scripts/compile_book.sh` | `EpubBuilder`, `PdfBuilder`, `KdpPackager` | Compilação em EPUB 3, PDF Interior diagramado e Capa Full-Wrap com lombada |
| `scripts/optimized_chapter_handler.sh` | `KdpPipeline.writeChapter` & `LocalAiEngine` | Redação densa de capítulos com injeção do resumo anterior e da Bíblia canônica |
| `scripts/generate_appendices.sh` | `generateEditorialMatter` | Criação de apêndices, checklists de aplicação prática e tabelas de métricas |
| `scripts/generate_references.sh` | `EditorialElements.references` | Gestão de fontes bibliográficas com marcação explícita de verificação |
| `scripts/generate_covers.sh` | `PdfBuilder.buildCoverWrapPdf` & Cover Studio | Geometria de capa KDP: cálculo de largura de lombada por tipo de papel e gramatura |
| `scripts/kdp_topic_finder.sh` | `KdpPipeline.analyzeIdea` | Descoberta de ângulos comerciais, promessas irresistíveis e diferenciais |
| `scripts/kdp_market_analyzer.sh` | `BsrResolverService` & `product-panel.ts` | Análise de BSR, vendas semanais/mensais e faturamento em tempo real |
| `scripts/plagiarism_report_manager.sh` | `QualityGate` & `checkContinuity` | Detecção de inconsistências narrativas e auditoria de densidade textual |

---

## 3. Diretrizes de Volume Textual e Densidade Editorial

Ao contrário de geradores genéricos que produzem textos telegráficos de 1.000 a 1.500 caracteres, o **Book Engine do BookIntel Pro** impõe regras rígidas de qualidade:

1. **Meta por Capítulo**: Mínimo de 2.000 a 3.500 palavras (~10.000 a 22.000 caracteres de texto denso).
2. **Construção de Parágrafos**: Cada parágrafo possui de 4 a 7 frases completas, desenvolvendo o raciocínio em profundidade.
3. **Didática e Aplicação**:
   - Fundamento conceitual e psicológico.
   - Exemplos do cotidiano e estudos de caso vívidos.
   - Frameworks e passos práticos acionáveis.
   - Armadilhas e erros comuns a evitar.
   - Exercícios práticos de reflexão.
4. **Reserva Local de Alta Densidade**: Se qualquer modelo remoto sofrer timeout ou retornar texto truncado, o motor local embutido (`LocalAiEngine`) assume imediatamente, assegurando que o usuário nunca receba um manuscrito vazio.
