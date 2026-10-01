# Vivliostyle

## Integração

- `@vivliostyle/core` e `@vivliostyle/react` estão fixados em `2.45.2` e são carregados sob demanda pelo Dashboard.
- `@vivliostyle/cli` está fixada em `11.3.3`; o bridge local usa Node.js `22.12` ou superior para criar PDFs sem bloquear a interface.
- `EditorialHtmlBuilder` é a fonte de composição usada pelo preview, pela impressão do navegador e pela exportação PDF do pacote KDP.
- O endpoint local limita o HTML recebido a 12 MB, o processo a 240 segundos, desabilita scripts do documento e grava somente em diretório temporário.
- Overrides de dependências corrigem os advisories transitivos encontrados na versão instalada. Verificar `npm audit` após atualizações.

## Licença

Os pacotes Vivliostyle usados nesta integração são licenciados sob AGPL-3.0. A ausência de finalidade comercial não remove as obrigações da licença. Distribuições que incluam ou modifiquem esses componentes devem revisar as obrigações de disponibilização do código-fonte correspondente, avisos de licença e alterações aplicáveis. Este registro é informativo, não aconselhamento jurídico.

O projeto já contém dependências e código sob licenças próprias; a licença de cada componente deve ser avaliada individualmente antes de redistribuir a extensão ou o instalador.