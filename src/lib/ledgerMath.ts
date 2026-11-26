import { Customer, Transaction } from '@/types';

/**
 * Redondea un valor monetario a 2 decimales evitando deriva de punto flotante.
 */
export function roundMoney(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
}

export function isDebitTransaction(type: string): boolean {
  return type === 'DEBIT_PURCHASE' || type === 'ADJUSTMENT_DEBIT';
}

export function isCreditTransaction(type: string): boolean {
  return type === 'CREDIT_PAYMENT' || type === 'ADJUSTMENT_CREDIT';
}

/**
 * Devuelve el delta con signo en el saldo del cliente (+ para compras/débitos, - para pagos/créditos).
 */
export function getTransactionSignedDelta(tx: Pick<Transaction, 'type' | 'amount'>): number {
  const amt = Math.abs(roundMoney(tx.amount));
  if (isDebitTransaction(tx.type)) return amt;
  if (isCreditTransaction(tx.type)) return -amt;
  return 0;
}

/**
 * Comparador cronológico ascendente determinista.
 * Cuando dos asientos tienen exactamente el mismo timestamp `created_at`,
 * usa el encadenamiento de saldos como desempate antes de caer en el ID.
 */
export function compareTransactionsChronologicalAsc(a: Transaction, b: Transaction): number {
  const timeA = new Date(a.created_at || 0).getTime() || 0;
  const timeB = new Date(b.created_at || 0).getTime() || 0;
  if (timeA !== timeB) return timeA - timeB;

  const aNewMatchesBPrev = roundMoney(a.new_balance) === roundMoney(b.previous_balance);
  const bNewMatchesAPrev = roundMoney(b.new_balance) === roundMoney(a.previous_balance);
  if (aNewMatchesBPrev && !bNewMatchesAPrev) return -1;
  if (bNewMatchesAPrev && !aNewMatchesBPrev) return 1;

  return String(a.id || '').localeCompare(String(b.id || ''));
}

export interface ReconciledCustomerResult {
  transactionsAsc: Transaction[];
  transactionsDesc: Transaction[];
  currentBalance: number;
  openingBalance: number;
  changed: boolean;
}

/**
 * Reconcilia cronológicamente las transacciones de un cliente a partir de los montos y tipos inmutables.
 * Preserva el saldo inicial previo al asiento más antiguo (`openingBalance`) y encadena cada asiento:
 * `previous_balance -> previous_balance +/- amount = new_balance`.
 */
export function reconcileCustomerTransactions(
  customerTxs: Transaction[],
  fallbackBalance = 0
): ReconciledCustomerResult {
  if (!Array.isArray(customerTxs) || customerTxs.length === 0) {
    const cleanFallback = roundMoney(fallbackBalance);
    return {
      transactionsAsc: [],
      transactionsDesc: [],
      currentBalance: cleanFallback,
      openingBalance: cleanFallback,
      changed: false,
    };
  }

  const sortedAsc = [...customerTxs].sort(compareTransactionsChronologicalAsc);
  const openingBalance = roundMoney(sortedAsc[0].previous_balance);

  let running = openingBalance;
  let changed = false;

  const transactionsAsc: Transaction[] = sortedAsc.map((tx) => {
    const prev = running;
    const next = roundMoney(prev + getTransactionSignedDelta(tx));
    running = next;

    const existingPrev = roundMoney(tx.previous_balance);
    const existingNext = roundMoney(tx.new_balance);
    if (existingPrev !== prev || existingNext !== next) {
      changed = true;
      return {
        ...tx,
        previous_balance: prev,
        new_balance: next,
      };
    }
    return tx;
  });

  const transactionsDesc = [...transactionsAsc].reverse();

  return {
    transactionsAsc,
    transactionsDesc,
    currentBalance: running,
    openingBalance,
    changed,
  };
}

export interface ReconcileTransactionsResult {
  transactions: Transaction[];
  balancesByCustomerKey: Map<string, number>;
  changed: boolean;
}

/**
 * Reconcilia todas las transacciones agrupadas por cliente, devolviendo la lista global ordenada descendente
 * (más recientes primero) y un mapa con el saldo exacto final de cada cliente.
 */
export function reconcileTransactionsByCustomer(
  transactions: Transaction[],
  normalizeCustomerId: (id: string) => string
): ReconcileTransactionsResult {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      transactions: [],
      balancesByCustomerKey: new Map<string, number>(),
      changed: false,
    };
  }

  const grouped = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (!tx || !tx.customer_id) continue;
    const key = normalizeCustomerId(tx.customer_id);
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(tx);
    } else {
      grouped.set(key, [tx]);
    }
  }

  const allReconciledAsc: Transaction[] = [];
  const balancesByCustomerKey = new Map<string, number>();
  let changed = false;

  for (const [custKey, custTxs] of grouped.entries()) {
    const res = reconcileCustomerTransactions(custTxs);
    if (res.changed) changed = true;
    balancesByCustomerKey.set(custKey, res.currentBalance);
    allReconciledAsc.push(...res.transactionsAsc);
  }

  // Orden global descendente (más reciente primero); en empates exactos, invertir orden ascendente
  allReconciledAsc.sort((a, b) => compareTransactionsChronologicalAsc(b, a));

  return {
    transactions: allReconciledAsc,
    balancesByCustomerKey,
    changed,
  };
}

export interface ReconcileLedgerStateResult {
  customers: Customer[];
  transactions: Transaction[];
  changed: boolean;
  healedCustomerIds: string[];
}

/**
 * Reconcilia todo el estado (clientes + libro mayor) haciendo de las transacciones inmutables
 * la única fuente matemática de verdad para el `current_balance` de cada cliente con historial.
 * Clientes sin transacciones conservan su `current_balance` almacenado.
 */
export function reconcileLedgerState(
  customers: Customer[],
  transactions: Transaction[],
  normalizeCustomerId: (id: string) => string
): ReconcileLedgerStateResult {
  const txResult = reconcileTransactionsByCustomer(transactions, normalizeCustomerId);
  let changed = txResult.changed;
  const healedCustomerIds: string[] = [];

  const reconciledCustomers = (Array.isArray(customers) ? customers : []).map((customer) => {
    const key = normalizeCustomerId(customer.id);
    if (!txResult.balancesByCustomerKey.has(key)) {
      return customer;
    }

    const expectedBalance = txResult.balancesByCustomerKey.get(key)!;
    const storedBalance = roundMoney(customer.current_balance);
    if (storedBalance !== expectedBalance) {
      changed = true;
      healedCustomerIds.push(customer.id);
      return {
        ...customer,
        current_balance: expectedBalance,
      };
    }

    return customer;
  });

  return {
    customers: reconciledCustomers,
    transactions: txResult.transactions,
    changed,
    healedCustomerIds,
  };
}
