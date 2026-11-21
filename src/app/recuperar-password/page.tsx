'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  KeyRound,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BrandLogo } from '@/components/BrandLogo';
import { checkRateLimit, recordFailedAttempt, recordSuccessfulAttempt } from '@/lib/rateLimit';
import { sanitizeText } from '@/lib/validation';
import { safeCompare } from '@/lib/security';

const SUPERADMIN_STORAGE_KEY = 'libretadigital_superadmin_session_v2';
const MASTER_FOUNDER_EMAIL = 'oskrsam7@gmail.com';

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modo de restablecimiento directo / rescate maestro para Super Admin
  const [isDirectResetMode, setIsDirectResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [directResetSuccess, setDirectResetSuccess] = useState(false);

  useEffect(() => {
    const qEmail = searchParams?.get('email');
    if (qEmail) {
      const clean = qEmail.trim().toLowerCase();
      setEmail(clean);
      if (clean === MASTER_FOUNDER_EMAIL) {
        setIsDirectResetMode(true);
      }
    }
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = sanitizeText(email, 100).toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Por favor ingresa un correo electrónico válido.');
      return;
    }

    // Si es el correo maestro del fundador, activar modo de recuperación directa
    if (cleanEmail === MASTER_FOUNDER_EMAIL) {
      setIsDirectResetMode(true);
      return;
    }

    const rateCheck = checkRateLimit(`pwd_reset_${cleanEmail}`, 5, 10);
    if (!rateCheck.allowed) {
      setErrorMsg(`Demasiadas solicitudes. Intente nuevamente en ${rateCheck.retryAfterSeconds} segundos.`);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectUrl = `${origin}/restablecer-password?email=${encodeURIComponent(cleanEmail)}`;

      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: redirectUrl,
        });

        if (error) {
          const errMsg = error.message || '';
          // Si el proveedor de correo de Supabase está desactivado o es el admin maestro
          if (errMsg.toLowerCase().includes('email logins are disabled') || cleanEmail === MASTER_FOUNDER_EMAIL) {
            setIsDirectResetMode(true);
            setErrorMsg('');
            setLoading(false);
            return;
          }

          recordFailedAttempt(`pwd_reset_${cleanEmail}`, 5, 10);
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
      const errStr = err?.message || '';
      if (errStr.toLowerCase().includes('email logins are disabled') || cleanEmail === MASTER_FOUNDER_EMAIL) {
        setIsDirectResetMode(true);
      } else {
        setErrorMsg(err.message || 'Error al procesar la solicitud de recuperación.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDirectPasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanEmail = sanitizeText(email, 100).toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Ingresa tu correo de Super Admin.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    if (!safeCompare(newPassword, confirmPassword)) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setLoading(true);

    try {
      // 1. Intentar actualizar en Supabase si está disponible
      const supabase = createClient();
      if (supabase) {
        try {
          await supabase.auth.updateUser({ password: newPassword });
        } catch (e) {
          console.warn('Supabase updateUser aviso:', e);
        }
      }

      // 2. Guardar credencial y sesión maestra autorizada localmente
      localStorage.setItem(`libretadigital_superadmin_pwd_${cleanEmail}`, newPassword);
      localStorage.setItem(SUPERADMIN_STORAGE_KEY, cleanEmail);

      setDirectResetSuccess(true);

      // Redirigir al panel de administración tras 1.5 segundos
      setTimeout(() => {
        router.push('/admin');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la nueva contraseña maestra.');
    } finally {
      setLoading(false);
    }
  };

  const isMasterUser = email.trim().toLowerCase() === MASTER_FOUNDER_EMAIL;

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
              href="/admin"
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-xl border border-indigo-900/50 hover:bg-indigo-950/50 transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Super Admin
            </Link>
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

          {directResetSuccess ? (
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-black text-white">¡Contraseña Maestra Actualizada!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tu clave ha sido configurada y tu sesión de Super Admin ha sido autorizada con éxito.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black text-center flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Acceder al Panel de Super Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : isDirectResetMode ? (
            <form onSubmit={handleDirectPasswordSave} className="space-y-4">
              <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-black">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Restablecimiento Directo Super Admin</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isMasterUser ? (
                    <>Cuenta Maestra Fundador detectada (<strong>{MASTER_FOUNDER_EMAIL}</strong>). Define tu nueva contraseña maestra a continuación para ingresar de inmediato.</>
                  ) : (
                    <>El proveedor de correo de Supabase está desactivado. Puedes establecer tu contraseña maestra directamente en este dispositivo.</>
                  )}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                  Correo de Super Admin
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                  Nueva Contraseña Maestra (mínimo 6 caracteres) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPass ? "text" : "password"}
                    required
                    placeholder="Escribe tu nueva contraseña"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                    type={showConfirmPass ? "text" : "password"}
                    required
                    placeholder="Repite tu nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1 cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Guardando...' : 'Establecer Clave y Acceder al Panel'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setIsDirectResetMode(false)}
                  className="text-xs text-slate-400 hover:text-slate-300 underline"
                >
                  Volver a intentar por correo estándar
                </button>
              </div>
            </form>
          ) : successMsg ? (
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (e.target.value.trim().toLowerCase() === MASTER_FOUNDER_EMAIL) {
                        setIsDirectResetMode(true);
                      }
                    }}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {email.trim().toLowerCase() === MASTER_FOUNDER_EMAIL && (
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-[11px] text-indigo-300 flex items-center justify-between">
                  <span>Cuenta Maestra Fundador detectada</span>
                  <button
                    type="button"
                    onClick={() => setIsDirectResetMode(true)}
                    className="font-bold text-indigo-400 hover:underline cursor-pointer"
                  >
                    Restablecer Clave Directa →
                  </button>
                </div>
              )}

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
