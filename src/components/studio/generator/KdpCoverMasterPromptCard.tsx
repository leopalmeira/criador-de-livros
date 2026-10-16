import React, { useState, useMemo } from 'react';
import { Copy, Check, Sparkles, BookOpen, Layers, Palette, Type, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import {
  gerarMasterPromptCapa600a1200Palavras,
  CoverMasterPromptInput,
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

export const KdpCoverMasterPromptCard: React.FC<KdpCoverMasterPromptCardProps> = ({
  titulo,
  subtitulo,
  autor,
  genero = 'Ficção',
  premissa,
  idioma = 'pt',
  compactMode = false
}) => {
  const [copiedFull, setCopiedFull] = useState<boolean>(false);
  const [copiedAiOnly, setCopiedAiOnly] = useState<boolean>(false);
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

  const handleCopyFull = async () => {
    try {
      await navigator.clipboard.writeText(masterData.promptCompleto);
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = masterData.promptCompleto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2500);
    }
  };

  const handleCopyAiOnly = async () => {
    try {
      await navigator.clipboard.writeText(masterData.promptParaMotorIa);
      setCopiedAiOnly(true);
      setTimeout(() => setCopiedAiOnly(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = masterData.promptParaMotorIa;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedAiOnly(true);
      setTimeout(() => setCopiedAiOnly(false), 2500);
    }
  };

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
                Master Prompt de Capa KDP (600 a 1200 Palavras)
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
                {masterData.wordCount} palavras reais
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
              O gênero literário dita soberanamente a estética, paleta e tipografia da capa (padrão comercial Amazon KDP).
            </p>
          </div>
        </div>

        {/* BOTÕES DE CÓPIA RÁPIDA E EXPANSOR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCopyFull}
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
            title="Copiar o Master Prompt completo com diretrizes e motor IA (600-1200 palavras)"
          >
            {copiedFull ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedFull ? '✓ Master Prompt Copiado!' : `Copiar Prompt Completo (${masterData.wordCount} palavras)`}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyAiOnly}
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
            title="Copiar bloco otimizado pronto para colar no FLUX / Midjourney / Replicate"
          >
            {copiedAiOnly ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedAiOnly ? '✓ Copiado!' : 'Copiar p/ Motor IA'}</span>
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

      {/* CONTEÚDO EXPANDIDO */}
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
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
                Estilo Visual do Gênero
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>
                {masterData.estiloRecomendado}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                Tipografia do Título Sugerida
              </div>
              <div style={{ fontSize: 11.5, color: '#f8fafc', marginTop: 2 }}>
                {masterData.fonteTituloSugerida}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                Hierarquia Tipográfica KDP
              </div>
              <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2, lineHeight: 1.35 }}>
                • <b>Título:</b> Grande no topo (y: 12-26%)<br />
                • <b>Subtítulo:</b> Médio acima do autor<br />
                • <b>Autor:</b> Na base com chancela
              </div>
            </div>
          </div>

          {/* PALETA CROMÁTICA DO GÊNERO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>Paleta Cromática Calibrada:</span>
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

          {/* ÁREA DE VISUALIZAÇÃO DO MASTER PROMPT (600 A 1200 PALAVRAS COM SCROLL ELEGANTE) */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                maxHeight: 280,
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
              {masterData.promptCompleto}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 8,
                fontSize: 11,
                color: '#64748b'
              }}
            >
              <span>
                💡 <b>Dica Editorial:</b> Copie o prompt completo para documentação ou o prompt para IA para gerar em ferramentas como Midjourney v6 ou FLUX.
              </span>
              <button
                type="button"
                onClick={handleCopyFull}
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
                <Copy size={11} /> Copiar Novamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
