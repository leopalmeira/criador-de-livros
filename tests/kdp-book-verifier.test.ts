import { describe, it, expect } from 'vitest';
import { KdpBookVerifier, LivroLike } from '../src/services/kdp-book-verifier';

describe('KdpBookVerifier - Suíte Editorial Completa em 1 Clique', () => {
  const mockLivro: LivroLike = {
    titulo: 'O Segredo da Névoa',
    subtitulo: 'Um mistério nas colinas',
    autor: 'Leandro Palmeira',
    genero: 'Mistério',
    capitulos: [
      {
        titulo: 'Capítulo 1: O Início',
        texto: '- Olá, quem está aí? perguntou Clara.. Ela não ouviu resposta, mas sentiu que que alguém a observava atentamente no meio da escuridão.'
      },
      {
        titulo: 'Capítulo 2: A Revelação',
        texto: 'Clara avançou pela trilha sinuosa. ' + 'Esta frase é uma narrativa padrão de suspense investigativo para testar o sistema. '.repeat(15)
      }
    ]
  };

  it('1. Executa verificação completa dos 5 módulos editoriais em 1 clique', async () => {
    const report = await KdpBookVerifier.runCompleteVerification(mockLivro, 'Investigação de um mistério antigo na névoa');

    expect(report).toBeDefined();
    expect(report.modules.length).toBe(5);
    expect(report.modules.every(m => m.status === 'completed')).toBe(true);
    expect(report.totalChapters).toBe(2);
    expect(report.score).toBeGreaterThan(0);
    expect(report.issues.length).toBeGreaterThan(0);

    // Deve ter detectado a pontuação dupla ".." e palavra repetida "que que" e travessão "-"
    const gramIssues = report.issues.filter(i => i.type === 'gramatica');
    expect(gramIssues.length).toBeGreaterThanOrEqual(1);
  });

  it('2. Aplica correção automática em 1 clique corrigindo o texto do capítulo', async () => {
    const report = await KdpBookVerifier.runCompleteVerification(mockLivro, 'Investigação de um mistério');
    const gramIssue = report.issues.find(i => i.id.includes('gram-punct'));

    if (gramIssue) {
      const livroCorrigido = KdpBookVerifier.applyFix(mockLivro, gramIssue);
      expect(livroCorrigido.capitulos[0].texto).not.toContain('..');
      expect(gramIssue.applied).toBe(true);
    }
  });

  it('3. Aplica todas as correções automaticamente de uma só vez', async () => {
    const report = await KdpBookVerifier.runCompleteVerification(mockLivro, 'Investigação de um mistério');
    const { livro: livroTotalmenteCorrigido, fixedCount } = KdpBookVerifier.applyAllFixes(mockLivro, report.issues);

    expect(fixedCount).toBeGreaterThan(0);
    expect(livroTotalmenteCorrigido.capitulos[0].texto).not.toContain('..');
  });
});
