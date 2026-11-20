-- ============================================================================
-- ESQUEMA COMPLETO Y DEFINITIVO PARA SUPABASE - LIBRETADIGITAL PRO
-- ============================================================================

-- 1. LIMPIEZA PREVIA LIMPIA
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS tenant_users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- 2. EXTENSIÓN PARA UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. TABLA DE COMERCIOS (TENANTS)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,
  tax_id TEXT,
  phone TEXT,
  address TEXT,
  currency_code TEXT DEFAULT 'PYG',
  currency_symbol TEXT DEFAULT '₲',
  logo_url TEXT,
  subscription_plan TEXT DEFAULT 'pro_monthly',
  sub_status TEXT DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  subscription_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE CLIENTES
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nickname TEXT,
  document_id TEXT,
  phone TEXT,
  qr_token TEXT UNIQUE NOT NULL,
  security_pin TEXT DEFAULT '1234',
  credit_limit NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  is_blocked BOOLEAN DEFAULT FALSE,
  credit_cycle TEXT DEFAULT 'MENSUAL',
  terms_accepted BOOLEAN DEFAULT FALSE,
  terms_accepted_at TIMESTAMPTZ,
  terms_acceptance_method TEXT,
  terms_acceptance_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA DEL LIBRO MAYOR (TRANSACTIONS)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  created_by TEXT DEFAULT 'user-owner-001',
  type TEXT NOT NULL, -- 'DEBIT_PURCHASE', 'CREDIT_PAYMENT', 'ADJUSTMENT_DEBIT', 'ADJUSTMENT_CREDIT'
  amount NUMERIC NOT NULL,
  previous_balance NUMERIC NOT NULL,
  new_balance NUMERIC NOT NULL,
  description TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  payment_method TEXT DEFAULT 'EFECTIVO',
  payment_reference TEXT,
  status TEXT DEFAULT 'CERTIFIED_BOTH',
  validation_pin TEXT,
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  validation_method TEXT DEFAULT 'IN_STORE_PIN',
  validation_metadata JSONB DEFAULT '{}'::jsonb,
  blockchain_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. POLÍTICAS DE SEGURIDAD (RLS)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo a tenants" ON tenants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- 7. DATOS DEMO INICIALES
INSERT INTO tenants (id, business_name, tax_id, phone, address, currency_code, currency_symbol, subscription_plan, sub_status)
VALUES (
  '019339aa-7824-7662-8e39-165f123d9101',
  'Almacén Don Mario',
  '80012345-6',
  '595981123456',
  'Avda. Principal 1420',
  'PYG',
  '₲',
  'pro_monthly',
  'active'
);

INSERT INTO customers (id, tenant_id, full_name, nickname, document_id, phone, qr_token, security_pin, credit_limit, current_balance, is_blocked, terms_accepted, terms_accepted_at, terms_acceptance_method, credit_cycle)
VALUES 
(
  '019339bb-7824-7662-8e39-165f123d9201',
  '019339aa-7824-7662-8e39-165f123d9101',
  'Roberto Gómez',
  'Don Roberto',
  '3.456.789',
  '595981444555',
  'rgomez-7b4c-4e89',
  '4921',
  350000,
  145000,
  false,
  true,
  NOW() - INTERVAL '15 days',
  'PORTAL_PIN',
  'MENSUAL'
),
(
  '019339bb-7824-7662-8e39-165f123d9202',
  '019339aa-7824-7662-8e39-165f123d9101',
  'Laura Benítez',
  'Vecina Laura (Casa 12)',
  '4.890.123',
  '595982666777',
  'lbenitez-992a-11f2',
  '8310',
  200000,
  245000,
  false,
  false,
  null,
  null,
  'QUINCENAL'
),
(
  '019339bb-7824-7662-8e39-165f123d9203',
  '019339aa-7824-7662-8e39-165f123d9101',
  'Carlos Mendoza',
  'El Mecánico',
  '2.789.654',
  '595983888999',
  'cmendoza-ff44-88aa',
  '1205',
  500000,
  0,
  false,
  true,
  NOW() - INTERVAL '5 days',
  'IN_STORE_PIN',
  'SEMANAL'
);

INSERT INTO transactions (id, tenant_id, customer_id, type, amount, previous_balance, new_balance, description, items, status, payment_method)
VALUES 
(
  '019339cc-7824-7662-8e39-165f123d9301',
  '019339aa-7824-7662-8e39-165f123d9101',
  '019339bb-7824-7662-8e39-165f123d9201',
  'DEBIT_PURCHASE',
  85000,
  0,
  85000,
  '2 Harinas 1kg, 1 Aceite 900ml, 1 Queso Paraguay',
  '[{"name": "Harina 1kg", "qty": 2, "price": 10000}, {"name": "Aceite 900ml", "qty": 1, "price": 15000}, {"name": "Queso Paraguay", "qty": 1, "price": 50000}]'::jsonb,
  'CERTIFIED_BOTH',
  'EFECTIVO'
),
(
  '019339cc-7824-7662-8e39-165f123d9302',
  '019339aa-7824-7662-8e39-165f123d9101',
  '019339bb-7824-7662-8e39-165f123d9201',
  'DEBIT_PURCHASE',
  60000,
  85000,
  145000,
  '1 Carne molida especial, 2 Gaseosas 2L',
  '[{"name": "Carne molida", "qty": 1, "price": 36000}, {"name": "Gaseosa 2L", "qty": 2, "price": 24000}]'::jsonb,
  'CERTIFIED_BOTH',
  'EFECTIVO'
);
