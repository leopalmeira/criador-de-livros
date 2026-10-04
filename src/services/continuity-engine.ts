// ================================================================
// CONTINUITY ENGINE — CANONICAL_BOOK_BIBLE + validadores determinísticos
// A IA propõe; o motor valida. A Bible NUNCA é alterada casualmente.
// ================================================================

export type Severity = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'CRITICAL';
const RANK: Record<Severity, number> = { GREEN: 0, YELLOW: 1, ORANGE: 2, RED: 3, CRITICAL: 4 };
export const worstSeverity = (xs: Severity[]): Severity => xs.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'GREEN' as Severity);

export interface AuditIssue {
  validator: string;
  severity: Severity;
  chapter: number;
  message: string;
  detail?: string;
  /** instrução objetiva para o auto-repair */
  fixHint?: string;
}

// ---------------- BIBLE ----------------
export interface PermanentCharacter {
  name: string;
  age?: number;
  appearance?: string[];       // ex.: ['olhos verdes','cabelo curto']
  personality?: string[];
  history?: string;
}

export interface CanonFact {
  id: string;
  key: string;                 // ex.: 'clara.profissao'
  value: string;
  status: 'PROPOSED' | 'VERIFIED' | 'REJECTED' | 'CANON';
  chapter: number;
  reason?: string;
}

export interface CanonicalBookBible {
  projectId: string;
  version: number;
  locked: boolean;
  /** PERMANENT_STATE — IA não altera sem autorização */
  permanent: { characters: Record<string, PermanentCharacter>; worldRules: string[]; locations: string[] };
  /** distâncias em minutos entre locais: "A|B" (ordem alfabética) */
  geography: Record<string, number>;
  facts: CanonFact[];
  /** não ficção */
  factLedger: FactLedgerEntry[];
}

export function createBible(projectId: string): CanonicalBookBible {
  return { projectId, version: 1, locked: false, permanent: { characters: {}, worldRules: [], locations: [] }, geography: {}, facts: [], factLedger: [] };
}

const pairKey = (a: string, b: string) => [a.toLowerCase(), b.toLowerCase()].sort().join('|');
export function setDistance(b: CanonicalBookBible, a: string, c: string, minutes: number) { b.geography[pairKey(a, c)] = minutes; }
export const getDistance = (b: CanonicalBookBible, a: string, c: string): number | undefined => b.geography[pairKey(a, c)];

// ---------------- DYNAMIC STATE (por capítulo) ----------------
export interface CharacterChapterState {
  name: string;
  startLocation: string;
  endLocation: string;
  startClothing?: string[];
  endClothing?: string[];
  clothingChangeReason?: string;
  startObjects?: string[];
  endObjects?: string[];
  /** explicações para objetos que sumiram/apareceram: objeto → motivo */
  objectNotes?: Record<string, string>;
  /** o que sabia ao começar o capítulo (além do acumulado) */
  learned?: { fact: string; via?: string }[];
  /** fatos nos quais o personagem se baseia para agir neste capítulo */
  actsOn?: string[];
  /** afirmações sobre estado permanente feitas no texto do capítulo */
  claimedPermanent?: { age?: number; appearance?: string[] };
  /** deslocamento narrado entre end do cap anterior e start deste */
  transition?: { explained: boolean; minutes?: number };
}

export interface Presence { character: string; location: string; fromMinute: number; toMinute: number }

export interface ChapterSnapshot {
  chapter: number;
  /** minutos absolutos desde o início da história */
  startMinute?: number;
  endMinute?: number;
  flashback?: boolean;
  characters: CharacterChapterState[];
  presences?: Presence[];
  /** clima/iluminação para checagem simples */
  timeOfDay?: 'manha' | 'tarde' | 'noite' | 'madrugada';
}

const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const setOf = (xs?: string[]) => new Set((xs || []).map(norm));
const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(x => b.has(x));

// ---------------- VALIDATORS ----------------
export function validateTemporal(snaps: ChapterSnapshot[]): AuditIssue[] {
  const out: AuditIssue[] = [];
  snaps.forEach((s, i) => {
    if (s.startMinute !== undefined && s.endMinute !== undefined && s.endMinute < s.startMinute)
      out.push({ validator: 'Temporal', severity: 'RED', chapter: s.chapter, message: 'Capítulo termina antes de começar na linha do tempo.', fixHint: 'Corrigir horários do capítulo.' });
    const prev = snaps[i - 1];
    if (prev && !s.flashback && prev.endMinute !== undefined && s.startMinute !== undefined && s.startMinute < prev.endMinute)
      out.push({ validator: 'Temporal', severity: 'RED', chapter: s.chapter, message: `Capítulo ${s.chapter} começa antes do fim do capítulo anterior sem ser flashback.`, fixHint: 'Marcar flashback ou ajustar horários.' });
    // mesmo personagem em dois lugares ao mesmo tempo
    const pres = s.presences || [];
    for (let a = 0; a < pres.length; a++)
      for (let b = a + 1; b < pres.length; b++) {
        const x = pres[a], y = pres[b];
        if (norm(x.character) === norm(y.character) && norm(x.location) !== norm(y.location) && x.fromMinute < y.toMinute && y.fromMinute < x.toMinute)
          out.push({ validator: 'Temporal', severity: 'CRITICAL', chapter: s.chapter, message: `${x.character} está em "${x.location}" e em "${y.location}" ao mesmo tempo.`, fixHint: 'Separar os horários ou incluir deslocamento plausível.' });
      }
  });
  return out;
}

export function validateGeographic(snaps: ChapterSnapshot[], bible?: CanonicalBookBible): AuditIssue[] {
  const out: AuditIssue[] = [];
  for (let i = 1; i < snaps.length; i++) {
    const prev = snaps[i - 1], cur = snaps[i];
    for (const c of cur.characters) {
      const p = prev.characters.find(x => norm(x.name) === norm(c.name));
      if (!p || norm(p.endLocation) === norm(c.startLocation)) continue;
      if (!c.transition?.explained) {
        out.push({ validator: 'Geográfico', severity: 'RED', chapter: cur.chapter, message: `${c.name} termina o cap. ${prev.chapter} em "${p.endLocation}" e começa o cap. ${cur.chapter} em "${c.startLocation}" sem transição narrativa (teletransporte).`, fixHint: 'Adicionar cena/frase de deslocamento entre os locais.' });
        continue;
      }
      const dist = bible ? getDistance(bible, p.endLocation, c.startLocation) : undefined;
      const elapsed = prev.endMinute !== undefined && cur.startMinute !== undefined ? cur.startMinute - prev.endMinute : c.transition.minutes;
      if (dist !== undefined && elapsed !== undefined && elapsed < dist)
        out.push({ validator: 'Geográfico', severity: 'RED', chapter: cur.chapter, message: `${c.name} leva ${dist} min de "${p.endLocation}" a "${c.startLocation}", mas só passaram ${elapsed} min.`, fixHint: 'Aumentar o tempo decorrido ou mudar o local.' });
    }
  }
  return out;
}

export function validateClothing(snaps: ChapterSnapshot[]): AuditIssue[] {
  const out: AuditIssue[] = [];
  for (let i = 1; i < snaps.length; i++) {
    for (const c of snaps[i].characters) {
      const p = snaps[i - 1].characters.find(x => norm(x.name) === norm(c.name));
      if (!p || !p.endClothing || !c.startClothing) continue;
      if (!sameSet(setOf(p.endClothing), setOf(c.startClothing)) && !c.clothingChangeReason)
        out.push({ validator: 'Roupas', severity: 'ORANGE', chapter: snaps[i].chapter, message: `${c.name} mudou de roupa (${p.endClothing.join(', ')} → ${c.startClothing.join(', ')}) sem justificativa.`, fixHint: 'Explicar a troca de roupa ou manter a roupa anterior.' });
    }
  }
  return out;
}

export function validateObjects(snaps: ChapterSnapshot[]): AuditIssue[] {
  const out: AuditIssue[] = [];
  for (let i = 1; i < snaps.length; i++) {
    for (const c of snaps[i].characters) {
      const p = snaps[i - 1].characters.find(x => norm(x.name) === norm(c.name));
      if (!p || !p.endObjects || !c.startObjects) continue;
      const before = setOf(p.endObjects), now = setOf(c.startObjects);
      const notes = Object.keys(c.objectNotes || {}).map(norm);
      before.forEach(o => { if (!now.has(o) && !notes.includes(o)) out.push({ validator: 'Objetos', severity: 'RED', chapter: snaps[i].chapter, message: `${c.name} perdeu "${o}" sem explicação.`, fixHint: `Explicar o que aconteceu com "${o}".` }); });
      now.forEach(o => { if (!before.has(o) && !notes.includes(o)) out.push({ validator: 'Objetos', severity: 'ORANGE', chapter: snaps[i].chapter, message: `${c.name} passou a ter "${o}" sem explicação de origem.`, fixHint: `Explicar de onde veio "${o}".` }); });
    }
  }
  return out;
}

/** KNOWLEDGE LEAK: personagem age com base em fato que ainda não descobriu */
export function validateKnowledge(snaps: ChapterSnapshot[]): AuditIssue[] {
  const out: AuditIssue[] = [];
  const known = new Map<string, Set<string>>();
  for (const s of snaps) {
    // aprendizados do capítulo valem dentro dele (a ordem exata exigiria extração por cena)
    for (const c of s.characters) {
      const k = known.get(norm(c.name)) || new Set<string>();
      (c.learned || []).forEach(l => k.add(norm(l.fact)));
      known.set(norm(c.name), k);
    }
    for (const c of s.characters) {
      const k = known.get(norm(c.name))!;
      (c.actsOn || []).forEach(f => {
        if (!k.has(norm(f))) out.push({ validator: 'Conhecimento', severity: 'CRITICAL', chapter: s.chapter, message: `KNOWLEDGE LEAK: ${c.name} age com base em "${f}" antes de descobrir isso.`, fixHint: 'Remover a ação ou inserir a cena em que descobre a informação.' });
      });
    }
  }
  return out;
}

/** Personagem: nada do estado permanente pode mudar sem autorização */
export function validateCharacters(snaps: ChapterSnapshot[], bible: CanonicalBookBible): AuditIssue[] {
  const out: AuditIssue[] = [];
  for (const s of snaps) for (const c of s.characters) {
    const perm = bible.permanent.characters[norm(c.name)] || Object.values(bible.permanent.characters).find(p => norm(p.name) === norm(c.name));
    if (!perm || !c.claimedPermanent) continue;
    if (perm.age !== undefined && c.claimedPermanent.age !== undefined && perm.age !== c.claimedPermanent.age)
      out.push({ validator: 'Personagem', severity: 'RED', chapter: s.chapter, message: `${c.name}: idade canônica é ${perm.age}, mas o capítulo diz ${c.claimedPermanent.age}.`, fixHint: 'Restaurar a idade canônica.' });
    if (perm.appearance && c.claimedPermanent.appearance) {
      const canon = setOf(perm.appearance);
      const claimed = c.claimedPermanent.appearance.map(norm);
      const conflicts = claimed.filter(a => !canon.has(a));
      if (conflicts.length) out.push({ validator: 'Personagem', severity: 'RED', chapter: s.chapter, message: `${c.name}: aparência diverge do canônico (${conflicts.join(', ')}).`, fixHint: 'Alinhar a aparência à Book Bible.' });
    }
  }
  return out;
}

// ---------------- VALIDADORES DE TEXTO ----------------
export function validateChapterNotEmpty(chapter: number, text: string, minWords = 120): AuditIssue[] {
  const w = (text.match(/[\p{L}\p{N}]+/gu) || []).length;
  if (w === 0) return [{ validator: 'Capítulo', severity: 'CRITICAL', chapter, message: 'Capítulo vazio.' }];
  if (w < minWords) return [{ validator: 'Capítulo', severity: 'RED', chapter, message: `Capítulo com apenas ${w} palavras (mínimo ${minWords}).`, fixHint: 'Desenvolver o capítulo com conteúdo real, sem encher.' }];
  return [];
}

/** conexão: o início do capítulo N deve retomar entidades do fim do N-1 */
export function validateChapterConnection(chapter: number, prevText: string, text: string): AuditIssue[] {
  if (!prevText) return [];
  const caps = (t: string) => new Set((t.match(/\b\p{Lu}[\p{L}]{2,}\b/gu) || []).map(norm));
  const tail = caps(prevText.slice(-1200));
  const head = caps(text.slice(0, 1200));
  if (tail.size < 2) return [];
  let shared = 0; tail.forEach(x => { if (head.has(x)) shared++; });
  if (shared === 0) return [{ validator: 'Conexão', severity: 'ORANGE', chapter, message: 'O início do capítulo não retoma nenhum personagem/local do final do anterior (possível quebra de continuidade).', fixHint: 'Conectar a abertura ao gancho do capítulo anterior.' }];
  return [];
}

/** REPETITION_ANALYZER */
export function analyzeRepetition(chapters: { chapter: number; text: string }[]): AuditIssue[] {
  const out: AuditIssue[] = [];
  const sentenceOwners = new Map<string, number>();
  const openings = new Map<string, number[]>();
  for (const c of chapters) {
    const sents = c.text.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(Boolean);
    const open = norm(sents[0] || '').split(' ').slice(0, 4).join(' ');
    if (open) openings.set(open, [...(openings.get(open) || []), c.chapter]);
    const seenHere = new Set<string>();
    for (const s of sents) {
      const k = norm(s);
      if (k.split(' ').length < 7 || seenHere.has(k)) continue;
      seenHere.add(k);
      const owner = sentenceOwners.get(k);
      if (owner !== undefined && owner !== c.chapter)
        out.push({ validator: 'Repetição', severity: 'ORANGE', chapter: c.chapter, message: `Frase repetida do capítulo ${owner}: "${s.slice(0, 80)}…"`, fixHint: 'Reescrever a frase com outra formulação.' });
      else sentenceOwners.set(k, c.chapter);
    }
    const wc = new Map<string, number>();
    const ws = norm(c.text).split(' ').filter(w => w.length > 5);
    ws.forEach(w => wc.set(w, (wc.get(w) || 0) + 1));
    wc.forEach((n, w) => { if (ws.length > 150 && n / ws.length > 0.025) out.push({ validator: 'Repetição', severity: 'YELLOW', chapter: c.chapter, message: `Palavra "${w}" repetida ${n}x (excessivo).` }); });
  }
  openings.forEach((chs, o) => { if (chs.length >= 3) out.push({ validator: 'Repetição', severity: 'YELLOW', chapter: chs[chs.length - 1], message: `Abertura "${o}…" repetida em ${chs.length} capítulos.` }); });
  return out;
}

// ---------------- FACT LEDGER (não ficção) ----------------
export interface FactLedgerEntry { claim: string; source?: string; date?: string; reliability: 'alta' | 'media' | 'baixa' | 'desconhecida'; context?: string; status: 'verificado' | 'pendente' | 'nao_verificavel'; note?: string }

export function validateFactLedger(entries: FactLedgerEntry[], chapter = 0): AuditIssue[] {
  const out: AuditIssue[] = [];
  entries.forEach(e => {
    if (!e.source && e.status === 'verificado') out.push({ validator: 'Fatos', severity: 'RED', chapter, message: `Afirmação marcada como verificada sem fonte: "${e.claim.slice(0, 70)}"`, fixHint: 'Informar a fonte ou marcar como não verificável.' });
    else if (!e.source) out.push({ validator: 'Fatos', severity: 'ORANGE', chapter, message: `Afirmação sem fonte: "${e.claim.slice(0, 70)}"`, fixHint: 'Adicionar fonte confiável ou remover a afirmação.' });
    if (/\b\d+([.,]\d+)?\s?%/.test(e.claim) && !e.source) out.push({ validator: 'Fatos', severity: 'CRITICAL', chapter, message: `Estatística sem fonte (não inventar números): "${e.claim.slice(0, 70)}"` });
  });
  return out;
}

// ---------------- NEW_CANONICAL_FACT ----------------
export function proposeFact(b: CanonicalBookBible, key: string, value: string, chapter: number): CanonFact {
  const f: CanonFact = { id: `fact_${b.facts.length + 1}_${Date.now()}`, key: norm(key), value, status: 'PROPOSED', chapter };
  b.facts.push(f);
  return f;
}

/** detectado → classificado → verificado → aprovado → incorporado (CANON) */
export function verifyAndApproveFact(b: CanonicalBookBible, factId: string): CanonFact {
  const f = b.facts.find(x => x.id === factId);
  if (!f) throw new Error('Fato não encontrado');
  const clash = b.facts.find(x => x.status === 'CANON' && x.key === f.key && norm(x.value) !== norm(f.value));
  if (clash) { f.status = 'REJECTED'; f.reason = `Contradiz fato canônico (${clash.value}).`; return f; }
  f.status = 'VERIFIED';
  f.status = 'CANON';
  b.version++;
  return f;
}

// ---------------- AUDITORIA COMPLETA + AUTO-REPAIR ----------------
export interface AuditInput {
  snapshots: ChapterSnapshot[];
  bible: CanonicalBookBible;
  texts: { chapter: number; text: string }[];
}

export function runAudit(input: AuditInput) {
  const issues: AuditIssue[] = [
    ...validateTemporal(input.snapshots),
    ...validateGeographic(input.snapshots, input.bible),
    ...validateCharacters(input.snapshots, input.bible),
    ...validateClothing(input.snapshots),
    ...validateObjects(input.snapshots),
    ...validateKnowledge(input.snapshots),
    ...input.texts.flatMap((t, i) => [...validateChapterNotEmpty(t.chapter, t.text), ...validateChapterConnection(t.chapter, input.texts[i - 1]?.text || '', t.text)]),
    ...analyzeRepetition(input.texts),
  ];
  const severity = worstSeverity(issues.map(i => i.severity));
  return {
    issues, severity,
    blocked: severity === 'CRITICAL',                       // bloqueia avanço
    mustFix: RANK[severity] >= RANK.RED,
    counts: (['YELLOW', 'ORANGE', 'RED', 'CRITICAL'] as Severity[]).reduce((a, s) => ({ ...a, [s]: issues.filter(i => i.severity === s).length }), {} as Record<Severity, number>),
  };
}

/**
 * AUTO-REPAIR: auditar → explicar → corrigir (IA) → nova versão → auditar de novo.
 * Nunca aceita "gerar → achar erro → ignorar".
 */
export async function auditAndRepair<T extends { text: string }>(
  initial: T,
  audit: (draft: T) => Promise<AuditIssue[]> | AuditIssue[],
  repair: (draft: T, issues: AuditIssue[]) => Promise<T>,
  maxRounds = 3,
): Promise<{ draft: T; issues: AuditIssue[]; rounds: number; passed: boolean; history: { round: number; issues: AuditIssue[] }[] }> {
  let draft = initial;
  const history: { round: number; issues: AuditIssue[] }[] = [];
  let issues = await audit(draft);
  history.push({ round: 0, issues });
  let rounds = 0;
  while (RANK[worstSeverity(issues.map(i => i.severity))] >= RANK.RED && rounds < maxRounds) {
    draft = await repair(draft, issues.filter(i => RANK[i.severity] >= RANK.RED));
    rounds++;
    issues = await audit(draft);
    history.push({ round: rounds, issues });
  }
  const passed = RANK[worstSeverity(issues.map(i => i.severity))] < RANK.RED;
  return { draft, issues, rounds, passed, history };
}

// ---------------- EXTRAÇÃO DE SNAPSHOT VIA IA (opcional) ----------------
export function buildSnapshotExtractionPrompt(chapter: number, text: string): string {
  return `Extraia o ESTADO FINAL do capítulo ${chapter} como JSON ESTRITO (sem markdown):
{"chapter":${chapter},"startMinute":null,"endMinute":null,"characters":[{"name":"","startLocation":"","endLocation":"","startClothing":[],"endClothing":[],"startObjects":[],"endObjects":[],"learned":[{"fact":""}],"actsOn":[]}]}
Use apenas o que está EXPLÍCITO no texto. Se não souber, use null/[]. 

TEXTO:
${text.slice(0, 9000)}`;
}

export function parseSnapshot(raw: string, chapter: number): ChapterSnapshot | null {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]);
    if (!Array.isArray(j.characters)) return null;
    return { ...j, chapter };
  } catch { return null; }
}
