import { describe, it, expect } from 'vitest';
import { applyDeterministicFixes, countOccurrences } from '../src/services/editorial-rules';

describe('editorial-rules — correções determinísticas', () => {
  it('corrige mojibake de acentos', () => {
    const r = applyDeterministicFixes('A coraÃ§Ã£o de JosÃ© nÃ£o parou.', 0);
    expect(r.text).toBe('A coração de José não parou.');
    expect(r.changes.some(c => c.type === 'codificacao')).toBe(true);
  });

  it('remove espaços duplicados e antes de pontuação, insere espaço após vírgula', () => {
    const r = applyDeterministicFixes('Ele  chegou , olhou,para tambem .', 0);
    expect(r.text).toBe('Ele chegou, olhou, para também.');
  });

  it('reduz pontuação repetida e normaliza reticências', () => {
    const r = applyDeterministicFixes('Espere,, por favor.. talvez....', 0);
    expect(r.text).toBe('Espere, por favor. Talvez...');
  });

  it('converte hífen de fala em travessão (só com dialogueHyphen)', () => {
    const on = applyDeterministicFixes('- Venha aqui.\n-Não quero.', 0);
    expect(on.text).toBe('— Venha aqui.\n\n— Não quero.');
    const off = applyDeterministicFixes('- item um', 0, { dialogueHyphen: false });
    expect(off.text).toBe('- item um');
  });

  it('remove palavra funcional duplicada, mas preserva "se se" e "muito muito"', () => {
    const r = applyDeterministicFixes('Ele falou de de tudo. Não sei se se deve. Muito muito bom.', 0);
    expect(r.text).toBe('Ele falou de tudo. Não sei se se deve. Muito muito bom.');
  });

  it('corrige ortografia inequívoca preservando maiúsculas', () => {
    const r = applyDeterministicFixes('Porisso, derrepente, ele saiu. Tambem foi apartir dali.', 0);
    expect(r.text).toBe('Por isso, de repente, ele saiu. Também foi a partir dali.');
  });

  it('coloca maiúscula após ponto final, exceto abreviações e reticências', () => {
    const r = applyDeterministicFixes('Ele saiu. ela ficou. O sr. silva olhou... e foi.', 0);
    expect(r.text).toBe('Ele saiu. Ela ficou. O sr. silva olhou... e foi.');
  });

  it('junta frase cortada por quebra de parágrafo', () => {
    const r = applyDeterministicFixes('Ela caminhou pela rua escura até a velha casa de pedra e\n\nviu a porta aberta.', 0);
    expect(r.text).toBe('Ela caminhou pela rua escura até a velha casa de pedra e viu a porta aberta.');
    expect(r.changes.some(c => c.type === 'paragrafo')).toBe(true);
  });

  it('é idempotente (2ª execução não altera nada)', () => {
    const src = 'Porisso  ele  saiu,, derrepente..\n- Venha aqui.\nO fim de de tudo. ela ficou.';
    const a = applyDeterministicFixes(src, 0);
    const b = applyDeterministicFixes(a.text, 0);
    expect(b.text).toBe(a.text);
    expect(b.changes.length).toBe(0);
  });

  it('registra alterações reais com contagem de ocorrências', () => {
    const r = applyDeterministicFixes('Porisso foi. Porisso voltou. Porisso ficou.', 3);
    const ch = r.changes.filter(c => c.reason.includes('porisso'));
    expect(ch.length).toBe(3);
    expect(countOccurrences(ch)).toBe(3);
    expect(ch[0].chapterIndex).toBe(3);
    expect(ch[0].original).not.toBe(ch[0].corrected);
  });

  it('gera pendência para caractere ilegível e aspas desbalanceadas, sem inventar texto', () => {
    const r = applyDeterministicFixes('Ele disse “ola e saiu \uFFFD da sala.', 0);
    expect(r.text).toContain('\uFFFD');
    expect(r.pendings.map(p => p.kind)).toEqual(expect.arrayContaining(['codificacao', 'sentido']));
    expect(r.pendings.every(p => p.resolution === 'PENDENTE_VALIDACAO_AUTOR')).toBe(true);
  });

  it('texto limpo permanece idêntico', () => {
    const src = 'Era uma vez um menino.\n\n— Olá! — disse ele.';
    const r = applyDeterministicFixes(src, 0);
    expect(r.text).toBe(src);
    expect(r.changes.length).toBe(0);
  });
});
