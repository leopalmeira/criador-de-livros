import { afterEach, describe, expect, it, vi } from 'vitest';
import { KdpBridgeClient } from '../src/services/kdp-bridge-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('KdpBridgeClient Vivliostyle PDF', () => {
  it('envia o HTML editorial e retorna apenas uma resposta PDF', async () => {
    const pdfBytes = Uint8Array.from([37, 80, 68, 70, 45, 49]);
    const fetchMock = vi.fn().mockResolvedValue(new Response(pdfBytes, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' }
    }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new KdpBridgeClient('http://127.0.0.1:8765');
    const request = {
      html: '<!doctype html><html><body>Livro</body></html>',
      title: 'Livro teste',
      author: 'Autora',
      language: 'pt-BR'
    };
    const result = await client.renderPdf(request);

    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8765/api/render-pdf', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(request)
    }));
    expect(result.type).toBe('application/pdf');
    expect(result.size).toBe(pdfBytes.length);
  });

  it('propaga o erro do bridge sem retornar um PDF falso', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'Vivliostyle indisponível' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )));

    const client = new KdpBridgeClient('http://127.0.0.1:8765');
    await expect(client.renderPdf({
      html: '<html></html>',
      title: 'Livro',
      author: 'Autora',
      language: 'pt-BR'
    })).rejects.toThrow('Vivliostyle indisponível');
  });
});