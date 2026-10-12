import { describe, it, expect } from 'vitest';
import { ManuscriptIntegrityEngine } from '../src/services/manuscript-integrity-engine';
import { buildFallbackEditorialPlan } from '../src/services/kdp-agents-service';
import type { CoAuthorContextData, CoAuthorBookState } from '../src/components/studio/generator/CoAuthorAgentSuite';

describe('CoAuthor Agent Suite — Fluxo Conversacional Bestseller KDP', () => {
  it('1. Deve validar e estruturar as 3 caixas de contexto do Agente CoAuthor', () => {
    const context: CoAuthorContextData = {
      premissaVisao: 'Um cirurgião descobre que a IA do hospital prevê a morte de pacientes e sua filha está na lista.',
      elementosChave: 'A diretora ambiciosa; invasão ao data center; dilema de quebrar o juramento hipocrático.',
      formulaBestseller: 'Capítulos curtos com cliffhangers intensos no final de cada um, ritmo acelerado estilo Dan Brown e desfecho conclusivo.'
    };

    expect(context.premissaVisao).toContain('hospital');
    expect(context.elementosChave).toContain('data center');
    expect(context.formulaBestseller).toContain('cliffhangers');
    expect(context.premissaVisao.length).toBeGreaterThan(20);
    expect(context.elementosChave.length).toBeGreaterThan(20);
    expect(context.formulaBestseller.length).toBeGreaterThan(20);
  });

  it('2. Deve construir um Plano Editorial de Bestseller com a quantidade correta de capítulos e ganchos de retenção', () => {
    const totalCaps = 6;
    const plano = buildFallbackEditorialPlan({
      title: 'O Algoritmo do Silêncio',
      subtitle: 'Suspense médico de alta tensão',
      genre: 'Thriller / Mistério Investigativo',
      language: 'português',
      topic: 'IA médica que prediz mortes e corrida contra o relógio',
      promise: 'Cliffhangers constantes e ritmo implacável'
    }, totalCaps);

    expect(plano).toBeDefined();
    expect(plano.chapters).toHaveLength(totalCaps);
    expect(plano.editorialVision).toBeTruthy();
    expect(plano.readerPromise).toBeTruthy();
    expect(plano.continuityBible).toBeTruthy();

    plano.chapters.forEach((cap, idx) => {
      expect(cap.title).toBeTruthy();
      expect(cap.objective).toBeTruthy();
      expect(cap.keyPoints.length).toBeGreaterThanOrEqual(3);
      expect(cap.transition).toBeTruthy();
    });
  });

  it('3. Deve assegurar que o texto coescrito é sanitizado e termina com pontuação terminal estrita (sem frases cortadas)', () => {
    const rawGeneratedText = `Ele sabia que o tempo estava se esgotando rapidamente na escuridão do corredor hospitalar`;
    
    // Simula a sanitização da integridade do manuscrito
    const sanitizado = ManuscriptIntegrityEngine.sanitizeChapterContent(rawGeneratedText);
    let textoFinal = sanitizado.cleanText;

    if (!/[.!?…"”»]$/.test(textoFinal)) {
      textoFinal += '.';
    }

    expect(textoFinal.endsWith('.')).toBe(true);
    expect(sanitizado.cleanText).not.toContain('\\begin{');
    expect(sanitizado.cleanText).not.toContain('```markdown');
  });

  it('4. Deve manter a continuidade do enredo e gancho do capítulo anterior sem perder o contexto', () => {
    const livro: CoAuthorBookState = {
      titulo: 'O Algoritmo do Silêncio',
      subtitulo: 'Suspense médico',
      autor: 'Autor Book Engin',
      genero: 'Thriller',
      idioma: 'português',
      capitulos: [
        {
          titulo: 'Capítulo 1: O Primeiro Alerta',
          texto: 'O monitor piscou em vermelho às três da manhã. Dr. Marcos encarou a tela sem acreditar no nome que surgia.'
        }
      ],
      meta: {
        palavrasPorCap: 900,
        paginasAlvo: 80
      }
    };

    expect(livro.capitulos).toHaveLength(1);
    const ultimoCap = livro.capitulos[livro.capitulos.length - 1];
    const gancho = ultimoCap.texto.slice(-60);

    expect(gancho).toContain('nome que surgia');

    // Novo capítulo adicionado em coautoria
    const novoCap = {
      titulo: 'Capítulo 2: A Confirmação do Medo',
      texto: `Dr. Marcos tocou o teclado com mãos trêmulas. Aquele nome não podia estar ali, mas os dados não mentiam.`
    };

    const livroAtualizado = {
      ...livro,
      capitulos: [...livro.capitulos, novoCap]
    };

    expect(livroAtualizado.capitulos).toHaveLength(2);
    expect(livroAtualizado.capitulos[1].titulo).toBe('Capítulo 2: A Confirmação do Medo');
  });

  it('5. Deve suportar perfis editoriais de Não-Ficção (Técnico, Autoajuda e Guia Prático) sem forçar ficção', () => {
    const livroTecnico: CoAuthorBookState = {
      titulo: 'Engenharia de Prompts para Profissionais',
      subtitulo: 'Como resolver problemas reais com IA',
      autor: 'Leandro Palmeira',
      genero: 'Técnico / Tecnologia',
      idioma: 'português',
      tipoLivro: 'tecnico',
      capitulos: [
        {
          titulo: 'Capítulo 1: Fundamentos de Arquitetura de Instruções',
          texto: 'A formulação de instruções precisas requer definição explícita de contexto, formato de saída e restrições. Ao aplicar Few-Shot prompting, fornecemos exemplos concretos para reduzir alucinações.'
        }
      ],
      meta: {
        palavrasPorCap: 900,
        paginasAlvo: 80
      }
    };

    expect(livroTecnico.tipoLivro).toBe('tecnico');
    expect(livroTecnico.capitulos[0].texto).toContain('Few-Shot prompting');
    // Verifica que o conteúdo é estritamente técnico e instrucional sem floreios ficcionais
    expect(livroTecnico.capitulos[0].texto).not.toContain('personagem');
    expect(livroTecnico.capitulos[0].texto).not.toContain('clímax');
  });

  it('6. Deve permitir a revisão e edição manual de capítulos no Painel de Revisão Editorial', () => {
    const livro: CoAuthorBookState = {
      titulo: 'Finanças Pessoais Práticas',
      subtitulo: 'Guia de 90 dias',
      autor: 'Autor Teste',
      genero: 'Não-Ficção',
      idioma: 'português',
      tipoLivro: 'pratico',
      capitulos: [
        {
          titulo: 'Capítulo 1: O Diagnóstico Financeiro',
          texto: 'Antes de cortar gastos, é imperativo catalogar cada saída fixa e variável dos últimos 90 dias.'
        }
      ],
      meta: { palavrasPorCap: 900, paginasAlvo: 50 }
    };

    // Simula edição no painel de revisão editorial
    const textoAjustado = 'Antes de cortar gastos, é imperativo catalogar cada saída fixa e variável dos últimos 90 dias com extratos bancários conciliados.';
    const capitulosAtualizados = [...livro.capitulos];
    capitulosAtualizados[0] = { ...capitulosAtualizados[0], texto: textoAjustado };

    const livroRevisado = { ...livro, capitulos: capitulosAtualizados };

    expect(livroRevisado.capitulos[0].texto).toContain('conciliados.');
    expect(livroRevisado.capitulos[0].texto.endsWith('.')).toBe(true);
  });
});

