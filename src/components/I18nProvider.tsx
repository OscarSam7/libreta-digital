'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  AppLocale,
  LOCALE_CHANNEL_NAME,
  getCurrentLocale,
  getDateLocale,
  setAppLocale,
} from '@/lib/i18n';
import { translateEsToPt } from '@/lib/i18n/translator';
import { LanguageSwitchPill } from '@/components/LanguageSelector';

export interface I18nContextValue {
  locale: AppLocale;
  setLocale: (next: AppLocale) => void;
  toggleLocale: () => void;
  isPt: boolean;
  dateLocale: string;
  t: (esText: string, ptText?: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'es',
  setLocale: () => {},
  toggleLocale: () => {},
  isPt: false,
  dateLocale: 'es-PY',
  t: (esText) => esText,
});

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label'] as const;
const EXCLUDED_SELECTOR = '[data-no-translate="true"], script, style, noscript, textarea, code, pre, svg, [contenteditable="true"]';
const OBSERVER_CONFIG: MutationObserverInit = {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ['placeholder', 'title', 'aria-label'],
};

function isExcludedElement(el: Element | null): boolean {
  if (!el) return true;
  if (el.closest(EXCLUDED_SELECTOR)) return true;
  return false;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const [locale, setLocaleState] = useState<AppLocale>('es');

  const textOriginalsRef = useRef<WeakMap<Text, { es: string; lastPt: string }>>(new WeakMap());
  const attrOriginalsRef = useRef<WeakMap<Element, Map<string, { es: string; lastPt: string }>>>(
    new WeakMap()
  );

  // Hidratar preferencia de idioma solo después de montar para evitar mismatch SSR/CSR
  useEffect(() => {
    const initial = getCurrentLocale();
    document.documentElement.lang = initial === 'pt' ? 'pt-BR' : 'es';
    if (initial === 'pt') {
      document.title = 'LibretaDigital Pro | PDV FinTech & Fiado em Tempo Real';
      setLocaleState('pt');
    }

    const handleLocaleEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail === 'pt' || detail === 'es') {
        setLocaleState(detail);
      }
    };

    window.addEventListener('libreta_locale_changed', handleLocaleEvent);

    let bc: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel(LOCALE_CHANNEL_NAME);
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'LOCALE_CHANGED' && (ev.data.locale === 'pt' || ev.data.locale === 'es')) {
            setAppLocaleStateFromRemote(ev.data.locale);
          }
        };
      }
    } catch {}

    function setAppLocaleStateFromRemote(remoteLocale: AppLocale) {
      try {
        document.documentElement.lang = remoteLocale === 'pt' ? 'pt-BR' : 'es';
        document.title =
          remoteLocale === 'pt'
            ? 'LibretaDigital Pro | PDV FinTech & Fiado em Tempo Real'
            : 'LibretaDigital Pro | FinTech POS & Fiado en Tiempo Real';
      } catch {}
      setLocaleState(remoteLocale);
    }

    return () => {
      window.removeEventListener('libreta_locale_changed', handleLocaleEvent);
      if (bc) bc.close();
    };
  }, []);

  // Bridge DOM reversible para traducción instantánea en vivo sin alterar la estructura React
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) return;

    const textOriginals = textOriginalsRef.current;
    const attrOriginals = attrOriginalsRef.current;

    const translateTextNode = (node: Text) => {
      const parent = node.parentElement;
      if (!parent || isExcludedElement(parent)) return;

      const current = node.nodeValue ?? '';
      if (!current.trim()) return;

      const tracked = textOriginals.get(node);
      if (tracked && current === tracked.lastPt) return;

      const translated = translateEsToPt(current);
      if (translated !== current) {
        textOriginals.set(node, { es: current, lastPt: translated });
        node.nodeValue = translated;
      } else if (tracked) {
        textOriginals.delete(node);
      }
    };

    const restoreTextNode = (node: Text) => {
      const tracked = textOriginals.get(node);
      if (!tracked) return;
      if (node.nodeValue === tracked.lastPt) {
        node.nodeValue = tracked.es;
      }
      textOriginals.delete(node);
    };

    const translateElementAttrs = (el: Element) => {
      if (isExcludedElement(el)) return;
      let elMap = attrOriginals.get(el);

      for (const attr of TRANSLATABLE_ATTRS) {
        const current = el.getAttribute(attr);
        if (!current || !current.trim()) continue;

        const tracked = elMap?.get(attr);
        if (tracked && current === tracked.lastPt) continue;

        const translated = translateEsToPt(current);
        if (translated !== current) {
          if (!elMap) {
            elMap = new Map();
            attrOriginals.set(el, elMap);
          }
          elMap.set(attr, { es: current, lastPt: translated });
          el.setAttribute(attr, translated);
        } else if (elMap && tracked) {
          elMap.delete(attr);
        }
      }
    };

    const restoreElementAttrs = (el: Element) => {
      const elMap = attrOriginals.get(el);
      if (!elMap) return;
      for (const [attr, tracked] of elMap.entries()) {
        if (el.getAttribute(attr) === tracked.lastPt) {
          el.setAttribute(attr, tracked.es);
        }
      }
      attrOriginals.delete(el);
    };

    const walkAndApply = (rootNode: Node, mode: 'TRANSLATE' | 'RESTORE') => {
      if (rootNode.nodeType === Node.TEXT_NODE) {
        if (mode === 'TRANSLATE') translateTextNode(rootNode as Text);
        else restoreTextNode(rootNode as Text);
        return;
      }

      if (rootNode.nodeType !== Node.ELEMENT_NODE) return;
      const rootEl = rootNode as Element;
      if (isExcludedElement(rootEl)) return;

      if (mode === 'TRANSLATE') translateElementAttrs(rootEl);
      else restoreElementAttrs(rootEl);

      const textWalker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
      let textCurr = textWalker.nextNode();
      while (textCurr) {
        if (mode === 'TRANSLATE') translateTextNode(textCurr as Text);
        else restoreTextNode(textCurr as Text);
        textCurr = textWalker.nextNode();
      }

      const elWalker = document.createTreeWalker(rootEl, NodeFilter.SHOW_ELEMENT);
      let elCurr = elWalker.nextNode();
      while (elCurr) {
        const el = elCurr as Element;
        if (!isExcludedElement(el)) {
          if (mode === 'TRANSLATE') translateElementAttrs(el);
          else restoreElementAttrs(el);
        }
        elCurr = elWalker.nextNode();
      }
    };

    if (locale === 'es') {
      walkAndApply(document.body, 'RESTORE');
      return;
    }

    // Modo Portugués ('pt'): traducir DOM actual y observar actualizaciones en vivo
    walkAndApply(document.body, 'TRANSLATE');

    let isApplying = false;
    const observer = new MutationObserver((mutations) => {
      if (isApplying) return;
      isApplying = true;
      try {
        for (const m of mutations) {
          if (m.type === 'characterData') {
            translateTextNode(m.target as Text);
          } else if (m.type === 'attributes') {
            if (m.target.nodeType === Node.ELEMENT_NODE) {
              translateElementAttrs(m.target as Element);
            }
          } else if (m.type === 'childList') {
            m.addedNodes.forEach((added) => walkAndApply(added, 'TRANSLATE'));
          }
        }
        // Limpiar mutaciones autogeneradas por el bridge para evitar bucles
        observer.takeRecords();
      } finally {
        isApplying = false;
      }
    });

    observer.observe(document.body, OBSERVER_CONFIG);

    return () => {
      observer.disconnect();
    };
  }, [locale]);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    setAppLocale(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next: AppLocale = prev === 'pt' ? 'es' : 'pt';
      setAppLocale(next);
      return next;
    });
  }, []);

  const t = useCallback(
    (esText: string, ptText?: string) => {
      if (locale !== 'pt') return esText;
      return ptText !== undefined ? ptText : translateEsToPt(esText);
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      isPt: locale === 'pt',
      dateLocale: getDateLocale(locale),
      t,
    }),
    [locale, setLocale, toggleLocale, t]
  );

  const showFloatingSelector = pathname !== '/' && !pathname.startsWith('/portal');

  return (
    <I18nContext.Provider value={value}>
      {children}
      {showFloatingSelector && (
        <LanguageSwitchPill locale={locale} onChange={setLocale} variant="floating" />
      )}
    </I18nContext.Provider>
  );
}
