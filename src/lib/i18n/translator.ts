import { AppLocale, getCurrentLocale } from './index';
import { ES_TO_PT_EXACT, ES_TO_PT_PATTERNS } from './ptBR';

const WHITESPACE_WRAPPER_REGEX = /^(\s*)([\s\S]*?)(\s*)$/;

function lookupExactWithVariantSuffix(text: string): string | null {
  if (Object.prototype.hasOwnProperty.call(ES_TO_PT_EXACT, text)) {
    return ES_TO_PT_EXACT[text];
  }

  // Variantes simples de puntuación final (':', ' *', ' →', '...')
  const suffixPatterns: Array<[RegExp, string]> = [
    [/^(.*?)(\s*\*\s*)$/, ' *'],
    [/^(.*?)(\s*:\s*)$/, ':'],
    [/^(.*?)(\s*→\s*)$/, ' →'],
    [/^(.*?)(\.\.\.)$/, '...'],
  ];

  for (const [regex, ptSuffix] of suffixPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const base = match[1].trim();
      if (Object.prototype.hasOwnProperty.call(ES_TO_PT_EXACT, base)) {
        return `${ES_TO_PT_EXACT[base].replace(/[\s*:→.]+$/, '')}${ptSuffix}`;
      }
    }
  }

  return null;
}

function matchPatterns(text: string): string | null {
  for (const [regex, replacement] of ES_TO_PT_PATTERNS) {
    if (regex.test(text)) {
      if (typeof replacement === 'function') {
        return text.replace(regex, replacement as (...args: any[]) => string);
      }
      return text.replace(regex, replacement);
    }
  }
  return null;
}

function translateSingleCore(core: string): string {
  const normalized = core.replace(/\s+/g, ' ').trim();
  if (!normalized || !/[A-Za-zÁÉÍÓÚáéíóúñÑüÜ¿¡]/.test(normalized)) {
    return core;
  }

  const exact = lookupExactWithVariantSuffix(normalized);
  if (exact !== null) {
    return exact;
  }

  const patternHit = matchPatterns(normalized);
  if (patternHit !== null) {
    return patternHit;
  }

  return core;
}

/**
 * Traduce de forma segura una cadena UI de Español a Portugués (Brasil),
 * preservando espacios iniciales/finales y dejando intactos nombres propios o datos de usuario.
 */
export function translateEsToPt(raw: string): string {
  if (!raw || typeof raw !== 'string') return raw;

  const wrapperMatch = raw.match(WHITESPACE_WRAPPER_REGEX);
  const leading = wrapperMatch ? wrapperMatch[1] : '';
  const core = wrapperMatch ? wrapperMatch[2] : raw;
  const trailing = wrapperMatch ? wrapperMatch[3] : '';

  const normalized = core.replace(/\s+/g, ' ').trim();
  if (!normalized || !/[A-Za-zÁÉÍÓÚáéíóúñÑüÜ¿¡]/.test(normalized)) {
    return raw;
  }

  // 1. Intento directo exacto o por patrón sobre la cadena completa
  const direct = translateSingleCore(core);
  if (direct !== core) {
    return `${leading}${direct}${trailing}`;
  }

  // 2. Separación segura por delimitadores de encabezado (' • ' o ' | ') sin tocar nombres de usuario
  for (const sep of [' • ', ' | ']) {
    if (normalized.includes(sep)) {
      const parts = normalized.split(sep);
      let anyChanged = false;
      const translatedParts = parts.map((part) => {
        const res = translateSingleCore(part);
        if (res !== part) anyChanged = true;
        return res;
      });
      if (anyChanged) {
        return `${leading}${translatedParts.join(sep)}${trailing}`;
      }
    }
  }

  return raw;
}

/**
 * Traduce un texto según el idioma activo (o el idioma provisto).
 */
export function translateText(raw: string, locale?: AppLocale): string {
  const active = locale ?? getCurrentLocale();
  if (active !== 'pt') return raw;
  return translateEsToPt(raw);
}
