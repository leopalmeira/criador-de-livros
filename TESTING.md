# Guia de Testes e Validação — BookIntel & KDP Studio

Este documento orienta a execução da suíte de testes automatizados, testes de ponta a ponta e os procedimentos de validação de pacotes para o Amazon KDP.

---

## 1. Suíte de Testes Automatizados (Vitest)

O projeto conta com **24 testes automatizados** cobrindo análise de nicho, cálculos de BSR e royalties, parsers de páginas da Amazon em múltiplos países, pipeline de agentes e a geração completa de livro de ponta a ponta.

### Executar todos os testes:
```bash
npm test
```

### Executar testes em modo interativo (Watch):
```bash
npx vitest
```

### Executar teste específico de ponta a ponta (Item 47):
```bash
npx vitest run tests/e2e-book-generator.test.ts
```

---

## 2. Cobertura dos Arquivos de Teste

| Arquivo de Teste | Área Coberta | O que valida |
| :--- | :--- | :--- |
| `tests/e2e-book-generator.test.ts` | **Pipeline Completo E2E** | Gera livro completo com 10 capítulos (42k palavras), compila EPUB 3, PDF Interior, Capa Full-Wrap e empacota o ZIP do KDP |
| `tests/kdp-pipeline.test.ts` | **Configurações e Modelos** | Valida os templates de livros, extração robusta de JSON de respostas de IA e fórmula matemática da lombada KDP |
| `tests/sales-estimator.test.ts` | **Motor de Vendas** | Curvas exponenciais de conversão de BSR em vendas diárias e mensais |
| `tests/royalty-estimator.test.ts` | **Calculadora Financeira** | Royalties de 70% e 35% descontando custos de impressão e entrega |
| `tests/opportunity-score.test.ts` | **Algoritmo de Oportunidade** | Pontuação de 0 a 100 baseada em demanda, concorrência e faturamento |
| `tests/amazon-parser.test.ts` | **Extratores DOM da Amazon** | Extração de BSR, ASIN, preço e número de avaliações em páginas de produto |
| `tests/niche-analytics.test.ts` | **Agregador de Nicho** | Médias de nicho, faturamento total e distribuição de preços |

---

## 3. Validação do Pacote KDP Gerado

Para validar manualmente os arquivos contidos no arquivo `.zip` gerado:

1. **Validação do EPUB**:
   - Utilize a ferramenta oficial [EPUBCheck](https://github.com/w3c/epubcheck) ou abra no aplicativo **Kindle Previewer 3** da Amazon.
   - Verifique a navegação no sumário (*TOC*), notas e hierarquia de títulos.
2. **Validação do PDF Interior**:
   - Abra o `interior.pdf` no Adobe Acrobat ou visualizador de PDF;
   - Verifique se as páginas ímpares e pares possuem as margens corretas (*Gutter* interno mais largo que a borda externa);
   - Confirme a numeração das páginas no rodapé.
3. **Validação da Capa Full-Wrap**:
   - Abra o `cover-full-wrap.pdf`;
   - Confirme se a largura da lombada corresponde à quantidade real de páginas;
   - Verifique se a margem de segurança de corte (0.125" / 3.2 mm) não corta textos ou títulos.
4. **Relatório de Qualidade**:
   - Abra o arquivo `validation/quality-report.html` no navegador para revisar a pontuação final (100%) e as verificações executadas pelo sistema.
