import React, { useEffect, useState } from 'react';
import { AppSettings, Marketplace, AiSettings } from '../../types';
import { db } from '../../database/local-database';
import { AiService } from '../../services/ai-service';
import { defaultKdpBridge, BridgeHealthResponse } from '../../services/kdp-bridge-client';

export const SettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestMsg, setAiTestMsg] = useState<{ success: boolean; message: string } | null>(null);
  const [checkingBridge, setCheckingBridge] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeHealthResponse | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [detectingOllama, setDetectingOllama] = useState<boolean>(false);
  const [testingImage, setTestingImage] = useState<boolean>(false);
  const [imageTestMsg, setImageTestMsg] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    db.getSettings().then(setSettings);
  }, []);

  if (!settings) {
    return <div style={{ color: '#8b96ad', padding: '40px' }}>Carregando configurações...</div>;
  }

  const currentAi: AiSettings = settings.aiSettings || {
    provider: 'local-builtin',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'local-coauthor-engine',
    azureEndpoint: '',
    azureApiKey: '',
    azureImageEndpoint: '',
    imageProvider: 'builtin-flux',
    imageEndpoint: 'http://127.0.0.1:7865',
    imageModel: 'flux',
    temperature: 0.7
  };

  const detectOllamaModels = async (baseUrl?: string) => {
    setDetectingOllama(true);
    try {
      const url = baseUrl || currentAi.baseUrl || 'http://localhost:11434';
      const models = await AiService.fetchOllamaModels(url);
      setOllamaModels(models);
      if (models.length > 0) {
        if (currentAi.model === 'gpt-4o-mini' || currentAi.model === 'gpt-4o' || !models.includes(currentAi.model)) {
          handleAiChange('model', models[0]);
        }
      }
    } catch {
      // silencioso
    } finally {
      setDetectingOllama(false);
    }
  };

  const handleAiChange = (field: keyof AiSettings, value: any) => {
    const updatedAi = { ...currentAi, [field]: value };
    
    // Auto-ajustes inteligentes ao trocar o provedor
    if (field === 'provider') {
      if (value === 'ollama') {
        if (!updatedAi.baseUrl || updatedAi.baseUrl.includes('openai.com')) {
          updatedAi.baseUrl = 'http://localhost:11434';
        }
        if (updatedAi.model === 'gpt-4o-mini' || updatedAi.model === 'gpt-4o') {
          updatedAi.model = 'llama3.1';
        }
        detectOllamaModels(updatedAi.baseUrl);
      } else if (value === 'gemini') {
        updatedAi.model = 'gemini-2.0-flash';
        const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
        const envFallbackKey = (import.meta as any).env?.VITE_GEMINI_FALLBACK_API_KEY || '';
        if (!updatedAi.apiKey && envKey) {
          updatedAi.apiKey = envKey;
        }
        if (!updatedAi.fallbackApiKey && envFallbackKey) {
          updatedAi.fallbackApiKey = envFallbackKey;
        }
      } else if (value === 'openai') {
        if (updatedAi.model === 'llama3.1' || updatedAi.model === 'local-coauthor-engine') {
          updatedAi.model = 'gpt-4o-mini';
        }
        updatedAi.baseUrl = 'https://api.openai.com/v1';
      }
    }

    if (field === 'imageProvider') {
      if (value === 'fooocus') {
        if (!updatedAi.imageEndpoint || updatedAi.imageEndpoint.includes('7860') || updatedAi.imageEndpoint.includes('8188')) {
          updatedAi.imageEndpoint = 'http://127.0.0.1:7865';
        }
      } else if (value === 'sd-webui') {
        if (!updatedAi.imageEndpoint || updatedAi.imageEndpoint.includes('7865') || updatedAi.imageEndpoint.includes('8188')) {
          updatedAi.imageEndpoint = 'http://127.0.0.1:7860';
        }
      } else if (value === 'comfyui') {
        if (!updatedAi.imageEndpoint || updatedAi.imageEndpoint.includes('7860') || updatedAi.imageEndpoint.includes('7865')) {
          updatedAi.imageEndpoint = 'http://127.0.0.1:8188';
        }
      }
    }

    setSettings({ ...settings, aiSettings: updatedAi });
  };

  const handleTestImageConnection = async () => {
    setTestingImage(true);
    setImageTestMsg(null);
    try {
      const aiService = new AiService(currentAi);
      const res = await aiService.testImageConnection();
      setImageTestMsg({ success: res.success, message: res.message });
    } catch (err: any) {
      setImageTestMsg({ success: false, message: `Erro ao testar gerador de imagens: ${err.message}` });
    } finally {
      setTestingImage(false);
    }
  };

  const handleTestAiConnection = async () => {
    setTestingAi(true);
    setAiTestMsg(null);
    try {
      const aiService = new AiService(currentAi);
      const res = await aiService.testConnection();
      setAiTestMsg({ success: res.success, message: res.message });
    } catch (err: any) {
      setAiTestMsg({ success: false, message: `Erro: ${err.message}` });
    } finally {
      setTestingAi(false);
    }
  };

  const handleCheckBridge = async () => {
    setCheckingBridge(true);
    try {
      const health = await defaultKdpBridge.checkHealth();
      setBridgeStatus(health);
    } catch (err: any) {
      setBridgeStatus({ status: 'offline', message: `Erro ao conectar: ${err.message}` });
    } finally {
      setCheckingBridge(false);
    }
  };

  const handleChange = (key: keyof AppSettings, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleRoyaltyChange = (currency: string, field: string, value: number) => {
    const updated = { ...settings.royaltySettings };
    if (!updated[currency]) updated[currency] = { ...settings.royaltySettings['BRL'] };
    (updated[currency] as any)[field] = value;
    setSettings({ ...settings, royaltySettings: updated });
  };

  const handleWeightChange = (field: string, value: number) => {
    setSettings({
      ...settings,
      opportunityWeights: {
        ...settings.opportunityWeights,
        [field]: value
      }
    });
  };

  const handleSave = async () => {
    await db.saveSettings(settings);
    setStatusMsg('✓ Configurações gravadas com sucesso!');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const currRoyalty = settings.royaltySettings['BRL'] || settings.royaltySettings['USD'];


  return (
    <div>
      <div className="header-banner">
        <div>
          <h2 className="page-title">Configurações do BookIntel</h2>
          <div className="page-subtitle">Ajuste parâmetros de exibição, moedas, royalties KDP e cálculo de oportunidade</div>
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          Salvar Todas as Configurações
        </button>
      </div>

      {statusMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '8px', color: '#34d399', marginBottom: '20px', fontWeight: 600 }}>
          {statusMsg}
        </div>
      )}

      {/* Geral e Interface */}
      <div className="data-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: '#fff' }}>
          Geral & Comportamento na Amazon
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label">Marketplace Padrão:</label>
            <select
              className="input-field"
              value={settings.defaultMarketplace}
              onChange={(e) => handleChange('defaultMarketplace', e.target.value as Marketplace)}
              style={{ width: '100%' }}
            >
              <option value="amazon.com.br">🇧🇷 Brasil (amazon.com.br)</option>
              <option value="amazon.com">🇺🇸 Estados Unidos (amazon.com)</option>
              <option value="amazon.co.uk">🇬🇧 Reino Unido (amazon.co.uk)</option>
              <option value="amazon.de">🇩🇪 Alemanha (amazon.de)</option>
              <option value="amazon.es">🇪🇸 Espanha (amazon.es)</option>
              <option value="amazon.fr">🇫🇷 França (amazon.fr)</option>
              <option value="amazon.it">🇮🇹 Itália (amazon.it)</option>
              <option value="amazon.ca">🇨🇦 Canadá (amazon.ca)</option>
              <option value="amazon.co.jp">🇯🇵 Japão (amazon.co.jp)</option>
              <option value="amazon.com.mx">🇲🇽 México (amazon.com.mx)</option>
              <option value="amazon.in">🇮🇳 Índia (amazon.in)</option>
              <option value="amazon.com.au">🇦🇺 Austrália (amazon.com.au)</option>
              <option value="amazon.nl">🇳🇱 Holanda (amazon.nl)</option>
              <option value="amazon.pl">🇵🇱 Polônia (amazon.pl)</option>
              <option value="amazon.se">🇸🇪 Suécia (amazon.se)</option>
              <option value="amazon.com.be">🇧🇪 Bélgica (amazon.com.be)</option>
              <option value="amazon.ae">🇦🇪 Emirados Árabes (amazon.ae)</option>
              <option value="amazon.sa">🇸🇦 Arábia Saudita (amazon.sa)</option>
              <option value="amazon.sg">🇸🇬 Singapura (amazon.sg)</option>
              <option value="amazon.eg">🇪🇬 Egito (amazon.eg)</option>
              <option value="amazon.com.tr">🇹🇷 Turquia (amazon.com.tr)</option>
              <option value="amazon.co.za">🇿🇦 África do Sul (amazon.co.za)</option>
            </select>
            <div className="form-helper">Marketplace sugerido quando a URL for ambígua.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Multiplicador de Dias para Cálculo Mensal:</label>
            <select
              className="input-field"
              value={settings.monthlyDaysMultiplier}
              onChange={(e) => handleChange('monthlyDaysMultiplier', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            >
              <option value="30">30 dias exatos</option>
              <option value="30.44">30,44 dias (Média anual do calendário)</option>
            </select>
            <div className="form-helper">Define como as vendas/receita mensal são projetadas a partir do dia.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Tempo de Cache Local (Minutos):</label>
            <input
              type="number"
              className="input-field"
              value={settings.cacheTtlMinutes}
              onChange={(e) => handleChange('cacheTtlMinutes', parseInt(e.target.value, 10))}
              style={{ width: '100%' }}
            />
            <div className="form-helper">Evita reprocessamentos desnecessários em visitas frequentes.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Modo Debug (Diagnóstico Técnico):</label>
            <select
              className="input-field"
              value={settings.debugMode ? 'true' : 'false'}
              onChange={(e) => handleChange('debugMode', e.target.value === 'true')}
              style={{ width: '100%' }}
            >
              <option value="false">Desativado (Normal)</option>
              <option value="true">Ativado (Registra seletores e logs detalhados)</option>
            </select>
            <div className="form-helper">Ativa logs na aba de Diagnóstico para inspecionar seletores DOM.</div>
          </div>
        </div>
      </div>

      {/* Parâmetros de Royalties KDP */}
      <div className="data-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 800, color: '#fff' }}>
          Parâmetros de Royalties KDP (Kindle & Impressão sob Demanda)
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#8b96ad' }}>
          Ajuste as taxas e os custos de produção estimados para cálculo de lucro líquido por exemplar.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label">Taxa Alta Kindle (ex: 0.70 para 70%):</label>
            <input
              type="number"
              step="0.05"
              className="input-field"
              value={currRoyalty.kindleRateHigh}
              onChange={(e) => handleRoyaltyChange('BRL', 'kindleRateHigh', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Preço Mínimo Faixa 70% (BRL):</label>
            <input
              type="number"
              step="0.50"
              className="input-field"
              value={currRoyalty.kindleMinPriceForHighRate}
              onChange={(e) => handleRoyaltyChange('BRL', 'kindleMinPriceForHighRate', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Preço Máximo Faixa 70% (BRL):</label>
            <input
              type="number"
              step="1.0"
              className="input-field"
              value={currRoyalty.kindleMaxPriceForHighRate}
              onChange={(e) => handleRoyaltyChange('BRL', 'kindleMaxPriceForHighRate', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">KDP Print Capa Comum - Custo Fixo (R$):</label>
            <input
              type="number"
              step="0.50"
              className="input-field"
              value={currRoyalty.paperbackFixedCost}
              onChange={(e) => handleRoyaltyChange('BRL', 'paperbackFixedCost', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">KDP Print - Custo por Página (R$):</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={currRoyalty.paperbackPerPageCost}
              onChange={(e) => handleRoyaltyChange('BRL', 'paperbackPerPageCost', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Taxa KDP Print (ex: 0.60 para 60%):</label>
            <input
              type="number"
              step="0.05"
              className="input-field"
              value={currRoyalty.paperbackRoyaltyRate}
              onChange={(e) => handleRoyaltyChange('BRL', 'paperbackRoyaltyRate', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Pesos do Opportunity Score */}
      <div className="data-card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 800, color: '#fff' }}>
          Pesos do Opportunity Score (0 a 100)
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#8b96ad' }}>
          Controle a importância relativa de cada fator na pontuação de oportunidade do livro.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label">Volume de Vendas (Peso):</label>
            <input
              type="number"
              className="input-field"
              value={settings.opportunityWeights.salesWeight}
              onChange={(e) => handleWeightChange('salesWeight', parseInt(e.target.value, 10))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Barreira de Reviews (Peso):</label>
            <input
              type="number"
              className="input-field"
              value={settings.opportunityWeights.reviewBarrierWeight}
              onChange={(e) => handleWeightChange('reviewBarrierWeight', parseInt(e.target.value, 10))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Qualidade / Avaliação (Peso):</label>
            <input
              type="number"
              className="input-field"
              value={settings.opportunityWeights.ratingWeight}
              onChange={(e) => handleWeightChange('ratingWeight', parseInt(e.target.value, 10))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Margem de Preço (Peso):</label>
            <input
              type="number"
              className="input-field"
              value={settings.opportunityWeights.priceWeight}
              onChange={(e) => handleWeightChange('priceWeight', parseInt(e.target.value, 10))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Recência / Idade (Peso):</label>
            <input
              type="number"
              className="input-field"
              value={settings.opportunityWeights.recencyWeight}
              onChange={(e) => handleWeightChange('recencyWeight', parseInt(e.target.value, 10))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Inteligência Artificial & Pipeline kdp-book */}
      <div className="data-card" style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🤖</span> Inteligência Artificial (Pipeline kdp-book & Criação de Livros)
            </h3>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              Configuração dos modelos de linguagem para geração autônoma de livros (OpenAI, Azure, OpenRouter, Claude, Ollama)
            </div>
          </div>

          <button 
            type="button"
            className="btn btn-secondary"
            onClick={handleTestAiConnection}
            disabled={testingAi}
            style={{ borderColor: '#8b5cf6', color: '#c084fc' }}
          >
            {testingAi ? 'Testando Conexão...' : '⚡ Testar Conexão com IA'}
          </button>
        </div>

        {aiTestMsg && (
          <div style={{ 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            background: aiTestMsg.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${aiTestMsg.success ? '#10b981' : '#ef4444'}`,
            color: aiTestMsg.success ? '#34d399' : '#f87171',
            fontSize: '13px',
            fontWeight: 600
          }}>
            {aiTestMsg.message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label">Provedor de IA:</label>
            <select
              className="input-field"
              value={currentAi.provider}
              onChange={(e) => handleAiChange('provider', e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="gemini">✨ Google Gemini Oficial (Gemini 2.0 Flash / 1.5 Pro - Alta Janela de Contexto)</option>
              <option value="local-builtin">⚡ Motor Local Embutido (Offline / 100% Gratuito / Modo CoAuthor)</option>
              <option value="ollama">🦙 Ollama (Local / Gratuito / Offline)</option>
              <option value="openai">OpenAI Oficial (GPT-4o, GPT-4o-mini)</option>
              <option value="azure">Azure OpenAI (kdp-book padrão / gpt-5.5 / gpt-image-2)</option>
              <option value="openrouter">OpenRouter (Claude, DeepSeek, Llama, Gemini)</option>
              <option value="anthropic">Anthropic (Claude 3.5 Sonnet / Haiku)</option>
              <option value="custom">Compatível com OpenAI (Groq, Together, LM Studio)</option>
            </select>
            <div className="form-helper">
              {currentAi.provider === 'gemini'
                ? '✨ Google Gemini com 1M+ tokens de janela de contexto. Rotação automática e proteção contra esgotamento de quota ativas.'
                : currentAi.provider === 'local-builtin'
                ? '⚡ O Motor Local Embutido gera o livro 100% offline, sem gastar tokens e sem precisar instalar nada.'
                : 'Selecione o provedor para executar os agentes de criação.'}
            </div>
          </div>

          {currentAi.provider !== 'local-builtin' && (
            <>
              <div className="form-group">
                <label className="form-label">Chave de API Principal (API Key):</label>
                <input
                  type="password"
                  className="input-field"
                  value={currentAi.apiKey}
                  onChange={(e) => handleAiChange('apiKey', e.target.value)}
                  placeholder={currentAi.provider === 'gemini' ? 'AQ.Ab8... ou AIza...' : currentAi.provider === 'ollama' ? 'Não necessária para Ollama' : 'sk-... ou sua chave secreta'}
                  style={{ width: '100%' }}
                />
                <div className="form-helper">
                  {currentAi.provider === 'gemini'
                    ? 'Chave principal Google Gemini (novo formato de segurança AQ. ou clássico AIza).'
                    : currentAi.provider === 'ollama' ? 'Ollama local não requer chave de autenticação.' : 'Armazenada com segurança apenas no seu navegador local.'}
                </div>
              </div>

              {currentAi.provider === 'gemini' && (
                <div className="form-group">
                  <label className="form-label">Chave de Reserva / Fallback (Rotação Automática):</label>
                  <input
                    type="password"
                    className="input-field"
                    value={currentAi.fallbackApiKey || ''}
                    onChange={(e) => handleAiChange('fallbackApiKey', e.target.value)}
                    placeholder="AQ.Ab8... chave reserva se a primeira der rate limit"
                    style={{ width: '100%' }}
                  />
                  <div className="form-helper">
                    Se a chave principal atingir o limite de quota (429) ou falhar, o sistema alternará instantaneamente para esta chave.
                  </div>
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>Modelo Principal (LLM):</label>
              {currentAi.provider === 'ollama' && (
                <button
                  type="button"
                  onClick={() => detectOllamaModels()}
                  style={{
                    background: 'transparent',
                    border: '1px solid #3b82f6',
                    color: '#60a5fa',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  {detectingOllama ? 'Detectando...' : '🔍 Detectar Modelos do PC'}
                </button>
              )}
            </div>

            {currentAi.provider === 'ollama' && ollamaModels.length > 0 ? (
              <select
                className="input-field"
                value={currentAi.model}
                onChange={(e) => handleAiChange('model', e.target.value)}
                style={{ width: '100%' }}
              >
                {ollamaModels.map(m => (
                  <option key={m} value={m}>{m} (Instalado no seu PC)</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="input-field"
                value={currentAi.model}
                onChange={(e) => handleAiChange('model', e.target.value)}
                placeholder={
                  currentAi.provider === 'ollama' ? 'llama3.1, mistral, deepseek-r1...' :
                  currentAi.provider === 'local-builtin' ? 'local-coauthor-engine' :
                  'gpt-4o-mini, gpt-4o, claude-3-5-sonnet, etc.'
                }
                disabled={currentAi.provider === 'local-builtin'}
                style={{ width: '100%' }}
              />
            )}
            <div className="form-helper">
              {currentAi.provider === 'ollama'
                ? 'Modelos locais recomendados: llama3.1, mistral, deepseek-r1:8b ou qwen2.5.'
                : currentAi.provider === 'local-builtin'
                ? 'Motor local estruturado ativo (Padrão CoAuthor).'
                : 'Recomendado: gpt-4o-mini (rápido e econômico) ou gpt-4o.'}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Base URL da API (Opcional):</label>
            <input
              type="text"
              className="input-field"
              value={currentAi.baseUrl || ''}
              onChange={(e) => handleAiChange('baseUrl', e.target.value)}
              placeholder="https://api.openai.com/v1"
              style={{ width: '100%' }}
            />
            <div className="form-helper">Padrão da OpenAI ou URL do seu servidor local/proxy.</div>
          </div>

          {currentAi.provider === 'azure' && (
            <>
              <div className="form-group">
                <label className="form-label">Azure Endpoint:</label>
                <input
                  type="text"
                  className="input-field"
                  value={currentAi.azureEndpoint || ''}
                  onChange={(e) => handleAiChange('azureEndpoint', e.target.value)}
                  placeholder="https://seu-recurso.cognitiveservices.azure.com/openai/v1/"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Azure Endpoint de Imagens (gpt-image-2):</label>
                <input
                  type="text"
                  className="input-field"
                  value={currentAi.azureImageEndpoint || ''}
                  onChange={(e) => handleAiChange('azureImageEndpoint', e.target.value)}
                  placeholder="https://.../openai/deployments/gpt-image-2/images/generations?api-version=2024-02-01"
                  style={{ width: '100%' }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Geração de Imagens & Capas KDP (Motores Locais no GitHub & Nuvem) */}
      <div className="data-card" style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(236, 72, 153, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: '#f472b6', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎨</span> Motores de Geração de Imagens & Capas KDP (Fooocus / SD WebUI / Flux)
            </h3>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              Suporte nativo aos geradores de imagem mais aclamados do GitHub e ao modelo neural Flux.1
            </div>
          </div>

          <button 
            type="button"
            className="btn btn-secondary"
            onClick={handleTestImageConnection}
            disabled={testingImage}
            style={{ borderColor: '#ec4899', color: '#f472b6' }}
          >
            {testingImage ? 'Testando Conexão...' : '⚡ Testar Gerador de Imagens'}
          </button>
        </div>

        {imageTestMsg && (
          <div style={{ 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            background: imageTestMsg.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${imageTestMsg.success ? '#10b981' : '#ef4444'}`,
            color: imageTestMsg.success ? '#34d399' : '#f87171',
            fontSize: '13px',
            fontWeight: 600
          }}>
            {imageTestMsg.message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div className="form-group">
            <label className="form-label">Motor de Geração de Imagem:</label>
            <select
              className="input-field"
              value={currentAi.imageProvider || 'builtin-flux'}
              onChange={(e) => handleAiChange('imageProvider', e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="builtin-flux">⚡ Flux.1 Schnell (Nuvem Neural / Zero Instalação / Gratuito - Sem necessidade de GPU)</option>
              <option value="fooocus">🎨 Fooocus (Local SDXL - Porta 7865 - Recomendado no GitHub para Capas & Livros)</option>
              <option value="sd-webui">🖼️ Stable Diffusion WebUI / Forge (Local - Porta 7860 - AUTOMATIC1111)</option>
              <option value="comfyui">⚙️ ComfyUI (Local - Porta 8188 - Flux/SDXL Modular)</option>
              <option value="dalle3">🧠 OpenAI DALL-E 3 (Nuvem Oficial via API Key)</option>
            </select>
            <div className="form-helper">
              {(currentAi.imageProvider || 'builtin-flux') === 'builtin-flux'
                ? '⚡ Gera capas cinematográficas em 1024x1024 instantaneamente sem gastar nada e sem ocupar memória do seu computador.'
                : (currentAi.imageProvider === 'fooocus')
                ? '🎨 Fooocus é o software open-source mais elogiado para ilustrações e capas estilo Midjourney no seu PC.'
                : (currentAi.imageProvider === 'sd-webui')
                ? '🖼️ Requer o AUTOMATIC1111 ou SD-Forge rodando com o parâmetro --api no arquivo webui-user.bat.'
                : 'Selecione o motor desejado para ilustrações e capas.'}
            </div>
          </div>

          {(currentAi.imageProvider === 'fooocus' || currentAi.imageProvider === 'sd-webui' || currentAi.imageProvider === 'comfyui') && (
            <div className="form-group">
              <label className="form-label">Endereço do Servidor Local de Imagem:</label>
              <input
                type="text"
                className="input-field"
                value={currentAi.imageEndpoint || (currentAi.imageProvider === 'fooocus' ? 'http://127.0.0.1:7865' : currentAi.imageProvider === 'comfyui' ? 'http://127.0.0.1:8188' : 'http://127.0.0.1:7860')}
                onChange={(e) => handleAiChange('imageEndpoint', e.target.value)}
                placeholder="http://127.0.0.1:7865"
                style={{ width: '100%' }}
              />
              <div className="form-helper">
                {currentAi.imageProvider === 'fooocus' ? 'Porta padrão do Fooocus: 7865 (ou 7860).' : currentAi.imageProvider === 'comfyui' ? 'Porta padrão do ComfyUI: 8188.' : 'Porta padrão do SD WebUI: 7860.'}
              </div>
            </div>
          )}
        </div>

        {/* Guia Rápido de Instalação dos Campeões do GitHub */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
            🏆 Melhores e Mais Bem Avaliados no GitHub para Rodar Localmente:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <strong style={{ color: '#f472b6', fontSize: '12px' }}>🎨 Fooocus (SDXL)</strong>
                <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 700 }}>★ 43.5k no GitHub</span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                O melhor e mais fácil para capas e ilustrações. Visual Midjourney, expansão automática de prompts. Download de 1 clique no Windows (executa <code>run.bat</code>).
              </p>
            </div>

            <div style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <strong style={{ color: '#38bdf8', fontSize: '12px' }}>🦙 Ollama (Texto & Raciocínio)</strong>
                <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 700 }}>★ 115k no GitHub</span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                O #1 absoluto para rodar modelos de texto localmente. Modelos recomendados para livros: <code>llama3.1:8b</code>, <code>qwen2.5:14b</code> e <code>deepseek-r1:8b</code>.
              </p>
            </div>

            <div style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <strong style={{ color: '#a78bfa', fontSize: '12px' }}>🖼️ SD WebUI / Forge</strong>
                <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 700 }}>★ 146k no GitHub</span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                O ecossistema mais amplo de modelos e LoRAs. Basta adicionar <code>--api</code> no arquivo <code>webui-user.bat</code> para conectar a esta plataforma.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ponte Local kdp-book (CLI) */}
      <div className="data-card" style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🐍</span> Ponte Local Python (kdp-book CLI)
            </h3>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              Permite executar o pipeline nativo Python do repositório <code>ShonP/kdp-book</code> via linha de comando
            </div>
          </div>

          <button 
            type="button"
            className="btn btn-secondary"
            onClick={handleCheckBridge}
            disabled={checkingBridge}
            style={{ borderColor: '#3b82f6', color: '#60a5fa' }}
          >
            {checkingBridge ? 'Verificando...' : '🔄 Testar Ponte (Porta 8765)'}
          </button>
        </div>

        {bridgeStatus && (
          <div style={{ 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            background: bridgeStatus.status === 'online' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
            border: `1px solid ${bridgeStatus.status === 'online' ? '#10b981' : '#eab308'}`,
            color: bridgeStatus.status === 'online' ? '#34d399' : '#facc15',
            fontSize: '13px'
          }}>
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>
              Status da Ponte: {bridgeStatus.status === 'online' ? '🟢 Online e Pronta' : '🟡 Offline'}
            </div>
            <div>{bridgeStatus.message}</div>
            {bridgeStatus.python && <div>Versão do Python: {bridgeStatus.python}</div>}
            {bridgeStatus.kdp_runner && <div>Comando Executor: <code>{bridgeStatus.kdp_runner}</code></div>}
          </div>
        )}

        <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '8px', fontWeight: 600 }}>
            Para ativar a ponte local e executar o kdp-book pelo terminal:
          </div>
          <pre style={{ margin: 0, padding: '12px', background: '#020617', borderRadius: '6px', color: '#38bdf8', fontSize: '13px', overflowX: 'auto' }}>
{`# 1. No terminal do Windows, na pasta do projeto:
python scripts/kdp_bridge_server.py

# 2. Ou execute o kdp-book diretamente:
cd kdp-book
uv run kdp-book generate --topic "Seu Tema" --type non-fiction --language portuguese`}
          </pre>
        </div>
      </div>
    </div>
  );
};
