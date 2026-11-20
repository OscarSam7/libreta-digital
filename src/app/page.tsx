'use client';

import React, { useState, useEffect } from 'react';
import { MerchantDashboard } from '@/components/MerchantDashboard';
import { isMerchantLoggedIn } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import { BrandLogo } from '@/components/BrandLogo';
import Link from 'next/link';
import { Store, ArrowRight, ShieldCheck, Sparkles, KeyRound, Lock, UserCheck } from 'lucide-react';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
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

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <BrandLogo size="lg" theme="dark" />
          <p className="text-xs text-slate-400">Verificando credenciales de acceso seguro...</p>
        </div>
      </div>
    );
  }

  // SI NO ESTÁ AUTENTICADO: BLOQUEO SEGURO Y PANTALLA DE ACCESO
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
        {/* HEADER DE BIENVENIDA */}
        <header className="border-b border-slate-800/80 px-4 py-3 bg-slate-950/70 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <BrandLogo size="md" theme="dark" showTagline={false} />
            <div className="flex items-center gap-2">
              <Link
                href="/showcase"
                className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-900 transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Showcase Comercial
              </Link>
              <Link
                href="/registro-comercio"
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 rounded-xl transition shadow-md shadow-blue-600/30 flex items-center gap-1"
              >
                <UserCheck className="w-3.5 h-3.5" /> Iniciar Sesión / Registro
              </Link>
            </div>
          </div>
        </header>

        {/* HERO ACCESO PROTEGIDO */}
        <main className="max-w-2xl mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-xl shadow-blue-600/10">
            <Lock className="w-10 h-10" />
          </div>

          <div className="space-y-2.5">
            <span className="text-xs font-black uppercase tracking-widest text-blue-400 bg-blue-950/80 px-3.5 py-1 rounded-full border border-blue-800/60 inline-block">
              Acceso Seguro Obligatorio
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Libreta<span className="text-blue-500">Digital</span> PRO
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-lg mx-auto">
              Para ingresar al panel financiero de tu comercio, registrar ventas fiadas y liquidar cobros, debes identificarte con tu cuenta.
            </p>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md pt-2">
            <Link
              href="/registro-comercio"
              className="py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 active:scale-98"
            >
              <Store className="w-4 h-4" />
              <span>Entrar / Crear Almacén</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/showcase"
              className="py-3.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Ver Showcase Comercial</span>
            </Link>
          </div>

          <div className="pt-6 border-t border-slate-900 text-xs text-slate-500 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Terminal POS protegida con Libro Mayor inmutable y RLS</span>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-center text-[11px] text-slate-500">
          <p>LibretaDigital Pro • FinTech POS & Fiado en Tiempo Real • Multi-País</p>
        </footer>
      </div>
    );
  }

  // SI ESTÁ AUTENTICADO: MOSTRAR PANEL COMPLETO DEL COMERCIO
  return <MerchantDashboard />;
}
