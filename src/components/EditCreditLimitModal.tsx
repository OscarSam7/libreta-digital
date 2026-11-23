'use client';

import React, { useState } from 'react';
import { Customer, Tenant } from '@/types';
import { getStoredData, saveCustomers } from '@/lib/storage';
import { validateAmount } from '@/lib/validation';
import { computeSuggestedDueDate, getCustomerDueStatus } from '@/lib/overdue';
import { CustomDateInput } from '@/components/ui/CustomDatePickerModal';
import { CreditCard, ShieldAlert, Check, X, AlertTriangle, Calendar, Clock } from 'lucide-react';

interface Props {
  customer: Customer;
  tenant: Tenant;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditCreditLimitModal({ customer, tenant, onClose, onSuccess }: Props) {
  const [creditLimit, setCreditLimit] = useState(customer.credit_limit.toString());
  const [paymentDueDate, setPaymentDueDate] = useState(customer.payment_due_date || '');
  const [isBlocked, setIsBlocked] = useState(customer.is_blocked);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const formatCurrency = (val: number) => {
    return `${tenant.currency_symbol} ${new Intl.NumberFormat().format(val)}`;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const validation = validateAmount(creditLimit, 0, 10_000_000_000);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'El límite de crédito debe ser 0 o un monto válido.');
      return;
    }
    const parsedLimit = validation.value;

    setLoading(true);

    const { customers } = getStoredData();
    const custIndex = customers.findIndex((c) => c.id === customer.id);

    if (custIndex === -1) {
      setErrorMsg('Cliente no encontrado.');
      setLoading(false);
      return;
    }

    const updatedCustomer: Customer = {
      ...customers[custIndex],
      credit_limit: parsedLimit,
      payment_due_date: paymentDueDate || undefined,
      terms_acceptance_metadata: {
        ...(customers[custIndex].terms_acceptance_metadata || {}),
        payment_due_date: paymentDueDate || null,
      },
      is_blocked: isBlocked,
      updated_at: new Date().toISOString(),
    };

    customers[custIndex] = updatedCustomer;
    saveCustomers(customers);

    setLoading(false);
    onSuccess();
    onClose();
  };

  const isOverWithNewLimit =
    parseFloat(creditLimit) > 0 && customer.current_balance > parseFloat(creditLimit);

  const duePreview = getCustomerDueStatus({
    current_balance: customer.current_balance,
    payment_due_date: paymentDueDate || undefined,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative border border-slate-100 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom font-sans">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Gestión Financiera
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-0.5 truncate">
              {customer.full_name}
            </h3>
            {customer.nickname && (
              <p className="text-xs text-slate-400 font-semibold">"{customer.nickname}"</p>
            )}
          </div>
        </div>

        {/* Estado actual de la deuda */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 mb-4 flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-400 uppercase font-bold text-[10px] block">
              Saldo Deudor Actual
            </span>
            <span className="text-base font-black text-slate-900">
              {formatCurrency(customer.current_balance)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 uppercase font-bold text-[10px] block">
              Límite Anterior
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {customer.credit_limit > 0 ? formatCurrency(customer.credit_limit) : 'Sin límite'}
            </span>
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 mb-3">
            {errorMsg}
          </p>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Límite de Crédito */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Nuevo Límite de Crédito ({tenant.currency_symbol})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">
                {tenant.currency_symbol}
              </span>
              <input
                type="number"
                step="any"
                required
                autoFocus
                placeholder="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full text-2xl font-black pl-10 pr-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Ingresa 0 para crédito sin límite tope.
            </span>
          </div>

          {/* Fecha de Vencimiento de Pago & Mora */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Fecha de Vencimiento de Pago</span>
              </label>
              {paymentDueDate && (
                <button
                  type="button"
                  onClick={() => setPaymentDueDate('')}
                  className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Quitar
                </button>
              )}
            </div>

            <CustomDateInput
              value={paymentDueDate}
              onChange={(val) => setPaymentDueDate(val)}
              label="Vencimiento de Pago"
              className="w-full"
            />

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: '7D', label: '+7 días' },
                  { id: '15D', label: '+15 días' },
                  { id: '30D', label: '+30 días' },
                  { id: 'END_OF_MONTH', label: 'Fin de mes' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPaymentDueDate(computeSuggestedDueDate(preset.id))}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {paymentDueDate && (
              <div
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                  duePreview.state === 'OVERDUE'
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : duePreview.state === 'DUE_TODAY'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : duePreview.state === 'UPCOMING'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Vencimiento {duePreview.dueDateFormatted} • {duePreview.label}
                </span>
              </div>
            )}
          </div>

          {/* Advertencia si la deuda actual supera el nuevo límite */}
          {isOverWithNewLimit && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs font-medium text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                El saldo actual ({formatCurrency(customer.current_balance)}) supera este nuevo límite. Se bloquearán nuevas compras hasta que abone.
              </span>
            </div>
          )}

          {/* Bloqueo Preventivo de Nuevas Compras */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-800 block">Bloquear Crédito</span>
              <span className="text-[11px] text-slate-400">
                Impide que el cliente retire fiado aunque tenga margen
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isBlocked}
                onChange={(e) => setIsBlocked(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
