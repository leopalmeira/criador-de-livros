import React, { useState } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Save, 
  Wand2, 
  RefreshCw,
  Info,
  Tag,
  Calendar,
  Users,
  Globe,
  Palette,
  Layers,
  Settings,
  Flag,
  Heart,
  Mic
} from 'lucide-react';
import { BookProject, StageContent, BookType, BOOK_TYPE_CONFIGS } from '../../types/book-project';
import { KdpBookPipeline } from '../../services/kdp-pipeline';
import { AiService } from '../../services/ai-service';
import { AiAssistantService } from '../../services/ai-assistant-service';

interface DetailsViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  aiService: AiService;
}

const BOOK_TYPE_FIELD_MAP: Record<string, Array<{ key: string; label: string; placeholder: string; icon: any }>> = {
  'fiction-novel': [
    { key: 'genre', label: 'Gênero Principal', placeholder: 'Romance literário / Drama', icon: Tag },
    { key: 'setting', label: 'Ambientação/Local', placeholder: 'São Paulo contemporânea', icon: Globe },
    { key: 'era', label: 'Época/Período', placeholder: 'Atual / Anos 2020', icon: Calendar },
    { key: 'characters', label: 'Personagens Principais', placeholder: 'Protagonista, antagonista, coadjuvantes', icon: Users },
    { key: 'length', label: 'Extensão Desejada', placeholder: '~280 páginas', icon: BookOpen },
    { key: 'chapters', label: 'Número de Capítulos', placeholder: '18-26', icon: Layers },
    { key: 'tone', label: 'Tom Narrativo', placeholder: 'Reflexivo, imersivo, poético', icon: Palette },
    { key: 'audience', label: 'Público-Leitor', placeholder: 'Adultos 25-50, fãs de ficção literária', icon: Users },
  ],
  'romance': [
    { key: 'subgenre', label: 'Subgênero', placeholder: 'Contemporâneo / Histórico / Fantasia', icon: Tag },
    { key: 'heatLevel', label: 'Nível de Sensualidade', placeholder: 'Doce / Moderado / Apimentado', icon: Palette },
    { key: 'tropes', label: 'Tropes Principais', placeholder: 'Enemies to lovers, fake dating, second chance', icon: Tag },
    { key: 'pov', label: 'Ponto de Vista', placeholder: 'Alternado (dual POV) / Single POV', icon: Users },
    { key: 'ending', label: 'Tipo de Final', placeholder: 'HEA (Happy Ever After) / HFN', icon: Flag },
    { key: 'length', label: 'Extensão', placeholder: '~250 páginas', icon: BookOpen },
    { key: 'tone', label: 'Tom', placeholder: 'Emocional, envolvente, sensual', icon: Palette },
    { key: 'audience', label: 'Público', placeholder: 'Mulheres 18-45, fãs de romance', icon: Users },
  ],
  'thriller': [
    { key: 'subgenre', label: 'Subgênero', placeholder: 'Psicológico / Policial / Ação', icon: Tag },
    { key: 'protagonist', label: 'Protagonista', placeholder: 'Detetive, jornalista, cidadão comum', icon: Users },
    { key: 'antagonist', label: 'Antagonista/Ameaça', placeholder: 'Serial killer, conspiração, tempo', icon: Users },
    { key: 'setting', label: 'Ambientação', placeholder: 'Urbana, isolada, internacional', icon: Globe },
    { key: 'pacing', label: 'Ritmo', placeholder: 'Rápido, capítulos curtos, cliffhangers', icon: Layers },
    { key: 'twists', label: 'Reviravoltas Planejadas', placeholder: '3-5 plot twists principais', icon: Sparkles },
    { key: 'length', label: 'Extensão', placeholder: '~260 páginas', icon: BookOpen },
    { key: 'tone', label: 'Tom', placeholder: 'Tenso, urgente, atmosférico', icon: Palette },
  ],
  'self-help': [
    { key: 'methodology', label: 'Metodologia Central', placeholder: 'Sistema de 3 pilares / Framework próprio', icon: Layers },
    { key: 'targetProblem', label: 'Problema Específico', placeholder: 'Procrastinação, ansiedade, falta de foco', icon: Tag },
    { key: 'promisedResult', label: 'Resultado Prometido', placeholder: 'Hábitos automáticos em 30 dias', icon: Flag },
    { key: 'exercises', label: 'Exercícios Práticos', placeholder: 'Sim, ao final de cada capítulo', icon: Settings },
    { key: 'caseStudies', label: 'Estudos de Caso', placeholder: '3-5 casos reais/anônimos', icon: Users },
    { key: 'length', label: 'Extensão', placeholder: '~160 páginas', icon: BookOpen },
    { key: 'tone', label: 'Tom', placeholder: 'Empático, direto, baseado em ciência', icon: Palette },
    { key: 'audience', label: 'Público', placeholder: 'Profissionais 25-45 buscando performance', icon: Users },
  ],
  'children-picture-book': [
    { key: 'ageRange', label: 'Faixa Etária', placeholder: '4-8 anos', icon: Users },
    { key: 'theme', label: 'Tema Central', placeholder: 'Amizade, coragem, descoberta', icon: Tag },
    { key: 'pageCount', label: 'Número de Páginas', placeholder: '32 páginas (padrão)', icon: BookOpen },
    { key: 'vocabLevel', label: 'Nível de Vocabulário', placeholder: 'Simples, rimado, musical', icon: Palette },
    { key: 'characters', label: 'Personagens', placeholder: '1-2 protagonistas animais/crianças', icon: Users },
    { key: 'illustrations', label: 'Estilo de Ilustração', placeholder: 'Aquarela vibrante / Digital colorido', icon: Palette },
    { key: 'moral', label: 'Lição/Moral', placeholder: 'Sutil, afetiva, não didática', icon: Heart },
    { key: 'readAloud', label: 'Leitura em Voz Alta', placeholder: 'Ritmo cadenciado, onomatopeias', icon: Mic },
  ],
  'coloring-book': [
    { key: 'ageRange', label: 'Faixa Etária', placeholder: 'Adultos / Crianças 6+ / Todas idades', icon: Users },
    { key: 'theme', label: 'Tema', placeholder: 'Mandalas, natureza, fantasia, geométrico', icon: Tag },
    { key: 'pageCount', label: 'Número de Páginas', placeholder: '60-100', icon: BookOpen },
    { key: 'complexity', label: 'Complexidade', placeholder: 'Simples / Intermediário / Detalhado', icon: Layers },
    { key: 'artStyle', label: 'Estilo Artístico', placeholder: 'Lineart limpo, bold lines', icon: Palette },
    { key: 'singleSided', label: 'Impressão Unilateral', placeholder: 'Sim (recomendado)', icon: Settings },
    { key: 'paperRec', label: 'Recomendação de Papel', placeholder: 'Branco 90g/m²', icon: Globe },
  ],
};

export const DetailsView: React.FC<DetailsViewProps> = ({
  project,
  onUpdateProject,
  aiService
}) => {
  const existingContent = project.stageContents?.find(c => c.stageKey === 'details');
  const bookType = project.kdpBookType;
  const config = BOOK_TYPE_CONFIGS[bookType] || BOOK_TYPE_CONFIGS['self-help'];
  const fields = BOOK_TYPE_FIELD_MAP[bookType] || BOOK_TYPE_FIELD_MAP['self-help'];
  
  const [details, setDetails] = useState<Record<string, any>>(existingContent?.data || {
    bookType,
    trimSize: project.trimSize || config.trimSize,
    paperType: project.paperType || config.paperType,
    estimatedPages: project.estimatedPages || config.targetPages,
    chapterCount: project.kdpChapters?.length || config.chapterCount[0],
    ...Object.fromEntries(fields.map(f => [f.key, '']))
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSave = () => {
    const updatedContent: StageContent = {
      stageKey: 'details',
      data: details,
      updatedAt: Date.now(),
      updatedBy: 'user',
      version: (existingContent?.version || 0) + 1
    };
    onUpdateProject({
      ...project,
      trimSize: details.trimSize || project.trimSize,
      paperType: details.paperType || project.paperType,
      estimatedPages: details.estimatedPages || project.estimatedPages,
      stageContents: [...(project.stageContents?.filter(c => c.stageKey !== 'details') || []), updatedContent],
      stageProgress: project.stageProgress.map(sp => 
        sp.stageKey === 'details' ? { ...sp, status: 'REVIEW' as const, progress: 100, lastUpdated: Date.now() } : sp
      ),
      stageApprovals: project.stageApprovals.map(sa => 
        sa.stageKey === 'details' ? { ...sa, status: 'REVIEW' as const, previousStatus: sa.status, approvedAt: undefined, approvedBy: undefined } : sa
      )
    });
  };

  return (
    <div className="stage-page-layout">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={22} className="text-primary-accent" />
            <h3 className="text-xl font-bold">Etapa 07 - Book Details: Detalhes do Produto ({config.label})</h3>
          </div>
          <p className="text-xs text-muted">
            Campos dinâmicos baseados no tipo de produto. Configure as especificações editoriais para calibrar a produção.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary-glow" onClick={handleSave}>
            <Save size={15} /> Salvar Detalhes
          </button>
        </div>
      </div>

      {/* CONFIG SUMMARY */}
      <div className="mb-6 p-4 bg-surface-elevated rounded-xl border border-border-subtle">
        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Settings size={16} /> Configuração Atual do Projeto
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="p-2 bg-slate-800/50 rounded">
            <div className="text-muted">Tipo de Livro</div>
            <div className="font-medium">{config.label}</div>
          </div>
          <div className="p-2 bg-slate-800/50 rounded">
            <div className="text-muted">Trim Size</div>
            <div className="font-medium">{details.trimSize || config.trimSize}</div>
          </div>
          <div className="p-2 bg-slate-800/50 rounded">
            <div className="text-muted">Papel</div>
            <div className="font-medium capitalize">{details.paperType || config.paperType}</div>
          </div>
          <div className="p-2 bg-slate-800/50 rounded">
            <div className="text-muted">Páginas Meta</div>
            <div className="font-medium">{details.estimatedPages || config.targetPages}</div>
          </div>
        </div>
      </div>

      {/* DYNAMIC FIELDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {fields.map((field) => (
          <div key={field.key} className="form-group-field">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                <field.icon size={14} className="text-primary-accent" />
                {field.label}
                <span className="cursor-help text-slate-400 hover:text-white" title="Específico para {config.label}">
                  <Info size={13} />
                </span>
              </label>
            </div>
            <input
              type="text"
              className="input-text-standard"
              placeholder={field.placeholder}
              value={details[field.key] || ''}
              onChange={(e) => setDetails(prev => ({ ...prev, [field.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {/* QUICK SPECS EDITOR */}
      <div className="p-4 bg-surface-elevated rounded-xl border border-border-subtle mb-6">
        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Layers size={16} /> Especificações Rápidas (KDP)
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-muted block mb-1">Trim Size</label>
            <select className="select-standard" value={details.trimSize} onChange={(e) => setDetails(prev => ({ ...prev, trimSize: e.target.value }))}>
              <option value="6x9">6" x 9" (Padrão)</option>
              <option value="5.5x8.5">5.5" x 8.5"</option>
              <option value="5x8">5" x 8"</option>
              <option value="5.25x8">5.25" x 8"</option>
              <option value="7x10">7" x 10"</option>
              <option value="8x10">8" x 10"</option>
              <option value="8.5x11">8.5" x 11"</option>
              <option value="8.5x8.5">8.5" x 8.5"</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Papel</label>
            <select className="select-standard" value={details.paperType} onChange={(e) => setDetails(prev => ({ ...prev, paperType: e.target.value }))}>
              <option value="bw-white">Branco Padrão</option>
              <option value="bw-cream">Creme Suave</option>
              <option value="color">Colorido Premium</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Páginas Estimadas</label>
            <input type="number" className="input-text-standard" value={details.estimatedPages} onChange={(e) => setDetails(prev => ({ ...prev, estimatedPages: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Capítulos Planejados</label>
            <input type="number" className="input-text-standard" value={details.chapterCount} onChange={(e) => setDetails(prev => ({ ...prev, chapterCount: Number(e.target.value) }))} />
          </div>
        </div>
      </div>

      {/* IMPACT ON PRODUCTION */}
      <div className="p-4 bg-gradient-to-r from-teal-500/10 to-blue-500/10 border border-teal-500/20 rounded-xl">
        <h4 className="font-bold text-teal-400 mb-3 flex items-center gap-2">
          <BookOpen size={16} /> Impacto na Produção
        </h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2 bg-slate-800/50 rounded">
            <span className="text-teal-300">Pagination:</span> {details.estimatedPages} págs → {Math.ceil((details.estimatedPages || config.targetPages) / 2)} folhas
          </div>
          <div className="p-2 bg-slate-800/50 rounded">
            <span className="text-teal-300">Spine Width:</span> ~{(details.estimatedPages || config.targetPages) * 0.002252} polegadas
          </div>
          <div className="p-2 bg-slate-800/50 rounded">
            <span className="text-teal-300">Capítulos:</span> {details.chapterCount || config.chapterCount[0]} → ~{Math.round((details.estimatedPages || config.targetPages) / (details.chapterCount || config.chapterCount[0]))} págs/cap
          </div>
          <div className="p-2 bg-slate-800/50 rounded">
            <span className="text-teal-300">Print Cost:</span> Varia com páginas + papel ({details.paperType || config.paperType})
          </div>
        </div>
      </div>
    </div>
  );
};