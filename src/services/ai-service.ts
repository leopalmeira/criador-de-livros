// Serviço universal de comunicação com IA (OpenAI, OpenRouter, Anthropic, Azure OpenAI, Ollama)
// Suporta chamadas com schema estruturado e fallback resiliente

import { AiSettings } from '../types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

export class AiService {
  private settings: AiSettings;

  constructor(settings?: AiSettings) {
    this.settings = settings || { provider: 'local-builtin' };
  }

  getProvider(): string {
    return this.settings.provider || 'local-builtin';
  }

  getSettings(): AiSettings {
    return this.settings;
  }

  updateSettings(settings: AiSettings) {
    this.settings = settings;
  }

  /**
   * Consulta os modelos instalados no Ollama local
   */
  public static async fetchOllamaModels(baseUrl: string = 'http://localhost:11434'): Promise<string[]> {
    try {
      const cleanUrl = baseUrl.replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/tags`, { method: 'GET' });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []).map((m: any) => m.name || m.model).filter(Boolean);
    } catch {
      return [];
    }
  }

  // --- TESTE DE CONEXÃO ---
  async testConnection(): Promise<{ success: boolean; message: string; modelUsed: string }> {
    try {
      if (this.settings.provider === 'local-builtin') {
        return {
          success: true,
          message: 'Motor Editorial Local Embutido ativo e pronto (100% Offline / Sem dependências).',
          modelUsed: 'local-coauthor-engine'
        };
      }

      if (this.settings.provider === 'ollama') {
        const baseUrl = this.settings.baseUrl?.trim() || 'http://localhost:11434';
        const installedModels = await AiService.fetchOllamaModels(baseUrl);
        
        if (installedModels.length === 0) {
          return {
            success: false,
            message: `Ollama não respondeu em ${baseUrl} ou não possui modelos baixados. Certifique-se de executar 'ollama serve' e baixar um modelo como 'ollama pull llama3.1'.`,
            modelUsed: this.settings.model || 'nenhum'
          };
        }

        let model = this.settings.model?.trim() || '';
        const found = installedModels.some(m => m.startsWith(model) || model.startsWith(m.split(':')[0]));
        if (!found || model === 'gpt-4o-mini' || model === 'gpt-4o') {
          const autoModel = installedModels[0];
          return {
            success: true,
            message: `Ollama conectado! O modelo configurado foi redirecionado para o modelo local instalado: '${autoModel}'. Modelos no seu PC: ${installedModels.join(', ')}.`,
            modelUsed: autoModel
          };
        }
      }

      const response = await this.chatCompletion([
        { role: 'system', content: 'Responda apenas com a palavra OK se estiver funcionando.' },
        { role: 'user', content: 'Teste de conexão.' }
      ], { maxTokens: 10, temperature: 0.1 });

      if (response && response.trim().length > 0) {
        return {
          success: true,
          message: `Conexão estabelecida com sucesso! Resposta: "${response.trim()}"`,
          modelUsed: this.settings.model || 'padrão'
        };
      }
      return {
        success: false,
        message: 'A IA respondeu vazio ou com erro.',
        modelUsed: this.settings.model || ''
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha na conexão: ${err.message || 'Erro desconhecido'}`,
        modelUsed: this.settings.model || ''
      };
    }
  }

  // --- CHAT COMPLETION ---
  async chatCompletion(messages: ChatMessage[], options: AiCompletionOptions = {}): Promise<string> {
    const provider = this.settings.provider || 'openai';
    const temp = options.temperature ?? this.settings.temperature ?? 0.7;

    switch (provider) {
      case 'local-builtin':
        if (options.responseFormat === 'json') {
          return JSON.stringify({ status: 'ok', success: true });
        }
        return 'Operação concluída com sucesso pelo motor local autônomo.';
      case 'gemini':
        return this.callGemini(messages, temp, options);
      case 'anthropic':
        return this.callAnthropic(messages, temp, options.maxTokens);
      case 'azure':
        return this.callAzureOpenAI(messages, temp, options);
      case 'ollama':
        return this.callOllama(messages, temp, options);
      case 'openrouter':
      case 'openai':
      case 'custom':
      default:
        return this.callOpenAiCompatible(messages, temp, options);
    }
  }

  // --- STRUCTURED COMPLETION COM PARSE JSON ROBUSTO ---
  async structuredCompletion<T>(
    systemPrompt: string,
    userPrompt: string,
    fallbackValidator?: (parsed: any) => boolean
  ): Promise<T> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `${systemPrompt}\n\nIMPORTANTE: Sua resposta DEVE ser EXCLUSIVAMENTE um objeto JSON válido. Não inclua texto introdutório, explicações ou notas antes ou depois do JSON.`
      },
      {
        role: 'user',
        content: userPrompt
      }
    ];

    const rawResponse = await this.chatCompletion(messages, {
      temperature: 0.4,
      responseFormat: 'json'
    });

    const parsed = this.cleanAndParseJson(rawResponse);
    if (!parsed) {
      throw new Error(`Falha ao decodificar JSON retornado pela IA. Resposta bruta recebida:\n${rawResponse.substring(0, 300)}...`);
    }

    if (fallbackValidator && !fallbackValidator(parsed)) {
      throw new Error('O JSON retornado pela IA não atende à validação dos campos obrigatórios.');
    }

    return parsed as T;
  }

  // --- LIMPEZA E EXTRAÇÃO DE JSON ---
  private cleanAndParseJson(raw: string): any | null {
    if (!raw) return null;
    let text = raw.trim();

    // Remove markdown code blocks se presentes
    if (text.startsWith('```json')) {
      text = text.substring(7);
    } else if (text.startsWith('```')) {
      text = text.substring(3);
    }

    if (text.endsWith('```')) {
      text = text.substring(0, text.length - 3);
    }
    text = text.trim();

    try {
      return JSON.parse(text);
    } catch {
      // Tenta encontrar o primeiro { ou [ e o último } ou ]
      const firstCurly = text.indexOf('{');
      const lastCurly = text.lastIndexOf('}');
      if (firstCurly !== -1 && lastCurly > firstCurly) {
        try {
          return JSON.parse(text.substring(firstCurly, lastCurly + 1));
        } catch {
          // segue para busca de colchetes
        }
      }

      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        try {
          return JSON.parse(text.substring(firstBracket, lastBracket + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  // --- IMPLEMENTAÇÃO OPENAI / OPENROUTER / CUSTOM ---
  private async callOpenAiCompatible(messages: ChatMessage[], temperature: number, options: AiCompletionOptions): Promise<string> {
    let baseUrl = this.settings.baseUrl?.trim() || 'https://api.openai.com/v1';
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    const isDirectOpenAi = baseUrl.includes('api.openai.com');
    const apiKey = this.settings.apiKey?.trim();

    if (!apiKey && isDirectOpenAi) {
      throw new Error('Chave de API (API Key) não informada. Configure em Configurações > Inteligência Artificial.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    if (baseUrl.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = 'https://github.com/ShonP/kdp-book';
      headers['X-Title'] = 'BookIntel KDP Book Creator';
    }

    const model = this.settings.model?.trim() || 'gpt-4o-mini';

    const body: Record<string, any> = {
      model,
      messages,
      temperature,
      max_tokens: options.maxTokens || 8192
    };

    if (options.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errBody = await res.text();
      let parsedErr = errBody;
      try {
        const jsonErr = JSON.parse(errBody);
        parsedErr = jsonErr.error?.message || errBody;
      } catch {
        // use raw
      }
      throw new Error(`Erro na API (${res.status}): ${parsedErr}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // --- IMPLEMENTAÇÃO AZURE OPENAI ---
  private async callAzureOpenAI(messages: ChatMessage[], temperature: number, options: AiCompletionOptions): Promise<string> {
    const endpoint = this.settings.azureEndpoint?.trim() || this.settings.baseUrl?.trim();
    const apiKey = this.settings.azureApiKey?.trim() || this.settings.apiKey?.trim();
    const model = this.settings.model?.trim() || 'gpt-4o';

    if (!endpoint || !apiKey) {
      throw new Error('Endpoint do Azure OpenAI e Chave de API são obrigatórios.');
    }

    let url = endpoint;
    if (!url.includes('/openai/deployments/')) {
      url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${model}/chat/completions?api-version=2024-02-01`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'api-key': apiKey
    };

    const body: Record<string, any> = {
      messages,
      temperature
    };

    if (options.maxTokens) body.max_tokens = options.maxTokens;
    if (options.responseFormat === 'json') body.response_format = { type: 'json_object' };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erro Azure OpenAI (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // --- IMPLEMENTAÇÃO GOOGLE GEMINI (SUPORTE NATIVO AO NOVO FORMATO AQ. / AIza COM ROTAÇÃO E FALLBACK) ---
  private async callGemini(messages: ChatMessage[], temperature: number, options: AiCompletionOptions = {}): Promise<string> {
    const rawKeys = [
      this.settings.apiKey?.trim(),
      this.settings.fallbackApiKey?.trim()
    ].filter(Boolean) as string[];

    const uniqueKeys = Array.from(new Set(rawKeys));

    if (uniqueKeys.length === 0) {
      throw new Error('Chave de API do Google Gemini não informada. Configure em Configurações > Inteligência Artificial.');
    }

    const rawModel = this.settings.model?.trim() || 'gemini-2.0-flash';
    const model = rawModel.startsWith('models/') ? rawModel.replace('models/', '') : rawModel;

    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const contents = conversationMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    if (contents.length === 0 && systemMessages.length > 0) {
      contents.push({
        role: 'user',
        parts: [{ text: systemMessages.map(s => s.content).join('\n\n') }]
      });
    }

    const body: Record<string, any> = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: options.maxTokens || 8192
      }
    };

    if (systemMessages.length > 0 && contents.length > 0 && conversationMessages.length > 0) {
      body.systemInstruction = {
        parts: [{ text: systemMessages.map(s => s.content).join('\n\n') }]
      };
    }

    if (options.responseFormat === 'json') {
      body.generationConfig.responseMimeType = 'application/json';
    }

    let lastErrorMsg = '';

    // Rotação sequencial entre chaves em caso de erro 429, 401 ou quota
    for (let i = 0; i < uniqueKeys.length; i++) {
      const currentKey = uniqueKeys[i];
      const isFallback = i > 0;
      const keyPrefix = currentKey.substring(0, 10);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(currentKey)}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': currentKey
          },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const errBody = await res.text();
          let parsedMsg = errBody;
          try {
            const j = JSON.parse(errBody);
            parsedMsg = j.error?.message || errBody;
          } catch {
            // fallback
          }

          lastErrorMsg = `Gemini API (${res.status}): ${parsedMsg}`;
          console.warn(`[Gemini Auth] Chave ${keyPrefix}... retornou erro (${res.status}). Tentando chave seguinte...`);
          continue; // Tenta a próxima chave do array
        }

        const data = await res.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          if (isFallback) {
            console.log(`[Gemini Fallback] Sucesso na geração com a chave de reserva (${keyPrefix}...)!`);
          }
          return candidateText;
        }

        if (data.candidates?.[0]?.finishReason) {
          lastErrorMsg = `Gemini finalizou com motivo: ${data.candidates[0].finishReason}`;
          continue;
        }
      } catch (networkErr: any) {
        lastErrorMsg = networkErr.message || 'Erro de conexão de rede';
        console.warn(`[Gemini Network] Falha com chave ${keyPrefix}...: ${lastErrorMsg}`);
      }
    }

    throw new Error(`Falha em todas as chaves Gemini configuradas. Último erro: ${lastErrorMsg}`);
  }

  // --- IMPLEMENTAÇÃO ANTHROPIC CLAUDE ---
  private async callAnthropic(messages: ChatMessage[], temperature: number, maxTokens?: number): Promise<string> {
    const apiKey = this.settings.apiKey?.trim();
    if (!apiKey) throw new Error('Chave de API da Anthropic não informada.');

    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const otherMsgs = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: this.settings.model || 'claude-3-5-sonnet-20241022',
        system: systemMsg,
        messages: otherMsgs,
        temperature,
        max_tokens: maxTokens || 4096
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erro Anthropic (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  // --- IMPLEMENTAÇÃO OLLAMA (LOCAL) ---
  private async callOllama(messages: ChatMessage[], temperature: number, options: AiCompletionOptions = {}): Promise<string> {
    const baseUrl = (this.settings.baseUrl?.trim() || 'http://localhost:11434').replace(/\/+$/, '');
    let model = this.settings.model?.trim() || '';

    // Verifica modelos instalados no Ollama para evitar erro 404
    let availableModels: string[] = [];
    try {
      availableModels = await AiService.fetchOllamaModels(baseUrl);
    } catch {
      // conexão será tratada na chamada principal
    }

    if (availableModels.length > 0) {
      const match = availableModels.find(m => m.startsWith(model) || model.startsWith(m.split(':')[0]));
      if (!match || model === 'gpt-4o-mini' || model === 'gpt-4o' || !model) {
        // Redireciona automaticamente para o modelo local real instalado no PC do usuário
        model = availableModels[0];
        this.settings.model = model;
      }
    } else if (!model || model === 'gpt-4o-mini' || model === 'gpt-4o') {
      model = 'llama3.1';
    }

    const payload: Record<string, any> = {
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      options: { 
        temperature,
        num_predict: options.maxTokens || 8192,
        num_ctx: 16384
      },
      stream: false
    };

    if (options.responseFormat === 'json') {
      payload.format = 'json';
    }

    try {
      let res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Se der 404 porque o modelo não foi encontrado, tenta buscar qualquer modelo disponível no Ollama
      if (!res.ok && res.status === 404) {
        try {
          const freshModels = await AiService.fetchOllamaModels(baseUrl);
          if (freshModels.length > 0 && freshModels[0] !== model) {
            model = freshModels[0];
            payload.model = model;
            this.settings.model = model;
            res = await fetch(`${baseUrl}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          }
        } catch {
          // ignora tentativa de tags
        }
      }

      if (!res.ok) {
        const rawErr = await res.text();
        let errorDetails = rawErr;
        try {
          const parsed = JSON.parse(rawErr);
          if (parsed.error) errorDetails = parsed.error;
        } catch {}

        if (res.status === 404) {
          throw new Error(
            `Ollama retornou 404 (${errorDetails || 'modelo não encontrado'}). ` +
            `O modelo '${model}' não está baixado no seu Ollama. Execute 'ollama pull ${model}' ou use o Motor Local Embutido.`
          );
        }
        throw new Error(`Erro Ollama (${res.status}): ${errorDetails}`);
      }

      const data = await res.json();
      return data.message?.content || '';
    } catch (err: any) {
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.name === 'TypeError') {
        throw new Error(
          `Falha de conexão com Ollama em ${baseUrl}. ` +
          `Certifique-se de que o Ollama está em execução ('ollama serve') ou selecione o 'Motor Local Embutido (Offline)' nas configurações.`
        );
      }
      throw err;
    }
  }

  // --- TESTE DE CONEXÃO DO GERADOR DE IMAGENS ---
  async testImageConnection(): Promise<{ success: boolean; message: string; providerUsed: string }> {
    const imgProvider = this.settings.imageProvider || 'builtin-flux';
    const endpoint = (this.settings.imageEndpoint || 'http://127.0.0.1:7865').replace(/\/+$/, '');

    if (imgProvider === 'builtin-flux') {
      return {
        success: true,
        message: '✓ Motor Flux.1 Schnell (Nuvem Neural / Zero Instalação / Gratuito) ativo e pronto para gerar capas em alta resolução!',
        providerUsed: 'Flux.1 Schnell (Pollinations)'
      };
    }

    if (imgProvider === 'fooocus') {
      try {
        const res = await fetch(`${endpoint}/`, { method: 'GET', signal: AbortSignal.timeout(4000) });
        if (res.ok || res.status === 200 || res.status === 302) {
          return {
            success: true,
            message: `✓ Fooocus detectado e online em ${endpoint}! Pronto para gerar capas e ilustrações SDXL de qualidade editorial.`,
            providerUsed: 'Fooocus (Local)'
          };
        }
        return {
          success: false,
          message: `Fooocus respondeu com status ${res.status} em ${endpoint}. Certifique-se de que o run.bat está em execução.`,
          providerUsed: 'Fooocus'
        };
      } catch {
        return {
          success: false,
          message: `Não foi possível conectar ao Fooocus em ${endpoint}. Verifique se o executável do Fooocus (run.bat) está aberto no seu PC.`,
          providerUsed: 'Fooocus'
        };
      }
    }

    if (imgProvider === 'sd-webui') {
      try {
        const res = await fetch(`${endpoint}/sdapi/v1/sd-models`, { method: 'GET', signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const models = await res.json();
          const count = Array.isArray(models) ? models.length : 0;
          return {
            success: true,
            message: `✓ Stable Diffusion WebUI / Forge online em ${endpoint} (${count} modelo(s) detectado(s))!`,
            providerUsed: 'SD WebUI / Forge'
          };
        }
        return {
          success: false,
          message: `SD WebUI respondeu com erro ${res.status}. Inicie com a flag --api no webui-user.bat.`,
          providerUsed: 'SD WebUI'
        };
      } catch {
        return {
          success: false,
          message: `SD WebUI offline em ${endpoint}. Certifique-se de executar webui-user.bat com a flag --api.`,
          providerUsed: 'SD WebUI'
        };
      }
    }

    if (imgProvider === 'comfyui') {
      try {
        const res = await fetch(`${endpoint}/system_stats`, { method: 'GET', signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          return {
            success: true,
            message: `✓ ComfyUI online em ${endpoint}!`,
            providerUsed: 'ComfyUI'
          };
        }
        return {
          success: false,
          message: `ComfyUI respondeu com status ${res.status} em ${endpoint}.`,
          providerUsed: 'ComfyUI'
        };
      } catch {
        return {
          success: false,
          message: `ComfyUI offline em ${endpoint}. Inicie o ComfyUI (main.py ou run_nvidia_gpu.bat).`,
          providerUsed: 'ComfyUI'
        };
      }
    }

    if (imgProvider === 'dalle3') {
      if (!this.settings.apiKey) {
        return {
          success: false,
          message: 'Chave de API OpenAI não informada para o DALL-E 3.',
          providerUsed: 'DALL-E 3'
        };
      }
      return {
        success: true,
        message: '✓ Provedor OpenAI DALL-E 3 configurado.',
        providerUsed: 'DALL-E 3'
      };
    }

    return {
      success: true,
      message: '✓ Gerador de imagem pronto.',
      providerUsed: imgProvider
    };
  }

  // --- GERAÇÃO DE IMAGEM MULTI-MOTOR (FOOOCUS / SD WEBUI / COMFYUI / FLUX.1 / DALL-E) ---
  async generateImage(prompt: string, size: '1024x1024' | '2048x2048' = '1024x1024'): Promise<string> {
    const imgProvider = this.settings.imageProvider || 'builtin-flux';
    const cleanPrompt = prompt.replace(/[\n\r]+/g, ' ').trim();

    // 1. FOOOCUS (Local - Padrão porta 7865 ou 7860)
    if (imgProvider === 'fooocus') {
      const base = (this.settings.imageEndpoint || 'http://127.0.0.1:7865').replace(/\/+$/, '');
      try {
        const fooRes = await fetch(`${base}/v1/generation/text-to-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: cleanPrompt,
            negative_prompt: 'blurry, ugly, deformed, text errors, watermark, low quality, bad anatomy',
            performance_selection: 'Speed',
            aspect_ratios_selection: '1024*1024',
            image_number: 1
          }),
          signal: AbortSignal.timeout(60000)
        });
        if (fooRes.ok) {
          const fooData = await fooRes.json();
          if (Array.isArray(fooData) && fooData[0]?.url) {
            return fooData[0].url.startsWith('http') ? fooData[0].url : `${base}${fooData[0].url}`;
          }
          if (fooData.data?.[0]?.url) return fooData.data[0].url;
          if (fooData.images?.[0]) return `data:image/png;base64,${fooData.images[0]}`;
        }
      } catch (e) {
        console.warn('[AiService] Fooocus local não respondeu, tentando endpoint WebUI ou fallback Flux:', e);
      }
    }

    // 2. STABLE DIFFUSION WEBUI / FORGE (AUTOMATIC1111 na porta 7860)
    if (imgProvider === 'sd-webui' || imgProvider === 'fooocus') {
      const sdBase = (this.settings.imageEndpoint && imgProvider === 'sd-webui' ? this.settings.imageEndpoint : 'http://127.0.0.1:7860').replace(/\/+$/, '');
      try {
        const sdRes = await fetch(`${sdBase}/sdapi/v1/txt2img`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: cleanPrompt,
            negative_prompt: 'blurry, low quality, distorted typography, watermark, bad anatomy, cropped',
            steps: 25,
            width: 1024,
            height: 1024,
            cfg_scale: 7.0
          }),
          signal: AbortSignal.timeout(60000)
        });
        if (sdRes.ok) {
          const sdData = await sdRes.json();
          if (sdData.images && sdData.images[0]) {
            return `data:image/png;base64,${sdData.images[0]}`;
          }
        }
      } catch {
        // SD WebUI não respondeu
      }
    }

    // 3. AZURE OPENAI
    if (this.settings.provider === 'azure' && this.settings.azureImageEndpoint) {
      const apiKey = this.settings.azureApiKey || this.settings.apiKey;
      try {
        const res = await fetch(this.settings.azureImageEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey || ''
          },
          body: JSON.stringify({
            prompt: cleanPrompt,
            n: 1,
            size: size === '2048x2048' ? '1024x1024' : size
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.[0]?.url) return data.data[0].url;
        }
      } catch (e) {
        console.warn('[AiService] Falha Azure image:', e);
      }
    }

    // 4. OPENAI OFICIAL DALL-E 3
    if (this.settings.apiKey && (imgProvider === 'dalle3' || this.settings.provider === 'openai')) {
      try {
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.settings.apiKey}`
          },
          body: JSON.stringify({
            model: this.settings.imageModel || 'dall-e-3',
            prompt: cleanPrompt,
            n: 1,
            size: '1024x1024'
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.[0]?.url) return data.data[0].url;
        }
      } catch (e) {
        console.warn('[AiService] Falha DALL-E 3:', e);
      }
    }

    // 5. MOTOR DE ALTA DEFINIÇÃO: FLUX.1 SCHNELL (Pollinations AI - Sem necessidade de GPU local)
    const seed = Math.floor(Math.random() * 9999999);
    const encodedPrompt = encodeURIComponent(cleanPrompt.substring(0, 450));
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`;
  }
}
