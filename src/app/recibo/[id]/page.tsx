'use client';

import React, { useState, useEffect, Suspense, use } from 'react';
import { Customer, Tenant, Transaction, PrinterFormat } from '@/types';
import {
  getStoredData,
  INITIAL_CUSTOMERS,
  INITIAL_TENANT,
  INITIAL_TRANSACTIONS,
  getStoredPrinterFormat,
  ensureValidUuid,
} from '@/lib/storage';
import { downloadReceiptPDF } from '@/lib/pdfReceipt';
import { BrandLogo } from '@/components/BrandLogo';
import {
  Download,
  Printer,
  CheckCircle2,
  Receipt,
  ArrowDownLeft,
  Calendar,
  Building,
  User,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
  Smartphone
} from 'lucide-react';

function ReceiptDetail({ id }: { id: string }) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [format, setFormat] = useState<PrinterFormat>('TICKET_80MM');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setFormat(getStoredPrinterFormat());
  }, []);

  useEffect(() => {
    async function loadReceipt() {
      // 1. Intentar desde almacenamiento local primero
      const local = getStoredData();
      const targetUuid = ensureValidUuid(id);
      const localTx = local.transactions.find(
        (t) => t.id === id || ensureValidUuid(t.id) === targetUuid
      );
      if (localTx) {
        setTransaction(localTx);
        setTenant(local.tenant);
        const localCust = local.customers.find(
          (c) => c.id === localTx.customer_id || ensureValidUuid(c.id) === ensureValidUuid(localTx.customer_id)
        );
        if (localCust) setCustomer(localCust);
      }

      // 2. Consultar en la API en la nube central
      try {
        const txRes = await fetch(`/api/transactions?t=${Date.now()}`, { cache: 'no-store' });
        if (txRes.ok) {
          const txJson = await txRes.json();
          if (txJson.success && Array.isArray(txJson.transactions)) {
            const foundTx = txJson.transactions.find(
              (t: Transaction) => t.id === id || ensureValidUuid(t.id) === targetUuid
            );
            if (foundTx) {
              setTransaction(foundTx);

              // Cargar cliente
              const custRes = await fetch(`/api/customers?tenantId=${foundTx.tenant_id}`);
              if (custRes.ok) {
                const custJson = await custRes.json();
                if (custJson.success && Array.isArray(custJson.customers)) {
                  const foundCust = custJson.customers.find((c: Customer) => c.id === foundTx.customer_id);
                  if (foundCust) setCustomer(foundCust);
                }
              }

              // Cargar comercio
              const tRes = await fetch(`/api/tenants?id=${foundTx.tenant_id}`);
              if (tRes.ok) {
                const tJson = await tRes.json();
                if (tJson.success && tJson.tenant) {
                  setTenant(tJson.tenant);
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('API receipt fetch notice:', e);
      }

      // 3. Fallback a mocks iniciales si es el demo
      if (!transaction) {
        const mockTx = INITIAL_TRANSACTIONS.find((t) => t.id === id);
        if (mockTx) {
          setTransaction(mockTx);
          setTenant(INITIAL_TENANT);
          const mockCust = INITIAL_CUSTOMERS.find((c) => c.id === mockTx.customer_id);
          if (mockCust) setCustomer(mockCust);
        }
      }

      setLoading(false);
    }

    loadReceipt();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <BrandLogo size="md" theme="light" />
          <p className="text-xs font-bold text-slate-500">Cargando comprobante de pago oficial en PDF...</p>
        </div>
      </div>
    );
  }

  if (!transaction || !customer || !tenant) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl max-w-sm text-center border border-slate-200 space-y-3">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-black text-slate-900">Comprobante No Encontrado</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            El código o identificador del recibo solicitado no existe o ha sido modificado. Verifique el enlace recibido por WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  const isFullPayment = transaction.new_balance <= 0;
  const cleanId = transaction.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  const receiptNum = `REC-${new Date(transaction.created_at).getFullYear()}-${cleanId}`;
  const dateFormatted = new Date(transaction.created_at).toLocaleString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formatCurrency = (val: number) => {
    return `${tenant.currency_symbol} ${new Intl.NumberFormat(
      tenant.currency_code === 'PYG' ? 'es-PY' : tenant.currency_code === 'BRL' ? 'pt-BR' : 'es-PE'
    ).format(val)}`;
  };

  const handleDownload = () => {
    downloadReceiptPDF(transaction, customer, tenant, format);
  };

  return (
    <main className="min-h-screen bg-slate-100/80 p-3 sm:p-6 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4">
        {/* ENCABEZADO SUPERIOR */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                Comprobante Oficial de Pago
              </span>
              <h1 className="text-xs font-black text-white">{receiptNum}</h1>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-400">{dateFormatted}</span>
        </div>

        {/* CUERPO DEL RECIBO */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* DATOS DEL COMERCIO */}
          <div className="text-center border-b border-dashed border-slate-200 pb-3">
            <div className="flex justify-center mb-1.5">
              <BrandLogo size="sm" theme="light" />
            </div>
            <h2 className="text-base font-black text-slate-900 uppercase">
              {tenant.business_name}
            </h2>
            <div className="text-[11px] text-slate-500 space-y-0.5 mt-0.5">
              {tenant.tax_id && <p className="font-semibold text-slate-700">RUC: {tenant.tax_id}</p>}
              {tenant.address && <p>📍 {tenant.address}</p>}
              {tenant.phone && <p>📞 WhatsApp: {tenant.phone}</p>}
            </div>
          </div>

          {/* DISTINTIVO DE ESTADO */}
          <div className="text-center">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                isFullPayment
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-blue-100 text-blue-800 border border-blue-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {isFullPayment ? 'PAGO TOTAL (DEUDA CANCELADA)' : 'ABONO PARCIAL A CUENTA'}
            </span>
          </div>

          {/* DATOS DEL CLIENTE */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Cliente Titular
            </span>
            <div className="flex justify-between items-start">
              <div>
                <span className="font-black text-slate-900 text-sm block">{customer.full_name}</span>
                {customer.nickname && (
                  <span className="text-slate-500 text-[11px]">"{customer.nickname}"</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-slate-700 font-semibold block">
                  {customer.document_id ? `Doc: ${customer.document_id}` : 'Sin documento'}
                </span>
                <span className="text-slate-500 text-[11px]">{customer.phone || 'Sin WhatsApp'}</span>
              </div>
            </div>
          </div>

          {/* DESGLOSE ECONÓMICO */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
            <div className="p-3 bg-slate-50 flex justify-between items-center text-slate-600 font-medium">
              <span>Saldo Deudor Anterior:</span>
              <span className="font-bold text-slate-800">{formatCurrency(transaction.previous_balance)}</span>
            </div>

            <div className="p-3.5 bg-emerald-50 flex justify-between items-center text-emerald-950 font-black">
              <div className="flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span className="text-sm">MONTO ABONADO:</span>
              </div>
              <span className="text-lg text-emerald-600 font-black">
                {formatCurrency(transaction.amount)}
              </span>
            </div>

            <div
              className={`p-3 flex justify-between items-center ${
                isFullPayment ? 'bg-emerald-100/60 text-emerald-950 font-black' : 'bg-white text-slate-900 font-bold'
              }`}
            >
              <span>Saldo Restante a Pagar:</span>
              <span className="text-sm font-black">
                {formatCurrency(transaction.new_balance)}
                {isFullPayment && ' (¡Al Día!)'}
              </span>
            </div>
          </div>

          {/* MEDIO DE PAGO & CAJERO */}
          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Medio de Pago:</span>
              <span className="font-bold text-slate-800">{transaction.payment_method || 'Efectivo en Caja'}</span>
              {transaction.payment_reference && (
                <span className="text-slate-500 block text-[10px]">Ref: {transaction.payment_reference}</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Operador / Caja:</span>
              <span className="font-bold text-slate-800">{transaction.operator_name || 'Caja Central'}</span>
              <span className="text-emerald-700 block text-[10px] font-bold">✓ Certificado</span>
            </div>
          </div>

          {/* SELECTOR DE FORMATO DE IMPRESIÓN Y PDF */}
          <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block text-center mb-1.5">
              Elige el Formato de tu Impresora:
            </label>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setFormat('TICKET_58MM')}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] font-black transition cursor-pointer ${
                  format === 'TICKET_58MM'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="POS Portátil 58mm / 57mm"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>POS 58mm</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('TICKET_80MM')}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] font-black transition cursor-pointer ${
                  format === 'TICKET_80MM'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="POS Mostrador 80mm"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>POS 80mm</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('PAGE_A4')}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] font-black transition cursor-pointer ${
                  format === 'PAGE_A4'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Hoja A4 estándar"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Hoja A4</span>
              </button>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN: DESCARGAR PDF OFICIAL */}
          <div className="pt-2 space-y-2">
            <button
              onClick={handleDownload}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-98 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                Descargar PDF ({format === 'TICKET_58MM' ? 'POS 58mm' : format === 'TICKET_80MM' ? 'POS 80mm' : 'Hoja A4'})
              </span>
            </button>

            <a
              href={`/portal/${customer.qr_token}`}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition text-center"
            >
              <span>Acceder a mi Libreta Digital & Tarjeta QR</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>

          {/* PIE LEGAL */}
          <div className="text-center pt-2">
            <p className="text-[10px] text-slate-400 leading-tight">
              Documento con validez legal probatoria conforme a las Leyes N° 6822/21 y N° 6534/20.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
          Cargando recibo...
        </div>
      }
    >
      <ReceiptDetail id={resolvedParams.id} />
    </Suspense>
  );
}
