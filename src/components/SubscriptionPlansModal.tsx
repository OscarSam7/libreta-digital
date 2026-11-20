'use client';

import React, { useState } from 'react';
import { Check, ShieldCheck, Zap, X, CreditCard, QrCode } from 'lucide-react';
import { Tenant } from '@/types';
import { saveTenant } from '@/lib/storage';

interface Props {
  tenant: Tenant;
  onClose: () => void;
  onPlanUpdated: () => void;
}

export function SubscriptionPlansModal({ tenant, onClose, onPlanUpdated }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | 'unlimited'>('pro');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Precios según la moneda del comercio
  const getPrice = (plan: 'basic' | 'pro' | 'unlimited') => {
    switch (tenant.currency_code) {
      case 'PYG':
        return plan === 'basic' ? '₲ 85.000' : plan === 'pro' ? '₲ 165.000' : '₲ 290.000';
      case 'BRL':
        return plan === 'basic' ? 'R$ 59' : plan === 'pro' ? 'R$ 119' : 'R$ 199';
      case 'PEN':
        return plan === 'basic' ? 'S/ 39' : plan === 'pro' ? 'S/ 79' : 'S/ 139';
      default:
        return plan === 'basic' ? '$ 12' : plan === 'pro' ? '$ 24' : '$ 45';
    }
  };

  const handleSubscribe = () => {
    setProcessing(true);
    setTimeout(() => {
      const updated: Tenant = {
        ...tenant,
        subscription_plan: selectedPlan === 'basic' ? 'Básico' : selectedPlan === 'pro' ? 'Pro' : 'Ilimitado',
        sub_status: 'active',
        subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      saveTenant(updated);
      setProcessing(false);
      setSuccess(true);
      setTimeout(() => {
        onPlanUpdated();
        onClose();
      }, 1400);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 my-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center max-w-md mx-auto mb-6">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            Planes y Suscripción SaaS
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-2">
            Elige el Plan para tu Negocio
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Recupera tu dinero, elimina las cuentas dudosas y dale a tus clientes certeza total.
          </p>
        </div>

        {/* Grilla de Planes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
          {/* Plan Básico */}
          <div
            onClick={() => setSelectedPlan('basic')}
            className={`cursor-pointer rounded-2xl p-4 border-2 transition relative flex flex-col justify-between ${
              selectedPlan === 'basic'
                ? 'border-blue-600 bg-blue-50/30 shadow-md'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <h3 className="font-black text-slate-900 text-sm">Básico</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Kiosco / Despensa pequeña</p>
              <div className="text-xl font-black text-slate-900 mt-3">
                {getPrice('basic')}
                <span className="text-[10px] font-medium text-slate-400">/mes</span>
              </div>
              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Hasta 60 clientes</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>1 Usuario mostrador</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Tarjetas QR Imprimibles</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Plan Pro (Destacado) */}
          <div
            onClick={() => setSelectedPlan('pro')}
            className={`cursor-pointer rounded-2xl p-4 border-2 transition relative flex flex-col justify-between ${
              selectedPlan === 'pro'
                ? 'border-indigo-600 bg-indigo-50/40 shadow-lg ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="absolute -top-2.5 right-4 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
              Más Vendido
            </div>
            <div>
              <h3 className="font-black text-indigo-950 text-sm flex items-center gap-1">
                <span>Pro</span>
                <Zap className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Almacén y Minimarket</p>
              <div className="text-xl font-black text-indigo-950 mt-3">
                {getPrice('pro')}
                <span className="text-[10px] font-medium text-slate-400">/mes</span>
              </div>
              <ul className="mt-4 space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-1.5 font-bold">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Hasta 250 clientes</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Hasta 3 Cajeros</span>
                </li>
                <li className="flex items-center gap-1.5 font-bold text-indigo-900">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Doble Firma con PIN</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Alertas de Límite Crédito</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Plan Ilimitado */}
          <div
            onClick={() => setSelectedPlan('unlimited')}
            className={`cursor-pointer rounded-2xl p-4 border-2 transition relative flex flex-col justify-between ${
              selectedPlan === 'unlimited'
                ? 'border-slate-900 bg-slate-50 shadow-md'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <h3 className="font-black text-slate-900 text-sm">Ilimitado</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Cadenas / Mayoristas</p>
              <div className="text-xl font-black text-slate-900 mt-3">
                {getPrice('unlimited')}
                <span className="text-[10px] font-medium text-slate-400">/mes</span>
              </div>
              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Clientes Ilimitados</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Cajeros Ilimitados</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Múltiples Sucursales</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Pasarelas Locales de Pago */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>
              Pagos automáticos habilitados con <b>Pix</b> (BR), <b>Zimple/Bancard</b> (PY) y <b>Yape/Plin</b> (PE).
            </span>
          </div>
          <span className="text-emerald-700 font-bold bg-emerald-100/80 px-2.5 py-1 rounded-full whitespace-nowrap">
            ✓ Activación Inmediata
          </span>
        </div>

        {/* Botón de Confirmación */}
        <button
          onClick={handleSubscribe}
          disabled={processing || success}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition text-base disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {success ? (
            <>
              <Check className="w-5 h-5 text-white" />
              <span>¡Suscripción Activada Exitosamente!</span>
            </>
          ) : processing ? (
            <span>Conectando con pasarela local...</span>
          ) : (
            <span>Confirmar Plan {selectedPlan.toUpperCase()} ({getPrice(selectedPlan)}/mes)</span>
          )}
        </button>
      </div>
    </div>
  );
}
