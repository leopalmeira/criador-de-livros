import React, { useState } from 'react';

interface ScriptItem {
  name: string;
  repo: string;
  category: string;
  description: string;
  integration: string;
  path: string;
}

const INTEGRATED_SCRIPTS: ScriptItem[] = [
  {
    name: 'generate_covers.sh',
    repo: 'wesleyscholl/book-generator',
    category: 'Design & Capas',
    description: 'Calcula proporções de lombada, gera capas de 300 DPI e full-wrap jacket com sangria KDP.',
    integration: '100% Integrado no "🎨 Gerador de Capa KDP"',
    path: 'book-generator/scripts/generate_covers.sh'
  },
  {
    name: 'compile_book.sh',
    repo: 'wesleyscholl/book-generator',
    category: 'Compilação KDP',
    description: 'Compilação robusta de manuscritos para EPUB 3.0, PDF com diagramação e HTML.',
    integration: '100% Integrado em EpubBuilder, PdfBuilder e KdpPackager',
    path: 'book-generator/scripts/compile_book.sh'
  },
  {
    name: 'kdp_topic_finder.sh',
    repo: 'wesleyscholl/book-generator',
    category: 'Pesquisa de Mercado',
    description: 'Pesquisa e validação de tópicos de alta demanda e baixa concorrência na Amazon KDP.',
    integration: 'Integrado nas Pesquisas de Nichos & Demanda do BookEngin',
    path: 'book-generator/scripts/kdp_topic_finder.sh'
  },
  {
    name: 'plagiarism_report_manager.sh',
    repo: 'wesleyscholl/book-generator',
    category: 'Auditoria & Originalidade',
    description: 'Verificação profunda de originalidade, n-gramas e detecção de padrões repetitivos.',
    integration: 'Integrado no Quality Gate Editorial do BookEngin',
    path: 'book-generator/scripts/plagiarism_report_manager.sh'
  },
  {
    name: 'multi_provider_ai.sh',
    repo: 'wesleyscholl/book-generator',
    category: 'Motores IA',
    description: 'Roteamento inteligente entre múltiplos modelos de IA (Local Ollama, OpenAI, Claude, OpenRouter).',
    integration: 'Integrado no LocalAiEngine & AiService do BookEngin',
    path: 'book-generator/scripts/multi_provider_ai.sh'
  },
  {
    name: 'generate_appendices.sh',
    repo: 'wesleyscholl/book-generator',
    category: 'Elementos Editoriais',
    description: 'Criação estruturada de apêndices, glossários e listas de verificação pós-leitura.',
    integration: 'Integrado na Geração de Páginas Preliminares e Finais',
    path: 'book-generator/scripts/generate_appendices.sh'
  },
  {
    name: 'generate_references.sh',
    repo: 'wesleyscholl/book-generator',
    category: 'Elementos Editoriais',
    description: 'Formatação acadêmica e comercial de referências bibliográficas.',
    integration: 'Integrado nos Elementos Editoriais do BookCreator',
    path: 'book-generator/scripts/generate_references.sh'
  },
  {
    name: 'pipeline.py',
    repo: 'ShonP/kdp-book',
    category: 'Fluxo Autônomo',
    description: 'Pipeline completo de agentes autônomos para outline, bíblia da obra e capítulos sequenciais.',
    integration: 'Integrado na Árvore Editorial e KdpBookPipeline',
    path: 'kdp-book/kdp_book/src/pipeline.py'
  }
];

export const RepositoriesTab: React.FC = () => {
  const [selectedScript, setSelectedScript] = useState<ScriptItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = ['all', 'Design & Capas', 'Compilação KDP', 'Pesquisa de Mercado', 'Auditoria & Originalidade', 'Motores IA', 'Elementos Editoriais', 'Fluxo Autônomo'];

  const filteredScripts = filterCategory === 'all' 
    ? INTEGRATED_SCRIPTS 
    : INTEGRATED_SCRIPTS.filter(s => s.category === filterCategory);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 10px 40px 10px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        border: '1px solid #3b82f6',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '32px' }}>📦</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc' }}>
                Repositórios & Motores de Geração KDP
              </h1>
              <span style={{
                background: '#047857',
                color: '#ecfdf5',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '12px',
                border: '1px solid #10b981'
              }}>
                ✓ CLONADOS LOCALMENTE NO PROJETO
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#cbd5e1' }}>
              Os códigos-fonte dos melhores repositórios open-source de publicação KDP estão presentes e integrados diretamente no BookEngin.
            </p>
          </div>
        </div>
      </div>

      {/* Cards dos Dois Repositórios Principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        {/* Card 1: Wesley Scholl Book-Generator */}
        <div style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }}></div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                  REPOSITÓRIO PRINCIPAL REFERENCIADO
                </span>
                <h2 style={{ margin: '4px 0', fontSize: '19px', fontWeight: 800, color: '#ffffff' }}>
                  wesleyscholl/book-generator
                </h2>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Autor: Wesley Scholl • Licença Open-Source
                </div>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid #10b981',
                padding: '4px 10px',
                borderRadius: '6px'
              }}>
                ✓ Clonado em ./book-generator
              </span>
            </div>

            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Base tecnológica completa para geração de temas com alta demanda KDP, títulos de alto CTR, outlines estruturados, capítulos densos, capas com cálculo de sangria, compilação em EPUB/PDF e auditoria anti-plágio.
            </p>

            <div style={{ background: '#1e293b', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ color: '#f8fafc' }}>Localização no Disco:</strong>
              </div>
              <code style={{ color: '#38bdf8', fontSize: '11px', wordBreak: 'break-all' }}>
                c:\Users\User\Desktop\criador-de-livros\book-generator
              </code>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {['Capas KDP 300 DPI', 'Compilação EPUB/PDF', 'Auditoria Anti-Plágio', 'Multi-IA', 'Pesquisa de Tópicos'].map((tag, idx) => (
                <span key={idx} style={{ background: '#020617', border: '1px solid #1e293b', color: '#94a3b8', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #1e293b', paddingTop: '14px' }}>
            <a
              href="https://github.com/wesleyscholl/book-generator"
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: 'none',
                background: '#2563eb',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🌐 Ver no GitHub ➔
            </a>
          </div>
        </div>

        {/* Card 2: ShonP KDP-Book */}
        <div style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #8b5cf6, #c084fc)' }}></div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase' }}>
                  FRAMEWORK DE AGENTES AUTÔNOMOS
                </span>
                <h2 style={{ margin: '4px 0', fontSize: '19px', fontWeight: 800, color: '#ffffff' }}>
                  ShonP/kdp-book
                </h2>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Autor: ShonP • Licença MIT
                </div>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid #10b981',
                padding: '4px 10px',
                borderRadius: '6px'
              }}>
                ✓ Clonado em ./kdp-book
              </span>
            </div>

            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Arquitetura de agentes especializados que trabalham de forma coordenada: Agente de Pesquisa, Agente de Bíblia da Obra, Agente Redator Sequencial com memória holística e Agente Revisor Crítico de Manuscrito.
            </p>

            <div style={{ background: '#1e293b', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ color: '#f8fafc' }}>Localização no Disco:</strong>
              </div>
              <code style={{ color: '#c084fc', fontSize: '11px', wordBreak: 'break-all' }}>
                c:\Users\User\Desktop\criador-de-livros\kdp-book
              </code>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {['Bíblia da Obra', 'Escrita em Camadas', 'Continuidade de Personagens', 'Revisão Editorial', 'KDP Formatting'].map((tag, idx) => (
                <span key={idx} style={{ background: '#020617', border: '1px solid #1e293b', color: '#94a3b8', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #1e293b', paddingTop: '14px' }}>
            <a
              href="https://github.com/ShonP/kdp-book"
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: 'none',
                background: '#7c3aed',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🌐 Ver no GitHub ➔
            </a>
          </div>
        </div>

      </div>

      {/* Seção de Scripts e Módulos Integrados */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#f8fafc' }}>
              Módulos & Scripts Disponíveis
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Estes são os scripts originais dos repositórios que foram convertidos e integrados aos motores do BookIntel.
            </p>
          </div>

          {/* Filtros por categoria */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                style={{
                  background: filterCategory === cat ? '#2563eb' : '#1e293b',
                  color: filterCategory === cat ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {cat === 'all' ? 'Todos os Módulos' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Scripts */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Script / Módulo</th>
                <th style={{ padding: '12px 14px' }}>Repositório de Origem</th>
                <th style={{ padding: '12px 14px' }}>Categoria</th>
                <th style={{ padding: '12px 14px' }}>Status de Integração no BookEngin</th>
                <th style={{ padding: '12px 14px' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredScripts.map((script, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid #1e293b',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)'
                  }}
                >
                  <td style={{ padding: '14px', fontWeight: 700, color: '#f8fafc' }}>
                    <code style={{ background: '#1e293b', padding: '3px 8px', borderRadius: '4px', color: '#38bdf8' }}>
                      {script.name}
                    </code>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', fontWeight: 'normal' }}>
                      {script.description}
                    </div>
                  </td>
                  <td style={{ padding: '14px', color: '#cbd5e1' }}>
                    {script.repo}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <span style={{ background: '#1e293b', color: '#a5b4fc', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>
                      {script.category}
                    </span>
                  </td>
                  <td style={{ padding: '14px' }}>
                    <span style={{ color: '#34d399', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>✓</span> {script.integration}
                    </span>
                  </td>
                  <td style={{ padding: '14px' }}>
                    <button
                      onClick={() => setSelectedScript(script)}
                      style={{
                        background: '#1e293b',
                        color: '#38bdf8',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Inspecionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes do Script */}
      {selectedScript && (
        <div
          onClick={() => setSelectedScript(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
                  {selectedScript.category}
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                  {selectedScript.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedScript(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Caminho do Arquivo:</div>
              <code style={{ display: 'block', background: '#020617', padding: '10px', borderRadius: '6px', color: '#38bdf8', fontSize: '12px' }}>
                {selectedScript.path}
              </code>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Como o BookEngin Utiliza:</div>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>
                {selectedScript.integration}. A lógica foi portar diretamente para a stack da extensão com persistência no IndexedDB, oferecendo execução instantânea sem necessidade de terminal ou dependências externas pesadas.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button
                onClick={() => setSelectedScript(null)}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
