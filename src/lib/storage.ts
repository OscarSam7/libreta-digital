import { Tenant, Customer, Transaction } from '@/types';

const STORAGE_KEYS = {
  TENANT: 'libretadigital_tenant_v2',
  CUSTOMERS: 'libretadigital_customers_v2',
  TRANSACTIONS: 'libretadigital_transactions_v2',
};

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
    };
  }

  const tenantRaw = localStorage.getItem(STORAGE_KEYS.TENANT);
  const customersRaw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  const txRaw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);

  const tenant: Tenant = tenantRaw ? JSON.parse(tenantRaw) : INITIAL_TENANT;
  const customers: Customer[] = customersRaw ? JSON.parse(customersRaw) : INITIAL_CUSTOMERS;
  const transactions: Transaction[] = txRaw ? JSON.parse(txRaw) : INITIAL_TRANSACTIONS;

  if (!tenantRaw) localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(INITIAL_TENANT));
  if (!customersRaw) localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
  if (!txRaw) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));

  return { tenant, customers, transactions };
}

export function saveTransactions(transactions: Transaction[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    window.dispatchEvent(new Event('libreta_data_updated'));
  }
}

export function saveCustomers(customers: Customer[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    window.dispatchEvent(new Event('libreta_data_updated'));
  }
}

export function saveTenant(tenant: Tenant) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(tenant));
    window.dispatchEvent(new Event('libreta_data_updated'));
  }
}
