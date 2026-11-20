'use client';

import React, { useState, useEffect } from 'react';
import { Store, ShieldCheck, Phone, Lock, User, ArrowRight, CheckCircle2, AlertCircle, Building2, MapPin, LogOut } from 'lucide-react';
import { Tenant } from '@/types';
import { saveTenant, getStoredData } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import { BrandLogo } from '@/components/BrandLogo';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MerchantAuthModal({ onSuccess, onCancel }: Props) {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [existingTenants, setExistingTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  
  // Formulario de Registro
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [passcode, setPasscode] = useState('');
  const [currency, setCurrency] = useState('PYG');

  // Login
  const [loginPhoneOrTaxId, setLoginPhoneOrTaxId] = useState('');
  const [loginPasscode, setLoginPasscode] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cargar comercios existentes para el modo Login o cambio rápido
  useEffect(() => {
    async function loadTenants() {
      try {
        const supabase = createClient();
        if (supabase) {
          const { data, error } = await supabase.from('tenants').select('*').order('business_name');
          if (!error && data && data.length > 0) {
            setExistingTenants(data);
            setSelectedTenantId(data[0].id);
            return;
          }
        }
      } catch (e) {
        console.warn('Fallback local');
      }

      const stored = getStoredData();
      if (stored.tenant) {
        setExistingTenants([stored.tenant]);
        setSelectedTenantId(stored.tenant.id);
      }
    }

    loadTenants();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!businessName.trim()) {
      setErrorMsg('Por favor ingresa el nombre de tu comercio.');
      setLoading(false);
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Por favor ingresa tu número de teléfono / WhatsApp.');
      setLoading(false);
      return;
    }

    try {
      const newTenant: Tenant = {
        id: crypto.randomUUID(),
        business_name: businessName.trim(),
        tax_id: taxId.trim() || 'Sin RUC',
        phone: phone.trim().replace(/\D/g, ''),
        address: address.trim() || 'Central',
        currency_code: currency,
        currency_symbol: currency === 'PYG' ? '₲' : currency === 'BRL' ? 'R$' : currency === 'PEN' ? 'S/' : '$',
        subscription_plan: 'pro_monthly',
        sub_status: 'active',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const supabase = createClient();
      if (supabase) {
        const { error: sbError } = await supabase.from('tenants').insert(newTenant);
        if (sbError) {
          console.warn('Supabase tenant insert notice:', sbError.message);
        }
      }

      saveTenant(newTenant);
      setSuccessMsg('¡Comercio registrado con éxito! Accediendo a tu terminal...');
      
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar el comercio.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const targetTenant = existingTenants.find((t) => t.id === selectedTenantId) || existingTenants[0];

    if (!targetTenant) {
      setErrorMsg('No se encontró el comercio seleccionado.');
      setLoading(false);
      return;
    }

    saveTenant(targetTenant);
    setSuccessMsg(`¡Conectado a ${targetTenant.business_name}!`);

    setTimeout(() => {
      if (onSuccess) onSuccess();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
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
          <div className="flex justify-center mb-3">
            <BrandLogo size="lg" theme="light" showTagline />
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-2">
            {mode === 'LOGIN' ? 'Acceso de Comercio' : 'Registrar Nuevo Almacén'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {mode === 'LOGIN'
              ? 'Selecciona tu almacén o cambia entre sucursales'
              : 'Empieza a usar LibretaDigital Pro en 1 minuto'}
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

        {mode === 'LOGIN' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" /> Selecciona tu Almacén / Comercio
              </label>
              {existingTenants.length > 0 ? (
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
                >
                  {existingTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.business_name} {t.address ? `— ${t.address}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-slate-500 py-2">
                  No hay almacenes cargados. Registra el primero abajo.
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || existingTenants.length === 0}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Entrar a este Comercio'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Nombre del Comercio / Almacén *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Despensa Doña Juana"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Nombre del Propietario / Encargado
              </label>
              <input
                type="text"
                placeholder="Ej: Juana Rodríguez"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 0981 123456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  RUC / Cédula Comercial
                </label>
                <input
                  type="text"
                  placeholder="Ej: 80012345-6"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Ciudad o Dirección
                </label>
                <input
                  type="text"
                  placeholder="Ej: Asunción"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Moneda
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-blue-600 focus:bg-white focus:outline-none"
                >
                  <option value="PYG">₲ Guaraní (PY)</option>
                  <option value="BRL">R$ Real (BR)</option>
                  <option value="PEN">S/ Sol (PE)</option>
                  <option value="USD">$ Dólar (USD)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/25 transition text-sm flex items-center justify-center gap-2 mt-3 disabled:opacity-60"
            >
              {loading ? 'Registrando...' : 'Registrar y Comenzar'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="mt-5 text-center pt-4 border-t border-slate-100 flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs">
            {mode === 'LOGIN' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('REGISTER');
                    setErrorMsg('');
                  }}
                  className="font-bold text-blue-600 hover:underline"
                >
                  + Registrar rápido
                </button>
                <span className="text-slate-300">•</span>
                <a
                  href="/registro-comercio"
                  className="font-bold text-indigo-600 hover:underline"
                >
                  Crear cuenta nueva →
                </a>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMsg('');
                }}
                className="font-bold text-blue-600 hover:underline"
              >
                ← Ver almacenes existentes
              </button>
            )}

            <a
              href="/admin"
              className="text-slate-400 hover:text-indigo-600 font-semibold flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Super Admin
            </a>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={async () => {
                if (confirm('¿Deseas cerrar sesión de este comercio y salir a la pantalla de registro / login?')) {
                  const supabase = createClient();
                  if (supabase) {
                    try {
                      await supabase.auth.signOut();
                    } catch (e) {}
                  }
                  window.location.href = '/registro-comercio';
                }
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 transition py-1.5 px-3 rounded-xl hover:bg-rose-50 border border-rose-200"
            >
              <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión del Comercio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
