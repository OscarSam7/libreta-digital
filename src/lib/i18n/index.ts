export type AppLocale = 'es' | 'pt';

export const LOCALE_STORAGE_KEY = 'libretadigital_locale_v1';
export const LOCALE_COOKIE_KEY = 'libreta_locale';
export const LOCALE_CHANNEL_NAME = 'libretadigital_locale_channel';

const TENANT_STORAGE_KEY = 'libretadigital_tenant_v2';

/**
 * Obtiene el idioma activo de la aplicación ('es' | 'pt').
 * En SSR siempre devuelve 'es' para garantizar hidratación determinista.
 */
export function getCurrentLocale(): AppLocale {
  if (typeof window === 'undefined') return 'es';

  try {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang')?.toLowerCase().trim();
    if (urlLang === 'pt' || urlLang === 'pt-br') {
      localStorage.setItem(LOCALE_STORAGE_KEY, 'pt');
      return 'pt';
    }
    if (urlLang === 'es') {
      localStorage.setItem(LOCALE_STORAGE_KEY, 'es');
      return 'es';
    }
  } catch {}

  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === 'pt' || saved === 'es') {
      return saved;
    }
  } catch {}

  try {
    const rawTenant = localStorage.getItem(TENANT_STORAGE_KEY);
    if (rawTenant) {
      const parsed = JSON.parse(rawTenant);
      if (parsed?.currency_code === 'BRL') {
        return 'pt';
      }
    }
  } catch {}

  try {
    const navLang = (
      navigator.language ||
      (Array.isArray(navigator.languages) ? navigator.languages[0] : '') ||
      ''
    ).toLowerCase();
    if (navLang.startsWith('pt')) {
      return 'pt';
    }
  } catch {}

  return 'es';
}

/**
 * Cambia y persiste el idioma activo en localStorage, cookie, <html lang>,
 * título del documento, evento de ventana y BroadcastChannel entre pestañas.
 */
export function setAppLocale(locale: AppLocale): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {}

  try {
    document.cookie = `${LOCALE_COOKIE_KEY}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}

  try {
    document.documentElement.lang = locale === 'pt' ? 'pt-BR' : 'es';
    document.title =
      locale === 'pt'
        ? 'LibretaDigital Pro | PDV FinTech & Fiado em Tempo Real'
        : 'LibretaDigital Pro | FinTech POS & Fiado en Tiempo Real';
  } catch {}

  try {
    window.dispatchEvent(new CustomEvent('libreta_locale_changed', { detail: locale }));
  } catch {}

  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(LOCALE_CHANNEL_NAME);
      bc.postMessage({ type: 'LOCALE_CHANGED', locale });
      bc.close();
    }
  } catch {}
}

export function getDateLocale(locale?: AppLocale): string {
  const active = locale ?? getCurrentLocale();
  return active === 'pt' ? 'pt-BR' : 'es-PY';
}

export function tLocale(esText: string, ptText: string, locale?: AppLocale): string {
  const active = locale ?? getCurrentLocale();
  return active === 'pt' ? ptText : esText;
}

export function appendLocaleQuery(url: string, locale?: AppLocale): string {
  const active = locale ?? getCurrentLocale();
  if (active !== 'pt') return url;
  if (!url || /[?&]lang=/i.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}lang=pt`;
}
