// Bridge de Integração com Navegador Chromium e Sessão Autenticada do Google Gemini
import { AiService } from '../ai-service';

export interface ChromiumSessionStatus {
  isExtensionEnvironment: boolean;
  hasClipboardSupport: boolean;
  geminiWebUrl: string;
  aiStudioUrl: string;
}

export class ChromiumGeminiBridge {
  private static readonly GEMINI_WEB_URL = 'https://gemini.google.com/app';
  private static readonly AI_STUDIO_URL = 'https://aistudio.google.com/live';

  /**
   * Verifica o ambiente de execução do navegador Chromium
   */
  public static checkEnvironment(): ChromiumSessionStatus {
    const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
    const hasClipboard = typeof navigator !== 'undefined' && !!navigator.clipboard;

    return {
      isExtensionEnvironment: isExtension,
      hasClipboardSupport: hasClipboard,
      geminiWebUrl: this.GEMINI_WEB_URL,
      aiStudioUrl: this.AI_STUDIO_URL
    };
  }

  /**
   * Copia o prompt profissional formatado para a área de transferência do Chromium
   */
  public static async copyPromptToClipboard(promptText: string): Promise<boolean> {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(promptText);
        return true;
      }
      // Fallback clássico
      const textarea = document.createElement('textarea');
      textarea.value = promptText;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (err) {
      console.error('[ChromiumBridge] Erro ao copiar prompt:', err);
      return false;
    }
  }

  /**
   * Inicia uma sessão autenticada do Google Gemini no Chromium
   * 1. Copia o prompt completo com instruções de proporção 2:3 para a clipboard
   * 2. Abre uma nova aba diretamente no Google Gemini (ou Google AI Studio)
   */
  public static async launchAuthenticatedGeminiSession(
    promptText: string,
    target: 'gemini-web' | 'ai-studio' = 'gemini-web'
  ): Promise<{ success: boolean; message: string }> {
    const readyPrompt = `Gere uma arte hiper-realista para capa de livro em proporção vertical 2:3 (sem textos, letras ou palavras na imagem):\n\n${promptText}`;
    
    // Copia para a área de transferência do usuário
    await this.copyPromptToClipboard(readyPrompt);

    const targetUrl = target === 'ai-studio' ? this.AI_STUDIO_URL : this.GEMINI_WEB_URL;

    // Se estiver rodando como extensão Chromium com permissão de abas
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      try {
        chrome.tabs.create({ url: targetUrl });
        return {
          success: true,
          message: '✓ Prompt copiado para a Área de Transferência! A aba do Gemini foi aberta. Basta colar (Ctrl+V) no chat.'
        };
      } catch {
        // Fallback para window.open
      }
    }

    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return {
        success: true,
        message: '✓ Prompt copiado para a Área de Transferência! A aba do Gemini foi aberta. Basta colar (Ctrl+V) no chat.'
      };
    }

    return {
      success: false,
      message: 'Não foi possível abrir o navegador automaticamente.'
    };
  }

  /**
   * Captura uma imagem a partir de um evento de colar (Ctrl + V) do Chromium
   */
  public static extractImageFromClipboardEvent(event: React.ClipboardEvent | ClipboardEvent): Promise<string | null> {
    return new Promise((resolve) => {
      const items = (event.clipboardData || (window as any).clipboardData)?.items;
      if (!items) {
        resolve(null);
        return;
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve(e.target?.result as string || null);
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
            return;
          }
        }
      }

      resolve(null);
    });
  }

  /**
   * Converte um arquivo de imagem (File) para Base64 Data URL
   */
  public static fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Busca e converte uma URL de imagem externa para Data URL local (evita problemas de CORS)
   */
  public static async fetchUrlAsDataUrl(imageUrl: string): Promise<string> {
    if (imageUrl.startsWith('data:image/')) {
      return imageUrl;
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Erro ao baixar imagem externa (HTTP ${response.status})`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Utiliza a API oficial do Gemini (se configurada no AiService) para refinar o prompt
   */
  public static async refinePromptWithGeminiApi(
    basePrompt: string,
    visualMood: string
  ): Promise<string> {
    try {
      const systemPrompt = `Você é um diretor de arte sênior especializado em capas de livros campeões de venda para a Amazon KDP. Seu objetivo é enriquecer e calibrar prompts visuais para que gerem artes de capas cinematográficas, de prestígio e com perfeito espaço negativo superior para títulos. Responda APENAS com o prompt em inglês, sem introduções ou explicações.`;
      const userPrompt = `Enriqueça este prompt de arte de capa para um livro sobre o clima '${visualMood}':\n"${basePrompt}"\n\nGaranta que contenha iluminação, detalhes de lente, resolução 8k e a diretiva de não conter textos ou letras.`;

      const refined = await AiService.complete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        { temperature: 0.7 }
      );

      return refined.trim().replace(/^["']|["']$/g, '');
    } catch {
      // Fallback gracioso se a chave Gemini não estiver configurada
      return `${basePrompt}, cinematic lighting, 8k resolution, award-winning composition, no text`;
    }
  }
}
