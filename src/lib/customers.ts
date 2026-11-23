import { Customer, CreditCycle } from '@/types';
import { getStoredData, saveCustomers, areCustomersSamePerson, deduplicateCustomers, ensureValidUuid } from '@/lib/storage';
import { sanitizeText, validateAmount } from '@/lib/validation';
import { safeCompare } from '@/lib/security';

export interface CreateCustomerInput {
  full_name: string;
  nickname?: string;
  document_id?: string;
  phone?: string;
  credit_limit: number;
  credit_cycle?: CreditCycle;
  payment_due_date?: string;
  terms_accepted?: boolean;
}

export function createNewCustomer(input: CreateCustomerInput): Customer {
  const { customers, tenant } = getStoredData();

  const existing = customers.find((c) =>
    areCustomersSamePerson(c, {
      full_name: input.full_name,
      document_id: input.document_id,
      phone: input.phone,
    } as any)
  );

  if (existing) {
    return existing;
  }

  const token = 'cli-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
  const pin = Math.floor(1000 + Math.random() * 9000).toString();

  const newCust: Customer = {
    id: ensureValidUuid(),
    tenant_id: tenant.id,
    full_name: sanitizeText(input.full_name, 100),
    nickname: input.nickname ? sanitizeText(input.nickname, 50) : undefined,
    document_id: input.document_id ? sanitizeText(input.document_id, 30) : undefined,
    phone: input.phone ? sanitizeText(input.phone, 30) : undefined,
    credit_limit: validateAmount(input.credit_limit, 0).value,
    current_balance: 0,
    credit_cycle: input.credit_cycle || 'MENSUAL',
    payment_due_date: input.payment_due_date || undefined,
    terms_accepted: Boolean(input.terms_accepted),
    terms_accepted_at: input.terms_accepted ? new Date().toISOString() : undefined,
    terms_acceptance_method: input.terms_accepted ? 'IN_STORE_PIN' : undefined,
    ...(input.payment_due_date
      ? { terms_acceptance_metadata: { payment_due_date: input.payment_due_date } }
      : {}),
    qr_token: token,
    security_pin: pin,
    pin_hash: `$2a$06$fakehash_${pin}`,
    is_blocked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const updated = deduplicateCustomers([newCust, ...customers]);
  saveCustomers(updated);
  return newCust;
}

export function acceptCustomerTerms(
  customerId: string,
  enteredPin: string,
  method: 'PORTAL_PIN' | 'IN_STORE_PIN' = 'PORTAL_PIN',
  cycle: CreditCycle = 'MENSUAL'
): { success: boolean; customer?: Customer; error?: string } {
  const { customers } = getStoredData();
  const customerIndex = customers.findIndex((c) => c.id === customerId);

  if (customerIndex === -1) {
    return { success: false, error: 'Cliente no encontrado' };
  }

  const cust = customers[customerIndex];

  // Verificar PIN de seguridad del cliente con comparación de tiempo constante
  if (cust.security_pin && !safeCompare(enteredPin.trim(), cust.security_pin.trim())) {
    return { success: false, error: 'El PIN de 4 dígitos ingresado es incorrecto' };
  }

  const updatedCust: Customer = {
    ...cust,
    terms_accepted: true,
    terms_accepted_at: new Date().toISOString(),
    terms_acceptance_method: method,
    credit_cycle: cycle || cust.credit_cycle || 'MENSUAL',
    terms_acceptance_metadata: {
      ip: '190.128.45.10',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'ClientPortal',
      pinUsed: enteredPin.trim(),
      acceptedVersion: 'v1.0-Ley6534/20',
    },
    updated_at: new Date().toISOString(),
  };

  customers[customerIndex] = updatedCust;
  saveCustomers(customers);

  return { success: true, customer: updatedCust };
}
