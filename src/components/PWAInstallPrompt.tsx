'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Registrar el Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Service Worker registrado con éxito:', reg.scope))
        .catch((err) => console.error('Error registrando Service Worker:', err));
    }

    // Capturar evento de instalación PWA nativa
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 bg-slate-950 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-800 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 p-1 flex items-center justify-center shrink-0 shadow-md">
          <BrandLogo size="icon-only" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-xs text-white leading-tight">Instalar LibretaDigital PRO</h4>
          <p className="text-[11px] text-slate-400 truncate">Acceso rápido desde tu pantalla de inicio</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition"
        >
          Instalar
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="p-1.5 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
