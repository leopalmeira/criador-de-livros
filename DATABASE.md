# Modelagem de Dados e Persistência — BookIntel & KDP Studio

Este documento documenta o modelo relacional de entidades, o esquema de dados e as estratégias de persistência local da plataforma.

---

## 1. Armazenamento Local de Alta Disponibilidade

O sistema utiliza duas camadas de persistência local para garantir zero perda de dados sem depender de servidores externos:
1. **IndexedDB (`BookIntelDB` via Dexie/IndexedDB nativo)**:
   - Armazena projetos completos de livros, textos longos de capítulos, versões históricas de prosa e dados analíticos de nichos da Amazon.
2. **`chrome.storage.local`**:
   - Armazena credenciais criptografadas de API, preferências de interface, modelo ativo e o ponteiro do projeto ativo em andamento (`activeBookProjectId`).

---

## 2. Entidades Principais

```
+-------------------------------------------------------------+
|                         BookProject                         |
|-------------------------------------------------------------|
| id: string (UUID)                                           |
| title: string                                               |
| subtitle?: string                                           |
| author: string                                              |
| language: string                                            |
| bookType: BookType (18 templates)                           |
| status: 'draft' | 'in_progress' | 'kdp_ready'               |
| progress: number (0 - 100)                                  |
| currentStage: PipelineStage                                 |
| targetPages: number                                         |
| targetWords: number                                         |
| actualPages: number                                         |
| actualWords: number                                         |
| trimSize: TrimSize                                          |
| paperType: PaperType                                        |
| totalCostUsd: number                                        |
| totalCostBrl: number                                        |
| totalTokens: number                                         |
| createdAt: ISOString                                        |
| updatedAt: ISOString                                        |
+-------------------------------------------------------------+
       │           │           │             │            │
       ▼           ▼           ▼             ▼            ▼
 [IBookConcept] [IBookBible] [IBookChapter] [CoverDesign] [KdpMetadata]
                                     │
                                     ▼
                            [ChapterVersion]
```

### 2.1. `BookProject`
A entidade raiz que encapsula todo o estado editorial de um livro.

### 2.2. `IBookConcept`
Armazena a tese editorial, a promessa da obra, o diferencial competitivo, as sinopses curta e longa, os títulos comparáveis e o catálogo de `TitleOption[]` para escolha humana.

### 2.3. `IBookBible`
O repositório canônico de verdade do livro:
- `characters`: Lista de personagens com traços físicos, personalidade e arcos;
- `locations`: Cenários e atmosferas visuais;
- `coreConcepts`: Conceitos centrais (para obras de não-ficção/negócios);
- `keyArguments`: Argumentos primários da tese;
- `terminologyGlossary`: Glossário de termos técnicos;
- `styleGuide`: Paleta cromática, iluminação e tom narrativo.

### 2.4. `IBookChapter`
Representa um capítulo individual:
- `index`: Posição ordinal no livro;
- `title`: Título do capítulo;
- `objective`: O que o capítulo deve cumprir pedagogicamente ou narrativamente;
- `summary`: Resumo executivo;
- `subtopics`: Tópicos que devem ser obrigatoriamente abordados;
- `targetWordCount`: Meta calculada de palavras;
- `prose`: O texto final gerado em Markdown;
- `wordCount`: Contagem real de palavras;
- `continuityIssues`: Inconsistências apontadas pelo auditor;
- `versions`: Histórico de versões anteriores (`ChapterVersion[]`).

### 2.5. `ChapterVersion`
Permite restauração instantânea de versões e comparação textual:
- `versionId`: Identificador da versão;
- `timestamp`: Momento exato da alteração;
- `prose`: Conteúdo textual arquivado;
- `wordCount`: Palavras daquela versão;
- `summaryOfChanges`: Motivo da alteração (ex: "Reescrito com tom mais enérgico").

### 2.6. `GenerationCost`
Rastreia com precisão a contabilidade do projeto:
- `totalTokens`: Soma de tokens de entrada e saída;
- `totalCalls`: Contagem de requisições enviadas ao LLM;
- `estimatedCostUsd`: Custo em dólares;
- `estimatedCostBrl`: Custo em reais;
- `stageBreakdown`: Detalhamento específico por etapa (`concept`, `outline`, `writer`, `editor`, etc.).
