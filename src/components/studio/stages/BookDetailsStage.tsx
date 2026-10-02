import React, { useState } from 'react';
import { BookProject } from '../../../types/book-project';
import { BookDetailsData, getDefaultStageStatuses } from '../../../types/stages';
import { ShowMeTheStoryEngine, StoryBudget } from '../../../services/show-me-the-story-engine';
import { Sparkles, Sliders, BookOpen, Layers, Check } from 'lucide-react';
import { EditorialControlBar } from '../EditorialControlBar';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  onContinue?: () => void;
  onPrev?: () => void;
}

const WORD_COUNT_OPTIONS = [
  { label: '10.000 - 15.000 palavras (~60-90 págs)', value: '10k-15k', pages: 80 },
  { label: '15.000 - 20.000 palavras (~90-120 págs)', value: '15k-20k', pages: 110 },
  { label: '20.000 - 25.000 palavras (~120-150 págs)', value: '20k-25k', pages: 140 },
  { label: '25.000 - 35.000 palavras (~150-200 págs)', value: '25k-35k', pages: 180 },
  { label: '35.000 - 50.000 palavras (~200-300 págs)', value: '35k-50k', pages: 250 },
];

const STRUCTURE_OPTIONS = [
  { value: 'problem-solution', label: 'Problema & Solução (Show Me The Story)', desc: 'Ideal para livros de negócios, finanças, produtividade e autoajuda prática.' },
  { value: 'narrative', label: 'Jornada em 3 Atos (Nigh Beat Sheet)', desc: 'Ideal para romances, suspense, ficção policial, biografias e histórias imersivas.' },
  { value: 'chronological', label: 'Cronológica Passo a Passo', desc: 'Ideal para guias de jornada, métodos em fases e processos sequenciais.' },
  { value: 'topical', label: 'Temática por Pilares', desc: 'Ideal para manuais de referência, enciclopédias e compilações técnicas.' },
  { value: 'compare-contrast', label: 'Comparação & Desmistificação', desc: 'Ideal para quebra de mitos, contrapontos e análises críticas de mercado.' },
];

export const BookDetailsStage: React.FC<Props> = ({ project, onUpdateProject, onContinue, onPrev }) => {
  const [exactPages, setExactPages] = useState<number>(
    project.estimatedPages || project.actualPages || 150
  );

  const budget: StoryBudget = ShowMeTheStoryEngine.calculateStoryBudget(exactPages);

  const data: BookDetailsData = project.stageData?.['book-details'] || {
    wordCount: '20k-25k',
    chapterCount: budget.chapterCount,
    bookStructure: 'problem-solution',
    additionalNotes: ''
  };

  const isApproved = project.stageStatuses?.['book-details'] === 'APROVADO' ||
                     project.editorialStageApprovals?.['book-details']?.status === 'APROVADO';

  const handleApprove = () => {
    const updated: BookProject = {
      ...project,
      stageStatuses: {
        ...(project.stageStatuses || getDefaultStageStatuses()),
        'book-details': 'COMPLETED'
      },
      editorialStageApprovals: {
        ...(project.editorialStageApprovals || {}),
        'book-details': {
          stageId: 'book-details',
          status: 'APROVADO',
          approvedAt: Date.now(),
          approvedBy: 'user',
          notes: `Ficha editorial aprovada com meta de ${exactPages} páginas e estrutura ${data.bookStructure}.`
        }
      }
    };
    onUpdateProject(updated);
  };

  const updateData = (updates: Partial<BookDetailsData>, newPages?: number) => {
    const updatedPages = newPages || exactPages;
    const newBudget = ShowMeTheStoryEngine.calculateStoryBudget(updatedPages);
    const updated = { 
      ...data, 
      ...updates,
      chapterCount: updates.chapterCount || newBudget.chapterCount
    };

    onUpdateProject({
      ...project,
      estimatedPages: updatedPages,
      actualPages: updatedPages,
      targetPages: updatedPages,
      targetWordCount: newBudget.totalWords,
      stageData: { ...(project.stageData || {}), 'book-details': updated },
      stageStatuses: { ...(project.stageStatuses || {}), 'book-details': 'IN_PROGRESS' }
    } as BookProject);
  };

  const handleApplyStoryBudget = () => {
    const fullProj = ShowMeTheStoryEngine.generateStoryBook(project, exactPages);
    onUpdateProject(fullProj);
  };

  return (
    <div className="stage-form-container">
      {/* BARRA DE CONTROLE EDITORIAL */}
      <EditorialControlBar
        stageId="book-details"
        stageLabel="Ficha Editorial & Extensão da Obra"
        status={isApproved ? 'APROVADO' : exactPages > 0 ? 'AGUARDANDO_APROVACAO' : 'PENDENTE'}
        isApproved={isApproved}
        canApprove={exactPages > 0 && data.chapterCount >= 3}
        approveButtonText={isApproved ? '✓ FICHA EDITORIAL APROVADA' : 'APROVAR FICHA EDITORIAL'}
        onPrev={onPrev}
        onNext={isApproved ? onContinue : undefined}
        onApprove={handleApprove}
      />

      <div className="stage-intro-block" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3>Ficha Técnica & Quantidade de Páginas da História</h3>
            <p>Escolha exatamente quantas páginas a obra terá. O motor dimensiona os capítulos, palavras por página e margens KDP automaticamente.</p>
          </div>
          <span className="badge-kdp-intel" style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
            Powered by Show Me The Story
          </span>
        </div>
      </div>

      {/* SELETOR INTERATIVO DE QUANTIDADE EXATA DE PÁGINAS */}
      <div className="panel-section-card" style={{ marginBottom: 20, border: '2px solid #3b82f6', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={18} color="#2563eb" />
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              Meta de Extensão Exata do Livro: <span style={{ color: '#2563eb', fontSize: 18 }}>{exactPages} Páginas</span>
            </h4>
          </div>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Formato KDP: {project.trimSize || '6" x 9"'}</span>
        </div>

        {/* Range Slider */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="range"
            min={40}
            max={350}
            step={10}
            value={exactPages}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 150;
              setExactPages(val);
              updateData({}, val);
            }}
            style={{ width: '100%', height: 6, accentColor: '#2563eb', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            <span>40 págs (Pocket / Guia Rápido)</span>
            <span>150 págs (Bestseller Comercial)</span>
            <span>250 págs (Obra Aprofundada)</span>
            <span>350 págs (Romance Épico)</span>
          </div>
        </div>

        {/* Grid de Estatísticas em Tempo Real */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
          <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Palavras Totais</span>
            <strong style={{ fontSize: 15, color: '#0f172a' }}>~{budget.totalWords.toLocaleString()}</strong>
          </div>
          <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Capítulos Ideais</span>
            <strong style={{ fontSize: 15, color: '#0f172a' }}>{budget.chapterCount} Capítulos</strong>
          </div>
          <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Média por Capítulo</span>
            <strong style={{ fontSize: 15, color: '#0f172a' }}>~{budget.wordsPerChapter.toLocaleString()} pal.</strong>
          </div>
          <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Lombada KDP</span>
            <strong style={{ fontSize: 15, color: '#0f172a' }}>{budget.spineWidthInches}" (~{(budget.spineWidthInches * 25.4).toFixed(1)}mm)</strong>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary-action"
          onClick={handleApplyStoryBudget}
          style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', padding: '10px 16px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Sparkles size={16} /> Aplicar Orçamento de {exactPages} Páginas e Gerar História Completa com IA
        </button>
      </div>

      <div className="form-group">
        <label className="form-label">
          Extensão por Faixas de Volume
          <span className="label-hint">Selecione uma faixa pré-definida ou use o slider acima</span>
        </label>
        <div className="radio-card-grid">
          {WORD_COUNT_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`radio-card ${data.wordCount === opt.value ? 'selected' : ''}`}
              onClick={() => {
                setExactPages(opt.pages);
                updateData({ wordCount: opt.value }, opt.pages);
              }}
            >
              <input
                type="radio"
                name="wordCount"
                value={opt.value}
                checked={data.wordCount === opt.value}
                readOnly
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          Número Sugerido de Capítulos
          <span className="label-hint">Geralmente entre 8 e 14 capítulos para melhor retenção e ritmo de leitura</span>
        </label>
        <input
          type="number"
          className="form-input form-input-narrow"
          min={3}
          max={35}
          value={data.chapterCount}
          onChange={(e) => updateData({ chapterCount: parseInt(e.target.value) || 10 })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Arquitetura Estrutural do Livro</label>
        <div className="structure-options">
          {STRUCTURE_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`structure-option-card ${data.bookStructure === opt.value ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="structure"
                value={opt.value}
                checked={data.bookStructure === opt.value}
                onChange={() => updateData({ bookStructure: opt.value })}
              />
              <div>
                <strong>{opt.label}</strong>
                <span className="structure-desc">{opt.desc}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          Diretrizes & Observações Adicionais
          <span className="label-optional">(opcional)</span>
        </label>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Ex: Cada capítulo deve terminar com uma caixa de ação prática e 3 perguntas para reflexão..."
          value={data.additionalNotes}
          onChange={(e) => updateData({ additionalNotes: e.target.value })}
        />
      </div>
    </div>
  );
};
