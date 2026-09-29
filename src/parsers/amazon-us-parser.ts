import { BaseAmazonParser } from './amazon-parser';
import { Marketplace, BookFormat, BsrCategory } from '../types';

export class AmazonUSParser extends BaseAmazonParser {
  marketplace: Marketplace = 'amazon.com';

  bsrRegex: RegExp = /#\s*([0-9.,]+)\s+in\s+(?:Books|Kindle Store)/i;
  bsrCategoryRegex: RegExp = /#\s*([0-9.,]+)\s+in\s+([^(\n<]+)/gi;
  reviewCountRegex: RegExp = /([0-9.,]+)\s*(?:ratings|reviews|customer reviews)/i;
  ratingRegex: RegExp = /([0-9.,]+)\s*(?:out of 5 stars|out of 5|stars)/i;

  formatKeywords: Record<string, BookFormat> = {
    'kindle': 'Kindle',
    'ebook': 'Kindle',
    'paperback': 'Capa Comum',
    'hardcover': 'Capa Dura',
    'mass market': 'Livro de Bolso',
    'audiobook': 'Audiobook',
    'audible': 'Audiobook',
    'spiral': 'Espiral'
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
      '#detailBullets_feature_div, #detailBulletsWrapper_feature_div, #productDetails_db_sections, #productDetailsTable, #prodDetails, #detail-bullets, #productDetails_techSpec_section_1, #productDetails_techSpec_section_2'
    );

    for (const container of Array.from(containers)) {
      const fullText = container.textContent || '';

      // 1. BSR Geral
      if (!bsr) {
        const bsrPatterns = [
          /(?:Best Sellers Rank|Amazon Best Sellers Rank)[^#\d]*#\s*([0-9.,]+)\s+in\s+(?:Books|Kindle Store)/i,
          /#\s*([0-9.,]+)\s+in\s+(?:Books|Kindle Store)/i
        ];
        for (const pattern of bsrPatterns) {
          const match = fullText.match(pattern);
          if (match) {
            const numOnly = match[1].replace(/[^0-9]/g, '');
            if (numOnly) { bsr = parseInt(numOnly, 10); break; }
          }
        }
      }

      // 2. Subcategorias de BSR
      if (bsrCategories.length === 0) {
        const subCatMatches = Array.from(fullText.matchAll(/#\s*([0-9.,]+)\s+in\s+([A-Za-z\s&–\-:,]+?)(?:\s*\(|\s*\n|<|$)/g));
        for (const m of subCatMatches) {
          const rankNum = parseInt(m[1].replace(/[^0-9]/g, ''), 10);
          const catName = m[2].trim();
          if (!catName.toLowerCase().includes('books') && !catName.toLowerCase().includes('kindle store')) {
            if (rankNum > 0 && catName.length > 2 && !bsrCategories.some(c => c.category === catName)) {
              bsrCategories.push({ rank: rankNum, category: catName });
            }
          }
        }
      }

      // 3. Páginas
      if (!pages) {
        const pagesPatterns = [
          /([0-9]+)\s+pages/i,
          /Print length[^:]*:\s*([0-9]+)/i
        ];
        for (const pattern of pagesPatterns) {
          const match = fullText.match(pattern);
          if (match) { pages = parseInt(match[1], 10); break; }
        }
      }

      // 4. Data de publicação
      if (!publicationDate) {
        const match = fullText.match(/(?:Publication date|Date)[^:\d]*[:\s]+([^;\n\r()]+)/i);
        if (match) publicationDate = match[1].trim();
      }

      // 5. Publisher
      if (!publisher) {
        const match = fullText.match(/Publisher[^:\w]*[:\s]+([^;\n\r()]+)/i);
        if (match) publisher = match[1].trim();
      }

      // 6. Language
      if (!language) {
        const match = fullText.match(/Language[^:\w]*[:\s]+([^;\n\r()]+)/i);
        if (match) language = match[1].trim();
      }
    }

    // Processa linhas de tabela como fallback
    const tableRows = doc.querySelectorAll('#productDetails_db_sections tr, #productDetailsTable tr, #prodDetails tr');
    for (const row of Array.from(tableRows)) {
      const cells = row.querySelectorAll('th, td');
      if (cells.length >= 2) {
        const header = (cells[0].textContent || '').trim().toLowerCase();
        const value = (cells[1].textContent || '').trim();

        if (!pages && (header.includes('pages') || header.includes('print length'))) {
          const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
          if (num > 0 && num < 50000) pages = num;
        }
        if (!publicationDate && header.includes('publication')) {
          publicationDate = value;
        }
        if (!publisher && header.includes('publisher')) {
          publisher = value;
        }
        if (!language && header.includes('language')) {
          language = value;
        }
        if (!bsr && header.includes('best sellers')) {
          const bsrMatch = value.match(/#\s*([0-9.,]+)/);
          if (bsrMatch) bsr = parseInt(bsrMatch[1].replace(/[^0-9]/g, ''), 10);
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
