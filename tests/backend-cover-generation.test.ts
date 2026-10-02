import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { BackendCoverService, CoverGenerationPayload } from '../src/services/backend-cover-service';

describe('BackendCoverService - Sistema Exclusivo de Capas do Livro', () => {
  const createdTestProjects: string[] = [];

  afterAll(() => {
    // Limpeza de pastas de teste criadas
    for (const projId of createdTestProjects) {
      const dir = path.resolve(process.cwd(), 'covers', projId);
      if (fs.existsSync(dir)) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch {}
      }
    }
  });

  it('1. Constrói prompt editorial profissional com título, autor e especificações comerciais', () => {
    const payload: CoverGenerationPayload = {
      projectId: 'test_proj_prompt',
      version: 1,
      title: 'Hábitos Atômicos Para Produtividade',
      subtitle: 'O Método Definitivo para Foco Diário',
      author: 'Lucas S. Ferreira',
      genre: 'Autoajuda & Negócios',
      category: 'Produtividade Pessoal',
      targetAudience: 'Empreendedores e Profissionais',
      synopsis: 'Um guia prático sobre como pequenos ajustes diários constroem disciplina inabalável.',
      context: 'Best-seller KDP focado no mercado americano e global',
      keywords: ['foco', 'rotina', 'disciplina']
    };

    const prompt = BackendCoverService.buildArtDirectionPrompt(payload, 1);

    // Valida requisitos obrigatórios das seções 8, 9, 10 e 11
    expect(prompt.toUpperCase()).toContain('HÁBITOS ATÔMICOS PARA PRODUTIVIDADE');
    expect(prompt).toContain('O Método Definitivo para Foco Diário');
    expect(prompt).toContain('Lucas S. Ferreira');
    expect(prompt).toContain('Autoajuda & Negócios');
    expect(prompt).toContain('vertical 2:3 aspect ratio');
    expect(prompt).toContain('VISUAL ART DIRECTION');
    expect(prompt).toContain('COMPOSITION REQUIREMENTS');
  });

  it('2. Executa geração no backend, armazena no storage e persiste metadados em covers/{projectId}/', async () => {
    const projectId = 'test_proj_cover_storage';
    createdTestProjects.push(projectId);

    const payload: CoverGenerationPayload = {
      projectId,
      version: 1,
      title: 'A Arte da Calma',
      subtitle: 'Como Manter o Equilíbrio no Caos',
      author: 'Renata Albuquerque',
      genre: 'Não-Ficção',
      category: 'Desenvolvimento Pessoal',
      targetAudience: 'Adultos ocupados',
      synopsis: 'Estratégias mentais para preservar clareza e paz sob pressão.',
      context: 'Mercado de não-ficção contemporâneo',
      keywords: ['mindfulness', 'calma', 'resiliência']
    };

    const initial = await BackendCoverService.startCoverGeneration(payload);
    expect(initial.jobId).toBeDefined();
    expect(initial.projectId).toBe(projectId);

    // Aguarda o término da geração (job em segundo plano)
    let finalJob = BackendCoverService.getJobStatus(initial.jobId);
    let attempts = 0;
    while (finalJob && finalJob.status !== 'completed' && finalJob.status !== 'failed' && attempts < 80) {
      await new Promise(r => setTimeout(r, 200));
      finalJob = BackendCoverService.getJobStatus(initial.jobId);
      attempts++;
    }

    expect(finalJob?.status).toBe('completed');
    expect(finalJob?.cover).toBeDefined();

    const cover = finalJob!.cover!;
    expect(cover.projectId).toBe(projectId);
    expect(cover.version).toBe(1);
    expect(cover.title).toBe('A Arte da Calma');
    expect(cover.author).toBe('Renata Albuquerque');
    expect(cover.fileUrl).toContain(`/api/covers/${projectId}/`);
    expect(cover.selected).toBe(true);

    // Verifica integridade dos arquivos no disco
    const coversBaseDir = path.resolve(process.cwd(), 'covers', projectId);
    const metadataPath = path.join(coversBaseDir, 'metadata.json');
    expect(fs.existsSync(metadataPath)).toBe(true);

    const metadataContent = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    expect(metadataContent.length).toBe(1);
    expect(metadataContent[0].id).toBe(cover.id);

    const imageFile = path.resolve(cover.filePath);
    expect(fs.existsSync(imageFile)).toBe(true);
  }, 25000);

  it('3. Gera múltiplas versões e permite selecionar a capa oficial sem perda (Regras 12, 17 e 18)', async () => {
    const projectId = 'test_proj_cover_multi';
    createdTestProjects.push(projectId);

    // Gera versão 1
    const p1: CoverGenerationPayload = {
      projectId,
      version: 1,
      title: 'Liderança Consciente',
      author: 'Carlos Andrade',
      genre: 'Negócios'
    };
    const j1 = await BackendCoverService.startCoverGeneration(p1);
    while (BackendCoverService.getJobStatus(j1.jobId)?.status !== 'completed') {
      await new Promise(r => setTimeout(r, 150));
    }

    // Gera versão 2
    const p2: CoverGenerationPayload = {
      projectId,
      version: 2,
      title: 'Liderança Consciente',
      author: 'Carlos Andrade',
      genre: 'Negócios'
    };
    const j2 = await BackendCoverService.startCoverGeneration(p2);
    while (BackendCoverService.getJobStatus(j2.jobId)?.status !== 'completed') {
      await new Promise(r => setTimeout(r, 150));
    }

    const covers = BackendCoverService.getProjectCovers(projectId);
    expect(covers.length).toBe(2);
    expect(covers[0].version).toBe(1);
    expect(covers[1].version).toBe(2);

    // Seleciona a capa 2 como oficial
    const cover2Id = covers[1].id;
    const selectedCover = BackendCoverService.selectCover(projectId, cover2Id);
    expect(selectedCover).toBeDefined();
    expect(selectedCover?.selected).toBe(true);

    // Verifica que a capa 1 foi desmarcada e a capa 2 é a oficial
    const updatedCovers = BackendCoverService.getProjectCovers(projectId);
    const updated1 = updatedCovers.find(c => c.version === 1);
    const updated2 = updatedCovers.find(c => c.version === 2);
    expect(updated1?.selected).toBe(false);
    expect(updated2?.selected).toBe(true);
  }, 35000);

  it('4. Bloqueia gerações simultâneas para o mesmo projeto (Regra 21: Prevenção de duplicidade)', async () => {
    const projectId = 'test_proj_cover_dup';
    createdTestProjects.push(projectId);

    const payload: CoverGenerationPayload = {
      projectId,
      version: 1,
      title: 'Teste de Concorrência',
      author: 'Autor Teste'
    };

    // Inicia a primeira tarefa
    await BackendCoverService.startCoverGeneration(payload);

    // Tenta iniciar uma segunda tarefa simultânea enquanto a primeira ainda está rodando
    await expect(BackendCoverService.startCoverGeneration(payload)).rejects.toThrow(
      'Já existe uma geração de capa em andamento para este projeto.'
    );
  }, 20000);
});
