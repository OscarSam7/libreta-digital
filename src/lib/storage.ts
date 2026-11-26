import { Tenant, Customer, Transaction, StaffMember, PrinterFormat } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { setSecureCookie, removeSecureCookie } from './cookies';
import { isSafeImageUrl } from './imageUtils';
import {
  reconcileLedgerState,
  reconcileCustomerTransactions,
  reconcileTransactionsByCustomer,
  roundMoney,
} from './ledgerMath';

export { reconcileLedgerState, reconcileCustomerTransactions, reconcileTransactionsByCustomer, roundMoney };

export const PRINTER_STORAGE_KEY = 'libreta_printer_format_v2';

export function getStoredPrinterFormat(): PrinterFormat {
  if (typeof window === 'undefined') return 'TICKET_80MM';
  const val = localStorage.getItem(PRINTER_STORAGE_KEY);
  if (val === 'TICKET_58MM' || val === 'TICKET_80MM' || val === 'PAGE_A4') return val;
  return 'TICKET_80MM';
}

export function setStoredPrinterFormat(format: PrinterFormat): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PRINTER_STORAGE_KEY, format);
    window.dispatchEvent(new Event('libreta_printer_changed'));
  }
}

const STORAGE_KEYS = {
  TENANT: 'libretadigital_tenant_v2',
  CUSTOMERS: 'libretadigital_customers_v2',
  TRANSACTIONS: 'libretadigital_transactions_v2',
  STAFF: 'libretadigital_staff_v2',
  CURRENT_OPERATOR: 'libretadigital_current_operator_v2',
  IS_LOGGED_IN: 'libretadigital_is_logged_in_v2',
};

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Normaliza un identificador a UUID v4 válido de forma puramente determinista.
 * Mantiene sin cambios los UUIDs válidos y convierte IDs heredados (ej. "tx-...", "cust-...")
 * siempre al mismo UUID estable tanto en navegador como en Node.js.
 */
export function ensureValidUuid(rawId?: string | null): string {
  const trimmed = typeof rawId === 'string' ? rawId.trim() : '';
  if (trimmed && UUID_REGEX.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (trimmed) {
    const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
    const hexParts = seeds.map((seed, lane) => {
      let hash = (seed ^ trimmed.length) >>> 0;
      for (let i = 0; i < trimmed.length; i++) {
        hash ^= trimmed.charCodeAt(i) + ((lane + 1) * 31);
        hash = Math.imul(hash, 0x01000193) >>> 0;
      }
      // Ronda extra de mezcla para diferenciar entradas cortas similares
      hash ^= hash >>> 16;
      hash = Math.imul(hash, 0x45d9f3b) >>> 0;
      hash ^= hash >>> 16;
      return (hash >>> 0).toString(16).padStart(8, '0');
    });

    const hex = hexParts.join('');
    const variantNibble = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variantNibble}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  }

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().toLowerCase();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ==========================================
// MOTOR DE NORMALIZACIÓN Y DEDUPLICACIÓN
// ==========================================

export function normalizeDocumentId(doc?: string | null): string {
  if (!doc) return '';
  return String(doc).replace(/\D/g, '').trim();
}

export function normalizePhone(phone?: string | null): string {
  if (!phone) return '';
  const str = String(phone);
  if (/sin\s*celular|excepci[oó]n/i.test(str)) return '';
  let digits = str.replace(/\D/g, '');
  if (digits.startsWith('595')) {
    digits = digits.slice(3);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

export function normalizeName(name?: string | null): string {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function areCustomersSamePerson(c1: Partial<Customer>, c2: Partial<Customer>): boolean {
  if (!c1 || !c2) return false;

  // 1. Mismo ID exacto
  if (c1.id && c2.id && c1.id === c2.id) return true;

  // 2. Mismo QR token
  if (c1.qr_token && c2.qr_token && c1.qr_token === c2.qr_token) return true;

  // 3. Documento de identidad normalizado (Cédula / DNI / RUC)
  const doc1 = normalizeDocumentId(c1.document_id);
  const doc2 = normalizeDocumentId(c2.document_id);
  const hasDocMatch = doc1 && doc2 && doc1.length >= 4 && doc1 === doc2;
  if (hasDocMatch) return true;

  // 4. Teléfono normalizado
  const phone1 = normalizePhone(c1.phone);
  const phone2 = normalizePhone(c2.phone);
  const hasPhoneMatch = phone1 && phone2 && phone1.length >= 6 && phone1 === phone2;
  if (hasPhoneMatch) return true;

  // 5. Mismo nombre completo normalizado (verificando que no haya documentos contradictorios)
  const name1 = normalizeName(c1.full_name);
  const name2 = normalizeName(c2.full_name);
  if (name1 && name2 && name1.length >= 5 && name1 === name2) {
    // Si ambos tienen documento pero son diferentes, no son la misma persona
    if (doc1 && doc2 && doc1 !== doc2) return false;
    // Si ambos tienen teléfono pero son diferentes, no son la misma persona
    if (phone1 && phone2 && phone1 !== phone2) return false;
    return true;
  }

  return false;
}

export function mergeCustomers(a: Customer, b: Customer): Customer {
  const isAInitial = INITIAL_CUSTOMERS.some((ic) => ic.id === a.id);
  const isBInitial = INITIAL_CUSTOMERS.some((ic) => ic.id === b.id);

  const aTime = new Date(a.updated_at || a.created_at || 0).getTime() || 0;
  const bTime = new Date(b.updated_at || b.created_at || 0).getTime() || 0;

  // Respetar estrictamente el registro más reciente por `updated_at` (sin Math.max ni || destructivo).
  // En caso de empate exacto de timestamp, priorizar `a` (por convención nube/entrante).
  const newer = bTime > aTime ? b : a;
  const older = newer === a ? b : a;
  const canonicalId = isAInitial && !isBInitial ? a.id : isBInitial && !isAInitial ? b.id : newer.id;

  const termsAccepted = Boolean(newer.terms_accepted || older.terms_accepted);
  const termsAcceptedAt = newer.terms_accepted_at || older.terms_accepted_at;
  const termsMethod = newer.terms_acceptance_method || older.terms_acceptance_method;
  const creditLimit = roundMoney(Number(newer.credit_limit) || 0);
  const currentBalance = roundMoney(Number(newer.current_balance) || 0);

  const earliestCreated =
    a.created_at && b.created_at
      ? new Date(a.created_at).getTime() < new Date(b.created_at).getTime()
        ? a.created_at
        : b.created_at
      : newer.created_at || older.created_at || new Date().toISOString();

  const mergedMeta = {
    ...(older.terms_acceptance_metadata || {}),
    ...(newer.terms_acceptance_metadata || {}),
  };

  const resolvedDueDate =
    newer.terms_acceptance_metadata?.payment_due_date === null
      ? undefined
      : newer.payment_due_date ??
        older.payment_due_date ??
        (typeof mergedMeta.payment_due_date === 'string' && mergedMeta.payment_due_date
          ? mergedMeta.payment_due_date
          : undefined);

  return {
    ...older,
    ...newer,
    id: canonicalId,
    full_name: newer.full_name || older.full_name,
    nickname: newer.nickname ?? older.nickname ?? '',
    document_id: newer.document_id ?? older.document_id ?? '',
    phone: newer.phone ?? older.phone ?? '',
    qr_token: newer.qr_token || older.qr_token,
    security_pin: newer.security_pin || older.security_pin || '1234',
    pin_hash: newer.pin_hash || older.pin_hash,
    credit_limit: creditLimit,
    current_balance: currentBalance,
    is_blocked: Boolean(newer.is_blocked),
    credit_cycle: newer.credit_cycle || older.credit_cycle || 'MENSUAL',
    payment_due_date: resolvedDueDate,
    terms_accepted: termsAccepted,
    terms_accepted_at: termsAcceptedAt,
    terms_acceptance_method: termsMethod,
    terms_acceptance_metadata: mergedMeta,
    registered_via: newer.registered_via || older.registered_via || 'SELF_MOBILE_LINK',
    created_at: earliestCreated,
    updated_at: newer.updated_at || older.updated_at || new Date().toISOString(),
  };
}

export function deduplicateCustomers(customers: Customer[]): Customer[] {
  if (!Array.isArray(customers) || customers.length <= 1) return customers || [];

  const deduplicated: Customer[] = [];
  for (const item of customers) {
    if (!item || !item.full_name) continue;
    const matchIdx = deduplicated.findIndex((existing) => areCustomersSamePerson(existing, item));
    if (matchIdx >= 0) {
      deduplicated[matchIdx] = mergeCustomers(deduplicated[matchIdx], item);
    } else {
      deduplicated.push({ ...item });
    }
  }
  return deduplicated;
}

export function deduplicateTransactions(
  transactions: Transaction[],
  customerIdRemap?: Map<string, string>
): Transaction[] {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];
  const result: Transaction[] = [];
  const indexById = new Map<string, number>();
  const indexByFingerprint = new Map<string, number>();

  for (const tx of transactions) {
    if (!tx || !tx.id) continue;

    const remapped: Transaction = {
      ...tx,
      id: ensureValidUuid(tx.id),
      amount: roundMoney(Number(tx.amount) || 0),
      previous_balance: roundMoney(Number(tx.previous_balance) || 0),
      new_balance: roundMoney(Number(tx.new_balance) || 0),
      items: Array.isArray(tx.items) ? tx.items : [],
    };
    if (customerIdRemap && customerIdRemap.has(remapped.customer_id)) {
      remapped.customer_id = customerIdRemap.get(remapped.customer_id)!;
    }

    const fingerprint = `${ensureValidUuid(remapped.customer_id)}|${remapped.type}|${roundMoney(remapped.amount)}|${String(remapped.created_at || '').slice(0, 19)}|${String(remapped.description || '').trim().toLowerCase()}`;

    const existingIdx = indexById.get(remapped.id) ?? indexByFingerprint.get(fingerprint);
    if (existingIdx !== undefined) {
      const existing = result[existingIdx];
      // Si la versión entrante ya fue certificada y la almacenada seguía pendiente, actualizar en sitio
      if (existing.status === 'PENDING_CUSTOMER' && remapped.status === 'CERTIFIED_BOTH') {
        result[existingIdx] = {
          ...existing,
          ...remapped,
          status: 'CERTIFIED_BOTH',
          validated_at: remapped.validated_at || existing.validated_at,
          validation_method: remapped.validation_method || existing.validation_method,
          validation_metadata: remapped.validation_metadata || existing.validation_metadata,
        };
      }
      continue;
    }

    const nextIdx = result.length;
    indexById.set(remapped.id, nextIdx);
    indexByFingerprint.set(fingerprint, nextIdx);
    result.push(remapped);
  }
  return result;
}

export function isMerchantLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN) === 'true';
}

export function setMerchantLoggedIn(value: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, value ? 'true' : 'false');
    if (value) {
      setSecureCookie('libreta_auth_session', 'authenticated', { days: 7, sameSite: 'Strict' });
    } else {
      removeSecureCookie('libreta_auth_session');
    }
    window.dispatchEvent(new Event('libreta_auth_changed'));
    window.dispatchEvent(new Event('libreta_data_updated'));
  }
}

export function logoutMerchant(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
    localStorage.removeItem(STORAGE_KEYS.TENANT);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_OPERATOR);
    removeSecureCookie('libreta_auth_session');
    removeSecureCookie('libreta_superadmin_session');
    window.dispatchEvent(new Event('libreta_auth_changed'));
    window.dispatchEvent(new Event('libreta_data_updated'));

    try {
      const supabase = createClient();
      if (supabase) {
        supabase.auth.signOut().catch(() => {});
      }
    } catch (e) {}

    window.location.href = '/registro-comercio';
  }
}

export const SUPERADMIN_STORAGE_KEY = 'libretadigital_superadmin_session_v2';

export function isSuperAdminLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  const admin = localStorage.getItem(SUPERADMIN_STORAGE_KEY);
  return Boolean(admin && admin.length > 0);
}

export function loginDemoDonMario(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');

    // Preservar logo, portada y datos editados si ya existen para Don Mario
    let tenantToStore: Tenant = INITIAL_TENANT;
    const existingTenantRaw = localStorage.getItem(STORAGE_KEYS.TENANT);
    if (existingTenantRaw) {
      try {
        const parsedExisting = restoreTenantFromSupabase(JSON.parse(existingTenantRaw));
        if (parsedExisting && parsedExisting.id === INITIAL_TENANT.id) {
          tenantToStore = parsedExisting;
        }
      } catch (e) {}
    }
    localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(tenantToStore));
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(INITIAL_STAFF));
    localStorage.setItem(STORAGE_KEYS.CURRENT_OPERATOR, JSON.stringify(INITIAL_STAFF[0]));

    // PRESERVAR CLIENTES REALES REGISTRADOS EN EL DEMO SIN DUPLICAR
    const existingCustRaw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    let finalCustomers = INITIAL_CUSTOMERS;
    if (existingCustRaw) {
      try {
        const existing: Customer[] = JSON.parse(existingCustRaw);
        if (Array.isArray(existing) && existing.length > 0) {
          finalCustomers = deduplicateCustomers([...existing, ...INITIAL_CUSTOMERS]);
        }
      } catch (e) {}
    } else {
      finalCustomers = deduplicateCustomers(INITIAL_CUSTOMERS);
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(finalCustomers));

    // PRESERVAR TRANSACCIONES REALES REGISTRADAS EN EL DEMO SIN DUPLICAR
    const existingTxRaw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    let finalTxs = INITIAL_TRANSACTIONS;
    if (existingTxRaw) {
      try {
        const existingTx: Transaction[] = JSON.parse(existingTxRaw);
        if (Array.isArray(existingTx) && existingTx.length > 0) {
          finalTxs = deduplicateTransactions([...existingTx, ...INITIAL_TRANSACTIONS]);
        }
      } catch (e) {}
    } else {
      finalTxs = deduplicateTransactions(INITIAL_TRANSACTIONS);
    }
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(finalTxs));

    // Sincronizar Don Mario en Supabase solo si aún no existe (nunca pisar cambios guardados)
    try {
      const supabase = createClient();
      if (supabase) {
        supabase
          .from('tenants')
          .upsert(cleanTenantForSupabase(INITIAL_TENANT), {
            onConflict: 'id',
            ignoreDuplicates: true,
          })
          .then(
            () => {},
            () => {}
          );
      }
    } catch (e) {}

    window.dispatchEvent(new Event('libreta_auth_changed'));
    window.dispatchEvent(new Event('libreta_data_updated'));
  }
}

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-001',
    tenant_id: '019339aa-7824-7662-8e39-165f123d9101',
    full_name: 'Don Mario Gómez',
    role: 'OWNER',
    phone: '595981123456',
    pin: '1234',
    is_active: true,
    permissions: {
      can_register_sales: true,
      can_register_payments: true,
      can_edit_credit_limits: true,
      can_adjust_credit_notes: true,
      can_view_financial_reports: true,
      can_manage_staff: true,
    },
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'staff-002',
    tenant_id: '019339aa-7824-7662-8e39-165f123d9101',
    full_name: 'Juan Pérez (Cajero Turno Mañana)',
    role: 'CASHIER',
    phone: '595981999888',
    pin: '1111',
    is_active: true,
    permissions: {
      can_register_sales: true,
      can_register_payments: true,
      can_edit_credit_limits: false,
      can_adjust_credit_notes: false,
      can_view_financial_reports: false,
      can_manage_staff: false,
    },
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'staff-003',
    tenant_id: '019339aa-7824-7662-8e39-165f123d9101',
    full_name: 'María Benítez (Cajera Turno Tarde)',
    role: 'CASHIER',
    phone: '595982777666',
    pin: '2222',
    is_active: true,
    permissions: {
      can_register_sales: true,
      can_register_payments: true,
      can_edit_credit_limits: false,
      can_adjust_credit_notes: false,
      can_view_financial_reports: false,
      can_manage_staff: false,
    },
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const INITIAL_TENANT: Tenant = {
  id: '019339aa-7824-7662-8e39-165f123d9101',
  business_name: 'Almacén Don Mario',
  tax_id: '80012345-6',
  phone: '595981123456',
  address: 'Avda. Principal 1420',
  currency_code: 'PYG',
  currency_symbol: '₲',
  subscription_plan: 'pro_monthly',
  sub_status: 'active',
  trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: '019339bb-7824-7662-8e39-165f123d9201',
    tenant_id: '019339aa-7824-7662-8e39-165f123d9101',
    full_name: 'Roberto Gómez',
    nickname: 'Don Roberto',
    document_id: '3.456.789',
    phone: '595981444555',
    qr_token: 'rgomez-7b4c-4e89',
    security_pin: '4921',
    credit_limit: 350000,
    current_balance: 145000,
    is_blocked: false,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '019339bb-7824-7662-8e39-165f123d9202',
    tenant_id: '019339aa-7824-7662-8e39-165f123d9101',
    full_name: 'Laura Benítez',
    nickname: 'Vecina Laura (Casa 12)',
    document_id: '4.890.123',
    phone: '595982666777',
    qr_token: 'lbenitez-992a-11f2',
    security_pin: '8310',
    credit_limit: 200000,
    current_balance: 245000, // Supera el límite para disparo de alertas
    is_blocked: false,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '019339bb-7824-7662-8e39-165f123d9203',
    tenant_id: '019339aa-7824-7662-8e39-165f123d9101',
    full_name: 'Carlos Mendoza',
    nickname: 'El Mecánico',
    document_id: '2.789.654',
    phone: '595983888999',
    qr_token: 'cmendoza-ff44-88aa',
    security_pin: '1205',
    credit_limit: 500000,
    current_balance: 0,
    is_blocked: false,
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '019339bb-7824-7662-8e39-165f123d9204',
    tenant_id: '019339aa-7824-7662-8e39-165f123d9101',
    full_name: 'Patricia Meza',
    nickname: 'Dir: Barrio San Pedro',
    document_id: '5531942',
    phone: '0975872063',
    qr_token: 'pmeza-sanpedro-77a1',
    security_pin: '1234',
    credit_limit: 500000,
    current_balance: 105000,
    is_blocked: false,
    terms_accepted: true,
    terms_accepted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    terms_acceptance_method: 'PORTAL_PIN',
    terms_acceptance_metadata: {
      informconf_status: 'INFORMCONF OK',
      registeredVia: 'SELF_MOBILE_LINK',
    },
    registered_via: 'SELF_MOBILE_LINK',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: '2025-01-01T00:00:00.000Z',
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: '019339cc-7824-7662-8e39-165f123d9301',
    tenant_id: '019339aa-7824-7662-8e39-165f123d9101',
    customer_id: '019339bb-7824-7662-8e39-165f123d9201',
    created_by: 'user-owner-001',
    type: 'DEBIT_PURCHASE',
    amount: 85000,
    previous_balance: 0,
    new_balance: 85000,
    description: '2 Harinas 1kg, 1 Aceite 900ml, 1 Queso Paraguay',
    items: [
      { name: 'Harina 1kg', qty: 2, price: 10000 },
      { name: 'Aceite 900ml', qty: 1, price: 15000 },
      { name: 'Queso Paraguay', qty: 1, price: 50000 },
    ],
    status: 'CERTIFIED_BOTH',
    validated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    validation_method: 'IN_STORE_PIN',
    validation_metadata: { ip: '190.128.45.10', ua: 'Merchant POS' },
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '019339cc-7824-7662-8e39-165f123d9302',
    tenant_id: '019339aa-7824-7662-8e39-165f123d9101',
    customer_id: '019339bb-7824-7662-8e39-165f123d9201',
    created_by: 'user-owner-001',
    type: 'DEBIT_PURCHASE',
    amount: 60000,
    previous_balance: 85000,
    new_balance: 145000,
    description: '1 Carne molida especial, 2 Gaseosas 2L',
    items: [
      { name: 'Carne molida', qty: 1, price: 36000 },
      { name: 'Gaseosa 2L', qty: 2, price: 24000 },
    ],
    status: 'CERTIFIED_BOTH',
    validated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    validation_method: 'REMOTE_QR_APPROVAL',
    validation_metadata: { ip: '190.128.45.10', ua: 'Customer Mobile' },
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '019339cc-7824-7662-8e39-165f123d9303',
    tenant_id: '019339aa-7824-7662-8e39-165f123d9101',
    customer_id: '019339bb-7824-7662-8e39-165f123d9202',
    created_by: 'user-owner-001',
    type: 'DEBIT_PURCHASE',
    amount: 245000,
    previous_balance: 0,
    new_balance: 245000,
    description: 'Surtido semanal despensa y fiambrería',
    items: [],
    status: 'PENDING_CUSTOMER',
    validation_pin: '8310',
    created_at: new Date().toISOString(),
  },
  {
    id: '019339cc-7824-7662-8e39-165f123d9304',
    tenant_id: '019339aa-7824-7662-8e39-165f123d9101',
    customer_id: '019339bb-7824-7662-8e39-165f123d9204',
    created_by: 'user-owner-001',
    type: 'DEBIT_PURCHASE',
    amount: 105000,
    previous_balance: 0,
    new_balance: 105000,
    description: '1 Pañalera Pampers G, 1 Leche en polvo Nido 800g',
    items: [
      { name: 'Pañalera Pampers G', qty: 1, price: 65000 },
      { name: 'Leche Nido 800g', qty: 1, price: 40000 },
    ],
    status: 'CERTIFIED_BOTH',
    validated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    validation_method: 'IN_STORE_PIN',
    validation_metadata: { ip: '190.128.45.10', ua: 'Merchant POS' },
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function getStoredData() {
  if (typeof window === 'undefined') {
    return {
      tenant: INITIAL_TENANT,
      customers: INITIAL_CUSTOMERS,
      transactions: INITIAL_TRANSACTIONS,
      staff: INITIAL_STAFF,
      currentOperator: INITIAL_STAFF[0],
    };
  }

  const tenantRaw = localStorage.getItem(STORAGE_KEYS.TENANT);
  const customersRaw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  const txRaw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  const staffRaw = localStorage.getItem(STORAGE_KEYS.STAFF);
  const operatorRaw = localStorage.getItem(STORAGE_KEYS.CURRENT_OPERATOR);

  let parsedTenant: any = INITIAL_TENANT;
  if (tenantRaw) {
    try {
      parsedTenant = JSON.parse(tenantRaw);
    } catch {
      parsedTenant = INITIAL_TENANT;
    }
  }
  const tenant: Tenant = restoreTenantFromSupabase(parsedTenant);
  let customers: Customer[] = customersRaw ? JSON.parse(customersRaw) : INITIAL_CUSTOMERS;
  let transactions: Transaction[] = txRaw ? JSON.parse(txRaw) : INITIAL_TRANSACTIONS;
  const staff: StaffMember[] = staffRaw ? JSON.parse(staffRaw) : INITIAL_STAFF;
  const currentOperator: StaffMember = operatorRaw ? JSON.parse(operatorRaw) : (staff[0] || INITIAL_STAFF[0]);

  // Ejecutar deduplicación, normalización de UUIDs y reconciliación matemática desde el libro mayor
  const rawCustomerCount = customers.length;
  const rawTxCount = transactions.length;
  const hadLegacyTxIds = transactions.some((t) => !t?.id || !UUID_REGEX.test(t.id));
  customers = deduplicateCustomers(customers);
  transactions = deduplicateTransactions(transactions);
  const reconciled = reconcileLedgerState(customers, transactions, ensureValidUuid);
  customers = reconciled.customers;
  transactions = reconciled.transactions;

  // Si se detectaron duplicados/IDs heredados, desajustes de saldo o faltaba clave, reescribir localStorage
  if (!customersRaw || customers.length !== rawCustomerCount || reconciled.changed) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }
  if (!txRaw || hadLegacyTxIds || transactions.length !== rawTxCount || reconciled.changed) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }
  if (!tenantRaw) localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(INITIAL_TENANT));
  if (!staffRaw) localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(INITIAL_STAFF));
  if (!operatorRaw) localStorage.setItem(STORAGE_KEYS.CURRENT_OPERATOR, JSON.stringify(currentOperator));

  return { tenant, customers, transactions, staff, currentOperator };
}

export function saveStaff(staff: StaffMember[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staff));
    window.dispatchEvent(new Event('libreta_data_updated'));

    try {
      const supabase = createClient();
      if (supabase) {
        supabase.from('staff_members').upsert(staff).then(({ error }: { error: any }) => {
          if (error) console.warn('Supabase staff sync notice:', error.message);
        });
      }
    } catch (e) {
      // Offline fallback
    }
  }
}

export function setCurrentOperator(operator: StaffMember) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CURRENT_OPERATOR, JSON.stringify(operator));
    window.dispatchEvent(new Event('libreta_data_updated'));
  }
}

export function cleanCustomerForSupabase(c: Customer): any {
  const meta = {
    ...(c.terms_acceptance_metadata || {}),
    registered_via: c.registered_via,
    pin_hash: c.pin_hash,
    payment_due_date: c.payment_due_date || null,
  };
  return {
    id: c.id,
    tenant_id: c.tenant_id,
    full_name: c.full_name,
    nickname: c.nickname || null,
    document_id: c.document_id || null,
    phone: c.phone || null,
    qr_token: c.qr_token,
    security_pin: c.security_pin || '1234',
    credit_limit: Number(c.credit_limit) || 0,
    current_balance: Number(c.current_balance) || 0,
    is_blocked: Boolean(c.is_blocked),
    credit_cycle: c.credit_cycle || 'MENSUAL',
    terms_accepted: Boolean(c.terms_accepted),
    terms_accepted_at: c.terms_accepted_at || null,
    terms_acceptance_method: c.terms_acceptance_method || null,
    terms_acceptance_metadata: meta,
    created_at: c.created_at || new Date().toISOString(),
    updated_at: c.updated_at || new Date().toISOString(),
  };
}

export function restoreCustomerFromSupabase(row: any): Customer {
  const meta = row.terms_acceptance_metadata || {};
  const restoredDueDate =
    typeof row.payment_due_date === 'string' && row.payment_due_date
      ? row.payment_due_date
      : typeof meta.payment_due_date === 'string' && meta.payment_due_date
      ? meta.payment_due_date
      : undefined;
  return {
    ...row,
    credit_limit: Number(row.credit_limit) || 0,
    current_balance: Number(row.current_balance) || 0,
    payment_due_date: restoredDueDate,
    registered_via: row.registered_via || meta.registered_via || meta.registeredVia || 'IN_STORE_COUNTER',
    pin_hash: row.pin_hash || meta.pin_hash || `$2a$06$hash_${row.security_pin || '1234'}`,
  };
}

export function cleanTransactionForSupabase(tx: Transaction): any {
  return {
    id: ensureValidUuid(tx.id),
    tenant_id: ensureValidUuid(tx.tenant_id),
    customer_id: ensureValidUuid(tx.customer_id),
    created_by: tx.created_by || 'user-owner-001',
    operator_id: tx.operator_id || null,
    operator_name: tx.operator_name || null,
    type: tx.type,
    amount: Number(tx.amount) || 0,
    previous_balance: Number(tx.previous_balance) || 0,
    new_balance: Number(tx.new_balance) || 0,
    description: tx.description || null,
    items: tx.items || [],
    payment_method: tx.payment_method || 'EFECTIVO',
    payment_reference: tx.payment_reference || null,
    status: tx.status || 'CERTIFIED_BOTH',
    validation_pin: tx.validation_pin || null,
    validated_at: tx.validated_at || null,
    validation_method: tx.validation_method || 'IN_STORE_PIN',
    validation_metadata: tx.validation_metadata || {},
    blockchain_hash: tx.blockchain_hash || null,
    created_at: tx.created_at || new Date().toISOString(),
  };
}

export function restoreTransactionFromSupabase(row: any): Transaction {
  return {
    ...row,
    id: ensureValidUuid(row.id),
    amount: Number(row.amount) || 0,
    previous_balance: Number(row.previous_balance) || 0,
    new_balance: Number(row.new_balance) || 0,
    items: Array.isArray(row.items) ? row.items : [],
  };
}

const TENANT_PROFILE_PREFIX = '__LD_PROFILE_V1__:';

export const isSafeTenantImageUrl = isSafeImageUrl;

/**
 * Serializa logo, portada y perfil extendido dentro de la columna `logo_url`
 * cuando existen campos extendidos, permitiendo persistencia cero-migración en Supabase.
 */
export function encodeTenantLogoField(tenant: Partial<Tenant>): string | null {
  const safeLogo = isSafeTenantImageUrl(tenant.logo_url) ? tenant.logo_url!.trim() : undefined;
  const safeCover = isSafeTenantImageUrl(tenant.cover_url) ? tenant.cover_url!.trim() : undefined;
  const description = typeof tenant.description === 'string' && tenant.description.trim() ? tenant.description.trim() : undefined;
  const owner_name = typeof tenant.owner_name === 'string' && tenant.owner_name.trim() ? tenant.owner_name.trim() : undefined;
  const email = typeof tenant.email === 'string' && tenant.email.trim() ? tenant.email.trim() : undefined;
  const opening_hours = typeof tenant.opening_hours === 'string' && tenant.opening_hours.trim() ? tenant.opening_hours.trim() : undefined;
  const city = typeof tenant.city === 'string' && tenant.city.trim() ? tenant.city.trim() : undefined;

  if (safeCover || description || owner_name || email || opening_hours || city) {
    return (
      TENANT_PROFILE_PREFIX +
      JSON.stringify({
        ...(safeLogo ? { logo_url: safeLogo } : {}),
        ...(safeCover ? { cover_url: safeCover } : {}),
        ...(description ? { description } : {}),
        ...(owner_name ? { owner_name } : {}),
        ...(email ? { email } : {}),
        ...(opening_hours ? { opening_hours } : {}),
        ...(city ? { city } : {}),
      })
    );
  }

  return safeLogo || null;
}

/**
 * Restaura un comercio desde fila Supabase o almacenamiento local, decodificando el sobre
 * `__LD_PROFILE_V1__:` de manera segura y filtrando URLs de imágenes inválidas o inseguras.
 */
export function restoreTenantFromSupabase(row: any): Tenant {
  const safeRow = row && typeof row === 'object' ? row : {};
  const rawLogoField = typeof safeRow.logo_url === 'string' ? safeRow.logo_url.trim() : '';

  let parsedEnvelope: Record<string, any> = {};
  let resolvedLogo: string | undefined;

  if (rawLogoField.startsWith(TENANT_PROFILE_PREFIX)) {
    try {
      const jsonStr = rawLogoField.slice(TENANT_PROFILE_PREFIX.length);
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object') {
        parsedEnvelope = parsed;
      }
    } catch {
      parsedEnvelope = {};
    }
    const innerLogo = typeof parsedEnvelope.logo_url === 'string' ? parsedEnvelope.logo_url.trim() : '';
    resolvedLogo = isSafeTenantImageUrl(innerLogo) ? innerLogo : undefined;
  } else {
    resolvedLogo = isSafeTenantImageUrl(rawLogoField) ? rawLogoField : undefined;
  }

  const pickSafeImg = (primary: any, secondary: any): string | undefined => {
    if (typeof primary === 'string' && isSafeTenantImageUrl(primary)) return primary.trim();
    if (typeof secondary === 'string' && isSafeTenantImageUrl(secondary)) return secondary.trim();
    return undefined;
  };

  const pickOptText = (primary: any, secondary: any): string | undefined => {
    if (typeof primary === 'string' && primary.trim()) return primary.trim();
    if (typeof secondary === 'string' && secondary.trim()) return secondary.trim();
    return undefined;
  };

  const nowIso = new Date().toISOString();
  return {
    ...safeRow,
    id: safeRow.id || INITIAL_TENANT.id,
    business_name: safeRow.business_name || INITIAL_TENANT.business_name,
    tax_id: pickOptText(safeRow.tax_id, parsedEnvelope.tax_id),
    phone: pickOptText(safeRow.phone, parsedEnvelope.phone),
    address: pickOptText(safeRow.address, parsedEnvelope.address),
    currency_code: safeRow.currency_code || INITIAL_TENANT.currency_code || 'PYG',
    currency_symbol: safeRow.currency_symbol || INITIAL_TENANT.currency_symbol || '₲',
    logo_url: resolvedLogo,
    cover_url: pickSafeImg(safeRow.cover_url, parsedEnvelope.cover_url),
    description: pickOptText(safeRow.description, parsedEnvelope.description),
    owner_name: pickOptText(safeRow.owner_name, parsedEnvelope.owner_name),
    email: pickOptText(safeRow.email, parsedEnvelope.email),
    opening_hours: pickOptText(safeRow.opening_hours, parsedEnvelope.opening_hours),
    city: pickOptText(safeRow.city, parsedEnvelope.city),
    subscription_plan: safeRow.subscription_plan || INITIAL_TENANT.subscription_plan || 'pro_monthly',
    sub_status: safeRow.sub_status || INITIAL_TENANT.sub_status || 'active',
    trial_ends_at: safeRow.trial_ends_at || INITIAL_TENANT.trial_ends_at || nowIso,
    subscription_ends_at: safeRow.subscription_ends_at || INITIAL_TENANT.subscription_ends_at || nowIso,
    created_at: safeRow.created_at || INITIAL_TENANT.created_at || nowIso,
    updated_at: safeRow.updated_at || nowIso,
  };
}

export function cleanTenantForSupabase(tenant: Tenant): any {
  const restored = restoreTenantFromSupabase(tenant);
  return {
    id: restored.id,
    business_name: restored.business_name,
    tax_id: restored.tax_id || null,
    phone: restored.phone || null,
    address: restored.address || null,
    currency_code: restored.currency_code || 'PYG',
    currency_symbol: restored.currency_symbol || '₲',
    logo_url: encodeTenantLogoField(restored),
    subscription_plan: restored.subscription_plan || 'pro_monthly',
    sub_status: restored.sub_status || 'active',
    trial_ends_at: restored.trial_ends_at || new Date(Date.now() + 14 * 86400000).toISOString(),
    subscription_ends_at: restored.subscription_ends_at || new Date(Date.now() + 30 * 86400000).toISOString(),
    created_at: restored.created_at || new Date().toISOString(),
    updated_at: restored.updated_at || new Date().toISOString(),
  };
}

function broadcastTenantUpdate(tenant: Tenant) {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('libretadigital_tenant_channel');
      bc.postMessage({ type: 'TENANT_UPDATED', tenant });
      bc.close();
    }
  } catch {}
}

function saveTenantToLocalStorage(tenant: Tenant) {
  localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(tenant));
}

export function saveTransactionsLocalOnly(transactions: Transaction[]): Transaction[] {
  const cleanTransactions = deduplicateTransactions(transactions).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(cleanTransactions));
  }
  return cleanTransactions;
}

export function saveTransactions(transactions: Transaction[], transactionsToSync?: Transaction[]) {
  if (typeof window !== 'undefined') {
    const cleanTransactions = saveTransactionsLocalOnly(transactions);
    window.dispatchEvent(new Event('libreta_data_updated'));

    // Enviar solo las transacciones nuevas/específicas en orden cronológico ascendente (evita carreras de 25 POST concurrentes)
    const rawToSync = transactionsToSync ?? cleanTransactions.slice(0, 1);
    const orderedToSync = [...rawToSync].sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );
    if (orderedToSync.length > 0) {
      void (async () => {
        for (const tx of orderedToSync) {
          try {
            await fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(tx),
            });
          } catch {}
        }
      })();
    }
  }
}

export function saveCustomersLocalOnly(customers: Customer[]): Customer[] {
  const cleanCustomers = deduplicateCustomers(customers);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(cleanCustomers));
  }
  return cleanCustomers;
}

export function saveCustomers(customers: Customer[], customerIdsToSync?: string[]) {
  if (typeof window !== 'undefined') {
    const cleanCustomers = deduplicateCustomers(customers);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(cleanCustomers));
    window.dispatchEvent(new Event('libreta_data_updated'));

    const syncFilter = Array.isArray(customerIdsToSync)
      ? new Set(customerIdsToSync.map((id) => ensureValidUuid(id)))
      : null;
    const targets = syncFilter
      ? cleanCustomers.filter((c) => syncFilter.has(ensureValidUuid(c.id)) || customerIdsToSync!.includes(c.id))
      : cleanCustomers;

    if (targets.length === 0) return;

    try {
      const supabase = createClient();
      if (supabase) {
        const cleaned = targets.map(cleanCustomerForSupabase);
        supabase.from('customers').upsert(cleaned).then(({ error }: { error: any }) => {
          if (error) console.warn('Supabase customers sync notice:', error.message);
        });
      }
    } catch (e) {
      // Offline fallback
    }

    // Sincronizar también con la API central /api/customers
    for (const c of targets) {
      fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c),
      }).catch(() => {});
    }
  }
}

export function saveTenant(tenant: Tenant) {
  if (typeof window !== 'undefined') {
    const clean = restoreTenantFromSupabase({
      ...tenant,
      updated_at: tenant.updated_at || new Date().toISOString(),
    });
    try {
      saveTenantToLocalStorage(clean);
    } catch (e) {
      console.warn('Error saving tenant locally:', e);
    }
    window.dispatchEvent(new Event('libreta_data_updated'));
    broadcastTenantUpdate(clean);

    // Sincronizar con API central
    fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean),
    }).catch(() => {});

    try {
      const supabase = createClient();
      if (supabase) {
        const payload = cleanTenantForSupabase(clean);
        supabase
          .from('tenants')
          .update(payload)
          .eq('id', clean.id)
          .select()
          .then(({ data, error }: { data: any; error: any }) => {
            if (error || !Array.isArray(data) || data.length === 0) {
              supabase
                .from('tenants')
                .upsert(payload)
                .then(
                  () => {},
                  () => {}
                );
            }
          });
      }
    } catch (e) {
      // Offline fallback
    }
  }
}

/**
 * Actualiza el perfil completo del comercio (datos generales, logo y portada)
 * con persistencia inmediata local, sincronización API y respaldo directo en Supabase.
 */
export async function updateTenantProfile(
  tenant: Tenant
): Promise<{ success: boolean; tenant: Tenant; cloudSynced: boolean; error?: string }> {
  const clean = restoreTenantFromSupabase({
    ...tenant,
    updated_at: new Date().toISOString(),
  });

  if (typeof window !== 'undefined') {
    try {
      saveTenantToLocalStorage(clean);
    } catch {
      return {
        success: false,
        tenant: clean,
        cloudSynced: false,
        error: 'El espacio local del navegador está lleno. Probá usar una imagen más liviana.',
      };
    }
    window.dispatchEvent(new Event('libreta_data_updated'));
    broadcastTenantUpdate(clean);
  }

  let finalTenant = clean;
  let cloudSynced = false;

  try {
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(clean),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.tenant) {
        finalTenant = restoreTenantFromSupabase(json.tenant);
        if (typeof window !== 'undefined') {
          try {
            saveTenantToLocalStorage(finalTenant);
            window.dispatchEvent(new Event('libreta_data_updated'));
            broadcastTenantUpdate(finalTenant);
          } catch {}
        }
      }
      cloudSynced = Boolean(json?.cloud_synced);
    }
  } catch {}

  if (!cloudSynced && typeof window !== 'undefined') {
    try {
      const supabase = createClient();
      if (supabase) {
        const payload = cleanTenantForSupabase(finalTenant);
        const { data: updData, error: updErr } = await supabase
          .from('tenants')
          .update(payload)
          .eq('id', finalTenant.id)
          .select()
          .maybeSingle();

        if (!updErr && updData) {
          cloudSynced = true;
        } else {
          const { data: upsData, error: upsErr } = await supabase
            .from('tenants')
            .upsert(payload)
            .select()
            .maybeSingle();
          if (!upsErr && upsData) {
            cloudSynced = true;
          }
        }
      }
    } catch {}
  }

  return { success: true, tenant: finalTenant, cloudSynced };
}

function isRemoteTenantNewer(remote: Tenant, local: Tenant | null): boolean {
  if (!local) return true;
  const remoteTime = new Date(remote.updated_at || 0).getTime();
  const localTime = new Date(local.updated_at || 0).getTime();
  return remoteTime > localTime;
}

export async function syncFromSupabase() {
  if (typeof window === 'undefined') return;
  try {
    let localTenant: Tenant | null = null;
    const localTenantRaw = localStorage.getItem(STORAGE_KEYS.TENANT);
    if (localTenantRaw) {
      try {
        localTenant = restoreTenantFromSupabase(JSON.parse(localTenantRaw));
      } catch {}
    }
    const activeTenantId = localTenant?.id || INITIAL_TENANT.id;

    const supabase = createClient();
    if (supabase) {
      const tenantQuery = localTenant?.id
        ? supabase.from('tenants').select('*').eq('id', activeTenantId).maybeSingle()
        : supabase.from('tenants').select('*').limit(1).maybeSingle();

      const [tenantRes, custRes, txRes, staffRes] = await Promise.all([
        tenantQuery,
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('staff_members').select('*').order('created_at', { ascending: false }),
      ]);

      if (tenantRes?.data) {
        const restoredSbTenant = restoreTenantFromSupabase(tenantRes.data);
        if (isRemoteTenantNewer(restoredSbTenant, localTenant)) {
          try {
            saveTenantToLocalStorage(restoredSbTenant);
            localTenant = restoredSbTenant;
          } catch {}
        }
      }

      if (custRes.data && custRes.data.length > 0) {
        const restored = custRes.data.map(restoreCustomerFromSupabase);
        const localRaw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
        let merged = restored;
        if (localRaw) {
          try {
            const localCusts: Customer[] = JSON.parse(localRaw);
            merged = deduplicateCustomers([...restored, ...localCusts]);
          } catch (e) {}
        } else {
          merged = deduplicateCustomers(restored);
        }
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(merged));
      }

      if (txRes.data && txRes.data.length > 0) {
        const localTxRaw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        let mergedTx = txRes.data;
        if (localTxRaw) {
          try {
            const localTxs: Transaction[] = JSON.parse(localTxRaw);
            mergedTx = deduplicateTransactions([...txRes.data, ...localTxs]).sort(
              (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          } catch (e) {}
        } else {
          mergedTx = deduplicateTransactions(txRes.data);
        }
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(mergedTx));
      }

      if (staffRes.data && staffRes.data.length > 0) {
        localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staffRes.data));
      }
    }

    // SIEMPRE consultar también la API central compartida /api/tenants, /api/customers y /api/transactions
    const ts = Date.now();
    const [apiTenantRes, apiCustRes, apiTxRes] = await Promise.all([
      fetch(`/api/tenants?id=${encodeURIComponent(activeTenantId)}&t=${ts}`, { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => null),
      fetch(`/api/customers?tenantId=${activeTenantId}&t=${ts}`, { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => null),
      fetch(`/api/transactions?tenantId=${activeTenantId}&t=${ts}`, { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => null),
    ]);

    if (apiTenantRes && apiTenantRes.success && apiTenantRes.tenant) {
      const restoredApiTenant = restoreTenantFromSupabase(apiTenantRes.tenant);
      if (isRemoteTenantNewer(restoredApiTenant, localTenant)) {
        try {
          saveTenantToLocalStorage(restoredApiTenant);
        } catch {}
      }
    }

    if (apiCustRes && apiCustRes.success && Array.isArray(apiCustRes.customers)) {
      const currentRaw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      const currentCusts: Customer[] = currentRaw ? JSON.parse(currentRaw) : [];
      const finalCusts = deduplicateCustomers([...apiCustRes.customers, ...currentCusts]);
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(finalCusts));
    }

    if (apiTxRes && apiTxRes.success && Array.isArray(apiTxRes.transactions)) {
      const currentTxRaw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const currentTxs: Transaction[] = currentTxRaw ? JSON.parse(currentTxRaw) : [];
      const finalTxs = deduplicateTransactions([...apiTxRes.transactions, ...currentTxs]).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(finalTxs));
    }

    // Reconciliación matemática final cliente <-> libro mayor tras combinar todas las fuentes
    try {
      const custsRaw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      const txsRaw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const currentCusts: Customer[] = custsRaw ? deduplicateCustomers(JSON.parse(custsRaw)) : [];
      const currentTxs: Transaction[] = txsRaw ? deduplicateTransactions(JSON.parse(txsRaw)) : [];
      const reconciled = reconcileLedgerState(currentCusts, currentTxs, ensureValidUuid);
      if (custsRaw || reconciled.customers.length > 0) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(reconciled.customers));
      }
      if (txsRaw || reconciled.transactions.length > 0) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(reconciled.transactions));
      }
    } catch {}

    window.dispatchEvent(new Event('libreta_data_updated'));
  } catch (err) {
    console.warn('Sync from Supabase fallback:', err);
  }
}
