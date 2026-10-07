// ============================================================================
// SERVIÇO DE CRÉDITOS EDITORIAIS KDP
// Regra de Negócio:
// - Cadastro na plataforma: 100% GRATUITO
// - Geração de Livro com IA: 1 Crédito = US$ 3,00 por livro completo
// ============================================================================

import { useState, useEffect } from 'react';

export const BOOK_CREDIT_PRICE_USD = 3.00;
export const MONTHLY_SUBSCRIPTION_PRICE = 49.90;
const CREDITS_STORAGE_KEY = 'kdp_user_book_credits';
const CREDITS_HISTORY_KEY = 'kdp_user_credits_history';
const SUBSCRIPTION_STORAGE_KEY = 'kdp_user_active_subscription';
const CREDITS_EVENT = 'kdp-credits-updated';

export interface CreditTransaction {
  id: string;
  type: 'PURCHASE' | 'CONSUMPTION' | 'SUBSCRIPTION';
  amount: number;
  description: string;
  timestamp: number;
  costUsd?: number;
}

export interface CreditPackage {
  id: string;
  name: string;
  booksCount: number;
  priceUsd: number;
  popular?: boolean;
  savingsPercent?: number;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'subscription_monthly',
    name: 'Assinatura Ilimitada KDP',
    booksCount: 9999,
    priceUsd: 49.90,
    popular: true,
  },
  {
    id: 'pack_1',
    name: '1 Livro KDP',
    booksCount: 1,
    priceUsd: 3.00,
  },
  {
    id: 'pack_5',
    name: 'Pacote 5 Livros',
    booksCount: 5,
    priceUsd: 15.00,
  },
  {
    id: 'pack_10',
    name: 'Pacote 10 Livros',
    booksCount: 10,
    priceUsd: 30.00,
  }
];

export class KdpCreditsService {
  /**
   * Verifica se o usuário tem assinatura ativa de 49,90
   */
  public static isSubscribed(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (stored === 'true') return true;
      // Por padrão em modo local, se não tiver definido, assume ativo para melhor UX
      return stored !== 'false';
    } catch {
      return true;
    }
  }

  /**
   * Ativa a assinatura mensal de 49,90
   */
  public static activateSubscription(description = 'Assinatura Mensal KDP - Acesso Ilimitado'): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, 'true');
    }
    this.recordTransaction({
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'SUBSCRIPTION',
      amount: 9999,
      description,
      timestamp: Date.now(),
      costUsd: MONTHLY_SUBSCRIPTION_PRICE
    });
    window.dispatchEvent(new CustomEvent(CREDITS_EVENT, { detail: { isSubscribed: true } }));
  }

  /**
   * Obtém o saldo atual de créditos de livros do usuário
   */
  public static getBalance(): number {
    if (typeof window === 'undefined') return 99;
    try {
      if (this.isSubscribed()) {
        return 99; // Acesso Ilimitado via Assinatura
      }
      const stored = localStorage.getItem(CREDITS_STORAGE_KEY);
      if (stored !== null) {
        return parseInt(stored, 10) || 0;
      }
      localStorage.setItem(CREDITS_STORAGE_KEY, '0');
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Verifica se o usuário possui acesso para gerar (Assinante Ativo ou Saldo >= 1)
   */
  public static hasCredit(): boolean {
    return this.isSubscribed() || this.getBalance() >= 1;
  }

  /**
   * Adiciona créditos de livros ao saldo do autor
   */
  public static addCredits(amount: number, description = 'Recarga de Créditos'): number {
    const current = this.getBalance();
    const newBalance = current + amount;
    localStorage.setItem(CREDITS_STORAGE_KEY, String(newBalance));

    // Registra histórico da transação
    this.recordTransaction({
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'PURCHASE',
      amount,
      description,
      timestamp: Date.now(),
      costUsd: amount * BOOK_CREDIT_PRICE_USD
    });

    window.dispatchEvent(new CustomEvent(CREDITS_EVENT, { detail: { balance: newBalance } }));
    return newBalance;
  }

  /**
   * Consome 1 crédito para gerar uma obra completa
   */
  public static consumeCredit(bookTitle: string): boolean {
    const current = this.getBalance();
    if (current < 1) {
      return false;
    }

    const newBalance = current - 1;
    localStorage.setItem(CREDITS_STORAGE_KEY, String(newBalance));

    this.recordTransaction({
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'CONSUMPTION',
      amount: 1,
      description: `Geração do livro: "${bookTitle.slice(0, 40)}"`,
      timestamp: Date.now()
    });

    window.dispatchEvent(new CustomEvent(CREDITS_EVENT, { detail: { balance: newBalance } }));
    return true;
  }

  /**
   * Retorna histórico de transações
   */
  public static getHistory(): CreditTransaction[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(CREDITS_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static recordTransaction(tx: CreditTransaction) {
    try {
      const history = this.getHistory();
      const updated = [tx, ...history].slice(0, 50);
      localStorage.setItem(CREDITS_HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao salvar histórico de créditos:', e);
    }
  }
}

/**
 * Hook React reativo para observar e manipular créditos em tempo real
 */
export function useBookCredits() {
  const [balance, setBalance] = useState<number>(KdpCreditsService.getBalance());

  useEffect(() => {
    const handleUpdate = (e: any) => {
      const newBal = typeof e?.detail?.balance === 'number' ? e.detail.balance : KdpCreditsService.getBalance();
      setBalance(newBal);
    };

    window.addEventListener(CREDITS_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(CREDITS_EVENT, handleUpdate);
    };
  }, []);

  const purchaseCredits = (amount: number, description?: string) => {
    const updated = KdpCreditsService.addCredits(amount, description);
    setBalance(updated);
    return updated;
  };

  const useCredit = (bookTitle: string) => {
    const success = KdpCreditsService.consumeCredit(bookTitle);
    if (success) {
      setBalance(KdpCreditsService.getBalance());
    }
    return success;
  };

  return {
    balance,
    hasCredit: balance >= 1,
    creditPriceUsd: BOOK_CREDIT_PRICE_USD,
    packages: CREDIT_PACKAGES,
    purchaseCredits,
    useCredit,
  };
}
