import React from 'react';

export const PrivacyTab: React.FC = () => {
  return (
    <div>
      <div className="header-banner">
        <div>
          <h2 className="page-title">Privacidade & Arquitetura Local</h2>
          <div className="page-subtitle">Saiba onde os dados ficam e quando são enviados a serviços externos</div>
        </div>
      </div>

      <div className="data-card" style={{ padding: '28px', maxWidth: '850px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            🛡️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>
              Armazenamento local com integrações opcionais
            </h3>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
              Sem telemetria própria • Sem rastreamento publicitário
            </span>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0 }}>
            A análise das páginas, o cálculo de estimativas e o armazenamento de observações são feitos no navegador. Recursos de IA em nuvem e geração remota de imagens são opcionais e podem enviar os prompts e trechos do projeto ao provedor configurado, sujeitos às políticas desse serviço.
          </p>

          <div style={{ background: '#10131a', padding: '16px 20px', borderRadius: '8px', border: '1px solid #1f2633' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#60a5fa', fontWeight: 700 }}>
              Como os dados são tratados:
            </h4>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Dados locais:</strong> Projetos, configurações e observações ficam no armazenamento do navegador e podem ser exportados ou apagados pelo usuário.</li>
              <li><strong>Provedores externos:</strong> Ao usar IA em nuvem, o conteúdo necessário para a solicitação é enviado diretamente ao provedor selecionado. A extensão também pode solicitar imagens a um serviço externo conforme a configuração.</li>
              <li><strong>Chaves de API:</strong> As chaves configuradas são armazenadas em chrome.storage.local, que não oferece criptografia de segredo pela extensão. Use uma chave com limites e permissões apropriados; não compartilhe o perfil do navegador.</li>
              <li><strong>Credenciais Amazon:</strong> A extensão não lê cookies de login, senhas ou dados de pagamento da Amazon.</li>
              <li><strong>Telemetria:</strong> O projeto não integra ferramentas próprias de analytics ou rastreamento publicitário.</li>
            </ul>
          </div>

          <p style={{ margin: 0, color: '#94a3b8' }}>
            As estimativas de vendas e royalties são aproximações, não dados oficiais da Amazon. Consulte as políticas do provedor de IA antes de enviar conteúdo confidencial.
          </p>
        </div>
      </div>
    </div>
  );
};
