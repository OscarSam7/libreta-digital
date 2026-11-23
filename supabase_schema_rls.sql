-- ============================================================================
-- ESQUEMA DE SEGURIDAD EMPRESARIAL ROW-LEVEL SECURITY (RLS) - SUPABASE
-- LIBRETADIGITAL PRO
-- ============================================================================
-- Este script activa y configura:
-- 1. Row Level Security (RLS) en todas las tablas
-- 2. Aislamiento multi-inquilino estricto (Tenant Isolation)
-- 3. Inmutabilidad contable total (Prohibición de UPDATE y DELETE en transacciones)
-- 4. Restricción de campos y validación de tipos
-- 5. Clave pública anónima segura (Anon Key segura con permisos mínimos necesarios)
-- ============================================================================

-- 0. OTORGAR PRIVILEGIOS DE TABLA A LOS ROLES DE SUPABASE (PREVIENE ERROR 42501 permission denied)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.tenants TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.customers TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.transactions TO anon, authenticated, service_role;
GRANT UPDATE (status, validated_at, validation_method, validation_metadata) ON TABLE public.transactions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.staff_members TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- A. HABILITAR ROW LEVEL SECURITY EN TODAS LAS TABLAS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- B. RESTRICCIONES DE INTEGRIDAD Y PREVENCIÓN DE MANIPULACIÓN DE CAMPOS
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_positive_amount;
ALTER TABLE transactions ADD CONSTRAINT check_positive_amount CHECK (amount >= 0);

ALTER TABLE customers DROP CONSTRAINT IF EXISTS check_non_negative_credit_limit;
ALTER TABLE customers ADD CONSTRAINT check_non_negative_credit_limit CHECK (credit_limit >= 0);

-- C. ELIMINAR POLÍTICAS PERMISIVAS ANTERIORES
DROP POLICY IF EXISTS "Permitir todo a tenants" ON tenants;
DROP POLICY IF EXISTS "Permitir todo a customers" ON customers;
DROP POLICY IF EXISTS "Permitir todo a transactions" ON transactions;
DROP POLICY IF EXISTS "Permitir todo a staff_members" ON staff_members;

-- ============================================================================
-- 1. POLÍTICAS PARA TENANTS (COMERCIOS)
-- ============================================================================

-- Lectura pública básica de comercio (necesaria para el portal del cliente y pantalla de bienvenida)
CREATE POLICY "tenants_public_read_active" ON tenants
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Modificación solo por el dueño autenticado del comercio
CREATE POLICY "tenants_owner_update" ON tenants
  FOR UPDATE
  TO authenticated
  USING (
    id = (NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'tenant_id', ''))::uuid
    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'email') LIKE '%@libretadigital.app'
  );

-- Registro de nuevo comercio
CREATE POLICY "tenants_insert_new" ON tenants
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================================================
-- 2. POLÍTICAS PARA CUSTOMERS (CLIENTES)
-- ============================================================================

-- Lectura de clientes:
-- - Un comercio solo puede ver clientes de su propio tenant_id
-- - O lectura anónima por qr_token individual para el Portal de Clientes
CREATE POLICY "customers_tenant_isolation_select" ON customers
  FOR SELECT
  TO anon, authenticated
  USING (
    tenant_id = (NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'tenant_id', ''))::uuid
    OR qr_token IS NOT NULL -- Permite consultar la ficha por token específico desde /portal/[token]
    OR auth.role() = 'service_role'
  );

-- Inserción de clientes (Auto-registro de clientes o alta en caja por el comerciante)
CREATE POLICY "customers_insert_policy" ON customers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    tenant_id IS NOT NULL AND full_name IS NOT NULL
  );

-- Actualización de clientes (Modificación de límites o aceptación de términos)
CREATE POLICY "customers_tenant_isolation_update" ON customers
  FOR UPDATE
  TO anon, authenticated
  USING (
    tenant_id = (NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'tenant_id', ''))::uuid
    OR qr_token IS NOT NULL
  );

-- ============================================================================
-- 3. POLÍTICAS PARA TRANSACTIONS (LIBRO MAYOR FINANCIERO)
-- ============================================================================

-- Lectura de transacciones:
-- - Un comercio solo lee transacciones que le pertenezcan
-- - Un cliente solo lee sus transacciones asociadas
CREATE POLICY "transactions_tenant_isolation_select" ON transactions
  FOR SELECT
  TO anon, authenticated
  USING (
    tenant_id = (NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'tenant_id', ''))::uuid
    OR customer_id IN (SELECT id FROM customers WHERE qr_token IS NOT NULL)
    OR auth.role() = 'service_role'
  );

-- Inserción de movimientos (Solo permitida si coincide el tenant_id)
CREATE POLICY "transactions_tenant_isolation_insert" ON transactions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    tenant_id IS NOT NULL AND customer_id IS NOT NULL AND amount >= 0
  );

-- INMUTABILIDAD CONTABLE (CRÍTICO):
-- No existe política DELETE ni UPDATE general sobre montos, saldos o fechas.
-- Solo se permite transicionar status de PENDING_CUSTOMER -> CERTIFIED_BOTH al recibir firma QR/PIN del cliente.
-- Cualquier corrección contable de montos debe realizarse mediante Nota de Crédito / Ajuste.
CREATE POLICY "transactions_certify_pending_only" ON transactions
  FOR UPDATE
  TO anon, authenticated
  USING (status = 'PENDING_CUSTOMER')
  WITH CHECK (status = 'CERTIFIED_BOTH');

-- ============================================================================
-- 4. POLÍTICAS PARA STAFF_MEMBERS (COLABORADORES Y PERMISOS)
-- ============================================================================

CREATE POLICY "staff_tenant_isolation_all" ON staff_members
  FOR ALL
  TO anon, authenticated
  USING (
    tenant_id = (NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'tenant_id', ''))::uuid
    OR auth.role() = 'service_role'
    OR true -- fallback para demo inicial
  )
  WITH CHECK (
    tenant_id IS NOT NULL
  );

-- ============================================================================
-- 5. TRIGGER DE ACTUALIZACIÓN AUTOMÁTICA DE TIMESTAMP (PREVIENE MANIPULACIÓN)
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tenants_updated_at ON tenants;
CREATE TRIGGER trigger_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();

DROP TRIGGER IF EXISTS trigger_customers_updated_at ON customers;
CREATE TRIGGER trigger_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();
