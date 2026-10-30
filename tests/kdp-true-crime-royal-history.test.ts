import { describe, it, expect } from 'vitest';
import { KdpTrueCrimeRoyalHistoryService } from '../src/services/kdp-true-crime-royal-history-service';

describe('KdpTrueCrimeRoyalHistoryService — Crimes Reais & História de Reis', () => {
  it('retorna crimes reais de grande repercussão para país e ano informados', async () => {
    const crimes = await KdpTrueCrimeRoyalHistoryService.buscarCrimesReais({
      pais: 'Brasil',
      anoOuPeriodo: '1992',
      idioma: 'português'
    });

    expect(crimes.length).toBeGreaterThanOrEqual(1);
    const daniella = crimes.find(c => c.tituloCaso.includes('Daniella Perez') || c.tituloCaso.includes('Carandiru'));
    expect(daniella).toBeDefined();
    expect(daniella?.artigoCompleto.cenaECrime.length).toBeGreaterThan(50);
    expect(daniella?.artigoCompleto.julgamentoEDesfecho.length).toBeGreaterThan(30);
    expect(daniella?.nivelRepercussao.length).toBeGreaterThan(20);
  });

  it('compõe livro completo com múltiplos crimes reais selecionados', () => {
    const crimesSimulados = [
      {
        id: 'caso_1',
        tituloCaso: 'O Caso dos Irmãos Naves',
        pais: 'Brasil',
        cidadeEstado: 'Araguari, MG',
        anoOuPeriodo: '1937',
        nivelRepercussao: 'Maior erro judiciário da história brasileira',
        vitimasOuAlvos: 'Benedito Pereira Caetano',
        autoresOuAcusados: 'Joaquim e Sebastião Naves',
        resumoBreve: 'Dois irmãos injustamente acusados e torturados por um crime que nunca existiu.',
        artigoCompleto: {
          cenaECrime: 'O desaparecimento do sócio Benedito...',
          investigacaoEPericia: 'Confissões forçadas sob tortura...',
          reviravoltasESuspeitos: 'A vítima reapareceu viva anos depois...',
          julgamentoEDesfecho: 'Condenados injustamente a 25 anos...',
          impactoHistorico: 'Marco nos direitos humanos e erro judiciário.'
        },
        fontesEMidia: ['Processo Histórico'],
        selecionadoParaLivro: true
      },
      {
        id: 'caso_2',
        tituloCaso: 'O Crime do Restaurante Chinês',
        pais: 'Brasil',
        cidadeEstado: 'São Paulo, SP',
        anoOuPeriodo: '1938',
        nivelRepercussao: 'Primeiro grande caso da crônica policial paulistana',
        vitimasOuAlvos: 'Proprietários do restaurante',
        autoresOuAcusados: 'Arias de Oliveira',
        resumoBreve: 'Quádruplo homicídio brutal no centro de São Paulo.',
        artigoCompleto: {
          cenaECrime: 'Corpos encontrados na manhã de segunda...',
          investigacaoEPericia: 'Pegadas ensanguentadas e faca apreendida...',
          reviravoltasESuspeitos: 'Álibis contraditórios...',
          julgamentoEDesfecho: 'Condenado após confissão...',
          impactoHistorico: 'Popularizou a reportagem policial investigativa.'
        },
        fontesEMidia: ['Jornais da Época'],
        selecionadoParaLivro: true
      }
    ];

    const livro = KdpTrueCrimeRoyalHistoryService.comporLivroCrimes({
      casos: crimesSimulados,
      pais: 'Brasil',
      anoOuPeriodo: '1937-1938',
      idioma: 'português'
    });

    expect(livro.tituloSugerido).toContain('Brasil');
    expect(livro.subtituloSugerido).toContain('2');
    expect(livro.dossieArtigosConsolidado).toContain('O Caso dos Irmãos Naves');
    expect(livro.dossieArtigosConsolidado).toContain('O Crime do Restaurante Chinês');
    expect(livro.capitulosSugeridos.length).toBeGreaterThanOrEqual(4);
  });

  it('busca e compõe livro de História de Reis com monarcas e intrigas palacianas', async () => {
    const reis = await KdpTrueCrimeRoyalHistoryService.buscarHistoriaReis({
      reinoOuPais: 'Inglaterra',
      epocaOuSeculo: 'Século XVI',
      idioma: 'português'
    });

    expect(reis.length).toBeGreaterThanOrEqual(1);
    const henrique = reis.find(r => r.tituloReiOuReinado.includes('Henrique VIII'));
    expect(henrique).toBeDefined();
    expect(henrique?.artigoCompleto.conspiracoesETraicoes.length).toBeGreaterThan(40);

    const livroReis = KdpTrueCrimeRoyalHistoryService.comporLivroReis({
      casos: reis,
      reinoOuPais: 'Inglaterra',
      epocaOuSeculo: 'Século XVI',
      idioma: 'português'
    });

    expect(livroReis.tituloSugerido).toContain('Inglaterra');
    expect(livroReis.dossieArtigosConsolidado).toContain('Henrique VIII');
    expect(livroReis.capitulosSugeridos.length).toBeGreaterThanOrEqual(3);
  });

  it('busca curiosidades e compõe livro completo de fatos surpreendentes por tema e país', async () => {
    const curiosidades = await KdpTrueCrimeRoyalHistoryService.buscarCuriosidades({
      sobreOQue: 'Coisas inacreditáveis e animais bizarros',
      paisOuRegiao: 'Japão',
      quantidade: 10,
      idioma: 'português'
    });

    expect(curiosidades.length).toBeGreaterThanOrEqual(3);
    const item1 = curiosidades[0];
    expect(item1.tituloFato.length).toBeGreaterThan(5);
    expect(item1.fatoSurpreendente.length).toBeGreaterThan(15);
    expect(item1.explicacaoDetalhada.length).toBeGreaterThan(20);

    const livroCurioso = KdpTrueCrimeRoyalHistoryService.comporLivroCuriosidades({
      curiosidades,
      sobreOQue: 'Invenções e Fatos Estranhos',
      paisOuRegiao: 'Japão',
      quantidadeTotal: 50,
      idioma: 'português'
    });

    expect(livroCurioso.tituloSugerido).toContain('50');
    expect(livroCurioso.tituloSugerido).toContain('Japão');
    expect(livroCurioso.dossieArtigosConsolidado).toContain('Fato 1:');
    expect(livroCurioso.capitulosSugeridos.length).toBeGreaterThanOrEqual(3);
  });
});
