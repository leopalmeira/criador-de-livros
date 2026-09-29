import React from 'react';

export const PrivacyTab: React.FC = () => {
  return (
    <div>
      <div className="header-banner">
        <div>
          <h2 className="page-title">Privacidade & Arquitetura Local</h2>
          <div className="page-subtitle">Compromisso de transparência: seus dados pertencem unicamente a você</div>
        </div>
      </div>

      <div className="data-card" style={{ padding: '28px', maxWidth: '850px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            🛡️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>
              Privacidade Absoluta e Armazenamento 100% Local
            </h3>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
              Zero Telemetria • Zero Rastreamento • Sem Servidores Externos
            </span>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0 }}>
            Esta extensão foi projetada com a premissa fundamental de <strong>privacidade e custo zero</strong>. Todo o processamento de análise, parsing de HTML, cálculo de BSR, estimativas de vendas e modelagem de royalties é executado exclusivamente na CPU da sua máquina, dentro do próprio navegador Google Chrome.
          </p>

          <div style={{ background: '#10131a', padding: '16px 20px', borderRadius: '8px', border: '1px solid #1f2633' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#60a5fa', fontWeight: 700 }}>
              Nossos Compromissos de Segurança:
            </h4>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Sem envio de dados:</strong> Seus dados de navegação, buscas de nicho e livros monitorados nunca são transmitidos para nenhum servidor externo ou nuvem de terceiros.</li>
              <li><strong>Sem telemetria:</strong> Não usamos Google Analytics, Mixpanel, pixels de rastreamento ou identificadores publicitários.</li>
              <li><strong>Zero credenciais:</strong> A extensão não lê, não intercepta e não armazena cookies de login, senhas ou dados de pagamento da Amazon.</li>
              <li><strong>Banco IndexedDB Local:</strong> Todas as observações de BSR ficam guardadas no seu banco de dados local do navegador e você pode exportá-las ou apagá-las a qualquer momento.</li>
            </ul>
          </div>

          <p style={{ margin: 0, color: '#94a3b8' }}>
            "Os dados coletados pela extensão permanecem neste navegador, salvo quando o usuário decidir exportá-los voluntariamente via arquivo CSV ou JSON."
          </p>
        </div>
      </div>
    </div>
  );
};
