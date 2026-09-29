# Pipeline Técnico Amazon KDP — Especificações de Publicação

Este documento estabelece os padrões e normas técnicas rigorosas para publicação de livros físicos (*Paperback/Hardcover*) e digitais (*Kindle eBook*) na **Amazon KDP**.

---

## 1. Formatos Físicos (Trim Sizes) e Margens

A Amazon KDP exige margens mínimas variáveis de acordo com a quantidade de páginas para acomodar o vinco e a cola da encadernação (*Gutter / Margem Interna*).

| Páginas | Margem Interna (Gutter) | Margem Externa sem Sangria | Margem Externa com Sangria |
| :--- | :--- | :--- | :--- |
| **24 a 150 páginas** | 0.375" (9.5 mm) | 0.25" (6.4 mm) | 0.375" (9.5 mm) |
| **151 a 300 páginas** | 0.500" (12.7 mm) | 0.25" (6.4 mm) | 0.375" (9.5 mm) |
| **301 a 500 páginas** | 0.625" (15.9 mm) | 0.25" (6.4 mm) | 0.375" (9.5 mm) |
| **501+ páginas** | 0.750" (19.1 mm) | 0.25" (6.4 mm) | 0.375" (9.5 mm) |

### Formatos Mais Populares Suportados:
- **6" x 9" (15.24 x 22.86 cm)**: O padrão dominante para não-ficção, negócios e desenvolvimento pessoal.
- **5.5" x 8.5" (13.97 x 21.59 cm)**: Excelente para ficção, memórias e biografias.
- **5" x 8" (12.7 x 20.32 cm)**: Padrão para light novels e literatura ágil.
- **8.5" x 8.5" (21.59 x 21.59 cm)**: Padrão para livros infantis ilustrados com sangria total.

---

## 2. Cálculo Exato da Capa Completa (*Full-Wrap Cover*)

A capa de um livro impresso KDP é composta por uma única folha que contém:
`[Sangria Esquerda] + [Contracapa] + [Lombada] + [Capa Frontal] + [Sangria Direita]`

```
+--------+------------------------+-------------+------------------------+--------+
| Sangria|       CONTRACAPA       |   LOMBADA   |      CAPA FRONTAL      | Sangria|
| 0.125" |     Largura do Trim    |   Spine W   |    Largura do Trim     | 0.125" |
|        |                        |             |                        |        |
|        |  (Texto comercial,     |  (Título &  |  (Título, subtítulo,   |        |
|        |   código de barras)    |   Autor)    |   nome do autor, arte) |        |
+--------+------------------------+-------------+------------------------+--------+
```

### Fórmulas Matemáticas Oficiais KDP:
1. **Espessura da Lombada**:
   - Papel Branco P&B: $\text{Páginas} \times 0.002252"$
   - Papel Creme P&B: $\text{Páginas} \times 0.002500"$
   - Papel Colorido Padrão: $\text{Páginas} \times 0.002347"$
2. **Largura Total do Arquivo**:
   $$\text{Largura Total} = 0.125" + \text{Trim Width} + \text{Spine Width} + \text{Trim Width} + 0.125"$$
3. **Altura Total do Arquivo**:
   $$\text{Altura Total} = 0.125" + \text{Trim Height} + 0.125"$$

*Observação técnica: Livros com menos de 79 páginas não devem conter texto legível na lombada, pois a espessura é insuficiente para dobra segura.*

---

## 3. Padrão do Pacote KDP (.ZIP)

Ao exportar o projeto, o sistema gera um arquivo `.zip` padronizado contendo todos os artefatos técnicos:

```
[NOME-DO-LIVRO]-KDP/
├── ebook/
│   └── [nome-do-livro].epub            (EPUB 3 padronizado com sumário interativo)
├── paperback/
│   ├── interior.pdf                    (Miolo diagramado com margens, gutter e números)
│   └── cover-full-wrap.pdf             (Capa aberta impressa em alta resolução)
├── manuscript/
│   ├── manuscript.pdf                  (Cópia de leitura em formato A4/Carta)
│   ├── manuscript.md                   (Manuscrito puro em Markdown)
│   └── manuscript.html                 (Manuscrito formatado em HTML semântico)
├── cover/
│   ├── full-wrap.pdf                   (Arquivo de capa aberto)
│   └── cover-prompts.txt               (Prompts detalhados para ferramentas de arte)
├── metadata/
│   ├── metadata.json                   (Metadados estruturados para ingestão automática)
│   ├── description.txt                 (Descrição comercial formatada para a Amazon)
│   ├── keywords.txt                    (As 7 sequências de palavras-chave KDP)
│   └── categories.txt                  (Categorias BISAC sugeridas)
└── validation/
    └── quality-report.html             (Relatório do Quality Gate com status de aprovação)
```

---

## 4. Diretrizes Éticas e Legais
- O sistema prepara os arquivos em conformidade com as diretrizes do Amazon KDP.
- O sistema **não substitui** a revisão humana obrigatória exigida pelos Termos de Serviço da Amazon.
- O sistema **não inventa números de ISBN** nem promete aprovação automática; a responsabilidade final de submissão na conta KDP pertence ao titular da conta.
