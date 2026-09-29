# BOOKINTEL PRO — Guia de Exportação e Conformidade KDP (KDP_EXPORT.md)

O **BookIntel Pro** compila e empacota automaticamente todos os arquivos exigidos pela Amazon Kindle Direct Publishing (KDP).

---

## 1. Estrutura do Pacote KDP (.ZIP)

Ao clicar em **"Baixar Pacote KDP .ZIP"**, o sistema gera um arquivo comprimido contendo:

```
/meu-livro-kdp.zip
  ├── /ebook
  │   └── meu-livro.epub          <- EPUB 3.0 válido com TOC, CSS e metadados
  │
  ├── /paperback
  │   ├── interior.pdf            <- PDF do Miolo com margens KDP (gutter de 0.75")
  │   └── cover-full-wrap.pdf     <- Capa completa (Frente + Lombada + Verso)
  │
  ├── /manuscript
  │   ├── manuscript.md           <- Manuscrito integral formatado em Markdown
  │   ├── manuscript.html         <- Versão HTML pronta para visualização web
  │   └── manuscript.pdf          <- PDF corrido para leitura e revisão
  │
  ├── /cover
  │   ├── full-wrap.pdf           <- Capa em alta resolução
  │   └── cover-prompts.txt       <- Prompts visuais utilizados na arte
  │
  ├── /metadata
  │   ├── metadata.json           <- Dados completos estruturados
  │   ├── description.txt         <- Sinopse comercial formatada
  │   ├── keywords.txt            <- As 7 palavras-chave otimizadas para busca
  │   └── categories.txt          <- Categorias primárias selecionadas no KDP
  │
  └── /validation
      └── quality-report.html     <- Auditoria técnica e checklist de aprovação KDP
```

---

## 2. Geometria de Capa e Cálculo de Lombada

A largura da lombada é calculada automaticamente conforme as normas oficiais da Amazon KDP:

- **Papel Branco (White Paper)**:
  $$\text{Lombada (pol)} = \text{Número de Páginas} \times 0.002252$$
- **Papel Creme (Cream Paper)**:
  $$\text{Lombada (pol)} = \text{Número de Páginas} \times 0.0025$$
- **Sangria (Bleed)**: $0.125 \text{ pol}$ em todas as extremidades.
- **Largura Total da Capa**:
  $$\text{Largura Total} = (2 \times \text{Largura do Trim}) + \text{Lombada} + (2 \times \text{Sangria})$$

---

## 3. Como Adicionar Novos Formatos de Exportação

1. Para adicionar um formato (ex: `.docx`, `.mobi`, `.azw3`):
   - Crie o builder correspondente em [`src/services/formats/`](file:///c:/Users/User/Desktop/criador-de-livros/src/services/formats/).
   - Conecte o exportador no método `KdpPackager.createKdpPackage` em [`src/services/formats/kdp-packager.ts`](file:///c:/Users/User/Desktop/criador-de-livros/src/services/formats/kdp-packager.ts).
   - Adicione o botão de download direto na sub-aba **9. Exportar Arquivos** em [`src/dashboard/components/BookCreatorTab.tsx`](file:///c:/Users/User/Desktop/criador-de-livros/src/dashboard/components/BookCreatorTab.tsx).
