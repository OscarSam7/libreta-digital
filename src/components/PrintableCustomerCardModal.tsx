'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Customer, Tenant } from '@/types';
import { Printer, X, Shield, Store, Phone, CheckCircle2 } from 'lucide-react';

interface Props {
  customer: Customer;
  tenant: Tenant;
  onClose: () => void;
}

export function PrintableCustomerCardModal({ customer, tenant, onClose }: Props) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://libretadigital.app';
  const portalUrl = `${origin}/portal/${customer.qr_token}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Botón flotante para no imprimir en pantalla */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative border border-slate-100 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none">
        
        {/* Controles en Pantalla (Se ocultan al imprimir) */}
        <div className="flex justify-between items-center mb-4 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            <h3 className="font-black text-slate-800 text-base">Imprimir Tarjeta de Mostrador</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =========================================================================
            ÁREA DE LA TARJETA (ESTILO CREDENCIAL / TICKET TÉRMICO 80MM)
            ========================================================================= */}
        <div 
          id="printable-card"
          className="bg-white border-2 border-slate-300 rounded-3xl p-6 text-center text-slate-900 shadow-sm print:border-none print:p-2 print:shadow-none"
        >
          {/* Logo y Encabezado del Comercio */}
          <div className="border-b-2 border-dashed border-slate-300 pb-3 mb-4">
            {tenant.logo_url && (
              <div className="flex justify-center mb-1.5">
                <img
                  src={tenant.logo_url}
                  alt={tenant.business_name}
                  className="w-11 h-11 rounded-xl object-cover border border-slate-200 bg-white"
                />
              </div>
            )}
            <div className="inline-flex items-center justify-center gap-1.5 font-black text-base uppercase tracking-tight text-slate-900">
              {!tenant.logo_url && <Store className="w-4 h-4 text-blue-600 inline" />}
              <span>{tenant.business_name}</span>
            </div>
            {(tenant.address || tenant.city) && (
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {[tenant.address, tenant.city].filter(Boolean).join(' • ')}
              </p>
            )}
            {tenant.phone && (
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                WhatsApp: +{tenant.phone}
              </p>
            )}
            {tenant.opening_hours && (
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {tenant.opening_hours}
              </p>
            )}
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">
              • LibretaDigital Oficial •
            </p>
          </div>

          {/* Datos del Cliente Titular */}
          <div className="mb-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full inline-block mb-1">
              Titular de Cuenta Corriente
            </span>
            <h2 className="text-xl font-black text-slate-900 leading-tight">
              {customer.full_name}
            </h2>
            {customer.nickname && (
              <p className="text-xs font-bold text-blue-700">"{customer.nickname}"</p>
            )}
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              C.I / Doc: <b>{customer.document_id || 'Registrado'}</b>
            </p>
          </div>

          {/* Código QR de Alta Densidad */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl inline-block mx-auto my-1 shadow-inner print:bg-white print:border-black">
            <QRCodeSVG
              value={portalUrl}
              size={175}
              level="H"
              includeMargin={true}
              className="rounded-lg mx-auto"
            />
          </div>

          {/* PIN de Seguridad en Mostrador */}
          <div className="mt-3 bg-slate-900 text-white rounded-2xl p-3 border border-slate-800 print:bg-white print:text-black print:border-2 print:border-black">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="text-[9px] uppercase font-bold text-slate-400 block print:text-black">
                  PIN de Confirmación
                </span>
                <span className="text-[11px] font-semibold text-slate-300 print:text-black">
                  Dictar en mostrador para compras
                </span>
              </div>
              <div className="text-2xl font-black font-mono tracking-widest text-amber-400 print:text-black">
                {customer.security_pin}
              </div>
            </div>
          </div>

          {/* Instrucciones al Cliente */}
          <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-200 text-left text-[11px] text-slate-600 space-y-1 print:border-slate-400">
            <p className="flex items-center gap-1 font-semibold text-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Escanea este QR desde tu celular para ver tu saldo al instante.</span>
            </p>
            <p className="flex items-center gap-1 font-semibold text-slate-800">
              <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>No compartas tu PIN con terceros para proteger tus compras.</span>
            </p>
          </div>
        </div>

        {/* Acciones de Impresión (Ocultas en la hoja impresa) */}
        <div className="grid grid-cols-2 gap-2 mt-5 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 transition"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Printer className="w-4 h-4" /> Imprimir Tarjeta
          </button>
        </div>
      </div>
    </div>
  );
}
