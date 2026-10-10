import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Tag, 
  DollarSign, 
  Globe, 
  ShieldCheck, 
  HelpCircle,
  Save,
  Wand2,
  AlertTriangle
} from 'lucide-react';
import { BookProject, IBookMetadataKdp } from '../../types/book-project';
import { KdpBookPipeline } from '../../services/kdp-pipeline';
import { AiService } from '../../services/ai-service';
import { PublishingMetadataService } from '../../services/publishing-metadata-service';

interface MetadataPublishViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  aiService: AiService;
}

export const MetadataPublishView: React.FC<MetadataPublishViewProps> = ({
  project,
  onUpdateProject,
  aiService
}) => {
  const initialMeta: IBookMetadataKdp = project.kdpMetadata || {
    title: project.title,
    subtitle: project.subtitle,
    author: project.author,
    descriptionHtml: project.description,
    commercialShortDescription: project.description,
    commercialLongDescription: project.description,
    salesHooks: [],
    keywords7: ['', '', '', '', '', '', ''],
    categoriesPrimary: ['Não-Ficção / Desenvolvimento Pessoal'],
    categoriesSecondary: [],
    language: project.language || 'Português',
    targetAudience: project.targetAudience || 'Geral',
    priceSuggestedBrl: 24.90,
    priceSuggestedUsd: 4.99
  };

  const [meta, setMeta] = useState<IBookMetadataKdp>(initialMeta);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSave = () => {
    onUpdateProject({
      ...project,
      title: meta.title,
      subtitle: meta.subtitle,
      author: meta.author,
      kdpMetadata: meta
    });
  };

  const handleGenerateAiMetadata = async () => {
    setIsGenerating(true);
    try {
      const pipeline = new KdpBookPipeline(aiService);
      const generated = await pipeline.generateMetadataKdp(
        project.kdpConcept || {
          title: project.title,
          subtitle: project.subtitle,
          hook: '',
          audience: project.targetAudience,
          tone: '',
          targetWordCount: 25000,
          targetChapterCount: 10,
          targetPages: project.estimatedPages,
          trimSize: project.trimSize,
          paperType: project.paperType,
          comparableTitles: [],
          themes: [],
          shortSynopsis: project.description,
          longSynopsis: project.description,
          promise: project.title,
          differentiator: ''
        },
        project.kdpChapters || [],
        project.author,
        project.language
      );

      if (generated && generated.keywords7?.some(k => k.trim().length > 0)) {
        setMeta(generated);
        onUpdateProject({
          ...project,
          kdpMetadata: generated
        });
      } else {
        // Fallback determinístico profissional que respeita as 7 regras KDP
        const pack = PublishingMetadataService.generateKdpMetadataPack(project);
        setMeta(pack);
        onUpdateProject({
          ...project,
          kdpMetadata: pack
        });
      }
    } catch {
      const pack = PublishingMetadataService.generateKdpMetadataPack(project);
      setMeta(pack);
      onUpdateProject({
        ...project,
        kdpMetadata: pack
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="metadata-publish-view-container">
      {/* HEADER */}
      <div className="metadata-top-bar">
        <div>
          <h3 className="text-xl font-bold">Metadados & Publicação Amazon KDP</h3>
          <p className="text-xs text-muted">
            Configure as informações que os leitores verão na loja da Amazon e as 7 palavras-chave para o algoritmo de busca.
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            className="btn-primary-action" 
            onClick={handleGenerateAiMetadata}
            disabled={isGenerating}
          >
            <Wand2 size={15} />
            {isGenerating ? 'Gerando...' : 'Otimizar SEO com IA'}
          </button>
          <button className="btn-primary-glow" onClick={handleSave}>
            <Save size={15} /> Salvar Metadados
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-4">
        {/* COLUNA ESQUERDA: INFORMAÇÕES BÁSICAS & DESCRIÇÃO */}
        <div className="metadata-form-col">
          <div className="form-group-field">
            <label>Título do Livro</label>
            <input 
              type="text" 
              className="input-text-standard"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            />
          </div>

          <div className="form-group-field">
            <label>Subtítulo</label>
            <input 
              type="text" 
              className="input-text-standard"
              value={meta.subtitle || ''}
              onChange={(e) => setMeta({ ...meta, subtitle: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group-field">
              <label>Nome do Autor</label>
              <input 
                type="text" 
                className="input-text-standard"
                value={meta.author}
                onChange={(e) => setMeta({ ...meta, author: e.target.value })}
              />
            </div>
            <div className="form-group-field">
              <label>Editora / Selo Editorial</label>
              <input 
                type="text" 
                className="input-text-standard"
                placeholder="Ex: Edições Independentes"
                value={meta.seriesName || ''}
                onChange={(e) => setMeta({ ...meta, seriesName: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group-field">
            <div className="flex justify-between items-center mb-1">
              <label>Descrição Comercial Formatada (Amazon Blurb)</label>
              <button 
                className="btn-copy-small" 
                onClick={() => handleCopy(meta.commercialLongDescription, 'blurb')}
              >
                {copiedField === 'blurb' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copiedField === 'blurb' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <textarea 
              rows={9}
              className="textarea-standard font-mono text-xs"
              value={meta.commercialLongDescription}
              onChange={(e) => setMeta({ ...meta, commercialLongDescription: e.target.value })}
              placeholder="Descrição persuasiva com formatação em parágrafos e pontos fortes..."
            />
          </div>
        </div>

        {/* COLUNA DIREITA: AS 7 PALAVRAS-CHAVE & PREÇO */}
        <div className="metadata-form-col">
          {/* AS 7 PALAVRAS-CHAVE KDP */}
          <div className="bg-surface-elevated p-4 rounded-xl border border-border-subtle mb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-primary-accent" />
                <h4 className="font-semibold text-sm">7 Palavras-Chave de Busca KDP</h4>
              </div>
              <button 
                className="btn-copy-small"
                onClick={() => handleCopy(meta.keywords7.join(', '), 'kw')}
              >
                {copiedField === 'kw' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                Copiar Todas
              </button>
            </div>

            <p className="text-xs text-muted mb-3">
              A Amazon permite exatamente 7 caixas de termos ou frases de busca para posicionar o livro nas pesquisas.
            </p>

            <div className="keywords-grid-inputs">
              {meta.keywords7.map((kw: string, idx: number) => (
                <div key={idx} className="keyword-row-field">
                  <span className="kw-badge">#{idx + 1}</span>
                  <input 
                    type="text" 
                    className="input-text-standard flex-1"
                    placeholder={`Frase de busca ${idx + 1}...`}
                    value={kw}
                    onChange={(e) => {
                      const newKws = [...meta.keywords7];
                      newKws[idx] = e.target.value;
                      setMeta({ ...meta, keywords7: newKws });
                    }}
                  />
                </div>
              ))}
            </div>

            {/* STATUS E VALIDAÇÃO DAS 7 PALAVRAS-CHAVE SEGUNDO AS REGRAS KDP */}
            {(() => {
              const val = PublishingMetadataService.validateKdpKeywords(meta.keywords7, meta.title, meta.author);
              return (
                <div className="mt-3 pt-3 border-t border-slate-700/60">
                  {val.warnings.length > 0 ? (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle size={14} className="text-amber-400" />
                        <span>Atenção às diretrizes de busca da Amazon KDP:</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-200/90">
                        {val.warnings.map((w, wi) => (
                          <li key={wi}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  ) : val.validCount === 7 ? (
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                      <ShieldCheck size={15} />
                      <span>7 Caixas preenchidas e 100% compatíveis com as normas da Amazon KDP.</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400">
                      {val.validCount} de 7 caixas preenchidas ({7 - val.validCount} restantes).
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* PREÇO SUGERIDO & CATEGORIAS */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="form-group-field">
              <label>Preço Sugerido (BRL)</label>
              <div className="price-input-wrap">
                <span className="price-prefix">R$</span>
                <input 
                  type="number" 
                  step="0.50"
                  className="input-text-standard pl-8"
                  value={meta.priceSuggestedBrl}
                  onChange={(e) => setMeta({ ...meta, priceSuggestedBrl: parseFloat(e.target.value) || 24.90 })}
                />
              </div>
            </div>

            <div className="form-group-field">
              <label>Preço Sugerido (USD)</label>
              <div className="price-input-wrap">
                <span className="price-prefix">$</span>
                <input 
                  type="number" 
                  step="0.50"
                  className="input-text-standard pl-8"
                  value={meta.priceSuggestedUsd}
                  onChange={(e) => setMeta({ ...meta, priceSuggestedUsd: parseFloat(e.target.value) || 4.99 })}
                />
              </div>
            </div>
          </div>

          <div className="form-group-field">
            <label>Categorias KDP Principais</label>
            <input 
              type="text" 
              className="input-text-standard"
              value={meta.categoriesPrimary.join('; ')}
              onChange={(e) => setMeta({ ...meta, categoriesPrimary: e.target.value.split(';').map(s => s.trim()) })}
              placeholder="Ex: Livros > Autoajuda > Produtividade; Negócios > Gestão"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
