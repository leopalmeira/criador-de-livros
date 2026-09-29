# BOOKINTEL PRO — Guia de Provedores de Inteligência Artificial (AI_PROVIDERS.md)

O **BookIntel Pro** conta com um sistema de roteamento inteligente de IA com cascata de fallback automática, permitindo operar 100% offline ou conectado às principais APIs de mercado.

---

## 1. Provedores Suportados

| Provedor | Modelo Padrão Recomendado | Tipo | Vantagem Principal |
| :--- | :--- | :--- | :--- |
| **Google Gemini** | `gemini-1.5-pro` / `gemini-2.0-flash` | Nuvem | Janela de contexto massiva (1M+ tokens), ideal para livros longos |
| **OpenAI** | `gpt-4o` / `gpt-4o-mini` | Nuvem | Alta precisão e excelente capacidade de escrita em português |
| **Groq** | `llama-3.3-70b-versatile` | Nuvem | Velocidade ultrarrápida de geração em streaming |
| **Anthropic** | `claude-3-5-sonnet` | Nuvem | Prosa literária primorosa e respeito estrito a instruções editoriais |
| **DeepSeek** | `deepseek-chat` / `deepseek-reasoner` | Nuvem | Excelente raciocínio e custo extremamente acessível |
| **Ollama** | `llama3.2:latest` / `mistral` | Local | 100% privado, gratuito e sem depender de conexão com internet |
| **Local Built-in** | `LocalAiEngine` | Embutido | Motor offline nativo com geração imediata sem dependência de GPU |

---

## 2. Ordem de Fallback Automático

Se configurada uma chave principal e ocorrer indisponibilidade de rede ou esgotamento de quota, o sistema segue a ordem de resiliência:

```
Provedor Primário (ex: Gemini / OpenAI)
        ↓
Provedor Secundário (ex: Groq)
        ↓
Ollama Local (se ativo em http://localhost:11434)
        ↓
Motor Local Embutido (LocalAiEngine)
```

Nenhum projeto ou manuscrito é perdido por instabilidade de rede.

---

## 3. Como Adicionar um Novo Provedor

Para integrar um novo provedor compatível com OpenAI:

1. Abra [`src/services/ai-service.ts`](file:///c:/Users/User/Desktop/criador-de-livros/src/services/ai-service.ts).
2. Adicione a chave do provedor no tipo `AiProvider`:
   ```typescript
   export type AiProvider = 'openai' | 'gemini' | 'groq' | 'anthropic' | 'deepseek' | 'ollama' | 'local-builtin' | 'novo-provedor';
   ```
3. Registre a URL base padrão no método `callOpenAiCompatible` ou adicione o case no `chatCompletion`.
4. Adicione os campos correspondentes na tela de configurações [`src/dashboard/components/SettingsTab.tsx`](file:///c:/Users/User/Desktop/criador-de-livros/src/dashboard/components/SettingsTab.tsx).
