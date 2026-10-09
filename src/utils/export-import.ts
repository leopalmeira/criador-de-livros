import { SalesCalibrationPoint } from '../types';

export function downloadBlob(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportBooksToCsv(books: any[], filename: string = 'livros-analise-bookengin.csv') {
  const headers = [
    'ASIN',
    'Título',
    'Autor',
    'Formato',
    'Preço',
    'Moeda',
    'BSR',
    'Vendas Estimadas / Dia',
    'Vendas Estimadas / Mês',
    'Receita Estimada / Mês',
    'Royalty Estimado / Mês',
    'Avaliações',
    'Nota',
    'Páginas',
    'Idade',
    'Opportunity Score',
    'URL'
  ];

  const rows = books.map(b => [
    `"${(b.asin || '').replace(/"/g, '""')}"`,
    `"${(b.title || '').replace(/"/g, '""')}"`,
    `"${(b.author || '').replace(/"/g, '""')}"`,
    `"${(b.format || '').replace(/"/g, '""')}"`,
    b.price !== undefined && b.price !== null ? b.price : '',
    `"${b.currency || 'BRL'}"`,
    b.bsr || '',
    b.estimatedDailySales || b.dailySales || '',
    b.estimatedMonthlySales || '',
    b.estimatedMonthlyRevenue || b.monthlyRevenue || '',
    b.estimatedMonthlyRoyalty || '',
    b.reviewCount || b.reviews || '',
    b.rating || '',
    b.pages || '',
    `"${b.ageFormatted || ''}"`,
    b.opportunityScore || '',
    `"${b.url || ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  downloadBlob(csvContent, filename);
}

export function exportBsrHistoryToCsv(history: any[], asin: string) {
  const headers = ['Data e Hora', 'BSR', 'Preço', 'Vendas Estimadas / Dia', 'Avaliações', 'Nota'];
  const rows = history.map(h => [
    `"${new Date(h.timestamp).toLocaleString('pt-BR')}"`,
    h.bsr || '',
    h.price || '',
    h.dailySales || h.estimatedDailySales || '',
    h.reviewCount || '',
    h.rating || ''
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  downloadBlob(csvContent, `historico-bsr-${asin}.csv`);
}

export function parseCalibrationCsv(text: string): SalesCalibrationPoint[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const points: SalesCalibrationPoint[] = [];

  for (const line of lines) {
    // Pula linha de cabeçalho
    if (/bsr/i.test(line) && /(venda|sales)/i.test(line)) continue;

    // Divide por vírgula, ponto e vírgula ou tab
    const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/"/g, ''));
    if (parts.length >= 2) {
      const bsr = parseInt(parts[0].replace(/\./g, ''), 10);
      const dailySales = parseFloat(parts[1].replace(',', '.'));

      if (!isNaN(bsr) && !isNaN(dailySales) && bsr > 0 && dailySales >= 0) {
        points.push({ bsr, dailySales });
      }
    }
  }

  // Ordena por BSR crescente
  points.sort((a, b) => a.bsr - b.bsr);
  return points;
}
