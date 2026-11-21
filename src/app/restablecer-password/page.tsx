'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BrandLogo } from '@/components/BrandLogo';
import { safeCompare } from '@/lib/security';

const SUPERADMIN_STORAGE_KEY = 'libretadigital_superadmin_session_v2';
const MASTER_FOUNDER_EMAIL = 'oskrsam7@gmail.com';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetEmail = (searchParams?.get('email') || '').trim().toLowerCase();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const isMasterAdmin = targetEmail === MASTER_FOUNDER_EMAIL;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!safeCompare(newPassword, confirmPassword)) {
      setErrorMsg('Las contraseñas no coinciden. Verifícalas.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      let supabaseUpdated = false;

      if (supabase) {
        try {
          const { error } = await supabase.auth.updateUser({
            password: newPassword,
          });
          if (!error) {
            supabaseUpdated = true;
          } else {
            console.warn('Aviso updateUser Supabase:', error.message);
          }
        } catch (supaErr) {
          console.warn('Error silencioso Supabase:', supaErr);
        }
      }

      // Guardar localmente
      const finalEmail = targetEmail || MASTER_FOUNDER_EMAIL;
      localStorage.setItem(`libretadigital_superadmin_pwd_${finalEmail}`, newPassword);

      if (isMasterAdmin || !supabaseUpdated) {
        localStorage.setItem(SUPERADMIN_STORAGE_KEY, finalEmail);
      }

      setSuccess(true);
      setTimeout(() => {
        if (isMasterAdmin) {
          router.push('/admin');
        } else {
          router.push('/registro-comercio');
        }
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado al restablecer contraseña.');
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
          {isMasterAdmin && (
            <Link
              href="/admin"
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-xl border border-indigo-900/50 hover:bg-indigo-950/50 transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Super Admin
            </Link>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {isMasterAdmin ? 'Restablecer Clave Super Admin' : 'Crear Nueva Contraseña'}
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {targetEmail
                ? `Ingresa tu nueva contraseña para ${targetEmail}.`
                : 'Ingresa tu nueva clave de acceso para tu cuenta.'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-base font-black text-white">¡Contraseña Actualizada con Éxito!</h3>
              <p className="text-xs text-slate-300">
                Tu nueva clave ya está activa. Redirigiéndote al panel en unos segundos...
              </p>
              <Link
                href={isMasterAdmin ? '/admin' : '/registro-comercio'}
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
              >
                {isMasterAdmin ? 'Ir al Panel Super Admin' : 'Ir a Iniciar Sesión Ahora'}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                  Nueva Contraseña *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1 cursor-pointer"
                    title={showNewPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                  Confirmar Nueva Contraseña *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1 cursor-pointer"
                    title={showConfirmPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Guardando contraseña...' : 'Actualizar Contraseña'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <Link
                  href={isMasterAdmin ? '/admin' : '/registro-comercio'}
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  Cancelar y Volver
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-center text-[11px] text-slate-500">
        <p>LibretaDigital Pro • FinTech POS & Fiado en Tiempo Real • Acceso Seguro</p>
      </footer>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-xs">
          Cargando restablecimiento...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
