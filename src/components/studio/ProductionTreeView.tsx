import React from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  BookOpen, 
  Compass, 
  ListOrdered, 
  Edit3, 
  Layers, 
  Palette, 
  Tag, 
  ShieldCheck, 
  Download, 
  ArrowRight,
  Play,
  Sparkles
} from 'lucide-react';
import { BookProject, IBookChapter } from '../../types/book-project';

interface ProductionTreeViewProps {
  project: BookProject;
  onNavigateToStage: (stageId: string, param?: any) => void;
  onExecutePipelineStage?: (stageId: string) => void;
}

export const ProductionTreeView: React.FC<ProductionTreeViewProps> = ({
  project,
  onNavigateToStage,
  onExecutePipelineStage
}) => {
  const chapters = project.kdpChapters || [];
  const completedChaptersCount = chapters.filter(c => c.prose && c.prose.trim().length > 100).length;
  const isConceptDone = Boolean(project.kdpConcept?.title?.trim());
  const isBibleDone = Boolean(project.kdpBible || project.bookMemory);
  const isOutlineDone = Boolean(chapters.length > 0);
  const isWritingDone = chapters.length > 0 && completedChaptersCount === chapters.length;
  const isEditingDone = Boolean(project.kdpEditorReport);
  const isTypesettingDone = Boolean(project.visualPages && project.visualPages.length > 0);
  const isCoverDone = Boolean(project.kdpCoverDesign?.geometry);
  const isMetadataDone = Boolean(project.kdpMetadata?.keywords7 && project.kdpMetadata.keywords7.length === 7);
  const isValidationDone = Boolean(project.kdpQualityReport?.passed);
  const isExportDone = Boolean(project.kdpPackageGeneratedAt);

  // Calcula % geral de produção
  const stepsList = [
    isConceptDone,
    isBibleDone,
    isOutlineDone,
    isWritingDone,
    isEditingDone,
    isTypesettingDone,
    isCoverDone,
    isMetadataDone,
    isValidationDone,
    isExportDone
  ];
  const progressPct = Math.round((stepsList.filter(Boolean).length / stepsList.length) * 100);

  const renderStatusIcon = (isDone: boolean, inProgress?: boolean, hasWarning?: boolean) => {
    if (isDone) return <CheckCircle2 size={16} className="text-emerald-400" />;
    if (inProgress) return <Clock size={16} className="text-amber-400 animate-pulse" />;
    if (hasWarning) return <AlertTriangle size={16} className="text-amber-500" />;
    return <Circle size={16} className="text-slate-500" />;
  };

  return (
    <div className="production-tree-card">
      <div className="tree-header-overview">
        <div className="flex items-center gap-3">
          <div className="tree-book-icon-wrapper">
            <BookOpen size={24} className="text-primary-accent" />
          </div>
          <div>
            <h3 className="tree-project-title">{project.title || 'Livro Sem Título'}</h3>
            <span className="tree-meta-label">
              Linha de Produção Editorial • {project.kdpBookType} • {chapters.length} Capítulos
            </span>
          </div>
        </div>

        <div className="tree-progress-summary">
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span>Progresso da Produção</span>
            <span className={progressPct === 100 ? 'text-emerald-400 font-bold' : 'text-primary-accent'}>
              {progressPct}%
            </span>
          </div>
          <div className="tree-progress-bar-bg">
            <div 
              className="tree-progress-bar-fill" 
              style={{ 
                width: `${progressPct}%`,
                background: progressPct === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : undefined
              }} 
            />
          </div>
        </div>
      </div>

      {/* BANNER DO DIRETOR EDITORIAL AUTÔNOMO COM IA */}
      {progressPct < 100 ? (
        <div className="ai-director-banner">
          <div className="ai-director-info">
            <div className="ai-director-icon">
              <Sparkles size={22} className="text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                  🤖 Diretor Editorial Autônomo com IA
                </span>
                <span className="badge-kdp-gold text-[10px]">Autonomia Total</span>
                <span className="text-xs text-amber-300 font-medium">({progressPct}% concluído)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                A IA pode gerenciar e concluir <strong>todas as etapas restantes da primeira à última página</strong>: Revisão Editorial, Diagramação das Folhas, Arte de Capa, 7 Palavras-chave KDP, Validação e Pacote Final.
              </p>
            </div>
          </div>
          <button 
            className="btn-ai-director-action"
            onClick={() => onExecutePipelineStage?.('complete_all')}
            title="Concluir 100% da linha de produção automaticamente"
          >
            <Play size={14} className="fill-current text-slate-900" />
            <span>⚡ Concluir Toda a Produção com IA (100%)</span>
          </button>
        </div>
      ) : (
        <div className="ai-director-banner completed">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base">
              ✓
            </div>
            <div>
              <span className="font-bold text-sm text-emerald-300 block">
                Obra 100% Gerenciada e Concluída pela IA!
              </span>
              <p className="text-xs text-slate-300">
                Todos os capítulos redigidos, páginas diagramadas no padrão KDP ({project.trimSize || '6x9'}), capa e validações de publicação aprovadas.
              </p>
            </div>
          </div>
          <button 
            className="btn-node-jump" 
            onClick={() => onNavigateToStage('export')}
          >
            Baixar Arquivos Finais →
          </button>
        </div>
      )}

      <div className="tree-nodes-hierarchy">
        {/* NÓ 1: INFORMAÇÕES BÁSICAS & CONCEITO */}
        <div 
          className={`tree-node-item ${isConceptDone ? 'done' : 'pending'}`}
          onClick={() => onNavigateToStage('concept')}
        >
          <div className="node-left">
            {renderStatusIcon(isConceptDone)}
            <Compass size={16} className="node-type-icon text-blue-400" />
            <div className="node-content">
              <span className="node-name">1. Planejamento & Conceito Editorial</span>
              <span className="node-desc">
                {isConceptDone ? `Público: ${project.kdpConcept?.audience} • Promessa definida` : 'Definição da ideia, público e promessa central'}
              </span>
            </div>
          </div>
          <button className="btn-node-jump">Ir para Etapa <ArrowRight size={13} /></button>
        </div>

        {/* NÓ 2: MEMÓRIA & BÍBLIA DO LIVRO */}
        <div 
          className={`tree-node-item ${isBibleDone ? 'done' : 'pending'}`}
          onClick={() => onNavigateToStage('memory')}
        >
          <div className="node-left">
            {renderStatusIcon(isBibleDone)}
            <Layers size={16} className="node-type-icon text-purple-400" />
            <div className="node-content">
              <span className="node-name">2. Memória da Obra (Book Bible & Contexto)</span>
              <span className="node-desc">
                {isBibleDone ? 'Personagens, locais, diretrizes e conceitos estabelecidos' : 'Crie a base de personagens e locais para guiar a IA'}
              </span>
            </div>
          </div>
          <button className="btn-node-jump">Configurar <ArrowRight size={13} /></button>
        </div>

        {/* NÓ 3: ESTRUTURA & SUMÁRIO */}
        <div 
          className={`tree-node-item ${isOutlineDone ? 'done' : 'pending'}`}
          onClick={() => onNavigateToStage('outline')}
        >
          <div className="node-left">
            {renderStatusIcon(isOutlineDone)}
            <ListOrdered size={16} className="node-type-icon text-indigo-400" />
            <div className="node-content">
              <span className="node-name">3. Estrutura & Sumário de Capítulos</span>
              <span className="node-desc">{chapters.length} capítulos planejados no arco narrativo</span>
            </div>
          </div>
          <button className="btn-node-jump">Ver Sumário <ArrowRight size={13} /></button>
        </div>

        {/* NÓS FILHOS DOS CAPÍTULOS */}
        {chapters.length > 0 && (
          <div className="tree-subnodes-branch">
            {chapters.map((ch, idx) => {
              const chDone = Boolean(ch.prose && ch.prose.trim().length > 100);
              const inProgress = ch.status === 'ESCREVENDO';

              return (
                <div 
                  key={idx} 
                  className={`tree-subnode-chapter ${chDone ? 'sub-done' : ''}`}
                  onClick={() => onNavigateToStage('editor', ch.index || idx + 1)}
                >
                  <div className="subnode-left">
                    <span className="tree-branch-line">├──</span>
                    {renderStatusIcon(chDone, inProgress)}
                    <span className="subnode-title">
                      Capítulo {ch.index || idx + 1}: {ch.title}
                    </span>
                  </div>
                  <div className="subnode-meta">
                    <span className="badge-words">{ch.wordCount || 0} palavras</span>
                    {chDone ? (
                      <span className="badge-chapter-ready">✓ Redigido</span>
                    ) : (
                      <span className="badge-chapter-pending">Pendente</span>
                    )}
                    <button className={`btn-tiny-action ${chDone ? 'text-emerald-400 hover:text-emerald-300' : 'text-blue-400'}`}>
                      {chDone ? 'Ler / Editar →' : 'Escrever →'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* NÓ 4: REVISÃO & AUDITORIA */}
        <div 
          className={`tree-node-item ${isEditingDone ? 'done' : 'pending'}`}
          onClick={() => onNavigateToStage('revision')}
        >
          <div className="node-left">
            {renderStatusIcon(isEditingDone)}
            <Edit3 size={16} className="node-type-icon text-pink-400" />
            <div className="node-content">
              <span className="node-name">4. Revisão Editorial & Coerência</span>
              <span className="node-desc">
                {isEditingDone ? 'Auditoria de gramática, consistência e ritmo concluída' : 'Análise de repetições, furos de roteiro e gramática'}
              </span>
            </div>
          </div>
          <button className="btn-node-jump">Auditar <ArrowRight size={13} /></button>
        </div>

        {/* NÓ 5: DIAGRAMAÇÃO & EDITOR VISUAL */}
        <div 
          className={`tree-node-item ${isTypesettingDone ? 'done' : 'pending'}`}
          onClick={() => onNavigateToStage('editor')}
        >
          <div className="node-left">
            {renderStatusIcon(isTypesettingDone)}
            <Layers size={16} className="node-type-icon text-teal-400" />
            <div className="node-content">
              <span className="node-name">5. Diagramação & Editor Visual de Páginas</span>
              <span className="node-desc">
                {isTypesettingDone ? `${project.visualPages?.length} páginas diagramadas no padrão KDP (${project.trimSize || '6x9'})` : 'Ajustar páginas, margens e tipografia'}
              </span>
            </div>
          </div>
          <button className="btn-node-jump">Abrir Editor <ArrowRight size={13} /></button>
        </div>

        {/* NÓ 6: CAPA KDP */}
        <div 
          className={`tree-node-item ${isCoverDone ? 'done' : 'pending'}`}
          onClick={() => onNavigateToStage('cover')}
        >
          <div className="node-left">
            {renderStatusIcon(isCoverDone)}
            <Palette size={16} className="node-type-icon text-amber-400" />
            <div className="node-content">
              <span className="node-name">6. Estúdio de Capa (Frente, Lombada & Contracapa)</span>
              <span className="node-desc">
                {isCoverDone ? `Lombada calculada: ${project.kdpCoverDesign?.geometry.spineWidthInches}" pol.` : 'Projetar capa completa com arte e lombada calculada'}
              </span>
            </div>
          </div>
          <button className="btn-node-jump">Ir para Capa <ArrowRight size={13} /></button>
        </div>

        {/* NÓ 7: METADADOS & SEO KDP */}
        <div 
          className={`tree-node-item ${isMetadataDone ? 'done' : 'pending'}`}
          onClick={() => onNavigateToStage('metadata')}
        >
          <div className="node-left">
            {renderStatusIcon(isMetadataDone)}
            <Tag size={16} className="node-type-icon text-cyan-400" />
            <div className="node-content">
              <span className="node-name">7. Metadados & 7 Palavras-Chave de Busca</span>
              <span className="node-desc">
                {isMetadataDone ? 'Descrição comercial, 7 keywords e categorias prontas' : 'Configurar SEO Amazon e ficha de publicação'}
              </span>
            </div>
          </div>
          <button className="btn-node-jump">Configurar <ArrowRight size={13} /></button>
        </div>

        {/* NÓ 8: VALIDAÇÃO & QUALITY GATE */}
        <div 
          className={`tree-node-item ${isValidationDone ? 'done' : 'pending'}`}
          onClick={() => onNavigateToStage('quality')}
        >
          <div className="node-left">
            {renderStatusIcon(isValidationDone)}
            <ShieldCheck size={16} className="node-type-icon text-emerald-400" />
            <div className="node-content">
              <span className="node-name">8. Validação & Checks de Publicação KDP</span>
              <span className="node-desc">
                {isValidationDone ? 'Todos os checks de qualidade aprovados!' : 'Auditoria automática de páginas vazias, sangria, texto e capas'}
              </span>
            </div>
          </div>
          <button className="btn-node-jump">Ver Checks <ArrowRight size={13} /></button>
        </div>

        {/* NÓ 9: EXPORTAÇÃO */}
        <div 
          className={`tree-node-item ${isExportDone ? 'done' : 'pending'}`}
          onClick={() => onNavigateToStage('export')}
        >
          <div className="node-left">
            {renderStatusIcon(isExportDone)}
            <Download size={16} className="node-type-icon text-blue-500" />
            <div className="node-content">
              <span className="node-name">9. Exportação Final (PDF Interior, Capa, EPUB & ZIP)</span>
              <span className="node-desc">
                {isExportDone ? 'Arquivos gerados e prontos para upload na Amazon KDP' : 'Gere e baixe os arquivos finais para publicação'}
              </span>
            </div>
          </div>
          <button className="btn-node-jump">Exportar <ArrowRight size={13} /></button>
        </div>
      </div>
    </div>
  );
};
