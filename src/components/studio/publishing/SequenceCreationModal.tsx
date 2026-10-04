// ================================================================
// MODAL: CRIAR VOLUME 2 / VOLUME 3 (SEQUÊNCIA EDITORIAL)
// Book Intel KDP — Continuidade Narrativa, Arcos e Personagens
// ================================================================

import React, { useState } from 'react';
import {
  BookOpen, Sparkles, ChevronRight, X, ArrowRight,
  Layers, CheckCircle2, Copy, FileText
} from 'lucide-react';
import type { FinalBookRecord } from '../../../types/editorial-correction';
import { db } from '../../../database/local-database';

interface SequenceCreationModalProps {
  baseBook: FinalBookRecord;
  onClose: () => void;
  onStartSequence?: (newProject: any) => void;
}

export const SequenceCreationModal: React.FC<SequenceCreationModalProps> = ({
  baseBook,
  onClose,
  onStartSequence
}) => {
  // Detecta se o livro base já é volume 1, 2 ou sem número
  const detectVolumeNumber = (title: string) => {
    if (/vol(?:ume)?\.?\s*2/i.test(title)) return 3;
    if (/vol(?:ume)?\.?\s*3/i.test(title)) return 4;
    return 2;
  };

  const nextVolumeNum = detectVolumeNumber(baseBook.title);
  const cleanBaseTitle = baseBook.title.replace(/\s*[-—:]?\s*Volume\s*\d+/gi, '').trim();

  const [sequenceTitle, setSequenceTitle] = useState(`${cleanBaseTitle} — Volume ${nextVolumeNum}`);
  const [sequenceSubtitle, setSequenceSubtitle] = useState(
    nextVolumeNum === 2
      ? 'A Continuação: Revelações que Mudaram o Rumo da História'
      : 'O Desfecho da Trilogia: O Confronto Final'
  );
  const [continuationPremise, setContinuationPremise] = useState(
    `Continuação direta de "${cleanBaseTitle}". Resgata os desfechos e consequências dos eventos anteriores, aprofundando os arcos e revelando novos segredos não resolvidos no Volume ${nextVolumeNum - 1}.`
  );
  const [authorName, setAuthorName] = useState(baseBook.author || 'Autor Book Intel');
  const [genre, setGenre] = useState(baseBook.genre || 'Thriller / Mistério Investigativo');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSequenceProject = async () => {
    setIsCreating(true);
    try {
      const newProjId = `proj_seq_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      const newProjectData = {
        id: newProjId,
        title: sequenceTitle,
        subtitle: sequenceSubtitle,
        author: authorName,
        categories: [genre],
        trimSize: baseBook.trimSize || '6x9',
        status: 'RASCUNHO',
        synopsis: continuationPremise,
        // Mantém referência à obra anterior para o motor de continuidade
        metadata: {
          isSequence: true,
          previousVolumeId: baseBook.id,
          previousBookTitle: baseBook.title,
          volumeNumber: nextVolumeNum,
          seriesName: cleanBaseTitle
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await db.saveBookProject(newProjectData as any);

      // Salva no localStorage para carregamento automático pelo KdpBookGeneratorPro
      const storageKey = `kdp_projeto_pro_v11_${newProjId}`;
      const initialDraft = {
        titulo: sequenceTitle,
        subtitulo: sequenceSubtitle,
        autor: authorName,
        genero: genre,
        topico: continuationPremise,
        livro: {
          titulo: sequenceTitle,
          subtitulo: sequenceSubtitle,
          autor: authorName,
          genero: genre,
          idioma: 'Português',
          capitulos: [
            {
              titulo: `Prólogo / Capítulo 1: O Eco do Passado`,
              texto: `Os acontecimentos recentes ainda ecoavam na mente de todos. Ninguém imaginava que as respostas encontradas no caso anterior abririam as portas para um mistério ainda mais profundo.`
            }
          ]
        },
        capaFinal: baseBook.coverDataUrl || null,
        salvoEm: Date.now()
      };

      localStorage.setItem(storageKey, JSON.stringify(initialDraft));

      if (onStartSequence) {
        onStartSequence(newProjectData);
      } else {
        // Redireciona ou abre no gerador
        window.location.hash = `#studio?projectId=${newProjId}`;
        window.location.reload();
      }
    } catch (err: any) {
      alert(`Erro ao iniciar sequência: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 14,
        maxWidth: 620,
        width: '100%',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
        border: '1px solid #e2e8f0'
      }}>
        {/* CABEÇALHO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BookOpen size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                Criar Volume {nextVolumeNum} (Sequência da Obra)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                Continuidade editorial automática baseada em &quot;{baseBook.title}&quot;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* FORMULÁRIO DE CONTINUIDADE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
              Título do Volume {nextVolumeNum}
            </label>
            <input
              type="text"
              value={sequenceTitle}
              onChange={(e) => setSequenceTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontWeight: 600
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
              Subtítulo Comercial da Sequência
            </label>
            <input
              type="text"
              value={sequenceSubtitle}
              onChange={(e) => setSequenceSubtitle(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
              Premissa de Continuidade (Diretriz da IA para não quebrar a história)
            </label>
            <textarea
              value={continuationPremise}
              onChange={(e) => setContinuationPremise(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                lineHeight: 1.5,
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 8,
            padding: 12,
            fontSize: 12,
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Sparkles size={16} />
            <span>
              O Volume {nextVolumeNum} herdará automaticamente o autor <b>{authorName}</b>, a formatação <b>{baseBook.trimSize || '6x9'}</b> e as diretrizes de estilo do livro anterior.
            </span>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 16px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleCreateSequenceProject}
            disabled={isCreating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 18px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: isCreating ? 'wait' : 'pointer',
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
            }}
          >
            <Sparkles size={14} />
            {isCreating ? 'Preparando Sequência...' : `🚀 Iniciar Volume ${nextVolumeNum} no Studio`}
          </button>
        </div>
      </div>
    </div>
  );
};
