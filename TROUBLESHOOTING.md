# BOOKINTEL PRO — Diagnóstico e Solução de Problemas (TROUBLESHOOTING.md)

Este documento reúne soluções para as dúvidas e cenários mais comuns de resolução de problemas no **BookIntel Pro**.

---

## 1. As molduras/estatísticas não estão aparecendo nos livros da Amazon

### Causa Possível 1: A extensão precisa ser recarregada
Após qualquer atualização no código-fonte, o Chrome mantém a versão anterior em memória até que seja feito o reload.
- **Solução**:
  1. Acesse `chrome://extensions/`.
  2. Localize o **BookIntel Pro / Criador de Livros**.
  3. Clique no botão de recarregar (ícone de seta circular 🔄).
  4. Volte à página da Amazon e atualize a aba (`Ctrl + F5` ou `F5`).

### Causa Possível 2: O domínio da Amazon não está com permissão ativa
- **Solução**: O manifest V3 já possui suporte para todas as lojas Amazon (`amazon.com`, `amazon.com.br`, `amazon.co.uk`, `amazon.de`, etc.). Verifique se a extensão está autorizada a ler o site no menu de extensões do Chrome.

---

## 2. A IA gera textos curtos ou capítulos com menos de 1.500 caracteres

### Causa: Limitação de tokens no Ollama ou truncamento de JSON
1. **Ollama**: Por padrão, o endpoint `/api/chat` do Ollama limitava gerações a 128 tokens quando não configurado.
   - **Solução Aplicada**: O `ai-service.ts` agora envia automaticamente `options: { num_predict: 8192, num_ctx: 16384 }`, desbloqueando o modelo para gerar capítulos completos de 2.000 a 3.500+ palavras.
2. **Formato JSON**: Modelos de IA costumam encurtar textos ao responder dentro de propriedades JSON.
   - **Solução Aplicada**: O método `KdpPipeline.writeChapter` agora solicita diretamente prosa em Markdown e ativa o `LocalAiEngine` de alta densidade caso qualquer modelo remoto entregue texto insuficiente.

---

## 3. O Ollama está instalado mas aparece como desconectado

- **Solução**:
  1. Certifique-se de que o Ollama está rodando no terminal:
     ```bash
     ollama serve
     ```
  2. Teste se um modelo está baixado:
     ```bash
     ollama list
     ```
  3. Caso não possua nenhum modelo baixado:
     ```bash
     ollama pull llama3.2:latest
     ```
  4. No painel de **Configurações** da extensão, clique em **Testar Conexão** na seção Ollama.

---

## 4. Onde ficam salvos os meus livros e projetos?

Todos os projetos, capítulos, bíblias, observações e histórico de BSR são gravados no **IndexedDB** local do seu navegador (`bookintel_db`). Seus dados nunca são enviados a servidores externos não autorizados. Você pode exportar um backup JSON completo a qualquer momento na aba **Exportar / Backup**.
