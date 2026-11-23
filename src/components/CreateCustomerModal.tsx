'use client';

import React, { useState } from 'react';
import { Calendar, UserPlus, X } from 'lucide-react';
import { createNewCustomer } from '@/lib/customers';
import { computeSuggestedDueDate } from '@/lib/overdue';
import { CustomDateInput } from '@/components/ui/CustomDatePickerModal';
import { Customer, Tenant } from '@/types';

interface Props {
  tenant: Tenant;
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
}

export function CreateCustomerModal({ tenant, onClose, onCustomerCreated }: Props) {
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [phone, setPhone] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('El nombre completo y el teléfono son obligatorios.');
      return;
    }

    const newCustomer = createNewCustomer({
      full_name: fullName,
      nickname,
      document_id: documentId,
      phone,
      credit_limit: parseFloat(creditLimit) || 0,
      payment_due_date: paymentDueDate || undefined,
    });

    onCustomerCreated(newCustomer);
    onClose();
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

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Alta de Cuenta Corriente</h3>
            <p className="text-xs text-slate-400">Genera automáticamente su QR Token y PIN único</p>
          </div>
        </div>

        {error && (
          <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 mb-3">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej: Roberto Gómez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Apodo / Referencia
              </label>
              <input
                type="text"
                placeholder="Ej: Don Roberto"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none transition"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Cédula / DNI
              </label>
              <input
                type="text"
                placeholder="Ej: 3.456.789"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Teléfono / WhatsApp *
              </label>
              <input
                type="tel"
                required
                placeholder="595981..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Límite Crédito ({tenant.currency_symbol})
              </label>
              <input
                type="number"
                placeholder="0 = Sin límite"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Vencimiento de Pago (Opcional)
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
              label="Fecha de Vencimiento"
              className="w-full"
            />
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: '7D', label: '+7d' },
                  { id: '15D', label: '+15d' },
                  { id: '30D', label: '+30d' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPaymentDueDate(computeSuggestedDueDate(preset.id))}
                  className="px-2 py-1 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition text-sm mt-2"
          >
            Registrar Cliente y Generar QR
          </button>
        </form>
      </div>
    </div>
  );
}
