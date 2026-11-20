export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';
export type TenantRole = 'owner' | 'cashier';

export type TransactionType =
  | 'DEBIT_PURCHASE'
  | 'CREDIT_PAYMENT'
  | 'ADJUSTMENT_DEBIT'
  | 'ADJUSTMENT_CREDIT';

export type PaymentMethod =
  | 'EFECTIVO'
  | 'TRANSFERENCIA'
  | 'PIX'
  | 'QR_BANCARIO'
  | 'TARJETA_DEBITO'
  | 'TARJETA_CREDITO';

export type ValidationStatus =
  | 'PENDING_CUSTOMER'
  | 'CERTIFIED_BOTH'
  | 'DISPUTED';

export interface Tenant {
  id: string;
  business_name: string;
  tax_id?: string;
  phone?: string;
  address?: string;
  currency_code: string;
  currency_symbol: string;
  logo_url?: string;
  subscription_plan: string;
  sub_status: SubscriptionStatus;
  trial_ends_at: string;
  subscription_ends_at?: string;
  created_at: string;
  updated_at: string;
}

export type CreditCycle = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';

export interface Customer {
  id: string;
  tenant_id: string;
  full_name: string;
  nickname?: string;
  document_id?: string;
  phone?: string;
  qr_token: string;
  pin_hash?: string;
  security_pin?: string;
  credit_limit: number;
  current_balance: number;
  is_blocked: boolean;
  terms_accepted?: boolean;
  terms_accepted_at?: string;
  terms_acceptance_method?: 'PORTAL_PIN' | 'IN_STORE_PIN' | 'MANUAL_SIGNATURE';
  terms_acceptance_metadata?: {
    ip?: string;
    userAgent?: string;
    pinUsed?: string;
    acceptedVersion?: string;
  };
  credit_cycle?: CreditCycle;
  registered_via?: 'SELF_MOBILE_LINK' | 'IN_STORE_COUNTER' | 'EXCEPTION_NO_PHONE';
  created_at: string;
  updated_at: string;
}

export interface TransactionItem {
  qty: number;
  name: string;
  price: number;
}

export interface Transaction {
  id: string;
  tenant_id: string;
  customer_id: string;
  created_by: string;
  operator_id?: string;
  operator_name?: string;
  type: TransactionType;
  amount: number;
  previous_balance: number;
  new_balance: number;
  description?: string;
  items: TransactionItem[];
  status: ValidationStatus;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  validated_at?: string;
  validation_method?: string;
  validation_metadata?: Record<string, any>;
  validation_pin?: string;
  blockchain_hash?: string;
  created_at: string;
}

export type StaffRole = 'OWNER' | 'ADMIN' | 'CASHIER' | 'COLLECTOR';

export interface StaffPermissions {
  can_register_sales: boolean;      // Cargar compras fiadas
  can_register_payments: boolean;   // Cargar cobros / abonos
  can_edit_credit_limits: boolean;  // Modificar límites de crédito de clientes
  can_adjust_credit_notes: boolean; // Emitir notas de crédito / anular asientos
  can_view_financial_reports: boolean; // Ver reportes de ventas, caja y morosidad
  can_manage_staff: boolean;        // Crear, editar y suspender colaboradores
}

export interface StaffMember {
  id: string;
  tenant_id: string;
  full_name: string;
  role: StaffRole;
  phone?: string;
  pin: string; // PIN de 4 dígitos para login rápido en el terminal POS
  is_active: boolean;
  permissions: StaffPermissions;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  actor_type: 'MERCHANT' | 'CUSTOMER';
  actor_id: string;
  action: string;
  target_id?: string;
  details?: Record<string, any>;
  created_at: string;
}
