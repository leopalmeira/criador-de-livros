# Sistema de Agentes Especializados de IA — KDP Book Engine

O sistema utiliza **10 agentes especializados** organizados em uma esteira sequencial e retroalimentada. Cada agente possui uma responsabilidade editorial única, garantindo profundidade e rigor técnico.

---

## 1. Visão Geral dos Agentes

| Agente | Responsabilidade | Entrada Principal | Saída Principal |
| :--- | :--- | :--- | :--- |
| **0. Idea Analyst** | Identifica nicho, público, páginas e tipo de livro | Texto bruto do usuário | Configuração editorial recomendada |
| **1. Concept & Title** | Cria proposta de valor e 3 a 5 opções de títulos | Ideia + Tipo de Livro | `IBookConcept` com `TitleOption[]` |
| **2. Outline Architect** | Desenvolve o sumário e objetivos por capítulo | Conceito Aprovado | `IBookChapter[]` com subtópicos e metas |
| **3. Book Bible Agent** | Constrói a bíblia canônica (regras, conceitos ou personagens) | Conceito + Outline | `IBookBible` |
| **4. Chapter Writer** | Escreve a prosa integral de cada capítulo com contexto | Outline + Bíblia + Capítulo Anterior | Prosa Markdown (~1500 a 4000 palavras) |
| **5. Continuity Auditor** | Identifica furos de enredo, contradições e mudanças indevidas | Bíblia + Capítulos Anteriores + Capítulo Atual | `ContinuityIssue[]` com ação de correção |
| **6. Editor & Style** | Analisa clareza, ritmo, vícios de linguagem e repetições | Capítulo Escrito | `IBookEditorReport` + Prosa Otimizada |
| **7. Fact-Checker** | Valida afirmações, estudos e dados técnicos citados | Prosa de Não-Ficção | `FactCheckItem[]` com verificação de fontes |
| **8. Cover Geometry** | Calcula dimensões exatas de capa, sangria e lombada | Páginas Reais + Trim Size + Tipo de Papel | `IBookCoverDesign` com medidas KDP |
| **9. Metadata & SEO** | Cria descrição comercial persuasiva e 7 palavras-chave | Livro Completo | `IBookMetadataKdp` estruturado |
| **10. Quality Gate** | Auditoria final pré-publicação antes da liberação do pacote | Todos os artefatos do livro | `IBookQualityReport` (Passed / Failed) |

---

## 2. Detalhamento dos Agentes

### 2.1. Idea Analyst (`analyzeIdea`)
- **Objetivo**: Evitar atrito cognitivo para o usuário. Permite digitar apenas uma ideia concisa (ex: *"Quero criar um livro de disciplina para homens de 25 a 40 anos"*) e mapear automaticamente:
  - Nicho exato no KDP;
  - Categoria editorial mais lucrativa;
  - Formato físico ideal (*Trim Size*);
  - Quantidade de páginas e palavras recomendadas;
  - Tom e estilo adequados.

### 2.2. Concept & Title Agent (`generateConcept`)
- **Regra Fundamental**: **Nunca decide o título definitivo sem aprovação humana**.
- Gera de 3 a 5 opções estratégicas de títulos, cada uma com:
  - Título principal forte (máx. 60 caracteres);
  - Subtítulo com gancho comercial claro;
  - Ângulo de venda (ex: científico, confrontador, acolhedor);
  - Apelo ao público-alvo.

### 2.3. Outline Architect (`generateOutline`)
- Modela a espinha dorsal da obra dividida em capítulos numerados.
- Para cada capítulo, define:
  - Objetivo pedagógico/dramático central;
  - Resumo de 3 a 4 frases;
  - Lista de 3 a 5 subtópicos a serem aprofundados;
  - Meta de palavras calculada matematicamente;
  - Conexão e gancho com o capítulo anterior e posterior.

### 2.4. Book Bible Agent (`generateBible`)
- Atua como a **memória canônica** do livro, consultada compulsoriamente antes da escrita de cada capítulo.
- **Para Ficção**:
  - Personagens (nome, papel, idade, características físicas imutáveis, temperamento, padrões de fala, arcos);
  - Cenários e locações;
  - Regras do universo e cronologia.
- **Para Não-Ficção / Desenvolvimento Pessoal / Negócios**:
  - Conceitos-chave e aplicações práticas;
  - Argumentos centrais;
  - Glossário de terminologia;
  - Fontes e estudos factuais autorizados.

### 2.5. Chapter Writer (`writeChapter`)
- **Princípio**: Nunca escreve um capítulo isoladamente.
- Recebe como contexto:
  1. O conceito e o tom da obra;
  2. A Bíblia canônica completa;
  3. O resumo do capítulo imediatamente anterior;
  4. Os subtópicos obrigatórios do capítulo atual;
  5. A meta de palavras calculada.
- Gera prosa substancial, dividida em seções Markdown elegantes (`### Subtítulo`), com profundidade e ritmo profissional.

### 2.6. Continuity Auditor (`checkContinuity`)
- Executado imediatamente após a escrita de cada capítulo.
- Compara o texto gerado contra a Bíblia e capítulos anteriores.
- Se um personagem mudar a cor dos olhos, uma data entrar em conflito ou um conceito de negócios se contradizer, o auditor gera uma notificação estruturada:
  ```json
  {
    "type": "character",
    "severity": "high",
    "description": "O personagem foi descrito com olhos castanhos no Cap. 2, mas no Cap. 5 é mencionado com olhos azuis.",
    "suggestedFix": "Ajustar para olhos castanhos no parágrafo 4."
  }
  ```

### 2.7. Editor & Style Agent (`reviewManuscript`)
- Avalia o capítulo em 5 dimensões críticas:
  - Clareza e objetividade;
  - Ritmo da prosa e variedade sintática;
  - Eliminação de redundâncias e clichês de IA;
  - Densidade de valor para o leitor;
  - Adequação ao tom estabelecido no conceito.

### 2.8. Cover Geometry Agent (`generateCoverDesign`)
- Não gera apenas imagens quadradas descartáveis.
- Aplica a **fórmula oficial de impressão da Amazon KDP**:
  $$\text{Lombada (polegadas)} = \text{Número de Páginas} \times \text{Espessura do Papel}$$
  - Papel Branco P&B: $0,002252"$ por página;
  - Papel Creme P&B: $0,0025"$ por página;
  - Papel Colorido: $0,002347"$ por página.
- Calcula a largura total do arquivo aberto com sangria de $0,125"$ em todas as bordas e entrega especificações prontas para produção gráfica.

### 2.9. Metadata & SEO Agent (`generateMetadataKdp`)
- Cria os metadados oficiais exigidos no formulário do KDP:
  - 7 sequências de palavras-chave de cauda longa (*Keywords*);
  - 3 categorias BISAC/Amazon prioritárias;
  - Descrição comercial formatada em HTML compatível com a Amazon (`<h2>`, `<p>`, `<ul>`, `<li>`);
  - Bullet points com ganchos de conversão.

### 2.10. Quality Gate Auditor (`runQualityGate`)
- Realiza um checklist de integridade com 8 verificações obrigatórias:
  1. Manuscrito completo sem capítulos vazios;
  2. Todos os capítulos acima do limiar mínimo de palavras;
  3. Sumário e elementos editoriais presentes;
  4. Ausência de inconsistências graves não resolvidas;
  5. Cálculo de lombada condizente com a contagem real de páginas;
  6. Metadados e palavras-chave totalmente preenchidos;
  7. EPUB 3 validado estruturalmente;
  8. Arquivos de impressão em conformidade técnica.
