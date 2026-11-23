'use client';

import React, { useState } from 'react';
import { Customer, Tenant, CreditCycle } from '@/types';
import { getStoredData, saveCustomers } from '@/lib/storage';
import { validateAmount, sanitizeText } from '@/lib/validation';
import { computeSuggestedDueDate, getCustomerDueStatus } from '@/lib/overdue';
import { CustomSelect } from '@/components/ui/CustomSelectModal';
import { CustomDateInput } from '@/components/ui/CustomDatePickerModal';
import {
  User,
  UserCog,
  CreditCard,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  Check,
  X,
  Calendar,
  FileText,
  Clock
} from 'lucide-react';

interface Props {
  customer: Customer;
  tenant: Tenant;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditCustomerModal({ customer, tenant, onClose, onSuccess }: Props) {
  const [fullName, setFullName] = useState(customer.full_name);
  const [nickname, setNickname] = useState(customer.nickname || '');
  const [documentId, setDocumentId] = useState(customer.document_id || '');
  const [phone, setPhone] = useState(customer.phone?.includes('Excepción') ? '' : customer.phone || '');
  const [isNoPhone, setIsNoPhone] = useState(customer.phone?.includes('Excepción') || customer.registered_via === 'EXCEPTION_NO_PHONE');
  const [creditLimit, setCreditLimit] = useState(customer.credit_limit.toString());
  const [creditCycle, setCreditCycle] = useState<CreditCycle>(customer.credit_cycle || 'MENSUAL');
  const [paymentDueDate, setPaymentDueDate] = useState(customer.payment_due_date || '');
  const [securityPin, setSecurityPin] = useState(customer.security_pin || '1234');
  const [showPin, setShowPin] = useState(false);
  const [isBlocked, setIsBlocked] = useState(customer.is_blocked);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  const formatCurrency = (val: number) => {
    return `${tenant.currency_symbol} ${new Intl.NumberFormat().format(val)}`;
  };

  const handleGeneratePin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setSecurityPin(randomPin);
    setShowPin(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('El nombre completo del cliente es obligatorio.');
      return;
    }

    if (!isNoPhone && !phone.trim()) {
      setErrorMsg('El teléfono WhatsApp es obligatorio (o activa la casilla de excepción sin celular).');
      return;
    }

    if (securityPin.length !== 4 || !/^\d{4}$/.test(securityPin)) {
      setErrorMsg('El PIN de seguridad del cliente debe tener exactamente 4 dígitos numéricos.');
      return;
    }

    const limitValidation = validateAmount(creditLimit, 0, 10_000_000_000);
    if (!limitValidation.valid) {
      setErrorMsg(limitValidation.error || 'El límite de crédito debe ser 0 o un monto válido.');
      return;
    }

    setLoading(true);

    try {
      const { customers } = getStoredData();
      const custIndex = customers.findIndex((c) => c.id === customer.id);

      if (custIndex === -1) {
        setErrorMsg('Cliente no encontrado en el sistema.');
        setLoading(false);
        return;
      }

      const finalPhone = isNoPhone && !phone.trim()
        ? 'Sin celular (Excepción Dueño)'
        : sanitizeText(phone, 30);

      const updatedCustomer: Customer = {
        ...customers[custIndex],
        full_name: sanitizeText(fullName, 100),
        nickname: nickname.trim() ? sanitizeText(nickname, 100) : undefined,
        document_id: documentId.trim() ? sanitizeText(documentId, 30) : undefined,
        phone: finalPhone,
        credit_limit: limitValidation.value,
        credit_cycle: creditCycle,
        payment_due_date: paymentDueDate || undefined,
        terms_acceptance_metadata: {
          ...(customers[custIndex].terms_acceptance_metadata || {}),
          payment_due_date: paymentDueDate || null,
        },
        security_pin: securityPin,
        pin_hash: `$2a$06$hash_${securityPin}`,
        is_blocked: isBlocked,
        registered_via: isNoPhone ? 'EXCEPTION_NO_PHONE' : (customers[custIndex].registered_via || 'IN_STORE_COUNTER'),
        updated_at: new Date().toISOString(),
      };

      customers[custIndex] = updatedCustomer;
      saveCustomers(customers);

      // Notificar a otras pestañas
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('libretadigital_customers_channel');
          bc.postMessage({ type: 'CUSTOMER_UPDATED', customer: updatedCustomer });
          bc.close();
        }
      } catch (e) {}

      setSuccessToast(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar datos del cliente.');
    } finally {
      setLoading(false);
    }
  };

  const isOverWithNewLimit =
    parseFloat(creditLimit) > 0 && customer.current_balance > parseFloat(creditLimit);

  const duePreview = getCustomerDueStatus({
    current_balance: customer.current_balance,
    payment_due_date: paymentDueDate || undefined,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative border border-slate-100 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom font-sans">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              Panel del Dueño • Edición de Cliente
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 truncate">
              Editar Datos del Cliente
            </h3>
            <p className="text-xs text-slate-500">
              Modifica la información personal, crédito y seguridad de <b>{customer.full_name}</b>.
            </p>
          </div>
        </div>

        {/* Resumen Deudor Actual */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 mb-4 flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-400 uppercase font-bold text-[10px] block">
              Saldo Deudor Actual
            </span>
            <span className="text-lg font-black text-slate-900">
              {formatCurrency(customer.current_balance)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 uppercase font-bold text-[10px] block">
              Estado de Términos
            </span>
            <span className={`text-[11px] font-bold ${customer.terms_accepted ? 'text-emerald-600' : 'text-amber-600'}`}>
              {customer.terms_accepted ? '✓ Informconf / Contrato Aceptado' : '⚠ Términos Pendientes'}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 mb-4 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>¡Datos del cliente actualizados exitosamente!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Nombre y Apellido */}
          <div>
            <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" /> Nombre Completo del Cliente *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Juan Ramón Benítez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition"
            />
          </div>

          {/* Cédula y Teléfono en 2 columnas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" /> Cédula / DNI / RUC
              </label>
              <input
                type="text"
                placeholder="Ej: 3.456.789"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-600" /> Teléfono / WhatsApp
              </label>
              <input
                type="tel"
                disabled={isNoPhone}
                placeholder="Ej: 0981 123 456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition disabled:opacity-50 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Casilla de Excepción Sin Celular */}
          <label className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer">
            <input
              type="checkbox"
              checked={isNoPhone}
              onChange={(e) => {
                setIsNoPhone(e.target.checked);
                if (e.target.checked) setPhone('');
              }}
              className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
            />
            <span className="text-[11px] text-slate-700 font-medium">
              Cliente sin celular inteligente / adulto mayor (Excepción autorizada)
            </span>
          </label>

          {/* Apodo o Dirección */}
          <div>
            <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" /> Apodo o Referencia de Domicilio
            </label>
            <input
              type="text"
              placeholder="Ej: Don Beto / Barrio San Pedro casa 14"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition"
            />
          </div>

          {/* Límite de Crédito y Ciclo de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Límite de Crédito ({tenant.currency_symbol})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                  {tenant.currency_symbol}
                </span>
                <input
                  type="number"
                  step="any"
                  placeholder="0 (Sin límite)"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full font-black pl-8 pr-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">0 = Crédito sin tope</span>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Plazo / Ciclo de Cobro
              </label>
              <CustomSelect
                title="Ciclo de Cobro"
                value={creditCycle}
                onChange={(val) => setCreditCycle(val as CreditCycle)}
                options={[
                  { value: 'SEMANAL', label: 'Semanal (Cada 7 días)' },
                  { value: 'QUINCENAL', label: 'Quincenal (Cada 15 días)' },
                  { value: 'MENSUAL', label: 'Mensual (Fin de mes)' },
                ]}
              />
            </div>
          </div>

          {/* Fecha de Vencimiento de Pago & Indicador de Mora */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold uppercase text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Fecha de Vencimiento de Pago
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
                El saldo actual ({formatCurrency(customer.current_balance)}) supera el nuevo límite ingresado ({formatCurrency(parseFloat(creditLimit))}).
              </span>
            </div>
          )}

          {/* PIN de Seguridad del Cliente */}
          <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase text-indigo-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600" /> PIN de Seguridad del Cliente (4 dígitos)
              </label>
              <button
                type="button"
                onClick={handleGeneratePin}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Generar Nuevo
              </button>
            </div>

            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                maxLength={4}
                required
                value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full pl-3 pr-10 py-2 bg-white border-2 border-indigo-200 rounded-xl text-center font-mono font-black text-lg tracking-widest text-indigo-950 focus:border-indigo-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Este PIN de 4 dígitos es el que utiliza el cliente para firmar sus compras al fiado en mostrador o consultar su libreta en su celular.
            </p>
          </div>

          {/* Estado de Bloqueo */}
          <div className="pt-1">
            <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer">
              <input
                type="checkbox"
                checked={isBlocked}
                onChange={(e) => setIsBlocked(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 accent-rose-600 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-800 text-xs block">
                  Bloquear cliente para nuevas compras al fiado
                </span>
                <span className="text-[11px] text-slate-500 block leading-tight">
                  Impide que el cajero registre nuevos pedidos al fiado hasta que el cliente regularice su cuenta.
                </span>
              </div>
            </label>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg shadow-blue-600/30 transition text-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
