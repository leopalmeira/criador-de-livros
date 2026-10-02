import React, { useState, useEffect } from 'react';
import { BookProject } from '../../../types/book-project';
import { 
  CoverPromptEngine, 
  AiImageEngine, 
  CoverEnginePrompt 
} from '../../../services/cover-studio/cover-prompt-engine';
import { 
  ChromiumGeminiBridge 
} from '../../../services/cover-studio/chromium-gemini-bridge';
import { 
  Sparkles, 
  ExternalLink, 
  Copy, 
  Check, 
  Upload, 
  Clipboard, 
  Layers, 
  Wand2, 
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';

interface Props {
  project: BookProject;
  onImportArt: (dataUrl: string) => void;
  onNotification?: (msg: string) => void;
}

export const CoverPromptPanel: React.FC<Props> = ({ project, onImportArt, onNotification }) => {
  const [selectedEngine, setSelectedEngine] = useState<AiImageEngine>('gemini-imagen');
  const [customVisualSubject, setCustomVisualSubject] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isLaunchingGemini, setIsLaunchingGemini] = useState(false);
  const [isRefiningWithAi, setIsRefiningWithAi] = useState(false);

  const topic = project.topic || project.title || 'Alta Performance';
  const defaultSubject = `powerful symbolic composition representing ${topic}, sleek architectural interior overlooking sunrise, glowing golden morning light rays, dark luxury aesthetic, sharp focus`;
  const activeSubject = customVisualSubject.trim() || defaultSubject;

  const currentEnginePrompt: CoverEnginePrompt = CoverPromptEngine.buildEnginePrompt(
    selectedEngine,
    activeSubject,
    topic,
    project.genre || project.kdpBookType
  );

  // Escuta evento global de colar (Ctrl + V) para capturar imagem da área de transferência
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const imgData = await ChromiumGeminiBridge.extractImageFromClipboardEvent(e);
      if (imgData) {
        onImportArt(imgData);
        if (onNotification) onNotification('✓ Imagem capturada com sucesso da Área de Transferência (Ctrl+V)!');
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onImportArt, onNotification]);

  // Copia o prompt do motor ativo
  const handleCopyPrompt = async () => {
    const success = await ChromiumGeminiBridge.copyPromptToClipboard(currentEnginePrompt.readyToCopyCommand);
    if (success) {
      setCopiedPrompt(true);
      if (onNotification) onNotification('✓ Prompt copiado para a Área de Transferência!');
      setTimeout(() => setCopiedPrompt(false), 2500);
    }
  };

  // Abre sessão do Google Gemini no Chromium
  const handleLaunchGeminiSession = async (target: 'gemini-web' | 'ai-studio') => {
    setIsLaunchingGemini(true);
    const result = await ChromiumGeminiBridge.launchAuthenticatedGeminiSession(
      currentEnginePrompt.positivePrompt,
      target
    );
    setIsLaunchingGemini(false);
    if (onNotification) onNotification(result.message);
  };

  // Upload manual de imagem
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const dataUrl = await ChromiumGeminiBridge.fileToDataUrl(files[0]);
      onImportArt(dataUrl);
      if (onNotification) onNotification('✓ Nova imagem de capa importada com sucesso!');
    }
  };

  // Refina prompt com a API Gemini oficial
  const handleRefineWithGemini = async () => {
    setIsRefiningWithAi(true);
    try {
      const refined = await ChromiumGeminiBridge.refinePromptWithGeminiApi(
        activeSubject,
        project.topic || project.title || 'Desenvolvimento'
      );
      setCustomVisualSubject(refined);
      if (onNotification) onNotification('✨ Prompt enriquecido com o Diretor de Arte Gemini!');
    } catch {
      if (onNotification) onNotification('Prompt mantido no padrão otimizado.');
    } finally {
      setIsRefiningWithAi(false);
    }
  };

  return (
    <div className="cover-subpanel-container">
      {/* SELEÇÃO DO MOTOR DE IA */}
      <div className="panel-section-card" style={{ marginBottom: 16 }}>
        <div className="panel-card-header-row">
          <h4 className="panel-card-title">
            <Sparkles size={18} color="#2563eb" /> 1. Escolha o Motor de IA para Geração
          </h4>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Proporção 2:3 Otimizada</span>
        </div>

        <div className="engine-selector-chips">
          <button
            type="button"
            className={`engine-chip ${selectedEngine === 'gemini-imagen' ? 'active' : ''}`}
            onClick={() => setSelectedEngine('gemini-imagen')}
          >
            ✨ Google Gemini Imagen 3
          </button>
          <button
            type="button"
            className={`engine-chip ${selectedEngine === 'flux-1' ? 'active' : ''}`}
            onClick={() => setSelectedEngine('flux-1')}
          >
            ⚡ FLUX.1 Pro / Schnell
          </button>
          <button
            type="button"
            className={`engine-chip ${selectedEngine === 'midjourney' ? 'active' : ''}`}
            onClick={() => setSelectedEngine('midjourney')}
          >
            🎨 Midjourney v6.1
          </button>
          <button
            type="button"
            className={`engine-chip ${selectedEngine === 'sdxl-comfy' ? 'active' : ''}`}
            onClick={() => setSelectedEngine('sdxl-comfy')}
          >
            🖥️ ComfyUI (SDXL Local)
          </button>
          <button
            type="button"
            className={`engine-chip ${selectedEngine === 'dalle-3' ? 'active' : ''}`}
            onClick={() => setSelectedEngine('dalle-3')}
          >
            🔮 OpenAI DALL-E 3
          </button>
        </div>

        {/* Customização do Conceito Visual */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="form-label" style={{ margin: 0 }}>
              Conceito Visual da Cena (Personalizável):
            </label>
            <button
              type="button"
              className="btn-box-suggest"
              onClick={handleRefineWithGemini}
              disabled={isRefiningWithAi}
            >
              <Wand2 size={12} /> {isRefiningWithAi ? 'Calibrando...' : 'Calibrar com Gemini IA'}
            </button>
          </div>
          <textarea
            className="form-textarea"
            rows={3}
            value={customVisualSubject}
            onChange={(e) => setCustomVisualSubject(e.target.value)}
            placeholder={defaultSubject}
          />
        </div>
      </div>

      {/* INTEGRAÇÃO CHROMIUM & SESSÃO AUTENTICADA GEMINI */}
      <div className="panel-section-card" style={{ marginBottom: 16 }}>
        <div className="panel-card-header-row">
          <h4 className="panel-card-title">
            <ExternalLink size={18} color="#0284c7" /> 2. Integração Chromium & Sessão Autenticada Gemini
          </h4>
          <span className="badge-tag-blue">Navegador Integrado</span>
        </div>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
          Inicie uma sessão direta no Google Gemini. O prompt formatado será copiado automaticamente para sua área de transferência.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-launch-gemini"
            onClick={() => handleLaunchGeminiSession('gemini-web')}
            disabled={isLaunchingGemini}
          >
            <Sparkles size={16} /> Abrir Sessão no Google Gemini (Web)
          </button>
          <button
            type="button"
            className="btn-launch-aistudio"
            onClick={() => handleLaunchGeminiSession('ai-studio')}
            disabled={isLaunchingGemini}
          >
            <ExternalLink size={16} /> Abrir Google AI Studio
          </button>
          <button
            type="button"
            className="btn-copy-prompt-main"
            onClick={handleCopyPrompt}
          >
            {copiedPrompt ? <><Check size={16} /> Prompt Copiado!</> : <><Copy size={16} /> Copiar Prompt Formatado</>}
          </button>
        </div>
      </div>

      {/* PROMPT FORMATADO & PARÂMETROS TÉCNICOS */}
      <div className="panel-section-card" style={{ marginBottom: 16 }}>
        <div className="panel-card-header-row">
          <h4 className="panel-card-title">
            <Layers size={18} color="#f59e0b" /> 3. Prompt Otimizado para {currentEnginePrompt.engineName}
          </h4>
          <span style={{ fontSize: 11, color: '#64748b' }}>Proporção: {currentEnginePrompt.aspectRatio}</span>
        </div>

        <div className="prompt-display-block">
          <span className="prompt-label-badge">Prompt Positivo (Comando Completo):</span>
          <p className="prompt-text-content">{currentEnginePrompt.readyToCopyCommand}</p>
        </div>

        {currentEnginePrompt.negativePrompt && (
          <div className="prompt-display-block" style={{ marginTop: 10, background: 'rgba(239, 68, 68, 0.08)' }}>
            <span className="prompt-label-badge" style={{ color: '#f87171' }}>Prompt Negativo (Evitar Aberrações):</span>
            <p className="prompt-text-content" style={{ color: '#fca5a5' }}>{currentEnginePrompt.negativePrompt}</p>
          </div>
        )}
      </div>

      {/* CAPTURA E IMPORTAÇÃO DA CAPA (CLIPBOARD / UPLOAD) */}
      <div className="panel-section-card">
        <div className="panel-card-header-row">
          <h4 className="panel-card-title">
            <Clipboard size={18} color="#10b981" /> 4. Capturar Imagem ou Importar Capa
          </h4>
          <span className="badge-tag-green">Atalho: Ctrl + V</span>
        </div>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>
          Depois de gerar a imagem no Gemini ou Midjourney, copie a imagem (ou faça print) e pressione <b>Ctrl + V</b> em qualquer lugar desta tela, ou selecione o arquivo abaixo:
        </p>

        <div className="paste-drop-zone">
          <Upload size={32} color="#64748b" style={{ marginBottom: 8 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
            Pressione Ctrl + V para colar a imagem gerada
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 12px 0' }}>
            ou clique no botão para carregar arquivo (PNG, JPG, WEBP)
          </span>

          <label className="btn-file-upload-styled">
            <Upload size={14} /> Selecionar Arquivo do Computador
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
