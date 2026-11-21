import { Tenant, Customer, Transaction, StaffMember, PrinterFormat } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { setSecureCookie, removeSecureCookie } from './cookies';

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
    localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(INITIAL_TENANT));
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(INITIAL_STAFF));
    localStorage.setItem(STORAGE_KEYS.CURRENT_OPERATOR, JSON.stringify(INITIAL_STAFF[0]));

    // PRESERVAR CLIENTES REALES REGISTRADOS EN EL DEMO (no sobreescribir con solo los 3 mocks)
    const existingCustRaw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    let finalCustomers = INITIAL_CUSTOMERS;
    if (existingCustRaw) {
      try {
        const existing: Customer[] = JSON.parse(existingCustRaw);
        if (Array.isArray(existing) && existing.length > 0) {
          const baseIds = new Set(INITIAL_CUSTOMERS.map((c) => c.id));
          const newRealCustomers = existing.filter((c) => !baseIds.has(c.id));
          finalCustomers = [...newRealCustomers, ...INITIAL_CUSTOMERS];
        }
      } catch (e) {}
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(finalCustomers));

    // PRESERVAR TRANSACCIONES REALES REGISTRADAS EN EL DEMO
    const existingTxRaw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    let finalTxs = INITIAL_TRANSACTIONS;
    if (existingTxRaw) {
      try {
        const existingTx: Transaction[] = JSON.parse(existingTxRaw);
        if (Array.isArray(existingTx) && existingTx.length > 0) {
          const baseTxIds = new Set(INITIAL_TRANSACTIONS.map((t) => t.id));
          const newRealTxs = existingTx.filter((t) => !baseTxIds.has(t.id));
          finalTxs = [...newRealTxs, ...INITIAL_TRANSACTIONS];
        }
      } catch (e) {}
    }
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(finalTxs));

    // Sincronizar Don Mario a Supabase si las credenciales están presentes
    try {
      const supabase = createClient();
      if (supabase) {
        supabase.from('tenants').upsert(INITIAL_TENANT).catch(() => {});
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
  trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
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
    updated_at: new Date().toISOString(),
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
    updated_at: new Date().toISOString(),
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
    updated_at: new Date().toISOString(),
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
    updated_at: new Date().toISOString(),
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

  const tenant: Tenant = tenantRaw ? JSON.parse(tenantRaw) : INITIAL_TENANT;
  const customers: Customer[] = customersRaw ? JSON.parse(customersRaw) : INITIAL_CUSTOMERS;
  const transactions: Transaction[] = txRaw ? JSON.parse(txRaw) : INITIAL_TRANSACTIONS;
  const staff: StaffMember[] = staffRaw ? JSON.parse(staffRaw) : INITIAL_STAFF;
  const currentOperator: StaffMember = operatorRaw ? JSON.parse(operatorRaw) : (staff[0] || INITIAL_STAFF[0]);

  if (!tenantRaw) localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(INITIAL_TENANT));
  if (!customersRaw) localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
  if (!txRaw) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
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
  return {
    ...row,
    credit_limit: Number(row.credit_limit) || 0,
    current_balance: Number(row.current_balance) || 0,
    registered_via: row.registered_via || meta.registered_via || meta.registeredVia || 'IN_STORE_COUNTER',
    pin_hash: row.pin_hash || meta.pin_hash || `$2a$06$hash_${row.security_pin || '1234'}`,
  };
}

export function cleanTransactionForSupabase(tx: Transaction): any {
  return {
    id: tx.id,
    tenant_id: tx.tenant_id,
    customer_id: tx.customer_id,
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

export function cleanTenantForSupabase(tenant: Tenant): any {
  return {
    id: tenant.id,
    business_name: tenant.business_name,
    tax_id: tenant.tax_id || null,
    phone: tenant.phone || null,
    address: tenant.address || null,
    currency_code: tenant.currency_code || 'PYG',
    currency_symbol: tenant.currency_symbol || '₲',
    logo_url: tenant.logo_url || null,
    subscription_plan: tenant.subscription_plan || 'pro_monthly',
    sub_status: tenant.sub_status || 'active',
    trial_ends_at: tenant.trial_ends_at || new Date(Date.now() + 14 * 86400000).toISOString(),
    subscription_ends_at: tenant.subscription_ends_at || new Date(Date.now() + 30 * 86400000).toISOString(),
    created_at: tenant.created_at || new Date().toISOString(),
    updated_at: tenant.updated_at || new Date().toISOString(),
  };
}

export function saveTransactions(transactions: Transaction[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    window.dispatchEvent(new Event('libreta_data_updated'));

    try {
      const supabase = createClient();
      if (supabase) {
        const cleaned = transactions.map(cleanTransactionForSupabase);
        supabase.from('transactions').upsert(cleaned).then(({ error }: { error: any }) => {
          if (error) console.warn('Supabase transactions sync notice:', error.message);
        });
      }
    } catch (e) {
      // Offline fallback
    }

    // Sincronizar también con la API central /api/transactions
    for (const tx of transactions.slice(0, 10)) {
      fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx),
      }).catch(() => {});
    }
  }
}

export function saveCustomers(customers: Customer[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    window.dispatchEvent(new Event('libreta_data_updated'));

    try {
      const supabase = createClient();
      if (supabase) {
        const cleaned = customers.map(cleanCustomerForSupabase);
        supabase.from('customers').upsert(cleaned).then(({ error }: { error: any }) => {
          if (error) console.warn('Supabase customers sync notice:', error.message);
        });
      }
    } catch (e) {
      // Offline fallback
    }

    // Sincronizar también con la API central /api/customers
    for (const c of customers) {
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
    localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(tenant));
    window.dispatchEvent(new Event('libreta_data_updated'));

    try {
      const supabase = createClient();
      if (supabase) {
        supabase.from('tenants').upsert(cleanTenantForSupabase(tenant)).then(({ error }: { error: any }) => {
          if (error) console.warn('Supabase tenant sync notice:', error.message);
        });
      }
    } catch (e) {
      // Offline fallback
    }
  }
}

export async function syncFromSupabase() {
  if (typeof window === 'undefined') return;
  try {
    const supabase = createClient();
    if (supabase) {
      const [tenantsRes, custRes, txRes, staffRes] = await Promise.all([
        supabase.from('tenants').select('*').limit(1),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('staff_members').select('*').order('created_at', { ascending: false }),
      ]);

      if (tenantsRes.data && tenantsRes.data.length > 0) {
        localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(tenantsRes.data[0]));
      }

      if (custRes.data && custRes.data.length > 0) {
        const restored = custRes.data.map(restoreCustomerFromSupabase);
        const localRaw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
        let merged = restored;
        if (localRaw) {
          try {
            const localCusts: Customer[] = JSON.parse(localRaw);
            const cloudIds = new Set(restored.map((c: any) => c.id));
            const onlyLocal = localCusts.filter((c) => !cloudIds.has(c.id));
            merged = [...restored, ...onlyLocal];
          } catch (e) {}
        }
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(merged));
      }

      if (txRes.data && txRes.data.length > 0) {
        const localTxRaw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        let mergedTx = txRes.data;
        if (localTxRaw) {
          try {
            const localTxs: Transaction[] = JSON.parse(localTxRaw);
            const cloudTxIds = new Set(txRes.data.map((t: any) => t.id));
            const onlyLocalTx = localTxs.filter((t) => !cloudTxIds.has(t.id));
            mergedTx = [...txRes.data, ...onlyLocalTx].sort(
              (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          } catch (e) {}
        }
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(mergedTx));
      }

      if (staffRes.data && staffRes.data.length > 0) {
        localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staffRes.data));
      }
    }

    // SIEMPRE consultar también la API central compartida /api/customers y /api/transactions
    const tenantRaw = localStorage.getItem(STORAGE_KEYS.TENANT);
    const tenantId = tenantRaw ? JSON.parse(tenantRaw).id : INITIAL_TENANT.id;
    const [apiCustRes, apiTxRes] = await Promise.all([
      fetch(`/api/customers?tenantId=${tenantId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/transactions?tenantId=${tenantId}`).then((r) => r.json()).catch(() => null),
    ]);

    if (apiCustRes && apiCustRes.success && Array.isArray(apiCustRes.customers)) {
      const currentRaw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      const currentCusts: Customer[] = currentRaw ? JSON.parse(currentRaw) : [];
      const map = new Map<string, Customer>();
      for (const c of currentCusts) map.set(c.id, c);
      for (const c of apiCustRes.customers) {
        const existing = map.get(c.id);
        map.set(c.id, existing ? { ...existing, ...c } : c);
      }
      const finalCusts = Array.from(map.values());
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(finalCusts));
    }

    if (apiTxRes && apiTxRes.success && Array.isArray(apiTxRes.transactions)) {
      const currentTxRaw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const currentTxs: Transaction[] = currentTxRaw ? JSON.parse(currentTxRaw) : [];
      const txMap = new Map<string, Transaction>();
      for (const t of currentTxs) txMap.set(t.id, t);
      for (const t of apiTxRes.transactions) txMap.set(t.id, t);
      const finalTxs = Array.from(txMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(finalTxs));
    }

    window.dispatchEvent(new Event('libreta_data_updated'));
  } catch (err) {
    console.warn('Sync from Supabase fallback:', err);
  }
}
