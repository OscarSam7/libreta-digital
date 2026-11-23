'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Customer, Transaction, Tenant } from '@/types';
import { getStoredData, syncFromSupabase, saveCustomers } from '@/lib/storage';
import { certifyTransactionWithPin } from '@/lib/ledger';
import { acceptCustomerTerms } from '@/lib/customers';
import { exportTransactionsToCSV } from '@/lib/reports';
import { PDFReportPreviewModal } from '@/components/PDFReportPreviewModal';
import { PaymentReceiptModal } from '@/components/PaymentReceiptModal';
import { CustomDateInput } from '@/components/ui/CustomDatePickerModal';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronDown,
  Download,
  AlertCircle,
  Lock,
  ArrowDownLeft,
  ShoppingBag,
  FileText,
  Check,
  HelpCircle,
  Receipt,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BrandLogo } from '@/components/BrandLogo';

interface Props {
  token: string;
}

export function CustomerPortalView({ token }: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [signingTxId, setSigningTxId] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [signError, setSignError] = useState('');

  // Estados de aceptación de términos e Informconf
  const [termsPin, setTermsPin] = useState('');
  const [termsAcceptedCheckbox, setTermsAcceptedCheckbox] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [showContractModal, setShowContractModal] = useState(false);
  const [showStatementPDF, setShowStatementPDF] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(true);
  const [viewingReceiptTx, setViewingReceiptTx] = useState<Transaction | null>(null);

  // Filtros de fecha y tipo para asientos inmutables del cliente
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | '7D' | 'THIS_MONTH' | '30D' | 'CUSTOM'>('ALL');
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');

  // Helper de fecha local sin desviación UTC
  const getLocalDateString = (d?: string | Date | null) => {
    if (!d) return '';
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const applyDatePreset = (preset: 'ALL' | 'TODAY' | '7D' | 'THIS_MONTH' | '30D') => {
    setDatePreset(preset);
    if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
      return;
    }
    const now = new Date();
    const todayStr = getLocalDateString(now);

    if (preset === 'TODAY') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === '7D') {
      const fromD = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      setDateFrom(getLocalDateString(fromD));
      setDateTo(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(getLocalDateString(firstOfMonth));
      setDateTo(todayStr);
    } else if (preset === '30D') {
      const fromD = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      setDateFrom(getLocalDateString(fromD));
      setDateTo(todayStr);
    }
  };

  // Transacciones filtradas con fecha local precisa y sin distorsión UTC (al tope para respetar Reglas de Hooks de React)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const isPurchase = tx.type === 'DEBIT_PURCHASE' || tx.type === 'ADJUSTMENT_DEBIT';
      if (txTypeFilter === 'DEBIT' && !isPurchase) return false;
      if (txTypeFilter === 'CREDIT' && isPurchase) return false;

      const txLocalDate = getLocalDateString(tx.created_at);
      let effectiveFrom = dateFrom;
      let effectiveTo = dateTo;
      if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
        [effectiveFrom, effectiveTo] = [effectiveTo, effectiveFrom];
      }

      if (effectiveFrom && txLocalDate < effectiveFrom) return false;
      if (effectiveTo && txLocalDate > effectiveTo) return false;
      return true;
    });
  }, [transactions, txTypeFilter, dateFrom, dateTo]);

  const totalDebitsFiltered = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'DEBIT_PURCHASE' || t.type === 'ADJUSTMENT_DEBIT')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransactions]);

  const totalCreditsFiltered = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'CREDIT_PAYMENT' || t.type === 'ADJUSTMENT_CREDIT')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransactions]);

  const loadData = async () => {
    // 1. Cargar datos locales de inmediato si existen
    const data = getStoredData();
    if (data.tenant) setTenant(data.tenant);
    const found = data.customers.find((c) => c.qr_token === token);
    if (found) {
      setCustomer(found);
      const custTxs = data.transactions.filter((t) => t.customer_id === found.id);
      setTransactions(custTxs);
      setIsLoadingCloud(false);
    }

    // 2. Consultar siempre la nube central para sincronización real en cualquier celular
    try {
      const res = await fetch(`/api/customers?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.customer) {
          setCustomer(json.customer);
          if (json.tenant) setTenant(json.tenant);

          // Cargar transacciones del cliente desde la API central
          const txRes = await fetch(`/api/transactions?tenantId=${json.customer.tenant_id}&customerId=${json.customer.id}`);
          if (txRes.ok) {
            const txJson = await txRes.json();
            if (txJson.success && Array.isArray(txJson.transactions)) {
              setTransactions(txJson.transactions);
            }
          }

          // Guardar localmente para disponibilidad offline
          const currentData = getStoredData();
          if (!currentData.customers.some((c) => c.id === json.customer.id)) {
            const updatedCusts = [json.customer, ...currentData.customers];
            saveCustomers(updatedCusts);
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching cloud customer token:', err);
    } finally {
      setIsLoadingCloud(false);
    }
  };

  useEffect(() => {
    loadData();
    syncFromSupabase();

    const handleUpdate = () => loadData();
    window.addEventListener('libreta_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('libreta_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [token]);

  // Recordar última sesión del cliente para reingreso rápido sin perder su libreta
  useEffect(() => {
    if (customer?.qr_token && customer?.full_name && tenant?.business_name) {
      try {
        localStorage.setItem(
          'libretadigital_last_customer',
          JSON.stringify({
            token: customer.qr_token,
            name: customer.full_name,
            businessName: tenant.business_name,
          })
        );
      } catch {}
    }
  }, [customer?.qr_token, customer?.full_name, tenant?.business_name]);

  if (isLoadingCloud && (!customer || !tenant)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <BrandLogo size="md" theme="light" />
          <p className="text-xs font-bold text-slate-500">Cargando libreta digital y cuenta corriente...</p>
        </div>
      </div>
    );
  }

  if (!customer || !tenant) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl text-center max-w-sm shadow-xl space-y-3">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-black text-slate-800">Código QR No Encontrado</h2>
          <p className="text-xs text-slate-500">
            El enlace o código escaneado no es válido o ha expirado. Comuníquese con el comercio.
          </p>
        </div>
      </div>
    );
  }

  const handleSignOperation = (txId: string) => {
    setSignError('');
    const res = certifyTransactionWithPin(txId, pinInput, 'REMOTE_QR_APPROVAL');
    if (res.success) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      setSigningTxId(null);
      setPinInput('');

      // Sincronizar certificación en la API central
      const targetTx = transactions.find((t) => t.id === txId);
      if (targetTx) {
        fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...targetTx,
            status: 'CERTIFIED_BOTH',
            validated_at: new Date().toISOString(),
            validation_method: 'REMOTE_QR_APPROVAL',
          }),
        }).catch(() => {});
      }

      loadData();
    } else {
      setSignError(res.message);
    }
  };

  const handleAcceptTerms = () => {
    setTermsError('');
    if (!customer) return;

    if (!termsAcceptedCheckbox) {
      setTermsError('Debe marcar la casilla aceptando los términos y la autorización Informconf.');
      return;
    }

    if (!termsPin.trim()) {
      setTermsError('Ingrese su PIN de seguridad de 4 dígitos para convalidar la firma.');
      return;
    }

    const res = acceptCustomerTerms(
      customer.id,
      termsPin.trim(),
      'PORTAL_PIN',
      customer.credit_cycle || 'MENSUAL'
    );
    if (!res.success || !res.customer) {
      setTermsError(res.error || 'PIN incorrecto');
      return;
    }

    try {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });
    } catch {}

    setCustomer(res.customer);
    setTermsPin('');

    // Sincronizar con la API central
    fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(res.customer),
    }).catch(() => {});
  };

  const isOverLimit =
    customer.credit_limit > 0 && customer.current_balance > customer.credit_limit;

  const formatCurrency = (val: number) => {
    const sym = tenant?.currency_symbol === '₲' || !tenant?.currency_symbol ? 'Gs.' : tenant.currency_symbol;
    return `${sym} ${new Intl.NumberFormat(
      tenant?.currency_code === 'PYG' ? 'es-PY' : tenant?.currency_code === 'BRL' ? 'pt-BR' : 'es-PE'
    ).format(val || 0)}`;
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto pb-16 font-sans">
      {/* Logotipo Oficial LibretaDigital Pro */}
      <div className="flex justify-center mb-3 pt-2">
        <BrandLogo size="md" theme="light" />
      </div>

      {/* Header Comercio emisor */}
      <div className="text-center mb-4 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
          Comercio Emisor
        </span>
        <h2 className="text-base font-black text-slate-900">{tenant.business_name}</h2>
        {tenant.phone && (
          <p className="text-xs text-slate-500 font-medium mt-0.5">Contacto: +{tenant.phone}</p>
        )}
      </div>

      {/* Tarjeta Principal de Saldo */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
              Titular de Cuenta
            </span>
            <h1 className="text-2xl font-black tracking-tight">{customer.full_name}</h1>
            {customer.nickname && (
              <p className="text-xs text-indigo-300">"{customer.nickname}"</p>
            )}
            <p className="text-xs text-slate-400 mt-0.5">
              C.I / Documento: {customer.document_id || 'Registrado'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5" /> Verificado
          </div>
        </div>

        <div className="my-5">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
            Saldo Deudor al Momento
          </span>
          <div className="text-4xl font-black tracking-tight text-white mt-1">
            {formatCurrency(customer.current_balance)}
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-300 border-t border-white/10 pt-4">
          <div>
            <span className="text-[10px] uppercase block text-slate-400 font-bold">
              Límite Autorizado
            </span>
            <span className="font-bold text-white">
              {customer.credit_limit > 0 ? formatCurrency(customer.credit_limit) : 'Sin límite'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase block text-indigo-300 font-bold">
              Mi PIN de Firma
            </span>
            <span className="font-mono font-black text-white bg-white/20 px-2.5 py-0.5 rounded text-sm tracking-widest">
              {customer.security_pin}
            </span>
          </div>
        </div>

        {isOverLimit && (
          <div className="mt-4 bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs p-2.5 rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Ha alcanzado el límite máximo de crédito pactado con el local.</span>
          </div>
        )}
      </div>

      {/* TARJETA DE ACEPTACIÓN DE TÉRMINOS & INFORMCONF */}
      {!customer.terms_accepted ? (
        <div className="mt-4 bg-white rounded-3xl p-5 shadow-lg border-2 border-indigo-500 space-y-3.5 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                Habilitación de Crédito
              </span>
              <h3 className="text-sm font-black text-slate-900 leading-snug">
                Términos y Condiciones & Autorización Informconf
              </h3>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              <b>1. Factura a Crédito:</b> Al cierre de cada ciclo ({customer.credit_cycle || 'Mensual'}), el local emitirá una factura legal a crédito por el total acumulado de tus compras.
            </p>
            <p className="text-amber-900 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 font-medium">
              <b>2. Facultad Exclusiva del Dueño del Almacén:</b> El dueño del almacén o comercio es quien determina de manera exclusiva el límite de crédito otorgado y el plazo para conceder, renovar o suspender la línea de crédito según su evaluación comercial y el cumplimiento del cliente.
            </p>
            <p className="text-rose-800 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              <b>3. Informconf (Ley N° 6534/20):</b> Autorizas a {tenant.business_name} a consultar tu historial crediticio y a reportar tus datos a la base de morosidad de INFORMCONF en caso de incumplimiento de pagos por el plazo legal.
            </p>
          </div>

          {termsError && (
            <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2 rounded-xl border border-rose-200">
              {termsError}
            </p>
          )}

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAcceptedCheckbox}
                onChange={(e) => setTermsAcceptedCheckbox(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                He leído y acepto los Términos de Crédito y la autorización crediticia de Informconf conforme a la Ley N° 6534/20.
              </span>
            </label>

            <div className="flex gap-2 items-center">
              <input
                type="password"
                maxLength={4}
                placeholder="PIN"
                value={termsPin}
                onChange={(e) => setTermsPin(e.target.value)}
                className="w-24 p-2.5 bg-slate-50 border-2 border-indigo-400 rounded-xl font-mono text-center text-sm font-black tracking-widest focus:outline-none focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAcceptTerms}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/30 transition active:scale-95"
              >
                Activar Línea de Crédito
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              Digita tu PIN secreto de 4 dígitos para convalidar electrónicamente.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold block">Crédito Habilitado</span>
              <span className="text-[10px] text-emerald-700">
                Términos e Informconf convalidado electrónicamente
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowContractModal(true)}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
          >
            Ver Contrato
          </button>
        </div>
      )}

      {/* Libro Mayor Inmutable de Deudas y Pagos con Filtro por Fecha */}
      <section className="mt-6 space-y-3">
        <div className="flex justify-between items-center gap-2">
          <div>
            <h2 className="text-base font-black text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> Asientos Inmutables
            </h2>
            <p className="text-[10px] text-slate-500">
              Registro inalterable de tus deudas y pagos
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowStatementPDF(true)}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition shadow-xs cursor-pointer"
              title="Previsualizar y descargar Extracto de Cuenta en PDF"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Extracto PDF</span>
            </button>
            <button
              type="button"
              onClick={() => exportTransactionsToCSV(filteredTransactions, tenant, customer.full_name)}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer"
              title="Exportar movimientos a Excel / CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS POR FECHA Y TIPO CON DIÁLOGOS ERGONÓMICOS */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs space-y-2.5">
          {/* Accesos rápidos de fecha */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: 'Todos' },
                { id: 'TODAY', label: 'Hoy' },
                { id: '7D', label: '7 días' },
                { id: 'THIS_MONTH', label: 'Este Mes' },
                { id: '30D', label: '30 días' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyDatePreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}

            <div className="ml-auto flex gap-1">
              {(
                [
                  { id: 'ALL', label: 'Todo' },
                  { id: 'DEBIT', label: 'Deudas' },
                  { id: 'CREDIT', label: 'Pagos' },
                ] as const
              ).map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setTxTypeFilter(tf.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    txTypeFilter === tf.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rango de fechas ergonómico con modal adaptativo */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">
                Desde
              </label>
              <CustomDateInput
                value={dateFrom}
                onChange={(val) => {
                  setDateFrom(val);
                  setDatePreset('CUSTOM');
                }}
                label="Fecha Desde"
                className="w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">
                Hasta
              </label>
              <CustomDateInput
                value={dateTo}
                onChange={(val) => {
                  setDateTo(val);
                  setDatePreset('CUSTOM');
                }}
                label="Fecha Hasta"
                className="w-full text-xs"
              />
            </div>
          </div>

          {/* Resumen del período filtrado */}
          <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-100 text-center">
            <div className="bg-rose-50/70 rounded-xl py-1.5 px-1">
              <span className="text-[9px] font-bold uppercase text-rose-500 block">Deudas</span>
              <span className="text-xs font-black text-rose-700">{formatCurrency(totalDebitsFiltered)}</span>
            </div>
            <div className="bg-emerald-50/70 rounded-xl py-1.5 px-1">
              <span className="text-[9px] font-bold uppercase text-emerald-600 block">Pagos</span>
              <span className="text-xs font-black text-emerald-700">{formatCurrency(totalCreditsFiltered)}</span>
            </div>
            <div className="bg-slate-50 rounded-xl py-1.5 px-1">
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Asientos</span>
              <span className="text-xs font-black text-slate-800">{filteredTransactions.length}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-slate-500 text-xs border border-slate-200 space-y-2.5">
              <p className="font-bold text-slate-700">
                No se encontraron asientos en el rango de fechas seleccionado.
              </p>
              <p className="text-[11px] text-slate-400">
                Prueba seleccionando otro rango de fechas o restablece los filtros.
              </p>
              {(dateFrom || dateTo || txTypeFilter !== 'ALL' || datePreset !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    applyDatePreset('ALL');
                    setTxTypeFilter('ALL');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ver todo el historial ({transactions.length})</span>
                </button>
              )}
            </div>
          ) : (
                filteredTransactions.map((tx) => {
                  const isPurchase =
                    tx.type === 'DEBIT_PURCHASE' || tx.type === 'ADJUSTMENT_DEBIT';
                  const isOpen = expandedTxId === tx.id;
                  const isPending = tx.status === 'PENDING_CUSTOMER';

                  return (
                    <div
                      key={tx.id}
                      className={`bg-white rounded-2xl p-4 shadow-sm border transition ${
                        isPending ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200/80'
                      }`}
                    >
                      <div
                        className="flex justify-between items-center cursor-pointer select-none"
                        onClick={() => setExpandedTxId(isOpen ? null : tx.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                              isPurchase
                                ? 'bg-rose-100 text-rose-600'
                                : 'bg-emerald-100 text-emerald-600'
                            }`}
                          >
                            {isPurchase ? (
                              <ShoppingBag className="w-4 h-4" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-900 leading-snug">
                              {tx.description}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(tx.created_at).toLocaleDateString('es-PY', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                              Saldo: {formatCurrency(tx.previous_balance)} → <b className="text-slate-600">{formatCurrency(tx.new_balance)}</b>
                              {tx.blockchain_hash ? ` • #${tx.blockchain_hash.slice(0, 10)}` : ''}
                            </p>
                          </div>
                        </div>

                    <div className="text-right flex items-center gap-2">
                      <div>
                        <div
                          className={`font-black text-sm ${
                            isPurchase ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {isPurchase ? '+' : '-'}
                          {tenant.currency_symbol} {tx.amount.toLocaleString('es-PY')}
                        </div>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            !isPending
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {tx.status === 'CERTIFIED_BOTH' ? 'Certificado' : 'Por Validar'}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Detalle Desplegable */}
                  {isOpen && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-3 text-xs animate-in fade-in duration-200">
                      {tx.items && tx.items.length > 0 && (
                        <div className="bg-slate-50 p-2.5 rounded-xl space-y-1">
                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Detalle de Productos
                          </p>
                          {tx.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-slate-600">
                              <span>
                                {it.qty}x {it.name}
                              </span>
                              <span className="font-semibold">
                                {tenant.currency_symbol} {(it.qty * it.price).toLocaleString('es-PY')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Auditoría de Saldo Inmutable */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl font-mono">
                        <div>
                          <span>Saldo Anterior:</span>{' '}
                          <b className="text-slate-800">
                            {tenant.currency_symbol} {tx.previous_balance.toLocaleString('es-PY')}
                          </b>
                        </div>
                        <div>
                          <span>Saldo Nuevo:</span>{' '}
                          <b className="text-slate-800">
                            {tenant.currency_symbol} {tx.new_balance.toLocaleString('es-PY')}
                          </b>
                        </div>
                      </div>

                      {/* Botón de Comprobante de Recibo Oficial para Abonos/Pagos */}
                      {!isPurchase && (
                        <button
                          type="button"
                          onClick={() => setViewingReceiptTx(tx)}
                          className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-emerald-200 transition cursor-pointer"
                        >
                          <Receipt className="w-4 h-4 text-emerald-600" />
                          <span>Ver Comprobante de Recibo Oficial</span>
                        </button>
                      )}

                      {/* Acciones de Firma Remota si está pendiente */}
                      {isPending && (
                        <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 space-y-2">
                          <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
                            <Lock className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Conformar esta compra con su PIN</span>
                          </div>
                          <p className="text-[11px] text-indigo-700/80">
                            Ingrese su PIN de 4 dígitos para certificar que retiró estas mercaderías:
                          </p>

                          {signingTxId === tx.id ? (
                            <div className="space-y-2 pt-1">
                              {signError && (
                                <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-1.5 rounded-lg">
                                  {signError}
                                </p>
                              )}
                              <div className="flex gap-2">
                                <input
                                  type="password"
                                  maxLength={4}
                                  placeholder="• • • •"
                                  value={pinInput}
                                  onChange={(e) => setPinInput(e.target.value)}
                                  className="w-28 text-center text-lg font-mono font-bold tracking-widest bg-white border-2 border-indigo-500 rounded-xl focus:outline-none"
                                />
                                <button
                                  onClick={() => handleSignOperation(tx.id)}
                                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl shadow-md transition text-xs"
                                >
                                  Certificar
                                </button>
                                <button
                                  onClick={() => setSigningTxId(null)}
                                  className="px-3 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSigningTxId(tx.id);
                                setPinInput('');
                                setSignError('');
                              }}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                            >
                              Firmar Operación con Mi PIN
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          </div>
        </section>

      {/* MODAL EXTRACTO DE CUENTA EN PDF */}
      {showStatementPDF && customer && tenant && (
        <PDFReportPreviewModal
          mode="CUSTOMER_STATEMENT"
          tenant={tenant}
          customer={customer}
          onClose={() => setShowStatementPDF(false)}
        />
      )}

      {/* MODAL CONTRATO EN PDF */}
      {showContractModal && (
        <PDFReportPreviewModal
          mode="TERMS_CONTRACT"
          tenant={tenant}
          customer={customer}
          onClose={() => setShowContractModal(false)}
        />
      )}

      {/* MODAL COMPROBANTE DE RECIBO DE PAGO OFICIAL */}
      {viewingReceiptTx && customer && tenant && (
        <PaymentReceiptModal
          transaction={viewingReceiptTx}
          customer={customer}
          tenant={tenant}
          onClose={() => setViewingReceiptTx(null)}
        />
      )}
      {/* FOOTER LEGAL DEL PORTAL */}
      <footer className="mt-8 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-400 space-y-2">
        <p>LibretaDigital Pro • Portal de Cliente</p>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px]">
          <Link
            href={`/terminos?returnTo=${encodeURIComponent(`/portal/${customer.qr_token}`)}`}
            className="hover:text-slate-600 underline transition"
          >
            Términos de Servicio
          </Link>
          <span>•</span>
          <Link
            href={`/privacidad?returnTo=${encodeURIComponent(`/portal/${customer.qr_token}`)}`}
            className="hover:text-slate-600 underline transition"
          >
            Política de Privacidad (Ley 6534/20)
          </Link>
        </div>
        <div className="pt-1">
          <Link
            href="/acceso-cliente"
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition"
          >
            Cambiar de cuenta o entrar con Cédula y PIN →
          </Link>
        </div>
      </footer>
    </main>
  );
}
