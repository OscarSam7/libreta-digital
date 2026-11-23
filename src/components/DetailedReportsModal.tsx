'use client';

import React, { useState, useMemo } from 'react';
import { Customer, Transaction, Tenant, PaymentMethod } from '@/types';
import {
  exportTransactionsToCSV,
  exportCustomersPortfolioToCSV,
  CustomerPortfolioSummary,
  generateWhatsAppReminderUrl,
} from '@/lib/reports';
import { PDFReportPreviewModal, PDFReportMode } from '@/components/PDFReportPreviewModal';
import { CustomDateInput } from '@/components/ui/CustomDatePickerModal';
import { CustomSelect } from '@/components/ui/CustomSelectModal';
import {
  FileText,
  Calendar,
  Filter,
  Download,
  Users,
  TrendingUp,
  ArrowDownLeft,
  ShoppingBag,
  RotateCcw,
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
  ShieldAlert,
  ShieldCheck,
  Check,
  MessageCircle,
  HelpCircle,
  DollarSign,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface Props {
  customers: Customer[];
  transactions: Transaction[];
  tenant: Tenant;
  onClose: () => void;
}

type TabType = 'CUSTOMERS_PORTFOLIO' | 'SALES_SUMMARY' | 'TRANSACTIONS_LEDGER';
type CustomerFilter = 'ALL' | 'MORA' | 'PENDING' | 'AL_DIA' | 'EXCEEDED' | 'BLOCKED';

export function DetailedReportsModal({
  customers,
  transactions,
  tenant,
  onClose,
}: Props) {
  // Pestaña activa
  const [activeTab, setActiveTab] = useState<TabType>('CUSTOMERS_PORTFOLIO');

  // Fechas en borrador (inputs seleccionados por el usuario)
  const todayStr = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const [inputDateFrom, setInputDateFrom] = useState(thirtyDaysAgoStr);
  const [inputDateTo, setInputDateTo] = useState(todayStr);

  // Fechas aplicadas definitivamente tras pulsar "Generar Reporte"
  const [appliedDateFrom, setAppliedDateFrom] = useState(thirtyDaysAgoStr);
  const [appliedDateTo, setAppliedDateTo] = useState(todayStr);
  const [reportGeneratedAt, setReportGeneratedAt] = useState<string>(
    new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
  );

  // Filtros específicos
  const [customerFilter, setCustomerFilter] = useState<CustomerFilter>('ALL');
  const [customerSearch, setCustomerSearch] = useState('');
  const [moraDaysThreshold, setMoraDaysThreshold] = useState<number>(15);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');
  const [selectedTxType, setSelectedTxType] = useState<string>('ALL');

  // Estado para Visor PDF
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfMode, setPdfMode] = useState<PDFReportMode>('PORTFOLIO_MORA');
  const [pdfCustomer, setPdfCustomer] = useState<Customer | null>(null);

  const formatCurrency = (val: number) => {
    return `${tenant.currency_symbol} ${new Intl.NumberFormat(
      tenant.currency_code === 'PYG' ? 'es-PY' : tenant.currency_code === 'BRL' ? 'pt-BR' : 'es-PE'
    ).format(val)}`;
  };

  // Botones de presets rápidos de fecha (asigna a los inputs de fecha)
  const handleDatePreset = (preset: 'TODAY' | 'WEEK' | 'THIS_MONTH' | '30DAYS' | 'YEAR' | 'ALL_TIME') => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    if (preset === 'TODAY') {
      setInputDateFrom(today);
      setInputDateTo(today);
    } else if (preset === 'WEEK') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      setInputDateFrom(sevenDaysAgo);
      setInputDateTo(today);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setInputDateFrom(firstDay);
      setInputDateTo(today);
    } else if (preset === '30DAYS') {
      setInputDateFrom(thirtyDaysAgoStr);
      setInputDateTo(today);
    } else if (preset === 'YEAR') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      setInputDateFrom(firstDayYear);
      setInputDateTo(today);
    } else if (preset === 'ALL_TIME') {
      setInputDateFrom('2020-01-01');
      setInputDateTo(today);
    }
  };

  // ACCIÓN EXPLÍCITA DE GENERAR REPORTE
  const isFiltersDirty = inputDateFrom !== appliedDateFrom || inputDateTo !== appliedDateTo;

  const handleGenerateReport = () => {
    setAppliedDateFrom(inputDateFrom);
    setAppliedDateTo(inputDateTo);
    setReportGeneratedAt(new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }));
  };

  // Mapa de Clientes por ID
  const customersMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((c) => map.set(c.id, c.full_name));
    return map;
  }, [customers]);

  // Transacciones filtradas por el rango de fechas APLICADO
  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const txDate = t.created_at.slice(0, 10);
      if (appliedDateFrom && txDate < appliedDateFrom) return false;
      if (appliedDateTo && txDate > appliedDateTo) return false;
      return true;
    });
  }, [transactions, appliedDateFrom, appliedDateTo]);

  // ANÁLISIS PRECISO DE CARTERA Y ESTADO CREDITICIO DE CADA CLIENTE
  const customerPortfolio = useMemo<CustomerPortfolioSummary[]>(() => {
    const nowMs = Date.now();

    return customers.map((c) => {
      const custTxs = transactions.filter((t) => t.customer_id === c.id);
      const periodCustTxs = periodTransactions.filter((t) => t.customer_id === c.id);

      const purchasesInPeriod = periodCustTxs
        .filter((t) => t.type === 'DEBIT_PURCHASE' || t.type === 'ADJUSTMENT_DEBIT')
        .reduce((sum, t) => sum + t.amount, 0);

      const paymentsInPeriod = periodCustTxs
        .filter((t) => t.type === 'CREDIT_PAYMENT')
        .reduce((sum, t) => sum + t.amount, 0);

      const paymentTxs = custTxs
        .filter((t) => t.type === 'CREDIT_PAYMENT')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const purchaseTxs = custTxs
        .filter((t) => t.type === 'DEBIT_PURCHASE')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const lastPayment = paymentTxs[0] || null;
      const lastPurchase = purchaseTxs[0] || null;

      let daysWithoutPayment: number | null = null;
      if (c.current_balance > 0) {
        if (lastPayment) {
          const diffMs = nowMs - new Date(lastPayment.created_at).getTime();
          daysWithoutPayment = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        } else if (lastPurchase) {
          const diffMs = nowMs - new Date(lastPurchase.created_at).getTime();
          daysWithoutPayment = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        } else {
          const diffMs = nowMs - new Date(c.created_at).getTime();
          daysWithoutPayment = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }
      }

      let statusCategory: CustomerPortfolioSummary['statusCategory'] = 'AL_DIA';
      const isOverLimit = c.credit_limit > 0 && c.current_balance > c.credit_limit;

      if (c.is_blocked) {
        statusCategory = 'BLOQUEADO';
      } else if (c.current_balance <= 0) {
        statusCategory = 'AL_DIA';
      } else if (isOverLimit) {
        statusCategory = 'EXCEDIDO';
      } else if (daysWithoutPayment !== null && daysWithoutPayment >= moraDaysThreshold) {
        statusCategory = 'MORA';
      } else {
        statusCategory = 'PENDIENTE';
      }

      const limitUsagePercent =
        c.credit_limit > 0 ? Math.min(999, (c.current_balance / c.credit_limit) * 100) : 0;

      return {
        customer: c,
        statusCategory,
        currentBalance: c.current_balance,
        creditLimit: c.credit_limit,
        limitUsagePercent,
        purchasesInPeriod,
        paymentsInPeriod,
        lastPaymentDate: lastPayment ? lastPayment.created_at : null,
        lastPurchaseDate: lastPurchase ? lastPurchase.created_at : null,
        daysWithoutPayment,
      };
    });
  }, [customers, transactions, periodTransactions, moraDaysThreshold]);

  // Contadores de la cartera
  const portfolioCounts = useMemo(() => {
    let mora = 0;
    let pending = 0;
    let alDia = 0;
    let exceeded = 0;
    let blocked = 0;
    let totalDebt = 0;

    customerPortfolio.forEach((item) => {
      totalDebt += item.currentBalance > 0 ? item.currentBalance : 0;
      if (item.statusCategory === 'MORA') mora++;
      else if (item.statusCategory === 'EXCEDIDO') exceeded++;
      else if (item.statusCategory === 'BLOQUEADO') blocked++;
      else if (item.statusCategory === 'PENDIENTE') pending++;
      else if (item.statusCategory === 'AL_DIA') alDia++;
    });

    return {
      total: customerPortfolio.length,
      mora,
      pending,
      alDia,
      exceeded,
      blocked,
      totalDebt,
    };
  }, [customerPortfolio]);

  // Cartera filtrada para visualización en tabla
  const filteredPortfolio = useMemo(() => {
    return customerPortfolio.filter((item) => {
      if (customerFilter === 'MORA' && item.statusCategory !== 'MORA') return false;
      if (customerFilter === 'PENDING' && item.statusCategory !== 'PENDIENTE') return false;
      if (customerFilter === 'AL_DIA' && item.statusCategory !== 'AL_DIA') return false;
      if (customerFilter === 'EXCEEDED' && item.statusCategory !== 'EXCEDIDO') return false;
      if (customerFilter === 'BLOCKED' && item.statusCategory !== 'BLOQUEADO') return false;

      if (customerSearch.trim()) {
        const q = customerSearch.toLowerCase();
        const c = item.customer;
        const match =
          c.full_name.toLowerCase().includes(q) ||
          (c.nickname && c.nickname.toLowerCase().includes(q)) ||
          (c.document_id && c.document_id.includes(q)) ||
          (c.phone && c.phone.includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [customerPortfolio, customerFilter, customerSearch]);

  // RESUMEN FINANCIERO Y VENTAS EN EL PERÍODO APLICADO
  const salesSummary = useMemo(() => {
    let totalVentasFiadas = 0;
    let totalCobrado = 0;
    let totalNotasCredito = 0;
    let totalNotasDebito = 0;
    const paymentMethodsMap: Record<PaymentMethod, number> = {
      EFECTIVO: 0,
      TRANSFERENCIA: 0,
      PIX: 0,
      QR_BANCARIO: 0,
      TARJETA_DEBITO: 0,
      TARJETA_CREDITO: 0,
    };

    periodTransactions.forEach((t) => {
      if (t.type === 'DEBIT_PURCHASE') {
        totalVentasFiadas += t.amount;
      } else if (t.type === 'CREDIT_PAYMENT') {
        totalCobrado += t.amount;
        const method = t.payment_method || 'EFECTIVO';
        if (paymentMethodsMap[method] !== undefined) {
          paymentMethodsMap[method] += t.amount;
        } else {
          paymentMethodsMap.EFECTIVO += t.amount;
        }
      } else if (t.type === 'ADJUSTMENT_CREDIT') {
        totalNotasCredito += t.amount;
      } else if (t.type === 'ADJUSTMENT_DEBIT') {
        totalNotasDebito += t.amount;
      }
    });

    const flujoNeto = totalCobrado - totalVentasFiadas;
    const operacionesCount = periodTransactions.length;
    const ticketPromedio =
      operacionesCount > 0 ? (totalVentasFiadas + totalCobrado) / operacionesCount : 0;

    return {
      totalVentasFiadas,
      totalCobrado,
      totalNotasCredito,
      totalNotasDebito,
      flujoNeto,
      operacionesCount,
      ticketPromedio,
      paymentMethodsMap,
    };
  }, [periodTransactions]);

  // Transacciones para el Libro Mayor con filtros
  const filteredLedgerTransactions = useMemo(() => {
    return periodTransactions.filter((t) => {
      if (selectedCustomerId !== 'ALL' && t.customer_id !== selectedCustomerId) return false;
      if (
        selectedTxType === 'PURCHASES' &&
        !(t.type === 'DEBIT_PURCHASE' || t.type === 'ADJUSTMENT_DEBIT')
      )
        return false;
      if (selectedTxType === 'PAYMENTS' && t.type !== 'CREDIT_PAYMENT') return false;
      if (
        selectedTxType === 'ADJUSTMENTS' &&
        !(t.type === 'ADJUSTMENT_CREDIT' || t.type === 'ADJUSTMENT_DEBIT')
      )
        return false;
      return true;
    });
  }, [periodTransactions, selectedCustomerId, selectedTxType]);

  // Exportar Cartera de Clientes a CSV
  const handleExportCustomersCSV = () => {
    exportCustomersPortfolioToCSV(customerPortfolio, tenant, appliedDateFrom, appliedDateTo);
  };

  // Exportar Ventas y Movimientos a CSV
  const handleExportLedgerCSV = () => {
    const custName =
      selectedCustomerId !== 'ALL' ? customersMap.get(selectedCustomerId) : 'Periodo_General';
    exportTransactionsToCSV(filteredLedgerTransactions, tenant, custName, customersMap);
  };

  // Abrir vista previa PDF según la pestaña activa
  const handleOpenCurrentTabPDF = () => {
    if (activeTab === 'CUSTOMERS_PORTFOLIO') {
      setPdfMode('PORTFOLIO_MORA');
      setPdfCustomer(null);
    } else if (activeTab === 'SALES_SUMMARY') {
      setPdfMode('SALES_REPORT');
      setPdfCustomer(null);
    } else {
      setPdfMode('LEDGER_REPORT');
      setPdfCustomer(null);
    }
    setShowPDFModal(true);
  };

  // Abrir vista previa PDF de un cliente específico
  const handleOpenCustomerPDF = (c: Customer) => {
    setPdfMode('CUSTOMER_STATEMENT');
    setPdfCustomer(c);
    setShowPDFModal(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto font-sans animate-in fade-in">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl relative border border-slate-200 my-auto max-h-[94vh] flex flex-col overflow-hidden">
        {/* ENCABEZADO SUPERIOR MODERNO & COMPACTO */}
        <div className="p-3 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white shrink-0 space-y-2.5">
          {/* Fila 1: Título, Almacén y Botón Cerrar */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center backdrop-blur-md shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-white truncate">
                    Informes & Cartera
                  </h2>
                  <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    PDF & Excel
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-medium truncate">
                  {tenant.business_name} • Ventas, Cobros & Libro Mayor
                </p>
              </div>
            </div>

            {/* Botón Cerrar */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
              title="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Fila 2: Botones de Acción de Reportes */}
          <div className="flex items-center gap-2 pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={handleOpenCurrentTabPDF}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/30 transition active:scale-95 cursor-pointer whitespace-nowrap"
              title="Generar vista previa en PDF con opción de descarga"
            >
              <FileText className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Ver PDF & Descargar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPdfMode('DAILY_CLOSING_REPORT');
                setPdfCustomer(null);
                setShowPDFModal(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/30 transition active:scale-95 cursor-pointer whitespace-nowrap"
              title="Generar Relatorio General de Cierre de Actividades y Respaldo por WhatsApp"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
              <span>Cierre & Respaldo WA</span>
            </button>
          </div>
        </div>

        {/* BARRA DE FILTRO DE FECHAS CON PRESETS HORIZONTALES Y BOTÓN GENERAR */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2.5">
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-2.5">
            {/* Fechas Desde / Hasta y Botón Generar */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-2 w-full lg:w-auto">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end sm:gap-2">
                <div className="min-w-0">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Desde
                  </label>
                  <CustomDateInput
                    value={inputDateFrom}
                    onChange={(val) => setInputDateFrom(val)}
                    label="Fecha Desde"
                    className="w-full text-xs"
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Hasta
                  </label>
                  <CustomDateInput
                    value={inputDateTo}
                    onChange={(val) => setInputDateTo(val)}
                    label="Fecha Hasta"
                    className="w-full text-xs"
                  />
                </div>
              </div>

              {/* Botón Generar Reporte */}
              <button
                type="button"
                onClick={handleGenerateReport}
                className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition shadow-sm active:scale-95 cursor-pointer whitespace-nowrap ${
                  isFiltersDirty
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30 animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{isFiltersDirty ? 'Actualizar con Nuevas Fechas' : 'Generar Reporte'}</span>
              </button>
            </div>

            {/* Presets de Fecha Rápidos en barra deslizable */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 bg-white p-1 rounded-2xl border border-slate-200 text-[11px] font-bold shrink-0">
              <button
                type="button"
                onClick={() => handleDatePreset('TODAY')}
                className="px-2.5 py-1 rounded-xl text-slate-600 hover:bg-slate-100 transition whitespace-nowrap cursor-pointer shrink-0"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('WEEK')}
                className="px-2.5 py-1 rounded-xl text-slate-600 hover:bg-slate-100 transition whitespace-nowrap cursor-pointer shrink-0"
              >
                7 Días
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('THIS_MONTH')}
                className="px-2.5 py-1 rounded-xl text-slate-600 hover:bg-slate-100 transition whitespace-nowrap cursor-pointer shrink-0"
              >
                Este Mes
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('30DAYS')}
                className="px-2.5 py-1 rounded-xl text-slate-600 hover:bg-slate-100 transition whitespace-nowrap cursor-pointer shrink-0"
              >
                30 Días
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('YEAR')}
                className="px-2.5 py-1 rounded-xl text-slate-600 hover:bg-slate-100 transition whitespace-nowrap cursor-pointer shrink-0"
              >
                Año
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('ALL_TIME')}
                className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-900 font-black hover:bg-slate-200 transition whitespace-nowrap cursor-pointer shrink-0"
              >
                Histórico
              </button>
            </div>

            {/* Botones de Descarga CSV */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCustomersCSV}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap cursor-pointer"
                title="Descargar listado de clientes en Mora y Al Día en Excel"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>CSV Cartera</span>
              </button>
              <button
                onClick={handleExportLedgerCSV}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap cursor-pointer"
                title="Descargar libro de ventas y movimientos en Excel"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>CSV Ventas</span>
              </button>
            </div>
          </div>

          {/* BANNER DE CONFIRMACIÓN DEL REPORTE GENERADO */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-bold pt-1 gap-2 border-t border-slate-200/80">
            <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 text-[11px] leading-tight">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Período: <b>{appliedDateFrom}</b> al <b>{appliedDateTo}</b> ({periodTransactions.length} operaciones • {reportGeneratedAt})
              </span>
            </div>

            {isFiltersDirty && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Fechas modificadas. Pulsa "Actualizar".</span>
              </span>
            )}
          </div>
        </div>

        {/* SELECTOR DE PESTAÑAS RESPONSIVO CON DESPLAZAMIENTO HORIZONTAL */}
        <div className="flex items-center border-b border-slate-200 bg-white px-2 sm:px-4 shrink-0 text-xs font-bold overflow-x-auto no-scrollbar gap-1">
          <button
            onClick={() => setActiveTab('CUSTOMERS_PORTFOLIO')}
            className={`py-2.5 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'CUSTOMERS_PORTFOLIO'
                ? 'border-indigo-600 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Cartera & Saldos</span>
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
              {customerPortfolio.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SALES_SUMMARY')}
            className={`py-2.5 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'SALES_SUMMARY'
                ? 'border-indigo-600 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Ventas & Cobros</span>
          </button>

          <button
            onClick={() => setActiveTab('TRANSACTIONS_LEDGER')}
            className={`py-2.5 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'TRANSACTIONS_LEDGER'
                ? 'border-indigo-600 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Libro Mayor</span>
            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
              {filteredLedgerTransactions.length}
            </span>
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL SCROLLABLE */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          {/* ========================================================= */}
          {/* PESTAÑA 1: CARTERA DE CLIENTES, MORA, AL DÍA Y DEUDAS     */}
          {/* ========================================================= */}
          {activeTab === 'CUSTOMERS_PORTFOLIO' && (
            <div className="space-y-4 animate-in fade-in">
              {/* KPIS DE SEGMENTACIÓN DE CLIENTES */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCustomerFilter('ALL')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    customerFilter === 'ALL'
                      ? 'border-slate-800 bg-slate-900 text-white shadow-md'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                    Total Clientes
                  </span>
                  <span className="text-xl font-black mt-1 block">{portfolioCounts.total}</span>
                  <span className="text-[10px] opacity-75">
                    Deuda total: {formatCurrency(portfolioCounts.totalDebt)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerFilter('MORA')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    customerFilter === 'MORA'
                      ? 'border-rose-600 bg-rose-600 text-white shadow-md'
                      : 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider block">
                      En Mora
                    </span>
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xl font-black mt-1 block">{portfolioCounts.mora}</span>
                  <span className="text-[10px]">
                    Sin pagar &gt; {moraDaysThreshold} días
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerFilter('PENDING')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    customerFilter === 'PENDING'
                      ? 'border-amber-600 bg-amber-600 text-white shadow-md'
                      : 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block">
                    Con Saldo Activo
                  </span>
                  <span className="text-xl font-black mt-1 block">{portfolioCounts.pending}</span>
                  <span className="text-[10px]">Deuda al corriente</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerFilter('AL_DIA')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    customerFilter === 'AL_DIA'
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                      : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider block">
                      Al Día
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xl font-black mt-1 block">{portfolioCounts.alDia}</span>
                  <span className="text-[10px]">Sin deuda pendiente</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerFilter('EXCEEDED')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    customerFilter === 'EXCEEDED'
                      ? 'border-purple-600 bg-purple-600 text-white shadow-md'
                      : 'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block">
                    Límite Excedido
                  </span>
                  <span className="text-xl font-black mt-1 block">{portfolioCounts.exceeded}</span>
                  <span className="text-[10px]">Superan tope acordado</span>
                </button>
              </div>

              {/* FILTRO DE BÚSQUEDA Y CONFIGURACIÓN DE MORA */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, apodo, cédula/DNI o teléfono..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                    Criterio de Mora:
                  </span>
                  <CustomSelect
                    value={moraDaysThreshold}
                    onChange={(val) => setMoraDaysThreshold(Number(val) || 15)}
                    title="Criterio de Antigüedad de Mora"
                    options={[
                      { value: 7, label: '> 7 días sin pagar', badge: 'Mora temprana' },
                      { value: 15, label: '> 15 días sin pagar', badge: 'Mora moderada' },
                      { value: 30, label: '> 30 días sin pagar', badge: 'Mora crítica' },
                      { value: 45, label: '> 45 días sin pagar', badge: 'Incobrable' },
                    ]}
                    className="min-w-[170px]"
                  />
                </div>
              </div>

              {/* TABLA DETALLADA DE CARTERA */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Cliente & Contacto</th>
                        <th className="py-3 px-3">Estado Crediticio</th>
                        <th className="py-3 px-3 text-right">Saldo Deudor</th>
                        <th className="py-3 px-3 text-right">Límite Pactado</th>
                        <th className="py-3 px-3 text-right">Compras Periodo</th>
                        <th className="py-3 px-3 text-right">Pagos Periodo</th>
                        <th className="py-3 px-3">Último Pago / Mora</th>
                        <th className="py-3 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredPortfolio.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                            No se encontraron clientes que coincidan con los filtros seleccionados.
                          </td>
                        </tr>
                      ) : (
                        filteredPortfolio.map((item) => {
                          const c = item.customer;
                          const waUrl = generateWhatsAppReminderUrl(c, tenant);

                          return (
                            <tr key={c.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4">
                                <span className="font-bold text-slate-900 block text-xs">
                                  {c.full_name}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {c.nickname ? `"${c.nickname}" • ` : ''}
                                  {c.phone || 'Sin teléfono'} {c.document_id ? `• Doc: ${c.document_id}` : ''}
                                </span>
                              </td>

                              <td className="py-3 px-3">
                                {item.statusCategory === 'MORA' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                    <AlertTriangle className="w-3 h-3" /> EN MORA ({item.daysWithoutPayment}d)
                                  </span>
                                )}
                                {item.statusCategory === 'EXCEDIDO' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                    <AlertTriangle className="w-3 h-3" /> EXCEDIDO
                                  </span>
                                )}
                                {item.statusCategory === 'BLOQUEADO' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                                    <ShieldAlert className="w-3 h-3" /> BLOQUEADO
                                  </span>
                                )}
                                {item.statusCategory === 'PENDIENTE' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                    <Clock className="w-3 h-3" /> AL CORRIENTE
                                  </span>
                                )}
                                {item.statusCategory === 'AL_DIA' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                    <Check className="w-3 h-3" /> AL DÍA (₲0)
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-3 text-right">
                                <span
                                  className={`font-black text-xs block ${
                                    item.currentBalance > 0 ? 'text-slate-900' : 'text-emerald-600'
                                  }`}
                                >
                                  {formatCurrency(item.currentBalance)}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-right">
                                <span className="font-bold text-slate-700 block">
                                  {item.creditLimit > 0 ? formatCurrency(item.creditLimit) : 'Sin tope'}
                                </span>
                                {item.creditLimit > 0 && item.currentBalance > 0 && (
                                  <div className="w-16 h-1.5 bg-slate-100 rounded-full ml-auto mt-1 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        item.limitUsagePercent > 100
                                          ? 'bg-rose-500'
                                          : item.limitUsagePercent > 80
                                          ? 'bg-amber-500'
                                          : 'bg-blue-500'
                                      }`}
                                      style={{ width: `${Math.min(100, item.limitUsagePercent)}%` }}
                                    />
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-3 text-right font-bold text-rose-600">
                                +{formatCurrency(item.purchasesInPeriod)}
                              </td>

                              <td className="py-3 px-3 text-right font-bold text-emerald-600">
                                -{formatCurrency(item.paymentsInPeriod)}
                              </td>

                              <td className="py-3 px-3">
                                {item.lastPaymentDate ? (
                                  <div>
                                    <span className="text-slate-700 font-semibold block text-[11px]">
                                      {item.lastPaymentDate.slice(0, 10)}
                                    </span>
                                    {item.daysWithoutPayment !== null && item.currentBalance > 0 && (
                                      <span className="text-[10px] text-slate-400">
                                        Hace {item.daysWithoutPayment} días
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Sin pagos</span>
                                )}
                              </td>

                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Botón Ver PDF Individual */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCustomerPDF(c)}
                                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg inline-flex items-center gap-1 text-[11px] font-bold transition"
                                    title="Previsualizar y descargar Estado de Cuenta en PDF"
                                  >
                                    <FileText className="w-3.5 h-3.5" /> PDF
                                  </button>

                                  {/* Botón WhatsApp */}
                                  {c.phone && item.currentBalance > 0 && (
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg inline-flex items-center gap-1 text-[11px] font-bold transition"
                                      title="Enviar aviso por WhatsApp"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" /> WA
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 2: REPORTE DE VENTAS & MEDIOS DE PAGO DEL PERÍODO */}
          {/* ========================================================= */}
          {activeTab === 'SALES_SUMMARY' && (
            <div className="space-y-5 animate-in fade-in">
              {/* KPIS CONSOLIDADOS DE VENTAS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-rose-50/80 rounded-2xl border border-rose-200">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                      Total Ventas a Crédito (Fiado)
                    </span>
                    <ShoppingBag className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-rose-800 mt-2 truncate">
                    {formatCurrency(salesSummary.totalVentasFiadas)}
                  </div>
                  <p className="text-[10px] text-rose-600 mt-0.5">Mercadería entregada en el periodo</p>
                </div>

                <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Total Cobrado (Abonos)
                    </span>
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-2 truncate">
                    {formatCurrency(salesSummary.totalCobrado)}
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Dinero recaudado de cuentas</p>
                </div>

                <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Notas de Crédito / Ajustes
                    </span>
                    <RotateCcw className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-900 mt-2 truncate">
                    {formatCurrency(salesSummary.totalNotasCredito)}
                  </div>
                  <p className="text-[10px] text-amber-600 mt-0.5">Correcciones emitidas</p>
                </div>

                <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Flujo Neto Recaudación
                    </span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div
                    className={`text-xl sm:text-2xl font-black mt-2 truncate ${
                      salesSummary.flujoNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(salesSummary.flujoNeto)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {salesSummary.flujoNeto >= 0 ? 'Cobranzas superan ventas' : 'Crédito extendido supera cobranzas'}
                  </p>
                </div>
              </div>

              {/* DESGLOSE POR MEDIO DE PAGO */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Cobranzas por Medio de Pago en el Período
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Distribución de los {formatCurrency(salesSummary.totalCobrado)} cobrados
                    </p>
                  </div>
                  <button
                    onClick={handleOpenCurrentTabPDF}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" /> Generar PDF de Ventas
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-1">
                  {(
                    [
                      { key: 'EFECTIVO', label: 'Efectivo', icon: Banknote, color: 'text-emerald-600 bg-emerald-50' },
                      { key: 'TRANSFERENCIA', label: 'Transferencia', icon: Building, color: 'text-blue-600 bg-blue-50' },
                      { key: 'PIX', label: 'Pix', icon: Smartphone, color: 'text-teal-600 bg-teal-50' },
                      { key: 'QR_BANCARIO', label: 'QR Bancario', icon: QrCode, color: 'text-indigo-600 bg-indigo-50' },
                      { key: 'TARJETA_DEBITO', label: 'Tarjeta Débito', icon: CreditCard, color: 'text-purple-600 bg-purple-50' },
                      { key: 'TARJETA_CREDITO', label: 'Tarjeta Crédito', icon: CreditCard, color: 'text-rose-600 bg-rose-50' },
                    ] as const
                  ).map((m) => {
                    const Icon = m.icon;
                    const amount = salesSummary.paymentMethodsMap[m.key] || 0;
                    const percent =
                      salesSummary.totalCobrado > 0 ? (amount / salesSummary.totalCobrado) * 100 : 0;

                    return (
                      <div
                        key={m.key}
                        className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`p-1.5 rounded-lg ${m.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-[10px] font-black text-slate-400">
                            {percent.toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-2">
                          <span className="text-[10px] font-bold text-slate-500 block truncate">
                            {m.label}
                          </span>
                          <span className="text-xs font-black text-slate-900 block truncate">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CLIENTES CON MAYOR VOLUMEN EN EL PERIODO */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <h3 className="text-sm font-black text-slate-900">
                  Top Clientes por Movimiento en el Periodo Seleccionado
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-rose-700 block">
                      Mayores Compras Fiadas (+)
                    </span>
                    <div className="divide-y divide-slate-200/60 text-xs">
                      {[...customerPortfolio]
                        .sort((a, b) => b.purchasesInPeriod - a.purchasesInPeriod)
                        .slice(0, 5)
                        .filter((i) => i.purchasesInPeriod > 0)
                        .map((item, idx) => (
                          <div key={idx} className="py-1.5 flex justify-between items-center">
                            <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                              {idx + 1}. {item.customer.full_name}
                            </span>
                            <span className="font-black text-rose-600">
                              {formatCurrency(item.purchasesInPeriod)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-emerald-700 block">
                      Mayores Pagos Realizados (-)
                    </span>
                    <div className="divide-y divide-slate-200/60 text-xs">
                      {[...customerPortfolio]
                        .sort((a, b) => b.paymentsInPeriod - a.paymentsInPeriod)
                        .slice(0, 5)
                        .filter((i) => i.paymentsInPeriod > 0)
                        .map((item, idx) => (
                          <div key={idx} className="py-1.5 flex justify-between items-center">
                            <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                              {idx + 1}. {item.customer.full_name}
                            </span>
                            <span className="font-black text-emerald-600">
                              {formatCurrency(item.paymentsInPeriod)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 3: LIBRO MAYOR DETALLADO DE MOVIMIENTOS           */}
          {/* ========================================================= */}
          {activeTab === 'TRANSACTIONS_LEDGER' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Filtrar por Cliente
                  </label>
                  <CustomSelect
                    value={selectedCustomerId}
                    onChange={(val) => setSelectedCustomerId(String(val))}
                    title="Filtrar por Cliente"
                    searchable={true}
                    options={[
                      { value: 'ALL', label: `Todos los Clientes (${customers.length})` },
                      ...customers.map((c) => ({
                        value: c.id,
                        label: `${c.full_name}${c.nickname ? ` (${c.nickname})` : ''}`,
                        sublabel: c.phone || undefined,
                      })),
                    ]}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Filtrar por Tipo de Operación
                  </label>
                  <CustomSelect
                    value={selectedTxType}
                    onChange={(val) => setSelectedTxType(String(val))}
                    title="Filtrar por Tipo de Operación"
                    options={[
                      { value: 'ALL', label: 'Todas las Operaciones' },
                      { value: 'PURCHASES', label: 'Solo Compras (Fiados)', badge: 'Debe' },
                      { value: 'PAYMENTS', label: 'Solo Pagos (Abonos)', badge: 'Haber' },
                      { value: 'ADJUSTMENTS', label: 'Solo Notas de Crédito / Ajustes', badge: 'Ajuste' },
                    ]}
                  />
                </div>
              </div>

              {/* TABLA DEL LIBRO MAYOR */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Fecha & Hora</th>
                        <th className="py-3 px-3">Cliente</th>
                        <th className="py-3 px-3">Tipo</th>
                        <th className="py-3 px-3">Detalle / Mercadería</th>
                        <th className="py-3 px-3">Medio Pago / Ref</th>
                        <th className="py-3 px-3 text-right">Monto</th>
                        <th className="py-3 px-3 text-right">Saldo Posterior</th>
                        <th className="py-3 px-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredLedgerTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                            No se registran transacciones para los filtros y fechas seleccionadas.
                          </td>
                        </tr>
                      ) : (
                        filteredLedgerTransactions.map((tx) => {
                          const isPurchase =
                            tx.type === 'DEBIT_PURCHASE' || tx.type === 'ADJUSTMENT_DEBIT';
                          const custName = customersMap.get(tx.customer_id) || tx.customer_id;

                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {new Date(tx.created_at).toLocaleString('es-PY', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>

                              <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                                {custName}
                              </td>

                              <td className="py-3 px-3 whitespace-nowrap">
                                <span
                                  className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                    tx.type === 'DEBIT_PURCHASE'
                                      ? 'bg-rose-100 text-rose-700'
                                      : tx.type === 'CREDIT_PAYMENT'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {tx.type === 'DEBIT_PURCHASE'
                                    ? 'COMPRA FIADA'
                                    : tx.type === 'CREDIT_PAYMENT'
                                    ? 'PAGO / ABONO'
                                    : 'NOTA AJUSTE'}
                                </span>
                              </td>

                              <td className="py-3 px-3 max-w-xs truncate text-slate-700">
                                {tx.description || '-'}
                              </td>

                              <td className="py-3 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                                {tx.payment_method ? (
                                  <span className="font-semibold text-slate-700">
                                    {tx.payment_method}
                                    {tx.payment_reference ? ` (${tx.payment_reference})` : ''}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>

                              <td className="py-3 px-3 text-right font-black whitespace-nowrap">
                                <span className={isPurchase ? 'text-rose-600' : 'text-emerald-600'}>
                                  {isPurchase ? '+' : '-'} {formatCurrency(tx.amount)}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-right font-bold text-slate-700 whitespace-nowrap">
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
                                  {tx.status === 'CERTIFIED_BOTH' ? 'Certificado' : 'Pendiente PIN'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL VISOR DE PDF PREVIO CON BOTÓN DE DESCARGA */}
      {showPDFModal && (
        <PDFReportPreviewModal
          mode={pdfMode}
          tenant={tenant}
          dateFrom={appliedDateFrom}
          dateTo={appliedDateTo}
          customer={pdfCustomer}
          customers={customers}
          transactions={pdfCustomer ? transactions.filter((t) => t.customer_id === pdfCustomer.id) : filteredLedgerTransactions}
          portfolio={customerPortfolio}
          salesSummary={salesSummary}
          onClose={() => {
            setShowPDFModal(false);
            setPdfCustomer(null);
          }}
        />
      )}
    </div>
  );
}
