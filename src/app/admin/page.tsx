'use client';

import React, { useState, useEffect } from 'react';
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
  UserCheck
} from 'lucide-react';
import { Tenant } from '@/types';
import { getStoredData, saveTenant } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import { BrandLogo } from '@/components/BrandLogo';

export default function SuperAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

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

  // Verificación de clave maestra (por defecto 'admin2026*' o 'admin123')
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'admin2026*' || adminPassword === 'admin123' || adminPassword === 'superadmin') {
      setIsAuthenticated(true);
      setAuthError('');
      loadAdminData();
    } else {
      setAuthError('Contraseña de Super Administrador incorrecta.');
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
        await supabase.from('tenants').update({ sub_status: newStatus, updated_at: new Date().toISOString() }).eq('id', tenant.id);
      }
    } catch (e) {
      console.warn(e);
    }

    setTenants(tenants.map((t) => (t.id === tenant.id ? updated : t)));
    saveTenant(updated);
  };

  // Extender 14 días de prueba
  const handleExtendTrial = async (tenant: Tenant) => {
    const newTrialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const updated: Tenant = {
      ...tenant,
      trial_ends_at: newTrialEnds,
      sub_status: 'trialing',
      updated_at: new Date().toISOString(),
    };

    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('tenants').update({ trial_ends_at: newTrialEnds, sub_status: 'trialing' }).eq('id', tenant.id);
      }
    } catch (e) {
      console.warn(e);
    }

    setTenants(tenants.map((t) => (t.id === tenant.id ? updated : t)));
    saveTenant(updated);
  };

  // Ingresar como ese comercio en el panel
  const handleImpersonate = (tenant: Tenant) => {
    saveTenant(tenant);
    window.location.href = '/';
  };

  // Crear nuevo comercio desde SuperAdmin
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
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

  // Si no está autenticado, mostrar pantalla de login de Super Admin
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-center text-white mb-1">
            Super Admin Portal
          </h1>
          <p className="text-xs text-center text-slate-400 mb-6">
            Acceso Maestro para Gestión Global de Almacenes y Plataforma
          </p>

          {authError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" /> Clave Maestra de Administrador
              </label>
              <input
                type="password"
                required
                placeholder="Ingresa clave maestra (ej: admin2026*)"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition"
            >
              <ShieldCheck className="w-4 h-4" /> Ingresar al Panel Maestro
            </button>
          </form>

          <div className="text-center mt-6">
            <a href="/" className="text-xs text-slate-500 hover:text-slate-300 transition">
              ← Volver al Panel de Comercio
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard de Super Admin
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER SUPER ADMIN */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-4">
            <BrandLogo size="lg" theme="dark" />
            <div className="h-8 w-px bg-slate-800 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">Super Admin — Plataforma</h1>
                <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold rounded-full uppercase">
                  Acceso Total
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Monitoreo global de comercios, suscripciones, ingresos recurrentes y soporte técnico
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowCreateModal(true)}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-950 transition"
            >
              <Plus className="w-4 h-4" /> Registrar Almacén
            </button>
            <button
              onClick={loadAdminData}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="Recargar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <a
              href="/"
              className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1 transition"
            >
              Ir a POS <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* MÉTRICAS GLOBALES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Comercios Totales
            </span>
            <div className="text-3xl font-black text-white">{tenants.length}</div>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <Store className="w-3 h-3" /> En plataforma
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Suscripciones Activas
            </span>
            <div className="text-3xl font-black text-emerald-400">
              {tenants.filter((t) => t.sub_status === 'active').length}
            </div>
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Al día con plan
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              En Periodo de Prueba
            </span>
            <div className="text-3xl font-black text-amber-400">
              {tenants.filter((t) => t.sub_status === 'trialing').length}
            </div>
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3 text-amber-400" /> 14 días gratis
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Vencidos / Suspendidos
            </span>
            <div className="text-3xl font-black text-rose-400">
              {tenants.filter((t) => t.sub_status === 'past_due' || t.sub_status === 'canceled').length}
            </div>
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3 text-rose-400" /> Requieren pago
            </span>
          </div>
        </div>

        {/* TABLA DE COMERCIOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Directorio de Almacenes Registrados</h2>
              <p className="text-xs text-slate-400">
                Gestiona suscripciones, estados de cuenta y brinda asistencia técnica
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar almacén, RUC, tel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 w-full sm:w-60 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="ACTIVE">Activos</option>
                <option value="TRIALING">En Prueba</option>
                <option value="PAST_DUE">Vencidos</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Comercio / RUC</th>
                  <th className="py-3 px-4">Contacto / Teléfono</th>
                  <th className="py-3 px-4">Plan SaaS</th>
                  <th className="py-3 px-4">Estado Suscripción</th>
                  <th className="py-3 px-4">Registro</th>
                  <th className="py-3 px-4 text-right">Acciones de Super Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No se encontraron almacenes con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{t.business_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          RUC: {t.tax_id || 'Sin RUC'} • {t.address || 'Sin dirección'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-300 font-medium">{t.phone || 'Sin tel'}</div>
                        <div className="text-[10px] text-slate-500">Moneda: {t.currency_code} ({t.currency_symbol})</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-lg font-bold text-[11px] uppercase">
                          {t.subscription_plan || 'Pro'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {t.sub_status === 'active' && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md font-bold text-[10px] uppercase">
                            Activo
                          </span>
                        )}
                        {t.sub_status === 'trialing' && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-md font-bold text-[10px] uppercase">
                            Prueba Gratis
                          </span>
                        )}
                        {(t.sub_status === 'past_due' || t.sub_status === 'canceled') && (
                          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-md font-bold text-[10px] uppercase">
                            Vencido
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.sub_status !== 'active' ? (
                            <button
                              onClick={() => handleToggleStatus(t, 'active')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] transition"
                              title="Activar suscripción"
                            >
                              Activar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(t, 'past_due')}
                              className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg font-bold text-[11px] transition"
                              title="Suspender acceso por falta de pago"
                            >
                              Suspender
                            </button>
                          )}

                          <button
                            onClick={() => handleExtendTrial(t)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold transition"
                            title="Extender 14 días más de prueba"
                          >
                            +14d Prueba
                          </button>

                          <button
                            onClick={() => handleImpersonate(t)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition"
                            title="Ingresar como este almacén en el panel POS"
                          >
                            Entrar <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL CREAR ALMACÉN DESDE SUPER ADMIN */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Registrar Nuevo Almacén</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Nombre del Almacén / Comercio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Despensa Doña Juana"
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Nombre del Propietario / Responsable
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juana Rodríguez"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 0981 123456"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    RUC / Cédula Comercial
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 80012345-6"
                    value={newTaxId}
                    onChange={(e) => setNewTaxId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Dirección o Ciudad
                </label>
                <input
                  type="text"
                  placeholder="Ej: Avda. Principal 450, Asunción"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Plan Inicial
                </label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="free_trial">Prueba Gratuita (14 días)</option>
                  <option value="basic_monthly">Plan Básico Mensual</option>
                  <option value="pro_monthly">Plan Pro Ilimitado</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-950"
                >
                  {createLoading ? 'Creando...' : 'Crear y Habilitar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
