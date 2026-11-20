'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Store,
  User,
  Phone,
  Mail,
  Lock,
  KeyRound,
  Globe2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Building,
  Sparkles,
  QrCode,
  Copy,
  Check,
  Send,
  HelpCircle,
  TrendingUp,
  ReceiptText
} from 'lucide-react';
import { Tenant, StaffMember } from '@/types';
import { saveTenant, saveStaff, setCurrentOperator, getStoredData, setMerchantLoggedIn } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import confetti from 'canvas-confetti';
import { BrandLogo } from '@/components/BrandLogo';

const REGIONAL_CURRENCIES = [
  { code: 'PYG', symbol: '₲', label: 'Paraguay (Guaraní - ₲)', default: true },
  { code: 'BRL', symbol: 'R$', label: 'Brasil (Real - R$)', default: false },
  { code: 'PEN', symbol: 'S/', label: 'Perú (Sol - S/)', default: false },
  { code: 'USD', symbol: '$', label: 'Dólar Estadounidense ($)', default: false },
];

function MerchantRegisterContent() {
  const router = useRouter();
  const [tab, setTab] = useState<'REGISTER' | 'LOGIN'>('REGISTER');

  // Formulario de Registro
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('PYG');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerPin, setOwnerPin] = useState('1234');

  // Formulario de Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Estados de proceso
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<{
    tenant: Tenant;
    owner: StaffMember;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const selectedCurrency = REGIONAL_CURRENCIES.find((c) => c.code === currencyCode) || REGIONAL_CURRENCIES[0];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validaciones
    if (!businessName.trim()) {
      setErrorMsg('Ingresa el nombre de tu comercio o almacén.');
      return;
    }
    if (!ownerName.trim()) {
      setErrorMsg('Ingresa tu nombre y apellido como dueño o administrador.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Ingresa tu número de teléfono / WhatsApp.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Ingresa un correo electrónico válido.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (!ownerPin || ownerPin.length !== 4 || isNaN(Number(ownerPin))) {
      setErrorMsg('El PIN de caja debe tener exactamente 4 dígitos numéricos (ej. 1234).');
      return;
    }

    setSubmitting(true);

    try {
      const tenantId = crypto.randomUUID();
      const now = new Date().toISOString();

      const newTenant: Tenant = {
        id: tenantId,
        business_name: businessName.trim(),
        tax_id: taxId.trim() || undefined,
        phone: phone.trim(),
        address: address.trim() || 'Principal',
        currency_code: selectedCurrency.code,
        currency_symbol: selectedCurrency.symbol,
        subscription_plan: 'pro_monthly',
        sub_status: 'trialing',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: now,
        updated_at: now,
      };

      const ownerStaff: StaffMember = {
        id: `staff-${tenantId.slice(0, 8)}`,
        tenant_id: tenantId,
        full_name: ownerName.trim(),
        role: 'OWNER',
        phone: phone.trim(),
        pin: ownerPin.trim(),
        is_active: true,
        permissions: {
          can_register_sales: true,
          can_register_payments: true,
          can_edit_credit_limits: true,
          can_adjust_credit_notes: true,
          can_view_financial_reports: true,
          can_manage_staff: true,
        },
        created_at: now,
        updated_at: now,
      };

      // 1. Conexión a Supabase (si está configurado)
      const supabase = createClient();
      if (supabase) {
        // A. Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            data: {
              tenant_id: tenantId,
              business_name: businessName.trim(),
              owner_name: ownerName.trim(),
              phone: phone.trim(),
            },
          },
        });

        if (authError) {
          console.warn('Aviso Supabase Auth:', authError.message);
          // Si el usuario ya existe en Supabase Auth, avisar
          if (authError.message.includes('already registered')) {
            setErrorMsg('Este correo ya está registrado. Por favor inicia sesión en la pestaña superior.');
            setSubmitting(false);
            return;
          }
        }

        // B. Insertar Tenant en la base de datos
        const { error: tenantErr } = await supabase.from('tenants').insert(newTenant);
        if (tenantErr) {
          console.warn('Aviso Supabase Tenants:', tenantErr.message);
        }

        // C. Insertar Dueño en staff_members
        const { error: staffErr } = await supabase.from('staff_members').insert(ownerStaff);
        if (staffErr) {
          console.warn('Aviso Supabase Staff:', staffErr.message);
        }
      }

      // 2. Guardar en Almacenamiento Local reactivo y activar sesión
      saveTenant(newTenant);
      saveStaff([ownerStaff]);
      setCurrentOperator(ownerStaff);
      setMerchantLoggedIn(true);

      // Lanzar confeti celebratorio
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
      });

      setSuccessData({
        tenant: newTenant,
        owner: ownerStaff,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado al crear el comercio.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMsg('Ingresa tu correo y contraseña.');
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      if (supabase) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        });

        if (authError) {
          setErrorMsg(`Error de acceso: ${authError.message}`);
          setSubmitting(false);
          return;
        }

        // Si se autenticó en Supabase, buscar el comercio del usuario
        if (authData.user) {
          const tenantId = authData.user.user_metadata?.tenant_id;
          if (tenantId) {
            const { data: tData } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
            if (tData) {
              saveTenant(tData);
            }
            const { data: sData } = await supabase.from('staff_members').select('*').eq('tenant_id', tenantId);
            if (sData && sData.length > 0) {
              saveStaff(sData);
              const owner = sData.find((s: StaffMember) => s.role === 'OWNER') || sData[0];
              setCurrentOperator(owner);
            }
          }
        }
      }

      // Activar sesión autenticada
      setMerchantLoggedIn(true);

      // Redirigir al panel de administración
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  const clientRegistrationUrl = successData
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/registro-cliente?almacen=${successData.tenant.id}`
    : '';

  const handleCopyLink = () => {
    if (!clientRegistrationUrl) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(clientRegistrationUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      prompt('Copia este enlace para tus clientes:', clientRegistrationUrl);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* HEADER SIMPLE */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-20 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition">
            <BrandLogo size="md" theme="dark" showTagline={false} />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-900 transition"
            >
              Ir al POS
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {successData ? (
          /* PANTALLA DE ÉXITO Y BIENVENIDA */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800/60 inline-block mb-2">
                ¡Almacén Creado Exitosamente!
              </span>
              <h1 className="text-2xl font-black text-white">{successData.tenant.business_name}</h1>
              <p className="text-sm text-slate-400 mt-1">
                Bienvenido, <b>{successData.owner.full_name}</b>. Tu terminal financiera está lista para registrar compras fiadas, cobranzas multicanal y emisión de recibos.
              </p>
            </div>

            {/* RESUMEN DE ACCESO */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Moneda de Operación:</span>
                <span className="font-bold text-white">{successData.tenant.currency_code} ({successData.tenant.currency_symbol})</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Tu PIN de Caja (Dueño):</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{successData.owner.pin}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Periodo de Prueba Pro:</span>
                <span className="font-bold text-blue-400">14 días activos (Gratis)</span>
              </div>
            </div>

            {/* LINK DE AUTO-REGISTRO PARA CLIENTES */}
            <div className="bg-blue-950/40 border border-blue-800/60 rounded-2xl p-4 text-left space-y-2.5">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-black uppercase text-blue-300">
                  Enlace para que tus Clientes se registren
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Envía este enlace por WhatsApp a tus clientes para que acepten los términos de crédito e Informconf y reciban su PIN/QR:
              </p>
              <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-xl p-2">
                <input
                  type="text"
                  readOnly
                  value={clientRegistrationUrl}
                  className="bg-transparent text-slate-300 text-[11px] font-mono flex-1 outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* BOTÓN ENTRAR AL POS */}
            <button
              onClick={() => router.push('/')}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 active:scale-98"
            >
              <span>Abrir mi Terminal POS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* FORMULARIO DE REGISTRO / LOGIN */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            {/* TABS SELECTORES */}
            <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800/80 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setTab('REGISTER');
                  setErrorMsg('');
                }}
                className={`py-2 rounded-xl transition ${
                  tab === 'REGISTER'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ✨ Crear Nuevo Almacén
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('LOGIN');
                  setErrorMsg('');
                }}
                className={`py-2 rounded-xl transition ${
                  tab === 'LOGIN'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔑 Iniciar Sesión
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {tab === 'REGISTER' ? (
              /* FORMULARIO DE ALTA DE ALMACÉN */
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="border-b border-slate-800/80 pb-3">
                  <h2 className="text-lg font-black text-white">Registra tu Comercio</h2>
                  <p className="text-xs text-slate-400">
                    Controla tus fiados, cobra con QR/Pix/Efectivo y emite recibos automáticos por WhatsApp.
                  </p>
                </div>

                {/* 1. Nombre del Comercio */}
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1 block">
                    Nombre del Almacén o Negocio *
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. Despensa San Cayetano, Minisúper Central..."
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* 2. Nombre del Dueño y Teléfono */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">
                      Tu Nombre y Apellido (Dueño) *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Mario Gómez"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">
                      Teléfono / WhatsApp *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        placeholder="Ej. 0981123456"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Moneda Principal y Ciudad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">
                      Moneda de Operación *
                    </label>
                    <div className="relative">
                      <Globe2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={currencyCode}
                        onChange={(e) => setCurrencyCode(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-blue-500 transition appearance-none cursor-pointer"
                      >
                        {REGIONAL_CURRENCIES.map((curr) => (
                          <option key={curr.code} value={curr.code} className="bg-slate-900 text-white">
                            {curr.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">
                      Ciudad o Ubicación (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Asunción, San Lorenzo..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* 4. Correo y Contraseña para Login */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">
                      Correo Electrónico *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="tu-correo@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">
                      Contraseña *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. PIN de Caja del Dueño */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>PIN Rápido para Caja POS (4 dígitos) *</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Para que atiendas en el mostrador sin tener que teclear tu contraseña completa en cada venta.
                  </p>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="1234"
                    value={ownerPin}
                    onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-36 px-3 py-2 bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold text-center tracking-widest text-base rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* BOTÓN DE ENVÍO */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 mt-4 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{submitting ? 'Creando Almacén...' : 'Comenzar 14 Días Gratis'}</span>
                </button>

                <p className="text-[11px] text-slate-500 text-center">
                  Sin tarjeta de crédito requerida • Listo para operar al instante
                </p>
              </form>
            ) : (
              /* FORMULARIO DE LOGIN DE COMERCIO */
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="border-b border-slate-800/80 pb-3">
                  <h2 className="text-lg font-black text-white">Inicia Sesión en tu Almacén</h2>
                  <p className="text-xs text-slate-400">
                    Ingresa con tu correo administrativo y contraseña para gestionar tu negocio.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1 block">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="tu-correo@gmail.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1 block">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Tu contraseña"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 mt-4 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>{submitting ? 'Verificando...' : 'Entrar a mi Almacén'}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-center text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto w-full gap-2">
        <p>LibretaDigital Pro • FinTech POS & Fiado en Tiempo Real • Multi-País (PY, BR, PE)</p>
        <Link href="/admin" className="text-indigo-400 hover:text-indigo-300 font-bold transition flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Acceso Super Admin →
        </Link>
      </footer>
    </div>
  );
}

export default function MerchantRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-xs">
          Cargando registro de comercios...
        </div>
      }
    >
      <MerchantRegisterContent />
    </Suspense>
  );
}
