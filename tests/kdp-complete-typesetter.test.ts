import { describe, it, expect } from 'vitest';
import { KdpCompleteTypesetter } from '../src/services/kdp-complete-typesetter';

describe('KdpCompleteTypesetter — Diagramação Completa Página por Página', () => {
  it('sanitiza resíduos léxicos como &&, ||, $$ e pontuações duplicadas', () => {
    const textoSujo = 'Ele caminhava pela rua escura && olhava para trás com medo|| hesitação. Havia sombras$$ por toda parte.. Estava frio,, muito frio.';
    const res = KdpCompleteTypesetter.sanitizarEHarmonizarTexto(textoSujo, 0, 'Capítulo 1');

    expect(res.textoFinal).not.toContain('&&');
    expect(res.textoFinal).not.toContain('||');
    expect(res.textoFinal).not.toContain('$$');
    expect(res.textoFinal).not.toContain('..');
    expect(res.textoFinal).not.toContain(',,');
    expect(res.textoFinal).toContain(' e ');
    expect(res.textoFinal).toContain(' ou ');
    expect(res.residuosRemovidos).toBeGreaterThan(0);
  });

  it('padroniza diálogos para travessão editorial oficial (— )', () => {
    const textoDialogo = '- Olá, quem está aí? perguntou ele.\n– Sou eu, respondeu a voz.\n—Não se aproxime.';
    const res = KdpCompleteTypesetter.sanitizarEHarmonizarTexto(textoDialogo, 0, 'Capítulo 2');

    expect(res.textoFinal).toContain('— Olá');
    expect(res.textoFinal).toContain('— Sou eu');
    expect(res.textoFinal).toContain('— Não se aproxime');
    expect(res.dialogosPadronizados).toBeGreaterThanOrEqual(2);
  });

  it('fecha capítulo que termina truncado sem pontuação', () => {
    const textoIncompleto = 'E assim ele compreendeu que a verdade sempre cobra o seu preço';
    const res = KdpCompleteTypesetter.sanitizarEHarmonizarTexto(textoIncompleto, 0, 'Capítulo 3');

    expect(res.textoFinal.endsWith('.')).toBe(true);
    expect(res.fechamentosAjustados).toBe(1);
  });

  it('executa diagramação completa de livro e simula páginas físicas KDP', () => {
    const livroFake = {
      titulo: 'O Enigma das Sombras',
      autor: 'Leandro Palmeira',
      capitulos: [
        {
          titulo: 'O Início de Tudo',
          texto: 'Era uma noite tempestuosa na cidade de Chicago. A chuva caía inclemente contra as vidraças do velho casarão && o vento uivava nas frestas das janelas. Ele sabia que o perigo estava próximo.\n\n- Precisamos sair daqui agora, disse ele em voz baixa.\n\nEla hesitou por um instante antes de assentir com a cabeça.'
        },
        {
          titulo: 'O Confronto Final',
          texto: 'A verdade finalmente veio à tona sob as luzes trêmulas do cais abandonado. Ninguém poderia escapar do destino que havia sido traçado desde o princípio'
        }
      ]
    };

    const resultado = KdpCompleteTypesetter.diagramarLivroCompleto(livroFake, '6x9');

    expect(resultado.relatorio.sucesso).toBe(true);
    expect(resultado.relatorio.totalCapitulosProcessados).toBe(2);
    expect(resultado.relatorio.totalPaginasGeradas).toBeGreaterThanOrEqual(2);
    expect(resultado.relatorio.paginas.length).toBeGreaterThanOrEqual(2);
    expect(resultado.livro.capitulos[0].texto).not.toContain('&&');
    expect(resultado.livro.capitulos[0].texto).toContain('— Precisamos');
    expect(resultado.livro.capitulos[1].texto.endsWith('.')).toBe(true);

    const pag1 = resultado.relatorio.paginas[0];
    expect(pag1.numeroPagina).toBe(1);
    expect(pag1.capituloNumero).toBe(1);
    expect(pag1.status).toBe('diagramada_alinhada');
  });
});
