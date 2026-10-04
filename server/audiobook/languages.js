// ================================================================
// AUDIOBOOK STUDIO — CATÁLOGO DE IDIOMAS E VOZES (BACKEND)
// Toda decisão técnica de voz fica aqui; o frontend só envia
// { projectId, language, voiceGender }.
// ================================================================

/**
 * @typedef {'male'|'female'} VoiceGender
 * @typedef {{
 *   id: string,
 *   label: string,
 *   aliases: string[],
 *   neural: { male: string, female: string },
 *   basic: string,
 *   kokoro: { male?: string, female?: string },
 *   xtts: string,
 *   words: { chapter: string, by: string, preface: string, intro: string }
 * }} LanguageProfile
 */

/** @type {LanguageProfile[]} */
export const LANGUAGES = [
  {
    id: 'pt-BR',
    label: 'Português (Brasil)',
    aliases: ['pt', 'pt-br', 'ptbr', 'portugues', 'português', 'portuguese'],
    neural: { male: 'pt-BR-AntonioNeural', female: 'pt-BR-FranciscaNeural' },
    basic: 'pt-BR',
    kokoro: { male: 'pm_alex', female: 'pf_dora' },
    xtts: 'pt',
    words: { chapter: 'Capítulo', by: 'por', preface: 'Prefácio', intro: 'Introdução' }
  },
  {
    id: 'en-US',
    label: 'Inglês',
    aliases: ['en', 'en-us', 'enus', 'ingles', 'inglês', 'english'],
    neural: { male: 'en-US-GuyNeural', female: 'en-US-JennyNeural' },
    basic: 'en',
    kokoro: { male: 'am_adam', female: 'af_heart' },
    xtts: 'en',
    words: { chapter: 'Chapter', by: 'by', preface: 'Preface', intro: 'Introduction' }
  },
  {
    id: 'es-ES',
    label: 'Espanhol',
    aliases: ['es', 'es-es', 'es-mx', 'espanhol', 'español', 'espanol', 'spanish'],
    neural: { male: 'es-ES-AlvaroNeural', female: 'es-ES-ElviraNeural' },
    basic: 'es',
    kokoro: { male: 'em_alex', female: 'ef_dora' },
    xtts: 'es',
    words: { chapter: 'Capítulo', by: 'por', preface: 'Prólogo', intro: 'Introducción' }
  },
  {
    id: 'fr-FR',
    label: 'Francês',
    aliases: ['fr', 'fr-fr', 'frances', 'francês', 'français', 'francais', 'french'],
    neural: { male: 'fr-FR-HenriNeural', female: 'fr-FR-DeniseNeural' },
    basic: 'fr',
    kokoro: { female: 'ff_siwis' },
    xtts: 'fr',
    words: { chapter: 'Chapitre', by: 'par', preface: 'Préface', intro: 'Introduction' }
  },
  {
    id: 'de-DE',
    label: 'Alemão',
    aliases: ['de', 'de-de', 'alemao', 'alemão', 'deutsch', 'german'],
    neural: { male: 'de-DE-ConradNeural', female: 'de-DE-KatjaNeural' },
    basic: 'de',
    kokoro: {},
    xtts: 'de',
    words: { chapter: 'Kapitel', by: 'von', preface: 'Vorwort', intro: 'Einleitung' }
  },
  {
    id: 'it-IT',
    label: 'Italiano',
    aliases: ['it', 'it-it', 'italiano', 'italian'],
    neural: { male: 'it-IT-DiegoNeural', female: 'it-IT-ElsaNeural' },
    basic: 'it',
    kokoro: { male: 'im_nicola', female: 'if_sara' },
    xtts: 'it',
    words: { chapter: 'Capitolo', by: 'di', preface: 'Prefazione', intro: 'Introduzione' }
  }
];

export const DEFAULT_LANGUAGE_ID = 'pt-BR';

const norm = (v) =>
  String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, '-');

/** Retorna o perfil do idioma ou null se não for suportado. */
export function resolveLanguage(input) {
  const key = norm(input);
  if (!key) return null;
  for (const lang of LANGUAGES) {
    if (norm(lang.id) === key) return lang;
    if (lang.aliases.some((a) => norm(a) === key)) return lang;
  }
  return null;
}

/** Normaliza o gênero da voz. Aceita masculino/feminino/male/female. */
export function resolveGender(input) {
  const key = norm(input);
  if (['male', 'masculino', 'masculina', 'm', 'homem'].includes(key)) return 'male';
  if (['female', 'feminino', 'feminina', 'f', 'mulher'].includes(key)) return 'female';
  return null;
}

export const GENDER_LABEL = { male: 'Masculina', female: 'Feminina' };

/** Lista pública (sem nada técnico) para a interface. */
export function listPublicLanguages() {
  return LANGUAGES.map((l) => ({ id: l.id, label: l.label }));
}
