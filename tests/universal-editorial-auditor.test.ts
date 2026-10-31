import { describe, it, expect } from 'vitest';
import { UniversalEditorialAuditor, LivroManuscritoInput } from '../src/services/universal-editorial-auditor';

describe('UniversalEditorialAuditor — Sistema Universal de Revisão e Auditoria', () => {
  it('deve indexar 100% dos capítulos e construir memória editorial global', async () => {
    const livro: LivroManuscritoInput = {
      titulo: 'O Segredo da Mansão',
      subtitulo: 'Um suspense psicológico',
      autor: 'Clarice Bestseller',
      genero: 'Thriller Psicológico',
      idioma: 'português',
      capitulos: [
        {
          titulo: 'Capítulo 1: A Chegada à Mansão',
          texto: 'Helena chegou à velha mansão às 18h de uma sexta-feira chuvosa. As janelas batiam com a força do vento de outono, revelando sombras inquietantes nos corredores silenciosos. Algo parecia observar seus passos.'
        },
        {
          titulo: 'Capítulo 2: O Desfecho Revelado',
          texto: 'Naquela manhã seguinte, Helena descobriu a carta escondida no forro do sótão. A verdade sobre o desaparecimento de seu irmão finalmente veio à luz, encerrando anos de tormento com a chegada da polícia.'
        }
      ]
    };

    const { auditResult } = await UniversalEditorialAuditor.runUniversalAudit(livro);

    expect(auditResult.coveragePercent).toBe(100);
    expect(auditResult.totalChaptersAnalyzed).toBe(2);
    expect(auditResult.memory.characters['Helena']).toBeDefined();
    expect(auditResult.overallScore).toBeGreaterThanOrEqual(70);
    expect(auditResult.canExport).toBe(true);
    expect(auditResult.status).toBe('APROVADA NA AUDITORIA EDITORIAL');
  });

  it('deve identificar e sanitizar resíduos de sintaxe de máquina (&&, ||, $$)', async () => {
    const livro: LivroManuscritoInput = {
      titulo: 'Código Limpo Literário',
      genero: 'Ficção Científica',
      idioma: 'português',
      capitulos: [
        {
          titulo: 'Capítulo 1: O Teste',
          texto: 'Ele andou pela rua escura && olhou para trás com pavor || buscou refúgio na cafeteria.'
        }
      ]
    };

    const { auditResult, livroRevisado } = await UniversalEditorialAuditor.runUniversalAudit(livro, { autoFixSafeIssues: true });

    expect(livroRevisado.capitulos[0].texto).not.toContain('&&');
    expect(livroRevisado.capitulos[0].texto).not.toContain('||');
    expect(auditResult.metrics.autoFixedCount).toBeGreaterThan(0);
  });

  it('deve exigir estritamente "Chapter N" quando a obra estiver em inglês', async () => {
    const livro: LivroManuscritoInput = {
      titulo: 'The Silent Crossroad',
      genero: 'Mystery',
      idioma: 'inglês',
      capitulos: [
        {
          titulo: 'Capítulo 1: The Dark Forest',
          texto: '"Where are you going?" he asked softly as the rain poured over the asphalt.'
        }
      ]
    };

    const { auditResult, livroRevisado } = await UniversalEditorialAuditor.runUniversalAudit(livro, { autoFixSafeIssues: true });

    expect(livroRevisado.capitulos[0].titulo).toContain('Chapter 1');
    expect(livroRevisado.capitulos[0].titulo).not.toContain('Capítulo');
  });

  it('deve reprovar a finalização caso não haja capítulos no manuscrito', async () => {
    const livro: LivroManuscritoInput = {
      titulo: 'Livro Incompleto',
      capitulos: []
    };

    const { auditResult } = await UniversalEditorialAuditor.runUniversalAudit(livro);

    expect(auditResult.canExport).toBe(false);
    expect(auditResult.status).toBe('REVISÃO PENDENTE — AÇÃO NECESSÁRIA');
    expect(auditResult.metrics.criticalCount).toBeGreaterThan(0);
  });
});
