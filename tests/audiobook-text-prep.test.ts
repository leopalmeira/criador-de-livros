import { describe, it, expect } from 'vitest';
import {
  prepareNarrationText,
  splitSentences,
  splitIntoChunks,
  buildNarrationUnits
} from '../server/audiobook/text-prep.js';

describe('AudiobookStudio — Preparo de Texto e Divisão de Capítulos', () => {
  it('1. Limpa marcações visuais (markdown, emojis) sem alterar as palavras da obra', () => {
    const raw = `
# Capítulo 1: O Enigma da Meia-Noite 🌟

Este é um **trecho fundamental** com _ênfase emocional_ e uma citação:
> "A verdade nunca se esconde para sempre."

Lista de pistas:
- Pista um: pegadas na lama
- Pista dois: relógio parado às 00:00

Diálogo com travessão:
— Quem está aí? — perguntou o detetive.
`;
    const clean = prepareNarrationText(raw);

    // Não deve conter símbolos markdown nem emojis
    expect(clean).not.toContain('#');
    expect(clean).not.toContain('**');
    expect(clean).not.toContain('_');
    expect(clean).not.toContain('>');
    expect(clean).not.toContain('🌟');
    expect(clean).not.toContain('—');

    // DEVE preservar integralmente as palavras
    expect(clean).toContain('O Enigma da Meia-Noite');
    expect(clean).toContain('Este é um trecho fundamental com ênfase emocional e uma citação:');
    expect(clean).toContain('A verdade nunca se esconde para sempre.');
    expect(clean).toContain('Pista um: pegadas na lama');
    expect(clean).toContain('Quem está aí?, perguntou o detetive.');
  });

  it('2. splitSentences não corta em abreviações comuns (Dr., Sra., etc.)', () => {
    const text = 'O Dr. Silva e a Sra. Oliveira encontraram o Prof. Souza na Av. Paulista.';
    const sentences = splitSentences(text);
    expect(sentences.length).toBe(1);
    expect(sentences[0]).toBe('O Dr. Silva e a Sra. Oliveira encontraram o Prof. Souza na Av. Paulista.');
  });

  it('3. splitIntoChunks NUNCA corta palavras e preserva o texto original ao unir', () => {
    const paragraph =
      'O silêncio reinava na velha mansão abandonada nos arredores da cidade histórica. ' +
      'Nenhum morador ousava passar por ali após o anoitecer, temendo as lendas antigas. ' +
      'Contudo, o jovem investigador decidiu cruzar o portão enferrujado sem hesitar. ' +
      'Passo a passo, a madeira do assoalho rangia sob seus pés atentos. ' +
      'Naquela noite fria, cada detalhe revelaria um segredo guardado por mais de cinquenta anos.';

    const chunks = splitIntoChunks(paragraph, 120);

    // Deve ter sido dividido em mais de uma parte
    expect(chunks.length).toBeGreaterThan(1);

    // Nenhuma parte deve exceder o limite aproximado
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(140);
      // Nenhuma parte deve começar ou terminar com espaço
      expect(chunk.trim()).toBe(chunk);
    }

    // Reconstrução: juntar os chunks com espaço deve ser idêntico ao parágrafo original
    const reconstructed = chunks.join(' ').replace(/\s+/g, ' ').trim();
    expect(reconstructed).toBe(paragraph.replace(/\s+/g, ' ').trim());
  });

  it('4. buildNarrationUnits cria introdução e capítulos nomeados com IDs sequenciais', () => {
    const manuscript = {
      projectId: 'proj_suspense_01',
      title: 'A Mansão dos Segredos',
      subtitle: 'Uma Investigação Nas Sombras',
      author: 'Carlos Drummond',
      preface: 'Dedico este livro a todos os apaixonados por mistérios reais.',
      chapters: [
        { title: 'O Portão de Ferro', text: 'O vento uivava através das grades de ferro forjado.' },
        { title: 'Passos no Escuro', text: 'Uma sombra moveu-se velozmente no corredor principal.' }
      ]
    };

    const units = buildNarrationUnits(manuscript, 'pt-BR');

    expect(units.length).toBe(3); // 1 introdução + 2 capítulos

    // Unidade 0: Introdução
    expect(units[0].kind).toBe('intro');
    expect(units[0].file).toBe('01-introducao.mp3');
    expect(units[0].label).toBe('Introdução');
    expect(units[0].title).toBe('A Mansão dos Segredos');
    expect(units[0].text).toContain('A Mansão dos Segredos');
    expect(units[0].text.toLowerCase()).toContain('carlos drummond');
    expect(units[0].text).toContain('Dedico este livro a todos os apaixonados por mistérios reais.');

    // Unidade 1: Capítulo 1
    expect(units[1].kind).toBe('chapter');
    expect(units[1].file).toBe('02-capitulo-01.mp3');
    expect(units[1].chapterNumber).toBe(1);
    expect(units[1].label).toBe('Capítulo 1');
    expect(units[1].title).toBe('O Portão de Ferro');
    expect(units[1].text).toContain('Capítulo 1. O Portão de Ferro.');
    expect(units[1].text).toContain('O vento uivava através das grades de ferro forjado.');

    // Unidade 2: Capítulo 2
    expect(units[2].kind).toBe('chapter');
    expect(units[2].file).toBe('03-capitulo-02.mp3');
    expect(units[2].chapterNumber).toBe(2);
    expect(units[2].title).toBe('Passos no Escuro');
  });

  it('5. buildNarrationUnits conserva as falas separadas e invalida o cache ao trocar a voz', () => {
    const manuscript = {
      title: 'Livro',
      chapters: [{
        title: 'Capítulo um',
        text: 'Ana entrou. — Quem está aí? — perguntou ela.',
        speakerSegments: [
          { speakerId: 'narrator', text: 'Ana entrou. ', voiceId: 'voice-narrator' },
          { speakerId: 'ana', text: '— Quem está aí? — perguntou ela.', voiceId: 'voice-ana' }
        ]
      }]
    };

    const units = buildNarrationUnits(manuscript, 'pt-BR');
    const chapter = units[1];
    expect(chapter.segments).toEqual([
      { text: 'Capítulo 1. Capítulo um.', voiceId: 'voice-narrator' },
      { text: 'Ana entrou.', voiceId: 'voice-narrator' },
      { text: 'Quem está aí?, perguntou ela.', voiceId: 'voice-ana' }
    ]);
    expect(chapter.text).toContain('Quem está aí?');

    const changedVoiceUnits = buildNarrationUnits({
      ...manuscript,
      chapters: [{
        ...manuscript.chapters[0],
        speakerSegments: manuscript.chapters[0].speakerSegments.map((segment, index) => ({
          ...segment,
          voiceId: index === 1 ? 'voice-ana-alt' : segment.voiceId
        }))
      }]
    }, 'pt-BR');
    expect(changedVoiceUnits[1].hash).not.toBe(chapter.hash);
  });

  it('applies the selected narrator voice to chapter headings and chapters without cast segments', () => {
    const units = buildNarrationUnits({
      title: 'Livro',
      narratorVoiceId: 'edge:pt-BR-AntonioNeural',
      chapters: [
        { title: 'Sem elenco', text: 'Texto narrado.' },
        {
          title: 'Com personagem',
          text: 'Ana respondeu.',
          speakerSegments: [{ speakerId: 'ana', text: 'Ana respondeu.', voiceId: 'fish:ana-model' }]
        }
      ]
    }, 'pt-BR');

    expect(units[1].segments).toEqual([{
      text: 'Capítulo 1. Sem elenco.\n\nTexto narrado.',
      voiceId: 'edge:pt-BR-AntonioNeural'
    }]);
    expect(units[2].segments).toEqual([
      { text: 'Capítulo 2. Com personagem.', voiceId: 'edge:pt-BR-AntonioNeural' },
      { text: 'Ana respondeu.', voiceId: 'fish:ana-model' }
    ]);
  });
});
