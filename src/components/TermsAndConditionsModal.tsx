'use client';

import React, { useState } from 'react';
import { Customer, Tenant, CreditCycle } from '@/types';
import { acceptCustomerTerms } from '@/lib/customers';
import { generateWhatsAppReminderUrl } from '@/lib/reports';
import { PDFReportPreviewModal } from '@/components/PDFReportPreviewModal';
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Send,
  Printer,
  X,
  Lock,
  Calendar,
  Building,
  User,
  ExternalLink,
  Download,
  Check,
  Smartphone
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  customer: Customer;
  tenant: Tenant;
  onClose: () => void;
  onSuccess: (updatedCustomer: Customer) => void;
}

export function TermsAndConditionsModal({
  customer,
  tenant,
  onClose,
  onSuccess,
}: Props) {
  const [pinInput, setPinInput] = useState('');
  const [selectedCycle, setSelectedCycle] = useState<CreditCycle>(
    customer.credit_cycle || 'MENSUAL'
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [showPDF, setShowPDF] = useState(false);
  const [mode, setMode] = useState<'VIEW' | 'IN_STORE_ACCEPT'>('VIEW');

  const formatCurrency = (val: number) => {
    return `${tenant.currency_symbol} ${new Intl.NumberFormat(
      tenant.currency_code === 'PYG' ? 'es-PY' : tenant.currency_code === 'BRL' ? 'pt-BR' : 'es-PE'
    ).format(val)}`;
  };

  const portalUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://libretadigital.app'}/portal/${customer.qr_token}`;

  const whatsappMessage =
    `Hola *${customer.full_name}*! Para habilitar tu cuenta corriente de crédito (fiado) en *${tenant.business_name}*, por favor ingresá a tu portal para conocer y aceptar los términos y condiciones de crédito:\n\n` +
    `🔗 ${portalUrl}\n\n` +
    `_Tu PIN de seguridad para autorizar operaciones:_ *${customer.security_pin}*`;

  const waLink = `https://wa.me/${(customer.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;

  // Aceptación en mostrador mediante PIN
  const handleInStoreAccept = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!pinInput.trim()) {
      setErrorMsg('Por favor ingrese el PIN de 4 dígitos del cliente');
      return;
    }

    const res = acceptCustomerTerms(customer.id, pinInput.trim(), 'IN_STORE_PIN', selectedCycle);

    if (!res.success || !res.customer) {
      setErrorMsg(res.error || 'PIN incorrecto');
      return;
    }

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch {}

    onSuccess(res.customer);
    setMode('VIEW');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto font-sans animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl relative border border-slate-200 my-auto max-h-[94vh] flex flex-col overflow-hidden">
        {/* ENCABEZADO */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Validez Jurídica Ley N° 6534/20 & 6822/21
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black mt-0.5">
                Términos de Crédito & Autorización Informconf
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* TARJETA DE ESTADO ACTUAL */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Cliente</span>
              <span className="text-sm font-black text-slate-900 block">{customer.full_name}</span>
              <span className="text-slate-500 text-[11px]">
                {customer.document_id ? `Doc: ${customer.document_id} • ` : ''}
                {customer.phone || 'Sin teléfono'} • Límite: {formatCurrency(customer.credit_limit)}
              </span>
            </div>

            <div>
              {customer.terms_accepted ? (
                <div className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="block">Consentimiento Habilitado</span>
                    <span className="text-[10px] text-emerald-700 font-normal">
                      Aceptado el {new Date(customer.terms_accepted_at!).toLocaleDateString('es-PY')} (
                      {customer.terms_acceptance_method === 'PORTAL_PIN' ? 'Vía Móvil' : 'En Mostrador'})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="block">Pendiente de Aceptación</span>
                    <span className="text-[10px] text-amber-700 font-normal">
                      Requiere confirmación digital o en mostrador
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ACCIONES RÁPIDAS SI ESTÁ PENDIENTE */}
          {!customer.terms_accepted && mode === 'VIEW' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opción 1: Aceptar en Mostrador */}
              <button
                type="button"
                onClick={() => setMode('IN_STORE_ACCEPT')}
                className="p-3.5 bg-blue-50 hover:bg-blue-100/80 rounded-2xl border border-blue-200 text-left transition flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-slate-900 text-xs block">
                    Convalidar en Mostrador con PIN
                  </span>
                  <span className="text-[11px] text-slate-500">
                    El cliente digita su PIN de 4 dígitos en este dispositivo
                  </span>
                </div>
              </button>

              {/* Opción 2: Enviar por WhatsApp */}
              {customer.phone && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 bg-emerald-50 hover:bg-emerald-100/80 rounded-2xl border border-emerald-200 text-left transition flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-slate-900 text-xs block">
                      Enviar Enlace por WhatsApp
                    </span>
                    <span className="text-[11px] text-slate-500">
                      El cliente lee y acepta cómodamente desde su móvil
                    </span>
                  </div>
                </a>
              )}
            </div>
          )}

          {/* FORMULARIO DE CONVALIDACIÓN EN MOSTRADOR */}
          {mode === 'IN_STORE_ACCEPT' && (
            <form onSubmit={handleInStoreAccept} className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-3 animate-in fade-in">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-blue-700">
                  Firma Electrónica en Mostrador
                </span>
                <button
                  type="button"
                  onClick={() => setMode('VIEW')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Volver
                </button>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200 font-semibold">
                  {errorMsg}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Ciclo de Facturación a Crédito
                  </label>
                  <select
                    value={selectedCycle}
                    onChange={(e) => setSelectedCycle(e.target.value as CreditCycle)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="MENSUAL">Cierre Mensual (Fin de mes)</option>
                    <option value="QUINCENAL">Cierre Quincenal (Día 15 y 30)</option>
                    <option value="SEMANAL">Cierre Semanal (Sábados)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    PIN de 4 dígitos del Cliente (Mostrador: {customer.security_pin})
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="• • • •"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-full p-2 bg-white border-2 border-blue-400 rounded-xl text-center font-mono text-base font-black tracking-widest focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                Registrar Aceptación Legal con PIN
              </button>
            </form>
          )}

          {/* RESUMEN DE CLÁUSULAS LEGALES */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
            <h3 className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              Resumen de Cláusulas y Aspectos Legales Incorporados
            </h3>

            <div className="space-y-2 text-[11px] text-slate-600 leading-relaxed">
              <p>
                <b>1. Línea de Crédito Rotativa ("Fiado"):</b> Autorización de compras hasta el monto pactado de {formatCurrency(customer.credit_limit)}.
              </p>
              <p>
                <b>2. Convalidación Electrónica por PIN / QR:</b> Cada compra validada con PIN o QR en mostrador constituye constancia legal de entrega y recepción conforme de mercaderías (Ley N° 6822/21).
              </p>
              <p>
                <b>3. Facturación a Crédito al Cierre de Ciclo:</b> Al cierre de cada ciclo ({customer.credit_cycle || 'Mensual'}), el comercio emite la Factura a Crédito consolidada con plazo de pago acordado.
              </p>
              <p className="bg-rose-50 text-rose-800 p-2.5 rounded-xl border border-rose-200 font-medium">
                <b>4. Cláusula Expresa INFORMCONF (Ley N° 6534/20):</b> El cliente autoriza irrevocablemente la consulta crediticia y el **reporte en la base de datos de morosos de INFORMCONF** en caso de incumplimiento de pagos por el plazo legal de mora.
              </p>
              <p>
                <b>5. Bloqueo Automático por Mora:</b> La falta de pago inhabilita inmediatamente nuevos créditos.
              </p>
            </div>
          </div>
        </div>

        {/* PIE DE PÁGINA */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          <button
            type="button"
            onClick={() => setShowPDF(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Ver Contrato Oficial en PDF
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* MODAL VISTA PREVIA PDF DEL CONTRATO */}
      {showPDF && (
        <PDFReportPreviewModal
          mode="TERMS_CONTRACT"
          tenant={tenant}
          customer={customer}
          onClose={() => setShowPDF(false)}
        />
      )}
    </div>
  );
}
