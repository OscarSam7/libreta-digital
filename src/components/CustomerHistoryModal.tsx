'use client';

import React, { useState, useMemo } from 'react';
import { Customer, Transaction, Tenant, PaymentMethod } from '@/types';
import { exportTransactionsToCSV, generateWhatsAppReminderUrl } from '@/lib/reports';
import { PDFReportPreviewModal } from '@/components/PDFReportPreviewModal';
import { PaymentReceiptModal } from '@/components/PaymentReceiptModal';
import { CustomDateInput } from '@/components/ui/CustomDatePickerModal';
import { CustomSelect } from '@/components/ui/CustomSelectModal';
import {
  FileText,
  Calendar,
  Download,
  ShoppingBag,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Printer,
  X,
  Search,
  Receipt,
  AlertTriangle,
  CreditCard,
  Banknote,
  Building,
  Smartphone,
  QrCode,
  ShieldCheck,
  Check,
  MessageCircle,
  Sparkles,
  User,
  History,
  Lock,
  ArrowRight
} from 'lucide-react';

interface Props {
  customers: Customer[];
  transactions: Transaction[];
  tenant: Tenant;
  preselectedCustomer?: Customer | null;
  onClose: () => void;
}

type HistoryTab = 'ALL' | 'PURCHASES' | 'PAYMENTS';

export function CustomerHistoryModal({
  customers,
  transactions,
  tenant,
  preselectedCustomer,
  onClose,
}: Props) {
  // Cliente seleccionado
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    preselectedCustomer ? preselectedCustomer.id : (customers[0]?.id || '')
  );
  const [customerSearch, setCustomerSearch] = useState('');

  // Pestaña de visualización: Todas / Solo Compras / Solo Pagos
  const [activeTab, setActiveTab] = useState<HistoryTab>('ALL');

  // Fechas en borrador
  const todayStr = new Date().toISOString().slice(0, 10);
  const ninetyDaysAgoStr = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const [inputDateFrom, setInputDateFrom] = useState(ninetyDaysAgoStr);
  const [inputDateTo, setInputDateTo] = useState(todayStr);

  // Fechas aplicadas tras pulsar "Generar Historial"
  const [appliedDateFrom, setAppliedDateFrom] = useState(ninetyDaysAgoStr);
  const [appliedDateTo, setAppliedDateTo] = useState(todayStr);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<Transaction | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string>(
    new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
  );

  // Estado para Visor PDF
  const [showPDFModal, setShowPDFModal] = useState(false);

  const formatCurrency = (val: number) => {
    return `${tenant.currency_symbol} ${new Intl.NumberFormat(
      tenant.currency_code === 'PYG' ? 'es-PY' : tenant.currency_code === 'BRL' ? 'pt-BR' : 'es-PE'
    ).format(val)}`;
  };

  // Cliente actual seleccionado
  const currentCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Lista de clientes filtrados para búsqueda
  const filteredCustomerList = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.nickname && c.nickname.toLowerCase().includes(q)) ||
        (c.document_id && c.document_id.includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }, [customers, customerSearch]);

  // Presets rápidos de fecha (se aplican al instante)
  const handleDatePreset = (preset: 'THIS_MONTH' | '30DAYS' | '90DAYS' | 'YEAR' | 'ALL_TIME') => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    let from = ninetyDaysAgoStr;

    if (preset === 'THIS_MONTH') {
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    } else if (preset === '30DAYS') {
      from = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    } else if (preset === '90DAYS') {
      from = ninetyDaysAgoStr;
    } else if (preset === 'YEAR') {
      from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    } else if (preset === 'ALL_TIME') {
      from = '2020-01-01';
    }

    setInputDateFrom(from);
    setInputDateTo(today);
    setAppliedDateFrom(from);
    setAppliedDateTo(today);
    setGeneratedAt(new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }));
  };

  const formatShortDate = (isoDate: string) => {
    if (!isoDate || isoDate.length < 10) return isoDate;
    const [y, m, d] = isoDate.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  };

  const isFiltersDirty = inputDateFrom !== appliedDateFrom || inputDateTo !== appliedDateTo;

  // BOTÓN EXPLÍCITO GENERAR HISTORIAL
  const handleGenerateHistory = () => {
    setAppliedDateFrom(inputDateFrom);
    setAppliedDateTo(inputDateTo);
    setGeneratedAt(new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }));
  };

  // Transacciones del cliente dentro del rango aplicado
  const customerTransactions = useMemo(() => {
    if (!selectedCustomerId) return [];

    return transactions
      .filter((t) => t.customer_id === selectedCustomerId)
      .filter((t) => {
        const txDate = t.created_at.slice(0, 10);
        if (appliedDateFrom && txDate < appliedDateFrom) return false;
        if (appliedDateTo && txDate > appliedDateTo) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [transactions, selectedCustomerId, appliedDateFrom, appliedDateTo]);

  // Desglose por Compras Fiadas vs Pagos
  const purchaseTransactions = useMemo(() => {
    return customerTransactions.filter(
      (t) => t.type === 'DEBIT_PURCHASE' || t.type === 'ADJUSTMENT_DEBIT'
    );
  }, [customerTransactions]);

  const paymentTransactions = useMemo(() => {
    return customerTransactions.filter((t) => t.type === 'CREDIT_PAYMENT');
  }, [customerTransactions]);

  // Totales en el periodo para este cliente
  const totals = useMemo(() => {
    const totalPurchases = purchaseTransactions.reduce((acc, t) => acc + t.amount, 0);
    const totalPayments = paymentTransactions.reduce((acc, t) => acc + t.amount, 0);

    return {
      totalPurchases,
      totalPayments,
      netChange: totalPurchases - totalPayments,
    };
  }, [purchaseTransactions, paymentTransactions]);

  // Cálculo de mora / días sin pagar
  const daysWithoutPayment = useMemo(() => {
    if (!currentCustomer || currentCustomer.current_balance <= 0) return null;

    const allCustPayments = transactions
      .filter((t) => t.customer_id === currentCustomer.id && t.type === 'CREDIT_PAYMENT')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const lastPayment = allCustPayments[0];
    if (lastPayment) {
      const diffMs = Date.now() - new Date(lastPayment.created_at).getTime();
      return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const allCustPurchases = transactions
      .filter((t) => t.customer_id === currentCustomer.id && t.type === 'DEBIT_PURCHASE')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const lastPurchase = allCustPurchases[0];
    if (lastPurchase) {
      const diffMs = Date.now() - new Date(lastPurchase.created_at).getTime();
      return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    return null;
  }, [currentCustomer, transactions]);

  // Exportar historial a CSV
  const handleExportCSV = () => {
    if (!currentCustomer) return;
    exportTransactionsToCSV(customerTransactions, tenant, currentCustomer.full_name);
  };

  const waUrl = currentCustomer ? generateWhatsAppReminderUrl(currentCustomer, tenant) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto font-sans animate-in fade-in">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl relative border border-slate-200 my-auto max-h-[94vh] flex flex-col overflow-hidden">
        {/* ENCABEZADO COMPACTO Y PROFESIONAL */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white flex justify-between items-center gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 text-amber-400 flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black leading-tight truncate">
                Extracto de Cuenta Corriente
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                Historial detallado de fiados y pagos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowPDFModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition active:scale-95 whitespace-nowrap cursor-pointer"
              title="Previsualizar extracto en formato PDF y descargar"
            >
              <FileText className="w-3.5 h-3.5 text-amber-300" />
              <span>PDF / Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENIDO SUPERIOR COMPACTO */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2.5">
          {/* SELECTOR DE CLIENTE */}
          <CustomSelect
            value={selectedCustomerId}
            onChange={(val) => setSelectedCustomerId(String(val))}
            title="Seleccionar Cuenta de Cliente"
            placeholder="Seleccionar cliente..."
            searchable={true}
            options={customers.map((c) => ({
              value: c.id,
              label: `${c.full_name}${c.nickname ? ` (${c.nickname})` : ''}`,
              sublabel: `${c.phone || 'Sin teléfono'} • Doc: ${c.document_id || 'N/A'}`,
              badge: formatCurrency(c.current_balance),
            }))}
          />

          {/* FICHA RESUMEN COMPACTA DEL CLIENTE */}
          {currentCustomer && (
            <div className="bg-white px-3 py-2.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-sm truncate">
                    {currentCustomer.full_name}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                    Doc: {currentCustomer.document_id || 'N/A'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {currentCustomer.nickname ? `${currentCustomer.nickname} • ` : ''}
                  {currentCustomer.phone || 'Sin tel'}
                </p>
                <div className="flex items-center gap-2 text-[10px] font-semibold">
                  <span className="text-slate-500">
                    Límite:{' '}
                    <b className="text-slate-700">
                      {currentCustomer.credit_limit > 0 ? formatCurrency(currentCustomer.credit_limit) : 'Sin límite'}
                    </b>
                  </span>
                  {daysWithoutPayment !== null && (
                    <span className={daysWithoutPayment > 15 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                      • {daysWithoutPayment > 15 ? `Mora ${daysWithoutPayment}d` : `Al día (${daysWithoutPayment}d)`}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-right shrink-0">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                  Saldo Actual
                </span>
                <span
                  className={`text-base sm:text-lg font-black tabular-nums leading-tight ${
                    currentCustomer.current_balance > 0 ? 'text-slate-900' : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(currentCustomer.current_balance)}
                </span>
              </div>
            </div>
          )}

          {/* FILTROS DE FECHA Y EXPORTACIÓN EN 2 FILAS COMPACTAS */}
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 space-y-2">
            {/* Fila 1: Desde / Hasta */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Desde
                </label>
                <CustomDateInput
                  value={inputDateFrom}
                  onChange={(val) => {
                    setInputDateFrom(val);
                    setAppliedDateFrom(val);
                  }}
                  label="Fecha Desde"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Hasta
                </label>
                <CustomDateInput
                  value={inputDateTo}
                  onChange={(val) => {
                    setInputDateTo(val);
                    setAppliedDateTo(val);
                  }}
                  label="Fecha Hasta"
                />
              </div>
            </div>

            {/* Fila 2: Presets + Acciones rápidas */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => handleDatePreset('THIS_MONTH')}
                  className="px-2.5 py-1 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition cursor-pointer"
                >
                  Mes
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset('90DAYS')}
                  className="px-2.5 py-1 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition cursor-pointer"
                >
                  90d
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset('ALL_TIME')}
                  className="px-2.5 py-1 rounded-lg bg-white text-slate-900 shadow-xs transition cursor-pointer"
                >
                  Todo
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {isFiltersDirty && (
                  <button
                    type="button"
                    onClick={handleGenerateHistory}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                  >
                    Aplicar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                  title="Descargar en Excel (CSV)"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
                {currentCustomer?.phone && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition"
                    title="Enviar estado de cuenta por WhatsApp"
                  >
                    <MessageCircle className="w-3 h-3" /> WA
                  </a>
                )}
              </div>
            </div>

            {/* Línea de período activo (sin saltos rotos) */}
            <div className="flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50/70 px-2.5 py-1 rounded-lg border border-emerald-100">
              <span className="flex items-center gap-1 font-semibold whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                {formatShortDate(appliedDateFrom)} – {formatShortDate(appliedDateTo)}
              </span>
              <span className="font-bold text-emerald-800 whitespace-nowrap">
                {customerTransactions.length} {customerTransactions.length === 1 ? 'movimiento' : 'movimientos'}
              </span>
            </div>
          </div>

          {/* KPIS COMPACTOS EN 3 COLUMNAS ALINEADAS */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-rose-50 px-2.5 py-2 rounded-xl border border-rose-200/80">
              <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 block">
                (+) Fiados
              </span>
              <span className="text-xs sm:text-base font-black text-rose-800 tabular-nums block truncate mt-0.5">
                +{formatCurrency(totals.totalPurchases)}
              </span>
              <span className="text-[10px] text-rose-600/90 font-medium block">
                {purchaseTransactions.length} {purchaseTransactions.length === 1 ? 'compra' : 'compras'}
              </span>
            </div>

            <div className="bg-emerald-50 px-2.5 py-2 rounded-xl border border-emerald-200/80">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 block">
                (-) Pagos
              </span>
              <span className="text-xs sm:text-base font-black text-emerald-800 tabular-nums block truncate mt-0.5">
                -{formatCurrency(totals.totalPayments)}
              </span>
              <span className="text-[10px] text-emerald-600/90 font-medium block">
                {paymentTransactions.length} {paymentTransactions.length === 1 ? 'pago' : 'pagos'}
              </span>
            </div>

            <div className="bg-slate-900 text-white px-2.5 py-2 rounded-xl shadow-xs">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                Neto
              </span>
              <span
                className={`text-xs sm:text-base font-black tabular-nums block truncate mt-0.5 ${
                  totals.netChange > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {totals.netChange > 0 ? '+' : ''}
                {formatCurrency(totals.netChange)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block truncate">
                {totals.netChange > 0 ? 'Aumento' : 'Reducción'}
              </span>
            </div>
          </div>
        </div>

        {/* SELECTOR DE PESTAÑAS: TODAS / SOLO COMPRAS / SOLO PAGOS */}
        <div className="flex border-b border-slate-200 bg-white px-4 shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'ALL'
                ? 'border-indigo-600 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            Línea de Tiempo Completa ({customerTransactions.length})
          </button>

          <button
            onClick={() => setActiveTab('PURCHASES')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'PURCHASES'
                ? 'border-rose-600 text-rose-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Historial de Compras Fiadas ({purchaseTransactions.length})
          </button>

          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'PAYMENTS'
                ? 'border-emerald-600 text-emerald-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            Historial de Pagos y Abonos ({paymentTransactions.length})
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL: LISTA DE MOVIMIENTOS */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* TABLA DE OPERACIONES */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Fecha & Hora</th>
                    <th className="py-3 px-3">Tipo de Operación</th>
                    <th className="py-3 px-3">Detalle / Productos Entregados</th>
                    <th className="py-3 px-3">Medio de Pago / Ref</th>
                    <th className="py-3 px-3 text-right">Monto</th>
                    <th className="py-3 px-3 text-right">Saldo Posterior</th>
                    <th className="py-3 px-3 text-center">Validación</th>
                    <th className="py-3 px-3 text-center">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(() => {
                    const listToDisplay =
                      activeTab === 'PURCHASES'
                        ? purchaseTransactions
                        : activeTab === 'PAYMENTS'
                        ? paymentTransactions
                        : customerTransactions;

                    if (listToDisplay.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                            No se registran movimientos para este criterio en las fechas seleccionadas.
                          </td>
                        </tr>
                      );
                    }

                    return listToDisplay.map((tx) => {
                      const isPurchase =
                        tx.type === 'DEBIT_PURCHASE' || tx.type === 'ADJUSTMENT_DEBIT';

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {new Date(tx.created_at).toLocaleString('es-PY', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                isPurchase
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {isPurchase ? 'COMPRA FIADA' : 'PAGO / ABONO'}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800 block text-xs">
                              {tx.description || (isPurchase ? 'Compra al fiado' : 'Abono a cuenta')}
                            </span>
                            {tx.operator_name && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 font-bold bg-blue-50/80 px-1.5 py-0.5 rounded mt-1 border border-blue-200/50">
                                👤 {tx.operator_name}
                              </span>
                            )}
                            {tx.items && tx.items.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {tx.items.map((it, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]"
                                  >
                                    {it.qty}x {it.name} ({formatCurrency(it.price)})
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 text-[11px] text-slate-600 whitespace-nowrap">
                            {tx.payment_method ? (
                              <div className="flex items-center gap-1 font-semibold text-slate-800">
                                {tx.payment_method === 'EFECTIVO' && <Banknote className="w-3.5 h-3.5 text-emerald-600" />}
                                {tx.payment_method === 'PIX' && <Smartphone className="w-3.5 h-3.5 text-teal-600" />}
                                {tx.payment_method === 'QR_BANCARIO' && <QrCode className="w-3.5 h-3.5 text-indigo-600" />}
                                {tx.payment_method === 'TRANSFERENCIA' && <Building className="w-3.5 h-3.5 text-blue-600" />}
                                {(tx.payment_method === 'TARJETA_DEBITO' || tx.payment_method === 'TARJETA_CREDITO') && (
                                  <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                                )}
                                <span>{tx.payment_method}</span>
                                {tx.payment_reference && (
                                  <span className="text-[9px] text-slate-400 font-normal">
                                    • {tx.payment_reference}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right font-black whitespace-nowrap">
                            <span className={isPurchase ? 'text-rose-600' : 'text-emerald-600'}>
                              {isPurchase ? '+' : '-'} {formatCurrency(tx.amount)}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                            {formatCurrency(tx.new_balance)}
                          </td>

                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                tx.status === 'CERTIFIED_BOTH'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {tx.status === 'CERTIFIED_BOTH' ? '✓ Certificado' : 'Pendiente PIN'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isPurchase ? (
                              <span className="text-slate-300 text-[10px]">-</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedReceiptTx(tx)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black border border-emerald-200 inline-flex items-center gap-1 transition cursor-pointer"
                                title="Ver comprobante oficial de pago y enviar por WhatsApp"
                              >
                                <Receipt className="w-3 h-3 text-emerald-600" />
                                <span>Recibo WA</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL VISTA PREVIA PDF DE ESTE CLIENTE */}
      {showPDFModal && currentCustomer && (
        <PDFReportPreviewModal
          mode="CUSTOMER_STATEMENT"
          tenant={tenant}
          customer={currentCustomer}
          dateFrom={appliedDateFrom}
          dateTo={appliedDateTo}
          transactions={customerTransactions}
          onClose={() => setShowPDFModal(false)}
        />
      )}

      {/* MODAL DE COMPROBANTE DE RECIBO DE PAGO OFICIAL */}
      {selectedReceiptTx && currentCustomer && (
        <PaymentReceiptModal
          transaction={selectedReceiptTx}
          customer={currentCustomer}
          tenant={tenant}
          onClose={() => setSelectedReceiptTx(null)}
        />
      )}
    </div>
  );
}
