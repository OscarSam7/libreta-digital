'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Transaction, Tenant, TransactionType, PaymentMethod, StaffMember, StaffRole, StaffPermissions } from '@/types';
import { getStoredData, saveCustomers, saveTransactions, saveTenant, syncFromSupabase, saveStaff, setCurrentOperator } from '@/lib/storage';
import { executeLedgerTransaction, certifyTransactionWithPin } from '@/lib/ledger';
import { exportTransactionsToCSV, generateWhatsAppReminderUrl } from '@/lib/reports';
import { CustomerQRModal } from '@/components/CustomerQRModal';
import { SubscriptionPlansModal } from '@/components/SubscriptionPlansModal';
import { MerchantAuthModal } from '@/components/MerchantAuthModal';
import { WhatsAppAutomationModal } from '@/components/WhatsAppAutomationModal';
import { SuperAdminDashboard } from '@/components/SuperAdminDashboard';
import { CreditNoteAdjustmentModal } from '@/components/CreditNoteAdjustmentModal';
import { DetailedReportsModal } from '@/components/DetailedReportsModal';
import { EditCreditLimitModal } from '@/components/EditCreditLimitModal';
import { HistoricalBatchImportModal } from '@/components/HistoricalBatchImportModal';
import { PDFReportPreviewModal } from '@/components/PDFReportPreviewModal';
import { CustomerHistoryModal } from '@/components/CustomerHistoryModal';
import { TermsAndConditionsModal } from '@/components/TermsAndConditionsModal';
import { StaffManagementModal } from '@/components/StaffManagementModal';
import { StaffSwitchModal } from '@/components/StaffSwitchModal';
import { BrandLogo } from '@/components/BrandLogo';
import {
  TrendingUp,
  Users,
  AlertTriangle,
  QrCode,
  Plus,
  Search,
  MessageCircle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ChevronDown,
  ShoppingBag,
  ArrowDownLeft,
  Store,
  ShieldCheck,
  ReceiptText,
  Copy,
  Check,
  X,
  Lock,
  Globe2,
  CreditCard,
  UserCheck,
  Send,
  SlidersHorizontal,
  RotateCcw,
  FileText,
  Sliders,
  Banknote,
  Building,
  Smartphone,
  Wallet,
  BookOpen,
  Calendar,
  History,
  Share2
} from 'lucide-react';

const REGIONAL_CURRENCIES = [
  { code: 'PYG', symbol: '₲', label: 'Paraguay (Guaraní)' },
  { code: 'BRL', symbol: 'R$', label: 'Brasil (Real)' },
  { code: 'PEN', symbol: 'S/', label: 'Perú (Sol)' },
  { code: 'USD', symbol: '$', label: 'Dólar (USD)' },
];

const PAYMENT_METHODS_CONFIG: {
  id: PaymentMethod;
  label: string;
  icon: any;
  color: string;
  sublabel: string;
}[] = [
  { id: 'EFECTIVO', label: 'Efectivo', icon: Banknote, color: 'text-emerald-600 bg-emerald-50', sublabel: 'Caja' },
  { id: 'TRANSFERENCIA', label: 'Transferencia', icon: Building, color: 'text-blue-600 bg-blue-50', sublabel: 'Bancaria' },
  { id: 'PIX', label: 'Pix Instantáneo', icon: Smartphone, color: 'text-teal-600 bg-teal-50', sublabel: 'Brasil' },
  { id: 'QR_BANCARIO', label: 'Cobro QR / Billetera', icon: QrCode, color: 'text-indigo-600 bg-indigo-50', sublabel: 'Zimple/Yape' },
  { id: 'TARJETA_DEBITO', label: 'Tarjeta Débito', icon: CreditCard, color: 'text-purple-600 bg-purple-50', sublabel: 'POS' },
  { id: 'TARJETA_CREDITO', label: 'Tarjeta Crédito', icon: Wallet, color: 'text-rose-600 bg-rose-50', sublabel: 'POS' },
];

export function MerchantDashboard() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'OVERLIMIT' | 'WITH_DEBT'>('ALL');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Estados de Modales
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [activeTxCustomer, setActiveTxCustomer] = useState<Customer | null>(null);
  const [activeQRCustomer, setActiveQRCustomer] = useState<Customer | null>(null);
  const [activeLimitCustomer, setActiveLimitCustomer] = useState<Customer | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showHistoricalModal, setShowHistoricalModal] = useState(false);
  const [historicalPreselectedCustomer, setHistoricalPreselectedCustomer] = useState<Customer | null>(null);
  const [showCustomerHistoryModal, setShowCustomerHistoryModal] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [pdfPreviewCustomer, setPdfPreviewCustomer] = useState<Customer | null>(null);
  const [termsModalCustomer, setTermsModalCustomer] = useState<Customer | null>(null);
  const [txToAdjust, setTxToAdjust] = useState<Transaction | null>(null);

  // Estados de Personal, Operadores y Roles
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [currentOperator, setCurrentOperatorState] = useState<StaffMember | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showStaffSwitchModal, setShowStaffSwitchModal] = useState(false);
  const [elevatedAction, setElevatedAction] = useState<{
    permission: keyof StaffPermissions;
    label: string;
    action: () => void;
  } | null>(null);

  // Formulario Transacción Rápida
  const [txType, setTxType] = useState<TransactionType>('DEBIT_PURCHASE');
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txDate, setTxDate] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('EFECTIVO');
  const [paymentRef, setPaymentRef] = useState('');
  const [txStep, setTxStep] = useState<'INPUT' | 'PIN_VERIFY' | 'SUCCESS'>('INPUT');
  const [createdTx, setCreatedTx] = useState<Transaction | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [txError, setTxError] = useState('');

  // Formulario Alta de Cliente
  const [newCustName, setNewCustName] = useState('');
  const [newCustNickname, setNewCustNickname] = useState('');
  const [newCustDoc, setNewCustDoc] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustLimit, setNewCustLimit] = useState('');
  const [newCustError, setNewCustError] = useState('');

  const loadData = () => {
    const data = getStoredData();
    setTenant(data.tenant);
    setCustomers(data.customers);
    setTransactions(data.transactions);
    setStaff(data.staff);
    setCurrentOperatorState(data.currentOperator);
  };

  const checkPermissionAndExecute = (
    permission: keyof StaffPermissions,
    label: string,
    action: () => void
  ) => {
    if (!currentOperator || currentOperator.role === 'OWNER' || currentOperator.permissions[permission]) {
      action();
    } else {
      setElevatedAction({
        permission,
        label,
        action,
      });
      setShowStaffSwitchModal(true);
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
  }, []);

  if (!tenant) return null;

  const formatCurrency = (val: number) => {
    return `${tenant.currency_symbol} ${new Intl.NumberFormat(
      tenant.currency_code === 'PYG' ? 'es-PY' : tenant.currency_code === 'BRL' ? 'pt-BR' : 'es-PE'
    ).format(val)}`;
  };

  const handleCurrencyChange = (currCode: string) => {
    const found = REGIONAL_CURRENCIES.find((c) => c.code === currCode);
    if (found && tenant) {
      const updatedTenant = {
        ...tenant,
        currency_code: found.code,
        currency_symbol: found.symbol,
      };
      setTenant(updatedTenant);
      saveTenant(updatedTenant);
    }
  };

  const totalCapitalCalle = customers.reduce(
    (acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0),
    0
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const totalCobradoHoy = transactions
    .filter((t) => t.type === 'CREDIT_PAYMENT' && t.created_at.startsWith(todayStr))
    .reduce((acc, t) => acc + t.amount, 0);

  const pendingCount = transactions.filter((t) => t.status === 'PENDING_CUSTOMER').length;
  const clientesExcedidos = customers.filter(
    (c) => c.credit_limit > 0 && c.current_balance > c.credit_limit
  );

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.full_name.toLowerCase().includes(q) ||
      (c.nickname && c.nickname.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.document_id && c.document_id.includes(q));

    if (!matchesSearch) return false;
    if (filterType === 'OVERLIMIT') return c.credit_limit > 0 && c.current_balance > c.credit_limit;
    if (filterType === 'WITH_DEBT') return c.current_balance > 0;
    return true;
  });

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      setNewCustError('Nombre y teléfono son obligatorios.');
      return;
    }

    const token = 'cli-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      tenant_id: tenant.id,
      full_name: newCustName.trim(),
      nickname: newCustNickname.trim() || undefined,
      document_id: newCustDoc.trim() || undefined,
      phone: newCustPhone.trim(),
      credit_limit: parseFloat(newCustLimit) || 0,
      current_balance: 0,
      qr_token: token,
      security_pin: pin,
      pin_hash: `$2a$06$hash_${pin}`,
      is_blocked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveCustomers([newCustomer, ...customers]);
    setShowNewCustomerModal(false);
    setNewCustName('');
    setNewCustNickname('');
    setNewCustDoc('');
    setNewCustPhone('');
    setNewCustLimit('');
    setNewCustError('');
    setActiveQRCustomer(newCustomer);
  };

  const handleExecuteTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTxCustomer) return;
    setTxError('');

    if (txType === 'DEBIT_PURCHASE' && currentOperator && currentOperator.role !== 'OWNER' && !currentOperator.permissions.can_register_sales) {
      setTxError(`El operador actual (${currentOperator.full_name}) no tiene permisos para registrar compras al fiado.`);
      return;
    }
    if (txType === 'CREDIT_PAYMENT' && currentOperator && currentOperator.role !== 'OWNER' && !currentOperator.permissions.can_register_payments) {
      setTxError(`El operador actual (${currentOperator.full_name}) no tiene permisos para registrar pagos / cobranzas.`);
      return;
    }

    const parsedAmount = parseFloat(txAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setTxError('Ingrese un monto válido mayor a 0');
      return;
    }

    const res = executeLedgerTransaction({
      customerId: activeTxCustomer.id,
      type: txType,
      amount: parsedAmount,
      description:
        txDescription.trim() ||
        (txType === 'DEBIT_PURCHASE'
          ? 'Mercadería al fiado'
          : `Abono de cuenta (${selectedPaymentMethod})`),
      paymentMethod: txType === 'CREDIT_PAYMENT' ? selectedPaymentMethod : undefined,
      paymentReference: txType === 'CREDIT_PAYMENT' ? paymentRef : undefined,
      createdAt: txDate ? `${txDate}T12:00:00.000Z` : undefined,
      status: txDate && txType === 'DEBIT_PURCHASE' ? 'CERTIFIED_BOTH' : undefined,
      validationMethod: txDate ? 'CARGA_HISTORICA_MANUAL' : undefined,
      operatorId: currentOperator?.id,
      operatorName: currentOperator?.full_name,
    });

    if (!res.success || !res.transaction) {
      setTxError(res.error || 'No se pudo procesar');
      return;
    }

    // Los pagos y operaciones históricas quedan certificados inmediatamente
    if (txType === 'CREDIT_PAYMENT' || (txDate && res.transaction.status === 'CERTIFIED_BOTH')) {
      setTxStep('SUCCESS');
      setTimeout(() => {
        setActiveTxCustomer(null);
        setTxStep('INPUT');
        setTxAmount('');
        setTxDescription('');
        setPaymentRef('');
        setTxDate('');
        loadData();
      }, 1200);
    } else {
      setCreatedTx(res.transaction);
      setTxStep('PIN_VERIFY');
    }
  };

  const handleVerifyPin = () => {
    if (!createdTx) return;
    setTxError('');

    const res = certifyTransactionWithPin(createdTx.id, enteredPin, 'IN_STORE_PIN');
    if (res.success) {
      setTxStep('SUCCESS');
      setTimeout(() => {
        setActiveTxCustomer(null);
        setTxStep('INPUT');
        setTxAmount('');
        setTxDescription('');
        setEnteredPin('');
        loadData();
      }, 1200);
    } else {
      setTxError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 pb-24 text-slate-900 font-sans">
      {/* HEADER PRINCIPAL RESPONSIVO */}
      <header className="bg-slate-950 text-white px-3 sm:px-4 py-3 shadow-lg sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex flex-col gap-2.5">
          {/* FILA 1: Logo de Marca a la izquierda, y Acciones Principales a la derecha */}
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 min-w-0">
              <BrandLogo size="sm" theme="dark" className="shrink-0" />
              <div className="h-6 w-px bg-slate-800 hidden md:block shrink-0" />
              <div className="hidden md:block truncate">
                <span className="text-xs font-black tracking-tight text-slate-200 block truncate">{tenant.business_name}</span>
                <p className="text-[10px] text-slate-400">Terminal POS Activa</p>
              </div>
            </div>

            {/* Controles Principales de la derecha: Operador Activo y Nuevo Cliente */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Botón de Operador Activo / Turno */}
              <button
                onClick={() => {
                  setElevatedAction(null);
                  setShowStaffSwitchModal(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white rounded-xl text-xs font-bold transition shadow-xs"
                title="Cambiar de Operador / Iniciar Turno POS"
              >
                <div className="w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-black shrink-0">
                  {currentOperator ? currentOperator.full_name.charAt(0) : 'U'}
                </div>
                <div className="text-left hidden xs:block">
                  <span className="block leading-none text-[11px] font-bold truncate max-w-[85px] sm:max-w-[120px]">
                    {currentOperator ? currentOperator.full_name.split(' ')[0] : 'Operador'}
                  </span>
                  <span className="text-[9px] text-blue-400 font-semibold block leading-tight">
                    {currentOperator?.role === 'OWNER'
                      ? 'Dueño'
                      : currentOperator?.role === 'ADMIN'
                      ? 'Admin'
                      : currentOperator?.role === 'CASHIER'
                      ? 'Cajero'
                      : 'Cobrador'}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
              </button>

              {/* Botón Nuevo Cliente */}
              <button
                onClick={() => setShowNewCustomerModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Nuevo Cliente</span><span className="xs:hidden">Cliente</span>
              </button>
            </div>
          </div>

          {/* FILA 2: SUB-BARRA DE ACCESOS DIRECTOS (DESPLAZAMIENTO SUAVE EN MÓVIL SIN OVERFLOW) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full">
            {/* Gestión de Personal y Roles */}
            <button
              onClick={() => checkPermissionAndExecute('can_manage_staff', 'Gestionar Colaboradores y Roles', () => setShowStaffModal(true))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 shadow-xs"
              title="Gestionar Colaboradores, Roles y Permisos"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" /> Equipo / Roles
            </button>

            {/* Alta de Nuevo Almacén / Onboarding */}
            <a
              href="/registro-comercio"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-800/60 text-indigo-300 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 shadow-xs"
              title="Registrar nuevo comercio o crear otra sucursal"
            >
              <Store className="w-3.5 h-3.5 text-indigo-400" /> + Almacén
            </a>

            {/* Informes */}
            <button
              onClick={() => checkPermissionAndExecute('can_view_financial_reports', 'Ver Reportes Financieros', () => setShowReportsModal(true))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 shadow-xs"
              title="Informes por Fechas y Clientes"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" /> Informes
            </button>

            {/* Cobranzas WhatsApp */}
            <button
              onClick={() => setShowWhatsAppModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-800/60 text-emerald-300 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 shadow-xs"
              title="Cobranzas y Avisos por WhatsApp"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" /> Cobranzas WA
            </button>

            {/* Link Clientes */}
            <button
              onClick={() => {
                const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/registro-cliente?almacen=${tenant.id}`;
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(url);
                  alert('¡Enlace de auto-registro copiado al portapapeles!\n\nPuedes enviarlo a tus clientes por WhatsApp:\n\n' + url);
                } else {
                  prompt('Copia este enlace para enviar a tus clientes:', url);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 shadow-xs"
              title="Copiar enlace para que tus clientes se registren desde su celular"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" /> Link Clientes
            </button>

            {/* Selector de Moneda */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs whitespace-nowrap shrink-0">
              <Globe2 className="w-3 h-3 text-slate-400 shrink-0" />
              <select
                value={tenant.currency_code}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
              >
                {REGIONAL_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Cuenta Comercio */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold transition whitespace-nowrap shrink-0"
              title="Cuenta de Comercio"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Cuenta
            </button>

            {/* Botón SuperAdmin */}
            <button
              onClick={() => setShowSuperAdminModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold transition whitespace-nowrap shrink-0"
              title="Panel SuperAdmin (Dueño SaaS)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-300" /> SaaS Admin
            </button>

            {/* Plan de Suscripción */}
            <button
              onClick={() => setShowSubscriptionModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-950/60 border border-blue-800/40 text-blue-300 rounded-xl text-[11px] font-bold uppercase transition whitespace-nowrap shrink-0 sm:ml-auto"
              title="Plan de Suscripción"
            >
              <CreditCard className="w-3 h-3 text-amber-400" /> Plan {tenant.subscription_plan}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 pt-4 sm:pt-5 space-y-4 sm:space-y-5 w-full">
        {/* BANNER FINANCIERO */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs uppercase font-extrabold text-blue-300 tracking-wider">
                Suscripción Activa en {tenant.currency_code}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-200">
              Acepta Efectivo, Transferencias, Pix, QR y Tarjetas Débito/Crédito al liquidar cuentas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setHistoryCustomer(null);
                setShowCustomerHistoryModal(true);
              }}
              className="text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95"
              title="Consultar historial detallado de compras fiadas y pagos por cliente"
            >
              <History className="w-4 h-4 text-amber-300" /> Historial por Cliente
            </button>
            <button
              onClick={() => {
                setHistoricalPreselectedCustomer(null);
                setShowHistoricalModal(true);
              }}
              className="text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2 rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95"
              title="Cargar compras y pagos anteriores del cuaderno físico"
            >
              <BookOpen className="w-4 h-4 text-slate-950" /> Cargar Cuaderno / Historial
            </button>
            <button
              onClick={() => setShowReportsModal(true)}
              className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl backdrop-blur-md transition flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-emerald-400" /> Informes
            </button>
            <div className="flex items-center gap-1.5 text-xs font-bold bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Libro Inmutable
            </div>
          </div>
        </div>

        {/* 4 KPIS EN TIEMPO REAL */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Capital en la Calle
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2 truncate">
              {formatCurrency(totalCapitalCalle)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Saldo pendiente de cobro</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cobrado Hoy
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-2 truncate">
              {formatCurrency(totalCobradoHoy)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Abonos recibidos en caja</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Por Certificar
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-600 mt-2">
              {pendingCount}{' '}
              <span className="text-xs font-semibold text-slate-400">operaciones</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Esperando PIN del cliente</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Crédito Excedido
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 mt-2">
              {clientesExcedidos.length}{' '}
              <span className="text-xs font-semibold text-slate-400">clientes</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Superan su tope pactado</p>
          </div>
        </section>

        {/* SECCIÓN CUENTAS CORRIENTES */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Cuentas Corrientes ({customers.length})
              </h2>
              <p className="text-xs text-slate-500">
                Carga compras fiadas, pagos multicanal o gestiona límites de crédito.
              </p>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold w-full sm:w-auto">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-xl transition flex-1 sm:flex-initial ${
                  filterType === 'ALL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('WITH_DEBT')}
                className={`px-3 py-1.5 rounded-xl transition flex-1 sm:flex-initial ${
                  filterType === 'WITH_DEBT' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
                }`}
              >
                Con Deuda
              </button>
              <button
                onClick={() => setFilterType('OVERLIMIT')}
                className={`px-3 py-1.5 rounded-xl transition flex-1 sm:flex-initial ${
                  filterType === 'OVERLIMIT' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500'
                }`}
              >
                Excedidos
              </button>
            </div>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, apodo, cédula/DNI o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none transition"
            />
          </div>

          {/* Grilla de Cuentas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {filteredCustomers.map((cust) => {
              const isOver = cust.credit_limit > 0 && cust.current_balance > cust.credit_limit;
              const hasDebt = cust.current_balance > 0;
              const waUrl = generateWhatsAppReminderUrl(cust, tenant);

              return (
                <div
                  key={cust.id}
                  className={`rounded-2xl p-4 border transition hover:shadow-md flex flex-col justify-between ${
                    isOver
                      ? 'bg-amber-50/50 border-amber-300'
                      : hasDebt
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-50/70 border-slate-200/60'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-black text-base text-slate-900">{cust.full_name}</h3>
                          {cust.is_blocked && (
                            <span className="text-[9px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded">
                              BLOQUEADO
                            </span>
                          )}
                          {cust.terms_accepted ? (
                            <button
                              onClick={() => setTermsModalCustomer(cust)}
                              className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-emerald-200 transition"
                              title="Términos e Informconf Aceptados digitalmente"
                            >
                              <ShieldCheck className="w-3 h-3 text-emerald-600" /> INFORMCONF OK
                            </button>
                          ) : (
                            <button
                              onClick={() => setTermsModalCustomer(cust)}
                              className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-amber-200 transition"
                              title="Clic para convalidar o enviar términos y autorización Informconf"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> TÉRMINOS PENDIENTES
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {cust.nickname ? `"${cust.nickname}" • ` : ''}
                          {cust.phone} {cust.document_id ? `• Doc: ${cust.document_id}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setTermsModalCustomer(cust)}
                          className={`p-2 rounded-xl transition ${
                            cust.terms_accepted
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 animate-pulse'
                          }`}
                          title="Términos de Crédito y Autorización Informconf"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setPdfPreviewCustomer(cust)}
                          className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                          title="Ver y Descargar Estado de Cuenta en PDF"
                        >
                          <FileText className="w-4 h-4 text-indigo-600" />
                        </button>

                        <button
                          onClick={() => checkPermissionAndExecute('can_edit_credit_limits', 'Modificar Límite de Crédito', () => setActiveLimitCustomer(cust))}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Editar Límite de Crédito / Bloqueo"
                        >
                          <Sliders className="w-4 h-4 text-slate-600" />
                        </button>

                        <button
                          onClick={() => setActiveQRCustomer(cust)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Ver y Emitir Tarjeta QR"
                        >
                          <QrCode className="w-4 h-4 text-blue-600" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-between items-baseline border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Saldo Deudor
                        </span>
                        <span
                          className={`text-2xl font-black ${
                            hasDebt ? 'text-slate-900' : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(cust.current_balance)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Límite Autorizado
                        </span>
                        <button
                          onClick={() => checkPermissionAndExecute('can_edit_credit_limits', 'Modificar Límite de Crédito', () => setActiveLimitCustomer(cust))}
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-end gap-1 ml-auto"
                          title="Clic para cambiar límite"
                        >
                          <span>
                            {cust.credit_limit > 0 ? formatCurrency(cust.credit_limit) : 'Sin límite'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {isOver && (
                      <div className="mt-2 text-[11px] font-bold text-amber-700 bg-amber-100/90 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Límite pactado superado
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-4 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setActiveTxCustomer(cust);
                        setTxStep('INPUT');
                        setTxAmount('');
                        setTxDescription('');
                        setTxDate('');
                        setSelectedPaymentMethod('EFECTIVO');
                        setPaymentRef('');
                        setEnteredPin('');
                        setTxError('');
                      }}
                      className="flex items-center justify-center gap-1 py-2 px-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
                      title="Registrar fiado o pago rápido hoy"
                    >
                      <Plus className="w-3.5 h-3.5" /> Fiado/Abono
                    </button>

                    <button
                      onClick={() => {
                        setHistoryCustomer(cust);
                        setShowCustomerHistoryModal(true);
                      }}
                      className="flex items-center justify-center gap-1 py-2 px-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition active:scale-95"
                      title="Ver historial de compras fiadas y pagos por fecha"
                    >
                      <History className="w-3.5 h-3.5 text-indigo-600" /> Historial
                    </button>

                    <button
                      onClick={() => {
                        setHistoricalPreselectedCustomer(cust);
                        setShowHistoricalModal(true);
                      }}
                      className="flex items-center justify-center gap-1 py-2 px-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition active:scale-95"
                      title="Cargar compras y pagos anteriores anotados en cuaderno"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-700" /> Cuaderno
                    </button>

                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 py-2 px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* LIBRO MAYOR EN VIVO */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-indigo-600" /> Libro Mayor (Asientos Inmutables)
              </h2>
              <p className="text-xs text-slate-500">Últimos movimientos con certificación anti-disputas</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => checkPermissionAndExecute('can_view_financial_reports', 'Ver Reportes Financieros', () => setShowReportsModal(true))}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <FileText className="w-4 h-4" /> Ver Informe con Fechas
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {transactions.slice(0, 10).map((tx) => {
              const isPurchase =
                tx.type === 'DEBIT_PURCHASE' || tx.type === 'ADJUSTMENT_DEBIT';
              const isAdjustment =
                tx.type === 'ADJUSTMENT_CREDIT' || tx.type === 'ADJUSTMENT_DEBIT';
              const customer = customers.find((c) => c.id === tx.customer_id);

              return (
                <div
                  key={tx.id}
                  className={`p-3.5 rounded-2xl border transition ${
                    isAdjustment
                      ? 'bg-amber-50/40 border-amber-300'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                          isAdjustment
                            ? 'bg-amber-100 text-amber-700'
                            : isPurchase
                            ? 'bg-rose-100 text-rose-600'
                            : 'bg-emerald-100 text-emerald-600'
                        }`}
                      >
                        {isAdjustment ? (
                          <RotateCcw className="w-4 h-4" />
                        ) : isPurchase ? (
                          <ShoppingBag className="w-4 h-4" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-slate-900">
                            {customer ? customer.full_name : 'Cliente'}
                          </span>
                          {tx.payment_method && (
                            <span className="text-[9px] bg-slate-200 text-slate-700 font-extrabold px-1.5 py-0.2 rounded">
                              {tx.payment_method}
                            </span>
                          )}
                          {isAdjustment && (
                            <span className="text-[9px] bg-amber-200 text-amber-900 font-extrabold px-1.5 py-0.2 rounded">
                              AJUSTE CONTABLE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 truncate max-w-[200px] sm:max-w-md">
                          {tx.description}
                          {tx.payment_reference ? ` • Ref: ${tx.payment_reference}` : ''}
                          {tx.operator_name ? ` • 👤 ${tx.operator_name}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      <div>
                        <div
                          className={`text-sm font-black ${
                            isPurchase ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {isPurchase ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </div>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            tx.status === 'CERTIFIED_BOTH'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {tx.status === 'CERTIFIED_BOTH' ? 'Certificado' : 'Pendiente'}
                        </span>
                      </div>

                      {!isAdjustment && (
                        <button
                          onClick={() => checkPermissionAndExecute('can_adjust_credit_notes', 'Emitir Nota de Crédito / Ajustar Asiento', () => setTxToAdjust(tx))}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition ml-1"
                          title="Emitir Nota de Crédito / Ajustar error"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* MODAL ALTA DE CLIENTE */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative border border-slate-100 animate-in fade-in slide-in-from-bottom">
            <button
              onClick={() => setShowNewCustomerModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-slate-900 mb-1">Nueva Cuenta Corriente</h3>
            <p className="text-xs text-slate-400 mb-4">
              Genera automáticamente su tarjeta QR con PIN de seguridad
            </p>

            {newCustError && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 mb-3">
                {newCustError}
              </p>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcelo Fernández"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Apodo / Referencia
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Vecino 4B"
                    value={newCustNickname}
                    onChange={(e) => setNewCustNickname(e.target.value)}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Cédula / DNI
                  </label>
                  <input
                    type="text"
                    placeholder="Número Documento"
                    value={newCustDoc}
                    onChange={(e) => setNewCustDoc(e.target.value)}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 595981..."
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Límite ({tenant.currency_symbol})
                  </label>
                  <input
                    type="number"
                    placeholder="0 = Sin límite"
                    value={newCustLimit}
                    onChange={(e) => setNewCustLimit(e.target.value)}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition text-sm mt-2"
              >
                Dar de Alta y Generar Tarjeta QR
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CARGA RÁPIDA DE FIADO O ABONO CON MEDIOS DE PAGO */}
      {activeTxCustomer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative border border-slate-100 animate-in fade-in slide-in-from-bottom max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setActiveTxCustomer(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            {txStep === 'INPUT' && (
              <form onSubmit={handleExecuteTx} className="space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                    Registrar Movimiento
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-1 truncate">
                    {activeTxCustomer.full_name}
                  </h3>
                </div>

                {txError && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-200">
                    {txError}
                  </div>
                )}

                {/* Alternador Fiado vs Pago */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTxType('DEBIT_PURCHASE')}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 font-bold transition-all text-sm gap-1.5 ${
                      txType === 'DEBIT_PURCHASE'
                        ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-sm'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5" /> Fiado (Compra)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('CREDIT_PAYMENT')}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 font-bold transition-all text-sm gap-1.5 ${
                      txType === 'CREDIT_PAYMENT'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowDownLeft className="w-5 h-5" /> Abono (Pago)
                  </button>
                </div>

                {/* Selección de Medios de Pago (Visible cuando es Abono/Pago) */}
                {txType === 'CREDIT_PAYMENT' && (
                  <div className="space-y-2 pt-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Medio de Pago Utilizado
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS_CONFIG.map((method) => {
                        const Icon = method.icon;
                        const isSelected = selectedPaymentMethod === method.id;

                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setSelectedPaymentMethod(method.id)}
                            className={`p-2 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`} />
                              <span className="text-[9px] uppercase font-bold text-slate-400">
                                {method.sublabel}
                              </span>
                            </div>
                            <span className={`text-[11px] font-bold mt-1.5 block leading-tight ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>
                              {method.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Referencia opcional para medios digitales */}
                    {selectedPaymentMethod !== 'EFECTIVO' && (
                      <div className="pt-1 animate-in fade-in duration-200">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Nro. Comprobante / Transacción / Ref
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Op 938472 / Lote 40"
                          value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Selector opcional de fecha para cargar compras o pagos pasados */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Fecha del Movimiento
                    </label>
                    {txDate && (
                      <button
                        type="button"
                        onClick={() => setTxDate('')}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Restablecer a Hoy
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    max={todayStr}
                    value={txDate || todayStr}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                  {txDate && (
                    <p className="text-[10px] text-amber-600 font-semibold mt-1">
                      * Asentando con fecha retroactiva del {txDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Monto en {tenant.currency_code} ({tenant.currency_symbol})
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">
                      {tenant.currency_symbol}
                    </span>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full text-3xl font-black pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Detalle / Mercaderías
                  </label>
                  <input
                    type="text"
                    placeholder={
                      txType === 'DEBIT_PURCHASE'
                        ? 'Ej: 2 Harinas, 1 Aceite'
                        : `Ej: Liquidación parcial en ${selectedPaymentMethod}`
                    }
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full py-4 text-white font-bold rounded-2xl shadow-lg transition text-base ${
                    txType === 'CREDIT_PAYMENT'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                  }`}
                >
                  {txType === 'CREDIT_PAYMENT'
                    ? `Registrar Pago en ${selectedPaymentMethod}`
                    : 'Continuar a Validación con Cliente'}
                </button>
              </form>
            )}

            {txStep === 'PIN_VERIFY' && createdTx && (
              <div className="text-center space-y-4 py-2">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <ShieldCheck className="w-9 h-9" />
                </div>

                <div>
                  <h4 className="text-xl font-black text-slate-900">Validación en Mostrador</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    El cliente conforma la entrega por <b>{formatCurrency(createdTx.amount)}</b>:
                  </p>
                </div>

                <div className="bg-slate-50 py-2.5 px-4 rounded-2xl border border-dashed border-slate-300 inline-block">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    PIN Rápido Mostrador
                  </span>
                  <span className="text-2xl font-mono font-black tracking-widest text-blue-600">
                    {createdTx.validation_pin}
                  </span>
                </div>

                {txError && (
                  <p className="text-xs font-semibold text-rose-600 bg-rose-50 py-1.5 px-3 rounded-lg">
                    {txError}
                  </p>
                )}

                <div>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="• • • •"
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value)}
                    className="w-44 text-center text-3xl tracking-widest font-mono py-2.5 border-2 border-blue-500 rounded-2xl focus:outline-none mx-auto bg-white shadow-sm block"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTxCustomer(null)}
                    className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl text-xs"
                  >
                    Dejar Pendiente
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyPin}
                    className="w-1/2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md text-xs"
                  >
                    Firmar y Certificar
                  </button>
                </div>
              </div>
            )}

            {txStep === 'SUCCESS' && (
              <div className="text-center py-8 space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-xl font-black text-slate-900">¡Operación Asentada con Éxito!</h4>
                <p className="text-xs text-slate-500">
                  Saldo del cliente actualizado y acreditado en el Libro Mayor.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL TARJETA QR DEL CLIENTE E IMPRESIÓN */}
      {activeQRCustomer && (
        <CustomerQRModal
          customer={activeQRCustomer}
          tenant={tenant}
          onClose={() => setActiveQRCustomer(null)}
        />
      )}

      {/* MODAL EDITAR LÍMITE DE CRÉDITO Y BLOQUEO */}
      {activeLimitCustomer && (
        <EditCreditLimitModal
          customer={activeLimitCustomer}
          tenant={tenant}
          onClose={() => setActiveLimitCustomer(null)}
          onSuccess={() => loadData()}
        />
      )}

      {/* MODAL PLANES DE SUSCRIPCIÓN */}
      {showSubscriptionModal && (
        <SubscriptionPlansModal
          tenant={tenant}
          onClose={() => setShowSubscriptionModal(false)}
          onPlanUpdated={() => loadData()}
        />
      )}

      {/* MODAL AUTENTICACIÓN COMERCIANTE */}
      {showAuthModal && (
        <MerchantAuthModal
          onSuccess={() => {
            setShowAuthModal(false);
            loadData();
          }}
          onCancel={() => setShowAuthModal(false)}
        />
      )}

      {/* MODAL COBRANZAS POR WHATSAPP */}
      {showWhatsAppModal && (
        <WhatsAppAutomationModal
          customers={customers}
          tenant={tenant}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}

      {/* MODAL SUPERADMIN SAAS */}
      {showSuperAdminModal && (
        <SuperAdminDashboard onClose={() => setShowSuperAdminModal(false)} />
      )}

      {/* MODAL NOTA DE CRÉDITO / AJUSTE INMUTABLE */}
      {txToAdjust && (
        <CreditNoteAdjustmentModal
          transaction={txToAdjust}
          customer={customers.find((c) => c.id === txToAdjust.customer_id)!}
          tenant={tenant}
          onClose={() => setTxToAdjust(null)}
          onSuccess={() => loadData()}
        />
      )}

      {/* MODAL INFORME DETALLADO POR FECHAS Y CLIENTES */}
      {showReportsModal && (
        <DetailedReportsModal
          customers={customers}
          transactions={transactions}
          tenant={tenant}
          onClose={() => setShowReportsModal(false)}
        />
      )}

      {/* MODAL CARGA HISTÓRICA DE CUADERNO / PERIODO ANTERIOR */}
      {showHistoricalModal && (
        <HistoricalBatchImportModal
          customers={customers}
          tenant={tenant}
          preselectedCustomer={historicalPreselectedCustomer}
          onClose={() => {
            setShowHistoricalModal(false);
            setHistoricalPreselectedCustomer(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* MODAL VISTA PREVIA PDF DE ESTADO DE CUENTA INDIVIDUAL */}
      {pdfPreviewCustomer && (
        <PDFReportPreviewModal
          mode="CUSTOMER_STATEMENT"
          tenant={tenant}
          customer={pdfPreviewCustomer}
          transactions={transactions.filter((t) => t.customer_id === pdfPreviewCustomer.id)}
          onClose={() => setPdfPreviewCustomer(null)}
        />
      )}

      {/* MODAL HISTORIAL DE COMPRAS FIADAS Y PAGOS POR FECHA POR CLIENTE */}
      {showCustomerHistoryModal && (
        <CustomerHistoryModal
          customers={customers}
          transactions={transactions}
          tenant={tenant}
          preselectedCustomer={historyCustomer}
          onClose={() => {
            setShowCustomerHistoryModal(false);
            setHistoryCustomer(null);
          }}
        />
      )}

      {/* MODAL TÉRMINOS Y CONDICIONES / INFORCONF */}
      {termsModalCustomer && (
        <TermsAndConditionsModal
          customer={termsModalCustomer}
          tenant={tenant}
          onClose={() => setTermsModalCustomer(null)}
          onSuccess={(_updated) => {
            setTermsModalCustomer(null);
            loadData();
          }}
        />
      )}

      {/* MODAL GESTIÓN DE PERSONAL Y PERMISOS */}
      {showStaffModal && currentOperator && (
        <StaffManagementModal
          tenant={tenant}
          staff={staff}
          currentOperator={currentOperator}
          onClose={() => setShowStaffModal(false)}
          onUpdate={() => loadData()}
        />
      )}

      {/* MODAL CAMBIO RÁPIDO DE OPERADOR / INICIO DE TURNO CON PIN */}
      {showStaffSwitchModal && currentOperator && (
        <StaffSwitchModal
          tenant={tenant}
          staff={staff}
          currentOperator={currentOperator}
          requiredPermission={elevatedAction?.permission}
          permissionLabel={elevatedAction?.label}
          onSuccess={(operator) => {
            setShowStaffSwitchModal(false);
            loadData();
            if (elevatedAction) {
              const act = elevatedAction.action;
              setElevatedAction(null);
              act();
            }
          }}
          onClose={() => {
            setShowStaffSwitchModal(false);
            setElevatedAction(null);
          }}
          onOpenManagement={() => {
            setShowStaffSwitchModal(false);
            checkPermissionAndExecute('can_manage_staff', 'Gestionar Colaboradores y Roles', () => setShowStaffModal(true));
          }}
        />
      )}
    </div>
  );
}
