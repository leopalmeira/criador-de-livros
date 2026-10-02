import React, { useState } from 'react';
import {
  ChevronLeft, Search, Puzzle, ShieldCheck, Download, Save, RefreshCw,
  Eye, CheckCircle, AlertTriangle, FileText, Layers, ExternalLink,
  Users, Clock, MapPin, Compass, Key, BookOpen, AlertCircle
} from 'lucide-react';
import { 
  SudokuBookConfig, 
  InvestigationCase, 
  InvestigationTheme, 
  TimePeriod, 
  LocationType, 
  StoryStyle, 
  SudokuDifficulty, 
  SudokuTrimFormat,
  ConsistencyValidationReport 
} from '../../../types/sudoku-investigative';
import { SudokuInvestigativeService } from '../../../services/sudoku-investigative-service';
import '../../../styles/sudoku-investigative-studio.css';

interface Props {
  onBackToDashboard: () => void;
  onOpenProject?: (projectId: string) => void;
}

export const SudokuInvestigativeStudio: React.FC<Props> = ({ onBackToDashboard, onOpenProject }) => {
  // Configurações do Livro
  const [config, setConfig] = useState<SudokuBookConfig>({
    title: 'O Mistério da Mansão Blackwood',
    subtitle: 'Casos Criminais e Enigmas Lógicos de Sudoku para Decifrar',
    author: 'Leandro Palmeira',
    theme: 'assassinato',
    customTheme: '',
    caseCount: 5,
    suspectsPerCase: 6,
    sudokusPerCase: 5,
    difficulty: 'progressivo',
    timePeriod: 'vitoriana',
    customPeriod: '',
    location: 'mansao',
    customLocation: '',
    storyStyle: 'noir',
    customStyle: '',
    trimFormat: '8.5x11',
    hasBleed: false
  });

  // Estados de Execução e Casos
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('Pronto para iniciar');
  const [progressPercent, setProgressPercent] = useState(0);
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [validationReport, setValidationReport] = useState<ConsistencyValidationReport | null>(null);
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [activeCaseTab, setActiveCaseTab] = useState<number>(0);

  // Estados de PDF e Salvamento
  const [isPdfBuilding, setIsPdfBuilding] = useState(false);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [solutionsPdfUrl, setSolutionsPdfUrl] = useState<string | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);

  // Iniciar Geração Completa do Livro de Sudoku Investigativo
  const handleGenerateBook = async () => {
    setIsGenerating(true);
    setProgressPercent(10);
    setCurrentStep('Iniciando orquestração da investigação criminal...');
    setPdfDownloadUrl(null);
    setSolutionsPdfUrl(null);
    setSavedProjectId(null);

    try {
      const result = await SudokuInvestigativeService.generateCompleteBook(
        config,
        (step, percent) => {
          setCurrentStep(step);
          setProgressPercent(percent);
        }
      );

      setCases(result.cases);
      setValidationReport(result.validationReport);
      setCoverUrl(result.coverUrl);
      setActiveCaseTab(0);
    } catch (err: any) {
      alert('Erro durante a geração: ' + err.message);
      setCurrentStep('Falha na geração do livro');
    } finally {
      setIsGenerating(false);
    }
  };

  // Baixar PDF Interior KDP
  const handleDownloadInteriorPdf = async () => {
    if (validationReport && !validationReport.isValid) {
      alert('⚠️ Foram encontrados problemas de consistência. Corrija antes de publicar.');
      return;
    }

    if (pdfDownloadUrl) {
      const a = document.createElement('a');
      a.href = pdfDownloadUrl;
      a.download = `${config.title.replace(/\s+/g, '_')}_Interior_KDP.pdf`;
      a.click();
      return;
    }

    setIsPdfBuilding(true);
    try {
      const res = await SudokuInvestigativeService.generateInteriorPdf(config, cases);
      setPdfDownloadUrl(res.url);

      const a = document.createElement('a');
      a.href = res.url;
      a.download = `${config.title.replace(/\s+/g, '_')}_Interior_KDP.pdf`;
      a.click();
    } catch (err: any) {
      alert('Erro ao compilar PDF Interior: ' + err.message);
    } finally {
      setIsPdfBuilding(false);
    }
  };

  // Baixar PDF de Gabarito
  const handleDownloadSolutionsPdf = async () => {
    if (solutionsPdfUrl) {
      const a = document.createElement('a');
      a.href = solutionsPdfUrl;
      a.download = `${config.title.replace(/\s+/g, '_')}_Gabarito_Solucoes.pdf`;
      a.click();
      return;
    }

    setIsPdfBuilding(true);
    try {
      const res = await SudokuInvestigativeService.generateSolutionsPdf(config, cases);
      setSolutionsPdfUrl(res.url);

      const a = document.createElement('a');
      a.href = res.url;
      a.download = `${config.title.replace(/\s+/g, '_')}_Gabarito_Solucoes.pdf`;
      a.click();
    } catch (err: any) {
      alert('Erro ao compilar PDF de Gabarito: ' + err.message);
    } finally {
      setIsPdfBuilding(false);
    }
  };

  // Salvar no Projeto Atual
  const handleSaveToProject = async () => {
    try {
      if (cases.length === 0) {
        alert('Gere o livro antes de salvar o projeto.');
        return;
      }
      const project = await SudokuInvestigativeService.saveToBookProject(config, cases, coverUrl);
      setSavedProjectId(project.id);
      alert(`Projeto "${project.title}" salvo com sucesso no Book Intel KDP!`);
      if (onOpenProject) {
        onOpenProject(project.id);
      }
    } catch (err: any) {
      alert('Erro ao salvar projeto: ' + err.message);
    }
  };

  const selectedCase = cases[activeCaseTab] || cases[0];

  return (
    <div className="sis-wrapper">
      {/* 1. TOP NAVBAR */}
      <header className="sis-header">
        <div className="sis-header-inner">
          <div className="sis-brand-group">
            <button className="sis-btn-back" onClick={onBackToDashboard} title="Retornar à Dashboard">
              <ChevronLeft size={16} /> Home
            </button>
            <div className="sis-brand-title">
              <Search size={18} color="#f59e0b" />
              <span>Sudoku Investigativo</span>
              <span className="sis-badge-noir">Murder Mystery KDP</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="sis-kdp-pill">
              <Puzzle size={14} />
              <span>Sudokus com Pistas Integradas</span>
            </div>
            {validationReport?.isValid && (
              <div className="sis-kdp-pill" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.1)' }}>
                <CheckCircle size={14} />
                <span>100% Validado sem Contradições</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. CORPO PRINCIPAL COM GRID DE CONFIGURAÇÃO E PRÉVIA */}
      <main className="sis-main">
        <div className="sis-grid">
          
          {/* COLUNA ESQUERDA: FORMULÁRIO DE CONFIGURAÇÃO DO LIVRO */}
          <aside className="sis-config-card">
            <h2 className="sis-card-title">
              <Search size={18} color="#f59e0b" />
              🕵️ Configurar Livro de Sudoku Investigativo
            </h2>
            <p className="sis-card-subtitle">
              Crie casos policiais com lógica matemática em que cada Sudoku desvenda pistas para solucionar o crime.
            </p>

            {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
            <div className="sis-section-divider">
              <BookOpen size={12} /> Informações Básicas
            </div>

            <div className="sis-form-group">
              <label className="sis-label">Título do Projeto</label>
              <input
                type="text"
                className="sis-input"
                value={config.title}
                onChange={e => setConfig(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: O Mistério da Mansão Blackwood"
              />
            </div>

            <div className="sis-form-group">
              <label className="sis-label">Subtítulo Comercial</label>
              <input
                type="text"
                className="sis-input"
                value={config.subtitle || ''}
                onChange={e => setConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Ex: Casos Criminais e Enigmas de Sudoku"
              />
            </div>

            <div className="sis-form-group">
              <label className="sis-label">Tema da Investigação</label>
              <select
                className="sis-select"
                value={config.theme}
                onChange={e => setConfig(prev => ({ ...prev, theme: e.target.value as InvestigationTheme }))}
              >
                <option value="assassinato">Assassinato / Homicídio</option>
                <option value="roubo">Roubo de Joias & Obras de Arte</option>
                <option value="desaparecimento">Desaparecimento Misterioso</option>
                <option value="sequestro">Sequestro & Resgate</option>
                <option value="hotel">Mistério em Hotel de Luxo</option>
                <option value="mansao">Mistério em Mansão Isolada</option>
                <option value="trem">Mistério em Trem Noturno</option>
                <option value="navio">Mistério em Navio Transatlântico</option>
                <option value="museu">Mistério em Museu Histórico</option>
                <option value="cidade">Mistério em Cidade</option>
                <option value="historico">Caso Histórico</option>
                <option value="policial">Investigação Policial / CSI</option>
                <option value="outro">Tema Personalizado...</option>
              </select>
            </div>

            {config.theme === 'outro' && (
              <div className="sis-form-group">
                <label className="sis-label">Tema Personalizado</label>
                <input
                  type="text"
                  className="sis-input"
                  value={config.customTheme || ''}
                  onChange={e => setConfig(prev => ({ ...prev, customTheme: e.target.value }))}
                  placeholder="Ex: Conspiração em laboratório secreto"
                />
              </div>
            )}

            {/* SEÇÃO 2: ESTRUTURA DOS CASOS & SUDOKUS */}
            <div className="sis-section-divider">
              <Layers size={12} /> Volume & Dificuldade dos Casos
            </div>

            <div className="sis-form-group">
              <label className="sis-label">
                <span>Quantidade de Casos</span>
                <span style={{ fontSize: 11, color: '#f59e0b' }}>{config.caseCount} casos completos</span>
              </label>
              <div className="sis-segmented-group">
                {[5, 10, 15, 20, 25, 30].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`sis-seg-btn ${config.caseCount === n ? 'active' : ''}`}
                    onClick={() => setConfig(prev => ({ ...prev, caseCount: n }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="sis-form-group">
              <label className="sis-label">
                <span>Suspeitos por Caso</span>
                <span style={{ fontSize: 11, color: '#f59e0b' }}>{config.suspectsPerCase} pessoas</span>
              </label>
              <div className="sis-segmented-group">
                {[4, 5, 6, 8, 10].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`sis-seg-btn ${config.suspectsPerCase === n ? 'active' : ''}`}
                    onClick={() => setConfig(prev => ({ ...prev, suspectsPerCase: n }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="sis-form-group">
              <label className="sis-label">
                <span>Sudokus por Caso</span>
                <span style={{ fontSize: 11, color: '#f59e0b' }}>{config.sudokusPerCase} enigmas</span>
              </label>
              <div className="sis-segmented-group">
                {[3, 5, 8, 10, 12].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`sis-seg-btn ${config.sudokusPerCase === n ? 'active' : ''}`}
                    onClick={() => setConfig(prev => ({ ...prev, sudokusPerCase: n }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="sis-form-group">
              <label className="sis-label">Dificuldade dos Sudokus</label>
              <select
                className="sis-select"
                value={config.difficulty}
                onChange={e => setConfig(prev => ({ ...prev, difficulty: e.target.value as SudokuDifficulty }))}
              >
                <option value="facil">Fácil (42 pistas iniciais)</option>
                <option value="medio">Médio (35 pistas iniciais)</option>
                <option value="dificil">Difícil (29 pistas iniciais)</option>
                <option value="expert">Expert (24 pistas iniciais)</option>
                <option value="progressivo">Progressivo (Evolui do Fácil ao Expert)</option>
              </select>
            </div>

            {/* SEÇÃO 3: AMBIENTAÇÃO & ESTILO */}
            <div className="sis-section-divider">
              <Compass size={12} /> Ambientação & Estilo da História
            </div>

            <div className="sis-form-group">
              <label className="sis-label">Época Histórica</label>
              <select
                className="sis-select"
                value={config.timePeriod}
                onChange={e => setConfig(prev => ({ ...prev, timePeriod: e.target.value as TimePeriod }))}
              >
                <option value="vitoriana">Época Vitoriana (Fim do Século XIX)</option>
                <option value="anos1950">Anos 1950 (Pós-Guerra Clássico)</option>
                <option value="anos1980">Anos 1980</option>
                <option value="anos1990">Anos 1990</option>
                <option value="anos2000">Anos 2000</option>
                <option value="anos2020">Anos 2020</option>
                <option value="atual">Atualidade</option>
                <option value="futurista">Futurista / Cyber-Noir</option>
                <option value="personalizada">Personalizada...</option>
              </select>
            </div>

            <div className="sis-form-group">
              <label className="sis-label">Local Principal</label>
              <select
                className="sis-select"
                value={config.location}
                onChange={e => setConfig(prev => ({ ...prev, location: e.target.value as LocationType }))}
              >
                <option value="mansao">Mansão Isolada</option>
                <option value="hotel">Grand Hotel</option>
                <option value="trem">Trem Expresso</option>
                <option value="navio">Navio de Passageiros</option>
                <option value="museu">Museu</option>
                <option value="restaurante">Restaurante Gourmet</option>
                <option value="fazenda">Fazenda Rural</option>
                <option value="escritorio">Edifício Corporativo</option>
                <option value="universidade">Universidade Histórica</option>
                <option value="cidade_pequena">Cidade Pequena</option>
                <option value="cidade_grande">Metrópole</option>
                <option value="ilha">Ilha Misteriosa</option>
                <option value="outro">Outro Local...</option>
              </select>
            </div>

            <div className="sis-form-group">
              <label className="sis-label">Estilo Narrativo</label>
              <select
                className="sis-select"
                value={config.storyStyle}
                onChange={e => setConfig(prev => ({ ...prev, storyStyle: e.target.value as StoryStyle }))}
              >
                <option value="policial_classico">Policial Clássico (Sherlock / Poirot)</option>
                <option value="noir">Detetive Noir (Chinatown / Sombra)</option>
                <option value="thriller">Thriller Investigativo Tenso</option>
                <option value="misterio_classico">Mistério Clássico (Agatha Christie)</option>
                <option value="moderno">Investigação Moderna / Forense</option>
                <option value="suspense">Suspense Psicológico</option>
                <option value="personalizado">Personalizado...</option>
              </select>
            </div>

            {/* SEÇÃO 4: FORMATO KDP */}
            <div className="sis-section-divider">
              <FileText size={12} /> Formato Físico KDP
            </div>

            <div className="sis-form-group">
              <label className="sis-label">Tamanho de Impressão (Trim Size)</label>
              <select
                className="sis-select"
                value={config.trimFormat}
                onChange={e => setConfig(prev => ({ ...prev, trimFormat: e.target.value as SudokuTrimFormat }))}
              >
                <option value="8.5x11">8.5 x 11 pol (Padrão para Livros de Sudoku KDP)</option>
                <option value="8x10">8 x 10 pol</option>
                <option value="7.5x9.25">7.5 x 9.25 pol</option>
                <option value="6x9">6 x 9 pol (Trade Paperback)</option>
              </select>
            </div>

            {/* BOTÃO GERAR LIVRO */}
            <button
              className="sis-btn-generate"
              disabled={isGenerating}
              onClick={handleGenerateBook}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={16} className="sis-spin" />
                  <span>Gerando Livro ({progressPercent}%)...</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>GERAR LIVRO DE SUDOKU INVESTIGATIVO</span>
                </>
              )}
            </button>
          </aside>

          {/* COLUNA DIREITA: CASOS, SUDOKUS & PRÉVIA */}
          <section className="sis-preview-area">
            
            {/* STATUS & PROGRESSO EM TEMPO REAL */}
            <div className="sis-status-card">
              <div className="sis-status-header">
                <span className="sis-status-title">
                  {isGenerating ? <RefreshCw size={18} className="sis-spin" color="#f59e0b" /> : <ShieldCheck size={18} color="#10b981" />}
                  {currentStep}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>
                  {progressPercent}%
                </span>
              </div>

              <div className="sis-progress-bar-bg">
                <div className="sis-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
                <span>
                  {cases.length} casos criminais • {cases.reduce((s, c) => s + c.puzzles.length, 0)} Sudokus matematicamente validados
                </span>
                <span>
                  Tamanho KDP: <b>{config.trimFormat} pol</b>
                </span>
              </div>
            </div>

            {/* RELATÓRIO DO VALIDADOR DE CONSISTÊNCIA */}
            {validationReport && (
              <div style={{
                background: validationReport.isValid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${validationReport.isValid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`,
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: validationReport.isValid ? '#10b981' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    {validationReport.isValid ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    {validationReport.isValid ? 'Validação de Consistência Aprovada' : '⚠️ Foram encontrados problemas de consistência'}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {validationReport.passedChecks} de {validationReport.totalChecks} verificações passaram
                  </span>
                </div>

                {!validationReport.isValid && (
                  <div style={{ fontSize: 12, color: '#fca5a5' }}>
                    Corrija as inconsistências antes de prosseguir com a publicação.
                  </div>
                )}
              </div>
            )}

            {/* BARRA DE AÇÕES (DOWNLOAD PDF & GABARITO) */}
            <div className="sis-action-toolbar">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="sis-btn-download-pdf"
                  onClick={handleDownloadInteriorPdf}
                  disabled={cases.length === 0 || isPdfBuilding}
                >
                  {isPdfBuilding ? (
                    <>
                      <RefreshCw size={15} className="sis-spin" /> Compilando...
                    </>
                  ) : (
                    <>
                      <Download size={15} /> Baixar PDF Interior KDP
                    </>
                  )}
                </button>

                <button
                  className="sis-btn-secondary"
                  onClick={handleDownloadSolutionsPdf}
                  disabled={cases.length === 0 || isPdfBuilding}
                >
                  <Key size={14} /> Baixar Gabarito
                </button>

                {coverUrl && (
                  <a
                    href={coverUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="sis-btn-secondary"
                    style={{ textDecoration: 'none' }}
                  >
                    <ExternalLink size={14} /> Ver Arte da Capa
                  </a>
                )}
              </div>

              <button
                className="sis-btn-secondary"
                onClick={handleSaveToProject}
                disabled={cases.length === 0}
              >
                <Save size={15} /> Salvar no Projeto Atual
              </button>
            </div>

            {/* ABAS DOS CASOS */}
            {cases.length > 0 && (
              <div>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6 }}>
                  {cases.map((c, idx) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`sis-seg-btn ${activeCaseTab === idx ? 'active' : ''}`}
                      style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}
                      onClick={() => setActiveCaseTab(idx)}
                    >
                      Caso #{c.caseNumber} • {c.victim.nome.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {/* DETALHES DO CASO ATIVO */}
                {selectedCase && (
                  <div className="sis-case-card" style={{ marginTop: 12 }}>
                    <div className="sis-case-header">
                      <div>
                        <span className="sis-case-badge">Caso #{selectedCase.caseNumber}</span>
                        <h3 className="sis-case-title" style={{ marginTop: 4 }}>
                          {selectedCase.title}
                        </h3>
                      </div>
                      <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                        {selectedCase.puzzles.length} Sudokus investigativos
                      </span>
                    </div>

                    {/* Vítima & Cena */}
                    <div style={{
                      background: '#090e17',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      padding: '12px 14px',
                      marginBottom: 16
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                        👤 Vítima: {selectedCase.victim.nome} ({selectedCase.victim.idade} anos, {selectedCase.victim.profissao})
                      </div>
                      <p style={{ margin: '0 0 8px 0', fontSize: 12, color: '#94a3b8' }}>
                        {selectedCase.crimeScene.descricao}
                      </p>
                      <div style={{ fontSize: 11, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={12} /> Local: {selectedCase.crimeScene.localDetalhado} • Descoberta: {selectedCase.crimeScene.horaEncontrado}
                      </div>
                    </div>

                    {/* Suspeitos */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Users size={14} /> Dossiê de Suspeitos ({selectedCase.suspects.length})
                      </div>
                      <div className="sis-suspects-grid">
                        {selectedCase.suspects.map(s => (
                          <div key={s.id} className="sis-suspect-chip">
                            <div className="sis-suspect-name">
                              <span>#{s.numero} {s.nome}</span>
                              <span style={{ fontSize: 10, color: '#94a3b8' }}>{s.profissao}</span>
                            </div>
                            <div className="sis-suspect-info">
                              <b>Álibi:</b> "{s.alibi}"
                            </div>
                            <div className="sis-suspect-info">
                              <b>Motivo:</b> {s.possivelMotivo}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sudokus e Pistas do Caso */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Puzzle size={14} /> Sudokus do Caso com Pistas Decodificadas
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
                        {selectedCase.puzzles.map((p, idx) => (
                          <div key={p.id} style={{
                            background: '#090e17',
                            border: '1px solid #334155',
                            borderRadius: 10,
                            padding: 14,
                            display: 'flex',
                            gap: 14,
                            alignItems: 'center'
                          }}>
                            {/* Grade Miniatura */}
                            <div className="sis-sudoku-preview-grid">
                              {p.grid.slice(0, 9).map((row, rIdx) => 
                                row.map((val, cIdx) => {
                                  const isClueCell = rIdx === p.clueCell.row && cIdx === p.clueCell.col;
                                  const isThickR = (cIdx + 1) % 3 === 0 && cIdx < 8;
                                  const isThickB = (rIdx + 1) % 3 === 0 && rIdx < 8;

                                  return (
                                    <div
                                      key={`${rIdx}-${cIdx}`}
                                      className={`sis-sudoku-cell ${isClueCell ? 'clue-cell' : ''} ${isThickR ? 'thick-right' : ''} ${isThickB ? 'thick-bottom' : ''}`}
                                    >
                                      {val !== 0 ? val : (isClueCell ? '★' : '')}
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Informações da Pista */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1' }}>
                                  Sudoku #{p.puzzleIndex} ({p.difficulty.toUpperCase()})
                                </span>
                                <span className="sis-clue-badge">
                                  {p.associatedClue.clueType.toUpperCase()}
                                </span>
                              </div>

                              <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
                                🔎 Pista: "{p.associatedClue.revelationText}"
                              </div>

                              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.35 }}>
                                {p.associatedClue.pointsToCulpritReason}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Solução Final do Caso */}
                    <div style={{
                      marginTop: 18,
                      padding: 14,
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: 10
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
                        🔒 Solução Registrada no Gabarito:
                      </div>
                      <div style={{ fontSize: 12, color: '#f1f5f9' }}>
                        <b>Assassino:</b> {selectedCase.caseSolution.culprit.nome} ({selectedCase.caseSolution.culprit.profissao})
                      </div>
                      <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>
                        <b>Como o crime foi solucionado:</b> {selectedCase.caseSolution.howCrimeHappened}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* ESTADO INICIAL VAZIO */}
            {cases.length === 0 && !isGenerating && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px dashed #334155',
                borderRadius: 16,
                padding: '60px 24px',
                textAlign: 'center'
              }}>
                <Search size={48} color="#f59e0b" style={{ margin: '0 auto 16px auto', display: 'block' }} />
                <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#f8fafc' }}>
                  Nenhum livro de Sudoku investigativo gerado ainda
                </h3>
                <p style={{ margin: '0 auto 20px auto', fontSize: 13, color: '#94a3b8', maxWidth: 460 }}>
                  Configure os parâmetros na barra lateral esquerda e clique em <b>"GERAR LIVRO DE SUDOKU INVESTIGATIVO"</b> para criar automaticamente as histórias, pistas coerentes, grades matemáticas e o PDF completo para publicação na Amazon KDP.
                </p>
                <button className="sis-btn-generate" style={{ width: 'auto', display: 'inline-flex' }} onClick={handleGenerateBook}>
                  <Search size={16} /> Começar Investigação
                </button>
              </div>
            )}

          </section>

        </div>
      </main>
    </div>
  );
};
