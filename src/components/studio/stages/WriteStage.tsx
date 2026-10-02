import React, { useState } from 'react';
import { BookProject } from '../../../types/book-project';
import { VisualBookEditor } from '../VisualBookEditor';
import { ChapterIndividualEditor } from '../ChapterIndividualEditor';
import { EditorialReviewView } from '../EditorialReviewView';
import { BookLayoutPreview } from '../BookLayoutPreview';
import { BookOpen, CheckSquare, Layers, Layout, AlertCircle } from 'lucide-react';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  onOpenMemoryModal: () => void;
  onOpenPreview: () => void;
  initialChapterIndex?: number;
  onNavigateToFinish?: () => void;
}

type WriteSubMode = 'chapters' | 'review' | 'layout' | 'visual_pages';

export const WriteStage: React.FC<Props> = ({
  project,
  onUpdateProject,
  onOpenMemoryModal,
  onOpenPreview,
  initialChapterIndex,
  onNavigateToFinish
}) => {
  const [subMode, setSubMode] = useState<WriteSubMode>('chapters');

  // Métricas do manuscrito
  const chaptersCount = project.kdpChapters?.length || 0;
  const approvedChapters = project.kdpChapters?.filter(c => c.editorialStatus === 'APROVADO').length || 0;
  const totalWords = project.kdpChapters?.reduce((acc, c) => acc + (c.wordCount || 0), 0) || 0;

  return (
    <div className="write-stage-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sub-Navegação Editorial da Etapa de Escrita */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        gap: 12,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setSubMode('chapters')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 8,
              border: subMode === 'chapters' ? '1px solid #38bdf8' : '1px solid #334155',
              backgroundColor: subMode === 'chapters' ? '#0369a1' : '#1e293b',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <BookOpen size={16} />
            1. Escrita dos Capítulos ({approvedChapters}/{chaptersCount})
          </button>

          <button
            onClick={() => setSubMode('review')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 8,
              border: subMode === 'review' ? '1px solid #38bdf8' : '1px solid #334155',
              backgroundColor: subMode === 'review' ? '#0369a1' : '#1e293b',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <CheckSquare size={16} />
            2. Revisão Ortográfica & Continuidade
          </button>

          <button
            onClick={() => setSubMode('layout')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 8,
              border: subMode === 'layout' ? '1px solid #38bdf8' : '1px solid #334155',
              backgroundColor: subMode === 'layout' ? '#0369a1' : '#1e293b',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Layout size={16} />
            3. Diagramação & Paginação Real KDP
          </button>

          <button
            onClick={() => setSubMode('visual_pages')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 8,
              border: subMode === 'visual_pages' ? '1px solid #38bdf8' : '1px solid #334155',
              backgroundColor: subMode === 'visual_pages' ? '#0369a1' : '#1e293b',
              color: '#94a3b8',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Layers size={16} />
            4. Editor Visual de Páginas
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Palavras: <strong style={{ color: '#38bdf8' }}>{totalWords.toLocaleString('pt-BR')}</strong>
          </span>
          <span style={{
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 6,
            backgroundColor: approvedChapters === chaptersCount && chaptersCount > 0 ? '#065f46' : '#854d0e',
            color: '#ffffff',
            fontWeight: 600
          }}>
            {approvedChapters === chaptersCount && chaptersCount > 0
              ? '✓ Manuscrito Aprovado'
              : `${approvedChapters} de ${chaptersCount} aprovados`}
          </span>
        </div>
      </div>

      {/* Área de Conteúdo Conforme Sub-Modo */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {subMode === 'chapters' && (
          <ChapterIndividualEditor
            project={project}
            onUpdateProject={onUpdateProject}
            initialChapterIndex={initialChapterIndex}
            onNavigateToReview={() => setSubMode('review')}
          />
        )}

        {subMode === 'review' && (
          <EditorialReviewView
            project={project}
            onUpdateProject={onUpdateProject}
            onNavigateToLayout={() => setSubMode('layout')}
          />
        )}

        {subMode === 'layout' && (
          <BookLayoutPreview
            project={project}
            onUpdateProject={onUpdateProject}
            onNavigateToNextStage={onNavigateToFinish}
          />
        )}

        {subMode === 'visual_pages' && (
          <div className="stage-wrapper stage-wrapper-full">
            <VisualBookEditor
              project={project}
              onUpdateProject={onUpdateProject}
              onOpenMemoryModal={onOpenMemoryModal}
              onOpenPreview={onOpenPreview}
              initialChapterIndex={initialChapterIndex}
            />
          </div>
        )}
      </div>
    </div>
  );
};
