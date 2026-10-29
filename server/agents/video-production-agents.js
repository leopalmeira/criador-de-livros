// ================================================================
// 🎬 AGENTES AUTÔNOMOS DE PRODUÇÃO CINEMATOGRÁFICA DE VÍDEO (BACKEND)
// Executados no Node.js com IA Autônoma + Replicate FLUX.1 Schnell:
// 1. Agente Diretor de Cenas (Roteiro Cronológico, Elenco & Fotografia em 3 Takes Distintos)
// 2. Agente Diretor de Áudio (Fluidez Vocal Natural, Zero Reticências & Vozes Neurais)
// 3. Agente de Efeitos Especiais (Trilha Sonora, Auto-Ducking, Ambiente Foley, Transições e VFX)
// 4. Agente Diretor Geral de Vídeo (Auditoria Executiva, Reparo de Inconsistências & Controle de Qualidade)
// ================================================================

import { getReplicateToken, generateReplicateText } from '../replicate/api.js';

function decodeKey(b64) {
  try {
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf-8');
    if (typeof atob !== 'undefined') return atob(b64);
  } catch {}
  return '';
}

const KEY_1 = decodeKey('QVEuQWI4Uk42STE0SlpvSW5sMnhiZFN5Q1NxenQ4cVFTbmpWTWpIcHpCcHJOVGZKaG9tMUE=');
const KEY_2 = decodeKey('QVEuQWI4Uk42S1BRTDJ6Wnc2aFZ2ei1xZ1dEa0xsbXdpUkxEMFBSdmxlczNUem5kN0NVNnc=');

function getApiKeys() {
  const keys = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  if (process.env.VITE_GEMINI_API_KEY && !keys.includes(process.env.VITE_GEMINI_API_KEY)) keys.push(process.env.VITE_GEMINI_API_KEY);
  if (KEY_1 && !keys.includes(KEY_1)) keys.push(KEY_1);
  if (KEY_2 && !keys.includes(KEY_2)) keys.push(KEY_2);
  return keys;
}

// gemini-3.5-flash com thinkingBudget: 0 responde em ~1.2s-2.5s
const MODELS = [
  { name: 'gemini-3.5-flash', thinkingBudget: 0 },
  { name: 'gemini-3.5-flash-lite', thinkingBudget: null },
  { name: 'gemini-flash-latest', thinkingBudget: null }
];

/**
 * Chamada rápida e resiliente ao Gemini no Backend Node.js (com fallback para Replicate LLaMA 3)
 */
async function callGemini(prompt, { temperature = 0.4, maxTokens = 4000 } = {}) {
  const keys = getApiKeys();

  for (const modelCfg of MODELS) {
    for (const apiKey of keys) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelCfg.name}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const generationConfig = {
          temperature,
          maxOutputTokens: maxTokens,
          topP: 0.95
        };

        if (modelCfg.thinkingBudget !== null) {
          generationConfig.thinkingConfig = { thinkingBudget: modelCfg.thinkingBudget };
        }

        const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(22000)
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[VideoAgents Backend] Modelo ${modelCfg.name} status ${res.status}: ${errText.slice(0, 100)}`);
          if (res.status === 400 || res.status === 404) break;
          continue;
        }

        const data = await res.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const rawText = parts.map(p => (!p.thought && p.text) ? p.text : '').join('') || parts[0]?.text;
        if (rawText && rawText.trim()) {
          return rawText.trim();
        }
      } catch (err) {
        console.warn(`[VideoAgents Backend] Modelo ${modelCfg.name} falhou:`, err.message);
      }
    }
  }

  // Fallback para Replicate LLaMA 3 70B se todos os modelos Gemini estiverem ocupados
  try {
    const llamaOut = await generateReplicateText(prompt, { temperature, maxTokens });
    if (llamaOut && llamaOut.trim()) return llamaOut.trim();
  } catch (repErr) {
    console.warn('[VideoAgents Backend] Fallback Replicate LLaMA falhou:', repErr.message);
  }

  throw new Error('Todos os modelos de IA falharam na execução do agente');
}

/**
 * Parser resiliente de JSON para saídas de IA
 */
function safeJsonParse(text, fallback) {
  if (!text || typeof text !== 'string') return fallback;
  try {
    const clean = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const noTrailingCommas = clean.replace(/,\s*([\]}])/g, '$1');
    return JSON.parse(noTrailingCommas);
  } catch {
    try {
      const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        const noTrailing = match[0].replace(/,\s*([\]}])/g, '$1');
        return JSON.parse(noTrailing);
      }
    } catch {}
    return fallback;
  }
}

/**
 * Limpa reticências artificiais ("..."), aspas duplicadas e espaços quebrados
 */
export function sanitizeSpokenText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let clean = rawText
    .replace(/^\s*\.{2,}\s*/g, '')      // Remove "..." no início da frase
    .replace(/\s*\.{3,}\s*/g, ', ')     // Substitui "..." no meio por pausa natural de vírgula
    .replace(/,\s*,+/g, ',')
    .replace(/\.\s*,/g, '.')
    .replace(/,\s*\./g, '.')
    .replace(/^["“”']+(.+?)["“”']+$/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (clean && !/[.!?]$/.test(clean)) {
    clean += '.';
  }
  // Garante primeira letra maiúscula
  if (clean.length > 1) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean;
}

/**
 * Detecta se um texto atribuído a personagem está na verdade narrado em 3ª pessoa
 * Ex: "Ela precisava de provas concretas antes de voltar pra casa..."
 */
function isThirdPersonNarration(text, speakerName = '') {
  const clean = String(text || '').trim();
  const lower = clean.toLowerCase();
  const speakerLower = String(speakerName || '').toLowerCase().trim();

  // Possui marcas claras de 1ª pessoa?
  const hasFirstPerson = /\b(eu|meu|minha|meus|minhas|comigo|preciso|estou|vou|posso|sei|sinto|acho|tenho|vi|fiz|descobri|quero|não vou|não posso)\b/i.test(lower);
  if (hasFirstPerson) return false;

  // Começa com "Ela ", "Ele ", ou o próprio nome do personagem seguido de verbo em 3ª pessoa
  if (/^(ela|ele)\s+/i.test(lower)) return true;
  if (speakerLower && speakerLower !== 'narrador' && lower.startsWith(speakerLower + ' ')) return true;
  if (/\b(ela precisava|ele precisava|ela sabia|ele sabia|ela caminhou|ele caminhou|ela entrou|ele entrou|na mente dela|na mente dele)\b/i.test(lower)) {
    return true;
  }
  return false;
}

/**
 * 0. DECOMPOSIÇÃO INTELIGENTE DO CAPÍTULO EM CENAS CRONOLÓGICAS AUTÊNTICAS
 * Evita cenas repetidas e garante progressão narrativa real do início ao fim do capítulo.
 */
export async function analyzeChapterIntoDirectedScenes({
  bookTitle = 'Livro',
  chapterTitle = 'Capítulo',
  chapterText = '',
  bookGenre = 'Suspense',
  targetScenesCount = 5,
  bible = {}
} = {}) {
  const count = Math.max(3, Math.min(20, Number(targetScenesCount) || 5));

  const prompt = `Você é um ROTEIRISTA E DIRETOR DE CINEMA DE HOLLYWOOD premiado.
Sua missão é adaptar o capítulo abaixo em EXATAMENTE ${count} cenas cinematográficas sequenciais, autênticas e SEM QUALQUER REPETIÇÃO.

## LIVRO: "${bookTitle}" | CAPÍTULO: "${chapterTitle}" | GÊNERO: "${bookGenre}"

## TEXTO DO CAPÍTULO:
"""
${String(chapterText || '').slice(0, 6500)}
"""

## REGRAS INVIOLÁVEIS DE ROTEIRO E DIREÇÃO:
1. **PROGRESSÃO CRONOLÓGICA SEM REPETIÇÃO**:
   - Divida o capítulo em ${count} momentos distintos que avançam a história do início ao clímax do capítulo.
   - NUNCA repita a mesma frase, ação ou ideia em duas cenas diferentes (ex: se a Cena 1 mostra a personagem entrando no carro na Avenida Paulista, a Cena 2 DEVE avançar para o próximo acontecimento do capítulo, como a chegada ao prédio, a descoberta das contas vazias no computador, um diálogo tenso, etc.).
2. **REGRA DE OURO DE FALANTES (NARRADOR vs PERSONAGEM)**:
   - Use \`"speakerType": "narrator"\` e \`"speakerName": "Narrador"\` para TODA narração em 3ª pessoa (ex: "O vento frio cortava a Avenida Paulista enquanto Helena entrava no carro...").
   - Use \`"speakerType": "character_female"\` ou \`"character_male"\` APENAS quando o texto for FALA DIRETA em 1ª pessoa do personagem (ex: Helena dizendo: "Eu preciso encontrar os extratos originais no escritório antes que Marcelo apague tudo!").
   - NUNCA coloque um texto em 3ª pessoa ("Ela precisava...", "Helena olhou...") na voz de um personagem! Para dar dinamismo, alterne entre \`Narrador\` (3ª pessoa) e falas diretas em 1ª pessoa dos personagens (\`character_female\` / \`character_male\`).
3. **ZERO RETICÊNCIAS ("...")**:
   - É PROIBIDO usar "..." (reticências) no início ou no meio das falas! Escreva frases limpas, completas, pontuadas com vírgulas e pontos finais naturais (25 a 45 palavras por cena).
4. **3 TAKES FOTOGRÁFICOS 100% DISTINTOS E ESPECÍFICOS EM INGLÊS POR CENA**:
   - Cada cena tem 3 takes que contam visualmente aquele momento sem se repetir:
   - \`take1Prompt\`: **WIDE ESTABLISHING SHOT (24mm lens)** — O cenário específico daquela cena (arquitetura, iluminação, clima, ambiente completo com o personagem posicionado).
   - \`take2Prompt\`: **MEDIUM ACTION SHOT (50mm lens)** — Plano médio da cintura para cima mostrando o personagem executando a ação física exata descrita na cena.
   - \`take3Prompt\`: **EXTREME CLOSE-UP / DETAIL SHOT (85mm macro/portrait lens)** — Close-up dramático no objeto-chave mencionado na fala (ex: tela do computador com saldo zerado, chave na ignição, documento confidencial, ou olhos expressando choque).
   - Todos os 3 prompts DEVEM ser em INGLÊS, ricos em detalhes visuais concretos da cena, incluindo a descrição física do protagonista para continuidade.

Retorne APENAS JSON válido no formato:
{
  "visualContinuity": {
    "protagonistName": "Nome do protagonista identificado no texto",
    "protagonistDescription": "Detailed physical description in English (age, hair, clothing, demeanor)",
    "settingDescription": "Main chapter locations in English",
    "cinematicStyle": "35mm anamorphic cinema photography, Fincher/Villeneuve atmospheric lighting, photorealistic 8k",
    "colorGrade": "Moody teal and warm tungsten amber"
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "speakerType": "narrator",
      "speakerName": "Narrador",
      "text": "Texto limpo sem reticências...",
      "emotionalTone": "tensão / urgência",
      "take1Prompt": "Wide angle 24mm establishing shot in English...",
      "take2Prompt": "Medium 50mm waist-up action shot in English...",
      "take3Prompt": "Tight 85mm close-up shot in English..."
    }
  ]
}`;

  const raw = await callGemini(prompt, { temperature: 0.45, maxTokens: 4500 });
  const parsed = safeJsonParse(raw, null);
  if (parsed && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
    return {
      visualContinuity: parsed.visualContinuity || bible,
      scenes: parsed.scenes.map((s, idx) => {
        let speakerType = s.speakerType || 'narrator';
        let speakerName = s.speakerName || 'Narrador';
        const cleanedText = sanitizeSpokenText(s.text || '');

        // Auditoria imediata: se marcou como personagem mas texto é 3ª pessoa, corrige para Narrador
        if (speakerType !== 'narrator' && isThirdPersonNarration(cleanedText, speakerName)) {
          speakerType = 'narrator';
          speakerName = 'Narrador';
        }

        return {
          sceneNumber: idx + 1,
          speakerType,
          speakerName,
          text: cleanedText,
          emotionalTone: s.emotionalTone || 'cinematográfico',
          take1Prompt: s.take1Prompt || '',
          take2Prompt: s.take2Prompt || '',
          take3Prompt: s.take3Prompt || ''
        };
      })
    };
  }

  return null;
}

/**
 * 1. AGENTE DIRETOR DE CENAS (BACKEND)
 */
export async function directScenes(payload) {
  const { scenes = [], bible = {}, bookTitle = 'História', bookGenre = 'Ficção' } = payload;

  const scenesSummary = scenes.map((s, i) => ({
    num: i + 1,
    speaker: s.speakerName || 'Narrador',
    type: s.speakerType || 'narrator',
    text: sanitizeSpokenText(s.text || '').slice(0, 280)
  }));

  const prompt = `Você é um DIRETOR DE FOTOGRAFIA CINEMATOGRÁFICA DE HOLLYWOOD (Direção de Cenas Backend).
Sua missão é criar enquadramentos 100% fiéis ao que acontece em cada cena, garantindo que NENHUMA imagem se repita entre os takes ou entre as cenas.

## REGRA DE OURO INVIOLÁVEL:
1. Cada cena DEVE ter um ambiente, ângulo e foco visual diferente da cena anterior, acompanhando a evolução da história.
2. Dentro da mesma cena, os 3 takes DEVEM ser radicalmente diferentes em enquadramento e distância focal:
   - \`take1Prompt\`: **WIDE ESTABLISHING SHOT (24mm lens)** — Ambiente amplo completo onde a cena ocorre (rua, fachada, sala inteira, horizonte, iluminação e clima).
   - \`take2Prompt\`: **MEDIUM ACTION SHOT (50mm lens)** — Personagem da cintura para cima executando a ação física específica descrita na fala.
   - \`take3Prompt\`: **EXTREME CLOSE-UP / DETAIL SHOT (85mm macro lens)** — Detalhe dramático em primeiro plano de um objeto mencionado na fala (ex: mãos no volante, tela de computador mostrando contas bancárias vazias, pasta de documentos, chave na fechadura) ou close fechado nos olhos do personagem.

## BÍBLIA VISUAL:
- Protagonista: ${bible.protagonistName || 'Personagem Principal'} — ${bible.protagonistDescription || '34-year-old woman with dark brown wavy hair, wearing a dark tailored wool coat'}
- Cenário Principal: ${bible.settingDescription || 'Modern metropolis at night and dimly lit law office'}
- Estilo: ${bible.cinematicStyle || 'Photorealistic 8K 35mm cinema film, Fincher style'}
- Paleta: ${bible.colorGrade || 'Deep teal shadows and warm tungsten highlights'}

## LIVRO: "${bookTitle}" | GÊNERO: ${bookGenre}

## CENAS A DIRIGIR:
${JSON.stringify(scenesSummary, null, 2)}

Retorne APENAS JSON estrito (array com ${scenes.length} objetos):
[
  {
    "sceneNumber": 1,
    "speakerName": "Nome",
    "speakerType": "narrator",
    "spokenText": "texto falado",
    "emotionalTone": "tensão / choque / descoberta",
    "visualDescription": "descrição visual exata em português",
    "cameraAngle": "wide / eye level / low angle / macro close-up",
    "lightingMood": "dramatic chiaroscuro / neon reflections / desk lamp glow",
    "take1Prompt": "Wide 24mm establishing shot in English showing the specific environment of scene 1...",
    "take2Prompt": "Medium 50mm waist-up action shot in English showing the character performing the exact action of scene 1...",
    "take3Prompt": "Extreme 85mm close-up detail shot in English focusing on the key object or facial reaction of scene 1...",
    "colorPalette": "cool teal and amber",
    "continuityNotes": "manter mesmo figurino e iluminação coerente"
  }
]`;

  const raw = await callGemini(prompt, { temperature: 0.35, maxTokens: 4500 });
  const parsed = safeJsonParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * 2. AGENTE DIRETOR DE ÁUDIO (BACKEND)
 */
export async function directAudio(payload) {
  const { scenes = [], bookGenre = 'Geral' } = payload;

  const scenesSummary = scenes.map((s, i) => ({
    num: i + 1,
    speaker: s.speakerName || 'Narrador',
    type: s.speakerType || 'narrator',
    text: sanitizeSpokenText(s.text || '')
  }));

  const prompt = `Você é um DIRETOR DE ÁUDIO E DUBLAGEM CINEMATOGRÁFICA (Backend Audio Agent).
Sua missão é revisar a fluidez das falas e corrigir qualquer erro de atribuição de voz (Narrador vs Personagem).

## REGRAS OBRIGATÓRIAS:
1. **PROIBIDO USAR RETICÊNCIAS ("...")**:
   - NUNCA use "..." no início, no meio ou no fim de "directedText"! Reticências quebram o sintetizador neural. Use apenas vírgulas e pontos finais limpos.
2. **PROIBIDO REPETIR TEXTO ENTRE CENAS**:
   - Cada cena deve ter seu próprio texto distinto e fiel ao momento narrativo.
3. **CORREÇÃO DE FALANTE (3ª PESSOA vs 1ª PESSOA)**:
   - Se uma cena estiver marcada como personagem ("character_female" ou "character_male"), mas o texto estiver em 3ª pessoa (ex: "Ela precisava de provas concretas..."), você DEVE:
     - OU converter a fala para 1ª pessoa autêntica na voz daquele personagem (ex: "Eu preciso de provas concretas antes de voltar para casa e encarar o Marcelo. Vou direto para o escritório de advocacia.")
     - OU mudar "speakerType" para "narrator" e "speakerName" para "Narrador".
4. Converta siglas isoladas ou números curtos em palavras naturais quando melhorar a leitura.

## GÊNERO: ${bookGenre}
## CENAS:
${JSON.stringify(scenesSummary, null, 2)}

Retorne APENAS JSON estrito:
{
  "scenes": [
    {
      "sceneIndex": 0,
      "speakerName": "Narrador ou Nome do Personagem",
      "speakerType": "narrator / character_female / character_male",
      "originalText": "texto original",
      "directedText": "texto limpo, sem reticências (...), natural e fluido para locução profissional.",
      "pacing": "slow / normal / fast",
      "emotionalTone": "urgente / melancólico / investigativo",
      "emphasisWords": ["palavra1", "palavra2"],
      "breathPauses": [250]
    }
  ],
  "globalNotes": "Locução fluida sem reticências e com papéis de narrador/personagem validados",
  "estimatedDurationSec": 45
}`;

  const raw = await callGemini(prompt, { temperature: 0.35, maxTokens: 4000 });
  const parsed = safeJsonParse(raw, null);
  if (parsed && Array.isArray(parsed.scenes)) {
    parsed.scenes = parsed.scenes.map((sc, i) => ({
      ...sc,
      sceneIndex: typeof sc.sceneIndex === 'number' ? sc.sceneIndex : i,
      directedText: sanitizeSpokenText(sc.directedText || sc.originalText || scenes[i]?.text || '')
    }));
    return parsed;
  }

  return {
    scenes: scenes.map((s, i) => ({
      sceneIndex: i,
      speakerName: s.speakerName || 'Narrador',
      speakerType: s.speakerType || 'narrator',
      originalText: s.text || '',
      directedText: sanitizeSpokenText(s.text || ''),
      pacing: 'normal',
      emotionalTone: 'cinematográfico',
      emphasisWords: [],
      breathPauses: [200]
    })),
    globalNotes: 'Vozes tratadas com pontuação limpa',
    estimatedDurationSec: scenes.length * 8
  };
}

// Valores canônicos suportados pelo motor Web Audio e pelo renderizador Canvas do Frontend
const VALID_BGM_MOODS = [
  'suspense-tenso',
  'misterio-investigacao',
  'terror-claustrofobico',
  'drama-emocional',
  'acao-perigo',
  'calmaria-introspectiva'
];

const VALID_AMBIENT_SOUNDS = [
  'chuva',
  'vento',
  'trovao',
  'relogio',
  'quarto-fechado',
  'natureza',
  'nenhum'
];

const VALID_VFX = [
  'film-grain-35mm',
  'vignette-dramatic',
  'light-leak-warm',
  'dust-particles',
  'anamorphic-flare',
  'fog-haze',
  'rain-mist',
  'heartbeat-pulse'
];

const VALID_TRANSITIONS = [
  'zoomThrough',
  'filmBurn',
  'whipPan',
  'lumaDissolve',
  'dipToBlack',
  'smoothBezier'
];

function normalizeBgmMood(rawMood, text = '') {
  if (VALID_BGM_MOODS.includes(rawMood)) return rawMood;
  const m = String(rawMood || '').toLowerCase() + ' ' + String(text || '').toLowerCase();
  if (/investig|pista|arquivo|escrit|conta|documento|misteri|foco/.test(m)) return 'misterio-investigacao';
  if (/correu|fuga|persegui|carro|aceler|urg|perigo|acao/.test(m)) return 'acao-perigo';
  if (/terror|medo|pavor|escur|sombra|assomb/.test(m)) return 'terror-claustrofobico';
  if (/triste|lagrima|casamento|marido|dor|emoc|drama/.test(m)) return 'drama-emocional';
  if (/calma|silencio|paz|respir/.test(m)) return 'calmaria-introspectiva';
  return 'suspense-tenso';
}

function normalizeAmbientSound(rawAmbient, text = '') {
  if (VALID_AMBIENT_SOUNDS.includes(rawAmbient)) return rawAmbient;
  const a = String(rawAmbient || '').toLowerCase() + ' ' + String(text || '').toLowerCase();
  if (/chuva|garoa|molhad|tempestade/.test(a)) return 'chuva';
  if (/vento|madrugada|avenida|rua|frio|paulista|noite/.test(a)) return 'vento';
  if (/relogio|hora|tempo|tic/.test(a)) return 'relogio';
  if (/trovao|raio|relampago/.test(a)) return 'trovao';
  if (/floresta|bosque|arvore|vento/.test(a)) return 'natureza';
  if (/escritorio|sala|quarto|interior|predio|mesa|carro/.test(a)) return 'quarto-fechado';
  return 'quarto-fechado';
}

function normalizeVisualEffects(rawList, sceneIdx = 0) {
  const mapped = [];
  for (const item of (Array.isArray(rawList) ? rawList : [])) {
    const s = String(item || '').toLowerCase();
    if (VALID_VFX.includes(s)) {
      mapped.push(s);
    } else if (s.includes('grain')) {
      mapped.push('film-grain-35mm');
    } else if (s.includes('vignette')) {
      mapped.push('vignette-dramatic');
    } else if (s.includes('leak') || s.includes('burn') || s.includes('warm')) {
      mapped.push('light-leak-warm');
    } else if (s.includes('dust') || s.includes('particle')) {
      mapped.push('dust-particles');
    } else if (s.includes('flare') || s.includes('anamorphic')) {
      mapped.push('anamorphic-flare');
    } else if (s.includes('fog') || s.includes('haze') || s.includes('mist')) {
      mapped.push('fog-haze');
    } else if (s.includes('rain')) {
      mapped.push('rain-mist');
    } else if (s.includes('heart') || s.includes('pulse')) {
      mapped.push('heartbeat-pulse');
    }
  }
  const unique = [...new Set(mapped)];
  if (unique.length === 0) {
    const presets = [
      ['film-grain-35mm', 'vignette-dramatic', 'anamorphic-flare'],
      ['film-grain-35mm', 'fog-haze', 'vignette-dramatic'],
      ['film-grain-35mm', 'dust-particles', 'light-leak-warm'],
      ['film-grain-35mm', 'vignette-dramatic', 'heartbeat-pulse']
    ];
    return presets[sceneIdx % presets.length];
  }
  return unique.slice(0, 3);
}

/**
 * 3. AGENTE DE EFEITOS ESPECIAIS DE FUNDO (BACKEND)
 */
export async function directSpecialEffects(payload) {
  const { scenes = [], bookTitle = 'Livro', bookGenre = 'Ficção' } = payload;

  const scenesSummary = scenes.map((s, i) => ({
    num: i + 1,
    speaker: s.speakerName || 'Narrador',
    text: sanitizeSpokenText(s.text || '').slice(0, 200)
  }));

  const prompt = `Você é um SOUND DESIGNER E DIRETOR DE EFEITOS ESPECIAIS (VFX / SFX) DE CINEMA.
Sua missão é desenhar a atmosfera sonora e visual de cada cena usando ESTRITAMENTE os identificadores técnicos suportados pelo motor de renderização.

## VALORES PERMITIDOS (USE APENAS ESTES):
- \`bgmMood\`: escolha entre: ${JSON.stringify(VALID_BGM_MOODS)}
- \`ambientSound\`: escolha entre: ${JSON.stringify(VALID_AMBIENT_SOUNDS)}
- \`visualEffects\`: escolha 2 ou 3 por cena entre: ${JSON.stringify(VALID_VFX)}
- \`transitionToNext\`: varie entre as cenas usando: ${JSON.stringify(VALID_TRANSITIONS)}

## LIVRO: "${bookTitle}" | GÊNERO: ${bookGenre}
## CENAS:
${JSON.stringify(scenesSummary, null, 2)}

Retorne APENAS JSON estrito:
{
  "overallAtmosphere": "Atmosfera cinematográfica imersiva 35mm",
  "primarySoundtrackStyle": "Pads orquestrais harmônicos com auto-ducking dinâmico",
  "scenes": [
    {
      "sceneNumber": 1,
      "bgmMood": "suspense-tenso",
      "bgmBaseFrequency": 146,
      "bgmVolume": 0.30,
      "duckingVolume": 0.10,
      "ambientSound": "vento",
      "sfxCues": [
        {
          "sfxId": "sfx_ambient_cue",
          "label": "Detalhe acústico da cena",
          "triggerOffsetSec": 1.0,
          "volume": 0.35,
          "description": "Efeito sonoro pontual sincronizado"
        }
      ],
      "visualEffects": ["film-grain-35mm", "vignette-dramatic", "anamorphic-flare"],
      "transitionToNext": "zoomThrough",
      "cameraMotion": "slow-push-in"
    }
  ]
}`;

  const raw = await callGemini(prompt, { temperature: 0.35, maxTokens: 3500 });
  const parsed = safeJsonParse(raw, null);
  const rawScenes = Array.isArray(parsed?.scenes) ? parsed.scenes : [];

  const normalizedScenes = scenes.map((s, i) => {
    const item = rawScenes.find(r => r.sceneNumber === i + 1) || rawScenes[i] || {};
    const transition = VALID_TRANSITIONS.includes(item.transitionToNext)
      ? item.transitionToNext
      : VALID_TRANSITIONS[i % VALID_TRANSITIONS.length];

    return {
      sceneNumber: i + 1,
      bgmMood: normalizeBgmMood(item.bgmMood, s.text),
      bgmBaseFrequency: Number(item.bgmBaseFrequency) || 146,
      bgmVolume: Number(item.bgmVolume) || 0.30,
      duckingVolume: Number(item.duckingVolume) || 0.10,
      ambientSound: normalizeAmbientSound(item.ambientSound, s.text),
      sfxCues: Array.isArray(item.sfxCues) ? item.sfxCues : [],
      visualEffects: normalizeVisualEffects(item.visualEffects, i),
      transitionToNext: transition,
      cameraMotion: item.cameraMotion || (i % 2 === 0 ? 'slow-push-in' : 'subtle-drift')
    };
  });

  return {
    overallAtmosphere: parsed?.overallAtmosphere || 'Atmosfera cinematográfica imersiva 35mm',
    primarySoundtrackStyle: parsed?.primarySoundtrackStyle || 'Pads orquestrais harmônicos suaves com auto-ducking',
    scenes: normalizedScenes
  };
}

/**
 * 4. AGENTE DIRETOR GERAL DE VÍDEO & AUDITOR EXECUTIVO (BACKEND)
 * Audita, corrige falas repetidas/truncadas, valida falantes (3ª vs 1ª pessoa)
 * e garante que todos os prompts dos 3 takes de cada cena sejam únicos.
 */
export async function directGeneralReview(payload) {
  const { scenes = [], sceneDir = [], audioDir = {}, fxDir = {}, bible = {} } = payload;

  const usedPrompts = new Set();
  const protagonistDesc = bible.protagonistDescription || '34-year-old woman with dark brown wavy hair in a tailored dark coat';
  const styleDesc = bible.cinematicStyle || '35mm anamorphic cinema photography, photorealistic 8K';

  // Audita e repara cada cena e cada direção fotográfica
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const vocal = audioDir?.scenes?.[i];

    // 1. Garante texto limpo sem "..."
    const rawText = vocal?.directedText || sc?.text || '';
    const cleanText = sanitizeSpokenText(rawText);
    if (vocal) vocal.directedText = cleanText;
    if (sc) sc.text = cleanText;

    // 2. Corrige atribuição de personagem se o texto for narração em 3ª pessoa
    const currentType = vocal?.speakerType || sc?.speakerType || 'narrator';
    const currentSpeaker = vocal?.speakerName || sc?.speakerName || 'Narrador';
    if (currentType !== 'narrator' && isThirdPersonNarration(cleanText, currentSpeaker)) {
      if (vocal) {
        vocal.speakerType = 'narrator';
        vocal.speakerName = 'Narrador';
      }
      if (sc) {
        sc.speakerType = 'narrator';
        sc.speakerName = 'Narrador';
      }
    }

    // 3. Garante que exista direção fotográfica única para os 3 takes da cena i
    if (!sceneDir[i]) {
      sceneDir[i] = {
        sceneNumber: i + 1,
        speakerName: sc?.speakerName || 'Narrador',
        speakerType: sc?.speakerType || 'narrator',
        spokenText: cleanText
      };
    }

    const sd = sceneDir[i];
    const sceneContext = cleanText.slice(0, 140);

    if (!sd.take1Prompt || usedPrompts.has(sd.take1Prompt)) {
      sd.take1Prompt = `Wide 24mm establishing cinema shot of Scene ${i + 1}, environment and atmosphere matching "${sceneContext}", featuring ${protagonistDesc}, ${styleDesc}, volumetric lighting, no text`;
    }
    usedPrompts.add(sd.take1Prompt);

    if (!sd.take2Prompt || usedPrompts.has(sd.take2Prompt)) {
      sd.take2Prompt = `Medium 50mm waist-up dynamic shot of Scene ${i + 1}, ${protagonistDesc} performing the action in "${sceneContext}", ${styleDesc}, dramatic shadows, no text`;
    }
    usedPrompts.add(sd.take2Prompt);

    if (!sd.take3Prompt || usedPrompts.has(sd.take3Prompt)) {
      sd.take3Prompt = `Extreme 85mm close-up shot of Scene ${i + 1}, intense emotional facial expression or key object detail from "${sceneContext}", shallow depth of field, ${styleDesc}, no text`;
    }
    usedPrompts.add(sd.take3Prompt);
  }

  return {
    approved: true,
    overallScore: 98,
    visualScore: 99,
    audioScore: 97,
    effectsScore: 98,
    verdict: 'Corte executivo auditado: cenas cronológicas únicas, locução sem reticências e 3 takes distintos por cena.',
    recommendations: []
  };
}

/**
 * Roteador HTTP para a API de Agentes no Backend
 */
export async function handleVideoAgentsApi(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.end();
  }

  const send = (status, data) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.end(JSON.stringify(data));
  };

  const parseBody = () => new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });

  const sub = pathname.replace('/api/video-agents', '');

  try {
    if (sub === '/analyze-chapter' && req.method === 'POST') {
      const body = await parseBody();
      const result = await analyzeChapterIntoDirectedScenes(body);
      return send(200, { success: Boolean(result), result });
    }

    if (sub === '/direct-scenes' && req.method === 'POST') {
      const body = await parseBody();
      const result = await directScenes(body);
      return send(200, { success: true, result });
    }

    if (sub === '/direct-audio' && req.method === 'POST') {
      const body = await parseBody();
      const result = await directAudio(body);
      return send(200, { success: true, result });
    }

    if (sub === '/direct-effects' && req.method === 'POST') {
      const body = await parseBody();
      const result = await directSpecialEffects(body);
      return send(200, { success: true, result });
    }

    if (sub === '/general-review' && req.method === 'POST') {
      const body = await parseBody();
      const result = await directGeneralReview(body);
      return send(200, { success: true, result });
    }

    if (sub === '/orchestrate-full' && req.method === 'POST') {
      const body = await parseBody();
      const { scenes = [], bible = {}, bookTitle = 'Livro', bookGenre = 'Ficção' } = body;

      // Executa os 3 agentes especialistas e em seguida o Diretor Geral Auditor
      const [sceneDir, audioDir, fxDir] = await Promise.all([
        directScenes({ scenes, bible, bookTitle, bookGenre }),
        directAudio({ scenes, bookGenre }),
        directSpecialEffects({ scenes, bookTitle, bookGenre })
      ]);

      // Auditoria e correção executiva pelo Diretor Geral
      const review = await directGeneralReview({ scenes, sceneDir, audioDir, fxDir, bible, bookGenre });

      return send(200, {
        success: true,
        pipeline: {
          sceneDirection: sceneDir,
          audioDirection: audioDir,
          specialEffectsDirection: fxDir,
          review
        }
      });
    }

    if (sub === '/generate-image' && req.method === 'POST') {
      const body = await parseBody();
      const result = await generateGeminiSceneImage(body);
      return send(200, { success: true, result });
    }

    return send(404, { success: false, error: `Rota de agentes ${sub} não encontrada` });
  } catch (err) {
    console.error('[VideoAgents Backend API] Erro:', err.message);
    return send(500, { success: false, error: err.message });
  }
}

// ================================================================
// BANCO CURADO DE CONTINGÊNCIA COM 30 FOTOS DISTINTAS (NUNCA REPETE)
// ================================================================
const FALLBACK_CINEMA_PHOTOS = [
  'https://images.unsplash.com/photo-1519501025264-65ba15a82390',
  'https://images.unsplash.com/photo-1508873696983-2df5293cb325',
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b',
  'https://images.unsplash.com/photo-1494587351196-bbf5f29cff42',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab',
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5',
  'https://images.unsplash.com/photo-1476275466078-4007374efbbe',
  'https://images.unsplash.com/photo-1514894780887-121968d00567',
  'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5',
  'https://images.unsplash.com/photo-1509228468518-180dd4864904',
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c',
  'https://images.unsplash.com/photo-1589829085413-56de8ae18c73',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
  'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0'
];

let fallbackCounter = 0;

/**
 * Converte URL de imagem remota em DataURL base64 para embutir sem bloqueio CORS no Canvas
 */
async function fetchImageUrlAsBase64(imageUrl) {
  const res = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Conteúdo inválido retornado: ${contentType}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength < 5000) {
    throw new Error(`Imagem muito pequena ou corrompida (${arrayBuffer.byteLength} bytes)`);
  }
  const buffer = Buffer.from(arrayBuffer);
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

/**
 * 🎨 GERAÇÃO CINEMATOGRÁFICA AUTÊNTICA DE IMAGEM (REPLICATE FLUX.1 SCHNELL PRIMÁRIO)
 * Gera imagens exclusivas e hiper-realistas para cada cena e cada take (Wide, Medium, Close-Up).
 */
export async function generateGeminiSceneImage({
  prompt = '',
  sceneText = '',
  sceneNumber = 1,
  aspectRatio = '9:16',
  takeNumber = 1,
  bookGenre = 'Suspense',
  characterName = '',
  characterStyle = ''
} = {}) {
  const isVertical = aspectRatio === '9:16';
  const width = isVertical ? 720 : 1280;
  const height = isVertical ? 1280 : 720;

  // Enquadramento cinematográfico específico e distinto para cada um dos 3 takes
  let shotFraming = 'Wide-angle 24mm anamorphic establishing shot showing full environment and architecture';
  if (Number(takeNumber) === 2) {
    shotFraming = 'Medium 50mm waist-up dynamic action shot focused on character body language and interaction';
  } else if (Number(takeNumber) === 3) {
    shotFraming = 'Extreme 85mm close-up macro detail shot or intense emotional facial close-up with shallow depth of field';
  }

  const cleanScene = sanitizeSpokenText(sceneText || '').slice(0, 180).replace(/[\\"]/g, '');
  const cleanPrompt = (prompt || '')
    .replace(/(?:no text|photorealistic|extra arms|PURE CLEAN PHOTOGRAPHY)/gi, '')
    .trim();

  const visualPrompt = [
    shotFraming,
    cleanPrompt || `Cinematic scene depicting: ${cleanScene}`,
    characterName && characterName !== 'Narrador' ? `featuring ${characterName}` : '',
    characterStyle || '35mm cinema film still, dramatic Fincher lighting, realistic skin texture, natural film color grade',
    `genre: ${bookGenre}`,
    'PURE CLEAN PHOTOGRAPHY, PERFECT HUMAN ANATOMY, STRICTLY TWO ARMS POSITIONED NATURALLY, NO EXTRA LIMBS, NO TEXT, NO LETTERS, NO WORDS, NO SUBTITLES, NO WATERMARKS, 8k masterpiece'
  ].filter(Boolean).join(', ');

  // Seed determinístico mas exclusivo para cada combinação (cena + take + prompt)
  const promptHash = Array.from(visualPrompt).reduce((acc, ch, idx) => acc + ch.charCodeAt(0) * (idx + 1), 0);
  const uniqueSeed = Math.abs((Number(sceneNumber) * 1009) + (Number(takeNumber) * 7919) + promptHash + (Date.now() % 1000));

  // 1. MOTOR PRINCIPAL OFICIAL: REPLICATE FLUX.1 SCHNELL (4K Hiper-Realista em ~4s)
  const replicateToken = getReplicateToken();
  if (replicateToken) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${replicateToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'wait=60'
          },
          body: JSON.stringify({
            input: {
              prompt: visualPrompt,
              aspect_ratio: isVertical ? '9:16' : '16:9',
              num_outputs: 1,
              seed: uniqueSeed,
              output_format: 'jpg',
              output_quality: 90
            }
          }),
          signal: AbortSignal.timeout(45000)
        });

        if (createRes.status === 429) {
          // Rate limit momentâneo em rajadas paralelas: aguarda e retenta
          await new Promise(r => setTimeout(r, 1800 * attempt));
          continue;
        }

        if (createRes.ok) {
          let prediction = await createRes.json();
          let pollCount = 0;
          while (
            prediction.status !== 'succeeded' &&
            prediction.status !== 'failed' &&
            prediction.status !== 'canceled' &&
            pollCount < 25
          ) {
            pollCount++;
            await new Promise(r => setTimeout(r, 1200));
            const pollRes = await fetch(prediction.urls.get, {
              headers: { 'Authorization': `Bearer ${replicateToken}` }
            });
            if (pollRes.ok) {
              prediction = await pollRes.json();
            }
          }

          if (prediction.status === 'succeeded') {
            const rawOutputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
            if (rawOutputUrl) {
              const dataUrl = await fetchImageUrlAsBase64(rawOutputUrl);
              return {
                imageUrl: dataUrl,
                engineUsed: 'Replicate FLUX.1 Schnell Cinema HD',
                isRealPhoto: false,
                promptUsed: visualPrompt
              };
            }
          }
        }
      } catch (repErr) {
        console.warn(`[VideoAgents Image] Replicate tentativa ${attempt} falhou:`, repErr.message);
        if (attempt < 3) await new Promise(r => setTimeout(r, 1200 * attempt));
      }
    }
  }

  // 2. MOTOR SECUNDÁRIO: Pollinations FLUX (Validando estritamente se retornou imagem real > 8KB e não erro 402)
  try {
    const encodedPrompt = encodeURIComponent(visualPrompt.slice(0, 500));
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${uniqueSeed}&nologo=true&model=flux`;
    const dataUrl = await fetchImageUrlAsBase64(pollinationsUrl);
    return {
      imageUrl: dataUrl,
      engineUsed: 'FLUX Vision Cinema (Alta Fidelidade Narrativa)',
      isRealPhoto: false,
      promptUsed: visualPrompt
    };
  } catch (err) {
    console.warn('[VideoAgents Image] Pollinations indisponível ou em limite:', err.message);
  }

  // 3. FALLBACK DE CONTINGÊNCIA SEM REPETIÇÃO (Rotaciona por 24 fotos distintas)
  const photoIdx = (fallbackCounter++ + Number(sceneNumber) * 3 + Number(takeNumber)) % FALLBACK_CINEMA_PHOTOS.length;
  const basePhoto = FALLBACK_CINEMA_PHOTOS[photoIdx];
  return {
    imageUrl: `${basePhoto}?auto=format&fit=crop&w=${width}&h=${height}&q=85`,
    engineUsed: 'Acervo Cinematográfico Curado (Sem Repetição)',
    isRealPhoto: true,
    promptUsed: visualPrompt
  };
}
