'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Lock,
  ArrowRight,
  Store,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

interface MatchedAccount {
  id: string;
  full_name: string;
  qr_token: string;
  tenant_id: string;
  business_name: string;
  current_balance: number;
}

interface LastCustomerSession {
  token: string;
  name: string;
  businessName: string;
}

export default function AccesoClientePage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [matchedAccounts, setMatchedAccounts] = useState<MatchedAccount[]>([]);
  const [lastSession, setLastSession] = useState<LastCustomerSession | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('libretadigital_last_customer');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.token && parsed?.name) {
          setLastSession(parsed);
        }
      }
    } catch {}
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setMatchedAccounts([]);

    if (!identifier.trim()) {
      setErrorMsg('Ingresá tu número de Cédula o Teléfono WhatsApp.');
      return;
    }
    if (!/^\d{4}$/.test(pin.trim())) {
      setErrorMsg('Tu PIN de seguridad debe tener exactamente 4 dígitos numéricos.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          pin: pin.trim(),
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'No se pudo verificar tu cuenta.');
        setLoading(false);
        return;
      }

      const accounts: MatchedAccount[] = json.accounts || [];
      if (accounts.length === 1) {
        const acc = accounts[0];
        try {
          localStorage.setItem(
            'libretadigital_last_customer',
            JSON.stringify({
              token: acc.qr_token,
              name: acc.full_name,
              businessName: acc.business_name,
            })
          );
        } catch {}
        router.push(`/portal/${acc.qr_token}`);
        return;
      }

      setMatchedAccounts(accounts);
    } catch {
      setErrorMsg('Error de conexión. Verificá tu internet e intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between px-4 py-8 font-sans">
      <div className="max-w-md w-full mx-auto space-y-6 my-auto">
        {/* LOGO */}
        <div className="flex flex-col items-center text-center space-y-2">
          <BrandLogo size="lg" theme="dark" />
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Portal del Cliente
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">Ingresar a Mi Libreta</h1>
          <p className="text-xs text-slate-400 max-w-sm">
            Consultá tu saldo, historial de compras fiadas, recibos y firmá operaciones con tu PIN personal.
          </p>
        </div>

        {/* ACCESO RÁPIDO SI YA INGRESÓ ANTES EN ESTE DISPOSITIVO */}
        {lastSession && (
          <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-700/60 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Última cuenta abierta en este dispositivo</span>
            </div>
            <Link
              href={`/portal/${lastSession.token}`}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center justify-between shadow-lg shadow-emerald-950 transition"
            >
              <div className="text-left">
                <div className="text-sm font-black leading-tight">{lastSession.name}</div>
                <div className="text-[11px] text-emerald-100/90 font-medium">{lastSession.businessName}</div>
              </div>
              <ArrowRight className="w-4 h-4 flex-shrink-0" />
            </Link>
          </div>
        )}

        {/* SELECTOR DE ALMACÉN SI TIENE CUENTAS EN MÁS DE UNO */}
        {matchedAccounts.length > 1 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-400" /> Seleccioná tu Almacén
            </h2>
            <p className="text-xs text-slate-400">
              Encontramos tu libreta en los siguientes comercios. Elegí cuál querés ver:
            </p>
            <div className="space-y-2.5">
              {matchedAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => {
                    try {
                      localStorage.setItem(
                        'libretadigital_last_customer',
                        JSON.stringify({
                          token: acc.qr_token,
                          name: acc.full_name,
                          businessName: acc.business_name,
                        })
                      );
                    } catch {}
                    router.push(`/portal/${acc.qr_token}`);
                  }}
                  className="w-full p-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-left flex items-center justify-between transition cursor-pointer"
                >
                  <div>
                    <div className="text-sm font-bold text-white">{acc.business_name}</div>
                    <div className="text-xs text-slate-400">{acc.full_name}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* FORMULARIO DE ACCESO CON CÉDULA/TELÉFONO + PIN */
          <form
            onSubmit={handleLogin}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Cédula de Identidad o Teléfono WhatsApp
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Ej: 5531942 o 0975872063"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                PIN de Seguridad (4 dígitos)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  required
                  className="w-full pl-10 pr-11 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm font-mono tracking-[0.4em] text-white placeholder-slate-500 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Verificando...' : 'Ver Mi Cuenta Corriente'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-3 border-t border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-400">¿Todavía no te registraste en tu almacén?</p>
              <Link
                href="/registro-cliente"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
              >
                <UserPlus className="w-3.5 h-3.5" /> Registrarme como Cliente Nuevo →
              </Link>
            </div>
          </form>
        )}

        {/* VOLVER AL INICIO */}
        <div className="text-center space-y-2">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition inline-block">
            ← Volver a la Pantalla Principal
          </Link>
        </div>
      </div>

      <footer className="text-center text-[11px] text-slate-600 pt-6 space-x-2">
        <Link href="/terminos?returnTo=/acceso-cliente" className="hover:text-slate-400 underline">
          Términos de Servicio
        </Link>
        <span>•</span>
        <Link href="/privacidad?returnTo=/acceso-cliente" className="hover:text-slate-400 underline">
          Política de Privacidad
        </Link>
      </footer>
    </div>
  );
}
