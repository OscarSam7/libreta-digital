'use client';

import React, { useState } from 'react';
import { ShoppingBag, ArrowDownLeft, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { executeLedgerTransaction, certifyTransactionWithPin } from '@/lib/ledger';
import { Transaction, TransactionType, Tenant } from '@/types';

interface Props {
  customerId: string;
  customerName: string;
  tenant: Tenant;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickTransactionModal({ customerId, customerName, tenant, onClose, onSuccess }: Props) {
  const [type, setType] = useState<TransactionType>('DEBIT_PURCHASE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState<'INPUT' | 'VALIDATION' | 'SUCCESS'>('INPUT');
  const [createdTx, setCreatedTx] = useState<Transaction | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Por favor ingrese un monto válido mayor a 0');
      return;
    }

    const res = executeLedgerTransaction({
      customerId,
      type,
      amount: parsedAmount,
      description:
        description.trim() ||
        (type === 'DEBIT_PURCHASE' ? 'Entrega de mercadería al fiado' : 'Abono / Pago a cuenta'),
    });

    if (!res.success || !res.transaction) {
      setErrorMessage(res.error || 'No se pudo procesar la transacción');
      return;
    }

    setCreatedTx(res.transaction);
    setStep('VALIDATION');
  };

  const handleVerifyPin = () => {
    if (!createdTx) return;
    setErrorMessage('');

    const res = certifyTransactionWithPin(createdTx.id, enteredPin, 'IN_STORE_PIN');
    if (res.success) {
      setStep('SUCCESS');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1400);
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative border border-slate-100 animate-in fade-in slide-in-from-bottom duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'INPUT' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                Libro Mayor • Nueva Operación
              </span>
              <h3 className="text-xl font-black text-slate-900 leading-tight truncate mt-1">
                {customerName}
              </h3>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-200">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setType('DEBIT_PURCHASE')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 font-bold transition-all text-sm gap-1.5 ${
                  type === 'DEBIT_PURCHASE'
                    ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-sm'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                Fiado (Compra)
              </button>
              <button
                type="button"
                onClick={() => setType('CREDIT_PAYMENT')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 font-bold transition-all text-sm gap-1.5 ${
                  type === 'CREDIT_PAYMENT'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ArrowDownLeft className="w-5 h-5" />
                Pago (Abono)
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Monto en {tenant.currency_code} ({tenant.currency_symbol})
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">
                  {tenant.currency_symbol}
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-3xl font-black pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Detalle / Ítems de la transacción
              </label>
              <input
                type="text"
                placeholder={
                  type === 'DEBIT_PURCHASE'
                    ? 'Ej: 2 Harinas, 1 Aceite, 1 Queso'
                    : 'Ej: Abono en efectivo en caja'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all text-base active:scale-[0.99]"
            >
              Cargar y Validar con Cliente
            </button>
          </form>
        )}

        {step === 'VALIDATION' && createdTx && (
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-9 h-9" />
            </div>

            <div>
              <h4 className="text-xl font-black text-slate-900">Validación Inmediata con PIN</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Para certificar que el cliente retira conforme mercadería por valor de{' '}
                <b>
                  {tenant.currency_symbol} {createdTx.amount.toLocaleString('es-PY')}
                </b>
                :
              </p>
            </div>

            <div className="bg-slate-50 py-2.5 px-4 rounded-2xl border border-dashed border-slate-300 inline-block">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                PIN de Operación Mostrador
              </span>
              <span className="text-2xl font-mono font-black tracking-widest text-blue-600">
                {createdTx.validation_pin}
              </span>
            </div>

            {errorMessage && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 py-1.5 px-3 rounded-lg">
                {errorMessage}
              </p>
            )}

            <div className="pt-1">
              <input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="• • • •"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                className="w-44 text-center text-3xl tracking-widest font-mono py-2.5 border-2 border-blue-500 rounded-2xl focus:outline-none mx-auto bg-white shadow-sm block"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                (El cliente ingresa su PIN maestro o el PIN de mostrador)
              </span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl text-xs transition"
              >
                Dejar Pendiente
              </button>
              <button
                type="button"
                onClick={handleVerifyPin}
                className="w-1/2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md text-xs transition"
              >
                Firmar y Certificar
              </button>
            </div>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-black text-slate-900">¡Operación Convalidada!</h4>
            <p className="text-xs text-slate-500">
              Registrada en el libro mayor inmutable bajo el estándar <b>CERTIFIED_BOTH</b>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
