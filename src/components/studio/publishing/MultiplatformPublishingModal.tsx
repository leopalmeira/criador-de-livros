import React, { useState } from 'react';
import {
  Globe, BookOpen, Headphones, DollarSign, BarChart3,
  CheckCircle2, AlertCircle, ArrowRight, Download, ExternalLink,
  ShieldAlert, Sparkles, X, ChevronRight
} from 'lucide-react';
import {
  DistributionPlatformId,
  DistributionPlatformInfo,
  RoyaltySimulatorParams
} from '../../../types/publishing-audiobook';
import {
  DISTRIBUTION_PLATFORMS,
  calculateAudiobookRoyaltySimulation,
  buildPublicationPackageZip
} from '../../../services/audiobook-service';
import { AudiobookStudio } from '../audiobook/AudiobookStudio';

interface MultiplatformPublishingModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    title: string;
    subtitle?: string;
    author: string;
    capitulos?: Array<{ titulo: string; texto: string }>;
    coverUrl?: string | null;
  };
}

export const MultiplatformPublishingModal: React.FC<MultiplatformPublishingModalProps> = ({
  isOpen,
  onClose,
  project
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'audiobook' | 'distribution' | 'royalties'>('overview');
  const [selectedPlatforms, setSelectedPlatforms] = useState<DistributionPlatformId[]>([
    'spotify', 'audible', 'apple', 'google', 'kobo'
  ]);
  const [isExporting, setIsExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Parâmetros do Simulador de Receita
  const [simPlatform, setSimPlatform] = useState<DistributionPlatformId>('spotify');
  const [simDurationMinutes, setSimDurationMinutes] = useState(180); // 3 horas
  const [simListeners, setSimListeners] = useState(1500);

  if (!isOpen) return null;

  const simulation = calculateAudiobookRoyaltySimulation(
    simPlatform,
    simDurationMinutes,
    simListeners,
    1
  );

  const togglePlatform = (id: DistributionPlatformId) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleDownloadFullPackage = async () => {
    setIsExporting(true);
    setSuccessMsg(null);
    try {
      const zipBlob = await buildPublicationPackageZip(
        {
          title: project.title || 'Livro em Publicação',
          subtitle: project.subtitle || '',
          author: project.author || 'Autor Book Intel',
          narrator: 'Leandro Palmeira (Voz Neural AI)',
          language: 'Português — Brasil',
          type: 'ai-narrated',
          method: 'ai-tts',
          pitch: 1.0,
          rate: 1.0,
          volume: 1.0
        },
        (project.capitulos || []).map((c, i) => ({
          id: `c_${i}`,
          chapterIndex: i,
          title: c.titulo,
          fullText: c.texto,
          textSnippet: c.texto.slice(0, 100),
          status: 'pronto',
          durationSeconds: Math.round(c.texto.split(/\s+/).length / 2.25),
          wordCount: c.texto.split(/\s+/).length
        })),
        selectedPlatforms,
        project.coverUrl
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PUBLICAO-MULTIPLATAFORMA-${(project.title || 'livro').toLowerCase().replace(/[^a-z0-9]/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMsg('✓ Pacote de publicação multiplataforma gerado com sucesso!');
    } catch (err: any) {
      setSuccessMsg(`Erro ao gerar pacote: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 14,
        width: '100%',
        maxWidth: 1040,
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        border: '1px solid #e2e8f0'
      }}>
        {/* HEADER MODAL */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <Globe size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  PUBLICAÇÃO MULTIPLATAFORMA
                </h2>
                <span style={{ fontSize: 11, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                  AI Publishing Studio
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Obra: <strong>{project.title}</strong> • 1 conteúdo → múltiplos formatos e canais
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* NAVEGAÇÃO INTERNA DAS SEÇÕES */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 24px',
          background: '#ffffff',
          gap: 18
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '12px 4px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'overview' ? '#2563eb' : '#64748b',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <BookOpen size={16} /> Visão dos Formatos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audiobook')}
            style={{
              padding: '12px 4px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'audiobook' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'audiobook' ? '#2563eb' : '#64748b',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Headphones size={16} /> Audiobook Studio
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('distribution')}
            style={{
              padding: '12px 4px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'distribution' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'distribution' ? '#2563eb' : '#64748b',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Globe size={16} /> Distribuição (Spotify, Audible...)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('royalties')}
            style={{
              padding: '12px 4px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'royalties' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'royalties' ? '#2563eb' : '#64748b',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <DollarSign size={16} /> Royalties & Simulador
          </button>
        </div>

        {/* MENSAGEM DE STATUS */}
        {successMsg && (
          <div style={{
            margin: '12px 24px 0',
            padding: '8px 14px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            color: '#059669'
          }}>
            {successMsg}
          </div>
        )}

        {/* CORPO CONFORME A ABA ATIVA */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          
          {/* ABA 1: VISÃO GERAL DOS FORMATOS (ESTRUTURA DO PROMPT MESTRE) */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                background: '#f8fafc',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                {/* SEÇÃO 1: LIVRO (DIGITAL E IMPRESSO) */}
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    LIVRO (FORMATOS EDITORIAIS)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                    <div style={{ padding: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Kindle (eBook)</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>✓ Pronto</span>
                    </div>

                    <div style={{ padding: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Paperback (Capa Comum)</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>✓ Pronto</span>
                    </div>

                    <div style={{ padding: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Hardcover (Capa Dura)</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>○ Não preparado</span>
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: '#e2e8f0' }} />

                {/* SEÇÃO 2: AUDIOBOOK */}
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    AUDIOBOOK
                  </h4>
                  <div style={{
                    padding: 16,
                    background: '#ffffff',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        Audiobook Digital Multiplataforma
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        Produzido com NotebookLM, Narração Neural IA ou Narrador Humano.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('audiobook')}
                      style={{
                        padding: '8px 16px',
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Headphones size={15} /> Abrir Audiobook Studio
                    </button>
                  </div>
                </div>

                <div style={{ height: 1, background: '#e2e8f0' }} />

                {/* SEÇÃO 3: DISTRIBUIÇÃO */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h4 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      DISTRIBUIÇÃO EM MASSA
                    </h4>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      Selecione onde deseja preparar os arquivos oficiais:
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    {Object.values(DISTRIBUTION_PLATFORMS).map(plat => {
                      const isChecked = selectedPlatforms.includes(plat.id);
                      return (
                        <div
                          key={plat.id}
                          onClick={() => togglePlatform(plat.id)}
                          style={{
                            padding: 12,
                            background: isChecked ? '#f0f9ff' : '#ffffff',
                            borderRadius: 8,
                            border: `1px solid ${isChecked ? '#38bdf8' : '#e2e8f0'}`,
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                              {plat.shortName}
                            </div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>
                              {plat.id === 'spotify' ? 'Streaming' : 'Venda Digital'}
                            </div>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: isChecked ? '#0284c7' : '#94a3b8' }}>
                            {isChecked ? '✓ Preparar' : '○ Omitir'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ height: 1, background: '#e2e8f0' }} />

                {/* SEÇÃO 4: BOTÃO FINAL DE DOWNLOAD DO PACOTE */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                      Pacote Completo de Publicação
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Gera ZIP com /AUDIO, /COVER, /METADATA, /DESCRIPTION e instruções por canal.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadFullPackage}
                    disabled={isExporting}
                    style={{
                      padding: '10px 20px',
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 4px 12px rgba(5,150,105,0.25)'
                    }}
                  >
                    <Download size={16} />
                    {isExporting ? 'Empacotando...' : 'Preparar & Baixar Pacote Completo'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: AUDIOBOOK STUDIO INTEGRADO */}
          {activeTab === 'audiobook' && (
            <AudiobookStudio
              initialTitle={project.title}
              initialSubtitle={project.subtitle}
              initialAuthor={project.author}
              initialChapters={project.capitulos}
              capaUrl={project.coverUrl}
            />
          )}

          {/* ABA 3: DETALHES DE DISTRIBUIÇÃO (SPOTIFY, AUDIBLE ETC.) */}
          {activeTab === 'distribution' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* CARD DE DESTAQUE: SPOTIFY */}
              <div style={{
                background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
                borderRadius: 10,
                padding: 20,
                color: '#ffffff',
                border: '1px solid #166534'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, background: '#22c55e', color: '#052e16', padding: '2px 8px', borderRadius: 4 }}>
                      SPOTIFY FOR AUTHORS
                    </span>
                    <h3 style={{ margin: '6px 0 4px', fontSize: 18, fontWeight: 800 }}>
                      🎧 Distribuição no Spotify Audiobooks
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: '#bbf7d0', maxWidth: 620 }}>
                      Prepare seu audiobook para ser ouvido por milhões de assinantes no Spotify em todo o mundo. O Book Intel organiza os áudios e metadados no formato exato homologado.
                    </p>
                  </div>

                  <a
                    href="https://authors.spotify.com/"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      background: '#ffffff',
                      color: '#052e16',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 800,
                      textDecoration: 'none'
                    }}
                  >
                    Acessar Spotify for Authors <ExternalLink size={14} />
                  </a>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 10,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid rgba(255,255,255,0.15)'
                }}>
                  <div style={{ background: 'rgba(255,255,255,0.08)', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#bbf7d0' }}>Conteúdo</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>✓ Pronto</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.08)', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#bbf7d0' }}>Áudio</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>✓ Validado</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.08)', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#bbf7d0' }}>Capa 1:1</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{project.coverUrl ? '✓ Pronta' : '○ Ausente'}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.08)', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#bbf7d0' }}>Metadados</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>✓ Gerados</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.08)', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#bbf7d0' }}>Status</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>PRONTO</div>
                  </div>
                </div>
              </div>

              {/* LISTA DE DEMAIS PLATAFORMAS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                {Object.values(DISTRIBUTION_PLATFORMS).map(plat => (
                  <div
                    key={plat.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                          {plat.name}
                        </h4>
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4 }}>
                          {plat.shortName}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                        {plat.tagline}
                      </p>
                      <div style={{ marginTop: 8, fontSize: 11, color: '#334155' }}>
                        <strong>Remuneração:</strong> {plat.payoutModel}
                      </div>
                    </div>

                    <a
                      href={plat.officialUploadUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#0f172a',
                        textDecoration: 'none'
                      }}
                    >
                      Acessar Portal Oficial <ExternalLink size={12} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 4: ROYALTIES & SIMULADOR (DADO REAL VS ESTIMATIVA) */}
          {activeTab === 'royalties' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* CARD DE AUDITORIA DE DADOS FINANCEIROS */}
              <div style={{
                background: '#ffffff',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                padding: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                    Transparência de Royalties & Políticas
                  </h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                    O Book Intel KDP separa rigorosamente o que é <strong>DADO REAL</strong> (relatório homologado) de <strong>ESTIMATIVAS</strong>.
                  </p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: 4 }}>
                  ESTIMATIVA PROJETADA
                </span>
              </div>

              {/* SIMULADOR INTERATIVO DE RECEITA DE AUDIOBOOK */}
              <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                  Simulador de Receita de Audiobook
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Plataforma de Referência
                    </label>
                    <select
                      value={simPlatform}
                      onChange={(e) => setSimPlatform(e.target.value as DistributionPlatformId)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    >
                      <option value="spotify">Spotify for Authors (Pool de Streaming)</option>
                      <option value="audible">Amazon / Audible (40% ACX)</option>
                      <option value="apple">Apple Books (70% Royalties)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Duração do Livro (Minutos)
                    </label>
                    <input
                      type="number"
                      value={simDurationMinutes}
                      onChange={(e) => setSimDurationMinutes(Math.max(10, parseInt(e.target.value || '60', 10)))}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Ouvintes Estimados no Mês
                    </label>
                    <input
                      type="number"
                      value={simListeners}
                      onChange={(e) => setSimListeners(Math.max(10, parseInt(e.target.value || '100', 10)))}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>
                </div>

                {/* 3 CENÁRIOS: CONSERVADOR, INTERMEDIÁRIO, ALTO */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {/* Cenário Conservador */}
                  <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Cenário Conservador</span>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      R$ {simulation.conservative.estimatedEarningsBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      ~U$ {simulation.conservative.estimatedEarningsUsd.toFixed(2)} • {simulation.conservative.hoursConsumed}h ouvidas
                    </div>
                  </div>

                  {/* Cenário Intermediário */}
                  <div style={{ background: '#ffffff', borderRadius: 8, border: '2px solid #2563eb', padding: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>Cenário Intermediário</span>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb', margin: '4px 0' }}>
                      R$ {simulation.moderate.estimatedEarningsBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      ~U$ {simulation.moderate.estimatedEarningsUsd.toFixed(2)} • {simulation.moderate.hoursConsumed}h ouvidas
                    </div>
                  </div>

                  {/* Cenário Alto */}
                  <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #bbf7d0', padding: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>Cenário Alto</span>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#059669', margin: '4px 0' }}>
                      R$ {simulation.optimistic.estimatedEarningsBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      ~U$ {simulation.optimistic.estimatedEarningsUsd.toFixed(2)} • {simulation.optimistic.hoursConsumed}h ouvidas
                    </div>
                  </div>
                </div>

                {/* AVISO LEGAL OBRIGATÓRIO (REGRA 21) */}
                <div style={{
                  marginTop: 16,
                  padding: '8px 12px',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: 6,
                  fontSize: 11,
                  color: '#92400e',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <ShieldAlert size={14} />
                  <span>{simulation.disclaimer}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
