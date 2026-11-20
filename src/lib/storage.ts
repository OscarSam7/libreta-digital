import { Tenant, Customer, Transaction, StaffMember } from '@/types';
import { createClient } from '@/lib/supabase/client';

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
    window.dispatchEvent(new Event('libreta_auth_changed'));
    window.dispatchEvent(new Event('libreta_data_updated'));
  }
}

export function logoutMerchant(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
    localStorage.removeItem(STORAGE_KEYS.TENANT);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_OPERATOR);
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

export function saveTransactions(transactions: Transaction[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    window.dispatchEvent(new Event('libreta_data_updated'));

    try {
      const supabase = createClient();
      if (supabase) {
        supabase.from('transactions').upsert(transactions).then(({ error }: { error: any }) => {
          if (error) console.warn('Supabase transactions sync notice:', error.message);
        });
      }
    } catch (e) {
      // Offline fallback
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
        supabase.from('customers').upsert(customers).then(({ error }: { error: any }) => {
          if (error) console.warn('Supabase customers sync notice:', error.message);
        });
      }
    } catch (e) {
      // Offline fallback
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
        supabase.from('tenants').upsert(tenant).then(({ error }: { error: any }) => {
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
    if (!supabase) return;

    const [tenantsRes, custRes, txRes, staffRes] = await Promise.all([
      supabase.from('tenants').select('*').limit(1),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('staff_members').select('*').order('created_at', { ascending: false }),
    ]);

    let changed = false;

    if (tenantsRes.data && tenantsRes.data.length > 0) {
      localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(tenantsRes.data[0]));
      changed = true;
    }

    if (custRes.data && custRes.data.length > 0) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(custRes.data));
      changed = true;
    }

    if (txRes.data && txRes.data.length > 0) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txRes.data));
      changed = true;
    }

    if (staffRes.data && staffRes.data.length > 0) {
      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staffRes.data));
      changed = true;
    }

    if (changed) {
      window.dispatchEvent(new Event('libreta_data_updated'));
    }
  } catch (err) {
    console.warn('Sync from Supabase fallback:', err);
  }
}
