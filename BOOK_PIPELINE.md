# Pipeline Editorial — Fluxo Passo a Passo

O **Book Engine** executa a criação do livro através de uma esteira editorial dividida em etapas isoladas com persistência de estado.

---

## 1. Princípios de Execução

1. **Geração Fragmentada com Contexto Compartilhado**:
   - Nunca gera um livro em uma única chamada de IA.
   - Cada chamada possui foco delimitado (uma ideia, um outline, um capítulo, uma revisão).
2. **Persistência de Estado por Etapa**:
   - Cada etapa concluída salva o seu resultado no `IndexedDB` e em cache local.
   - Uma falha de conexão no capítulo 8 não invalida os capítulos de 1 a 7.
3. **Modos de Operação**:
   - **Modo Assistido (Recomendado)**: O sistema gera uma etapa, pausa e aguarda aprovação ou edição humana antes de avançar.
   - **Modo Contínuo / Automático**: O sistema executa a esteira de ponta a ponta, permitindo revisão posterior no estúdio.

---

## 2. Diagrama do Fluxo Editorial

```
[ IDEIA DO USUÁRIO ]
        │
        ▼
 ( 0. Análise da Ideia ) ──> Sugere Nicho, Trim Size, Páginas e Tipo
        │
        ▼
 ( 1. Conceito Editorial ) ──> Gera Proposta de Valor + Opções de Títulos
        │
        ├──> [Revisão Humana: Seleciona Título e Ajusta Sinopse]
        ▼
 ( 2. Estrutura / Outline ) ──> Modela Capítulos com Objetivos e Metas
        │
        ├──> [Revisão Humana: Adiciona, Remove ou Reordena Capítulos]
        ▼
 ( 3. Bíblia da Obra ) ──> Constrói Personagens / Regras / Conceitos
        │
        ▼
 ( 4. Escrita dos Capítulos ) ──> Loop por Capítulo:
        │   ├── Consulta Bíblia + Resumo Anterior
        │   ├── Gera Prosa Integral
        │   ├── Executa Auditor de Continuidade
        │   └── Salva Versão do Capítulo no Histórico
        ▼
 ( 5. Elementos Editoriais ) ──> Folha de Rosto, Copyright, Introdução, Conclusão
        │
        ▼
 ( 6. Capa & Dimensões ) ──> Cálculo de Lombada KDP + Arte Frontal
        │
        ▼
 ( 7. Metadados KDP ) ──> Descrição HTML, 7 Keywords, Categorias BISAC
        │
        ▼
 ( 8. Quality Gate ) ──> Checklist de 8 Pontos de Conformidade
        │
        ▼
 ( 9. Compilação do Pacote ) ──> Gera EPUB 3, PDFs e empacota em .ZIP
```

---

## 3. Retomada de Processos Interrompidos

Se o navegador for fechado ou o processo for interrompido durante a escrita do livro:
1. Ao abrir o painel **Book Creator**, o sistema detecta projetos com status diferente de `kdp_ready`.
2. Um aviso corporativo é exibido:
   ```
   [AVISO] Encontramos um projeto editorial em andamento: "A Arquitetura da Disciplina" (Etapa: chapters, 60% concluído).
   [RETOMAR PROJETO]  [DESCARTAR]
   ```
3. Ao clicar em **Retomar Projeto**, a esteira reinicia exatamente a partir do próximo capítulo ou etapa pendente.

---

## 4. Controle de Custos e Tokens

Para cada projeto, o sistema registra em tempo real:
- Total de tokens de entrada e saída consumidos;
- Quantidade de chamadas de API executadas;
- Custo estimado em dólares americanos ($ USD);
- Custo convertido em reais (R$ BRL);
- Detalhamento por etapa no painel de gestão.
