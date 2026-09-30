import React, { useState } from 'react';
import { 
  X, 
  Users, 
  MapPin, 
  Calendar, 
  ShieldAlert, 
  Lightbulb, 
  Plus, 
  Trash2, 
  Save, 
  Sparkles 
} from 'lucide-react';
import { 
  BookProject, 
  BookMemory, 
  MemoryCharacter, 
  MemoryLocation, 
  MemoryEvent, 
  MemoryRule, 
  MemoryConcept 
} from '../../types/book-project';

interface BookMemoryModalProps {
  project: BookProject;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedMemory: BookMemory) => void;
}

type MemoryTab = 'characters' | 'locations' | 'events' | 'rules' | 'concepts';

export const BookMemoryModal: React.FC<BookMemoryModalProps> = ({
  project,
  isOpen,
  onClose,
  onSave
}) => {
  if (!isOpen) return null;

  const initialMemory: BookMemory = project.bookMemory || {
    characters: (project.kdpBible?.characters || []).map((c, idx) => ({
      id: `char_${idx}_${Date.now()}`,
      name: c.name,
      role: c.role,
      appearance: c.appearance || '',
      personality: c.personality || '',
      arc: c.arc || ''
    })),
    locations: (project.kdpBible?.locations || []).map((l, idx) => ({
      id: `loc_${idx}_${Date.now()}`,
      name: l.name,
      description: l.description,
      mood: l.mood || ''
    })),
    events: [],
    rules: (project.kdpBible?.rulesOfUniverse || []).map((r, idx) => ({
      id: `rule_${idx}_${Date.now()}`,
      category: 'Regra Geral',
      rule: r
    })),
    concepts: (project.kdpBible?.coreConcepts || []).map((c, idx) => ({
      id: `conc_${idx}_${Date.now()}`,
      term: c.concept,
      definition: c.explanation,
      application: c.practicalApplication
    }))
  };

  const [memory, setMemory] = useState<BookMemory>(initialMemory);
  const [activeTab, setActiveTab] = useState<MemoryTab>('characters');

  const handleSaveAndClose = () => {
    onSave(memory);
    onClose();
  };

  // Funções de Personagens
  const addCharacter = () => {
    const newChar: MemoryCharacter = {
      id: `char_${Date.now()}`,
      name: 'Novo Personagem',
      role: 'Protagonista / Aliado',
      appearance: 'Descrição física e vestimentas',
      personality: 'Traços psicológicos e motivação',
      arc: 'Transformação ao longo da história'
    };
    setMemory({ ...memory, characters: [...memory.characters, newChar] });
  };

  const updateCharacter = (id: string, field: keyof MemoryCharacter, val: string) => {
    setMemory({
      ...memory,
      characters: memory.characters.map(c => c.id === id ? { ...c, [field]: val } : c)
    });
  };

  const deleteCharacter = (id: string) => {
    setMemory({
      ...memory,
      characters: memory.characters.filter(c => c.id !== id)
    });
  };

  // Funções de Locais
  const addLocation = () => {
    const newLoc: MemoryLocation = {
      id: `loc_${Date.now()}`,
      name: 'Novo Local',
      description: 'Características espaciais e visuais',
      mood: 'Atmosfera e sensação dominante'
    };
    setMemory({ ...memory, locations: [...memory.locations, newLoc] });
  };

  const updateLocation = (id: string, field: keyof MemoryLocation, val: string) => {
    setMemory({
      ...memory,
      locations: memory.locations.map(l => l.id === id ? { ...l, [field]: val } : l)
    });
  };

  const deleteLocation = (id: string) => {
    setMemory({
      ...memory,
      locations: memory.locations.filter(l => l.id !== id)
    });
  };

  // Funções de Eventos
  const addEvent = () => {
    const newEv: MemoryEvent = {
      id: `ev_${Date.now()}`,
      chapterIndex: 1,
      title: 'Acontecimento Chave',
      description: 'O que ocorreu e quem participou',
      consequence: 'Impacto nos acontecimentos futuros'
    };
    setMemory({ ...memory, events: [...memory.events, newEv] });
  };

  const updateEvent = (id: string, field: keyof MemoryEvent, val: any) => {
    setMemory({
      ...memory,
      events: memory.events.map(e => e.id === id ? { ...e, [field]: val } : e)
    });
  };

  const deleteEvent = (id: string) => {
    setMemory({
      ...memory,
      events: memory.events.filter(e => e.id !== id)
    });
  };

  // Funções de Regras
  const addRule = () => {
    const newR: MemoryRule = {
      id: `rule_${Date.now()}`,
      category: 'Regra de Universo',
      rule: 'Diretriz ou lei imutável que deve ser respeitada em todos os capítulos'
    };
    setMemory({ ...memory, rules: [...memory.rules, newR] });
  };

  const updateRule = (id: string, field: keyof MemoryRule, val: string) => {
    setMemory({
      ...memory,
      rules: memory.rules.map(r => r.id === id ? { ...r, [field]: val } : r)
    });
  };

  const deleteRule = (id: string) => {
    setMemory({
      ...memory,
      rules: memory.rules.filter(r => r.id !== id)
    });
  };

  return (
    <div className="modal-backdrop-overlay">
      <div className="memory-modal-container">
        {/* HEADER */}
        <div className="memory-modal-header">
          <div className="header-title-box">
            <Sparkles size={20} className="text-amber-400" />
            <div>
              <h3 className="modal-title">Memória do Livro (Book Memory)</h3>
              <p className="modal-subtitle">
                Contexto persistente que a IA consulta para evitar furos de roteiro, contradições e esquecimentos.
              </p>
            </div>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* TABS DE CATEGORIAS */}
        <div className="memory-modal-tabs">
          <button 
            className={`memory-tab-btn ${activeTab === 'characters' ? 'active' : ''}`}
            onClick={() => setActiveTab('characters')}
          >
            <Users size={16} />
            <span>Personagens ({memory.characters.length})</span>
          </button>
          <button 
            className={`memory-tab-btn ${activeTab === 'locations' ? 'active' : ''}`}
            onClick={() => setActiveTab('locations')}
          >
            <MapPin size={16} />
            <span>Locais ({memory.locations.length})</span>
          </button>
          <button 
            className={`memory-tab-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            <Calendar size={16} />
            <span>Cronologia / Eventos ({memory.events.length})</span>
          </button>
          <button 
            className={`memory-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            <ShieldAlert size={16} />
            <span>Regras do Universo ({memory.rules.length})</span>
          </button>
        </div>

        {/* CORPO DA ABA ATIVA */}
        <div className="memory-modal-body">
          {/* ABA: PERSONAGENS */}
          {activeTab === 'characters' && (
            <div className="memory-tab-panel">
              <div className="tab-actions-header">
                <span className="text-sm text-secondary font-medium">Ficha de Personagens Registrados</span>
                <button className="btn-primary-action-sm" onClick={addCharacter}>
                  <Plus size={14} /> Adicionar Personagem
                </button>
              </div>

              <div className="memory-items-grid">
                {memory.characters.map((c) => (
                  <div key={c.id} className="memory-card">
                    <div className="memory-card-top">
                      <input 
                        type="text" 
                        className="input-memory-name" 
                        value={c.name}
                        placeholder="Nome do Personagem"
                        onChange={(e) => updateCharacter(c.id, 'name', e.target.value)}
                      />
                      <button className="btn-icon-danger" onClick={() => deleteCharacter(c.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="form-group-compact">
                      <label>Papel na História:</label>
                      <input 
                        type="text" 
                        value={c.role} 
                        placeholder="Ex: Protagonista, Mentor..."
                        onChange={(e) => updateCharacter(c.id, 'role', e.target.value)}
                      />
                    </div>

                    <div className="form-group-compact">
                      <label>Aparência & Roupas:</label>
                      <textarea 
                        rows={2} 
                        value={c.appearance} 
                        placeholder="Aparência física, cabelo, olhos..."
                        onChange={(e) => updateCharacter(c.id, 'appearance', e.target.value)}
                      />
                    </div>

                    <div className="form-group-compact">
                      <label>Personalidade & Voz:</label>
                      <textarea 
                        rows={2} 
                        value={c.personality} 
                        placeholder="Traços marcantes de fala e comportamento..."
                        onChange={(e) => updateCharacter(c.id, 'personality', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA: LOCAIS */}
          {activeTab === 'locations' && (
            <div className="memory-tab-panel">
              <div className="tab-actions-header">
                <span className="text-sm text-secondary font-medium">Locais & Cenários</span>
                <button className="btn-primary-action-sm" onClick={addLocation}>
                  <Plus size={14} /> Adicionar Local
                </button>
              </div>

              <div className="memory-items-grid">
                {memory.locations.map((loc) => (
                  <div key={loc.id} className="memory-card">
                    <div className="memory-card-top">
                      <input 
                        type="text" 
                        className="input-memory-name" 
                        value={loc.name}
                        placeholder="Nome do Local"
                        onChange={(e) => updateLocation(loc.id, 'name', e.target.value)}
                      />
                      <button className="btn-icon-danger" onClick={() => deleteLocation(loc.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="form-group-compact">
                      <label>Descrição & Visual:</label>
                      <textarea 
                        rows={3} 
                        value={loc.description} 
                        placeholder="Como é este local, detalhes arquitetônicos..."
                        onChange={(e) => updateLocation(loc.id, 'description', e.target.value)}
                      />
                    </div>

                    <div className="form-group-compact">
                      <label>Atmosfera Dominante (Mood):</label>
                      <input 
                        type="text" 
                        value={loc.mood || ''} 
                        placeholder="Ex: Sombrio, aconchegante, futurista..."
                        onChange={(e) => updateLocation(loc.id, 'mood', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA: EVENTOS */}
          {activeTab === 'events' && (
            <div className="memory-tab-panel">
              <div className="tab-actions-header">
                <span className="text-sm text-secondary font-medium">Linha do Tempo & Acontecimentos Marcantes</span>
                <button className="btn-primary-action-sm" onClick={addEvent}>
                  <Plus size={14} /> Adicionar Evento
                </button>
              </div>

              <div className="memory-items-grid">
                {memory.events.map((ev) => (
                  <div key={ev.id} className="memory-card">
                    <div className="memory-card-top">
                      <div className="flex items-center gap-2">
                        <span className="badge-cap">Capítulo</span>
                        <input 
                          type="number" 
                          className="input-chapter-num-compact"
                          value={ev.chapterIndex}
                          onChange={(e) => updateEvent(ev.id, 'chapterIndex', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <button className="btn-icon-danger" onClick={() => deleteEvent(ev.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="form-group-compact">
                      <label>Título do Evento:</label>
                      <input 
                        type="text" 
                        value={ev.title} 
                        placeholder="Ex: Revelação da carta secreta..."
                        onChange={(e) => updateEvent(ev.id, 'title', e.target.value)}
                      />
                    </div>

                    <div className="form-group-compact">
                      <label>O que aconteceu:</label>
                      <textarea 
                        rows={2} 
                        value={ev.description} 
                        placeholder="Resumo do acontecimento..."
                        onChange={(e) => updateEvent(ev.id, 'description', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA: REGRAS */}
          {activeTab === 'rules' && (
            <div className="memory-tab-panel">
              <div className="tab-actions-header">
                <span className="text-sm text-secondary font-medium">Regras e Premissas Invioláveis</span>
                <button className="btn-primary-action-sm" onClick={addRule}>
                  <Plus size={14} /> Adicionar Regra
                </button>
              </div>

              <div className="memory-items-grid">
                {memory.rules.map((r) => (
                  <div key={r.id} className="memory-card">
                    <div className="memory-card-top">
                      <input 
                        type="text" 
                        className="input-memory-name" 
                        value={r.category}
                        placeholder="Categoria da Regra"
                        onChange={(e) => updateRule(r.id, 'category', e.target.value)}
                      />
                      <button className="btn-icon-danger" onClick={() => deleteRule(r.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="form-group-compact">
                      <label>Diretriz / Lei:</label>
                      <textarea 
                        rows={3} 
                        value={r.rule} 
                        placeholder="Ex: A magia exige energia vital; Não existe viagem no tempo..."
                        onChange={(e) => updateRule(r.id, 'rule', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="memory-modal-footer">
          <button className="btn-subtle" onClick={onClose}>Cancelar</button>
          <button className="btn-primary-glow" onClick={handleSaveAndClose}>
            <Save size={15} /> Salvar Memória do Livro
          </button>
        </div>
      </div>
    </div>
  );
};
