// ============================================================================
// MODAL DE RECARGA DE CRÉDITOS EDITORIAIS KDP (US$ 3 POR LIVRO)
// ============================================================================

import React, { useState } from 'react';
import { X, Sparkles, CreditCard, ShieldCheck, CheckCircle2, Zap, BookOpen } from 'lucide-react';
import { useBookCredits, CREDIT_PACKAGES, CreditPackage, BOOK_CREDIT_PRICE_USD, KdpCreditsService } from '../../../services/kdp-credits-service';
import { useTranslation } from '../../../services/i18n-service';
import { formatPlatformPrice } from '../../../services/market-region';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  motivo?: string;
}

export const PurchaseCreditsModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, motivo }) => {
  const { balance, purchaseCredits } = useBookCredits();
  const { t, currentLang, isBrazil } = useTranslation();
  const subscriptionPrice = formatPlatformPrice(25, isBrazil);
  const ui = (portuguese: string, english: string) => currentLang === 'pt-BR' ? portuguese : english;
  const packageName = (pkg: CreditPackage) => {
    if (currentLang === 'pt-BR') return pkg.name;
    if (pkg.id === 'subscription_monthly') return 'BookEngin Subscription (Up to 15 Books)';
    return `${pkg.booksCount} ${pkg.booksCount === 1 ? 'Book' : 'Books'}`;
  };
  const [pacoteSelecionado, setPacoteSelecionado] = useState<CreditPackage>(CREDIT_PACKAGES[0]); // Default Assinatura US$ 25
  const [processando, setProcessando] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState(false);

  if (!isOpen) return null;

  const handleComprar = () => {
    setProcessando(true);
    setTimeout(() => {
      if (pacoteSelecionado.id === 'subscription_monthly') {
        KdpCreditsService.activateSubscription('Assinatura Mensal BookEngin - Até 15 Livros/mês');
        purchaseCredits(15, 'Ativação de Assinatura Mensal US$ 25');
      } else {
        purchaseCredits(pacoteSelecionado.booksCount, `Compra de pacote: ${pacoteSelecionado.name}`);
      }
      setProcessando(false);
      setSucessoMsg(true);
      setTimeout(() => {
        setSucessoMsg(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    }, 600);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(2, 6, 23, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: 16
    }}>
      <div style={{
        width: '100%',
        maxWidth: 580,
        background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 20,
        border: '1px solid rgba(56, 189, 248, 0.3)',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.15)',
        overflow: 'hidden',
        color: '#f8fafc',
        fontFamily: "'Inter', sans-serif"
      }}>
        {/* TOPO DO MODAL */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #2563eb, #0284c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(37, 99, 235, 0.5)'
            }}>
              <Zap size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#ffffff' }}>
                {ui('Assinatura Editorial & Créditos KDP', 'Editorial Subscription & KDP Credits')}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#94a3b8' }}>
                {ui(`Assinatura completa por apenas ${subscriptionPrice}/mês • Acesso Ilimitado`, `Full subscription for ${subscriptionPrice}/month • Unlimited Access`)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTEÚDO */}
        <div style={{ padding: '24px 28px' }}>
          {motivo && (
            <div style={{
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 13,
              color: '#fef08a',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <Zap size={18} color="#eab308" />
              <span>{motivo}</span>
            </div>
          )}

          {/* SALDO ATUAL */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(2, 6, 23, 0.6)',
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 22,
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>{ui('Seu saldo de créditos atual:', 'Your current credit balance:')}</span>
            <span style={{
              fontSize: 15,
              fontWeight: 800,
              color: balance > 0 ? '#38bdf8' : '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <BookOpen size={16} /> {balance} {balance === 1 ? ui('Livro', 'Book') : ui('Livros', 'Books')} ({balance * BOOK_CREDIT_PRICE_USD} USD)
            </span>
          </div>

          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 12 }}>
            {ui('Selecione o pacote de créditos desejado:', 'Choose a credit package:')}
          </label>

          {/* LISTA DE PACOTES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            {CREDIT_PACKAGES.map((pkg) => {
              const isSelected = pacoteSelecionado.id === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setPacoteSelecionado(pkg)}
                  style={{
                    position: 'relative',
                    background: isSelected ? 'rgba(37, 99, 235, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                    border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 14,
                    padding: '16px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isSelected ? '0 0 15px rgba(56, 189, 248, 0.25)' : 'none'
                  }}
                >
                  {pkg.popular && (
                    <div style={{
                      position: 'absolute',
                      top: -10,
                      right: 12,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 12,
                      textTransform: 'uppercase'
                    }}>
                      {ui('Mais Escolhido', 'Most Popular')}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>{packageName(pkg)}</span>
                    {isSelected && <CheckCircle2 size={16} color="#38bdf8" />}
                  </div>

                  <div style={{ fontSize: 20, fontWeight: 900, color: '#38bdf8' }}>
                    {pkg.id === 'subscription_monthly' ? (
                      <>
                        {subscriptionPrice}
                        <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600, marginLeft: 4 }}>
                          {currentLang === 'pt-BR' ? '/ mês' : currentLang === 'es-ES' ? '/ mes' : '/ mo'}
                        </span>
                      </>
                    ) : (
                      `US$ ${pkg.priceUsd.toFixed(2)}`
                    )}
                  </div>

                  <div style={{ fontSize: 11, color: pkg.id === 'subscription_monthly' ? '#34d399' : '#94a3b8', marginTop: 4, fontWeight: pkg.id === 'subscription_monthly' ? 700 : 400 }}>
                    {pkg.id === 'subscription_monthly'
                      ? (currentLang === 'pt-BR' ? 'Acesso Ilimitado • Cancele quando quiser' : currentLang === 'es-ES' ? 'Acceso Ilimitado • Cancela cuando quieras' : 'Unlimited Access • Cancel anytime')
                      : `Equivalente a US$ ${BOOK_CREDIT_PRICE_USD.toFixed(2)} / livro`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* MENSAGEM DE SUCESSO */}
          {sucessoMsg ? (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              borderRadius: 12,
              padding: '14px',
              textAlign: 'center',
              color: '#34d399',
              fontWeight: 700,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}>
              <CheckCircle2 size={18} />
              {ui('Assinatura ativada com sucesso! Liberando acesso ilimitado...', 'Subscription activated! Unlocking unlimited access...')}
            </div>
          ) : (
            <button
              onClick={handleComprar}
              disabled={processando}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #2563eb, #0284c7)',
                color: '#ffffff',
                border: 'none',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              <CreditCard size={18} />
              {processando
                ? ui('Processando...', 'Processing...')
                : pacoteSelecionado.id === 'subscription_monthly'
                  ? ui(`Ativar Assinatura Ilimitada (${subscriptionPrice}/mês)`, `Activate Unlimited Subscription (${subscriptionPrice}/month)`)
                  : ui(`Adicionar ${pacoteSelecionado.booksCount} Livros por US$ ${pacoteSelecionado.priceUsd.toFixed(2)}`, `Add ${pacoteSelecionado.booksCount} Books for US$ ${pacoteSelecionado.priceUsd.toFixed(2)}`)}
            </button>
          )}

          {/* GARANTIA */}
          <div style={{
            marginTop: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 11,
            color: '#64748b'
          }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>{ui('Sem mensalidade fixa • Seus créditos nunca expiram • Uso instantâneo', 'No fixed monthly fee • Credits never expire • Instant access')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
