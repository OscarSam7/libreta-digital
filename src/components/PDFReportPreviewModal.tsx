'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Customer, Tenant, Transaction, PaymentMethod, PrinterFormat } from '@/types';
import { CustomerPortfolioSummary, generateWhatsAppReminderUrl, generateDailyClosingWhatsAppUrl } from '@/lib/reports';
import { getStoredPrinterFormat, setStoredPrinterFormat } from '@/lib/storage';
import { QRCodeSVG } from 'qrcode.react';
import { BrandLogo } from '@/components/BrandLogo';
import {
  Printer,
  Download,
  X,
  MessageCircle,
  FileText,
  ShieldCheck,
  Building,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  CreditCard,
  User,
  ShoppingBag,
  ArrowDownLeft,
  Receipt,
  Smartphone
} from 'lucide-react';

export type PDFReportMode =
  | 'CUSTOMER_STATEMENT'
  | 'PORTFOLIO_MORA'
  | 'SALES_REPORT'
  | 'LEDGER_REPORT'
  | 'TERMS_CONTRACT'
  | 'DAILY_CLOSING_REPORT';

interface Props {
  mode: PDFReportMode;
  tenant: Tenant;
  dateFrom?: string;
  dateTo?: string;
  customer?: Customer | null;
  customers?: Customer[];
  transactions?: Transaction[];
  portfolio?: CustomerPortfolioSummary[];
  salesSummary?: {
    totalVentasFiadas: number;
    totalCobrado: number;
    totalNotasCredito: number;
    flujoNeto: number;
    operacionesCount: number;
    ticketPromedio: number;
    paymentMethodsMap: Record<PaymentMethod, number>;
  };
  onClose: () => void;
}

export function PDFReportPreviewModal({
  mode,
  tenant,
  dateFrom,
  dateTo,
  customer,
  customers = [],
  transactions = [],
  portfolio = [],
  salesSummary,
  onClose,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [printerFormat, setPrinterFormat] = useState<PrinterFormat>('TICKET_80MM');

  useEffect(() => {
    setPrinterFormat(getStoredPrinterFormat());
  }, []);

  const handleFormatChange = (newFormat: PrinterFormat) => {
    setPrinterFormat(newFormat);
    setStoredPrinterFormat(newFormat);
  };

  const formatCurrency = (val: number) => {
    return `${tenant.currency_symbol} ${new Intl.NumberFormat(
      tenant.currency_code === 'PYG' ? 'es-PY' : tenant.currency_code === 'BRL' ? 'pt-BR' : 'es-PE'
    ).format(val)}`;
  };

  const handlePrintOrDownloadPDF = () => {
    const contentEl = printRef.current;
    if (!contentEl || typeof window === 'undefined') {
      window.print();
      return;
    }

    // Imprimir en un iframe aislado con SOLO el documento para evitar que position:fixed
    // repita el extracto en cada hoja del dashboard oculto detrás del modal
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return;
    }

    // Copiar estilos de la app excluyendo reglas de ocultar body con visibility:hidden
    const stylesHtml = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .filter((node) => !(node.tagName === 'STYLE' && (node.textContent || '').includes('visibility: hidden')))
      .map((node) => node.outerHTML)
      .join('\n');

    const pageCss = `
      @page {
        size: ${printerFormat === 'TICKET_58MM' ? '58mm auto' : printerFormat === 'TICKET_80MM' ? '80mm auto' : 'A4 portrait'};
        margin: ${printerFormat === 'TICKET_58MM' ? '1.5mm' : printerFormat === 'TICKET_80MM' ? '3mm' : '10mm'};
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        height: auto !important;
        min-height: 0 !important;
        overflow: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #printable-pdf-document {
        position: static !important;
        width: ${printerFormat === 'TICKET_58MM' ? '52mm' : printerFormat === 'TICKET_80MM' ? '76mm' : '100%'} !important;
        max-width: ${printerFormat === 'TICKET_58MM' ? '52mm' : printerFormat === 'TICKET_80MM' ? '76mm' : '100%'} !important;
        margin: 0 auto !important;
        padding: ${printerFormat === 'TICKET_58MM' ? '1.5mm' : printerFormat === 'TICKET_80MM' ? '2mm' : '6mm'} !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        font-size: ${printerFormat === 'TICKET_58MM' ? '8px' : printerFormat === 'TICKET_80MM' ? '9.5px' : '12px'} !important;
        font-family: ${printerFormat === 'PAGE_A4' ? 'system-ui, -apple-system, sans-serif' : 'monospace'} !important;
      }
      .no-print {
        display: none !important;
      }
    `;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Extracto PDF - ${tenant.business_name}</title>
    ${stylesHtml}
    <style>${pageCss}</style>
  </head>
  <body>
    ${contentEl.outerHTML}
  </body>
</html>`);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 2000);
      }
    }, 350);
  };

  // URL de portal para QR si es un cliente
  const portalUrl = customer
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://libretadigital.app'}/portal/${customer.qr_token}`
    : '';

  const effectiveCustomers =
    customers && customers.length > 0
      ? customers
      : portfolio.length > 0
      ? portfolio.map((p) => p.customer)
      : [];

  const waUrl =
    mode === 'DAILY_CLOSING_REPORT'
      ? generateDailyClosingWhatsAppUrl(tenant, effectiveCustomers, transactions, dateTo || dateFrom)
      : customer
      ? generateWhatsAppReminderUrl(customer, tenant)
      : '';

  const reportDateFormatted = new Date().toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="pdf-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      {/* Estilos específicos de impresión de respaldo (Ctrl+P) */}
      <style jsx global>{`
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          .pdf-modal-overlay {
            position: static !important;
            inset: auto !important;
            display: block !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }
          #printable-pdf-document,
          #printable-pdf-document * {
            visibility: visible !important;
          }
          #printable-pdf-document {
            position: static !important;
            width: ${printerFormat === 'TICKET_58MM' ? '52mm' : printerFormat === 'TICKET_80MM' ? '76mm' : '100%'} !important;
            max-width: ${printerFormat === 'TICKET_58MM' ? '52mm' : printerFormat === 'TICKET_80MM' ? '76mm' : '100%'} !important;
            margin: 0 !important;
            padding: ${printerFormat === 'TICKET_58MM' ? '1.5mm' : printerFormat === 'TICKET_80MM' ? '2mm' : '12mm'} !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
            font-size: ${printerFormat === 'TICKET_58MM' ? '8px' : printerFormat === 'TICKET_80MM' ? '9.5px' : '12px'} !important;
            font-family: ${printerFormat === 'PAGE_A4' ? 'system-ui, sans-serif' : 'monospace'} !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: ${printerFormat === 'TICKET_58MM' ? '58mm auto' : printerFormat === 'TICKET_80MM' ? '80mm auto' : 'A4 portrait'};
            margin: ${printerFormat === 'TICKET_58MM' ? '1.5mm' : printerFormat === 'TICKET_80MM' ? '3mm' : '10mm'};
          }
        }
      `}</style>

      <div className="w-full max-w-4xl bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden my-auto border border-slate-700 animate-in zoom-in-95">
        {/* BARRA SUPERIOR DE ACCIONES */}
        <div className="p-3.5 sm:p-4 bg-slate-800 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2.5 text-white shrink-0 no-print">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Vista Previa del Documento PDF
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black truncate max-w-xs sm:max-w-md">
                {mode === 'CUSTOMER_STATEMENT' && `Estado de Cuenta • ${customer?.full_name}`}
                {mode === 'PORTFOLIO_MORA' && `Reporte de Cartera, Mora y Saldos`}
                {mode === 'SALES_REPORT' && `Reporte de Ventas y Cobranzas`}
                {mode === 'LEDGER_REPORT' && `Libro Mayor General`}
                {mode === 'TERMS_CONTRACT' && `Contrato de Crédito & Informconf • ${customer?.full_name}`}
                {mode === 'DAILY_CLOSING_REPORT' && `Cierre de Actividades & Respaldo de Cartera`}
              </h3>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* CONMUTADOR DE FORMATO DE IMPRESIÓN: 58MM VS 80MM VS A4 */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => handleFormatChange('TICKET_58MM')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  printerFormat === 'TICKET_58MM'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="POS Portátil 58mm / 57mm"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>58mm</span>
              </button>
              <button
                type="button"
                onClick={() => handleFormatChange('TICKET_80MM')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  printerFormat === 'TICKET_80MM'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="POS Mostrador 80mm"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>80mm</span>
              </button>
              <button
                type="button"
                onClick={() => handleFormatChange('PAGE_A4')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  printerFormat === 'PAGE_A4'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Hoja A4 estándar"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>A4</span>
              </button>
            </div>

            {(customer || mode === 'DAILY_CLOSING_REPORT') && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                title={mode === 'DAILY_CLOSING_REPORT' ? 'Enviar Respaldo General por WhatsApp' : 'Enviar por WhatsApp'}
              >
                <MessageCircle className="w-4 h-4" />
                <span>{mode === 'DAILY_CLOSING_REPORT' ? 'Enviar Respaldo por WhatsApp' : 'Enviar por WhatsApp'}</span>
              </a>
            )}

            <button
              onClick={handlePrintOrDownloadPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/30 transition active:scale-95"
            >
              <Download className="w-4 h-4" /> Descargar PDF / Imprimir
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* VISOR DE LA HOJA PDF (ADAPTABLE A POS 58MM, 80MM O A4) */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-slate-950/60 flex items-start justify-center flex-1">
          <div
            id="printable-pdf-document"
            ref={printRef}
            className={`bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 flex flex-col justify-between h-fit transition-all ${
              printerFormat === 'TICKET_58MM'
                ? 'w-full max-w-[300px] p-3 text-[10px] font-mono space-y-2'
                : printerFormat === 'TICKET_80MM'
                ? 'w-full max-w-[360px] p-4 text-[11px] font-mono space-y-3'
                : 'w-full max-w-[210mm] p-5 sm:p-10 text-xs font-sans'
            }`}
          >
            {/* ENCABEZADO OFICIAL DEL COMERCIO */}
            <div>
              <div className="flex justify-between items-start pb-5 border-b-2 border-slate-900">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 shrink-0">
                    <BrandLogo size="icon-only" />
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase leading-none">
                      {tenant.business_name}
                    </h1>
                    <p className="text-[11px] font-bold text-slate-500">
                      LibretaDigital Pro • Moneda: {tenant.currency_code} ({tenant.currency_symbol})
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {tenant.address ? `${tenant.address} • ` : ''}
                      {tenant.phone ? `Tel: ${tenant.phone} • ` : ''}
                      {tenant.tax_id ? `RUC/Doc: ${tenant.tax_id}` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="inline-block bg-slate-100 text-slate-800 font-mono font-bold px-2.5 py-1 rounded-md text-[10px] border border-slate-200">
                    DOCUMENTO OFICIAL
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Emisión: <b className="text-slate-800">{reportDateFormatted}</b>
                  </p>
                  {dateFrom && dateTo && (
                    <p className="text-[10px] text-slate-500 font-medium">
                      Período: <b className="text-slate-900">{dateFrom} al {dateTo}</b>
                    </p>
                  )}
                </div>
              </div>

              {/* TÍTULO DEL INFORME */}
              <div className="my-5 text-center bg-slate-50 py-3 px-4 rounded-xl border border-slate-200">
                <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide uppercase">
                  {mode === 'CUSTOMER_STATEMENT' && 'Estado de Cuenta Corriente Individual'}
                  {mode === 'PORTFOLIO_MORA' && 'Informe de Cartera, Morosidad y Clientes al Día'}
                  {mode === 'SALES_REPORT' && 'Reporte General de Ventas y Cobranzas'}
                  {mode === 'LEDGER_REPORT' && 'Libro Mayor de Asientos Inmutables'}
                  {mode === 'TERMS_CONTRACT' && 'Contrato de Crédito Rotativo ("Fiado") y Consentimiento Informconf'}
                  {mode === 'DAILY_CLOSING_REPORT' && 'Relatorio General de Cierre de Actividades & Respaldo'}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {mode === 'CUSTOMER_STATEMENT' && `Cliente: ${customer?.full_name} • Certificado de movimientos`}
                  {mode === 'PORTFOLIO_MORA' && `Estado consolidado de saldos pendientes, límites y atrasos`}
                  {mode === 'SALES_REPORT' && `Totales de mercadería fiada, recaudación en caja y medios de pago`}
                  {mode === 'LEDGER_REPORT' && `Historial detallado cronológico`}
                  {mode === 'TERMS_CONTRACT' && `Conforme a la Ley N° 6534/20 de Protección de Datos Crediticios y Ley N° 6822/21`}
                  {mode === 'DAILY_CLOSING_REPORT' && `Resumen contable de caja y lista compacta de saldos vigentes para resguardo`}
                </p>
              </div>

              {/* ============================================================== */}
              {/* CASO 1: ESTADO DE CUENTA INDIVIDUAL DE CLIENTE (WHATSAPP/QR)   */}
              {/* ============================================================== */}
              {mode === 'CUSTOMER_STATEMENT' && customer && (
                <div className="space-y-5">
                  {/* Ficha del Cliente */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Cliente</span>
                      <span className="font-black text-slate-900 block text-xs truncate">
                        {customer.full_name}
                      </span>
                      {customer.nickname && (
                        <span className="text-[10px] text-slate-500">"{customer.nickname}"</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Teléfono / Doc</span>
                      <span className="font-bold text-slate-800 block text-xs">
                        {customer.phone || 'Sin registrar'}
                      </span>
                      <span className="text-[10px] text-slate-500">{customer.document_id || 'Doc: N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Límite Autorizado</span>
                      <span className="font-bold text-slate-800 block text-xs">
                        {customer.credit_limit > 0 ? formatCurrency(customer.credit_limit) : 'Sin límite'}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold block">
                        ✓ Cuenta Habilitada
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-300 text-right">
                      <span className="text-[9px] uppercase font-black text-slate-400 block">
                        Saldo Deudor Total
                      </span>
                      <span
                        className={`text-base font-black ${
                          customer.current_balance > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatCurrency(customer.current_balance)}
                      </span>
                    </div>
                  </div>

                  {/* Tabla de Movimientos del Cliente */}
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[500px] sm:min-w-0">
                      <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 whitespace-nowrap">Fecha</th>
                          <th className="py-2.5 px-2 whitespace-nowrap">Tipo</th>
                          <th className="py-2.5 px-3">Detalle de Mercaderías / Concepto</th>
                          <th className="py-2.5 px-2 text-right whitespace-nowrap">Monto</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Saldo</th>
                          <th className="py-2.5 px-2 text-center whitespace-nowrap">Validación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                              No registra movimientos en el período seleccionado.
                            </td>
                          </tr>
                        ) : (
                          transactions.map((t) => {
                            const isPurchase = t.type === 'DEBIT_PURCHASE' || t.type === 'ADJUSTMENT_DEBIT';
                            return (
                              <tr key={t.id} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                                  {new Date(t.created_at).toLocaleDateString('es-PY', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="py-2 px-2 whitespace-nowrap">
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                      isPurchase ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}
                                  >
                                    {isPurchase ? 'COMPRA' : 'PAGO'}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-800 text-[11px]">
                                  {t.description || '-'}
                                  {t.payment_method ? ` (${t.payment_method})` : ''}
                                  {t.operator_name ? ` • Atendió: ${t.operator_name}` : ''}
                                </td>
                                <td className="py-2 px-2 text-right font-black whitespace-nowrap">
                                  <span className={isPurchase ? 'text-rose-600' : 'text-emerald-600'}>
                                    {isPurchase ? '+' : '-'} {formatCurrency(t.amount)}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                                  {formatCurrency(t.new_balance)}
                                </td>
                                <td className="py-2 px-2 text-center text-[10px] text-slate-500 whitespace-nowrap">
                                  {t.status === 'CERTIFIED_BOTH' ? '✓ Conforme' : 'Pendiente PIN'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* CASO 2: INFORME DE CARTERA, MOROSIDAD Y CLIENTES AL DÍA        */}
              {/* ============================================================== */}
              {mode === 'PORTFOLIO_MORA' && (
                <div className="space-y-4">
                  {/* Resumen de cartera */}
                  <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Clientes</span>
                      <span className="font-black text-slate-900 text-sm">{portfolio.length}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-rose-500 block">En Mora</span>
                      <span className="font-black text-rose-600 text-sm">
                        {portfolio.filter((p) => p.statusCategory === 'MORA').length}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-emerald-500 block">Al Día</span>
                      <span className="font-black text-emerald-600 text-sm">
                        {portfolio.filter((p) => p.statusCategory === 'AL_DIA').length}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Deuda Total Cartera</span>
                      <span className="font-black text-slate-900 text-sm">
                        {formatCurrency(portfolio.reduce((sum, p) => sum + (p.currentBalance > 0 ? p.currentBalance : 0), 0))}
                      </span>
                    </div>
                  </div>

                  {/* Tabla completa de Cartera */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Cliente</th>
                          <th className="py-2.5 px-2">Estado</th>
                          <th className="py-2.5 px-2 text-right">Saldo Deudor</th>
                          <th className="py-2.5 px-2 text-right">Límite</th>
                          <th className="py-2.5 px-2 text-right">Compras</th>
                          <th className="py-2.5 px-2 text-right">Pagos</th>
                          <th className="py-2.5 px-3">Último Pago / Mora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {portfolio.map((item) => (
                          <tr key={item.customer.id}>
                            <td className="py-2 px-3">
                              <span className="font-bold text-slate-900 block truncate max-w-[150px]">
                                {item.customer.full_name}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {item.customer.phone || 'Sin tel'} {item.customer.document_id ? `• ${item.customer.document_id}` : ''}
                              </span>
                            </td>
                            <td className="py-2 px-2 whitespace-nowrap">
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  item.statusCategory === 'MORA'
                                    ? 'bg-rose-100 text-rose-700'
                                    : item.statusCategory === 'AL_DIA'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : item.statusCategory === 'EXCEDIDO'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {item.statusCategory === 'MORA'
                                  ? `MORA (${item.daysWithoutPayment}d)`
                                  : item.statusCategory === 'AL_DIA'
                                  ? 'AL DÍA'
                                  : item.statusCategory === 'EXCEDIDO'
                                  ? 'EXCEDIDO'
                                  : 'PENDIENTE'}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right font-black whitespace-nowrap">
                              {formatCurrency(item.currentBalance)}
                            </td>
                            <td className="py-2 px-2 text-right text-slate-600 whitespace-nowrap">
                              {item.creditLimit > 0 ? formatCurrency(item.creditLimit) : 'Sin tope'}
                            </td>
                            <td className="py-2 px-2 text-right text-rose-600 font-bold whitespace-nowrap">
                              +{formatCurrency(item.purchasesInPeriod)}
                            </td>
                            <td className="py-2 px-2 text-right text-emerald-600 font-bold whitespace-nowrap">
                              -{formatCurrency(item.paymentsInPeriod)}
                            </td>
                            <td className="py-2 px-3 text-[10px] text-slate-500 whitespace-nowrap">
                              {item.lastPaymentDate
                                ? `${item.lastPaymentDate.slice(0, 10)} (${item.daysWithoutPayment}d)`
                                : 'Sin pagos'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* CASO 3: REPORTE GENERAL DE VENTAS Y COBRANZAS                   */}
              {/* ============================================================== */}
              {mode === 'SALES_REPORT' && salesSummary && (
                <div className="space-y-5">
                  {/* Resumen de Ventas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-rose-600 block">
                        Ventas Fiadas (+)
                      </span>
                      <span className="text-base font-black text-rose-700 mt-1 block">
                        {formatCurrency(salesSummary.totalVentasFiadas)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-600 block">
                        Cobrado en Caja (-)
                      </span>
                      <span className="text-base font-black text-emerald-700 mt-1 block">
                        {formatCurrency(salesSummary.totalCobrado)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-amber-700 block">
                        Notas de Crédito
                      </span>
                      <span className="text-base font-black text-amber-800 mt-1 block">
                        {formatCurrency(salesSummary.totalNotasCredito)}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-300">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Flujo Neto
                      </span>
                      <span
                        className={`text-base font-black mt-1 block ${
                          salesSummary.flujoNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatCurrency(salesSummary.flujoNeto)}
                      </span>
                    </div>
                  </div>

                  {/* Desglose por Medio de Pago */}
                  <div className="border border-slate-200 rounded-xl p-4">
                    <h3 className="font-bold text-xs uppercase text-slate-500 mb-3">
                      Recaudación por Medios de Pago
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                      {(
                        [
                          { key: 'EFECTIVO', label: 'Efectivo' },
                          { key: 'TRANSFERENCIA', label: 'Transf.' },
                          { key: 'PIX', label: 'Pix' },
                          { key: 'QR_BANCARIO', label: 'QR Banc.' },
                          { key: 'TARJETA_DEBITO', label: 'Débito' },
                          { key: 'TARJETA_CREDITO', label: 'Crédito' },
                        ] as const
                      ).map((m) => (
                        <div key={m.key} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 block font-bold">{m.label}</span>
                          <span className="font-black text-slate-900 block mt-1 truncate">
                            {formatCurrency(salesSummary.paymentMethodsMap[m.key] || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* CASO 4: CONTRATO DE CRÉDITO Y AUTORIZACIÓN INFORMCONF         */}
              {/* ============================================================== */}
              {mode === 'TERMS_CONTRACT' && customer && (
                <div className="space-y-4 text-slate-800 text-[11px] leading-relaxed">
                  {/* Ficha Partes */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Acreedor / Comercio</span>
                      <span className="font-black text-slate-900 block text-xs">{tenant.business_name}</span>
                      <span className="text-[10px] text-slate-500">
                        {tenant.tax_id ? `RUC: ${tenant.tax_id} • ` : ''}
                        {tenant.address || 'Local Comercial'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Deudor / Cliente</span>
                      <span className="font-black text-slate-900 block text-xs">{customer.full_name}</span>
                      <span className="text-[10px] text-slate-500">
                        C.I. N°: {customer.document_id || 'Registrado'} • Tel: {customer.phone || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Resumen del Crédito */}
                  <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-200 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-indigo-700 block">Límite de Crédito</span>
                      <span className="font-black text-slate-900 text-xs">
                        {customer.credit_limit > 0 ? formatCurrency(customer.credit_limit) : 'Sin Tope'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-indigo-700 block">Ciclo de Liquidación</span>
                      <span className="font-black text-slate-900 text-xs">
                        {customer.credit_cycle || 'Mensual'} (Factura a Crédito)
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-indigo-700 block">Validación Compras</span>
                      <span className="font-black text-slate-900 text-xs">PIN Mostrador / QR</span>
                    </div>
                  </div>

                  {/* Cláusulas Legales */}
                  <div className="space-y-2 border border-slate-200 p-3.5 rounded-xl bg-white text-[10px] leading-normal">
                    <p>
                      <b>PRIMERA (OBJETO):</b> El COMERCIO otorga al CLIENTE una línea de crédito rotativo de consumo para retiro de mercaderías ("fiado") hasta el monto autorizado, sujeto a puntualidad en sus pagos.
                    </p>
                    <p className="bg-amber-50 text-amber-900 p-2 rounded-lg border border-amber-200 font-semibold">
                      <b>SEGUNDA (FACULTAD EXCLUSIVA DEL COMERCIO SOBRE LÍMITES Y PLAZOS):</b> El dueño del COMERCIO determina y aprueba de forma privativa y exclusiva el límite de crédito autorizado y los plazos concedidos para otorgar, renovar o suspender la línea de crédito según su evaluación comercial y el cumplimiento del CLIENTE.
                    </p>
                    <p>
                      <b>TERCERA (CONVALIDACIÓN):</b> Cada retiro de mercaderías convalidado mediante el PIN de seguridad o tarjeta QR del CLIENTE constituye constancia legal de recepción de mercaderías con fuerza vinculante (Ley N° 6822/21).
                    </p>
                    <p>
                      <b>CUARTA (FACTURACIÓN):</b> Al cierre de cada ciclo ({customer.credit_cycle || 'Mensual'}), el COMERCIO emitirá la Factura Legal a Crédito por el saldo acumulado, contando el CLIENTE con el plazo convenido para su cancelación.
                    </p>
                    <p>
                      <b>QUINTA (MORA):</b> El incumplimiento de pago al vencimiento producirá la mora automática de pleno derecho y el bloqueo inmediato de la línea de crédito.
                    </p>
                    <p className="bg-rose-50 text-rose-900 p-2 rounded-lg border border-rose-200 font-semibold">
                      <b>SEXTA (AUTORIZACIÓN INFORMCONF - LEY N° 6534/20):</b> El CLIENTE presta su expreso e irrevocable consentimiento para que el COMERCIO consulte su historial crediticio y, en caso de incurrir en mora superior al plazo legal estipulado, reporte sus datos personales y saldo impago a la base de datos de INFORMCONF (Equifax Paraguay S.A.) y/o buroes autorizados.
                    </p>
                  </div>

                  {/* Cuadro de Consentimiento y Firma */}
                  {customer.terms_accepted ? (
                    <div className="bg-emerald-50 border-2 border-emerald-300 p-3.5 rounded-xl text-emerald-950 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="font-black text-xs uppercase tracking-wide">
                          CONSENTIMIENTO ELECTRÓNICO CONVALIDADO Y REGISTRADO
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] pt-1">
                        <div>
                          <span className="text-emerald-700 font-bold block">Fecha & Hora:</span>
                          <span className="font-mono font-bold text-slate-800 whitespace-nowrap">
                            {new Date(customer.terms_accepted_at || customer.created_at).toLocaleString('es-PY', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false,
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-emerald-700 font-bold block">Canal de Aceptación:</span>
                          <span className="font-bold text-slate-800">
                            {customer.terms_acceptance_method === 'PORTAL_PIN'
                              ? 'Portal Móvil (PIN de Seguridad)'
                              : 'Mostrador Comercial (PIN)'}
                          </span>
                        </div>
                        <div>
                          <span className="text-emerald-700 font-bold block">Evidencia Digital:</span>
                          <span className="font-mono text-slate-700 break-all">
                            {customer.terms_acceptance_metadata?.ip
                              ? `IP ${customer.terms_acceptance_metadata.ip} • `
                              : ''}
                            Cód: {customer.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[10px] text-amber-900 flex justify-between items-center gap-2">
                      <span>⚠️ Documento emitido para firma en soporte físico o validación previa con PIN.</span>
                      <span className="font-bold shrink-0">Pendiente</span>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================== */}
              {/* CASO 6: RELATORIO GENERAL DE CIERRE DE ACTIVIDADES & RESPALDO   */}
              {/* ============================================================== */}
              {mode === 'DAILY_CLOSING_REPORT' && (() => {
                const totalCarteraPendiente = effectiveCustomers.reduce(
                  (acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0),
                  0
                );
                const closingTxs = transactions;
                const totalFiadoPeriodo = closingTxs
                  .filter((t) => t.type === 'DEBIT_PURCHASE' || t.type === 'ADJUSTMENT_DEBIT')
                  .reduce((acc, t) => acc + t.amount, 0);
                const totalCobradoPeriodo = closingTxs
                  .filter((t) => t.type === 'CREDIT_PAYMENT')
                  .reduce((acc, t) => acc + t.amount, 0);
                const clientesConDeuda = effectiveCustomers.filter((c) => c.current_balance > 0);
                const clientesAlDia = effectiveCustomers.filter((c) => c.current_balance <= 0);

                return (
                  <div className="space-y-4">
                    {/* KPI CARDS RESUMEN */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="bg-rose-50/70 border border-rose-200/80 p-3 rounded-xl">
                        <span className="text-[9px] font-black uppercase text-rose-600 block">Total Cartera Fiada</span>
                        <span className="text-base sm:text-lg font-black text-rose-700 block">
                          {formatCurrency(totalCarteraPendiente)}
                        </span>
                        <span className="text-[9.5px] text-rose-500 font-medium">Deuda activa en la calle</span>
                      </div>

                      <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-xl">
                        <span className="text-[9px] font-black uppercase text-emerald-600 block">Total Cobrado (Jornada)</span>
                        <span className="text-base sm:text-lg font-black text-emerald-700 block">
                          {formatCurrency(totalCobradoPeriodo)}
                        </span>
                        <span className="text-[9.5px] text-emerald-600 font-medium">Ingresos recibidos en caja</span>
                      </div>

                      <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl">
                        <span className="text-[9px] font-black uppercase text-amber-600 block">Total Fiado (Jornada)</span>
                        <span className="text-base sm:text-lg font-black text-amber-700 block">
                          {formatCurrency(totalFiadoPeriodo)}
                        </span>
                        <span className="text-[9.5px] text-amber-600 font-medium">Nuevas compras fiadas</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <span className="text-[9px] font-black uppercase text-slate-500 block">Clientes con Saldo</span>
                        <span className="text-base sm:text-lg font-black text-slate-900 block">
                          {clientesConDeuda.length} <span className="text-xs font-normal text-slate-400">/ {effectiveCustomers.length}</span>
                        </span>
                        <span className="text-[9.5px] text-slate-500 font-medium">{clientesAlDia.length} al día</span>
                      </div>
                    </div>

                    {/* LISTA COMPACTA DE SALDOS */}
                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[560px] sm:min-w-0">
                        <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-2.5 text-center w-8">#</th>
                            <th className="py-2 px-2.5">Cliente (Titular)</th>
                            <th className="py-2 px-2 text-slate-500">Doc / C.I.</th>
                            <th className="py-2 px-2 text-slate-500">Teléfono</th>
                            <th className="py-2 px-2 text-right">Límite</th>
                            <th className="py-2 px-3 text-right">Saldo Deudor Actual</th>
                            <th className="py-2 px-2 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {effectiveCustomers.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-6 text-slate-400">
                                No hay clientes registrados en este comercio.
                              </td>
                            </tr>
                          ) : (
                            [...effectiveCustomers]
                              .sort((a, b) => b.current_balance - a.current_balance)
                              .map((c, idx) => {
                                const hasDebt = c.current_balance > 0;
                                return (
                                  <tr key={c.id} className={hasDebt ? 'hover:bg-rose-50/20' : 'hover:bg-slate-50/50'}>
                                    <td className="py-1.5 px-2.5 text-center font-mono text-slate-400 text-[10px]">
                                      {idx + 1}
                                    </td>
                                    <td className="py-1.5 px-2.5 font-bold text-slate-900 truncate max-w-[160px]">
                                      {c.full_name}
                                      {c.nickname && <span className="text-[10px] font-normal text-slate-400 ml-1">("{c.nickname}")</span>}
                                    </td>
                                    <td className="py-1.5 px-2 font-mono text-slate-600 text-[10px]">
                                      {c.document_id || '-'}
                                    </td>
                                    <td className="py-1.5 px-2 text-slate-600 text-[10px]">
                                      {c.phone || '-'}
                                    </td>
                                    <td className="py-1.5 px-2 text-right text-slate-500 font-mono text-[10px]">
                                      {c.credit_limit > 0 ? formatCurrency(c.credit_limit) : '-'}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-black whitespace-nowrap">
                                      <span className={hasDebt ? 'text-rose-600' : 'text-emerald-600'}>
                                        {formatCurrency(c.current_balance)}
                                      </span>
                                    </td>
                                    <td className="py-1.5 px-2 text-center whitespace-nowrap">
                                      <span
                                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                          hasDebt ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                        }`}
                                      >
                                        {hasDebt ? 'CON DEUDA' : 'AL DÍA'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                          )}
                        </tbody>
                        <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                          <tr>
                            <td colSpan={5} className="py-2.5 px-3 text-slate-700 uppercase font-black">
                              Total Cartera Fiada al Cierre:
                            </td>
                            <td className="py-2.5 px-3 text-right text-sm font-black text-rose-700 whitespace-nowrap">
                              {formatCurrency(totalCarteraPendiente)}
                            </td>
                            <td className="py-2.5 px-2 text-center text-[10px] text-slate-500">
                              {clientesConDeuda.length} activos
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* CONSTANCIA LEGAL Y SELLO DE SEGURIDAD INMUTABLE */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10.5px] text-slate-600 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Certificación de Respaldo Contable & Contingencia (Ley N° 6822/21)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        El presente relatorio general de actividades certifica el saldo total deudor y la liquidación consolidada de todos los clientes fiados a la fecha de corte. Este documento y su copia enviada por WhatsApp constituyen respaldo fehaciente ante cualquier eventualidad o pérdida de datos.
                      </p>
                    </div>

                    {/* FIRMAS DE RESPONSABILIDAD */}
                    <div className="pt-4 grid grid-cols-2 gap-8 text-center text-xs">
                      <div>
                        <div className="border-b border-slate-300 pb-8 mb-1"></div>
                        <p className="font-bold text-slate-800">Responsable de Caja / Operador</p>
                        <p className="text-[10px] text-slate-400">Certificación de Cierre Diario</p>
                      </div>
                      <div>
                        <div className="border-b border-slate-300 pb-8 mb-1"></div>
                        <p className="font-bold text-slate-800">Titular / Gerencia del Comercio</p>
                        <p className="text-[10px] text-slate-400">{tenant.business_name}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* PIE DE PÁGINA Y SELLO DE CERTIFICACIÓN */}
            <div className="pt-5 mt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-[10px] text-slate-500">
              <div className="flex items-start gap-3">
                {customer && portalUrl ? (
                  <div className="p-1 bg-white border border-slate-300 rounded-lg shrink-0">
                    <QRCodeSVG value={portalUrl} size={54} />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-300 flex items-center justify-center font-black text-slate-400 shrink-0">
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="font-black text-slate-800 block leading-snug">
                    {tenant.business_name} • Certificado de Registro Inmutable
                  </span>
                  <p className="max-w-xs text-slate-500 leading-snug mt-0.5">
                    Documento generado por LibretaDigital Pro. Todas las operaciones cuentan con
                    trazabilidad y doble verificación contra disputas.
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-auto text-right pt-2 sm:pt-0 shrink-0">
                <div className="w-40 border-b border-slate-400 mb-1 inline-block" />
                <span className="block font-bold text-slate-700">Firma / Sello del Comercio</span>
                <span className="text-[9px] text-slate-400">Auditoría POS LibretaDigital</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
