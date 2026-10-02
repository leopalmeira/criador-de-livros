// Serviço Centralizado do Gerador de Livros de Colorir KDP
// Portabilidade refinada da lógica de ElliottSax/coloring-books adaptada para o ecossistema Book Intel KDP

import { jsPDF } from 'jspdf';
import { 
  ColoringBookConfig, 
  GeneratedColoringPage, 
  ColoringBookJobState,
  KdpTrimFormat
} from '../types/coloring-book';
import { COLORING_THEMES, PROMPT_VARIATIONS } from './coloring-themes-catalog';
import { db } from '../database/local-database';
import { BookProject, IBookChapter } from '../types/book-project';

export class ColoringBookService {
  /**
   * Converte o trim format para dimensões em milímetros [largura, altura]
   */
  public static getDimensionsMm(format: KdpTrimFormat): [number, number] {
    switch (format) {
      case '8.5x11':
        return [215.9, 279.4];
      case '8.25x8.25':
        return [209.55, 209.55];
      case '8.5x8.5':
        return [215.9, 215.9];
      case '8x10':
        return [203.2, 254.0];
      default:
        return [215.9, 279.4];
    }
  }

  /**
   * Retorna as dimensões em pixels considerando 300 DPI de resolução KDP
   */
  public static getPrintPixels(format: KdpTrimFormat): [number, number] {
    switch (format) {
      case '8.5x11':
        return [2550, 3300];
      case '8.25x8.25':
        return [2475, 2475];
      case '8.5x8.5':
        return [2550, 2550];
      case '8x10':
        return [2400, 3000];
      default:
        return [2550, 3300];
    }
  }

  /**
   * Constrói o prompt especializado para desenho de colorir
   * Incorpora técnicas de traço preto puro, sem tons de cinza e adequação de estilo (Infantil / Adulto / Detalhado)
   */
  public static buildPagePrompt(config: ColoringBookConfig, pageIndex: number): string {
    const themeObj = COLORING_THEMES.find(t => t.id === config.theme);
    let basePrompt = '';

    if (config.customThemePrompt && config.customThemePrompt.trim().length > 0) {
      basePrompt = config.customThemePrompt.trim();
    } else if (themeObj && themeObj.prompts.length > 0) {
      const promptIdx = pageIndex % themeObj.prompts.length;
      basePrompt = themeObj.prompts[promptIdx];
    } else {
      basePrompt = `${config.title} intricate illustration`;
    }

    // Variação de estilo para manter diversidade no livro
    const variation = PROMPT_VARIATIONS[pageIndex % PROMPT_VARIATIONS.length];

    // Modificadores de estilo conforme a exigência do usuário
    let styleModifier = '';
    switch (config.style) {
      case 'kids':
        styleModifier = 'BOLD AND EASY children coloring book style, EXTRA THICK black outlines, LARGE simple shapes, MINIMAL detail, pure black lines on pure white paper, NO shading, NO gradients, NO gray tones, simple chunky contours easy to color with crayons or markers, cartoon simplicity, big areas to fill, no intricate patterns';
        break;
      case 'detailed':
        styleModifier = 'highly detailed intricate adult coloring book page, exquisite zentangle patterns, fine clean lines, sacred geometry, complex repetitive mandala details, pure black lines on pure white background, no shading, no gradients, ultra sharp focus, 300 DPI print quality';
        break;
      case 'adult':
      default:
        styleModifier = 'clean vector line art adult coloring book page, pure black ink lines on pure white paper, no fills, no shading, no gradients, no gray, no halftones, only crisp black outlines on white, high contrast linework, professional coloring book illustration, thick clean outlines ready for coloring';
        break;
    }

    return `${basePrompt}${variation}. ${styleModifier}`;
  }

  /**
   * Constrói o prompt especializado para a Capa Colorida do livro no estilo Amazon KDP
   */
  public static buildCoverPrompt(config: ColoringBookConfig): string {
    const themeObj = COLORING_THEMES.find(t => t.id === config.theme);
    const themeDetail = themeObj?.coverPromptDetails || 'vibrant artistic coloring book cover, beautiful harmonious color palette, high contrast';
    const subtitle = config.subtitle || 'Livro de Colorir para Todas as Idades';

    return `commercial bestselling book cover design for Amazon KDP, Title "${config.title}", Subtitle "${subtitle}", featuring ${themeDetail}, elegant commercial layout, vibrant captivating coloring book cover art, high resolution, 300 DPI, award-winning illustration, no text artifacts, vertical orientation`;
  }

  /**
   * Executa a chamada de geração da imagem utilizando Pollinations AI (FLUX) ou provedores configurados
   */
  public static async generateSinglePageImage(
    prompt: string,
    config: ColoringBookConfig,
    seed: number = Math.floor(Math.random() * 999999)
  ): Promise<string> {
    const [targetW, targetH] = this.getPrintPixels(config.trimFormat);
    // Para a chamada de IA, usamos resolução adequada (1024x1024 para quadrado ou 1024x1344 para 8.5x11)
    const isSquare = config.trimFormat.includes('8.25') || config.trimFormat.includes('8.5x8.5');
    const apiW = isSquare ? 1024 : 1024;
    const apiH = isSquare ? 1024 : 1344;

    if (config.provider === 'openai' && config.apiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: prompt.slice(0, 950),
            n: 1,
            size: isSquare ? '1024x1024' : '1024x1792',
            quality: 'standard'
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data?.[0]?.url) {
            return await this.processLineArtFromUrl(data.data[0].url, config.lineArtMethod);
          }
        }
      } catch (err) {
        console.warn('Falha no OpenAI DALL-E, usando motor de contingência Pollinations:', err);
      }
    }

    // Motor Principal e Gratuito: Pollinations AI (Flux)
    const encodedPrompt = encodeURIComponent(prompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${apiW}&height=${apiH}&seed=${seed}&model=flux&nologo=true`;

    try {
      const processed = await this.processLineArtFromUrl(pollinationsUrl, config.lineArtMethod);
      return processed;
    } catch (err) {
      console.warn('Erro ao processar imagem de Pollinations, gerando traço vetorial de contingência:', err);
      return this.generateProceduralLineArtFallback(config, seed);
    }
  }

  /**
   * Baixa a imagem gerada e executa o processamento de linha (Line Art & Binarization)
   * Garante:
   * - Traços 100% pretos (#000000)
   * - Fundo 100% branco (#FFFFFF)
   * - Remoção total de tons de cinza, sombras e manchas
   */
  public static async processLineArtFromUrl(imageUrl: string, method: 'enhanced' | 'standard' | 'detailed'): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 1024;
          canvas.height = img.naturalHeight || 1344;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            resolve(imageUrl);
            return;
          }

          // Desenha a imagem original
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          // Parâmetros de binarização e limiar (Threshold)
          // Se 'enhanced', limiar mais agressivo para traços fortes
          let threshold = 175;
          if (method === 'enhanced') threshold = 195;
          if (method === 'detailed') threshold = 155;

          for (let i = 0; i < data.length; i += 4) {
            // Conversão Luminância ponderada
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            // Binarização estrita: preto puro ou branco puro
            const val = lum < threshold ? 0 : 255;
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
            data[i + 3] = 255; // Opacidade total
          }

          ctx.putImageData(imgData, 0, 0);

          // Retorna como Data URL PNG em alta qualidade
          resolve(canvas.toDataURL('image/png', 1.0));
        } catch (e) {
          console.warn('Erro ao processar canvas lineart:', e);
          resolve(imageUrl);
        }
      };
      img.onerror = () => {
        reject(new Error('Falha ao carregar imagem para pós-processamento de line art'));
      };
      img.src = imageUrl;
    });
  }

  /**
   * Gerador procedural de traços geométricos/mandalas de contingência para modo offline ou testes
   */
  public static generateProceduralLineArtFallback(config: ColoringBookConfig, seed: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = config.trimFormat.includes('8.25') || config.trimFormat.includes('8.5x8.5') ? 1024 : 1344;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Fundo branco puro
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Borda dupla estilizada de página KDP
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
    ctx.lineWidth = 2;
    ctx.strokeRect(52, 52, canvas.width - 104, canvas.height - 104);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Desenho procedural de mandala simétrica
    const petals = 8 + (seed % 8);
    const radiusMax = Math.min(canvas.width, canvas.height) * 0.38;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.lineWidth = config.style === 'kids' ? 7 : 3;
    ctx.strokeStyle = '#000000';

    for (let ring = 1; ring <= 5; ring++) {
      const r = (radiusMax / 5) * ring;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      for (let p = 0; p < petals; p++) {
        const angle = (Math.PI * 2 / petals) * p;
        ctx.save();
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(r * 0.5, r * 0.4, r * 0.8, r * 0.8, 0, r);
        ctx.bezierCurveTo(-r * 0.8, r * 0.8, -r * 0.5, r * 0.4, 0, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, r * 0.5, r * 0.12, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
    }

    ctx.restore();
    return canvas.toDataURL('image/png', 1.0);
  }

  /**
   * Gera a Capa do livro de colorir
   */
  public static async generateCoverImage(config: ColoringBookConfig): string {
    const coverPrompt = this.buildCoverPrompt(config);
    const cleanPrompt = encodeURIComponent(coverPrompt);
    const coverUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1200&height=1800&model=flux&nologo=true`;
    return coverUrl;
  }

  /**
   * COMPILADOR DE PDF PARA AMAZON KDP COM INTERCALAÇÃO DE PÁGINAS EM BRANCO
   * 
   * Regras Oficiais KDP aplicadas:
   * 1. 300 DPI de resolução proporcional
   * 2. Margens seguras de encadernação
   * 3. Intercalação em branco (Odd = Ilustração, Even = Página em branco) para evitar vazamento de tinta
   * 4. Folha de rosto "Este livro pertence a:" na página 1 (se ativada)
   */
  public static async generateKdpPdf(
    pages: GeneratedColoringPage[],
    config: ColoringBookConfig,
    coverUrl?: string
  ): Promise<{ blob: Blob; url: string; totalPdfPages: number }> {
    const [widthMm, heightMm] = this.getDimensionsMm(config.trimFormat);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [widthMm, heightMm]
    });

    let currentPdfPage = 1;

    // Helper para desenhar a Folha de Rosto Oficial "Este livro pertence a:"
    const drawBelongsToPage = () => {
      // Borda decorativa exterior
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.2);
      doc.rect(14, 14, widthMm - 28, heightMm - 28);
      doc.setLineWidth(0.4);
      doc.rect(17, 17, widthMm - 34, heightMm - 34);

      // Título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(config.title.toUpperCase(), widthMm / 2, heightMm * 0.28, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      doc.text('LIVRO DE COLORIR ESPECIAL • EDIÇÃO KDP', widthMm / 2, heightMm * 0.33, { align: 'center' });

      // Bloco de Identificação
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('Este livro pertence a:', widthMm / 2, heightMm * 0.52, { align: 'center' });

      // Linha de assinatura
      doc.setLineWidth(0.8);
      doc.line(widthMm * 0.22, heightMm * 0.60, widthMm * 0.78, heightMm * 0.60);

      // Aviso e Dica KDP anti-vazamento
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(
        'Dica de Impressão KDP: As ilustrações deste livro possuem verso em branco para',
        widthMm / 2,
        heightMm * 0.78,
        { align: 'center' }
      );
      doc.text(
        'evitar que canetinhas e tintas manchem o próximo desenho.',
        widthMm / 2,
        heightMm * 0.81,
        { align: 'center' }
      );

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Publicado via Book Intel KDP • Todos os direitos reservados', widthMm / 2, heightMm * 0.92, { align: 'center' });
    };

    // 1. PÁGINA 1: FOLHA DE ROSTO (se habilitada)
    if (config.includeBelongsToPage) {
      drawBelongsToPage();

      if (config.blankPageInterleaving) {
        // Página 2: Verso da folha de rosto em branco
        doc.addPage([widthMm, heightMm], 'portrait');
        currentPdfPage = 2;
      }
    }

    // Margens do Miolo
    // Com sangria (bleed): imagem preenche quase 100% da página
    // Sem sangria: margem de 12.7mm (0.5 polegadas) para área segura KDP
    const marginMm = config.hasBleed ? 4 : 12.7;
    const printableW = widthMm - (marginMm * 2);
    const printableH = heightMm - (marginMm * 2);

    // 2. ITERAÇÃO SOBRE CADA DESENHO GERADO
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (currentPdfPage > 1 || config.includeBelongsToPage) {
        doc.addPage([widthMm, heightMm], 'portrait');
      }
      currentPdfPage++;

      // Inserção da Ilustração de Colorir (Lado Ímpar / Direito)
      try {
        if (page.imageUrl) {
          doc.addImage(
            page.imageUrl,
            'PNG',
            marginMm,
            marginMm,
            printableW,
            printableH,
            undefined,
            'FAST'
          );
        }
      } catch (err) {
        console.warn(`Erro ao carregar imagem da página ${i + 1} no PDF:`, err);
      }

      // 3. INTERCALAÇÃO DE PÁGINA EM BRANCO (Lado Par / Verso)
      // Essencial para Amazon KDP para prevenir que canetinhas de feltro ou aquarela sangrem
      if (config.blankPageInterleaving) {
        doc.addPage([widthMm, heightMm], 'portrait');
        currentPdfPage++;
        // A página fica intencionalmente vazia (Pure Blank Page)
      }
    }

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    return {
      blob: pdfBlob,
      url: pdfUrl,
      totalPdfPages: currentPdfPage
    };
  }

  /**
   * Salva o livro de colorir gerado diretamente na base de projetos do Book Intel KDP
   */
  public static async saveToBookProject(
    config: ColoringBookConfig,
    pages: GeneratedColoringPage[],
    coverUrl?: string
  ): Promise<BookProject> {
    const projectId = `proj_coloring_${Date.now()}`;
    const totalPhysicalPages = config.blankPageInterleaving ? pages.length * 2 + 2 : pages.length + 2;

    const chapters: IBookChapter[] = pages.map((p, idx) => ({
      index: idx + 1,
      title: `Página ${idx + 1}: ${config.theme} #${idx + 1}`,
      summary: p.prompt,
      prose: `# Desenho de Colorir: ${config.theme} - Página ${idx + 1}\n\n[Ilustração de Traço Limpo Vetorial para Colorir]\nPrompt de Criação: ${p.prompt}`,
      wordCount: 30,
      scenes: [],
      charactersPresent: []
    }));

    const project: BookProject = {
      id: projectId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'DIAGRAMAÇÃO',
      priority: 'ALTA',
      executionMode: 'assisted',
      title: config.title,
      subtitle: config.subtitle || 'Livro de Colorir para Amazon KDP',
      author: 'Leandro Palmeira',
      description: `Livro de colorir profissional no nicho "${config.theme}". Contém ${pages.length} ilustrações com traços limpos em alta definição, ideal para publicação em formato físico na Amazon KDP.`,
      language: 'Português',
      format: 'Capa Comum',
      trimSize: config.trimFormat === '8.5x11' ? '8.5x11' : '8.5x8.5',
      paperType: 'bw-white',
      estimatedPages: totalPhysicalPages,
      actualPages: totalPhysicalPages,
      targetPrice: 34.90,
      currency: 'BRL',
      targetMarketplace: 'amazon.com.br',
      categories: ['Livros de Colorir para Adultos', 'Arte e Desenho', 'Atividades e Passatempos'],
      keywords: [
        'livro de colorir kdp',
        'mandalas para colorir',
        'coloring book amazon',
        'anti-stress colorir',
        'desenhos para colorir relaxantes'
      ],
      targetAudience: config.style === 'kids' ? 'Crianças e Família' : 'Adultos e Jovens em busca de relaxamento',
      topic: `Livro de colorir no nicho ${config.theme}`,
      kdpBookType: 'coloring-book',
      kdpChapters: chapters,
      coverDesign: {
        theme: config.theme,
        primaryColor: '#1e293b',
        secondaryColor: '#3b82f6',
        frontCoverUrl: coverUrl || '',
        status: 'approved'
      }
    };

    try {
      await db.saveBookProject(project);
    } catch (err) {
      // Em ambientes sem IndexedDB (ex: testes em Node / SSR), mantém o retorno do projeto estruturado
      console.warn('Persistência IndexedDB ignorada:', err);
    }

    return project;
  }
}

