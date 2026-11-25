'use client';

import React, { useEffect, useState } from 'react';
import { Globe2 } from 'lucide-react';
import {
  AppLocale,
  LOCALE_CHANNEL_NAME,
  getCurrentLocale,
  setAppLocale,
} from '@/lib/i18n';

export type LanguageSelectorVariant = 'dark' | 'light' | 'compact' | 'floating';

interface PillProps {
  locale: AppLocale;
  onChange: (next: AppLocale) => void;
  variant?: LanguageSelectorVariant;
  className?: string;
}

export function LanguageSwitchPill({
  locale,
  onChange,
  variant = 'dark',
  className = '',
}: PillProps) {
  const isLight = variant === 'light';
  const isCompact = variant === 'compact';
  const isFloating = variant === 'floating';

  const containerStyle = isFloating
    ? 'fixed bottom-3 left-3 z-40 print:hidden bg-slate-950/90 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md p-1 rounded-2xl'
    : isLight
    ? 'bg-slate-100 border border-slate-300/90 text-slate-700 p-0.5 rounded-xl shadow-xs'
    : 'bg-slate-900 border border-slate-700/80 text-slate-200 p-0.5 rounded-xl shadow-xs';

  const activeBtn = isLight
    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
    : 'bg-indigo-600 text-white shadow-xs';

  const inactiveBtn = isLight
    ? 'text-slate-500 hover:text-slate-900'
    : 'text-slate-400 hover:text-white';

  return (
    <div
      data-no-translate="true"
      role="group"
      aria-label="Idioma / Idioma (ES / PT)"
      className={`inline-flex items-center gap-1 select-none shrink-0 ${containerStyle} ${className}`}
    >
      {!isCompact && (
        <Globe2
          className={`w-3.5 h-3.5 ml-1.5 shrink-0 ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}
        />
      )}
      <button
        type="button"
        onClick={() => onChange('es')}
        aria-pressed={locale === 'es'}
        title="Español"
        className={`px-2 py-1 rounded-lg text-[11px] font-black tracking-wide transition cursor-pointer ${
          locale === 'es' ? activeBtn : inactiveBtn
        }`}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => onChange('pt')}
        aria-pressed={locale === 'pt'}
        title="Português (Brasil)"
        className={`px-2 py-1 rounded-lg text-[11px] font-black tracking-wide transition cursor-pointer ${
          locale === 'pt' ? activeBtn : inactiveBtn
        }`}
      >
        PT
      </button>
    </div>
  );
}

interface Props {
  variant?: LanguageSelectorVariant;
  className?: string;
}

/**
 * Selector compacto ES | PT sincronizado entre componentes y pestañas.
 */
export function LanguageSelector({ variant = 'dark', className = '' }: Props) {
  const [locale, setLocale] = useState<AppLocale>('es');

  useEffect(() => {
    setLocale(getCurrentLocale());

    const handleLocaleChange = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail === 'pt' || detail === 'es') {
        setLocale(detail);
      } else {
        setLocale(getCurrentLocale());
      }
    };

    window.addEventListener('libreta_locale_changed', handleLocaleChange);

    let bc: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel(LOCALE_CHANNEL_NAME);
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'LOCALE_CHANGED' && (ev.data.locale === 'pt' || ev.data.locale === 'es')) {
            setLocale(ev.data.locale);
          }
        };
      }
    } catch {}

    return () => {
      window.removeEventListener('libreta_locale_changed', handleLocaleChange);
      if (bc) bc.close();
    };
  }, []);

  const handleSelect = (next: AppLocale) => {
    if (next === locale) return;
    setLocale(next);
    setAppLocale(next);
  };

  return (
    <LanguageSwitchPill
      locale={locale}
      onChange={handleSelect}
      variant={variant}
      className={className}
    />
  );
}
