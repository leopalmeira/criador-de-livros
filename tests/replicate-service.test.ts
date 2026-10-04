import { describe, it, expect } from 'vitest';
import {
  getReplicateToken,
  DEFAULT_REPLICATE_TOKEN,
  REPLICATE_IMAGE_MODELS,
  REPLICATE_TEXT_MODELS
} from '../src/services/replicate-service';

describe('Serviço de Inteligência Artificial Replicate (FLUX + LLaMA 3)', () => {
  it('1. Token do Replicate configurado com a chave oficial do servidor', () => {
    const token = getReplicateToken();
    expect(token).toBeDefined();
    expect(token.startsWith('r8_')).toBe(true);
    expect(token.length).toBe(40);
    expect(token).toBe(DEFAULT_REPLICATE_TOKEN);
  });

  it('2. Modelos oficiais mapeados corretamente', () => {
    expect(REPLICATE_IMAGE_MODELS.FLUX_SCHNELL).toBe('black-forest-labs/flux-schnell');
    expect(REPLICATE_IMAGE_MODELS.FLUX_DEV).toBe('black-forest-labs/flux-dev');
    expect(REPLICATE_TEXT_MODELS.LLAMA3_70B).toBe('meta/meta-llama-3-70b-instruct');
  });

  it('3. Token tem autenticação válida contra a API do Replicate', async () => {
    const token = getReplicateToken();
    const res = await fetch('https://api.replicate.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Se o token for válido, o Replicate retorna HTTP 200 OK
    expect(res.status).toBe(200);
  });
});
