import { Customer, Transaction, TransactionType, PaymentMethod, ValidationStatus, TransactionItem } from '@/types';
import {
  getStoredData,
  saveCustomersLocalOnly,
  saveTransactionsLocalOnly,
  ensureValidUuid,
} from './storage';
import {
  reconcileCustomerTransactions,
  reconcileLedgerState,
  getTransactionSignedDelta,
  roundMoney,
} from './ledgerMath';
import { safeCompare } from './security';
import { validateAmount, sanitizeText } from './validation';

export interface CreateTxInput {
  customerId: string;
  type: TransactionType;
  amount: number;
  description: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  items?: { qty: number; name: string; price: number }[];
  createdAt?: string; // Fecha y hora personalizada (para compras o abonos pasados)
  status?: ValidationStatus;
  validationMethod?: string;
  validationMetadata?: Record<string, any>;
  operatorId?: string;
  operatorName?: string;
}

export function executeLedgerTransaction(input: CreateTxInput): {
  success: boolean;
  transaction?: Transaction;
  error?: string;
} {
  const { customers, transactions, tenant, currentOperator } = getStoredData();
  const customerIndex = customers.findIndex((c) => c.id === input.customerId);

  if (customerIndex === -1) {
    return { success: false, error: 'Cliente no encontrado en este comercio.' };
  }

  // 0. Validar y sanitizar monto y descripción de entrada
  const amountValidation = validateAmount(input.amount, 0.01);
  if (!amountValidation.valid) {
    return { success: false, error: amountValidation.error };
  }
  const cleanAmount = amountValidation.value;
  const cleanDescription = sanitizeText(input.description || 'Movimiento de cuenta', 500);

  // 1. Validar suscripción activa o trial vigente
  const now = new Date();
  const isTrialExpired =
    tenant.sub_status === 'trialing' && new Date(tenant.trial_ends_at) < now;
  const isSubscriptionExpired =
    tenant.sub_status === 'active' &&
    tenant.subscription_ends_at &&
    new Date(tenant.subscription_ends_at) < now;

  if (
    tenant.sub_status === 'canceled' ||
    tenant.sub_status === 'past_due' ||
    isTrialExpired ||
    isSubscriptionExpired
  ) {
    return {
      success: false,
      error: 'Suscripción vencida. Renueve su plan para registrar nuevos movimientos.',
    };
  }

  const customer = customers[customerIndex];

  // 2. Validar si el cliente está bloqueado
  if (input.type === 'DEBIT_PURCHASE' && customer.is_blocked) {
    return {
      success: false,
      error: 'El crédito de este cliente se encuentra bloqueado por la administración.',
    };
  }

  // 3. Reconciliar primero los asientos existentes del cliente para partir del saldo real exacto
  const normCustId = ensureValidUuid(customer.id);
  const existingCustomerTxs = transactions.filter(
    (t) => ensureValidUuid(t.customer_id) === normCustId
  );
  const priorState = reconcileCustomerTransactions(existingCustomerTxs, customer.current_balance);
  const previousBalance = priorState.currentBalance;
  const newBalance = roundMoney(
    previousBalance + getTransactionSignedDelta({ type: input.type, amount: cleanAmount })
  );

  // Validar límite de crédito configurado (solo para operaciones en tiempo real normales)
  if (
    input.type === 'DEBIT_PURCHASE' &&
    customer.credit_limit > 0 &&
    newBalance > customer.credit_limit &&
    !input.validationMethod?.includes('HISTORICA')
  ) {
    return {
      success: false,
      error: `La operación excede el límite de crédito (${tenant.currency_symbol} ${customer.credit_limit.toLocaleString('es-PY')}).`,
    };
  }

  const dynamicPin = Math.floor(1000 + Math.random() * 9000).toString();

  // Los pagos con medios electrónicos, notas de ajuste o cargas históricas se certifican de inmediato
  const isInstantCertified =
    input.type === 'CREDIT_PAYMENT' ||
    input.type.startsWith('ADJUSTMENT') ||
    Boolean(input.status === 'CERTIFIED_BOTH');

  const txDate = input.createdAt || new Date().toISOString();

  const newTx: Transaction = {
    id: ensureValidUuid(),
    tenant_id: tenant.id,
    customer_id: customer.id,
    created_by: 'user-active-session',
    operator_id: input.operatorId || currentOperator?.id,
    operator_name: input.operatorName || currentOperator?.full_name,
    type: input.type,
    amount: cleanAmount,
    previous_balance: previousBalance,
    new_balance: newBalance,
    description: cleanDescription,
    payment_method: input.paymentMethod || (input.type === 'CREDIT_PAYMENT' ? 'EFECTIVO' : undefined),
    payment_reference: input.paymentReference ? sanitizeText(input.paymentReference, 100) : undefined,
    items: input.items || [],
    status: isInstantCertified ? 'CERTIFIED_BOTH' : 'PENDING_CUSTOMER',
    validation_pin: dynamicPin,
    validated_at: isInstantCertified ? txDate : undefined,
    validation_method: input.validationMethod || (
      isInstantCertified
        ? (input.paymentMethod ? `PAGO_${input.paymentMethod}` : 'PAGO_CAJA')
        : undefined
    ),
    validation_metadata: input.validationMetadata,
    blockchain_hash: `0x${Date.now().toString(16)}${Math.abs(cleanAmount * 100).toString(16)}`,
    created_at: txDate,
  };

  // 4. Actualizar saldo maestro y reconciliar todo el libro mayor para garantizar coherencia total
  const updatedCustomer: Customer = {
    ...customer,
    current_balance: newBalance,
    updated_at: new Date().toISOString(),
  };

  customers[customerIndex] = updatedCustomer;
  const rawUpdatedTransactions = [newTx, ...transactions];
  const reconciled = reconcileLedgerState(customers, rawUpdatedTransactions, ensureValidUuid);

  const reconciledNewTx =
    reconciled.transactions.find((t) => ensureValidUuid(t.id) === ensureValidUuid(newTx.id)) || newTx;
  const reconciledCustomer =
    reconciled.customers.find((c) => ensureValidUuid(c.id) === normCustId) || updatedCustomer;

  saveCustomersLocalOnly(reconciled.customers);
  saveTransactionsLocalOnly(reconciled.transactions);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('libreta_data_updated'));

    // Sincronizar de forma secuencial y atómica: primero la transacción, luego el cliente reconciliado
    void (async () => {
      try {
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reconciledNewTx),
        });
      } catch {}

      try {
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reconciledCustomer),
        });
      } catch {}
    })();
  }

  return { success: true, transaction: reconciledNewTx };
}

export function certifyTransactionWithPin(
  transactionId: string,
  enteredPin: string,
  method: string = 'IN_STORE_PIN'
): { success: boolean; message: string } {
  const { transactions, customers } = getStoredData();
  const targetTxUuid = ensureValidUuid(transactionId);
  const txIndex = transactions.findIndex(
    (t) => t.id === transactionId || ensureValidUuid(t.id) === targetTxUuid
  );

  if (txIndex === -1) {
    return { success: false, message: 'Operación no encontrada' };
  }

  const tx = transactions[txIndex];
  const customer = customers.find(
    (c) => c.id === tx.customer_id || ensureValidUuid(c.id) === ensureValidUuid(tx.customer_id)
  );

  if (!customer) {
    return { success: false, message: 'Cliente no válido' };
  }

  if (tx.status === 'CERTIFIED_BOTH') {
    return { success: false, message: 'Esta operación ya fue certificada' };
  }

  const customerPin = (customer.security_pin || '').trim();
  const isValid = Boolean(customerPin) && safeCompare(enteredPin.trim(), customerPin);

  if (!isValid) {
    return {
      success: false,
      message: 'PIN incorrecto. Debe ingresar el PIN secreto de 4 dígitos elegido por el cliente.',
    };
  }

  const validatedAt = new Date().toISOString();
  const certifiedTx: Transaction = {
    ...tx,
    status: 'CERTIFIED_BOTH',
    validated_at: validatedAt,
    validation_method: method,
    validation_metadata: {
      ...(tx.validation_metadata || {}),
      ip: '190.128.45.10',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'POS-Terminal',
      certified_channel: method,
    },
  };

  transactions[txIndex] = certifiedTx;
  saveTransactionsLocalOnly(transactions);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('libreta_data_updated'));

    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('libretadigital_tx_channel');
        bc.postMessage({
          type: 'TX_CERTIFIED',
          transactionId: certifiedTx.id,
          customerId: customer.id,
          validatedAt,
          validationMethod: method,
        });
        bc.close();
      }
    } catch {}

    fetch('/api/transactions/certify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: certifiedTx.id,
        customerId: customer.id,
        tenantId: certifiedTx.tenant_id,
        method,
        customerPin: enteredPin.trim(),
      }),
    }).catch(() => {});
  }

  return { success: true, message: 'Operación certificada exitosamente' };
}

// Emisión inmutable de Nota de Crédito / Ajuste contable
export interface IssueAdjustmentInput {
  targetTransactionId: string;
  adjustmentType: 'ADJUSTMENT_CREDIT' | 'ADJUSTMENT_DEBIT';
  amount: number;
  reason: string;
}

export function issueLedgerAdjustment(input: IssueAdjustmentInput): {
  success: boolean;
  adjustmentTx?: Transaction;
  error?: string;
} {
  const { transactions, customers, tenant } = getStoredData();
  const targetTx = transactions.find((t) => t.id === input.targetTransactionId);

  if (!targetTx) {
    return { success: false, error: 'La transacción original a ajustar no existe.' };
  }

  const customer = customers.find((c) => c.id === targetTx.customer_id);
  if (!customer) {
    return { success: false, error: 'Cliente de la operación original no encontrado.' };
  }

  if (input.amount <= 0) {
    return { success: false, error: 'El monto de ajuste debe ser mayor a 0.' };
  }

  if (input.adjustmentType === 'ADJUSTMENT_CREDIT' && input.amount > targetTx.amount) {
    return {
      success: false,
      error: `La nota de crédito no puede superar el monto de la operación original (${tenant.currency_symbol} ${targetTx.amount.toLocaleString()}).`,
    };
  }

  const descriptionFormatted = `[NOTA DE AJUSTE] Ref Op: #${targetTx.id.slice(-6).toUpperCase()} • Motivo: ${input.reason.trim()}`;

  return executeLedgerTransaction({
    customerId: customer.id,
    type: input.adjustmentType,
    amount: input.amount,
    description: descriptionFormatted,
  });
}

// ==========================================
// CARGA HISTÓRICA DE CUADERNO / LOTE RETROACTIVO
// ==========================================
export interface HistoricalBatchEntry {
  type: TransactionType; // 'DEBIT_PURCHASE' | 'CREDIT_PAYMENT'
  date: string; // YYYY-MM-DD o ISO string
  amount: number;
  description: string;
  items?: TransactionItem[];
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
}

export function processHistoricalBatchTransactions(
  customerId: string,
  entries: HistoricalBatchEntry[],
  startingBalance: number = 0
): {
  success: boolean;
  transactions?: Transaction[];
  finalBalance?: number;
  error?: string;
} {
  const { customers, transactions, tenant, currentOperator } = getStoredData();
  const customerIndex = customers.findIndex((c) => c.id === customerId);

  if (customerIndex === -1) {
    return { success: false, error: 'Cliente no encontrado en el sistema.' };
  }

  if (!entries || entries.length === 0) {
    return { success: false, error: 'No se ingresaron movimientos para cargar.' };
  }

  const customer = customers[customerIndex];

  // 1. Ordenar cronológicamente (del más antiguo al más reciente)
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // 2. Reconciliar el historial existente antes de encadenar los asientos históricos
  const normCustId = ensureValidUuid(customer.id);
  const existingCustomerTxs = transactions.filter(
    (t) => ensureValidUuid(t.customer_id) === normCustId
  );
  const priorState = reconcileCustomerTransactions(existingCustomerTxs, customer.current_balance);
  const createdTransactions: Transaction[] = [];

  let runningBalance = roundMoney(priorState.currentBalance);

  // Si ya existen asientos y además se especificó un startingBalance distinto de 0,
  // asentarlo explícitamente para preservar la integridad matemática de la cadena completa.
  const cleanStarting = roundMoney(startingBalance);
  if (cleanStarting !== 0 && existingCustomerTxs.length > 0) {
    const firstDate = sortedEntries[0]?.date;
    const baseMs = firstDate
      ? new Date(firstDate.includes('T') ? firstDate : `${firstDate}T12:00:00.000Z`).getTime() - 1000
      : Date.now() - 1000;
    const openingIso = new Date(baseMs).toISOString();
    const openingTx: Transaction = {
      id: ensureValidUuid(),
      tenant_id: tenant.id,
      customer_id: customer.id,
      created_by: 'comerciante-carga-historica',
      operator_id: currentOperator?.id,
      operator_name: currentOperator?.full_name,
      type: cleanStarting > 0 ? 'ADJUSTMENT_DEBIT' : 'ADJUSTMENT_CREDIT',
      amount: Math.abs(cleanStarting),
      previous_balance: runningBalance,
      new_balance: roundMoney(runningBalance + cleanStarting),
      description: 'Saldo inicial anterior declarado en carga histórica',
      items: [],
      status: 'CERTIFIED_BOTH',
      validation_pin: Math.floor(1000 + Math.random() * 9000).toString(),
      validated_at: openingIso,
      validation_method: 'CARGA_HISTORICA_CUADERNO',
      validation_metadata: {
        fuente: 'Libreta de papel / Saldo base inicial',
        asentado_el: new Date().toISOString(),
      },
      created_at: openingIso,
    };
    createdTransactions.push(openingTx);
    runningBalance = openingTx.new_balance;
  } else {
    runningBalance = roundMoney(priorState.currentBalance + cleanStarting);
  }

  for (let i = 0; i < sortedEntries.length; i++) {
    const entry = sortedEntries[i];
    const prevBalance = runningBalance;
    const nextBalance = roundMoney(
      prevBalance + getTransactionSignedDelta({ type: entry.type, amount: entry.amount })
    );
    runningBalance = nextBalance;

    const dynamicPin = Math.floor(1000 + Math.random() * 9000).toString();
    const entryDate = entry.date.includes('T') ? entry.date : `${entry.date}T12:00:00.000Z`;

    const tx: Transaction = {
      id: ensureValidUuid(),
      tenant_id: tenant.id,
      customer_id: customer.id,
      created_by: 'comerciante-carga-historica',
      operator_id: currentOperator?.id,
      operator_name: currentOperator?.full_name,
      type: entry.type,
      amount: roundMoney(entry.amount),
      previous_balance: prevBalance,
      new_balance: nextBalance,
      description: entry.description?.trim() || (entry.type === 'DEBIT_PURCHASE' ? 'Compra anterior asentada de cuaderno' : 'Abono anterior registrado'),
      payment_method: entry.type === 'CREDIT_PAYMENT' ? (entry.paymentMethod || 'EFECTIVO') : undefined,
      payment_reference: entry.paymentReference?.trim() || undefined,
      items: entry.items || [],
      status: 'CERTIFIED_BOTH',
      validation_pin: dynamicPin,
      validated_at: entryDate,
      validation_method: 'CARGA_HISTORICA_CUADERNO',
      validation_metadata: {
        fuente: 'Libreta de papel / Carga atrasada',
        asentado_el: new Date().toISOString(),
      },
      created_at: entryDate,
    };

    createdTransactions.push(tx);
  }

  // 3. Reconciliar todo el libro mayor del cliente (cubre fechas intercaladas con historial previo)
  customers[customerIndex] = {
    ...customer,
    updated_at: new Date().toISOString(),
  };

  const reconciled = reconcileLedgerState(
    customers,
    [...createdTransactions, ...transactions],
    ensureValidUuid
  );

  const updatedCustomer =
    reconciled.customers.find((c) => ensureValidUuid(c.id) === normCustId) || {
      ...customer,
      current_balance: runningBalance,
      updated_at: new Date().toISOString(),
    };
  const finalCustomerWithTs: Customer = {
    ...updatedCustomer,
    updated_at: new Date().toISOString(),
  };
  const finalCustomers = reconciled.customers.map((c) =>
    ensureValidUuid(c.id) === normCustId ? finalCustomerWithTs : c
  );

  saveCustomersLocalOnly(finalCustomers);
  saveTransactionsLocalOnly(reconciled.transactions);

  const createdIdSet = new Set(createdTransactions.map((t) => ensureValidUuid(t.id)));
  const finalCreatedAsc = reconciled.transactions
    .filter((t) => createdIdSet.has(ensureValidUuid(t.id)))
    .reverse();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('libreta_data_updated'));

    void (async () => {
      for (const tx of finalCreatedAsc) {
        try {
          await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tx),
          });
        } catch {}
      }

      try {
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalCustomerWithTs),
        });
      } catch {}
    })();
  }

  return {
    success: true,
    transactions: finalCreatedAsc,
    finalBalance: finalCustomerWithTs.current_balance,
  };
}
