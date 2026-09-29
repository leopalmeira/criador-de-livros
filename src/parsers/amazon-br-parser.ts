import { BaseAmazonParser } from './amazon-parser';
import { Marketplace, BookFormat, BsrCategory } from '../types';

export class AmazonBRParser extends BaseAmazonParser {
  marketplace: Marketplace = 'amazon.com.br';

  bsrRegex: RegExp = /(?:N[º°]|#)\s*([0-9.,]+)\s+(?:em|na|no)\s+(?:Livros|Loja Kindle)/i;
  bsrCategoryRegex: RegExp = /(?:N[º°]|#)\s*([0-9.,]+)\s+(?:em|na|no)\s+([^(\n<]+)/gi;
  reviewCountRegex: RegExp = /([0-9.,]+)\s*(?:avaliaç[õo]es|classificaç[õo]es|ratings|comentários)/i;
  ratingRegex: RegExp = /([0-9.,]+)\s*(?:de 5 estrelas|de 5|estrelas|out of 5)/i;

  formatKeywords: Record<string, BookFormat> = {
    'kindle': 'Kindle',
    'ebook': 'Kindle',
    'capa comum': 'Capa Comum',
    'brochura': 'Capa Comum',
    'capa dura': 'Capa Dura',
    'livro de bolso': 'Livro de Bolso',
    'audiobook': 'Audiobook',
    'audible': 'Audiobook',
    'espiral': 'Espiral'
  };

  protected extractDetailsBullets(doc: Document): {
    bsr?: number;
    bsrCategories: BsrCategory[];
    pages?: number;
    publicationDate?: string;
    publisher?: string;
    language?: string;
  } {
    let bsr: number | undefined;
    const bsrCategories: BsrCategory[] = [];
    let pages: number | undefined;
    let publicationDate: string | undefined;
    let publisher: string | undefined;
    let language: string | undefined;

    // Busca em TODOS os containers de detalhes possíveis
    const containers = doc.querySelectorAll(
      '#detailBullets_feature_div, #detailBulletsWrapper_feature_div, #productDetails_db_sections, #productDetailsTable, #detailBullets_secondary_view_div, #prodDetails, #detail-bullets, #productDetails_techSpec_section_1, #productDetails_techSpec_section_2'
    );

    // Também extrai de tabelas de detalhes (novo layout Amazon)
    const tableRows = doc.querySelectorAll('#productDetails_db_sections tr, #productDetailsTable tr, #prodDetails tr, .pdTab table tr');

    // Processa containers de texto
    for (const container of Array.from(containers)) {
      const fullText = container.textContent || '';

      // 1. Extração do BSR Geral (múltiplos formatos)
      if (!bsr) {
        // Formato: "Ranking dos mais vendidos: Nº 1.234 em Livros"
        const bsrPatterns = [
          /(?:Ranking dos mais vendidos|Posição no ranking dos mais vendidos|Mais Vendidos|Amazon Best Sellers Rank|Classificação)[^#\dNn]*(?:#|Nº|N°|nº)?\s*([0-9.,]+)\s+(?:em|na|no|in)\s+(?:Livros|Loja Kindle|Kindle Store|Books)/i,
          /(?:#|Nº|N°)\s*([0-9.,]+)\s+(?:em|na|no)\s+(?:Livros|Loja Kindle)/i,
          /Best\s*Sellers?\s*Rank[:\s]*#?([0-9,.\s]+)\s+(?:in|em)/i
        ];

        for (const pattern of bsrPatterns) {
          const match = fullText.match(pattern);
          if (match) {
            const numOnly = match[1].replace(/[^0-9]/g, '');
            if (numOnly) {
              bsr = parseInt(numOnly, 10);
              break;
            }
          }
        }
      }

      // 2. Extração das Subcategorias de BSR
      if (bsrCategories.length === 0) {
        const subCatPatterns = [
          /(?:N[º°]|#)\s*([0-9.,]+)\s+(?:em|na|no)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s&–\-:,]+?)(?:\s*\(|\s*\n|<|$)/gi,
          /#([0-9,]+)\s+in\s+([A-Za-z\s&–\-:,]+?)(?:\s*\(|\s*\n|<|$)/gi
        ];

        for (const pattern of subCatPatterns) {
          const subCatMatches = Array.from(fullText.matchAll(pattern));
          for (const m of subCatMatches) {
            const rankNum = parseInt(m[1].replace(/[^0-9]/g, ''), 10);
            const catName = m[2].trim();
            // Não duplica a categoria principal (Livros / Loja Kindle)
            if (!catName.toLowerCase().includes('livros') && 
                !catName.toLowerCase().includes('loja kindle') &&
                !catName.toLowerCase().includes('kindle store') &&
                !catName.toLowerCase().includes('books')) {
              if (rankNum > 0 && catName.length > 2 && !bsrCategories.some(c => c.category === catName)) {
                bsrCategories.push({ rank: rankNum, category: catName });
              }
            }
          }
        }
      }

      // 3. Número de Páginas
      if (!pages) {
        const pagesPatterns = [
          /([0-9]+)\s+p[áa]ginas/i,
          /([0-9]+)\s+pages/i,
          /Tamanho do arquivo[^:]*:\s*([0-9]+)\s*KB/i,
          /Número de páginas[^:]*:\s*([0-9]+)/i,
          /Comprimento de impressão[^:]*:\s*([0-9]+)/i,
          /Print length[^:]*:\s*([0-9]+)/i
        ];
        for (const pattern of pagesPatterns) {
          const match = fullText.match(pattern);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > 0 && num < 50000) { // Evita KB ser interpretado como páginas
              pages = num;
              break;
            }
          }
        }
      }

      // 4. Data da Publicação
      if (!publicationDate) {
        const pubPatterns = [
          /(?:Data da publicaç[ãa]o|Publicado em|Data de publicação|Publication date)[^:\d]*[:\s]+([^;\n\r()]+)/i,
          /(?:Data da publicaç[ãa]o|Publication date)\s*:\s*(.+?)(?:\n|$)/im
        ];
        for (const pattern of pubPatterns) {
          const match = fullText.match(pattern);
          if (match) {
            publicationDate = match[1].trim().replace(/\s+/g, ' ');
            break;
          }
        }
      }

      // 5. Editora
      if (!publisher) {
        const pubPatterns = [
          /(?:Editora|Publisher)[^:\w]*[:\s]+([^;\n\r()]+)/i
        ];
        for (const pattern of pubPatterns) {
          const match = fullText.match(pattern);
          if (match) {
            publisher = match[1].trim();
            break;
          }
        }
      }

      // 6. Idioma
      if (!language) {
        const langPatterns = [
          /(?:Idioma|Language)[^:\w]*[:\s]+([^;\n\r()]+)/i
        ];
        for (const pattern of langPatterns) {
          const match = fullText.match(pattern);
          if (match) {
            language = match[1].trim();
            break;
          }
        }
      }
    }

    // Processa linhas de tabela como fallback para dados específicos
    for (const row of Array.from(tableRows)) {
      const cells = row.querySelectorAll('th, td');
      if (cells.length >= 2) {
        const header = (cells[0].textContent || '').trim().toLowerCase();
        const value = (cells[1].textContent || '').trim();

        if (!pages && (header.includes('páginas') || header.includes('pages') || header.includes('comprimento'))) {
          const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
          if (num > 0 && num < 50000) pages = num;
        }

        if (!publicationDate && (header.includes('publicaç') || header.includes('publication'))) {
          publicationDate = value;
        }

        if (!publisher && (header.includes('editora') || header.includes('publisher'))) {
          publisher = value;
        }

        if (!language && (header.includes('idioma') || header.includes('language'))) {
          language = value;
        }

        if (!bsr && (header.includes('ranking') || header.includes('best sellers') || header.includes('mais vendidos'))) {
          const bsrMatch = value.match(/(?:#|Nº|N°)\s*([0-9.,]+)/);
          if (bsrMatch) {
            bsr = parseInt(bsrMatch[1].replace(/[^0-9]/g, ''), 10);
          }
        }
      }
    }

    return {
      bsr,
      bsrCategories,
      pages,
      publicationDate,
      publisher,
      language
    };
  }
}
