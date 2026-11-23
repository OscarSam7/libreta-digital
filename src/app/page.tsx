'use client';

import React, { useState, useEffect } from 'react';
import { MerchantDashboard } from '@/components/MerchantDashboard';
import { isMerchantLoggedIn, loginDemoDonMario, isSuperAdminLoggedIn } from '@/lib/storage';
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [lastCustomer, setLastCustomer] = useState<{ token: string; name: string; businessName: string } | null>(null);

  useEffect(() => {
    // Cargar preferencia de tema (por defecto tema blanco)
    const savedTheme = localStorage.getItem('libreta_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    // Cargar última sesión de cliente si existe en este dispositivo
    try {
      const rawCust = localStorage.getItem('libretadigital_last_customer');
      if (rawCust) {
        const parsed = JSON.parse(rawCust);
        if (parsed?.token && parsed?.name) {
          setLastCustomer(parsed);
        }
      }
    } catch {}

    async function checkAuth() {
      // 1. Verificar si es Super Admin autenticado
      setIsSuperAdmin(isSuperAdminLoggedIn());

      // 2. Verificar sesión activa en Supabase
      try {
        const supabase = createClient();
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data && data.session) {
            if (data.session.user?.user_metadata?.role === 'SUPER_ADMIN') {
              setIsSuperAdmin(true);
            }
            setIsAuthenticated(true);
            return;
          }
        }
      } catch (e) {
        // Fallback local
      }

      // 3. Verificar estado de sesión local
      const localLoggedIn = isMerchantLoggedIn();
      setIsAuthenticated(localLoggedIn);
    }

    checkAuth();
    const handleAuthChange = () => {
      setIsAuthenticated(isMerchantLoggedIn());
      setIsSuperAdmin(isSuperAdminLoggedIn());
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

          {/* ACCESO EXCLUSIVO SUPER ADMIN AL DEMO (SOLO VISIBLE SI EL SUPER ADMIN ESTÁ AUTENTICADO) */}
          {isSuperAdmin && (
            <div
              className={`w-full max-w-md p-4 rounded-3xl text-left space-y-2.5 shadow-lg border-2 transition ${
                isLight
                  ? 'bg-indigo-50/80 border-indigo-300'
                  : 'bg-indigo-950/40 border-indigo-700/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`text-xs font-black ${isLight ? 'text-indigo-950' : 'text-indigo-200'}`}>
                      Super Admin Autorizado
                    </div>
                    <div className={`text-[10px] ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>
                      Acceso exclusivo a la terminal de demostración
                    </div>
                  </div>
                </div>
                <Link
                  href="/admin"
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Panel Admin →
                </Link>
              </div>

              <button
                onClick={handleEnterDemo}
                className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <Store className="w-4 h-4" />
                <span>Abrir Demo (Almacén Don Mario)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ACCESO PRIVADO PARA COMERCIOS REALES */}
          <div className="w-full max-w-md space-y-3">
            <Link
              href="/registro-comercio?tab=login"
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Iniciar Sesión en mi Almacén</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/registro-comercio"
                className={`py-3 px-3 rounded-2xl text-xs font-bold border transition flex items-center justify-center gap-1.5 active:scale-98 ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                }`}
              >
                <Store className="w-3.5 h-3.5 text-blue-500" />
                <span>Registrar Comercio</span>
              </Link>

              <Link
                href="/showcase"
                className={`py-3 px-3 rounded-2xl text-xs font-bold border transition flex items-center justify-center gap-1.5 active:scale-98 ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Ver Simulador</span>
              </Link>
            </div>
          </div>

          {/* ACCESO DIRECTO PARA CLIENTES DEL ALMACÉN */}
          <div
            className={`w-full max-w-md p-4 rounded-3xl text-left space-y-3 border-2 transition ${
              isLight
                ? 'bg-emerald-50/80 border-emerald-200 shadow-sm'
                : 'bg-emerald-950/30 border-emerald-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className={`text-xs font-black ${isLight ? 'text-emerald-950' : 'text-emerald-200'}`}>
                  ¿Sos Cliente de un Almacén?
                </div>
                <div className={`text-[11px] ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  Consultá tu saldo, recibos y libreta con tu Cédula y PIN
                </div>
              </div>
            </div>

            {lastCustomer && (
              <Link
                href={`/portal/${lastCustomer.token}`}
                className="w-full py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center justify-between shadow-md shadow-emerald-600/20 transition"
              >
                <span>Volver a Mi Libreta ({lastCustomer.name})</span>
                <ArrowRight className="w-4 h-4 flex-shrink-0" />
              </Link>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/acceso-cliente"
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  lastCustomer
                    ? isLight
                      ? 'bg-white hover:bg-emerald-100/60 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-800'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Entrar con PIN</span>
              </Link>

              <Link
                href="/registro-cliente"
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  isLight
                    ? 'bg-white hover:bg-emerald-100/60 text-emerald-800 border-emerald-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border-emerald-800'
                }`}
              >
                <span>Registrarme</span>
              </Link>
            </div>
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
            <ShieldCheck className="w-3.5 h-3.5" /> Panel Super Admin →
          </Link>
        </footer>
      </div>
    );
  }

  // SI ESTÁ AUTENTICADO: MOSTRAR PANEL COMPLETO DEL COMERCIO
  return <MerchantDashboard />;
}
