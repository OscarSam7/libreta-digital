'use client';

import React, { useState, useMemo } from 'react';
import { Customer, Tenant, TransactionType, PaymentMethod, TransactionItem } from '@/types';
import { createNewCustomer } from '@/lib/customers';
import { processHistoricalBatchTransactions, HistoricalBatchEntry } from '@/lib/ledger';
import {
  BookOpen,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowDownLeft,
  ShoppingBag,
  UserPlus,
  User,
  Search,
  AlertCircle,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Smartphone,
  Building,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

interface Props {
  customers: Customer[];
  tenant: Tenant;
  preselectedCustomer?: Customer | null;
  onClose: () => void;
  onSuccess: (updatedCustomer: Customer) => void;
}

interface StagedEntry {
  id: string;
  type: TransactionType;
  date: string;
  amount: number;
  description: string;
  items: TransactionItem[];
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
}

export function HistoricalBatchImportModal({
  customers,
  tenant,
  preselectedCustomer,
  onClose,
  onSuccess,
}: Props) {
  // Selección / Creación de cliente
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    preselectedCustomer ? preselectedCustomer.id : ''
  );
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [custSearch, setCustSearch] = useState('');

  // Formulario nuevo cliente rápido
  const [newCustName, setNewCustName] = useState('');
  const [newCustNickname, setNewCustNickname] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustDoc, setNewCustDoc] = useState('');
  const [newCustLimit, setNewCustLimit] = useState('');
  const [newCustError, setNewCustError] = useState('');

  // Lista de movimientos en borrador para el periodo
  const [stagedEntries, setStagedEntries] = useState<StagedEntry[]>([]);

  // Formulario de nuevo movimiento
  const todayDefault = new Date().toISOString().slice(0, 10);
  const [entryDate, setEntryDate] = useState(todayDefault);
  const [entryType, setEntryType] = useState<TransactionType>('DEBIT_PURCHASE');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryDesc, setEntryDesc] = useState('');
  const [entryPaymentMethod, setEntryPaymentMethod] = useState<PaymentMethod>('EFECTIVO');
  const [entryPaymentRef, setEntryPaymentRef] = useState('');

  // Modo desglose de productos
  const [showItemizedProducts, setShowItemizedProducts] = useState(false);
  const [productRows, setProductRows] = useState<TransactionItem[]>([
    { name: '', qty: 1, price: 0 },
  ]);

  // Estados de proceso
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState<{
    customer: Customer;
    txCount: number;
    finalBalance: number;
  } | null>(null);

  // Cliente seleccionado actual
  const currentCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Clientes filtrados por búsqueda
  const filteredCustomers = useMemo(() => {
    if (!custSearch.trim()) return customers;
    const q = custSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.nickname && c.nickname.toLowerCase().includes(q)) ||
        (c.document_id && c.document_id.includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }, [customers, custSearch]);

  const formatCurrency = (val: number) => {
    return `${tenant.currency_symbol} ${new Intl.NumberFormat(
      tenant.currency_code === 'PYG' ? 'es-PY' : tenant.currency_code === 'BRL' ? 'pt-BR' : 'es-PE'
    ).format(val)}`;
  };

  // Manejar cambio en items de productos
  const handleProductRowChange = (index: number, field: keyof TransactionItem, value: any) => {
    const updated = [...productRows];
    updated[index] = { ...updated[index], [field]: value };
    setProductRows(updated);

    // Recalcular monto total si está en modo desglose
    const total = updated.reduce((sum, item) => sum + (item.qty * (item.price || 0)), 0);
    if (total > 0) {
      setEntryAmount(total.toString());
    }
  };

  const addProductRow = () => {
    setProductRows([...productRows, { name: '', qty: 1, price: 0 }]);
  };

  const removeProductRow = (index: number) => {
    if (productRows.length === 1) {
      setProductRows([{ name: '', qty: 1, price: 0 }]);
      return;
    }
    const updated = productRows.filter((_, i) => i !== index);
    setProductRows(updated);
    const total = updated.reduce((sum, item) => sum + (item.qty * (item.price || 0)), 0);
    setEntryAmount(total > 0 ? total.toString() : '');
  };

  // Crear cliente en el acto
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setNewCustError('');

    if (!newCustName.trim()) {
      setNewCustError('Ingrese el nombre completo del cliente.');
      return;
    }

    try {
      const created = createNewCustomer({
        full_name: newCustName.trim(),
        nickname: newCustNickname.trim() || undefined,
        document_id: newCustDoc.trim() || undefined,
        phone: newCustPhone.trim() || undefined,
        credit_limit: parseFloat(newCustLimit) || 0,
      });

      setSelectedCustomerId(created.id);
      setIsCreatingNewCustomer(false);
      setNewCustName('');
      setNewCustNickname('');
      setNewCustPhone('');
      setNewCustDoc('');
      setNewCustLimit('');
    } catch (err: any) {
      setNewCustError(err?.message || 'Error al crear cliente.');
    }
  };

  // Agregar movimiento al borrador
  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const parsedAmount = parseFloat(entryAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Ingrese un monto válido mayor a 0.');
      return;
    }

    if (!entryDate) {
      setErrorMessage('Seleccione una fecha para el movimiento.');
      return;
    }

    // Filtrar items válidos
    const validItems = productRows
      .filter((i) => i.name.trim() && i.qty > 0 && i.price > 0)
      .map((i) => ({ ...i, name: i.name.trim() }));

    let finalDesc = entryDesc.trim();
    if (!finalDesc && validItems.length > 0) {
      finalDesc = validItems.map((i) => `${i.qty}x ${i.name}`).join(', ');
    } else if (!finalDesc) {
      finalDesc = entryType === 'DEBIT_PURCHASE' ? 'Compra fiada anterior' : `Abono a cuenta (${entryPaymentMethod})`;
    }

    const newEntry: StagedEntry = {
      id: `stage-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: entryType,
      date: entryDate,
      amount: parsedAmount,
      description: finalDesc,
      items: validItems,
      paymentMethod: entryType === 'CREDIT_PAYMENT' ? entryPaymentMethod : undefined,
      paymentReference: entryPaymentRef.trim() || undefined,
    };

    setStagedEntries([...stagedEntries, newEntry]);

    // Limpiar formulario para el siguiente movimiento manteniendo la fecha para comodidad
    setEntryAmount('');
    setEntryDesc('');
    setEntryPaymentRef('');
    setProductRows([{ name: '', qty: 1, price: 0 }]);
    setShowItemizedProducts(false);
  };

  const handleRemoveStaged = (id: string) => {
    setStagedEntries(stagedEntries.filter((s) => s.id !== id));
  };

  // Cálculos de saldo previo y progresivo en el borrador
  const progressionData = useMemo(() => {
    const sorted = [...stagedEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let running = currentCustomer ? currentCustomer.current_balance : 0;
    let totalPurchases = 0;
    let totalPayments = 0;

    const timeline = sorted.map((entry) => {
      const prev = running;
      if (entry.type === 'DEBIT_PURCHASE') {
        running += entry.amount;
        totalPurchases += entry.amount;
      } else {
        running -= entry.amount;
        totalPayments += entry.amount;
      }
      return {
        ...entry,
        prevBalance: prev,
        newBalance: running,
      };
    });

    return {
      timeline,
      totalPurchases,
      totalPayments,
      finalProjectedBalance: running,
      initialBalance: currentCustomer ? currentCustomer.current_balance : 0,
    };
  }, [stagedEntries, currentCustomer]);

  // Guardar y Asentar definitivamente en el Libro Mayor
  const handleCommitBatch = () => {
    if (!selectedCustomerId) {
      setErrorMessage('Debe elegir o registrar un cliente primero.');
      return;
    }

    if (stagedEntries.length === 0) {
      setErrorMessage('Agregue al menos una compra o abono a la lista.');
      return;
    }

    const entriesToSave: HistoricalBatchEntry[] = stagedEntries.map((s) => ({
      type: s.type,
      date: s.date,
      amount: s.amount,
      description: s.description,
      items: s.items,
      paymentMethod: s.paymentMethod,
      paymentReference: s.paymentReference,
    }));

    const result = processHistoricalBatchTransactions(selectedCustomerId, entriesToSave);

    if (!result.success || !result.transactions) {
      setErrorMessage(result.error || 'Error al procesar la carga histórica.');
      return;
    }

    const updatedCustomer: Customer = {
      ...currentCustomer!,
      current_balance: result.finalBalance || 0,
    };

    setSuccessData({
      customer: updatedCustomer,
      txCount: result.transactions.length,
      finalBalance: result.finalBalance || 0,
    });

    onSuccess(updatedCustomer);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 max-h-[94vh] flex flex-col overflow-hidden">
        {/* ENCABEZADO */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-amber-400 flex items-center justify-center backdrop-blur-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                  Cuaderno de Papel & Deudas Anteriores
                </span>
                <span className="text-[10px] text-slate-300 font-mono">Inmutabilidad garantizada</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-0.5">
                Carga Histórica de Compras y Pagos
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

        {/* CONTENIDO PRINCIPAL SCROLLABLE */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-2xl border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* PANTALLA DE ÉXITO FINAL */}
          {successData ? (
            <div className="text-center py-8 space-y-4 max-w-md mx-auto animate-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">
                  ¡Carga Histórica Asentada con Éxito!
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Se registraron correctamente <b>{successData.txCount} movimientos</b> en el Libro Mayor de{' '}
                  <b>{successData.customer.full_name}</b> respetando la cronología de fechas.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Cliente:</span>
                  <span className="font-bold text-slate-800">{successData.customer.full_name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Movimientos asentados:</span>
                  <span className="font-bold text-blue-600">{successData.txCount} operaciones</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-black text-slate-700">Saldo Actual en Libreta:</span>
                  <span className="text-lg font-black text-slate-900">
                    {formatCurrency(successData.finalBalance)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessData(null);
                    setStagedEntries([]);
                    setSelectedCustomerId('');
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Cargar Otro Cliente
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-500/25 transition"
                >
                  Finalizar y Volver al Panel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* PASO 1: SELECCIONAR O REGISTRAR CLIENTE */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center">
                      1
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Elegir o Dar de Alta al Cliente
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Selecciona el cliente del cuaderno o crea una cuenta nueva en el acto
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewCustomer(!isCreatingNewCustomer);
                      setNewCustError('');
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-sm transition"
                  >
                    {isCreatingNewCustomer ? (
                      <>
                        <User className="w-3.5 h-3.5" /> Elegir de la Lista Existente
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" /> + Registrar Nuevo Cliente
                      </>
                    )}
                  </button>
                </div>

                {/* FORMULARIO DE ALTA RÁPIDA DE CLIENTE */}
                {isCreatingNewCustomer ? (
                  <form onSubmit={handleCreateCustomer} className="p-4 bg-white rounded-2xl border border-blue-200 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-blue-600">
                        Nuevo Cliente para la Libreta
                      </span>
                    </div>

                    {newCustError && (
                      <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg font-semibold">
                        {newCustError}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Ramón Gómez"
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-600 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Apodo / Alias (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Don Ramón"
                          value={newCustNickname}
                          onChange={(e) => setNewCustNickname(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-600 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Teléfono / WhatsApp
                        </label>
                        <input
                          type="tel"
                          placeholder="Ej: 595981..."
                          value={newCustPhone}
                          onChange={(e) => setNewCustPhone(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-600 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Cédula / DNI (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: 4.582.110"
                          value={newCustDoc}
                          onChange={(e) => setNewCustDoc(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-600 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCreatingNewCustomer(false)}
                        className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                      >
                        Crear Cliente y Comenzar a Cargar
                      </button>
                    </div>
                  </form>
                ) : (
                  /* SELECTOR DE CLIENTE EXISTENTE */
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Filtrar clientes por nombre o teléfono..."
                          value={custSearch}
                          onChange={(e) => setCustSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none min-w-[200px]"
                      >
                        <option value="">-- Seleccionar Cliente --</option>
                        {filteredCustomers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.full_name} {c.nickname ? `(${c.nickname})` : ''} - Saldo: {formatCurrency(c.current_balance)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {currentCustomer && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-extrabold text-slate-900 block text-sm">
                            {currentCustomer.full_name}
                          </span>
                          <span className="text-slate-400">
                            {currentCustomer.nickname ? `"${currentCustomer.nickname}" • ` : ''}
                            {currentCustomer.phone || 'Sin teléfono'} • Cód: {currentCustomer.id.slice(-6)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Saldo Actual en Libreta
                          </span>
                          <span className="text-sm font-black text-slate-900">
                            {formatCurrency(currentCustomer.current_balance)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PASO 2: AGREGAR MOVIMIENTOS HISTÓRICOS */}
              {selectedCustomerId && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
                      2
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Cargar Movimientos Anteriores (Fecha, Monto y Productos)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Ve ingresando cada compra o pago anotado en la libreta física
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={handleAddEntry}
                    className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4"
                  >
                    {/* FILA 1: FECHA Y TIPO DE MOVIMIENTO */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Fecha del Movimiento *
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            required
                            max={todayDefault}
                            value={entryDate}
                            onChange={(e) => setEntryDate(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Tipo de Operación *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setEntryType('DEBIT_PURCHASE')}
                            className={`p-2.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                              entryType === 'DEBIT_PURCHASE'
                                ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <ShoppingBag className="w-4 h-4" /> Compra Fiada (+ Deuda)
                          </button>
                          <button
                            type="button"
                            onClick={() => setEntryType('CREDIT_PAYMENT')}
                            className={`p-2.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                              entryType === 'CREDIT_PAYMENT'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <ArrowDownLeft className="w-4 h-4" /> Pago / Abono (- Deuda)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SELECCIÓN DE MEDIO DE PAGO EN CASO DE ABONO */}
                    {entryType === 'CREDIT_PAYMENT' && (
                      <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2 animate-in fade-in">
                        <label className="text-[10px] font-bold uppercase text-slate-400 block">
                          Medio de Pago Utilizado en esa fecha
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {(
                            [
                              { id: 'EFECTIVO', label: 'Efectivo', icon: Banknote },
                              { id: 'TRANSFERENCIA', label: 'Transf.', icon: Building },
                              { id: 'PIX', label: 'Pix', icon: Smartphone },
                              { id: 'QR_BANCARIO', label: 'QR', icon: QrCode },
                              { id: 'TARJETA_DEBITO', label: 'Débito', icon: CreditCard },
                              { id: 'TARJETA_CREDITO', label: 'Crédito', icon: CreditCard },
                            ] as const
                          ).map((m) => {
                            const Icon = m.icon;
                            const isSel = entryPaymentMethod === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setEntryPaymentMethod(m.id)}
                                className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                                  isSel
                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-black'
                                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                <span className="text-[10px]">{m.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* PRODUCTOS Y DETALLE */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase text-slate-400 block">
                          {entryType === 'DEBIT_PURCHASE'
                            ? 'Detalle de Productos / Mercaderías'
                            : 'Concepto o Referencia del Pago'}
                        </label>

                        {entryType === 'DEBIT_PURCHASE' && (
                          <button
                            type="button"
                            onClick={() => setShowItemizedProducts(!showItemizedProducts)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            {showItemizedProducts
                              ? 'Cargar como Concepto Rápido'
                              : 'Desglosar Productos (Cantidad, Precio)'}
                          </button>
                        )}
                      </div>

                      {/* MODO DESGLOSE DE PRODUCTOS FILA A FILA */}
                      {showItemizedProducts && entryType === 'DEBIT_PURCHASE' ? (
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 animate-in fade-in">
                          <div className="text-[10px] font-bold uppercase text-slate-400 grid grid-cols-12 gap-2 px-1">
                            <span className="col-span-6">Producto</span>
                            <span className="col-span-2 text-center">Cant.</span>
                            <span className="col-span-3 text-right">Precio Unit.</span>
                            <span className="col-span-1"></span>
                          </div>

                          {productRows.map((row, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                              <input
                                type="text"
                                placeholder="Ej: Arroz 1kg / Leche"
                                value={row.name}
                                onChange={(e) =>
                                  handleProductRowChange(idx, 'name', e.target.value)
                                }
                                className="col-span-6 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-600 focus:bg-white focus:outline-none"
                              />
                              <input
                                type="number"
                                min={1}
                                value={row.qty}
                                onChange={(e) =>
                                  handleProductRowChange(idx, 'qty', parseInt(e.target.value) || 1)
                                }
                                className="col-span-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:border-blue-600 focus:bg-white focus:outline-none"
                              />
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={row.price || ''}
                                onChange={(e) =>
                                  handleProductRowChange(idx, 'price', parseFloat(e.target.value) || 0)
                                }
                                className="col-span-3 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-right focus:border-blue-600 focus:bg-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => removeProductRow(idx)}
                                className="col-span-1 p-2 text-slate-400 hover:text-rose-600 rounded-lg flex items-center justify-center"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                          <div className="flex justify-between items-center pt-2">
                            <button
                              type="button"
                              onClick={addProductRow}
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Agregar Otro Producto
                            </button>
                            <span className="text-xs font-bold text-slate-600">
                              Subtotal productos: {formatCurrency(parseFloat(entryAmount) || 0)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* MODO TEXTO RESUMIDO */
                        <input
                          type="text"
                          placeholder={
                            entryType === 'DEBIT_PURCHASE'
                              ? 'Ej: 2 Arroz, 1 Aceite, 1kg Azúcar'
                              : 'Ej: Entrega de dinero en efectivo'
                          }
                          value={entryDesc}
                          onChange={(e) => setEntryDesc(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-blue-600 focus:outline-none"
                        />
                      )}
                    </div>

                    {/* MONTO DEL MOVIMIENTO */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Monto Total en {tenant.currency_symbol} *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                            {tenant.currency_symbol}
                          </span>
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="0"
                            value={entryAmount}
                            onChange={(e) => setEntryAmount(e.target.value)}
                            className="w-full pl-8 pr-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-base font-black text-slate-900 focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 ${
                          entryType === 'DEBIT_PURCHASE'
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        {entryType === 'DEBIT_PURCHASE'
                          ? 'Agregar Compra a la Lista'
                          : 'Agregar Abono a la Lista'}
                      </button>
                    </div>
                  </form>

                  {/* PASO 3: TABLA DE PREVISUALIZACIÓN CRONOLÓGICA Y BALANCE */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center">
                          3
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">
                            Línea de Tiempo del Periodo ({stagedEntries.length} cargados)
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Ordenados cronológicamente con evolución de saldos antes de asentar
                          </p>
                        </div>
                      </div>

                      {stagedEntries.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setStagedEntries([])}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Vaciar Lista
                        </button>
                      )}
                    </div>

                    {progressionData.timeline.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-500">
                          Aún no has agregado movimientos a este lote.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Usa el formulario superior para ir pasando cada compra o pago de tu cuaderno.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-sm max-h-64 overflow-y-auto">
                          {progressionData.timeline.map((item, index) => {
                            const isPurchase = item.type === 'DEBIT_PURCHASE';

                            return (
                              <div
                                key={item.id}
                                className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                      isPurchase
                                        ? 'bg-rose-50 text-rose-600'
                                        : 'bg-emerald-50 text-emerald-600'
                                    }`}
                                  >
                                    {isPurchase ? (
                                      <ShoppingBag className="w-4 h-4" />
                                    ) : (
                                      <ArrowDownLeft className="w-4 h-4" />
                                    )}
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800">
                                        {item.date}
                                      </span>
                                      <span
                                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                          isPurchase
                                            ? 'bg-rose-100 text-rose-700'
                                            : 'bg-emerald-100 text-emerald-700'
                                        }`}
                                      >
                                        {isPurchase ? 'COMPRA FIADA' : `PAGO (${item.paymentMethod})`}
                                      </span>
                                    </div>
                                    <p className="text-slate-500 mt-0.5 max-w-sm truncate">
                                      {item.description}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 text-right">
                                  <div>
                                    <span
                                      className={`font-black text-sm block ${
                                        isPurchase ? 'text-rose-600' : 'text-emerald-600'
                                      }`}
                                    >
                                      {isPurchase ? '+' : '-'} {formatCurrency(item.amount)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block font-medium">
                                      Saldo: {formatCurrency(item.newBalance)}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStaged(item.id)}
                                    className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg transition"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* TARJETA RESUMEN DE SALDOS */}
                        <div className="bg-slate-900 text-white rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 shadow-md">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">
                              Saldo Anterior
                            </span>
                            <span className="text-sm font-bold text-slate-200">
                              {formatCurrency(progressionData.initialBalance)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-rose-400 block">
                              (+) Compras Cargadas
                            </span>
                            <span className="text-sm font-bold text-rose-300">
                              +{formatCurrency(progressionData.totalPurchases)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-emerald-400 block">
                              (-) Pagos / Abonos
                            </span>
                            <span className="text-sm font-bold text-emerald-300">
                              -{formatCurrency(progressionData.totalPayments)}
                            </span>
                          </div>
                          <div className="bg-white/10 p-2 rounded-xl text-right sm:text-left">
                            <span className="text-[9px] uppercase font-black text-amber-300 block">
                              Saldo Final Resultante
                            </span>
                            <span className="text-base font-black text-white">
                              {formatCurrency(progressionData.finalProjectedBalance)}
                            </span>
                          </div>
                        </div>

                        {/* BOTÓN ASENTAR EN LIBRO MAYOR */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleCommitBatch}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/30 transition text-sm flex items-center justify-center gap-2"
                          >
                            <ShieldCheck className="w-5 h-5" />
                            Asentar Definitivamente {stagedEntries.length} Movimientos en el Libro Mayor
                          </button>
                          <p className="text-center text-[10px] text-slate-400 mt-2">
                            Al asentar, las transacciones quedarán registradas con sus fechas históricas originales
                            y certificadas bajo el protocolo inmutable.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
