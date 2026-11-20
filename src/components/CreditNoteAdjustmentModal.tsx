'use client';

import React, { useState } from 'react';
import { Transaction, Customer, Tenant } from '@/types';
import { issueLedgerAdjustment } from '@/lib/ledger';
import { validateAmount, sanitizeText } from '@/lib/validation';
import {
  FileText,
  AlertOctagon,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  X,
  AlertCircle
} from 'lucide-react';

interface Props {
  transaction: Transaction;
  customer: Customer;
  tenant: Tenant;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreditNoteAdjustmentModal({
  transaction,
  customer,
  tenant,
  onClose,
  onSuccess,
}: Props) {
  // Por defecto, si era un cargo al fiado por error, se emite una Nota de Crédito (resta deuda)
  const isOriginalPurchase =
    transaction.type === 'DEBIT_PURCHASE' || transaction.type === 'ADJUSTMENT_DEBIT';
  
  const [adjustmentType, setAdjustmentType] = useState<'ADJUSTMENT_CREDIT' | 'ADJUSTMENT_DEBIT'>(
    isOriginalPurchase ? 'ADJUSTMENT_CREDIT' : 'ADJUSTMENT_DEBIT'
  );
  
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const formatMoney = (val: number) => {
    return `${tenant.currency_symbol} ${new Intl.NumberFormat().format(val)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const validation = validateAmount(amount, 0.01);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'El monto debe ser un valor positivo mayor a 0');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Debe especificar el motivo o justificación del ajuste contable');
      return;
    }

    const parsedAmount = validation.value;
    const cleanReason = sanitizeText(reason, 300);

    setLoading(true);

    const res = issueLedgerAdjustment({
      targetTransactionId: transaction.id,
      adjustmentType,
      amount: parsedAmount,
      reason: cleanReason,
    });

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'No se pudo procesar el ajuste');
    } else {
      setSuccessMsg('¡Nota de Ajuste asentada en el Libro Mayor inmutable con éxito!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1400);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative border border-slate-100 animate-in fade-in slide-in-from-bottom">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900">Nota de Crédito / Ajuste</h3>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                Inmutable
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Corrige un error contable sin borrar el historial original
            </p>
          </div>
        </div>

        {/* Resumen de la Operación Original */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 mb-4 text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 uppercase font-bold text-[10px]">Operación Original</span>
            <span className="font-mono font-bold text-slate-700">#{transaction.id.slice(-8)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-800">
            <span>Cliente: <b>{customer.full_name}</b></span>
            <span className="font-black text-sm">{formatMoney(transaction.amount)}</span>
          </div>
          <p className="text-slate-500 italic truncate">"{transaction.description}"</p>
        </div>

        {errorMsg && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Tipo de Ajuste */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Efecto del Ajuste en la Deuda
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('ADJUSTMENT_CREDIT')}
                className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 font-bold text-xs transition ${
                  adjustmentType === 'ADJUSTMENT_CREDIT'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                Nota de Crédito (Resta deuda)
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentType('ADJUSTMENT_DEBIT')}
                className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 font-bold text-xs transition ${
                  adjustmentType === 'ADJUSTMENT_DEBIT'
                    ? 'border-rose-600 bg-rose-50 text-rose-700 shadow-sm'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                Nota de Débito (Suma deuda)
              </button>
            </div>
          </div>

          {/* Monto a Ajustar */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Monto del Ajuste ({tenant.currency_symbol})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                {tenant.currency_symbol}
              </span>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-2xl font-black pl-9 pr-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Puede ser total ({formatMoney(transaction.amount)}) o parcial si fue una corrección de cantidad.
            </span>
          </div>

          {/* Justificación obligatoria */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Justificación / Motivo del Error *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Se cobró 2 bolsas de harina en vez de 1 / Producto devuelto"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-amber-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg transition text-xs flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              {loading ? 'Asentando en Libro Mayor...' : 'Emitir Nota de Ajuste Inmutable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
