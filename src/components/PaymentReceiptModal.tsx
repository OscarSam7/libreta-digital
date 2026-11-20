'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Customer, Tenant, Transaction, PrinterFormat } from '@/types';
import { generatePaymentReceiptWhatsAppUrl } from '@/lib/reports';
import { downloadReceiptPDF } from '@/lib/pdfReceipt';
import { getStoredPrinterFormat, setStoredPrinterFormat } from '@/lib/storage';
import { BrandLogo } from '@/components/BrandLogo';
import {
  CheckCircle2,
  Printer,
  Send,
  X,
  ShieldCheck,
  Building,
  User,
  Phone,
  Calendar,
  CreditCard,
  Hash,
  Sparkles,
  ArrowDownLeft,
  Receipt,
  Download,
  FileText
} from 'lucide-react';

interface Props {
  transaction: Transaction;
  customer: Customer;
  tenant: Tenant;
  onClose: () => void;
}

export function PaymentReceiptModal({ transaction, customer, tenant, onClose }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<PrinterFormat>('TICKET_80MM');

  useEffect(() => {
    setFormat(getStoredPrinterFormat());
  }, []);

  const handleFormatChange = (newFormat: PrinterFormat) => {
    setFormat(newFormat);
    setStoredPrinterFormat(newFormat);
  };

  const isFullPayment = transaction.new_balance <= 0;

  const formatCurrency = (val: number) => {
    return `${tenant.currency_symbol} ${new Intl.NumberFormat(
      tenant.currency_code === 'PYG' ? 'es-PY' : tenant.currency_code === 'BRL' ? 'pt-BR' : 'es-PE'
    ).format(val)}`;
  };

  const receiptNumber = `REC-${new Date(transaction.created_at).getFullYear()}-${transaction.id.slice(-6).toUpperCase()}`;
  const dateFormatted = new Date(transaction.created_at).toLocaleString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const whatsappUrl = generatePaymentReceiptWhatsAppUrl(customer, tenant, transaction);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200 font-sans">
      {/* Estilos dinámicos de impresión según el formato configurado */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-receipt-container,
          #printable-receipt-container * {
            visibility: visible !important;
          }
          #printable-receipt-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${format === 'TICKET_80MM' ? '76mm' : '100%'} !important;
            max-width: ${format === 'TICKET_80MM' ? '76mm' : '100%'} !important;
            margin: 0 !important;
            padding: ${format === 'TICKET_80MM' ? '2mm' : '10mm'} !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
            font-family: ${format === 'TICKET_80MM' ? 'monospace' : 'system-ui, sans-serif'} !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: ${format === 'TICKET_80MM' ? '80mm auto' : 'A4 portrait'};
            margin: ${format === 'TICKET_80MM' ? '3mm' : '10mm'};
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[96vh] flex flex-col">
        {/* HEADER CON BOTÓN CERRAR Y SELECTOR DE FORMATO */}
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-black text-white">Comprobante de Recibo Oficial</h3>
              <p className="text-[10px] text-slate-400">PDF y Versión Impresa</p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* CONMUTADOR DE IMPRESORA: TICKET 80MM VS HOJA A4 */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => handleFormatChange('TICKET_80MM')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  format === 'TICKET_80MM'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Formato Ticket POS 80mm continuo"
              >
                <Receipt className="w-3 h-3" />
                <span>Ticket 80mm</span>
              </button>
              <button
                type="button"
                onClick={() => handleFormatChange('PAGE_A4')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  format === 'PAGE_A4'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Formato Hoja A4 estándar"
              >
                <FileText className="w-3 h-3" />
                <span>A4</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CONTENEDOR DEL RECIBO IMPRIMIBLE */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60 print:p-0 print:bg-white flex justify-center" ref={receiptRef}>
          <div
            id="printable-receipt-container"
            className={`bg-white rounded-2xl border border-slate-200/90 shadow-sm print:shadow-none print:border-none transition-all ${
              format === 'TICKET_80MM'
                ? 'w-full max-w-[340px] p-4 font-mono text-xs space-y-3'
                : 'w-full p-5 sm:p-6 font-sans text-xs space-y-4'
            }`}
          >
            {/* CABECERA CON DATOS DEL ALMACÉN */}
            <div className="text-center border-b border-dashed border-slate-200 pb-3">
              <div className="flex justify-center mb-1.5">
                <BrandLogo size="sm" theme="light" />
              </div>
              <h2 className={`font-black text-slate-900 uppercase tracking-tight ${format === 'TICKET_80MM' ? 'text-base' : 'text-lg'}`}>
                {tenant.business_name}
              </h2>
              <div className="text-[11px] text-slate-500 space-y-0.5 mt-1">
                {tenant.tax_id && (
                  <p className="font-semibold text-slate-700">RUC / Registro: {tenant.tax_id}</p>
                )}
                {tenant.address && (
                  <p className="truncate">📍 {tenant.address}</p>
                )}
                {tenant.phone && (
                  <p>📞 Tel / WhatsApp: {tenant.phone}</p>
                )}
              </div>
              {format === 'TICKET_80MM' && (
                <div className="mt-1 text-[9px] text-indigo-700 font-bold bg-indigo-50 py-0.5 px-2 rounded-md inline-block">
                  FORMATO POS TICKET 80mm
                </div>
              )}
            </div>

            {/* SELLO Y TIPO DE COMPROBANTE */}
            <div className="text-center">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 ${
                  isFullPayment
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {isFullPayment ? 'PAGO TOTAL (DEUDA CANCELADA)' : 'ABONO PARCIAL A CUENTA'}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-2 py-1 bg-slate-50 rounded-xl border border-slate-100">
                <span>N° Recibo: <b className="text-slate-800 font-mono">{receiptNumber}</b></span>
                <span>{dateFormatted}</span>
              </div>
            </div>

            {/* DATOS DEL CLIENTE */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Datos del Cliente
              </span>
              <div className="flex justify-between items-start">
                <div className="min-w-0 pr-2">
                  <span className="font-black text-slate-900 text-xs sm:text-sm block truncate">
                    {customer.full_name}
                  </span>
                  {customer.nickname && (
                    <span className="text-slate-500 text-[11px] block truncate">
                      Ref/Apodo: "{customer.nickname}"
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-slate-700 font-semibold block text-[11px]">
                    {customer.document_id ? `Doc: ${customer.document_id}` : 'Sin doc'}
                  </span>
                  <span className="text-slate-500 text-[10px] block">
                    {customer.phone || 'Sin cel'}
                  </span>
                </div>
              </div>
            </div>

            {/* CUADRO FINANCIERO DEL PAGO */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
              <div className="p-2.5 bg-slate-50 flex justify-between items-center text-slate-600 font-medium">
                <span>Saldo Anterior Deudor:</span>
                <span className="font-bold text-slate-800">{formatCurrency(transaction.previous_balance)}</span>
              </div>

              <div className="p-3 bg-emerald-50/70 flex justify-between items-center text-emerald-950 font-black">
                <div className="flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs sm:text-sm">MONTO ABONADO:</span>
                </div>
                <span className="text-base sm:text-lg text-emerald-600 font-black">
                  {formatCurrency(transaction.amount)}
                </span>
              </div>

              <div className={`p-2.5 flex justify-between items-center ${isFullPayment ? 'bg-emerald-100/50 text-emerald-900 font-black' : 'bg-white text-slate-900 font-bold'}`}>
                <span>Saldo Restante a la Fecha:</span>
                <span className="text-xs sm:text-sm font-black">
                  {formatCurrency(transaction.new_balance)}
                  {isFullPayment && ' (¡Al Día!)'}
                </span>
              </div>
            </div>

            {/* DETALLES DE MEDIO DE PAGO Y CAJERO */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Medio de Pago:</span>
                <span className="font-bold text-slate-800">
                  {transaction.payment_method || 'Efectivo en Caja'}
                </span>
                {transaction.payment_reference && (
                  <span className="text-slate-500 block text-[9px] truncate">
                    Ref: {transaction.payment_reference}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Operador / Caja:</span>
                <span className="font-bold text-slate-800">
                  {transaction.operator_name || 'Caja Central'}
                </span>
                <span className="text-emerald-700 block text-[9px] font-bold">
                  ✓ Certificado en Libro
                </span>
              </div>
            </div>

            {/* AVISO DE LÍMITE Y PLAZO DE CRÉDITO PACTADO */}
            <div className="p-2 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[10px] text-amber-900">
              <span className="font-bold">Aviso Oficial:</span> La concesión, límite máximo y plazo de crédito son facultad exclusiva del comercio ({tenant.business_name}).
            </div>

            {/* CERTIFICACIÓN INMUTABLE */}
            {transaction.blockchain_hash && (
              <div className="text-[9px] text-slate-400 text-center font-mono border-t border-slate-100 pt-1.5 truncate">
                Hash: {transaction.blockchain_hash}
              </div>
            )}
          </div>
        </div>

        {/* BOTONES DE ACCIÓN: WHATSAPP, DESCARGAR PDF, IMPRIMIR Y CERRAR */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-2 shrink-0">
          <button
            type="button"
            onClick={() => downloadReceiptPDF(transaction, customer, tenant, format)}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 transition active:scale-98 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar PDF en {format === 'TICKET_80MM' ? 'Ticket POS 80mm' : 'Hoja A4'}</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition active:scale-98 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Enviar Enlace del PDF por WhatsApp al Cliente</span>
          </a>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir {format === 'TICKET_80MM' ? 'Ticket' : 'A4'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Listo / Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
