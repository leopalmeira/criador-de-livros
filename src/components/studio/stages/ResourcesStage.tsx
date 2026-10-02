import React, { useState } from 'react';
import { 
  BookProject, 
  BookMemory, 
  MemoryCharacter, 
  MemoryLocation, 
  MemoryRule, 
  MemoryConcept 
} from '../../../types/book-project';
import { EditorialControlBar } from '../EditorialControlBar';
import { getDefaultStageStatuses } from '../../../types/stages';
import { 
  Users, 
  MapPin, 
  ShieldAlert, 
  Lightbulb, 
  Plus, 
  Trash2, 
  Link, 
  Sparkles,
  BookMarked
} from 'lucide-react';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  onContinue?: () => void;
  onPrev?: () => void;
}

type BibleTab = 'characters' | 'locations' | 'rules' | 'concepts' | 'links';

export const ResourcesStage: React.FC<Props> = ({ 
  project, 
  onUpdateProject,
  onContinue,
  onPrev
}) => {
  const [activeTab, setActiveTab] = useState<BibleTab>('characters');

  const initialMemory: BookMemory = project.bookMemory || {
    characters: [
      {
        id: 'char_1',
        name: 'Protagonista Central',
        role: 'Protagonista',
        appearance: '30-40 anos, postura determinada',
        personality: 'Focado em resolver problemas e transformar sua realidade',
        arc: 'Evolui da incerteza para o domínio total da metodologia'
      }
    ],
    locations: [
      {
        id: 'loc_1',
        name: 'Ambiente Principal',
        description: 'Espaço profissional e cotidiano contemporâneo',
        mood: 'Foco, concentração e superação'
      }
    ],
    events: [],
    rules: [
      {
        id: 'rule_1',
        category: 'Continuidade',
        rule: 'Os conceitos apresentados nos primeiros capítulos devem ser aplicados consistentemente até a conclusão.'
      }
    ],
    concepts: [
      {
        id: 'conc_1',
        term: 'Princípio da Ação Contínua',
        definition: 'Pequenos passos consistentes produzem resultados superiores a esforços esporádicos.'
      }
    ]
  };

  const [memory, setMemory] = useState<BookMemory>(initialMemory);

  const updateMemory = (updated: BookMemory) => {
    setMemory(updated);
    onUpdateProject({
      ...project,
      bookMemory: updated
    });
  };

  const isApproved = project.stageStatuses?.resources === 'APROVADO' ||
                     project.editorialStageApprovals?.['resources']?.status === 'APROVADO';

  const handleApproveBible = () => {
    onUpdateProject({
      ...project,
      bookMemory: memory,
      stageStatuses: {
        ...(project.stageStatuses || getDefaultStageStatuses()),
        resources: 'COMPLETED'
      },
      editorialStageApprovals: {
        ...(project.editorialStageApprovals || {}),
        resources: {
          stageId: 'resources',
          status: 'APROVADO',
          approvedAt: Date.now(),
          approvedBy: 'user',
          notes: 'Bíblia do livro aprovada formalmente como fonte imutável de contexto.'
        }
      }
    });
  };

  // Funções de Personagens
  const addCharacter = () => {
    const newC: MemoryCharacter = {
      id: `char_${Date.now()}`,
      name: 'Novo Personagem / Agente',
      role: 'Aliado / Mentor',
      appearance: 'Aparência e características visuais',
      personality: 'Traços psicológicos e papel na história',
      arc: 'Objetivo principal'
    };
    updateMemory({ ...memory, characters: [...memory.characters, newC] });
  };

  const deleteCharacter = (id: string) => {
    updateMemory({ ...memory, characters: memory.characters.filter(c => c.id !== id) });
  };

  // Funções de Regras
  const addRule = () => {
    const newR: MemoryRule = {
      id: `rule_${Date.now()}`,
      category: 'Fato Estabelecido',
      rule: 'Fato imutável que a IA não pode contradizer ao longo dos capítulos.'
    };
    updateMemory({ ...memory, rules: [...memory.rules, newR] });
  };

  const deleteRule = (id: string) => {
    updateMemory({ ...memory, rules: memory.rules.filter(r => r.id !== id) });
  };

  // Funções de Conceitos
  const addConcept = () => {
    const newConc: MemoryConcept = {
      id: `conc_${Date.now()}`,
      term: 'Novo Framework / Conceito',
      definition: 'Explicação detalhada da metodologia ou lição'
    };
    updateMemory({ ...memory, concepts: [...memory.concepts, newConc] });
  };

  const deleteConcept = (id: string) => {
    updateMemory({ ...memory, concepts: memory.concepts.filter(c => c.id !== id) });
  };

  return (
    <div className="stage-form-container space-y-6">
      {/* BARRA DE CONTROLE EDITORIAL */}
      <EditorialControlBar
        stageId="resources"
        stageLabel="Bíblia do Livro (Memória Persistente)"
        status={isApproved ? 'APROVADO' : 'AGUARDANDO_APROVACAO'}
        isApproved={isApproved}
        canApprove={memory.characters.length > 0 || memory.rules.length > 0 || memory.concepts.length > 0}
        approveButtonText={isApproved ? '✓ BÍBLIA DO LIVRO APROVADA' : 'APROVAR BÍBLIA'}
        onPrev={onPrev}
        onNext={isApproved ? onContinue : undefined}
        onApprove={handleApproveBible}
      />

      <div className="stage-intro-block">
        <div className="flex items-center gap-2 mb-1">
          <BookMarked size={20} className="text-amber-400" />
          <h3>Bíblia do Livro & Fatos Invioláveis de Continuidade</h3>
        </div>
        <p>
          A Bíblia aprovada é a <strong>fonte obrigatória de contexto</strong> para todos os capítulos. A IA consultará permanentemente os personagens, locais, regras do mundo e conceitos aqui cadastrados para evitar furos de roteiro, contradições e esquecimento de personagens.
        </p>
      </div>

      {/* ABAS DA BÍBLIA */}
      <div className="flex border-b border-slate-700 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('characters')}
          className={`px-4 py-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'characters'
              ? 'border-blue-500 text-blue-400 bg-blue-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users size={14} /> Personagens ({memory.characters.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'rules'
              ? 'border-blue-500 text-blue-400 bg-blue-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert size={14} /> Regras & Fatos ({memory.rules.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('concepts')}
          className={`px-4 py-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'concepts'
              ? 'border-blue-500 text-blue-400 bg-blue-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lightbulb size={14} /> Conceitos ({memory.concepts.length})
        </button>
      </div>

      {/* CONTEÚDO DA ABA ATIVA */}
      {activeTab === 'characters' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Personagens que a IA manterá consistentes ao longo de todo o manuscrito:</span>
            <button
              type="button"
              onClick={addCharacter}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1"
            >
              <Plus size={13} /> Adicionar Personagem
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memory.characters.map((c) => (
              <div key={c.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 relative">
                <button
                  type="button"
                  onClick={() => deleteCharacter(c.id)}
                  className="absolute top-3 right-3 text-slate-500 hover:text-rose-400"
                  title="Remover"
                >
                  <Trash2 size={14} />
                </button>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-sm font-bold text-white"
                  value={c.name}
                  onChange={(e) => {
                    const updated = memory.characters.map(item => item.id === c.id ? { ...item, name: e.target.value } : item);
                    updateMemory({ ...memory, characters: updated });
                  }}
                  placeholder="Nome do Personagem"
                />
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-blue-300"
                  value={c.role}
                  onChange={(e) => {
                    const updated = memory.characters.map(item => item.id === c.id ? { ...item, role: e.target.value } : item);
                    updateMemory({ ...memory, characters: updated });
                  }}
                  placeholder="Papel (ex: Protagonista, Mentor, Antagonista)"
                />
                <textarea
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-300 h-16 resize-none"
                  value={c.personality}
                  onChange={(e) => {
                    const updated = memory.characters.map(item => item.id === c.id ? { ...item, personality: e.target.value } : item);
                    updateMemory({ ...memory, characters: updated });
                  }}
                  placeholder="Personalidade, motivação e características inegociáveis"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Regras do mundo e fatos estabelecidos que não podem ser contraditos:</span>
            <button
              type="button"
              onClick={addRule}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1"
            >
              <Plus size={13} /> Adicionar Regra / Fato
            </button>
          </div>

          <div className="space-y-3">
            {memory.rules.map((r) => (
              <div key={r.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
                <input
                  type="text"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200"
                  value={r.rule}
                  onChange={(e) => {
                    const updated = memory.rules.map(item => item.id === r.id ? { ...item, rule: e.target.value } : item);
                    updateMemory({ ...memory, rules: updated });
                  }}
                />
                <button
                  type="button"
                  onClick={() => deleteRule(r.id)}
                  className="text-slate-500 hover:text-rose-400 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'concepts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Frameworks didáticos e metodologias centrais:</span>
            <button
              type="button"
              onClick={addConcept}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1"
            >
              <Plus size={13} /> Adicionar Conceito
            </button>
          </div>

          <div className="space-y-3">
            {memory.concepts.map((cp) => (
              <div key={cp.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  className="w-full md:w-1/3 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs font-bold text-white"
                  value={cp.term}
                  onChange={(e) => {
                    const updated = memory.concepts.map(item => item.id === cp.id ? { ...item, term: e.target.value } : item);
                    updateMemory({ ...memory, concepts: updated });
                  }}
                  placeholder="Termo / Nome do Conceito"
                />
                <input
                  type="text"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300"
                  value={cp.definition}
                  onChange={(e) => {
                    const updated = memory.concepts.map(item => item.id === cp.id ? { ...item, definition: e.target.value } : item);
                    updateMemory({ ...memory, concepts: updated });
                  }}
                  placeholder="Definição e aplicação prática"
                />
                <button
                  type="button"
                  onClick={() => deleteConcept(cp.id)}
                  className="text-slate-500 hover:text-rose-400 self-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
