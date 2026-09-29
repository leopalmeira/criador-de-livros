# Configuração do Ambiente — BookIntel & KDP Book Engine

Este documento orienta a configuração local da extensão, ativação de provedores de IA (incluindo modelos locais sem custo com Ollama) e o servidor de bridge editorial.

---

## 1. Requisitos do Sistema

- **Node.js**: Versão 18.0.0 ou superior (recomendado 20 LTS);
- **Gerenciador de Pacotes**: npm 9+;
- **Navegador**: Google Chrome, Brave, Edge ou qualquer navegador baseado em Chromium com suporte a Manifest V3;
- **Python (Opcional para o Bridge Server do kdp-book)**: Python 3.10+.

---

## 2. Instalação e Compilação da Extensão

No terminal do projeto (`criador-de-livros`):

```bash
# 1. Instalar as dependências do projeto
npm install

# 2. Compilar os bundles da extensão (dashboard, popup, background e content script)
npm run build

# 3. Executar os testes automatizados para verificar a integridade
npm test
```

Os arquivos prontos para carregar no navegador serão gerados no diretório `dist/`.

---

## 3. Carregando a Extensão no Google Chrome

1. Abra o Google Chrome e acesse `chrome://extensions/`;
2. Ative a chave **"Modo do desenvolvedor"** no canto superior direito;
3. Clique no botão **"Carregar sem compactação"** (*Load unpacked*);
4. Selecione a pasta **`dist`** dentro do projeto `criador-de-livros`;
5. A extensão **BookIntel & KDP Studio** aparecerá instalada e ativa.

---

## 4. Configuração dos Provedores de IA

Abra o Dashboard corporativo da extensão (clique no ícone da extensão ou acesse `chrome-extension://[ID_DA_EXTENSAO]/dashboard.html`) e acesse a aba **"Configurações"**.

### Opção A: Ollama Local (100% Gratuito e Offline)
1. Instale o Ollama em [ollama.com](https://ollama.com);
2. Baixe um modelo compatível com JSON e raciocínio:
   ```bash
   ollama run llama3.1
   # ou
   ollama run mistral
   # ou
   ollama run qwen2.5
   ```
3. No painel de configurações do BookIntel:
   - Provedor: **Ollama (Local)**;
   - URL Base: `http://localhost:11434` (padrão);
   - Modelo: `llama3.1` (ou o modelo instalado).
4. *Nota técnica*: O `manifest.json` já inclui permissão para `http://localhost/*` e `http://127.0.0.1/*`.

### Opção B: OpenAI
- Provedor: **OpenAI**;
- Chave de API: Sua chave `sk-...`;
- Modelo recomendado: `gpt-4o-mini` (alta velocidade e excelente custo-benefício) ou `gpt-4o` (máxima densidade literária).

### Opção C: Anthropic
- Provedor: **Anthropic**;
- Chave de API: Sua chave `sk-ant-...`;
- Modelo recomendado: `claude-3-5-sonnet-20241022`.

### Opção D: OpenRouter
- Provedor: **OpenRouter**;
- Chave de API: Sua chave `sk-or-...`;
- Modelo: Permite rotear para modelos abertos como DeepSeek-R1, Llama-3.3-70B e Claude.

---

## 5. Servidor Local de Ponte Editorial (Opcional - `kdp_bridge_server.py`)

Para integração direta com pipelines Python do repositório `kdp-book`:

```bash
# Executar o servidor de ponte HTTP local na porta 8765
python scripts/kdp_bridge_server.py
```

O servidor escuta requisições na porta `http://127.0.0.1:8765` para processamento complementar e exportações customizadas.
