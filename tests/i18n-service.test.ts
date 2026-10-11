import { describe, it, expect, beforeEach } from 'vitest';
import {
  setLanguage,
  getCurrentLanguage,
  t,
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
} from '../src/services/i18n-service';

describe('i18n Service - Troca de Idioma e Localização em Tempo Real', () => {
  beforeEach(() => {
    // Limpa localStorage simulado
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('1. Deve suportar todos os idiomas principais (pt-BR, en-US, es-ES)', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toContain('pt-BR');
    expect(codes).toContain('en-US');
    expect(codes).toContain('es-ES');
  });

  it('2. Deve alternar para Português (pt-BR) e traduzir chaves da landing page', () => {
    setLanguage('pt-BR');
    expect(getCurrentLanguage()).toBe('pt-BR');
    expect(t('landing.tabLogin')).toBe('Entrar');
    expect(t('landing.heroTitleHighlight')).toBe('livros profissionais');
    expect(t('landing.step1Title')).toBe('Escolha um tema ou nicho');
  });

  it('3. Deve alternar para Inglês (en-US) e traduzir chaves da landing page', () => {
    setLanguage('en-US');
    expect(getCurrentLanguage()).toBe('en-US');
    expect(t('landing.tabLogin')).toBe('Sign In');
    expect(t('landing.heroTitleHighlight')).toBe('professional books');
    expect(t('landing.step1Title')).toBe('Choose a topic or niche');
  });

  it('4. Deve alternar para Espanhol (es-ES) e traduzir chaves da landing page', () => {
    setLanguage('es-ES');
    expect(getCurrentLanguage()).toBe('es-ES');
    expect(t('landing.tabLogin')).toBe('Iniciar sesión');
    expect(t('landing.heroTitleHighlight')).toBe('libros profesionales');
    expect(t('landing.step1Title')).toBe('Elige un tema o nicho');
  });

  it('5. Deve persistir a escolha de idioma no localStorage', () => {
    setLanguage('es-ES');
    if (typeof localStorage !== 'undefined') {
      expect(localStorage.getItem('kdp_user_language')).toBe('es-ES');
    }
  });

  it('6. Deve usar fallback quando a chave não existir', () => {
    setLanguage('en-US');
    const result = t('chave_inexistente_123', 'Fallback Padrão');
    expect(result).toBe('Fallback Padrão');
  });
});
