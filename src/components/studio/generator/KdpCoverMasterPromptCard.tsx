import React, { useState, useMemo } from 'react';
import { Copy, Check, Sparkles, BookOpen, Layers, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import {
  gerarMasterPromptCapa600a1200Palavras,
  CoverMasterPromptOutput
} from '../../../services/kdp-cover-master-prompt-generator';

interface KdpCoverMasterPromptCardProps {
  titulo: string;
  subtitulo?: string;
  autor: string;
  genero?: string;
  premissa?: string;
  idioma?: string;
  compactMode?: boolean;
}

type PromptTabMode = 'front-only' | 'back-only' | 'full-wrap-back';

export const KdpCoverMasterPromptCard: React.FC<KdpCoverMasterPromptCardProps> = ({
  titulo,
  subtitulo,
  autor,
  genero = 'Ficção',
  premissa,
  idioma = 'pt',
  compactMode = false
}) => {
  const [activeMode, setActiveMode] = useState<PromptTabMode>('full-wrap-back');
  const [copiedFull, setCopiedFull] = useState<boolean>(false);
  const [copiedAiOnly, setCopiedAiOnly] = useState<boolean>(false);
  const [copiedBackOnly, setCopiedBackOnly] = useState<boolean>(false);
  const [copiedBlurb, setCopiedBlurb] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(!compactMode);

  const masterData: CoverMasterPromptOutput = useMemo(() => {
    return gerarMasterPromptCapa600a1200Palavras({
      titulo: titulo || 'Obra Literária',
      subtitulo: subtitulo || '',
      autor: autor || 'Autor Bestseller',
      genero: genero || 'Ficção',
      premissa: premissa || '',
      idioma: idioma || 'pt'
    });
  }, [titulo, subtitulo, autor, genero, premissa, idioma]);

  const copyTextToClipboard = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setter(true);
      setTimeout(() => setter(false), 2500);
    }
  };

  const currentFullPrompt = activeMode === 'front-only'
    ? masterData.promptCompleto
    : activeMode === 'back-only'
    ? masterData.promptContracapaIsoladaCompleto
    : masterData.promptCapaEContracapaCompleto;

  const currentAiPrompt = activeMode === 'front-only'
    ? masterData.promptParaMotorIa
    : activeMode === 'back-only'
    ? masterData.promptContracapaIsoladaMotorIa
    : masterData.promptCapaEContracapaMotorIa;

  const currentWordCount = activeMode === 'front-only'
    ? masterData.wordCount
    : activeMode === 'back-only'
    ? masterData.wordCountContracapa
    : masterData.wordCountCapaEContracapa;

  return (
    <div
      style={{
        width: '100%',
        background: 'linear-gradient(145deg, #090d16 0%, #0f172a 100%)',
        border: '1px solid #1e293b',
        borderRadius: 12,
        padding: compactMode ? '14px 18px' : '20px 22px',
        color: '#f8fafc',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        marginTop: 14,
        marginBottom: 14,
        boxSizing: 'border-box'
      }}
    >
      {/* CABEÇALHO DO PAINEL */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: isExpanded ? 14 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #0284c7, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
              flexShrink: 0
            }}
          >
            <Sparkles size={18} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                Master Prompt de Capa & Contracapa em Sintonia Editorial
              </h3>
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 8px',
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700
                }}
              >
                {currentWordCount} palavras reais
              </span>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '2px 8px',
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700
                }}
              >
                Gênero: {genero}
              </span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: 11, color: '#94a3b8' }}>
              Direção de arte completa para Apenas Capa Frontal ou Capa + Lombada + Contracapa com Breve Leitura em 100% de sintonia visual.
            </p>
          </div>
        </div>

        {/* BOTÕES DE CÓPIA RÁPIDA E EXPANSOR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => copyTextToClipboard(currentFullPrompt, setCopiedFull)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 7,
              background: copiedFull ? '#059669' : 'linear-gradient(135deg, #0284c7, #2563eb)',
              color: '#ffffff',
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)'
            }}
            title="Copiar o Dossiê Completo da aba selecionada (3.000+ palavras)"
          >
            {copiedFull ? <Check size={14} /> : <Copy size={14} />}
            <span>
              {copiedFull
                ? '✓ Dossiê Completo Copiado!'
                : activeMode === 'front-only'
                  ? `Copiar Dossiê CAPA FRONTAL (${masterData.wordCount} pal.)`
                  : activeMode === 'back-only'
                    ? `Copiar Dossiê CONTRACAPA (${masterData.wordCountContracapa} pal.)`
                    : `Copiar Dossiê CAPA COM CONTRACAPA JUNTO (${masterData.wordCountCapaEContracapa} pal.)`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => copyTextToClipboard(currentAiPrompt, setCopiedAiOnly)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 12px',
              borderRadius: 7,
              background: copiedAiOnly ? '#059669' : '#1e293b',
              color: copiedAiOnly ? '#ffffff' : '#cbd5e1',
              border: '1px solid #334155',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Copiar prompt direto otimizado para geradores de imagem IA (FLUX / Midjourney / Ideogram)"
          >
            {copiedAiOnly ? <Check size={13} /> : <Copy size={13} />}
            <span>
              {copiedAiOnly
                ? '✓ Copiado!'
                : activeMode === 'front-only'
                  ? 'Copiar Prompt IA (Capa Frontal)'
                  : activeMode === 'back-only'
                    ? 'Copiar Prompt IA (Contracapa)'
                    : 'Copiar Prompt IA (Capa com Contracapa Junto)'}
            </span>
          </button>

          {compactMode && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#94a3b8',
                borderRadius: 7,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title={isExpanded ? 'Recolher detalhes' : 'Expandir prompt completo'}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* SELETOR DE MODO (3 PROMPTS INDEPENDENTES: CAPA, CONTRACAPA E CAPA COM CONTRACAPA JUNTO) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 8,
          marginTop: 10,
          marginBottom: isExpanded ? 12 : 0,
          background: '#040711',
          padding: 6,
          borderRadius: 10,
          border: '1px solid #1e293b'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveMode('front-only')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            padding: '9px 12px',
            borderRadius: 8,
            border: activeMode === 'front-only' ? '1px solid #38bdf8' : '1px solid transparent',
            background: activeMode === 'front-only'
              ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.28), rgba(37, 99, 235, 0.22))'
              : 'transparent',
            color: activeMode === 'front-only' ? '#ffffff' : '#94a3b8',
            fontSize: 11.5,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <BookOpen size={14} color={activeMode === 'front-only' ? '#38bdf8' : '#64748b'} />
          <span>1. Capa Frontal ({masterData.wordCount} pal.)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('back-only')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            padding: '9px 12px',
            borderRadius: 8,
            border: activeMode === 'back-only' ? '1px solid #a855f7' : '1px solid transparent',
            background: activeMode === 'back-only'
              ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.28), rgba(126, 34, 206, 0.22))'
              : 'transparent',
            color: activeMode === 'back-only' ? '#ffffff' : '#94a3b8',
            fontSize: 11.5,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <FileText size={14} color={activeMode === 'back-only' ? '#c084fc' : '#64748b'} />
          <span>2. Contracapa ({masterData.wordCountContracapa} pal.)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('full-wrap-back')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            padding: '9px 12px',
            borderRadius: 8,
            border: activeMode === 'full-wrap-back' ? '1px solid #10b981' : '1px solid transparent',
            background: activeMode === 'full-wrap-back'
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(2, 132, 199, 0.22))'
              : 'transparent',
            color: activeMode === 'full-wrap-back' ? '#ffffff' : '#94a3b8',
            fontSize: 11.5,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Layers size={14} color={activeMode === 'full-wrap-back' ? '#34d399' : '#64748b'} />
          <span>3. Capa com Contracapa Junto ({masterData.wordCountCapaEContracapa} pal.)</span>
        </button>
      </div>

      {/* REGRA OBRIGATÓRIA: PROIBIÇÃO DE CÓDIGO DE BARRAS E CAIXA BRANCA NOS PROMPTS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 11.5,
          color: '#a7f3d0',
          lineHeight: 1.45,
          marginTop: 8,
          marginBottom: isExpanded ? 8 : 0
        }}
      >
        <span style={{ fontSize: 16 }}>🛡️</span>
        <div>
          <b style={{ color: '#ffffff' }}>Regra Obrigatória nos Prompts:</b> A arte da capa e da contracapa preenche 100% da superfície de ponta a ponta sem caixas brancas nem código de barras. Parâmetros negativos estritos (<code>--no barcode white box blank rectangle</code>) estão ativados nos prompts de IA para impedir retângulos brancos ou vazios.
        </div>
      </div>

      {/* CONTEÚDO EXPANDIDO */}
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          {/* SE ESTIVER NO MODO CONTRACAPA OU CAPA COM CONTRACAPA JUNTO: EXIBE CARD DA BREVE LEITURA NA CONTRACAPA */}
          {(activeMode === 'back-only' || activeMode === 'full-wrap-back') && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: 10,
                padding: '14px 16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <FileText size={15} color="#34d399" />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#ecfdf5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Breve Leitura da Contracapa (Em Total Sintonia com a Capa)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => copyTextToClipboard(masterData.sinopseContracapaSugerida, setCopiedBlurb)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 10px',
                      borderRadius: 6,
                      background: copiedBlurb ? '#059669' : 'rgba(16, 185, 129, 0.2)',
                      color: '#ecfdf5',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {copiedBlurb ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedBlurb ? '✓ Sinopse Copiada!' : 'Copiar Texto da Contracapa'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyTextToClipboard(masterData.promptContracapaIsoladaMotorIa, setCopiedBackOnly)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 10px',
                      borderRadius: 6,
                      background: copiedBackOnly ? '#059669' : '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #334155',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Copiar prompt caso deseje gerar somente a arte vertical da contracapa em total sintonia com a capa"
                  >
                    {copiedBackOnly ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedBackOnly ? '✓ Prompt Contracapa Copiado!' : 'Copiar Prompt IA (Só Contracapa 2:3)'}</span>
                  </button>
                </div>
              </div>

              <div
                style={{
                  background: '#040711',
                  border: '1px solid #1e293b',
                  borderRadius: 8,
                  padding: '12px 14px',
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: '#e2e8f0',
                  whiteSpace: 'pre-wrap'
                }}
              >
                <div style={{ color: '#fbbf24', fontWeight: 800, marginBottom: 6 }}>
                  {masterData.ganchoTopoContracapa}
                </div>
                <div>{masterData.sinopseContracapaSugerida.replace(masterData.ganchoTopoContracapa, '').trim()}</div>
              </div>
            </div>
          )}

          {/* CARDS COM DIRETRIZES DE ESTÉTICA DO GÊNERO */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 10,
              background: '#040711',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #1e293b'
            }}
          >
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                Estilo Visual em Sintonia (Capa & Contracapa)
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>
                {masterData.estiloRecomendado}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                Tipografia do Título & Lombada
              </div>
              <div style={{ fontSize: 11.5, color: '#f8fafc', marginTop: 2 }}>
                {masterData.fonteTituloSugerida}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                Arquitetura Editorial 300 DPI
              </div>
              <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2, lineHeight: 1.35 }}>
                • <b>Capa Frontal:</b> Título no topo + Subtítulo + Autor<br />
                • <b>Lombada:</b> Título vertical + Autor centralizado<br />
                • <b>Contracapa:</b> Gancho + Breve Leitura + Área ISBN
              </div>
            </div>
          </div>

          {/* PALETA CROMÁTICA DO GÊNERO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>Paleta Cromática Contínua:</span>
            {masterData.paletaCoresSugerida.map((cor, idx) => {
              const hexMatch = cor.match(/#([0-9a-f]{6})/i);
              const hex = hexMatch ? `#${hexMatch[1]}` : '#334155';
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#040711',
                    padding: '3px 8px',
                    borderRadius: 5,
                    border: '1px solid #1e293b',
                    fontSize: 10.5,
                    color: '#e2e8f0'
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: hex,
                      display: 'inline-block',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}
                  />
                  <span>{cor}</span>
                </div>
              );
            })}
          </div>

          {/* ÁREA DE VISUALIZAÇÃO DO MASTER PROMPT */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                maxHeight: 300,
                overflowY: 'auto',
                background: '#020617',
                border: '1px solid #1e293b',
                borderRadius: 8,
                padding: '14px 16px',
                fontSize: 11.5,
                lineHeight: 1.6,
                color: '#cbd5e1',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                whiteSpace: 'pre-wrap'
              }}
            >
              {currentFullPrompt}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 8,
                fontSize: 11,
                color: '#64748b',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <span>
                💡 <b>Dica Editorial:</b> Alterne entre as abas acima para copiar o prompt de <b>Apenas Capa Frontal</b> ou o de <b>Capa + Lombada + Contracapa com a Breve Leitura inclusa</b>.
              </span>
              <button
                type="button"
                onClick={() => copyTextToClipboard(currentFullPrompt, setCopiedFull)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Copy size={11} /> Copiar Prompt Desta Aba
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
