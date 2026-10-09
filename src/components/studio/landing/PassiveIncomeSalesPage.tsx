import React, { useState } from 'react';
import {
  BookOpen, Sparkles, TrendingUp, DollarSign, CheckCircle2,
  ArrowRight, ShieldCheck, Zap, ChevronDown, Rocket,
  Star, HelpCircle, Layers, Lock, Award, BookCheck
} from 'lucide-react';
import '../../../styles/passive-income-sales.css';

interface PassiveIncomeSalesPageProps {
  onEnterDashboard: () => void;
  onStartCreation: () => void;
}

export const PassiveIncomeSalesPage: React.FC<PassiveIncomeSalesPageProps> = ({
  onEnterDashboard,
  onStartCreation
}) => {
  // Estado da Calculadora Interativa de Renda Passiva
  const [numBooks, setNumBooks] = useState(5);
  const [salesPerBook, setSalesPerBook] = useState(15);
  const bookPrice = 39.90;
  const royaltyRate = 0.70; // 70% da Amazon KDP
  const netPerSale = bookPrice * royaltyRate; // R$ 27,93 por venda líquida
  const monthlyEarnings = numBooks * salesPerBook * netPerSale;
  const yearlyEarnings = monthlyEarnings * 12;
  const planCost = 49.90;
  const roi = Math.round(((monthlyEarnings - planCost) / planCost) * 100);

  // Estado do FAQ Interativo
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Estado do Modal de Assinatura R$ 49,90
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleConfirmSubscription = () => {
    setCheckoutSuccess(true);
    setTimeout(() => {
      setIsCheckoutOpen(false);
      onEnterDashboard();
    }, 1800);
  };

  const faqItems = [
    {
      q: 'Preciso ter experiência como escritor para criar livros?',
      a: 'Não. O motor de IA do BookEngin foi treinado com padrões de best-sellers da Amazon. Ele constrói títulos magnéticos, capítulos encadeados em português natural, vocabulário popular e sem metáforas complicadas. Qualquer pessoa pode criar um livro de alta qualidade em minutos.'
    },
    {
      q: 'Como funciona o limite de 5 livros por mês no plano de R$ 49,90?',
      a: 'Você pode gerar até 5 livros completos mensalmente — incluindo capítulos narrativos, capas profissionais em alta resolução já diagramadas e exportação em formato padrão KDP (PDF e eBook Kindle).'
    },
    {
      q: 'A publicação é feita direto da plataforma sem sair do BookEngin?',
      a: 'Sim! Nosso Publicador Direto In-App valida as margens, monta a capa aberta, estrutura os metadados, formata a descrição comercial e transmite os dados para a Amazon KDP sem você precisar sair da ferramenta.'
    },
    {
      q: 'Quanto a Amazon me paga e como recebo o dinheiro?',
      a: 'Na Amazon KDP você recebe até 70% de royalties líquidos sobre cada exemplar vendido. Os pagamentos são transferidos automaticamente todos os meses via depósito bancário direto na sua conta do Brasil ou internacional.'
    },
    {
      q: 'Os direitos autorais dos livros são meus?',
      a: 'Sim, 100% seus! Você detém todos os direitos comerciais, autorais e patrimoniais de cada livro e capa criados na plataforma. A BookEngin não cobra comissões sobre as suas vendas na Amazon.'
    },
    {
      q: 'Posso cancelar a assinatura quando quiser?',
      a: 'Sim, você tem total liberdade. Não há fidelidade, contrato nem taxa de cancelamento. E todos os livros que você já tiver publicado na Amazon continuarão à venda gerando renda passiva para você para sempre!'
    }
  ];

  return (
    <div className="pis-wrapper">
      {/* Luzes atmosféricas de fundo */}
      <div className="pis-glow-1" />
      <div className="pis-glow-2" />

      {/* NAVBAR */}
      <header className="pis-navbar">
        <div className="pis-container">
          <div className="pis-nav-inner">
            <a href="#hero" className="pis-logo">
              <div className="pis-logo-icon">
                <BookOpen size={22} />
              </div>
              <div className="pis-logo-text">
                <span className="pis-logo-title">
                  BOOKENGIN <span className="pis-logo-badge">PRO</span>
                </span>
                <span className="pis-logo-sub">Máquina de Renda Passiva na Amazon</span>
              </div>
            </a>

            <ul className="pis-nav-links">
              <li><a href="#oportunidade">A Oportunidade</a></li>
              <li><a href="#calculadora">Calculadora de Ganhos</a></li>
              <li><a href="#como-funciona">Como Funciona</a></li>
              <li><a href="#plano">Plano R$ 49,90</a></li>
              <li><a href="#faq">Dúvidas Frequentes</a></li>
            </ul>

            <div className="pis-nav-actions">
              <button
                className="pis-btn-nav-dashboard"
                onClick={onEnterDashboard}
                title="Acessar painel do estúdio"
              >
                Acessar Dashboard <ArrowRight size={15} />
              </button>
              <button
                className="pis-btn-nav-cta"
                onClick={() => setIsCheckoutOpen(true)}
              >
                Assinar R$ 49,90/mês
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="hero" className="pis-hero">
        <div className="pis-container">
          <div className="pis-hero-pill">
            <Zap size={14} /> Construa Ativos de Renda Passiva na Maior Livraria do Planeta
          </div>

          <h1 className="pis-hero-title">
            Venda Livros na Amazon e Tenha <br />
            <span className="pis-gradient-text">Renda Passiva Todo Mês</span> no Automático
          </h1>

          <p className="pis-hero-sub">
            Por apenas <strong>R$ 49,90/mês</strong>, gere até <strong>5 livros completos todo mês</strong> com IA editorial sem clichês, capas diagramadas em alta resolução e <strong>publicação direta sem sair da ferramenta</strong>. A Amazon imprime, entrega e você recebe os royalties.
          </p>

          <div className="pis-hero-ctas">
            <button
              className="pis-btn-hero-primary"
              onClick={() => setIsCheckoutOpen(true)}
            >
              <Rocket size={20} /> Começar Minha Renda Passiva • R$ 49,90/mês
            </button>
            <button
              className="pis-btn-hero-secondary"
              onClick={onEnterDashboard}
            >
              <BookCheck size={18} /> Entrar Direto na Dashboard
            </button>
          </div>

          <div className="pis-hero-badges">
            <div className="pis-badge-item">
              <ShieldCheck size={18} /> 100% dos Royalties São Seus
            </div>
            <div className="pis-badge-item">
              <Layers size={18} /> Até 5 Livros Prontos / Mês
            </div>
            <div className="pis-badge-item">
              <Sparkles size={18} /> Publicação Direta In-App
            </div>
            <div className="pis-badge-item">
              <Award size={18} /> Sem Estoque nem Gráfica
            </div>
          </div>
        </div>
      </section>

      {/* BANNER DE DESTAQUE */}
      <div className="pis-container">
        <div className="pis-highlight-banner" id="oportunidade">
          <div className="pis-banner-left">
            <div className="pis-banner-icon">
              <DollarSign size={28} />
            </div>
            <div>
              <div className="pis-banner-title">O Maior Negócio de Renda Passiva Digital da Atualidade</div>
              <div className="pis-banner-desc">
                Um livro publicado no Amazon KDP trabalha para você 24 horas por dia, 365 dias por ano, em mais de 12 países.
              </div>
            </div>
          </div>
          <div className="pis-banner-price-tag">
            <div className="pis-price-label">Assinatura Oficial</div>
            <div className="pis-price-val">R$ 49,90 <span>/ mês</span></div>
          </div>
        </div>
      </div>

      {/* CALCULADORA DE RENDA PASSIVA */}
      <section id="calculadora" className="pis-container">
        <div className="pis-section-title-wrap">
          <span className="pis-tag-section">Simulador de Faturamento</span>
          <h2 className="pis-section-title">Quanto Você Pode Ganhar no Piloto Automático?</h2>
          <p className="pis-section-desc">
            Deslize os controles abaixo para simular os ganhos mensais acumulados do seu catálogo de livros na Amazon KDP com a taxa oficial de 70% de royalties.
          </p>
        </div>

        <div className="pis-calc-box">
          <div className="pis-calc-grid">
            <div className="pis-calc-sliders">
              <div className="pis-slider-group">
                <div className="pis-slider-header">
                  <span className="pis-slider-label">Quantidade de Livros Publicados:</span>
                  <span className="pis-slider-badge">{numBooks} {numBooks === 1 ? 'Livro' : 'Livros'}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={numBooks}
                  onChange={(e) => setNumBooks(parseInt(e.target.value, 10))}
                  className="pis-range-input"
                />
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  No plano de R$ 49,90 você pode publicar até 5 novos livros a cada mês.
                </span>
              </div>

              <div className="pis-slider-group">
                <div className="pis-slider-header">
                  <span className="pis-slider-label">Média de Vendas Mensais por Livro:</span>
                  <span className="pis-slider-badge">{salesPerBook} vendas/mês</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="60"
                  step="1"
                  value={salesPerBook}
                  onChange={(e) => setSalesPerBook(parseInt(e.target.value, 10))}
                  className="pis-range-input"
                />
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Estimativa realista com base em títulos bem ranqueados na Amazon Brasil e Internacional.
                </span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  💰 <strong>Preço médio de venda:</strong> R$ {bookPrice.toFixed(2)} | <strong>Royalties KDP (70%):</strong> R$ {netPerSale.toFixed(2)} por unidade vendida limpa na sua conta.
                </div>
              </div>
            </div>

            <div className="pis-calc-result-card">
              <div className="pis-result-header-text">Renda Passiva Mensal Estimada</div>
              <div className="pis-result-income-main">
                R$ {monthlyEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span> / mês</span>
              </div>
              <div className="pis-result-subtext">
                R$ {yearlyEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ano de faturamento recorrente.
              </div>

              <div className="pis-calc-metrics-row">
                <div>
                  <div className="pis-metric-item-val green">+{roi}%</div>
                  <div className="pis-metric-item-lbl">Retorno sobre Assinatura (ROI)</div>
                </div>
                <div>
                  <div className="pis-metric-item-val">R$ 49,90</div>
                  <div className="pis-metric-item-lbl">Custo Mensal da Ferramenta</div>
                </div>
              </div>

              <button
                className="pis-btn-calc-cta"
                onClick={() => setIsCheckoutOpen(true)}
              >
                Garantir Meu Acesso • R$ 49,90/mês <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3 PASSOS DA MÁQUINA DE LIVROS */}
      <section id="como-funciona" className="pis-container">
        <div className="pis-section-title-wrap">
          <span className="pis-tag-section">Método 100% Automático</span>
          <h2 className="pis-section-title">Como Funciona a Criação & Venda</h2>
          <p className="pis-section-desc">
            Tudo acontece de forma integrada dentro do BookEngin, da ideia ao livro publicado.
          </p>
        </div>

        <div className="pis-steps-grid">
          <div className="pis-step-card">
            <span className="pis-step-number">01</span>
            <div className="pis-step-icon">
              <TrendingUp size={28} />
            </div>
            <h3 className="pis-step-title">1. Escolha o Nicho Lucrativo</h3>
            <p className="pis-step-desc">
              O sistema analisa os segmentos mais procurados da Amazon (Desenvolvimento, Finanças, Fábulas, Suspense, Negócios) e sugere premissas com alta demanda e baixa concorrência.
            </p>
          </div>

          <div className="pis-step-card">
            <span className="pis-step-number">02</span>
            <div className="pis-step-icon">
              <Sparkles size={28} />
            </div>
            <h3 className="pis-step-title">2. IA Escreve & Diagrama a Capa</h3>
            <p className="pis-step-desc">
              O motor editorial redige capítulos ricos, fluidos e sem metáforas abstratas. Em paralelo, a capa é diagramada automaticamente na proporção exata KDP (2:3) sem sobreposição de textos.
            </p>
          </div>

          <div className="pis-step-card">
            <span className="pis-step-number">03</span>
            <div className="pis-step-icon">
              <DollarSign size={28} />
            </div>
            <h3 className="pis-step-title">3. Publique Direto & Fature Royalties</h3>
            <p className="pis-step-desc">
              Publique direto da plataforma sem sair do BookEngin. A Amazon imprime sob demanda cada pedido, despacha para a casa do leitor e deposita 70% do lucro direto na sua conta.
            </p>
          </div>
        </div>
      </section>

      {/* PLANO DE R$ 49,90/MÊS */}
      <section id="plano" className="pis-pricing-section">
        <div className="pis-container">
          <div className="pis-section-title-wrap">
            <span className="pis-tag-section">Investimento Acessível</span>
            <h2 className="pis-section-title">Tudo o que Você Precisa por Apenas R$ 49,90/mês</h2>
            <p className="pis-section-desc">
              Menos de R$ 1,66 por dia para você construir um patrimônio literário perpétuo na maior loja do mundo.
            </p>
          </div>

          <div className="pis-pricing-card-spotlight">
            <div className="pis-pricing-badge-popular">Plano Criador KDP Pro • Oferta Limitada</div>

            <h3 className="pis-plan-name">Assinatura Mensal Renda Passiva</h3>
            <p className="pis-plan-sub">Acesso completo a todas as ferramentas editoriais e publicação direta.</p>

            <div className="pis-plan-price-block">
              <span className="pis-plan-currency">R$</span>
              <span className="pis-plan-amount">49,90</span>
              <span className="pis-plan-period">/ mês</span>
            </div>

            <div className="pis-plan-daily-cost">
              ✓ Equivalente a R$ 1,66 por dia (Sem fidelidade, cancele quando quiser)
            </div>

            <div className="pis-features-list">
              <div className="pis-feature-item">
                <CheckCircle2 size={18} />
                <span><strong>Gere até 5 livros completos todo mês</strong> (capítulos, sinopse, capa e miolo diagramado).</span>
              </div>
              <div className="pis-feature-item">
                <CheckCircle2 size={18} />
                <span><strong>Publicação Direta na Amazon KDP</strong> sem precisar sair da plataforma.</span>
              </div>
              <div className="pis-feature-item">
                <CheckCircle2 size={18} />
                <span><strong>Motor de IA Editorial Google Gemini</strong> com linguagem humana e vocabulário popular.</span>
              </div>
              <div className="pis-feature-item">
                <CheckCircle2 size={18} />
                <span><strong>Compositor de Capas Profissionais 4K</strong> calibradas na proporção comercial 2:3.</span>
              </div>
              <div className="pis-feature-item">
                <CheckCircle2 size={18} />
                <span><strong>Exportação em 1 Clique</strong> de Miolo em PDF para Impresso e eBook Kindle.</span>
              </div>
              <div className="pis-feature-item">
                <CheckCircle2 size={18} />
                <span><strong>100% dos Direitos e Royalties são Seus</strong> (zero comissões sobre suas vendas).</span>
              </div>
              <div className="pis-feature-item">
                <CheckCircle2 size={18} />
                <span><strong>Suporte Prioritário & Atualizações Contínuas</strong> de inteligência de mercado KDP.</span>
              </div>
            </div>

            <button
              className="pis-btn-pricing-cta"
              onClick={() => setIsCheckoutOpen(true)}
            >
              <Rocket size={20} /> Assinar Agora por R$ 49,90/mês
            </button>

            <div className="pis-guarantee-note">
              <ShieldCheck size={16} /> 7 Dias de Garantia Incondicional • Ativação Imediata
            </div>
          </div>
        </div>
      </section>

      {/* PROVA SOCIAL / DEPOIMENTOS */}
      <section className="pis-container">
        <div className="pis-section-title-wrap">
          <span className="pis-tag-section">Casos Reais</span>
          <h2 className="pis-section-title">Quem Publica com o BookEngin Recomenda</h2>
          <p className="pis-section-desc">
            Autores e empreendedores que transformaram tempo livre em ativos perpétuos de renda passiva.
          </p>
        </div>

        <div className="pis-testimonials-grid">
          <div className="pis-test-card">
            <div className="pis-test-quote">
              "No meu primeiro mês gerei 4 livros de não-ficção. O processo de publicação direta dentro da ferramenta facilitou tudo. Já no segundo mês os royalties da Amazon pagaram a assinatura e sobrou mais de R$ 900 de lucro limpo."
            </div>
            <div className="pis-test-author-box">
              <div className="pis-test-avatar">MR</div>
              <div>
                <div className="pis-test-name">Marcelo Ramos</div>
                <div className="pis-test-role">Autor KDP • 7 Livros Publicados</div>
              </div>
            </div>
          </div>

          <div className="pis-test-card">
            <div className="pis-test-quote">
              "O diferencial é a clareza dos textos: sem palavras difíceis ou metáforas que cansam o leitor. As capas saem perfeitas, com título e subtítulo posicionados sem sobreposição. É a melhor ferramenta do mercado."
            </div>
            <div className="pis-test-author-box">
              <div className="pis-test-avatar">CS</div>
              <div>
                <div className="pis-test-name">Camila Silveira</div>
                <div className="pis-test-role">Criadora de Conteúdo & Autora</div>
              </div>
            </div>
          </div>

          <div className="pis-test-card">
            <div className="pis-test-quote">
              "Eu gastava cerca de R$ 1.200 só para contratar capista e diagramador por livro. Por R$ 49,90 por mês eu crio até 5 livros completos com capa e texto impecável. A economia é absurda e a renda passiva só cresce."
            </div>
            <div className="pis-test-author-box">
              <div className="pis-test-avatar">RF</div>
              <div>
                <div className="pis-test-name">Rodrigo Fonseca</div>
                <div className="pis-test-role">Empreendedor Digital KDP</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="pis-container">
        <div className="pis-section-title-wrap">
          <span className="pis-tag-section">Tire Suas Dúvidas</span>
          <h2 className="pis-section-title">Perguntas Frequentes</h2>
          <p className="pis-section-desc">
            Tudo o que você precisa saber sobre a ferramenta, os livros e o recebimento de royalties.
          </p>
        </div>

        <div className="pis-faq-list">
          {faqItems.map((item, idx) => (
            <div key={idx} className={`pis-faq-item ${openFaq === idx ? 'open' : ''}`}>
              <button className="pis-faq-question" onClick={() => toggleFaq(idx)}>
                <span>{item.q}</span>
                <ChevronDown size={18} />
              </button>
              {openFaq === idx && (
                <div className="pis-faq-answer">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pis-footer">
        <div className="pis-container">
          <div className="pis-footer-links">
            <button onClick={onEnterDashboard}>Acessar Dashboard</button>
            <a href="#hero">Início</a>
            <a href="#calculadora">Calculadora</a>
            <a href="#plano">Plano R$ 49,90</a>
            <a href="#faq">Dúvidas</a>
          </div>
          <div>
            © {new Date().getFullYear()} BookEngin — Plataforma de Criação & Publicação Direta de Livros. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* MODAL DE CHECKOUT / ATIVAÇÃO DO PLANO R$ 49,90 */}
      {isCheckoutOpen && (
        <div className="pis-modal-overlay" onClick={() => !checkoutSuccess && setIsCheckoutOpen(false)}>
          <div className="pis-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="pis-modal-close"
              onClick={() => setIsCheckoutOpen(false)}
            >
              ✕
            </button>

            {checkoutSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{
                  width: 64,
                  height: 64,
                  background: 'rgba(16, 185, 129, 0.15)',
                  borderRadius: '50%',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  border: '2px solid #10b981'
                }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8, color: '#fff' }}>
                  Assinatura Confirmada com Sucesso!
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginBottom: 20 }}>
                  Seu plano de <strong>R$ 49,90/mês</strong> foi ativado. Você já pode criar até 5 livros mensais e publicá-los direto na Amazon.
                </p>
                <div style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600 }}>
                  Redirecionando para o seu Estúdio BookEngin...
                </div>
              </div>
            ) : (
              <>
                <div className="pis-modal-header">
                  <h3 className="pis-modal-title">Assinar BookEngin Pro</h3>
                  <p className="pis-modal-sub">Gere até 5 livros completos todo mês e publique direto no KDP.</p>
                </div>

                <div className="pis-modal-plan-box">
                  <div>
                    <div className="pis-modal-plan-name">Plano Renda Passiva KDP</div>
                    <div className="pis-modal-plan-desc">Até 5 livros completos/mês + Capas 4K</div>
                  </div>
                  <div className="pis-modal-plan-price">
                    R$ 49,90 <span>/mês</span>
                  </div>
                </div>

                <div className="pis-modal-payment-options">
                  <button
                    className={`pis-payment-tab-btn ${paymentMethod === 'pix' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('pix')}
                  >
                    ⚡ PIX Instantâneo
                  </button>
                  <button
                    className={`pis-payment-tab-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    💳 Cartão de Crédito
                  </button>
                </div>

                {paymentMethod === 'pix' ? (
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                    marginBottom: 20,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6 }}>
                      Chave PIX Oficial de Ativação Instantânea:
                    </div>
                    <div style={{
                      background: '#090d16',
                      padding: '10px 14px',
                      borderRadius: 8,
                      fontFamily: 'monospace',
                      fontSize: '0.88rem',
                      color: '#fbbf24',
                      border: '1px dashed rgba(245,158,11,0.4)',
                      userSelect: 'all',
                      marginBottom: 8
                    }}>
                      contato@bookengin.com
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>
                      ✓ Liberação automática imediata após confirmação
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    <input
                      type="text"
                      placeholder="Número do Cartão de Crédito"
                      defaultValue="•••• •••• •••• 4242"
                      style={{
                        background: '#090d16',
                        border: '1px solid rgba(255,255,255,0.12)',
                        padding: '12px 14px',
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: '0.9rem'
                      }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <input
                        type="text"
                        placeholder="Validade (MM/AA)"
                        defaultValue="12/28"
                        style={{
                          background: '#090d16',
                          border: '1px solid rgba(255,255,255,0.12)',
                          padding: '12px 14px',
                          borderRadius: 8,
                          color: '#fff',
                          fontSize: '0.9rem'
                        }}
                      />
                      <input
                        type="text"
                        placeholder="CVV"
                        defaultValue="123"
                        style={{
                          background: '#090d16',
                          border: '1px solid rgba(255,255,255,0.12)',
                          padding: '12px 14px',
                          borderRadius: 8,
                          color: '#fff',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                  </div>
                )}

                <button
                  className="pis-modal-btn-confirm"
                  onClick={handleConfirmSubscription}
                >
                  <Lock size={16} /> Confirmar Assinatura • R$ 49,90
                </button>

                <button
                  className="pis-modal-btn-direct-dash"
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    onEnterDashboard();
                  }}
                >
                  Ou entrar diretamente na Dashboard (Modo de Demonstração) →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
