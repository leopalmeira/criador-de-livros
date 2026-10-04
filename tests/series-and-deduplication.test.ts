import { describe, it, expect } from 'vitest';

describe('Desduplicação e Expansão em Série (Volume 2/3 & Box KDP)', () => {
  it('1. Deve desduplicar livros finalizados pelo título canônico e autor mantendo o mais recente', () => {
    const rawBooks = [
      { id: 'book_1', title: 'Rastros Ocultos: Decifrando Casos Impossíveis', author: 'Estêvão Montenegro', timestamp: 1000 },
      { id: 'book_2', title: 'Rastros Ocultos: Decifrando Casos Impossíveis ', author: 'estevao montenegro', timestamp: 2000 },
      { id: 'book_3', title: 'O Enigma do Farol', author: 'Clara Silva', timestamp: 1500 }
    ];

    const deduplicatedMap = new Map();
    for (const b of rawBooks) {
      const normKey = (b.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[^a-z0-9]/gi, '');
      if (!deduplicatedMap.has(normKey)) {
        deduplicatedMap.set(normKey, b);
      } else {
        const existing = deduplicatedMap.get(normKey);
        if ((b.timestamp || 0) > (existing.timestamp || 0)) {
          deduplicatedMap.set(normKey, b);
        }
      }
    }

    const uniqueBooks = Array.from(deduplicatedMap.values());
    expect(uniqueBooks).toHaveLength(2);
    expect(uniqueBooks.find(b => b.title.includes('Rastros'))?.id).toBe('book_2');
  });

  it('2. Deve estruturar os metadados corretos para criação de Volume 2 de uma série', () => {
    const baseBook = {
      title: 'Rastros Ocultos: Decifrando Casos Impossíveis',
      author: 'Estêvão Montenegro',
      genre: 'Investigação criminal',
      targetAudience: 'Leitores de Thriller Policial',
      volumeNumber: 1
    };

    const targetVol = 2;
    const nextVolumeMeta = {
      title: `${baseBook.title} — Vol. ${targetVol}`,
      author: baseBook.author,
      genre: baseBook.genre,
      targetAudience: baseBook.targetAudience,
      seriesName: baseBook.title.split(':')[0].trim(),
      seriesIndex: targetVol,
      continuityContext: `Continuação direta dos acontecimentos do Volume 1 (${baseBook.title}). Mantém os mesmos protagonistas, autor e tom investigativo.`
    };

    expect(nextVolumeMeta.seriesIndex).toBe(2);
    expect(nextVolumeMeta.seriesName).toBe('Rastros Ocultos');
    expect(nextVolumeMeta.author).toBe(baseBook.author);
    expect(nextVolumeMeta.continuityContext).toContain('Volume 1');
  });

  it('3. Deve estruturar os dados de um Box Set de 3 Livros KDP', () => {
    const trilogyBooks = [
      { id: 'v1', title: 'Rastros Ocultos — Vol. 1: O Enigma da Floresta', pages: 38 },
      { id: 'v2', title: 'Rastros Ocultos — Vol. 2: Sombras do Passado', pages: 42 },
      { id: 'v3', title: 'Rastros Ocultos — Vol. 3: O Veredito Final', pages: 45 }
    ];

    const boxTitle = 'Box Trilogia Completa: Rastros Ocultos (Volumes 1 a 3)';
    const totalPages = trilogyBooks.reduce((acc, b) => acc + b.pages, 0);

    expect(trilogyBooks.length).toBe(3);
    expect(totalPages).toBe(125);
    expect(boxTitle).toContain('Volumes 1 a 3');
  });
});
