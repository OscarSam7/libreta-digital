'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import {
  KeyRound,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Store,
  ArrowLeft,
  Phone,
  HelpCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BrandLogo } from '@/components/BrandLogo';
import { checkRateLimit, recordFailedAttempt, recordSuccessfulAttempt } from '@/lib/rateLimit';
import { sanitizeText } from '@/lib/validation';

function ForgotPasswordContent() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = sanitizeText(email, 100).toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Por favor ingresa un correo electrónico válido.');
      return;
    }

    const rateCheck = checkRateLimit(`pwd_reset_${cleanEmail}`, 3, 15);
    if (!rateCheck.allowed) {
      setErrorMsg(`Demasiadas solicitudes de recuperación. Intente nuevamente en ${rateCheck.retryAfterSeconds} segundos.`);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectUrl = `${origin}/restablecer-password`;

      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: redirectUrl,
        });

        if (error) {
          recordFailedAttempt(`pwd_reset_${cleanEmail}`, 3, 15);
          setErrorMsg(`Aviso: ${error.message}`);
          setLoading(false);
          return;
        }
      }

      recordSuccessfulAttempt(`pwd_reset_${cleanEmail}`);
      setSuccessMsg(
        `¡Enlace de recuperación enviado! Hemos enviado las instrucciones de restablecimiento a ${cleanEmail}. Revisa tu bandeja de entrada o correo no deseado (Spam).`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la solicitud de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* HEADER */}
      <header className="border-b border-slate-800/80 px-4 py-3 bg-slate-950/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition">
            <BrandLogo size="md" theme="dark" showTagline={false} />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/registro-comercio"
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-900 transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver al Login
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-md">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Recuperar Contraseña</h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Ingresa el correo con el que registraste tu almacén o tu cuenta de Super Admin.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Correo Enviado</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{successMsg}</p>
              </div>

              <div className="pt-2">
                <Link
                  href="/registro-comercio"
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold text-center block transition"
                >
                  Regresar a Iniciar Sesión
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                  Correo Electrónico Registrado
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Enviando enlace...' : 'Enviar Enlace de Recuperación'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <Link
                  href="/registro-comercio"
                  className="text-slate-400 hover:text-white font-semibold transition"
                >
                  ← Iniciar Sesión de Comercio
                </Link>
                <Link
                  href="/admin"
                  className="text-indigo-400 hover:text-indigo-300 font-bold transition flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Super Admin
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-center text-[11px] text-slate-500">
        <p>LibretaDigital Pro • FinTech POS & Fiado en Tiempo Real • Recuperación de Acceso Seguro</p>
      </footer>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-xs">
          Cargando recuperación...
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
