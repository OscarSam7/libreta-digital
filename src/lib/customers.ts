import { Customer, CreditCycle } from '@/types';
import { getStoredData, saveCustomers } from '@/lib/storage';

export interface CreateCustomerInput {
  full_name: string;
  nickname?: string;
  document_id?: string;
  phone?: string;
  credit_limit: number;
  credit_cycle?: CreditCycle;
  terms_accepted?: boolean;
}

export function createNewCustomer(input: CreateCustomerInput): Customer {
  const { customers, tenant } = getStoredData();

  const token = 'cli-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
  const pin = Math.floor(1000 + Math.random() * 9000).toString();

  const newCust: Customer = {
    id: `cust-${Date.now()}`,
    tenant_id: tenant.id,
    full_name: input.full_name.trim(),
    nickname: input.nickname?.trim(),
    document_id: input.document_id?.trim(),
    phone: input.phone?.trim(),
    credit_limit: input.credit_limit || 0,
    current_balance: 0,
    credit_cycle: input.credit_cycle || 'MENSUAL',
    terms_accepted: Boolean(input.terms_accepted),
    terms_accepted_at: input.terms_accepted ? new Date().toISOString() : undefined,
    terms_acceptance_method: input.terms_accepted ? 'IN_STORE_PIN' : undefined,
    qr_token: token,
    security_pin: pin,
    pin_hash: `$2a$06$fakehash_${pin}`,
    is_blocked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const updated = [newCust, ...customers];
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

  // Verificar PIN de seguridad del cliente
  if (cust.security_pin && enteredPin.trim() !== cust.security_pin.trim()) {
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
