import { describe, it, expect, vi } from 'vitest';
import {
  construirPromptEstruturadoReplicate,
  ReplicateCoverPipelineParams
} from '../src/services/replicate-book-cover-pipeline';

describe('Replicate Book Cover Pipeline & Voice Commands', () => {
  it('1. Deve gerar prompt estruturado em inglês para o Replicate coerente com o gênero Finanças / Negócios', () => {
    const params: ReplicateCoverPipelineParams = {
      titulo: 'Liberdade Financeira Sem Segredos',
      subtitulo: 'O método comprovado para construir patrimônio e viver de renda passiva',
      autor: 'Carlos Silveira',
      genero: 'Finanças e Negócios',
      premissa: 'Guia definitivo para construir patrimônio sólido, investir com segurança e conquistar a independência financeira.',
      numeroPaginas: 120
    };

    const prompt = construirPromptEstruturadoReplicate(params);

    // Deve ser em inglês
    expect(prompt).toMatch(/masterpiece (cinematic scene|book cover) background visual art/i);
    // Deve refletir a estética prestígio corporativo / arquitetura
    expect(prompt).toMatch(/architectural glass|corporate monolith|prestige|geometry/i);
    // Deve conter espaço negativo no topo para título e na base para autor/subtítulo
    expect(prompt).toMatch(/clean negative space across the upper third for headline book title/i);
    expect(prompt).toMatch(/clean uncluttered lower zone for author name/i);
    // Deve conter proibições estritas anti-letras e anti-selos
    expect(prompt).toMatch(/ABSOLUTELY NO TEXT/i);
    expect(prompt).toMatch(/NO LETTERS/i);
    expect(prompt).toMatch(/NO WATERMARK/i);
    expect(prompt).toMatch(/NO BADGES/i);
  });

  it('2. Deve gerar prompt estruturado com iluminação e atmosfera noir para o gênero Thriller / Suspense', () => {
    const params: ReplicateCoverPipelineParams = {
      titulo: 'Sombras no Asfalto',
      subtitulo: 'Um detetive solitário em busca da verdade nas noites de chuva',
      autor: 'Arthur Mendez',
      genero: 'Thriller e Suspense',
      premissa: 'Um assassinato misterioso ocorre em um beco escuro durante uma tempestade noturna.'
    };

    const prompt = construirPromptEstruturadoReplicate(params);

    expect(prompt).toMatch(/neo-noir/i);
    expect(prompt).toMatch(/chiaroscuro/i);
    expect(prompt).toMatch(/rain-slicked|metropolitan|boulevard/i);
    expect(prompt).toMatch(/upper third/i);
    expect(prompt).toMatch(/ABSOLUTELY NO TEXT/i);
  });

  it('3. Deve gerar prompt lúdico e seguro para obras infantis', () => {
    const params: ReplicateCoverPipelineParams = {
      titulo: 'O Ursinho Curioso',
      subtitulo: 'Uma grande aventura na floresta encantada',
      autor: 'Mariana Luz',
      genero: 'Infantil Ilustrado',
      bookType: 'children-picture-book',
      faixaEtaria: '3-5 anos'
    };

    const prompt = construirPromptEstruturadoReplicate(params);

    expect(prompt).toMatch(/storybook cover illustration for children/i);
    expect(prompt).toMatch(/Pixar 3D animated|watercolor/i);
    expect(prompt).toMatch(/zero dark, grim or spooky/i);
    expect(prompt).toMatch(/uncluttered upper portion and bottom zone/i);
  });

  it('4. Deve capturar comandos de voz do usuário relacionados ao Replicate, capa e contracapa', () => {
    const coverVoiceRegex = /replicate|gerar capa|criar capa|fazer capa|fa[çc]a a capa|crie a capa|gerar a capa|capa oficial|capa e contracapa|duas capas|contracapa|wrap completo|wrap kdp|capa do livro|capa autoral|mudar capa|nova capa|desenhar capa/i;

    expect(coverVoiceRegex.test('gere a capa com o replicate')).toBe(true);
    expect(coverVoiceRegex.test('crie a capa e contracapa')).toBe(true);
    expect(coverVoiceRegex.test('faça a capa do livro')).toBe(true);
    expect(coverVoiceRegex.test('gere a capa oficial')).toBe(true);
    expect(coverVoiceRegex.test('quero duas capas com o wrap')).toBe(true);
    expect(coverVoiceRegex.test('gere o prompt para o replicate')).toBe(true);
    expect(coverVoiceRegex.test('desenhar capa agora')).toBe(true);

    // Frases não relacionadas à capa não devem disparar o comando
    expect(coverVoiceRegex.test('escreva o capítulo 1')).toBe(false);
    expect(coverVoiceRegex.test('como você está hoje')).toBe(false);
  });
});
