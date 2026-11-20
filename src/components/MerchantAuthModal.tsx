'use client';

import React, { useState } from 'react';
import { Store, ShieldCheck, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MerchantAuthModal({ onSuccess, onCancel }: Props) {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('PYG');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const supabase = createClient();
      if (!supabase) {
        // Modo demostración local si aún no se configuraron variables de entorno
        setSuccessMsg(
          mode === 'REGISTER'
            ? '¡Comercio registrado en modo local demo con éxito!'
            : '¡Sesión de comercio iniciada en modo local demo!'
        );
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1000);
        return;
      }

      if (mode === 'REGISTER') {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              business_name: businessName,
              currency_code: currency,
            },
          },
        });

        if (authError) throw authError;

        setSuccessMsg('¡Cuenta de comercio registrada con éxito! Iniciando sesión...');
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1200);
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) throw loginError;

        setSuccessMsg('¡Bienvenido a tu terminal LibretaDigital!');
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error en la autenticación. Verifique sus datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95">
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-full text-xs"
          >
            ✕
          </button>
        )}

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            {mode === 'LOGIN' ? 'Acceso al Comercio' : 'Registrar Nuevo Comercio'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'LOGIN'
              ? 'Ingresa con tu correo y contraseña para gestionar tu cartera'
              : 'Empieza tu prueba gratuita de 14 días sin costo'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-3.5">
          {mode === 'REGISTER' && (
            <>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nombre de tu Comercio / Local *
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ej: Despensa Don Mario"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Tu Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Mario Gómez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Moneda Local
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-blue-600 focus:bg-white focus:outline-none"
                  >
                    <option value="PYG">₲ Guaraní (PY)</option>
                    <option value="BRL">R$ Real (BR)</option>
                    <option value="PEN">S/ Sol (PE)</option>
                    <option value="USD">$ Dólar (USD)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Correo Electrónico *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="comercio@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Contraseña *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition text-sm flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
          >
            {loading ? 'Procesando...' : mode === 'LOGIN' ? 'Ingresar a mi Terminal' : 'Comenzar Trial de 14 Días'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 text-center pt-4 border-t border-slate-100">
          {mode === 'LOGIN' ? (
            <p className="text-xs text-slate-500">
              ¿No tienes cuenta aún?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setErrorMsg('');
                }}
                className="font-bold text-blue-600 hover:underline"
              >
                Crea tu comercio aquí
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              ¿Ya tienes comercio registrado?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMsg('');
                }}
                className="font-bold text-blue-600 hover:underline"
              >
                Inicia sesión
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
