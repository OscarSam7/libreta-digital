'use client';

import React, { useState } from 'react';
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
  X
} from 'lucide-react';

interface MockTenantAccount {
  id: string;
  business_name: string;
  owner_name: string;
  email: string;
  country: 'PY' | 'BR' | 'PE';
  currency_code: string;
  plan: 'trial' | 'basic' | 'pro' | 'unlimited';
  sub_status: 'trialing' | 'active' | 'past_due' | 'canceled';
  active_customers_count: number;
  total_receivable: number;
  trial_days_left: number;
  created_at: string;
}

export function SuperAdminDashboard({ onClose }: { onClose?: () => void }) {
  const [tenants, setTenants] = useState<MockTenantAccount[]>([
    {
      id: 'ten-01',
      business_name: 'Almacén Don Mario',
      owner_name: 'Mario Gómez',
      email: 'mario@almacendonmario.com',
      country: 'PY',
      currency_code: 'PYG',
      plan: 'pro',
      sub_status: 'active',
      active_customers_count: 142,
      total_receivable: 14850000,
      trial_days_left: 0,
      created_at: '2026-10-10',
    },
    {
      id: 'ten-02',
      business_name: 'Minimercado da Vila',
      owner_name: 'Lucas Silva',
      email: 'lucas@mercadodavila.com.br',
      country: 'BR',
      currency_code: 'BRL',
      plan: 'pro',
      sub_status: 'active',
      active_customers_count: 88,
      total_receivable: 12400,
      trial_days_left: 0,
      created_at: '2026-10-18',
    },
    {
      id: 'ten-03',
      business_name: 'Bodega Santa Rosa',
      owner_name: 'Rosa Quispe',
      email: 'rosa@bodegasantarosa.pe',
      country: 'PE',
      currency_code: 'PEN',
      plan: 'basic',
      sub_status: 'trialing',
      active_customers_count: 24,
      total_receivable: 3450,
      trial_days_left: 8,
      created_at: '2026-11-08',
    },
    {
      id: 'ten-04',
      business_name: 'Kiosco El Trébol',
      owner_name: 'Carlos Benítez',
      email: 'carlos@eltrebol.py',
      country: 'PY',
      currency_code: 'PYG',
      plan: 'trial',
      sub_status: 'past_due',
      active_customers_count: 31,
      total_receivable: 4100000,
      trial_days_left: 0,
      created_at: '2026-10-25',
    },
  ]);

  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<'ALL' | 'PY' | 'BR' | 'PE'>('ALL');

  // Cálculos SaaS Globales
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.sub_status === 'active').length;
  const trialTenants = tenants.filter((t) => t.sub_status === 'trialing').length;
  const pastDueTenants = tenants.filter((t) => t.sub_status === 'past_due').length;

  // Ingreso Recurrente Estimado (MRR en USD)
  const estimatedMRR = tenants.reduce((acc, t) => {
    if (t.sub_status !== 'active') return acc;
    if (t.plan === 'basic') return acc + 12;
    if (t.plan === 'pro') return acc + 24;
    if (t.plan === 'unlimited') return acc + 45;
    return acc;
  }, 0);

  const filteredTenants = tenants.filter((t) => {
    const matchSearch =
      t.business_name.toLowerCase().includes(search.toLowerCase()) ||
      t.owner_name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;
    if (selectedCountry !== 'ALL' && t.country !== selectedCountry) return false;
    return true;
  });

  const toggleTenantStatus = (id: string) => {
    setTenants(
      tenants.map((t) => {
        if (t.id === id) {
          const newStatus = t.sub_status === 'active' ? 'past_due' : 'active';
          return { ...t, sub_status: newStatus };
        }
        return t;
      })
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-slate-200 animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex justify-between items-start pb-5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900">SuperAdmin Platform</h1>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                  Dueño SaaS
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Monitoreo multitenant global: Paraguay, Brasil y Perú
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Métricas Globales SaaS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5 shrink-0">
          <div className="bg-slate-950 text-white p-4 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">MRR Estimado</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">${estimatedMRR} USD</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Ingresos recurrentes/mes</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Comercios Activos</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{activeTenants}</div>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Suscripciones vigentes</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">En Trial (14 días)</span>
            <div className="text-2xl font-black text-blue-600 mt-1">{trialTenants}</div>
            <p className="text-[10px] text-slate-500 mt-0.5">En período de prueba</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Mora / Vencidos</span>
            <div className="text-2xl font-black text-rose-600 mt-1">{pastDueTenants}</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Bloqueados para carga</p>
          </div>
        </div>

        {/* Filtros y Buscador */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar comercio, dueño o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setSelectedCountry('ALL')}
              className={`px-3 py-1 rounded-lg transition ${
                selectedCountry === 'ALL' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedCountry('PY')}
              className={`px-3 py-1 rounded-lg transition ${
                selectedCountry === 'PY' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              🇵🇾 Paraguay
            </button>
            <button
              onClick={() => setSelectedCountry('BR')}
              className={`px-3 py-1 rounded-lg transition ${
                selectedCountry === 'BR' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              🇧🇷 Brasil
            </button>
            <button
              onClick={() => setSelectedCountry('PE')}
              className={`px-3 py-1 rounded-lg transition ${
                selectedCountry === 'PE' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              🇵🇪 Perú
            </button>
          </div>
        </div>

        {/* Tabla de Comercios Registrados */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="p-3">Comercio / Dueño</th>
                <th className="p-3">País / Moneda</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Clientes Activos</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTenants.map((ten) => (
                <tr key={ten.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{ten.business_name}</div>
                    <div className="text-[11px] text-slate-400">
                      {ten.owner_name} • {ten.email}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="font-bold">
                      {ten.country === 'PY' ? '🇵🇾 PYG' : ten.country === 'BR' ? '🇧🇷 BRL' : '🇵🇪 PEN'}
                    </span>
                  </td>
                  <td className="p-3 font-semibold uppercase text-[11px]">
                    Plan {ten.plan}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ten.sub_status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : ten.sub_status === 'trialing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {ten.sub_status === 'active'
                        ? 'Activo'
                        : ten.sub_status === 'trialing'
                        ? `Trial (${ten.trial_days_left}d)`
                        : 'Vencido'}
                    </span>
                  </td>
                  <td className="p-3 font-semibold">
                    {ten.active_customers_count} cuentas
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => toggleTenantStatus(ten.id)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                        ten.sub_status === 'active'
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {ten.sub_status === 'active' ? 'Suspender' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
