import { describe, expect, it, vi } from 'vitest';
import {
  CoAuthorWorkflowService
} from '../src/services/coauthor-workflow-service';

vi.mock('../src/services/kdp-ai-engine', () => ({
  chamarGeminiTexto: vi.fn(async () => ({
    texto: 'Kate Hanson é especialista em Organização do Lar e mãe de dois filhos. Com mais de 10 anos testando métodos eficientes, sua missão é ensinar como manter a casa impecável com apenas 10 minutos diários de micro-vitórias.',
    modelo: 'gemini-1.5-flash'
  }))
}));

describe('CoAuthor Workflow Service (Metodologia Sean Dollwet)', () => {
  it('define os 13 passos canônicos do CoAuthor na ordem correta', () => {
    const steps = CoAuthorWorkflowService.getStepList();
    expect(steps).toHaveLength(13);
    expect(steps[0].slug).toBe('research');
    expect(steps[1].slug).toBe('analysis');
    expect(steps[2].slug).toBe('book-title');
    expect(steps[3].slug).toBe('resources');
    expect(steps[4].slug).toBe('author-persona');
    expect(steps[5].slug).toBe('proposed-book');
    expect(steps[6].slug).toBe('details');
    expect(steps[7].slug).toBe('author-bio');
    expect(steps[8].slug).toBe('outline');
    expect(steps[9].slug).toBe('write');
    expect(steps[10].slug).toBe('description');
    expect(steps[11].slug).toBe('book-cover');
    expect(steps[12].slug).toBe('finish');
  });

  it('cria o estado inicial com os valores de pesquisa e diferenciais configurados', () => {
    const state = CoAuthorWorkflowService.createInitialState({
      bookTopic: 'Decluttering & Organização',
      authorName: 'Kate Hanson',
      genre: 'Autoajuda / Produtividade',
      topicStance: 'Menos de 10 minutos por dia é suficiente',
      uniqueStandout: 'Foco em micro-vitórias tangíveis para mães ocupadas'
    });

    expect(state.currentStep).toBe(1);
    expect(state.bookTopic).toBe('Decluttering & Organização');
    expect(state.authorName).toBe('Kate Hanson');
    expect(state.topicStance).toContain('10 minutos');
    expect(state.uniqueStandout).toContain('micro-vitórias');
    expect(state.resources).toHaveLength(0);
    expect(state.competitors).toHaveLength(0);
  });

  it('retorna livros concorrentes relevantes com fetchMarketCompetitors', async () => {
    const results = await CoAuthorWorkflowService.fetchMarketCompetitors(
      'decluttering',
      'Autoajuda'
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('title');
    expect(results[0]).toHaveProperty('author');
  });

  it('constrói a biografia oficial do autor através de IA', async () => {
    const bio = await CoAuthorWorkflowService.generateAuthorBio({
      authorName: 'Kate Hanson',
      isPenName: true,
      background: 'Mãe de dois filhos e pesquisadora de rotinas',
      credentials: 'Criadora do método de 10 minutos',
      topic: 'Organização do Lar'
    });

    expect(bio).toBeTruthy();
    expect(bio).toContain('Kate Hanson');
    expect(bio.length).toBeGreaterThan(50);
  });
});
