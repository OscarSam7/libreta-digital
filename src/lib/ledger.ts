import { Customer, Transaction, TransactionType, PaymentMethod, ValidationStatus, TransactionItem } from '@/types';
import { getStoredData, saveCustomers, saveTransactions } from './storage';
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

  // 3. Cálculo de saldos antes y después
  const previousBalance = customer.current_balance;
  let newBalance = previousBalance;

  if (input.type === 'DEBIT_PURCHASE' || input.type === 'ADJUSTMENT_DEBIT') {
    newBalance = previousBalance + cleanAmount;

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
  } else {
    // CREDIT_PAYMENT o ADJUSTMENT_CREDIT restan deuda
    newBalance = previousBalance - cleanAmount;
  }

  const dynamicPin = Math.floor(1000 + Math.random() * 9000).toString();

  // Los pagos con medios electrónicos, notas de ajuste o cargas históricas se certifican de inmediato
  const isInstantCertified =
    input.type === 'CREDIT_PAYMENT' ||
    input.type.startsWith('ADJUSTMENT') ||
    Boolean(input.status === 'CERTIFIED_BOTH');

  const txDate = input.createdAt || new Date().toISOString();

  const newTx: Transaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

  // 4. Actualizar el saldo maestro del cliente
  const updatedCustomer: Customer = {
    ...customer,
    current_balance: newBalance,
    updated_at: new Date().toISOString(),
  };

  customers[customerIndex] = updatedCustomer;
  
  // Guardar transacciones ordenadas cronológicamente (más recientes primero)
  const updatedTransactions = [newTx, ...transactions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  saveCustomers(customers);
  saveTransactions(updatedTransactions);

  // Sincronizar en tiempo real con la API en la nube central
  if (typeof window !== 'undefined') {
    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTx),
    }).catch(() => {});

    fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCustomer),
    }).catch(() => {});
  }

  return { success: true, transaction: newTx };
}

export function certifyTransactionWithPin(
  transactionId: string,
  enteredPin: string,
  method: string = 'IN_STORE_PIN'
): { success: boolean; message: string } {
  const { transactions, customers } = getStoredData();
  const txIndex = transactions.findIndex((t) => t.id === transactionId);

  if (txIndex === -1) {
    return { success: false, message: 'Operación no encontrada' };
  }

  const tx = transactions[txIndex];
  const customer = customers.find((c) => c.id === tx.customer_id);

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

  const certifiedTx: Transaction = {
    ...tx,
    status: 'CERTIFIED_BOTH',
    validated_at: new Date().toISOString(),
    validation_method: method,
    validation_metadata: {
      ip: '190.128.45.10',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'POS-Terminal',
      certified_channel: method,
    },
  };

  transactions[txIndex] = certifiedTx;
  saveTransactions(transactions);

  if (typeof window !== 'undefined') {
    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(certifiedTx),
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

  // 2. Encadenar los saldos cronológicamente
  // Partimos del saldo base indicado (por defecto el saldo actual del cliente o startingBalance)
  let runningBalance = customer.current_balance + startingBalance;
  const createdTransactions: Transaction[] = [];

  for (let i = 0; i < sortedEntries.length; i++) {
    const entry = sortedEntries[i];
    const prevBalance = runningBalance;
    let nextBalance = prevBalance;

    if (entry.type === 'DEBIT_PURCHASE') {
      nextBalance = prevBalance + entry.amount;
    } else {
      nextBalance = prevBalance - entry.amount;
    }
    runningBalance = nextBalance;

    const dynamicPin = Math.floor(1000 + Math.random() * 9000).toString();
    const entryDate = entry.date.includes('T') ? entry.date : `${entry.date}T12:00:00.000Z`;

    const tx: Transaction = {
      id: `tx-hist-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      tenant_id: tenant.id,
      customer_id: customer.id,
      created_by: 'comerciante-carga-historica',
      operator_id: currentOperator?.id,
      operator_name: currentOperator?.full_name,
      type: entry.type,
      amount: entry.amount,
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

  // 3. Actualizar el saldo maestro del cliente
  const updatedCustomer: Customer = {
    ...customer,
    current_balance: runningBalance,
    updated_at: new Date().toISOString(),
  };

  customers[customerIndex] = updatedCustomer;

  // 4. Agregar al libro mayor y ordenar cronológicamente
  const updatedTransactions = [...createdTransactions, ...transactions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  saveCustomers(customers);
  saveTransactions(updatedTransactions);

  return {
    success: true,
    transactions: createdTransactions,
    finalBalance: runningBalance,
  };
}
