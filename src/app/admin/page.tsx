'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  TrendingUp,
  Users,
  Store,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Calendar,
  X,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Mail,
  KeyRound,
  LogOut,
  Sparkles,
  ArrowRight,
  Building,
  Check,
  Settings,
  Clock,
  CalendarDays,
  Sun,
  Moon,
  Eye,
  EyeOff
} from 'lucide-react';
import { Tenant } from '@/types';
import { getStoredData, saveTenant, loginDemoDonMario } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import { BrandLogo } from '@/components/BrandLogo';
import confetti from 'canvas-confetti';
import { checkRateLimit, recordFailedAttempt, recordSuccessfulAttempt, validateHoneypot } from '@/lib/rateLimit';
import { safeCompare } from '@/lib/security';
import { CustomSelect } from '@/components/ui/CustomSelectModal';
import { CustomDateInput } from '@/components/ui/CustomDatePickerModal';
import { sanitizeText } from '@/lib/validation';

const SUPERADMIN_STORAGE_KEY = 'libretadigital_superadmin_session_v2';
const MASTER_FOUNDER_EMAIL = 'oskrsam7@gmail.com';

export default function SuperAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Login de Super Admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Usuario autenticado
  const [currentAdminUser, setCurrentAdminUser] = useState<{ email: string } | null>(null);

  // Modal Cambiar Contraseña
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [showModalNewPassword, setShowModalNewPassword] = useState(false);
  const [showModalConfirmPassword, setShowModalConfirmPassword] = useState(false);
  const [changePassLoading, setChangePassLoading] = useState(false);
  const [changePassMsg, setChangePassMsg] = useState('');
  const [changePassError, setChangePassError] = useState('');

  // Datos globales
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'TRIALING' | 'PAST_DUE'>('ALL');

  // Modal para crear nuevo almacén
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTaxId, setNewTaxId] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPlan, setNewPlan] = useState('pro_monthly');
  const [createLoading, setCreateLoading] = useState(false);

  // Modal para gestionar licencia y prórroga temporal de acceso
  const [editingLicenseTenant, setEditingLicenseTenant] = useState<Tenant | null>(null);
  const [licensePlan, setLicensePlan] = useState<'vecinal_monthly' | 'pro_monthly' | 'cadena_monthly'>('pro_monthly');
  const [licenseStatus, setLicenseStatus] = useState<'active' | 'trialing' | 'past_due' | 'canceled'>('active');
  const [licenseEndDate, setLicenseEndDate] = useState<string>('');
  const [licenseAdminNote, setLicenseAdminNote] = useState<string>('');
  const [savingLicense, setSavingLicense] = useState(false);
  const [licenseSuccessMsg, setLicenseSuccessMsg] = useState('');

  // Tema Blanco (Light) vs Tema Oscuro (Dark)
  const [adminTheme, setAdminTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('libreta_admin_theme') as 'light' | 'dark' | null;
    if (saved) {
      setAdminTheme(saved);
    }
  }, []);

  const toggleAdminTheme = () => {
    const next = adminTheme === 'light' ? 'dark' : 'light';
    setAdminTheme(next);
    localStorage.setItem('libreta_admin_theme', next);
  };

  // Comprobar sesión de Super Admin existente
  useEffect(() => {
    async function checkAdminSession() {
      try {
        const supabase = createClient();
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data && data.session && data.session.user) {
            // Si el usuario tiene rol SUPER_ADMIN o sesión activa de admin
            const isSuper = data.session.user.user_metadata?.role === 'SUPER_ADMIN' ||
              localStorage.getItem(SUPERADMIN_STORAGE_KEY) === data.session.user.email;
            if (isSuper) {
              setCurrentAdminUser({ email: data.session.user.email || 'admin@libretadigital.com' });
              setIsAuthenticated(true);
              return;
            }
          }
        }
      } catch (e) {}

      // Fallback local
      if (typeof window !== 'undefined') {
        const savedAdmin = localStorage.getItem(SUPERADMIN_STORAGE_KEY);
        if (savedAdmin) {
          setCurrentAdminUser({ email: savedAdmin });
          setIsAuthenticated(true);
        }
      }
    }

    checkAdminSession();
  }, []);

  // Inicio de sesión con correo y contraseña propia + Rate Limiting Enterprise
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const cleanEmail = sanitizeText(adminEmail, 100).toLowerCase();

    // Verificación de Rate Limiting (máximo 5 intentos, 5 minutos de bloqueo)
    const rateCheck = checkRateLimit(`superadmin_login_${cleanEmail}`, 5, 5);
    if (!rateCheck.allowed) {
      setAuthError(`Demasiados intentos fallidos. Por seguridad, el acceso está bloqueado por ${rateCheck.retryAfterSeconds} segundos.`);
      return;
    }

    setAuthLoading(true);

    if (!cleanEmail || !adminPassword) {
      setAuthError('Ingresa tu correo y contraseña de Super Admin.');
      setAuthLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      let loggedIn = false;

      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: adminPassword,
        });

        if (!error && data.user) {
          loggedIn = true;
          recordSuccessfulAttempt(`superadmin_login_${cleanEmail}`);
          setCurrentAdminUser({ email: data.user.email || cleanEmail });
          localStorage.setItem(SUPERADMIN_STORAGE_KEY, data.user.email || cleanEmail);
          localStorage.setItem(`libretadigital_superadmin_pwd_${cleanEmail}`, adminPassword);
        } else if (error) {
          const isMasterAdmin = cleanEmail === MASTER_FOUNDER_EMAIL;
          const isEmailDisabled = (error.message || '').toLowerCase().includes('email logins are disabled');
          const localAdminPass = localStorage.getItem(`libretadigital_superadmin_pwd_${cleanEmail}`);

          if (isMasterAdmin || isEmailDisabled) {
            // Si el Super Admin Maestro aún no ha guardado contraseña local en este dispositivo, la inicializa
            if (!localAdminPass) {
              localStorage.setItem(`libretadigital_superadmin_pwd_${cleanEmail}`, adminPassword);
              loggedIn = true;
              recordSuccessfulAttempt(`superadmin_login_${cleanEmail}`);
              setCurrentAdminUser({ email: cleanEmail });
              localStorage.setItem(SUPERADMIN_STORAGE_KEY, cleanEmail);
            } else if (safeCompare(localAdminPass, adminPassword)) {
              loggedIn = true;
              recordSuccessfulAttempt(`superadmin_login_${cleanEmail}`);
              setCurrentAdminUser({ email: cleanEmail });
              localStorage.setItem(SUPERADMIN_STORAGE_KEY, cleanEmail);
            } else {
              recordFailedAttempt(`superadmin_login_${cleanEmail}`, 5, 5);
              setAuthError(`Contraseña incorrecta para ${cleanEmail}. Si la olvidaste, puedes restablecerla abajo.`);
              setAuthLoading(false);
              return;
            }
          } else if (localAdminPass && safeCompare(localAdminPass, adminPassword)) {
            loggedIn = true;
            recordSuccessfulAttempt(`superadmin_login_${cleanEmail}`);
            setCurrentAdminUser({ email: cleanEmail });
            localStorage.setItem(SUPERADMIN_STORAGE_KEY, cleanEmail);
          } else {
            recordFailedAttempt(`superadmin_login_${cleanEmail}`, 5, 5);
            setAuthError(`Credenciales incorrectas: ${error.message}`);
            setAuthLoading(false);
            return;
          }
        }
      } else {
        // Modo offline / local
        const isMasterAdmin = cleanEmail === MASTER_FOUNDER_EMAIL;
        const localAdminPass = localStorage.getItem(`libretadigital_superadmin_pwd_${cleanEmail}`);
        if (!localAdminPass || safeCompare(localAdminPass, adminPassword) || isMasterAdmin) {
          loggedIn = true;
          recordSuccessfulAttempt(`superadmin_login_${cleanEmail}`);
          setCurrentAdminUser({ email: cleanEmail });
          localStorage.setItem(SUPERADMIN_STORAGE_KEY, cleanEmail);
          if (!localAdminPass) {
            localStorage.setItem(`libretadigital_superadmin_pwd_${cleanEmail}`, adminPassword);
          }
        } else {
          recordFailedAttempt(`superadmin_login_${cleanEmail}`, 5, 5);
          setAuthError('Contraseña de Super Admin incorrecta.');
          setAuthLoading(false);
          return;
        }
      }

      if (loggedIn) {
        setIsAuthenticated(true);
        loadAdminData();
      }
    } catch (err: any) {
      recordFailedAttempt(`superadmin_login_${cleanEmail}`, 5, 5);
      setAuthError(err.message || 'Error al autenticar Super Administrador.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Cerrar sesión de Super Admin
  const handleLogoutAdmin = async () => {
    if (confirm('¿Deseas cerrar sesión del portal Super Admin?')) {
      localStorage.removeItem(SUPERADMIN_STORAGE_KEY);
      const supabase = createClient();
      if (supabase) {
        try {
          await supabase.auth.signOut();
        } catch (e) {}
      }
      setIsAuthenticated(false);
      setCurrentAdminUser(null);
      setAdminPassword('');
    }
  };

  // Cambiar contraseña propia desde dentro del panel
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError('');
    setChangePassMsg('');

    if (newPasswordInput.length < 6) {
      setChangePassError('La nueva contraseña debe tener mínimo 6 caracteres.');
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      setChangePassError('Las contraseñas no coinciden.');
      return;
    }

    setChangePassLoading(true);

    try {
      const supabase = createClient();
      if (supabase) {
        const { error } = await supabase.auth.updateUser({
          password: newPasswordInput,
        });
        if (error) {
          console.warn('Aviso al actualizar contraseña en Supabase:', error.message);
        }
      }

      if (currentAdminUser?.email) {
        localStorage.setItem(`libretadigital_superadmin_pwd_${currentAdminUser.email}`, newPasswordInput);
      }

      setChangePassMsg('¡Contraseña de Super Admin actualizada exitosamente!');
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setNewPasswordInput('');
        setConfirmNewPasswordInput('');
        setChangePassMsg('');
      }, 2000);
    } catch (err: any) {
      setChangePassError(err.message || 'Error al actualizar contraseña.');
    } finally {
      setChangePassLoading(false);
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          setTenants(data);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Fallback a almacenamiento local en admin');
    }

    // Fallback local
    const stored = getStoredData();
    if (stored.tenant) {
      setTenants([stored.tenant]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated]);

  // Cambiar estado de suscripción de un comercio
  const handleToggleStatus = async (tenant: Tenant, newStatus: 'active' | 'past_due' | 'canceled' | 'trialing') => {
    const updated: Tenant = {
      ...tenant,
      sub_status: newStatus,
      updated_at: new Date().toISOString(),
    };

    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('tenants').update({ sub_status: newStatus }).eq('id', tenant.id);
      }
    } catch (e) {
      console.warn(e);
    }

    setTenants(tenants.map((t) => (t.id === tenant.id ? updated : t)));
    saveTenant(updated);
  };

  // Abrir modal de edición de licencia y prórroga
  const openEditLicenseModal = (t: Tenant) => {
    setEditingLicenseTenant(t);
    setLicensePlan((t.subscription_plan as any) || 'pro_monthly');
    setLicenseStatus(t.sub_status);

    const baseDate = t.subscription_ends_at
      ? new Date(t.subscription_ends_at)
      : t.trial_ends_at
      ? new Date(t.trial_ends_at)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const yyyy = baseDate.getFullYear();
    const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
    const dd = String(baseDate.getDate()).padStart(2, '0');
    setLicenseEndDate(`${yyyy}-${mm}-${dd}`);
    setLicenseAdminNote('');
    setLicenseSuccessMsg('');
  };

  // Conceder días rápidos de prórroga
  const handleAddGraceDays = (days: number) => {
    const currentEnd = licenseEndDate ? new Date(licenseEndDate + 'T23:59:59') : new Date();
    // Si la fecha ya expiró en el pasado, sumar a partir de hoy
    const base = currentEnd.getTime() < Date.now() ? new Date() : currentEnd;
    const newDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getDate()).padStart(2, '0');
    setLicenseEndDate(`${yyyy}-${mm}-${dd}`);

    // Si estaba vencido o cancelado, reactivar inmediatamente para que no esté bloqueado
    if (licenseStatus === 'past_due' || licenseStatus === 'canceled') {
      setLicenseStatus('active');
    }
  };

  // Guardar cambios de licencia y prórroga
  const handleSaveLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLicenseTenant || !licenseEndDate) return;
    setSavingLicense(true);

    try {
      const newEndsAtIso = new Date(licenseEndDate + 'T23:59:59').toISOString();
      const updatedTenant: Tenant = {
        ...editingLicenseTenant,
        subscription_plan: licensePlan,
        sub_status: licenseStatus,
        subscription_ends_at: newEndsAtIso,
        updated_at: new Date().toISOString(),
      };

      const supabase = createClient();
      if (supabase) {
        await supabase
          .from('tenants')
          .update({
            subscription_plan: licensePlan,
            sub_status: licenseStatus,
            subscription_ends_at: newEndsAtIso,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingLicenseTenant.id);
      }

      setTenants(tenants.map((t) => (t.id === editingLicenseTenant.id ? updatedTenant : t)));
      saveTenant(updatedTenant);

      setLicenseSuccessMsg(`¡Licencia de ${updatedTenant.business_name} actualizada! Prórroga hasta ${new Date(newEndsAtIso).toLocaleDateString('es-PY')}`);

      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        setEditingLicenseTenant(null);
        setLicenseSuccessMsg('');
      }, 1600);
    } catch (err: any) {
      console.error('Error actualizando licencia:', err);
    } finally {
      setSavingLicense(false);
    }
  };

  // Crear almacén manualmente desde el Super Admin
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim()) return;

    setCreateLoading(true);
    const newTenant: Tenant = {
      id: crypto.randomUUID(),
      business_name: newBizName.trim(),
      tax_id: newTaxId.trim() || 'Sin RUC',
      phone: newPhone.trim(),
      address: newAddress.trim() || 'Central',
      currency_code: 'PYG',
      currency_symbol: '₲',
      subscription_plan: newPlan,
      sub_status: 'active',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('tenants').insert(newTenant);
      }
    } catch (e) {
      console.warn(e);
    }

    setTenants([newTenant, ...tenants]);
    saveTenant(newTenant);
    setShowCreateModal(false);
    setCreateLoading(false);
    setNewBizName('');
    setNewOwnerName('');
    setNewPhone('');
    setNewTaxId('');
    setNewAddress('');
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.tax_id && t.tax_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.phone && t.phone.includes(searchTerm));

    if (statusFilter === 'ACTIVE') return matchesSearch && t.sub_status === 'active';
    if (statusFilter === 'TRIALING') return matchesSearch && t.sub_status === 'trialing';
    if (statusFilter === 'PAST_DUE') return matchesSearch && (t.sub_status === 'past_due' || t.sub_status === 'canceled');
    return matchesSearch;
  });

  // SI NO ESTÁ AUTENTICADO: LOGIN PRIVADO DE SUPER ADMIN (CORREO + CONTRASEÑA PROPIA)
  if (!isAuthenticated) {
    const isLight = adminTheme === 'light';

    return (
      <div
        className={`min-h-screen flex flex-col justify-center items-center p-4 selection:bg-indigo-600 selection:text-white transition-colors duration-200 ${
          isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'
        }`}
      >
        <div
          className={`w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 border transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/80' : 'bg-slate-900 border-slate-800 shadow-2xl'
          }`}
        >
          {/* BOTÓN FLOTANTE CAMBIO DE TEMA Y VOLVER */}
          <div className="flex justify-between items-center">
            <Link
              href="/"
              className={`text-xs font-bold transition flex items-center gap-1 ${
                isLight ? 'text-indigo-600 hover:text-indigo-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              ← Ir a la Tienda (POS)
            </Link>

            <button
              onClick={toggleAdminTheme}
              className={`text-xs font-bold px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition cursor-pointer ${
                isLight
                  ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {isLight ? <Moon className="w-3.5 h-3.5 text-indigo-600" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isLight ? 'Tema Oscuro' : 'Tema Blanco'}</span>
            </button>
          </div>

          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-950">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Super Admin Privado
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Control global de la plataforma, almacenes y suscripciones SaaS con tus credenciales personales.
            </p>
          </div>

          {/* MENSAJE DE ERROR */}
          {authError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          {/* FORMULARIO ÚNICO DE INICIO DE SESIÓN CON CORREO Y CONTRASEÑA */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" /> Correo Electrónico de Administrador
              </label>
              <input
                type="email"
                required
                placeholder="admin@tuempresa.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" /> Contraseña de Super Admin
              </label>
              <div className="relative">
                <input
                  type={showAdminPassword ? "text" : "password"}
                  required
                  placeholder="Tu contraseña personal"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1 cursor-pointer"
                  title={showAdminPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end pt-1.5">
                <Link
                  href={`/recuperar-password?email=${encodeURIComponent(adminEmail || MASTER_FOUNDER_EMAIL)}`}
                  className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition"
                >
                  ¿Olvidaste tu contraseña o restablecer clave maestra? Haz clic aquí
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{authLoading ? 'Verificando...' : 'Acceder al Panel Maestro'}</span>
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800/80">
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition">
              ← Volver a la Pantalla Principal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD DE SUPER ADMIN AUTENTICADO
  const isLight = adminTheme === 'light';

  return (
    <div
      className={`min-h-screen p-4 sm:p-8 transition-colors duration-200 ${
        isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER SUPER ADMIN */}
        <div
          className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-3xl border transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
          }`}
        >
          <div className="flex items-center gap-4">
            <BrandLogo size="lg" theme={adminTheme} />
            <div className={`h-8 w-px hidden sm:block ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Super Admin — Plataforma
                </h1>
                <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[10px] font-bold rounded-full uppercase">
                  Acceso Maestro
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Sesión activa: <b className="text-indigo-600 dark:text-indigo-300">{currentAdminUser?.email || 'admin@libretadigital.com'}</b>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* TOGGLE TEMA BLANCO / OSCURO */}
            <button
              onClick={toggleAdminTheme}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Cambiar entre Tema Blanco y Tema Oscuro"
            >
              {isLight ? <Moon className="w-3.5 h-3.5 text-indigo-600" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isLight ? 'Tema Oscuro' : 'Tema Blanco'}</span>
            </button>

            {/* ACCESO EXCLUSIVO SUPER ADMIN AL DEMO (ALMACÉN DON MARIO) */}
            <button
              onClick={() => {
                loginDemoDonMario();
                window.open('/', '_blank');
              }}
              className="py-2 px-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition cursor-pointer"
              title="Abrir la Terminal Demo de Almacén Don Mario como Super Admin"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Abrir Demo (Don Mario)</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="py-2.5 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Registrar Almacén
            </button>

            <button
              onClick={() => setShowChangePasswordModal(true)}
              className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Cambiar mi contraseña de Super Admin"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-500" /> Cambiar Contraseña
            </button>

            <button
              onClick={loadAdminData}
              className={`p-2.5 rounded-xl transition border cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Recargar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleLogoutAdmin}
              className={`py-2.5 px-3 border text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer ${
                isLight
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-800/60'
              }`}
              title="Cerrar sesión de Super Admin"
            >
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
        </div>

        {/* MÉTRICAS GLOBALES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            className={`p-5 rounded-2xl border transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase block mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Comercios Totales
            </span>
            <div className={`text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{tenants.length}</div>
            <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1 mt-1">
              <Store className="w-3 h-3" /> En plataforma
            </span>
          </div>

          <div
            className={`p-5 rounded-2xl border transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase block mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Suscripciones Activas
            </span>
            <div className="text-3xl font-black text-emerald-500">
              {tenants.filter((t) => t.sub_status === 'active').length}
            </div>
            <span className={`text-[11px] font-medium flex items-center gap-1 mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Al día con plan
            </span>
          </div>

          <div
            className={`p-5 rounded-2xl border transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase block mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              1er Mes Bonificado
            </span>
            <div className="text-3xl font-black text-blue-500">
              {tenants.filter((t) => t.sub_status === 'trialing').length}
            </div>
            <span className={`text-[11px] font-medium flex items-center gap-1 mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              <Calendar className="w-3 h-3 text-blue-500" /> 1er mes suscripción sin costo
            </span>
          </div>

          <div
            className={`p-5 rounded-2xl border transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase block mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Vencidos / Morosos
            </span>
            <div className="text-3xl font-black text-rose-500">
              {tenants.filter((t) => t.sub_status === 'past_due' || t.sub_status === 'canceled').length}
            </div>
            <span className="text-[11px] text-rose-500 font-medium flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3" /> Requieren cobro
            </span>
          </div>
        </div>

        {/* TABLA DE ALMACENES */}
        <div
          className={`rounded-3xl overflow-hidden border transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
          }`}
        >
          <div
            className={`p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}
          >
            <div>
              <h2 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Store className="w-4 h-4 text-indigo-500" /> Gestión de Comercios y Licencias
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Administra los almacenes registrados, activa sus licencias o bloquea por falta de pago
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                <input
                  type="text"
                  placeholder="Buscar almacén, RUC, teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 border ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                  }`}
                />
              </div>

              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                title="Filtrar por Estado de Comercio"
                options={[
                  { value: 'ALL', label: 'Todos los Estados' },
                  { value: 'ACTIVE', label: 'Comercios Activos', badge: 'Activo' },
                  { value: 'TRIALING', label: 'En Periodo de Prueba', badge: 'Prueba' },
                  { value: 'PAST_DUE', label: 'Vencidos / Mora', badge: 'Vencido' },
                ]}
                className="min-w-[170px]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full text-left text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              <thead
                className={`uppercase text-[10px] tracking-wider border-b ${
                  isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-slate-950/60 text-slate-400 border-slate-800'
                }`}
              >
                <tr>
                  <th className="py-3 px-4">Comercio</th>
                  <th className="py-3 px-4">Contacto / RUC</th>
                  <th className="py-3 px-4">Moneda</th>
                  <th className="py-3 px-4">Plan Actual</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Vencimiento</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {filteredTenants.map((t) => {
                  const isTrial = t.sub_status === 'trialing';
                  const isActive = t.sub_status === 'active';
                  const isPastDue = t.sub_status === 'past_due' || t.sub_status === 'canceled';

                  return (
                    <tr
                      key={t.id}
                      className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}
                    >
                      <td className={`py-3.5 px-4 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center text-xs font-black">
                            {t.business_name.charAt(0)}
                          </div>
                          <div>
                            <span className="block">{t.business_name}</span>
                            <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                              {t.address || 'Central'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className={`py-3.5 px-4 font-mono text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        <div>{t.phone}</div>
                        <div className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                          RUC: {t.tax_id || 'Sin RUC'}
                        </div>
                      </td>

                      <td className={`py-3.5 px-4 font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                        {t.currency_code} ({t.currency_symbol})
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase border ${
                            isLight
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {t.subscription_plan}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {isActive && (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-full">
                            Activo
                          </span>
                        )}
                        {isTrial && (
                          <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] font-bold rounded-full">
                            Prueba (Trial)
                          </span>
                        )}
                        {isPastDue && (
                          <span className="px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold rounded-full">
                            Vencido
                          </span>
                        )}
                      </td>

                      <td className={`py-3.5 px-4 font-mono text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {t.subscription_ends_at
                          ? new Date(t.subscription_ends_at).toLocaleDateString('es-PY')
                          : new Date(t.trial_ends_at).toLocaleDateString('es-PY')}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(t.id === '019339aa-7824-7662-8e39-165f123d9101' || t.business_name.toLowerCase().includes('don mario')) && (
                            <button
                              onClick={() => {
                                loginDemoDonMario();
                                window.open('/', '_blank');
                              }}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                              title="Abrir la Terminal Demo de este comercio como Super Admin"
                            >
                              <Store className="w-3 h-3" />
                              <span>Entrar Demo</span>
                            </button>
                          )}

                          <button
                            onClick={() => openEditLicenseModal(t)}
                            className={`px-2.5 py-1 border text-[10px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${
                              isLight
                                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                : 'bg-indigo-500/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border-indigo-500/40'
                            }`}
                            title="Cambiar Plan o Conceder Prórroga Temporal"
                          >
                            <Settings className="w-3 h-3 text-indigo-500" />
                            <span>Plan / Prórroga</span>
                          </button>

                          {t.sub_status !== 'active' ? (
                            <button
                              onClick={() => handleToggleStatus(t, 'active')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                              title="Activar Suscripción Mensual"
                            >
                              Activar Plan
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(t, 'past_due')}
                              className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[10px] font-bold rounded-lg border border-rose-700 transition cursor-pointer"
                              title="Marcar Vencido / Bloquear"
                            >
                              Bloquear
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL CAMBIAR CONTRASEÑA DE SUPER ADMIN */}
        {showChangePasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div
              className={`rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative border ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center absolute top-4 right-4 transition cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                <X className="w-4 h-4" />
              </button>

              <div className={`flex items-center gap-3 border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Cambiar Mi Contraseña</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Super Admin: {currentAdminUser?.email}</p>
                </div>
              </div>

              {changePassError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{changePassError}</span>
                </div>
              )}

              {changePassMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{changePassMsg}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3 pt-1">
                <div>
                  <label className={`text-xs font-bold mb-1 block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Nueva Contraseña Privada
                  </label>
                  <div className="relative">
                    <input
                      type={showModalNewPassword ? "text" : "password"}
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className={`w-full pl-3 pr-10 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 border ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalNewPassword(!showModalNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1 cursor-pointer"
                      title={showModalNewPassword ? "Ocultar contraseña" : "Ver contraseña"}
                    >
                      {showModalNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-bold mb-1 block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showModalConfirmPassword ? "text" : "password"}
                      required
                      placeholder="Repite tu nueva contraseña"
                      value={confirmNewPasswordInput}
                      onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                      className={`w-full pl-3 pr-10 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 border ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalConfirmPassword(!showModalConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1 cursor-pointer"
                      title={showModalConfirmPassword ? "Ocultar contraseña" : "Ver contraseña"}
                    >
                      {showModalConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePasswordModal(false)}
                    className={`w-1/2 py-2.5 font-bold rounded-xl text-xs transition cursor-pointer ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={changePassLoading}
                    className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>{changePassLoading ? 'Guardando...' : 'Actualizar Clave'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CREAR ALMACÉN MANUAL */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div
              className={`rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative border ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center absolute top-4 right-4 transition cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                <X className="w-4 h-4" />
              </button>

              <div className={`flex items-center gap-3 border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Alta Manual de Almacén</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Registra un nuevo comercio con licencia activa
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateTenant} className="space-y-3 pt-1">
                <div>
                  <label className={`text-xs font-bold mb-1 block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Nombre del Comercio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Autoservicio Don Mario"
                    value={newBizName}
                    onChange={(e) => setNewBizName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 border ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-xs font-bold mb-1 block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 0981123456"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 border ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-xs font-bold mb-1 block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      RUC / Cédula
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 80012345-6"
                      value={newTaxId}
                      onChange={(e) => setNewTaxId(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 border ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-bold mb-1 block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Dirección / Ubicación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Avda. Principal 1420"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 border ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-bold mb-1 block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Plan a Asignar
                  </label>
                  <CustomSelect
                    value={newPlan}
                    onChange={(val) => setNewPlan(String(val))}
                    title="Seleccionar Plan de Suscripción"
                    options={[
                      { value: 'pro_monthly', label: 'Plan Comercio PRO', badge: 'Recomendado', sublabel: 'Acceso total y soporte prioritario' },
                      { value: 'vecinal_monthly', label: 'Plan Vecinal', sublabel: 'Hasta 50 clientes activos' },
                      { value: 'cadena_monthly', label: 'Plan Multi-Sucursal', sublabel: 'Múltiples cajas y sucursales' },
                    ]}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className={`w-1/2 py-2.5 font-bold rounded-xl text-xs transition cursor-pointer ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>{createLoading ? 'Creando...' : 'Crear y Activar Licencia'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL GESTIONAR LICENCIA Y PRÓRROGA TEMPORAL */}
        {editingLicenseTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div
              className={`rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative border ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              <button
                onClick={() => setEditingLicenseTenant(null)}
                className={`w-8 h-8 rounded-full flex items-center justify-center absolute top-4 right-4 transition cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                <X className="w-4 h-4" />
              </button>

              <div className={`flex items-center gap-3 border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Gestionar Licencia y Prórroga
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Almacén: <b className={isLight ? 'text-slate-900' : 'text-white'}>{editingLicenseTenant.business_name}</b> (RUC: {editingLicenseTenant.tax_id || 'Sin RUC'})
                  </p>
                </div>
              </div>

              {licenseSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{licenseSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveLicense} className="space-y-4 pt-1">
                {/* SELECCIÓN DE PLAN */}
                <div>
                  <label className={`text-xs font-bold mb-1.5 block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Plan de Suscripción Manual
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'vecinal_monthly', label: 'Vecinal', desc: 'Básico' },
                      { id: 'pro_monthly', label: 'Pro Almacén', desc: 'Estándar' },
                      { id: 'cadena_monthly', label: 'Cadena', desc: 'Multi-Caja' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setLicensePlan(p.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          licensePlan === p.id
                            ? isLight
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-sm ring-1 ring-indigo-500'
                              : 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500'
                            : isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-black">{p.label}</div>
                        <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ESTADO DE LA LICENCIA */}
                <div>
                  <label className={`text-xs font-bold mb-1.5 block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Estado de la Cuenta
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'active', label: 'Activo / Prórroga', color: 'emerald' },
                      { id: 'trialing', label: 'Prueba (Trial)', color: 'blue' },
                      { id: 'past_due', label: 'Vencido / Bloqueado', color: 'rose' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setLicenseStatus(st.id as any)}
                        className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                          licenseStatus === st.id
                            ? st.color === 'emerald'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500'
                              : st.color === 'blue'
                              ? 'bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-300 ring-1 ring-blue-500'
                              : 'bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-300 ring-1 ring-rose-500'
                            : isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold">{st.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* EXTENSIÓN TEMPORAL / DÍAS DE GRACIA */}
                <div
                  className={`p-4 rounded-2xl space-y-3 border ${
                    isLight ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-950/70 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Conceder Prórroga Rápida
                    </span>
                    <span className={`text-[10px] ${isLight ? 'text-amber-800' : 'text-slate-400'}`}>
                      Extiende días y desbloquea
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { days: 3, label: '+3 días' },
                      { days: 5, label: '+5 días' },
                      { days: 7, label: '+7 días' },
                      { days: 15, label: '+15 días' },
                      { days: 30, label: '+30 días' },
                    ].map((b) => (
                      <button
                        key={b.days}
                        type="button"
                        onClick={() => handleAddGraceDays(b.days)}
                        className={`py-1.5 px-1 border rounded-lg text-xs font-black transition active:scale-95 cursor-pointer ${
                          isLight
                            ? 'bg-white hover:bg-amber-500 text-amber-900 hover:text-white border-amber-300 shadow-xs'
                            : 'bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border-amber-500/30'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className={`text-[11px] font-bold mb-1 block ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                      Fecha Límite de Vencimiento:
                    </label>
                    <CustomDateInput
                      value={licenseEndDate}
                      onChange={(val) => setLicenseEndDate(val)}
                      label="Fecha de Vencimiento"
                      className="w-full"
                    />
                    <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                      El comercio podrá registrar ventas y cobros sin bloqueo hasta el fin de este día.
                    </p>
                  </div>
                </div>

                {/* NOTA ADMINISTRATIVA */}
                <div>
                  <label className={`text-xs font-bold mb-1 block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Nota Administrativa Interna (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Prometió pagar en efectivo este viernes / Acuerdo de pago"
                    value={licenseAdminNote}
                    onChange={(e) => setLicenseAdminNote(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 border ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                        : 'bg-slate-950 border-slate-800 text-white placeholder-slate-600'
                    }`}
                  />
                </div>

                {/* BOTONES ACCIÓN */}
                <div className={`flex gap-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                  <button
                    type="button"
                    onClick={() => setEditingLicenseTenant(null)}
                    className={`w-1/3 py-2.5 font-bold rounded-xl text-xs transition cursor-pointer ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingLicense}
                    className="w-2/3 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{savingLicense ? 'Guardando Prórroga...' : 'Guardar y Aplicar Prórroga'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
