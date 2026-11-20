'use client';

import React, { useState, useEffect } from 'react';
import { MerchantDashboard } from '@/components/MerchantDashboard';
import { isMerchantLoggedIn, loginDemoDonMario } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import { BrandLogo } from '@/components/BrandLogo';
import Link from 'next/link';
import {
  Store,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  KeyRound,
  Lock,
  UserCheck,
  Sun,
  Moon,
  CheckCircle2,
  Users
} from 'lucide-react';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Cargar preferencia de tema (por defecto tema blanco)
    const savedTheme = localStorage.getItem('libreta_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    async function checkAuth() {
      // 1. Verificar sesión activa en Supabase
      try {
        const supabase = createClient();
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data && data.session) {
            setIsAuthenticated(true);
            return;
          }
        }
      } catch (e) {
        // Fallback local
      }

      // 2. Verificar estado de sesión local
      const localLoggedIn = isMerchantLoggedIn();
      setIsAuthenticated(localLoggedIn);
    }

    checkAuth();
    const handleAuthChange = () => {
      setIsAuthenticated(isMerchantLoggedIn());
    };
    window.addEventListener('libreta_auth_changed', handleAuthChange);
    return () => window.removeEventListener('libreta_auth_changed', handleAuthChange);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('libreta_theme', nextTheme);
  };

  const handleEnterDemo = () => {
    loginDemoDonMario();
    setIsAuthenticated(true);
  };

  if (isAuthenticated === null) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-white'}`}>
        <div className="animate-pulse flex flex-col items-center gap-3">
          <BrandLogo size="lg" theme={theme} />
          <p className="text-xs text-slate-400">Verificando credenciales de acceso seguro...</p>
        </div>
      </div>
    );
  }

  // SI NO ESTÁ AUTENTICADO: BLOQUEO SEGURO Y PANTALLA DE ACCESO CON TEMA BLANCO / OSCURO
  if (!isAuthenticated) {
    const isLight = theme === 'light';

    return (
      <div
        className={`min-h-screen flex flex-col justify-between selection:bg-blue-600 selection:text-white transition-colors duration-200 ${
          isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
        }`}
      >
        {/* HEADER DE BIENVENIDA */}
        <header
          className={`border-b px-4 py-3 sticky top-0 z-20 backdrop-blur-md transition-colors ${
            isLight ? 'bg-white/90 border-slate-200 shadow-xs' : 'bg-slate-950/70 border-slate-800/80'
          }`}
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <BrandLogo size="md" theme={theme} showTagline={false} />
            <div className="flex items-center gap-2">
              {/* SELECTOR DE TEMA BLANCO / OSCURO */}
              <button
                onClick={toggleTheme}
                className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title="Cambiar entre Tema Blanco y Tema Oscuro"
              >
                {isLight ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">Tema Oscuro</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Tema Blanco</span>
                  </>
                )}
              </button>

              <Link
                href="/admin"
                className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1 ${
                  isLight
                    ? 'text-indigo-700 hover:bg-indigo-50 border-indigo-200 bg-white'
                    : 'text-slate-300 hover:text-indigo-300 border-slate-800 hover:bg-slate-900'
                }`}
                title="Acceso exclusivo para el Dueño del SaaS"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Super Admin</span>
              </Link>
              <Link
                href="/showcase"
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                  isLight
                    ? 'text-slate-700 hover:text-slate-900 border-slate-200 bg-white hover:bg-slate-50'
                    : 'text-slate-300 hover:text-white border-slate-800 hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden xs:inline">Showcase</span>
              </Link>
              <Link
                href="/registro-comercio"
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 rounded-xl transition shadow-md shadow-blue-600/30 flex items-center gap-1"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Ingresar</span>
              </Link>
            </div>
          </div>
        </header>

        {/* HERO ACCESO PROTEGIDO */}
        <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12 flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center shadow-xl transition ${
              isLight
                ? 'bg-blue-100 text-blue-600 border border-blue-200'
                : 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-blue-600/10'
            }`}
          >
            <Lock className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <div className="space-y-2">
            <span
              className={`text-xs font-black uppercase tracking-widest px-3.5 py-1 rounded-full border inline-block ${
                isLight
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-blue-950/80 text-blue-400 border-blue-800/60'
              }`}
            >
              Control de Acceso al Comercio
            </span>
            <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Libreta<span className="text-blue-600">Digital</span> PRO
            </h1>
            <p className={`text-xs sm:text-sm max-w-lg mx-auto ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Terminal POS & Fiado en Tiempo Real con verificación mediante PIN, QR y libro contable inmutable.
            </p>
          </div>

          {/* TARJETA DESTACADA: ACCESO DIRECTO A ALMACÉN DON MARIO (DEMO EJEMPLO) */}
          <div
            className={`w-full max-w-md p-5 rounded-3xl text-left space-y-3.5 shadow-xl border-2 transition ${
              isLight
                ? 'bg-white border-blue-300 shadow-blue-100'
                : 'bg-slate-900 border-blue-600/50 shadow-slate-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg font-black shadow-md shadow-blue-600/30">
                  🏪
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Almacén Don Mario
                    </h3>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 font-black text-[9px] rounded-full uppercase">
                      Cuenta Ejemplo
                    </span>
                  </div>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Comercio modelo pre-cargado con clientes, límites de crédito y ventas
                  </p>
                </div>
              </div>
            </div>

            {/* Credenciales y PINs para probar roles */}
            <div
              className={`rounded-2xl p-3 text-[11px] space-y-1.5 border ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800">
                <span className="font-bold flex items-center gap-1 text-slate-800 dark:text-slate-200">
                  <Users className="w-3.5 h-3.5 text-blue-500" /> Operadores Disponibles:
                </span>
                <span className="text-[10px] text-slate-400">Acceso instantáneo</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Dueño: <b>Don Mario Gómez</b></span>
                <span className="font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-bold">
                  PIN: 1234
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Cajero Mañana: <b>Juan Pérez</b></span>
                <span className="font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-bold">
                  PIN: 1111
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Cajera Tarde: <b>María Benítez</b></span>
                <span className="font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-bold">
                  PIN: 2222
                </span>
              </div>
            </div>

            {/* BOTÓN 1-CLIC ENTRAR A ALMACÉN DON MARIO */}
            <button
              onClick={handleEnterDemo}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-98 cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>Ingresar a Almacén Don Mario (1 Clic)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* OTRAS OPCIONES: CREAR CUENTA PROPIA O SHOWCASE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md pt-1">
            <Link
              href="/registro-comercio"
              className={`py-3 px-4 rounded-2xl text-xs font-bold border transition flex items-center justify-center gap-2 active:scale-98 ${
                isLight
                  ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>Crear Mi Propio Almacén</span>
            </Link>

            <Link
              href="/showcase"
              className={`py-3 px-4 rounded-2xl text-xs font-bold border transition flex items-center justify-center gap-2 active:scale-98 ${
                isLight
                  ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Ver Simulador Comercial</span>
            </Link>
          </div>

          <div
            className={`pt-4 border-t text-xs flex items-center justify-center gap-2 ${
              isLight ? 'border-slate-200 text-slate-500' : 'border-slate-900 text-slate-500'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Terminal POS protegida con Libro Mayor inmutable y RLS</span>
          </div>
        </main>

        {/* FOOTER */}
        <footer
          className={`border-t py-4 px-4 text-center text-[11px] flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto w-full gap-2 transition ${
            isLight ? 'border-slate-200 bg-white/80 text-slate-500' : 'border-slate-900 bg-slate-950/80 text-slate-500'
          }`}
        >
          <p>LibretaDigital Pro • FinTech POS & Fiado en Tiempo Real • Multi-País</p>
          <Link
            href="/admin"
            className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-bold flex items-center gap-1 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Acceso Super Admin (Dueño SaaS) →
          </Link>
        </footer>
      </div>
    );
  }

  // SI ESTÁ AUTENTICADO: MOSTRAR PANEL COMPLETO DEL COMERCIO
  return <MerchantDashboard />;
}
