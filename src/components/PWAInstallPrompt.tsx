'use client';

import { useEffect, useState } from 'react';
import { Download, X, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Función de detección exhaustiva de instalación en el dispositivo
    const checkIsInstalled = (): boolean => {
      if (typeof window === 'undefined') return false;

      // 1. Marca en almacenamiento local persistente
      if (localStorage.getItem('libreta_pwa_installed') === 'true') {
        return true;
      }

      // 2. Ejecución en modo PWA nativo / Standalone (pantalla de inicio, cajón de apps o POS)
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      if (isStandalone) {
        localStorage.setItem('libreta_pwa_installed', 'true');
        return true;
      }

      return false;
    };

    // Si ya está instalado en el dispositivo, no hacer nada más
    if (checkIsInstalled()) {
      setIsInstalled(true);
      setShowPrompt(false);
      return;
    }

    // Registrar Service Worker en producción
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Service Worker registrado:', reg.scope))
        .catch((err) => console.warn('Aviso Service Worker:', err));
    }

    // Escuchar el evento nativo del sistema operativo cuando la app SE INSTALA
    const handleAppInstalled = () => {
      console.log('LibretaDigital PRO fue instalada en este dispositivo.');
      localStorage.setItem('libreta_pwa_installed', 'true');
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Escuchar cambios dinámicos de visualización a standalone
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        localStorage.setItem('libreta_pwa_installed', 'true');
        setIsInstalled(true);
        setShowPrompt(false);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    // Capturar evento antes de instalar (solo si NO está instalado)
    const handleBeforeInstall = (e: Event) => {
      // Si ya está instalado, cancelar completamente
      if (checkIsInstalled()) {
        e.preventDefault();
        return;
      }

      // Si el usuario lo cerró en las últimas 72 horas, no molestar
      const dismissedAt = localStorage.getItem('libreta_pwa_dismissed');
      if (dismissedAt) {
        const hoursPassed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
        if (hoursPassed < 72) {
          e.preventDefault();
          return;
        }
      }

      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      // Guardar de por vida que ya fue instalada para que jamás vuelva a salir
      localStorage.setItem('libreta_pwa_installed', 'true');
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('libreta_pwa_dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  // Si ya está instalada o el prompt no debe mostrarse, retornar null
  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 bg-slate-950/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-slate-800 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom duration-300 font-sans">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 p-1 flex items-center justify-center shrink-0 shadow-md">
          <BrandLogo size="icon-only" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-xs text-white leading-tight">Instalar LibretaDigital PRO</h4>
          <p className="text-[11px] text-slate-400 truncate">Acceso directo en pantalla de inicio</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstall}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/30 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar</span>
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
