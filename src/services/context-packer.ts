// ================================================================
// CONTEXT_PACKER — monta só o contexto necessário e isola por projeto
// Hierarquia: regras → segurança → estado do projeto → BIBLE CANÔNICA →
// fatos aprovados → outline aprovado → capítulos aprovados → estado acumulado
// → instruções do capítulo → modelo de IA (obedece a tudo acima).
// ================================================================
import { buildAgeDirective } from './age-engine';
import { assertSameProject, type EditorialProjectState } from './project-state';
import type { ChapterSnapshot } from './continuity-engine';

export interface PackedContext {
  projectId: string;
  chapterIndex: number;
  text: string;
  included: string[];
  chars: number;
}

const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export function packContext(
  s: EditorialProjectState,
  chapterIndex: number,
  opts: { chapterTexts?: Record<number, string>; lastSnapshot?: ChapterSnapshot; maxChars?: number } = {},
): PackedContext {
  const max = opts.maxChars ?? 12000;
  const bible = s.bookBible;
  if (!bible) throw new Error('Book Bible ausente: não é possível montar contexto.');
  // PROJECT_CONTEXT_ISOLATOR: bible de outro projeto → BLOQUEIA
  assertSameProject(s.projectId, bible);

  const entry = s.outline?.[chapterIndex];
  if (!entry) throw new Error(`Outline sem entrada para o capítulo ${chapterIndex + 1}.`);

  const included: string[] = [];
  const parts: string[] = [];
  const add = (label: string, body: string) => { if (body.trim()) { parts.push(`## ${label}\n${body.trim()}`); included.push(label); } };

  add('HIERARQUIA DE AUTORIDADE', 'Obedeça nesta ordem: regras do sistema > segurança > estado do projeto > BOOK BIBLE CANÔNICA > fatos aprovados > outline aprovado > capítulos aprovados > estado acumulado > instruções do capítulo. NUNCA altere o estado permanente de um personagem. Novos fatos devem ser reportados como NEW_CANONICAL_FACT, não assumidos.');
  add('PROJETO', `Título: ${s.title}\nSubtítulo: ${s.subtitle}\nGênero/Tema: ${s.genre || s.theme} / ${s.subtheme}\nPremissa: ${s.premise}\nPromessa: ${s.bookPromise}\nLeitor-alvo: ${s.targetReader}\nDiferencial: ${s.uniqueAngle}\nIdioma: ${s.language}`);
  add('FAIXA ETÁRIA', buildAgeDirective(s.targetAge));

  const wanted = new Set([...(entry.characters || []), ...(opts.lastSnapshot?.characters.map(c => c.name) || [])].map(norm));
  const chars = Object.values(bible.permanent.characters).filter(c => wanted.size === 0 || wanted.has(norm(c.name)));
  add('PERSONAGENS ENVOLVIDOS (estado permanente — imutável)', chars.map(c => `- ${c.name}: idade ${c.age ?? '?'}; aparência: ${(c.appearance || []).join(', ')}; personalidade: ${(c.personality || []).join(', ')}`).join('\n'));

  if (opts.lastSnapshot) {
    add('ESTADO DINÂMICO ATUAL (fim do capítulo anterior)', opts.lastSnapshot.characters.map(c =>
      `- ${c.name}: local=${c.endLocation}; roupa=${(c.endClothing || []).join(', ') || '?'}; objetos=${(c.endObjects || []).join(', ') || '?'}`).join('\n'));
  }

  const locs = (entry.locations || []);
  if (locs.length) add('LOCAIS ENVOLVIDOS', locs.join(', ') + '\n' + Object.entries(bible.geography).filter(([k]) => locs.some(l => k.includes(norm(l)))).map(([k, v]) => `${k.replace('|', ' ↔ ')}: ${v} min`).join('\n'));
  if (entry.objects?.length) add('OBJETOS ENVOLVIDOS', entry.objects.join(', '));

  add('FATOS CANÔNICOS', bible.facts.filter(f => f.status === 'CANON').map(f => `- ${f.key}: ${f.value}`).join('\n'));
  add('REGRAS DO MUNDO', bible.permanent.worldRules.map(r => `- ${r}`).join('\n'));

  add(`OBJETIVO DO CAPÍTULO ${chapterIndex + 1}`, `${entry.title}: ${entry.objective}`);

  // apenas os 2 últimos capítulos APROVADOS, não o livro inteiro
  const texts = opts.chapterTexts || {};
  const prev = [chapterIndex - 1, chapterIndex - 2].filter(i => i >= 0 && texts[i]);
  prev.forEach((i, k) => add(`CAPÍTULO ${i + 1} (${k === 0 ? 'final' : 'resumo'})`, k === 0 ? texts[i].slice(-1200) : texts[i].slice(-400)));

  let text = parts.join('\n\n');
  if (text.length > max) text = text.slice(0, max) + '\n[contexto truncado]';
  return { projectId: s.projectId, chapterIndex, text, included, chars: text.length };
}

/** Última barreira antes de chamar o modelo. */
export function guardBeforeGeneration(current: { projectId: string }, ctx: PackedContext): void {
  assertSameProject(current.projectId, ctx);
}
