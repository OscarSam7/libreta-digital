'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Customer, Tenant } from '@/types';
import { generateWhatsAppReminderUrl } from '@/lib/reports';
import { PrintableCustomerCardModal } from '@/components/PrintableCustomerCardModal';
import { X, MessageCircle, Copy, Check, Shield, Printer } from 'lucide-react';

interface Props {
  customer: Customer;
  tenant: Tenant;
  onClose: () => void;
}

export function CustomerQRModal({ customer, tenant, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const portalUrl = `${origin}/portal/${customer.qr_token}`;
  const whatsappUrl = generateWhatsAppReminderUrl(customer, tenant);

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (showPrintModal) {
    return (
      <PrintableCustomerCardModal
        customer={customer}
        tenant={tenant}
        onClose={() => setShowPrintModal(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl relative border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
          Identidad QR Segura
        </span>

        <h3 className="text-xl font-black text-slate-900 mt-2 truncate">
          {customer.full_name}
        </h3>
        {customer.nickname && (
          <p className="text-xs font-semibold text-blue-600">"{customer.nickname}"</p>
        )}
        <p className="text-xs text-slate-500 mb-4">
          Cédula/DNI: {customer.document_id || 'Sin registrar'}
        </p>

        {/* QR Code SVG */}
        <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 inline-block shadow-inner">
          <QRCodeSVG
            value={portalUrl}
            size={180}
            level="H"
            includeMargin={true}
            className="rounded-xl mx-auto"
          />
        </div>

        {/* PIN de Seguridad Personal */}
        <div className="mt-4 p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-400 block">
                PIN de Seguridad
              </span>
              <span className="text-xs text-slate-700 font-medium">Firma en mostrador</span>
            </div>
          </div>
          <span className="text-xl font-black font-mono tracking-widest text-indigo-700">
            {customer.security_pin}
          </span>
        </div>

        {/* Botonera de acciones (WhatsApp, Imprimir, Copiar) */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shadow-md transition"
            title="Enviar enlace por WhatsApp"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-[11px] shadow-md transition"
            title="Imprimir tarjeta o ticket de mostrador"
          >
            <Printer className="w-4 h-4 text-amber-400" /> Imprimir
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] transition"
            title="Copiar URL al portapapeles"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? '¡Listo!' : 'Copiar'}
          </button>
        </div>
      </div>
    </div>
  );
}
