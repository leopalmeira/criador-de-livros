import React, { useState } from 'react';
import { Download, FileText, LoaderCircle, Sparkles } from 'lucide-react';
import {
  buildPlannerPdf,
  planPlannerPages,
  buildFallbackPlannerPages,
  PLANNER_TRACKS,
  type PlannerPagePlan,
  type PlannerTrackId
} from '../../../services/planner-book-service';

interface PlannerBookStudioProps {
  title: string;
  author: string;
  hasCredit: boolean;
  onConsumeCredit: (title: string) => boolean;
  onRequireCredit: () => void;
}

export const PlannerBookStudio: React.FC<PlannerBookStudioProps> = ({
  title,
  author,
  hasCredit,
  onConsumeCredit,
  onRequireCredit
}) => {
  const [trackId, setTrackId] = useState<PlannerTrackId>('weekly-planner');
  const [pageCount, setPageCount] = useState(30);
  const [pages, setPages] = useState<PlannerPagePlan[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);

  const selectedTrack = PLANNER_TRACKS.find(track => track.id === trackId)!;

  const handleGenerate = async () => {
    if (!hasCredit) {
      onRequireCredit();
      return;
    }

    setIsGenerating(true);
    setStatus('Planejando páginas variadas para o seu planner...');
    setIsError(false);
    try {
      let plannedPages: PlannerPagePlan[];
      try {
        plannedPages = await planPlannerPages(
          trackId,
          title.trim() || selectedTrack.label,
          pageCount
        );
      } catch (err: any) {
        console.warn('[Planner] Modelo online oscilou, acionando Auto-Recuperação estruturada:', err?.message);
        plannedPages = buildFallbackPlannerPages(
          trackId,
          title.trim() || selectedTrack.label,
          pageCount
        );
      }

      if (!onConsumeCredit(title.trim() || selectedTrack.label)) {
        onRequireCredit();
        return;
      }
      setPages(plannedPages);
      setStatus(`✓ ${plannedPages.length} páginas planejadas com sucesso! Você pode baixar o miolo em PDF.`);
      setIsError(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível planejar as páginas.';
      setStatus(message);
      setIsError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    try {
      const bytes = buildPlannerPdf(title.trim() || selectedTrack.label, author, trackId, pages);
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(title.trim() || selectedTrack.label).replace(/[<>:"/\\|?*]+/g, '-').replace(/\s+/g, '_')}_planner.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('PDF do planner baixado com sucesso.');
      setIsError(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível exportar o PDF.');
      setIsError(true);
    }
  };

  return (
    <section style={{ background: '#ffffff', border: '1px solid #dbe3ef', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ background: 'linear-gradient(135deg, #172554, #1e3a8a)', color: '#ffffff', borderRadius: 10, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, fontSize: 17 }}>
          <FileText size={19} /> Criador de planners e diários
        </div>
        <p style={{ fontSize: 12, color: '#dbeafe', margin: '6px 0 0', lineHeight: 1.5 }}>
          Este modo planeja páginas para preencher e exporta o miolo em PDF. Não gera capítulos narrativos.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(150px, 220px)', gap: 12, alignItems: 'end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: '#334155' }}>
          Tipo de planner / diário
          <select value={trackId} onChange={event => {
            setTrackId(event.target.value as PlannerTrackId);
            setPages([]);
            setStatus('');
          }} style={{ padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#ffffff', color: '#0f172a', fontWeight: 400 }}>
            {PLANNER_TRACKS.map(track => <option key={track.id} value={track.id}>{track.label}</option>)}
          </select>
          <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>{selectedTrack.description}</span>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: '#334155' }}>
          Páginas internas
          <select value={pageCount} onChange={event => {
            setPageCount(Number(event.target.value));
            setPages([]);
            setStatus('');
          }} style={{ padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#ffffff', color: '#0f172a', fontWeight: 400 }}>
            {[12, 30, 60, 90, 120].map(count => <option key={count} value={count}>{count} páginas</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
        <button type="button" onClick={handleGenerate} disabled={isGenerating} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: 0, borderRadius: 7, padding: '10px 15px', color: '#ffffff', background: isGenerating ? '#94a3b8' : '#2563eb', fontWeight: 700, cursor: isGenerating ? 'wait' : 'pointer' }}>
          {isGenerating ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {isGenerating ? 'Gerando páginas...' : 'Planejar páginas'}
        </button>
        <button type="button" onClick={handleDownload} disabled={pages.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid #cbd5e1', borderRadius: 7, padding: '10px 15px', color: pages.length ? '#047857' : '#94a3b8', background: '#ffffff', fontWeight: 700, cursor: pages.length ? 'pointer' : 'not-allowed' }}>
          <Download size={15} /> Baixar miolo PDF
        </button>
      </div>

      {status && <div role="status" style={{ padding: 10, borderRadius: 7, background: isError ? '#fef2f2' : '#f0fdf4', color: isError ? '#b91c1c' : '#166534', fontSize: 12 }}>{status}</div>}

      {pages.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
          {pages.map(page => (
            <article key={page.pageNumber} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: '#fcfcfb' }}>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 5 }}>PÁGINA {page.pageNumber} · {page.layout}</div>
              <h3 style={{ fontSize: 13, margin: '0 0 5px', color: '#1e293b' }}>{page.title}</h3>
              <p style={{ fontSize: 11, margin: '0 0 7px', color: '#475569' }}>{page.purpose}</p>
              <ul style={{ paddingLeft: 17, margin: 0, color: '#64748b', fontSize: 10 }}>
                {page.prompts.map((prompt, index) => <li key={`${page.pageNumber}-${index}`}>{prompt}</li>)}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
