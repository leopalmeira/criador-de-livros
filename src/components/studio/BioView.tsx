import React, { useState } from 'react';
import { 
  PenTool, 
  Sparkles, 
  Save, 
  Wand2, 
  RefreshCw,
  Info,
  User,
  Award,
  BookOpen,
  Heart,
  GraduationCap,
  Briefcase,
  Image as ImageIcon,
  Camera,
  Flag
} from 'lucide-react';
import { BookProject, StageContent, IBookConcept, EditorialElements } from '../../types/book-project';
import { KdpBookPipeline } from '../../services/kdp-pipeline';
import { AiService } from '../../services/ai-service';
import { AiAssistantService } from '../../services/ai-assistant-service';

interface BioViewProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  aiService: AiService;
}

const BIO_SECTIONS = [
  { key: 'opening', label: 'Abertura/Gancho', placeholder: 'Ex: "Bestseller do New York Times, Dr. X dedicou 20 anos a..."', icon: PenTool },
  { key: 'credentials', label: 'Credenciais/Autoridade', placeholder: 'PhD, certificações, premiações, bestsellers anteriores', icon: Award },
  { key: 'experience', label: 'Experiência Profissional', placeholder: 'Cargos, empresas, projetos relevantes', icon: Briefcase },
  { key: 'education', label: 'Formação Acadêmica', placeholder: 'Universidades, áreas de estudo, pesquisas', icon: GraduationCap },
  { key: 'personal', label: 'Toque Pessoal', placeholder: 'Hobbies, família, causa social, curiosidade', icon: Heart },
  { key: 'mission', label: 'Missão/Propósito', placeholder: 'Por que escreve? Que mudança quer causar?', icon: Flag },
  { key: 'books', label: 'Outras Obras', placeholder: 'Títulos anteriores, links para Amazon', icon: BookOpen },
  { key: 'contact', label: 'Contato/Redes', placeholder: 'Site, Instagram, LinkedIn, newsletter', icon: User },
];

export const BioView: React.FC<BioViewProps> = ({
  project,
  onUpdateProject,
  aiService
}) => {
  const existingContent = project.stageContents?.find(c => c.stageKey === 'bio');
  const editorial = project.editorialElements;
  const concept = project.kdpConcept;
  
  const [bio, setBio] = useState<Record<string, any>>(existingContent?.data || {
    opening: editorial?.aboutAuthor?.split('\n')[0] || '',
    credentials: '',
    experience: '',
    education: '',
    personal: '',
    mission: concept?.promise || '',
    books: '',
    contact: ''
  });
  const [fullBio, setFullBio] = useState(editorial?.aboutAuthor || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestingField, setSuggestingField] = useState<string | null>(null);
  const [fieldIterations, setFieldIterations] = useState<Record<string, number>>({});
  const [authorPhoto, setAuthorPhoto] = useState<string>('');

  const handleSave = () => {
    const compileBio = (b: Record<string, any>): string => {
      const parts: string[] = [];
      if (b.opening) parts.push(b.opening);
      if (b.credentials) parts.push(`Credenciais: ${b.credentials}`);
      if (b.experience) parts.push(`Experiência: ${b.experience}`);
      if (b.education) parts.push(`Formação: ${b.education}`);
      if (b.personal) parts.push(b.personal);
      if (b.mission) parts.push(`Missão: ${b.mission}`);
      if (b.books) parts.push(`Outras obras: ${b.books}`);
      if (b.contact) parts.push(`Conecte-se: ${b.contact}`);
      return parts.join('\n\n');
    };
    
    const compiledBio = compileBio(bio);
    const updatedEditorial: EditorialElements = {
      ...editorial,
      halfTitle: editorial?.halfTitle || '',
      titlePage: editorial?.titlePage || {
        title: project.title,
        subtitle: project.subtitle || '',
        author: project.author,
        publisher: '',
        year: new Date().getFullYear().toString()
      },
      copyrightNotice: editorial?.copyrightNotice || '',
      aboutAuthor: compiledBio
    };
    
    const updatedContent: StageContent = {
      stageKey: 'bio',
      data: { ...bio, fullBio: compiledBio, authorPhoto },
      updatedAt: Date.now(),
      updatedBy: 'user',
      version: (existingContent?.version || 0) + 1
    };
    onUpdateProject({
      ...project,
      editorialElements: updatedEditorial,
      stageContents: [...(project.stageContents?.filter(c => c.stageKey !== 'bio') || []), updatedContent],
      stageProgress: project.stageProgress.map(sp => 
        sp.stageKey === 'bio' ? { ...sp, status: 'REVIEW' as const, progress: 100, lastUpdated: Date.now() } : sp
      ),
      stageApprovals: project.stageApprovals.map(sa => 
        sa.stageKey === 'bio' ? { ...sa, status: 'REVIEW' as const, previousStatus: sa.status, approvedAt: undefined, approvedBy: undefined } : sa
      )
    });
  };

  const handleGenerateBio = async () => {
    if (!concept) return;
    setIsGenerating(true);
    try {
      const pipeline = new KdpBookPipeline(aiService);
      const editorialMatter = await pipeline.generateEditorialMatter(concept, project.author, project.language);
      if (editorialMatter.aboutAuthor) {
        setFullBio(editorialMatter.aboutAuthor);
        const lines = editorialMatter.aboutAuthor.split('\n\n');
        setBio(prev => ({
          ...prev,
          opening: lines[0] || '',
          credentials: lines.find(l => l.includes('credencial') || l.includes('PhD') || l.includes('certificação')) || '',
          experience: lines.find(l => l.includes('experiência') || l.includes('trabalhou') || l.includes('atuou')) || '',
          mission: concept.promise || ''
        }));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestField = async (field: string) => {
    setSuggestingField(field);
    try {
      const assistant = new AiAssistantService(aiService);
      const iteration = fieldIterations[field] || 0;
      const suggestion = await assistant.suggestField(field as any, project, undefined, iteration);
      setBio(prev => ({ ...prev, [field]: suggestion }));
      setFieldIterations(prev => ({ ...prev, [field]: iteration + 1 }));
    } finally {
      setSuggestingField(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setAuthorPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const compileBio = (b: Record<string, any>): string => {
    const parts: string[] = [];
    if (b.opening) parts.push(b.opening);
    if (b.credentials) parts.push(`Credenciais: ${b.credentials}`);
    if (b.experience) parts.push(`Experiência: ${b.experience}`);
    if (b.education) parts.push(`Formação: ${b.education}`);
    if (b.personal) parts.push(b.personal);
    if (b.mission) parts.push(`Missão: ${b.mission}`);
    if (b.books) parts.push(`Outras obras: ${b.books}`);
    if (b.contact) parts.push(`Conecte-se: ${b.contact}`);
    return parts.join('\n\n');
  };

  return (
    <div className="stage-page-layout">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PenTool size={22} className="text-primary-accent" />
            <h3 className="text-xl font-bold">Etapa 08 - Author Bio: Biografia do Autor</h3>
          </div>
          <p className="text-xs text-muted">
            Biografia profissional para contracapa, Amazon Author Central e marketing. Gerada baseada na Persona (Etapa 05) e Propósito (Etapa 06).
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary-action" onClick={handleGenerateBio} disabled={isGenerating || !concept}>
            <Wand2 size={15} className={isGenerating ? 'spin-animate' : ''} />
            {isGenerating ? 'Gerando...' : 'Gerar Biografia com IA'}
          </button>
          <button className="btn-primary-glow" onClick={handleSave}>
            <Save size={15} /> Salvar & Aprovar Bio
          </button>
        </div>
      </div>

      {/* AUTHOR PHOTO */}
      <div className="mb-6 flex items-start gap-6">
        <div className="relative w-32 h-32 flex-shrink-0">
          {authorPhoto ? (
            <img src={authorPhoto} alt="Foto do Autor" className="w-full h-full object-cover rounded-xl border-2 border-slate-600" />
          ) : (
            <div className="w-full h-full rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center bg-slate-800/50">
              <Camera size={24} className="text-slate-500" />
            </div>
          )}
          <label className="absolute bottom-0 right-0 bg-primary-accent text-slate-900 px-2 py-1 rounded-bl-xl rounded-tr-xl cursor-pointer text-xs font-medium">
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="sr-only" />
            Foto
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm mb-2">Foto do Autor (opcional, para contracapa e Amazon Author Central)</h4>
          <p className="text-xs text-muted">Recomendado: 300 DPI, proporção 3:4, fundo neutro, expressão profissional e acolhedora.</p>
        </div>
      </div>

      {/* BIO SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {BIO_SECTIONS.map((section) => (
          <div key={section.key} className="form-group-field">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                <section.icon size={14} className="text-primary-accent" />
                {section.label}
                <span className="cursor-help text-slate-400 hover:text-white" title="Usado na contracapa, Amazon Author Page e marketing">
                  <Info size={13} />
                </span>
              </label>
              <button
                type="button"
                onClick={() => handleSuggestField(section.key)}
                disabled={suggestingField === section.key}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md"
              >
                {suggestingField === section.key ? <RefreshCw size={11} className="spin-animate" /> : <Sparkles size={11} />}
                {suggestingField === section.key ? 'Gerando...' : fieldIterations[section.key] ? 'Outra (↻)' : 'Sugerir IA'}
              </button>
            </div>
            <textarea
              rows={3}
              className="textarea-standard"
              placeholder={section.placeholder}
              value={bio[section.key] || ''}
              onChange={(e) => setBio(prev => ({ ...prev, [section.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {/* LIVE PREVIEW */}
      <div className="p-4 bg-surface-elevated rounded-xl border border-border-subtle mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <BookOpen size={16} /> Prévia da Biografia (Contracapa / Amazon Author Central)
          </h4>
          <span className="text-[10px] text-muted">{compileBio(bio).length} caracteres</span>
        </div>
        <div className="p-4 bg-slate-900/50 rounded border border-slate-700 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
          {compileBio(bio) || 'Preencha as seções acima para ver a prévia da biografia completa.'}
        </div>
      </div>

      {/* FULL EDITOR */}
      <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
        <h4 className="font-bold text-purple-400 mb-3 flex items-center gap-2">
          <PenTool size={16} /> Editor Completo (Markdown)
        </h4>
        <textarea
          rows={8}
          className="textarea-standard font-mono text-xs"
          value={fullBio}
          onChange={(e) => setFullBio(e.target.value)}
          placeholder="Edite a biografia completa em Markdown aqui. Esta versão será usada na contracapa e exportada nos metadados."
        />
        <div className="mt-2 flex gap-2">
          <button className="btn-subtle text-xs" onClick={() => setFullBio(compileBio(bio))}>
            Atualizar das Seções
          </button>
          <button className="btn-primary-action text-xs" onClick={() => setBio(prev => {
            const lines = fullBio.split('\n\n');
            return { ...prev, opening: lines[0] || '' };
          })}>
            Aplicar ao Formulário
          </button>
        </div>
      </div>
    </div>
  );
};