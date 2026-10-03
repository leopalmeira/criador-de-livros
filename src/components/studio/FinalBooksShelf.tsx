// ================================================================
// ESTANTE DE LIVROS FINALIZADOS E VALIDADOS NA DASHBOARD
// Exibe livros que passaram pelo pipeline completo de correção,
// diagramação e validação do PDF com capa incorporada.
// ================================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, Download, Eye, FileText, AlertCircle, Trash2,
  BookOpen, Calendar, Clock, ShieldCheck, X
} from 'lucide-react';
import { db } from '../../database/local-database';
import type { FinalBookRecord, PendingItem } from '../../types/editorial-correction';

export const FinalBooksShelf: React.FC = () => {
  const [books, setBooks] = useState<FinalBookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookForReport, setSelectedBookForReport] = useState<FinalBookRecord | null>(null);
  const [selectedBookForPendings, setSelectedBookForPendings] = useState<FinalBookRecord | null>(null);
  const [viewingPdfUrl, setViewingPdfUrl] = useState<{ url: string; title: string } | null>(null);

  const loadBooks = useCallback(async () => {
    try {
      const list = await db.getAllFinalBooks();
      setBooks(list);
    } catch (err) {
      console.error('Erro ao carregar livros finalizados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
    const handleUpdate = () => {
      loadBooks();
    };
    window.addEventListener('kdp-final-books-updated', handleUpdate);
    return () => {
      window.removeEventListener('kdp-final-books-updated', handleUpdate);
    };
  }, [loadBooks]);

  const handleDownloadPdf = (book: FinalBookRecord) => {
    try {
      const blob = new Blob([book.pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book.title.replace(/\s+/g, '_')}_KDP_VALIDADO.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Falha ao baixar PDF:', err);
      alert('Não foi possível gerar o download do PDF.');
    }
  };

  const handleViewPdf = (book: FinalBookRecord) => {
    try {
      const blob = new Blob([book.pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setViewingPdfUrl({ url, title: book.title });
    } catch (err) {
      console.error('Falha ao abrir PDF:', err);
      alert('Não foi possível visualizar o PDF.');
    }
  };

  const closePdfViewer = () => {
    if (viewingPdfUrl) {
      URL.revokeObjectURL(viewingPdfUrl.url);
      setViewingPdfUrl(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza de que deseja remover este livro finalizado da estante?')) {
      await db.deleteFinalBook(id);
      loadBooks();
    }
  };

  if (loading || books.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: 24, marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: '#ecfdf5',
            color: '#059669',
            padding: '6px 10px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <ShieldCheck size={18} />
            <span style={{ fontSize: 13, fontWeight: 800 }}>LIVROS FINALIZADOS & VALIDADOS KDP</span>
          </div>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {books.length} {books.length === 1 ? 'edição pronta' : 'edições prontas'} para publicação na Amazon
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 16
      }}>
        {books.map(book => {
          const dateStr = new Date(book.finalizedAt).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          const sizeKb = (book.sizeBytes / 1024).toFixed(0);
          const authorPendingsCount = book.pendings.filter(p => p.resolution === 'PENDENTE_VALIDACAO_AUTOR').length;

          return (
            <div
              key={book.id}
              style={{
                background: '#ffffff',
                border: '1px solid #d1fae5',
                borderRadius: 12,
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', gap: 14 }}>
                {/* MINIATURA DA CAPA */}
                <div style={{
                  width: 72,
                  height: 108,
                  borderRadius: 6,
                  overflow: 'hidden',
                  background: '#0f172a',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0'
                }}>
                  {book.coverDataUrl ? (
                    <img
                      src={book.coverDataUrl}
                      alt={book.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 4 }}>
                      <BookOpen size={20} />
                      <span style={{ fontSize: 9, textAlign: 'center', marginTop: 4 }}>Capa KDP</span>
                    </div>
                  )}
                </div>

                {/* DADOS DO LIVRO */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{
                        background: '#10b981',
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <CheckCircle2 size={11} /> Finalizado e validado
                      </span>
                    </div>

                    <h4 style={{
                      margin: '0 0 2px 0',
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }} title={book.title}>
                      {book.title}
                    </h4>

                    {book.subtitle && (
                      <div style={{
                        fontSize: 11,
                        color: '#64748b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 4
                      }} title={book.subtitle}>
                        {book.subtitle}
                      </div>
                    )}

                    <div style={{ fontSize: 11, color: '#475569' }}>
                      por <strong>{book.author}</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: 10, color: '#94a3b8', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>{book.pageCount} páginas</span>
                    <span>•</span>
                    <span>{sizeKb} KB</span>
                    <span>•</span>
                    <span>{dateStr}</span>
                  </div>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO OBRIGATÓRIOS: Visualizar PDF / Baixar PDF / Ver relatório / Ver pendências */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                paddingTop: 10,
                borderTop: '1px solid #f1f5f9'
              }}>
                <button
                  type="button"
                  onClick={() => handleViewPdf(book)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 10px',
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Eye size={13} color="#2563eb" /> Visualizar PDF
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPdf(book)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 10px',
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
                  }}
                >
                  <Download size={13} /> Baixar PDF
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedBookForReport(book)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '7px 10px',
                    background: '#ffffff',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <FileText size={13} /> Ver relatório
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedBookForPendings(book)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '7px 10px',
                    background: authorPendingsCount > 0 ? '#fffbeb' : '#ffffff',
                    color: authorPendingsCount > 0 ? '#b45309' : '#475569',
                    border: `1px solid ${authorPendingsCount > 0 ? '#fde68a' : '#e2e8f0'}`,
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <AlertCircle size={13} color={authorPendingsCount > 0 ? '#d97706' : '#94a3b8'} />
                  Ver pendências {authorPendingsCount > 0 ? `(${authorPendingsCount})` : ''}
                </button>
              </div>

              {/* RODAPÉ DO CARD COM BOTÃO EXCLUIR */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 2 }}>
                <button
                  type="button"
                  onClick={(e) => handleDelete(book.id, e)}
                  title="Remover livro finalizado"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  <Trash2 size={12} /> Remover da estante
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: VISUALIZADOR DE PDF */}
      {viewingPdfUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px 12px 0 0',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={20} color="#059669" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Visualização do PDF Diagramado & Validado — {viewingPdfUrl.title}
              </h3>
            </div>
            <button
              onClick={closePdfViewer}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              <X size={16} /> Fechar
            </button>
          </div>
          <div style={{ flex: 1, background: '#334155', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
            <iframe
              src={viewingPdfUrl.url}
              title={viewingPdfUrl.title}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>
      )}

      {/* MODAL: RELATÓRIO EDITORIAL COMPLETO */}
      {selectedBookForReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 720,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Relatório Editorial & Diagramação KDP
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {selectedBookForReport.title} • por {selectedBookForReport.author}
                </span>
              </div>
              <button
                onClick={() => setSelectedBookForReport(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* RESUMO EXECUTIVO */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
                  Resumo Editorial
                </div>
                <div style={{ fontSize: 12, color: '#15803d', lineHeight: 1.6 }}>
                  {selectedBookForReport.report.summary}
                </div>
              </div>

              {/* GRID DE MÉTRICAS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                {[
                  { label: 'Páginas do PDF', val: selectedBookForReport.pageCount, cor: '#2563eb' },
                  { label: 'Capítulos', val: selectedBookForReport.report.chaptersIdentified, cor: '#059669' },
                  { label: 'Ortografia / Acento', val: selectedBookForReport.report.spellingErrors, cor: '#0891b2' },
                  { label: 'Gramática', val: selectedBookForReport.report.grammarErrors, cor: '#7c3aed' },
                  { label: 'Pontuação / Espaço', val: selectedBookForReport.report.punctuationFixes, cor: '#d97706' },
                  { label: 'Parágrafos / Diálogos', val: selectedBookForReport.report.paragraphFixes + selectedBookForReport.report.dialogueFixes, cor: '#16a34a' }
                ].map((m, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{m.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: m.cor, marginTop: 2 }}>{m.val}</div>
                  </div>
                ))}
              </div>

              {/* CHECAGENS DE VALIDAÇÃO DO PDF */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                  Auditoria do Arquivo PDF (pdf.js)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedBookForReport.validation.checks.map(c => (
                    <div
                      key={c.id}
                      style={{
                        fontSize: 11,
                        padding: '8px 10px',
                        borderRadius: 6,
                        background: c.ok === true ? '#f0fdf4' : c.ok === false ? '#fef2f2' : '#f8fafc',
                        border: `1px solid ${c.ok === true ? '#bbf7d0' : c.ok === false ? '#fecaca' : '#e2e8f0'}`,
                        color: c.ok === true ? '#166534' : c.ok === false ? '#991b1b' : '#64748b'
                      }}
                    >
                      <strong>{c.ok === true ? '✓' : c.ok === false ? '✗' : 'ℹ'} {c.label}:</strong> {c.detail}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                onClick={() => setSelectedBookForReport(null)}
                style={{ padding: '8px 16px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PENDÊNCIAS DE VALIDAÇÃO DO AUTOR */}
      {selectedBookForPendings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 680,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Pendências do Autor & Itens Não Verificados
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {selectedBookForPendings.title}
                </span>
              </div>
              <button
                onClick={() => setSelectedBookForPendings(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedBookForPendings.pendings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#16a34a' }}>
                  <CheckCircle2 size={36} style={{ marginBottom: 8 }} />
                  <div style={{ fontWeight: 700 }}>Nenhuma pendência para validação do autor!</div>
                </div>
              ) : (
                selectedBookForPendings.pendings.map(p => (
                  <div
                    key={p.id}
                    style={{
                      background: p.resolution === 'PENDENTE_VALIDACAO_AUTOR' ? '#fffbeb' : '#f8fafc',
                      border: `1px solid ${p.resolution === 'PENDENTE_VALIDACAO_AUTOR' ? '#fde68a' : '#e2e8f0'}`,
                      borderRadius: 8,
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: p.resolution === 'PENDENTE_VALIDACAO_AUTOR' ? '#fef3c7' : '#e2e8f0',
                        color: p.resolution === 'PENDENTE_VALIDACAO_AUTOR' ? '#b45309' : '#475569'
                      }}>
                        {p.resolution === 'PENDENTE_VALIDACAO_AUTOR' ? '⚠️ PENDENTE DE VALIDAÇÃO DO AUTOR' : 'ℹ️ NÃO FOI POSSÍVEL VERIFICAR'}
                      </span>
                      {p.chapterIndex >= 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>
                          Capítulo {p.chapterIndex + 1}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#1e293b' }}>
                      {p.description}
                    </div>
                    {p.snippet && (
                      <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#475569', background: '#ffffff', padding: '4px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                        {p.snippet}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                onClick={() => setSelectedBookForPendings(null)}
                style={{ padding: '8px 16px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
