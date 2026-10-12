---
name: BookEngin Design System
description: Um estúdio editorial profissional para autores e editores KDP.
colors:
  canvas: "#090d16"
  surface: "#0f172a"
  surface-raised: "#1e293b"
  surface-hover: "#24324a"
  border: "#334155"
  border-subtle: "rgba(255, 255, 255, 0.08)"
  ink: "#f8fafc"
  ink-muted: "#94a3b8"
  ink-subtle: "#64748b"
  primary: "#0284c7"
  primary-hover: "#0369a1"
  primary-glow: "rgba(2, 132, 199, 0.25)"
  gold: "#d97706"
  gold-light: "#fef08a"
  success: "#10b981"
  warning: "#f59e0b"
  error: "#ef4444"
typography:
  display:
    fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif"
    fontWeight: 800
  title:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  control: "6px"
  surface: "10px"
  modal: "14px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
---

# Design System: BookEngin Studio & Cover Atelier

## 1. Visão Geral Editorial ("The Writer's Atelier")
Um ambiente de trabalho focado e sofisticado para autores e produtores de livros digitais e impressos no ecossistema Amazon KDP. A interface transmite rigor editorial:
- **Tons neutros escuros sóbrios** (#090d16 e #0f172a) que eliminam fadiga visual e direcionam toda a atenção para a obra.
- **Tipografia editorial refinada**: Cinzel, Playfair Display, Montserrat e Inter.
- **Zero decorações clichês**: Banimento absoluto de roxos genéricos de IA, caixas translúcidas que tampam ilustrações, e emojis em botões utilitários.
- **Hierarquia de precisão**: Controles densos e ergonômicos com feedback tátil de foco, bordas sutis de 1px e estados ativos bem delimitados.

## 2. Princípios de Design de Capa KDP
1. **Sem Caixas Artificiais de Dashboard**: A arte da capa deve ser o elemento visual predominante; o texto é diagramado diretamente sobre a arte com gradientes de contraste (scrim) naturais e sombras ópticas calibradas.
2. **Hierarquia Tipográfica das Grandes Editoras**:
   - Título monumental com tracking equilibrado.
   - Subtítulo em corpo proporcional e legível em miniatura (thumbnail Amazon KDP).
   - Nome do autor com respiro editorial.
   - Selo ou chancela opcional, sóbria e discreta.
3. **Gabarito Técnico Oficial Amazon KDP**:
   - Sangria (Bleed) de 0.125" (3.2mm).
   - Área segura interna de 0.25" (6.4mm).
   - Cálculo milimétrico de espessura de lombada com base nas páginas e tipo de papel (branco x creme).
   - Localização precisa da área de código de barras na contracapa.
