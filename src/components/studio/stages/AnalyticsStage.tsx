import React, { useState } from 'react';
import { BookProject } from '../../../types/book-project';
import { AnalyticsData, MarketReference, getDefaultStageStatuses, BookTitlesData, PurposeData } from '../../../types/stages';
import { AiService } from '../../../services/ai-service';
import { Trash2, ChevronDown, ChevronUp, Plus, Search, BarChart3, ExternalLink, Sparkles } from 'lucide-react';
import { BoxSuggestionService } from '../../../services/box-suggestion-service';
import { CategoryIntelligencePanel } from '../category-intel/CategoryIntelligencePanel';
import { BookOpportunityProposal } from '../../../types/category-intelligence';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  aiService: AiService;
}

export const AnalyticsStage: React.FC<Props> = ({ project, onUpdateProject, aiService }) => {
  const data: AnalyticsData = project.stageData?.analytics || {
    marketReferences: [],
    analysisNotes: '',
    aiAnalysisSummary: ''
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newBookUrl, setNewBookUrl] = useState('');

  const updateData = (updates: Partial<AnalyticsData>) => {
    const updated = { ...data, ...updates };
    onUpdateProject({
      ...project,
      stageData: { ...(project.stageData || {}), analytics: updated },
      stageStatuses: { ...(project.stageStatuses || {}), analytics: 'IN_PROGRESS' }
    } as BookProject);
  };

  const removeReference = (id: string) => {
    updateData({
      marketReferences: data.marketReferences.filter(r => r.id !== id)
    });
  };

  const addManualReference = () => {
    if (!newBookUrl.trim()) return;
    const newRef: MarketReference = {
      id: `ref_${Date.now()}`,
      title: newBookUrl.trim(),
      author: 'Autor Referência',
      collectedAt: Date.now(),
      url: newBookUrl.startsWith('http') ? newBookUrl : undefined,
      description: 'Livro de referência adicionado manualmente pelo autor.'
    };
    updateData({
      marketReferences: [...data.marketReferences, newRef]
    });
    setNewBookUrl('');
  };

  const generateAnalysis = async () => {
    setIsGenerating(true);
    try {
      const topic = project.stageData?.research?.topic || project.topic || 'Não-Ficção';
      const genre = project.stageData?.research?.genre || project.kdpBookType || 'non-fiction';
      
      const prompt = `Analise o mercado editorial da Amazon para um livro de ${genre} com o tópico "${topic}".
Encontre 5 a 8 livros concorrentes reais de maior sucesso e mais vendidos (bestsellers) neste nicho.
Para cada livro informe:
- title: título real consagrado na Amazon
- author: autor consagrado
- description: síntese da proposta de valor do livro
- narrativeStructure: estrutura narrativa ou arquitetura de capítulos empregada
- openingHook: gancho de abertura e promessa primária
- commercialPositioning: posicionamento no ranking KDP
- ethicalInspirationGuideline: diretriz de inspiração ética para criar uma obra 100% original sem cópia ou plágio
- bsr: ranking BSR estimado (número entre 5 e 80)
- rating: nota média (entre 4.2 e 4.9)
- reviewCount: quantidade de avaliações (ex: 45000)
- url: link do produto na Amazon (ex: https://www.amazon.com/dp/B07D23CFGR)

Retorne como um JSON array com esses campos exatos. Retorne exclusivamente o array JSON.`;

      const response = await aiService.generateText(prompt);
      try {
        const parsed = JSON.parse(response.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
        const refs: MarketReference[] = (Array.isArray(parsed) ? parsed : []).map((item: any, i: number) => ({
          id: `ref_${Date.now()}_${i}`,
          title: item.title || 'Livro de Referência',
          author: item.author || 'Autor Consagrado',
          description: item.description || '',
          narrativeStructure: item.narrativeStructure || 'Desenvolvimento progressivo com ancoragem em conceitos centrais e aplicações práticas.',
          openingHook: item.openingHook || 'Problematização imediata da dor do leitor acompanhada de uma promessa de transformação tangível.',
          commercialPositioning: item.commercialPositioning || 'Best-seller consolidado no topo do nicho com apelo contínuo no KDP.',
          ethicalInspirationGuideline: item.ethicalInspirationGuideline || 'Utilizar apenas o arquétipo de problema e solução como estímulo criativo, redigindo 100% dos exemplos e voz autoral inéditos.',
          bsr: typeof item.bsr === 'number' ? item.bsr : 25,
          rating: typeof item.rating === 'number' ? item.rating : 4.7,
          reviewCount: typeof item.reviewCount === 'number' ? item.reviewCount : 15000,
          url: item.url || (item.asin ? `https://www.amazon.com/dp/${item.asin}` : undefined),
          collectedAt: Date.now(),
          selectionReason: 'Análise de concorrência e referências de mercado KDP gerada por IA'
        }));
        updateData({
          marketReferences: refs,
          aiAnalysisSummary: `Foram identificados ${refs.length} livros de alta relevância no nicho "${topic}" com análise de desenvolvimento editorial.`
        });
      } catch {
        updateData({ aiAnalysisSummary: response });
      }
    } catch (err: any) {
      console.error('Erro ao gerar análise de mercado:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyOpportunity = (
    opp: BookOpportunityProposal, 
    genre: string, 
    category: string, 
    subcategory: string
  ) => {
    const currentNotes = data.analysisNotes || '';
    const newNotes = `${currentNotes}\n[Oportunidade Comercial Selecionada]: ${opp.title} - ${opp.subtitle}\nPosicionamento: ${opp.positioning}\nGancho: ${opp.commercialHook}\nDireção de Capa: ${opp.coverArtDirection}`.trim();

    const baseStatuses = project.stageStatuses || getDefaultStageStatuses();
    const existingTitlesData: BookTitlesData = project.stageData?.['book-titles'] || {
      generatedTitles: [],
      selectedTitleId: '',
      customTitle: '',
      customSubtitle: ''
    };
    const existingPurposeData: PurposeData = project.stageData?.purpose || {
      focusTags: [],
      customTags: [],
      generatedProposal: '',
      uniqueSellingPoint: '',
      competitiveLandscape: '',
      keySellingPoints: [],
      proposedAudience: '',
      proposedTone: ''
    };

    const updatedTitles: BookTitlesData = {
      ...existingTitlesData,
      customTitle: project.title || opp.title,
      customSubtitle: project.subtitle || opp.subtitle,
      selectedTitleId: opp.id,
      generatedTitles: existingTitlesData.generatedTitles && existingTitlesData.generatedTitles.length > 0
        ? existingTitlesData.generatedTitles
        : [{ id: opp.id, title: opp.title, subtitle: opp.subtitle }]
    };

    const updatedPurpose: PurposeData = {
      ...existingPurposeData,
      focusTags: [genre, category],
      uniqueSellingPoint: opp.positioning,
      proposedAudience: opp.targetAudience,
      generatedProposal: opp.positioning
    };

    onUpdateProject({
      ...project,
      title: project.title || opp.title,
      subtitle: project.subtitle || opp.subtitle,
      topic: project.topic || `${category} - ${subcategory}`,
      targetAudience: project.targetAudience || opp.targetAudience,
      targetPrice: opp.suggestedPrice || project.targetPrice,
      currency: opp.currency === 'USD' ? 'USD' : 'BRL',
      stageData: {
        ...(project.stageData || {}),
        analytics: {
          ...data,
          analysisNotes: newNotes,
          aiAnalysisSummary: `Oportunidade selecionada da categoria ${category} › ${subcategory}: ${opp.title} (Royalty Potencial: ~${opp.currency === 'USD' ? '$' : 'R$'}${opp.estimatedMonthlyRoyaltyPotential}/mês).`
        },
        'book-titles': updatedTitles,
        purpose: updatedPurpose
      },
      stageStatuses: {
        ...baseStatuses,
        research: 'COMPLETED'
      }
    });
  };

  return (
    <div className="stage-form-container" style={{ maxWidth: '980px' }}>
      <div className="stage-intro-block">
        <div>
          <h3>Análise de Mercado & Concorrência</h3>
          <p>Identifique o potencial comercial da categoria antes da criação da obra. Veja BSR médio, vendas/dia, royalties líquidos estimados e padrões de Best Sellers da Amazon.</p>
        </div>
      </div>

      {/* PAINEL DE INTELIGÊNCIA COMERCIAL DA CATEGORIA (BOOKENGIN) */}
      <CategoryIntelligencePanel
        initialMarketplace="amazon.com"
        onSelectOpportunity={handleApplyOpportunity}
      />

      <div className="stage-disclaimer mt-6">
        <p>
          🛡️ <strong>Diretriz Editorial Ética:</strong> Estes livros servem exclusivamente como referência estrutural e mercadológica. O motor de IA gera conteúdo 100% inédito e original, sem cópia ou plágio.
        </p>
      </div>

      {/* Botão de gerar análise */}
      {data.marketReferences.length === 0 && (
        <div className="stage-action-center">
          <button
            className="btn-primary-action"
            onClick={generateAnalysis}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <><span className="spinner" /> Mapeando livros concorrentes e best-sellers...</>
            ) : (
              <><Search size={16} /> Analisar Mercado & Encontrar Referências</>
            )}
          </button>
        </div>
      )}

      {/* Seção de referências encontradas */}
      {data.marketReferences.length > 0 && (
        <div className="market-analysis-section">
          <div className="section-header-row">
            <h4>
              <BarChart3 size={18} />
              Obras de Referência Mapeadas ({data.marketReferences.length})
              <span className="label-icon" title="Livros mais vendidos usados como referência de posicionamento">ⓘ</span>
            </h4>
            <button className="btn-sm-outline" onClick={generateAnalysis} disabled={isGenerating}>
              {isGenerating ? 'Atualizando...' : 'Recalcular Análise'}
            </button>
          </div>

          <div className="reference-list">
            {data.marketReferences.map(ref => (
              <div key={ref.id} className="reference-card">
                <div className="reference-card-main">
                  <div className="reference-cover-placeholder">
                    {ref.coverUrl ? (
                      <img src={ref.coverUrl} alt={ref.title} />
                    ) : (
                      <div className="cover-placeholder-icon">📖</div>
                    )}
                  </div>
                  <div className="reference-info">
                    <h5 className="reference-title">{ref.title}</h5>
                    {ref.author && <span className="reference-author">{ref.author}</span>}
                    {ref.description && <p className="reference-desc">{ref.description}</p>}
                  </div>
                  <div className="reference-actions">
                    <button
                      className="btn-icon-sm danger"
                      onClick={() => removeReference(ref.id)}
                      title="Remover esta referência"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      className="btn-icon-sm"
                      onClick={() => setExpandedId(expandedId === ref.id ? null : ref.id)}
                      title="Ver detalhes"
                    >
                      {expandedId === ref.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>
                {expandedId === ref.id && (
                  <div className="reference-card-details">
                    <div className="reference-stats-row">
                      {ref.bsr && <span className="stat-pill bsr">BSR #{ref.bsr}</span>}
                      {ref.rating && <span className="stat-pill rating">★ {ref.rating}</span>}
                      {ref.reviewCount && <span className="stat-pill reviews">{ref.reviewCount.toLocaleString()} avaliações</span>}
                      {ref.url && (
                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="stat-pill amazon-link">
                          Ver na Loja Amazon <ExternalLink size={12} style={{ display: 'inline', marginLeft: 4 }} />
                        </a>
                      )}
                    </div>

                    {/* PILARES DE DESENVOLVIMENTO EDITORIAL DA OBRA */}
                    <div className="editorial-insights-grid mt-3">
                      {ref.narrativeStructure && (
                        <div className="insight-box">
                          <span className="insight-label">📐 Estrutura Narrativa:</span>
                          <p>{ref.narrativeStructure}</p>
                        </div>
                      )}
                      {ref.openingHook && (
                        <div className="insight-box">
                          <span className="insight-label">🎣 Gancho de Abertura:</span>
                          <p>{ref.openingHook}</p>
                        </div>
                      )}
                      {ref.commercialPositioning && (
                        <div className="insight-box">
                          <span className="insight-label">🎯 Posicionamento Comercial:</span>
                          <p>{ref.commercialPositioning}</p>
                        </div>
                      )}
                      {ref.ethicalInspirationGuideline && (
                        <div className="insight-box highlight-ethical">
                          <span className="insight-label">🛡️ Diretriz de Inspiração Ética (Sem Plágio):</span>
                          <p>{ref.ethicalInspirationGuideline}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Adicionar livro manual */}
          <div className="add-reference-row">
            <input
              type="text"
              className="form-input"
              placeholder="Cole o título ou URL de um livro concorrente para adicionar..."
              value={newBookUrl}
              onChange={(e) => setNewBookUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addManualReference()}
            />
            <button className="btn-sm-outline" onClick={addManualReference}>
              <Plus size={14} /> Adicionar Livro
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
