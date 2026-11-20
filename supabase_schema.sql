-- ============================================================================
-- 1. EXTENSIONES Y TIPOS ENUMERADOS (ENUMS)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Estados de suscripción del comercio
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled');

-- Roles dentro de un comercio
CREATE TYPE tenant_role AS ENUM ('owner', 'cashier');

-- Tipos de movimiento en el libro mayor
CREATE TYPE transaction_type AS ENUM (
    'DEBIT_PURCHASE',   -- Cliente lleva mercadería (aumenta deuda)
    'CREDIT_PAYMENT',   -- Cliente realiza abono o pago total (disminuye deuda)
    'ADJUSTMENT_DEBIT', -- Ajuste por error a favor del comercio
    'ADJUSTMENT_CREDIT' -- Nota de crédito / anulación por error a favor del cliente
);

-- Estados de doble certificación
CREATE TYPE validation_status AS ENUM (
    'PENDING_CUSTOMER', -- Registrado por el comercio, esperando firma/PIN del cliente
    'CERTIFIED_BOTH',   -- Convalidado por ambas partes (inmutable)
    'DISPUTED'          -- El cliente reportó un desacuerdo en el monto/ítems
);

-- ============================================================================
-- 2. TABLAS PRINCIPALES
-- ============================================================================

-- A. COMERCIOS (Tenants / Acreedores)
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name TEXT NOT NULL,
    tax_id TEXT, -- RUC, CUIT, RUT, DNI comercial
    phone TEXT,
    address TEXT,
    currency_code TEXT NOT NULL DEFAULT 'PYG', -- Ej: PYG, BRL, PEN, ARS, USD
    currency_symbol TEXT NOT NULL DEFAULT '₲',
    logo_url TEXT,
    
    -- Gestión de Suscripción SaaS
    subscription_plan TEXT NOT NULL DEFAULT 'free_trial',
    sub_status subscription_status NOT NULL DEFAULT 'trialing',
    trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
    subscription_ends_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- B. USUARIOS DEL COMERCIO (Vinculados a auth.users de Supabase)
CREATE TABLE public.tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role tenant_role NOT NULL DEFAULT 'owner',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- C. CLIENTES DEUDORES (Cuentas Corrientes)
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    nickname TEXT, -- Ej: "Don Carlos", "Vecina María"
    document_id TEXT, -- Cédula / DNI
    phone TEXT, -- Formato internacional para WhatsApp (ej: 595981...)
    
    -- Identidad QR y Seguridad del Cliente
    qr_token UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(), -- Token único para la URL del QR
    pin_hash TEXT NOT NULL, -- PIN de 4 dígitos encriptado con pgcrypto para firmar compras
    
    -- Control Financiero
    credit_limit NUMERIC(15, 2) DEFAULT 0, -- 0 = sin límite definido
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Saldo deudor actual (calculado por trigger)
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE, -- Bloqueo manual de crédito
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- D. TRANSACCIONES / LIBRO MAYOR (Inmutable)
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    type transaction_type NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    
    -- Trazabilidad de saldos en el momento exacto de la operación
    previous_balance NUMERIC(15, 2) NOT NULL,
    new_balance NUMERIC(15, 2) NOT NULL,
    
    -- Detalle de mercadería o comprobante de pago
    description TEXT,
    items JSONB DEFAULT '[]'::jsonb, -- Ej: [{"qty": 2, "name": "Pan", "price": 5000}]
    
    -- Doble Certificación / Convalidación
    status validation_status NOT NULL DEFAULT 'PENDING_CUSTOMER',
    validated_at TIMESTAMPTZ,
    validation_method TEXT, -- Ej: 'IN_STORE_PIN', 'REMOTE_QR_APPROVAL'
    validation_metadata JSONB DEFAULT '{}'::jsonb, -- IP, User-Agent, etc.
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E. LOGS DE AUDITORÍA (Trazabilidad de seguridad)
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    actor_type TEXT NOT NULL, -- 'MERCHANT' o 'CUSTOMER'
    actor_id TEXT NOT NULL,   -- user_id o customer_id
    action TEXT NOT NULL,     -- Ej: 'CREATE_TX', 'CERTIFY_TX', 'UPDATE_LIMIT'
    target_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. ÍNDICES PARA RENDIMIENTO EN TIEMPO REAL
-- ============================================================================
CREATE INDEX idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX idx_customers_qr_token ON public.customers(qr_token);
CREATE INDEX idx_transactions_tenant_date ON public.transactions(tenant_id, created_at DESC);
CREATE INDEX idx_transactions_customer_date ON public.transactions(customer_id, created_at DESC);
CREATE INDEX idx_transactions_status ON public.transactions(tenant_id, status);

-- ============================================================================
-- 4. TRIGGERS DE INTEGRIDAD CONTABLE (CÁLCULO AUTOMÁTICO DE SALDOS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_current_balance NUMERIC(15, 2);
    v_credit_limit NUMERIC(15, 2);
    v_is_blocked BOOLEAN;
    v_sub_status subscription_status;
    v_trial_ends TIMESTAMPTZ;
    v_sub_ends TIMESTAMPTZ;
BEGIN
    SELECT sub_status, trial_ends_at, subscription_ends_at 
    INTO v_sub_status, v_trial_ends, v_sub_ends
    FROM public.tenants WHERE id = NEW.tenant_id;

    IF v_sub_status = 'canceled' OR v_sub_status = 'past_due' OR 
       (v_sub_status = 'trialing' AND v_trial_ends < NOW()) OR
       (v_sub_status = 'active' AND v_sub_ends IS NOT NULL AND v_sub_ends < NOW()) THEN
        RAISE EXCEPTION 'Suscripción vencida. Renueve su plan para registrar nuevos movimientos.';
    END IF;

    SELECT current_balance, credit_limit, is_blocked 
    INTO v_current_balance, v_credit_limit, v_is_blocked
    FROM public.customers 
    WHERE id = NEW.customer_id AND tenant_id = NEW.tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente no encontrado en este comercio.';
    END IF;

    IF NEW.type = 'DEBIT_PURCHASE' AND v_is_blocked THEN
        RAISE EXCEPTION 'El crédito de este cliente se encuentra bloqueado.';
    END IF;

    NEW.previous_balance := v_current_balance;

    IF NEW.type IN ('DEBIT_PURCHASE', 'ADJUSTMENT_DEBIT') THEN
        NEW.new_balance := v_current_balance + NEW.amount;
        
        IF NEW.type = 'DEBIT_PURCHASE' AND v_credit_limit > 0 AND NEW.new_balance > v_credit_limit THEN
            RAISE EXCEPTION 'La operación excede el límite de crédito autorizado para este cliente.';
        END IF;
    ELSE
        NEW.new_balance := v_current_balance - NEW.amount;
    END IF;

    UPDATE public.customers 
    SET current_balance = NEW.new_balance, updated_at = NOW()
    WHERE id = NEW.customer_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_before_insert_transaction
BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_new_transaction();

CREATE OR REPLACE FUNCTION public.protect_ledger_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Operación prohibida: El libro mayor es inmutable. Genere una nota de ajuste.';
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        IF OLD.amount <> NEW.amount OR OLD.type <> NEW.type OR OLD.customer_id <> NEW.customer_id THEN
            RAISE EXCEPTION 'Operación prohibida: No se pueden alterar montos ni tipos de transacciones registradas.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_transactions
BEFORE UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.protect_ledger_immutability();

-- ============================================================================
-- 5. SEGURIDAD A NIVEL DE FILA (ROW LEVEL SECURITY - RLS)
-- ============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_my_tenant_ids()
RETURNS SETOF UUID AS $$
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Comerciantes ven su propio comercio" ON public.tenants
    FOR SELECT USING (id IN (SELECT public.get_my_tenant_ids()));

CREATE POLICY "Dueños actualizan su comercio" ON public.tenants
    FOR UPDATE USING (id IN (
        SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND role = 'owner'
    ));

CREATE POLICY "Usuarios ven miembros de su comercio" ON public.tenant_users
    FOR SELECT USING (tenant_id IN (SELECT public.get_my_tenant_ids()));

CREATE POLICY "Comercio gestiona sus propios clientes" ON public.customers
    FOR ALL USING (tenant_id IN (SELECT public.get_my_tenant_ids()));

CREATE POLICY "Comercio ve sus transacciones" ON public.transactions
    FOR SELECT USING (tenant_id IN (SELECT public.get_my_tenant_ids()));

CREATE POLICY "Comercio inserta transacciones" ON public.transactions
    FOR INSERT WITH CHECK (tenant_id IN (SELECT public.get_my_tenant_ids()));

CREATE POLICY "Comercio actualiza estado de validación" ON public.transactions
    FOR UPDATE USING (tenant_id IN (SELECT public.get_my_tenant_ids()));

CREATE POLICY "Comercio ve sus logs de auditoría" ON public.audit_logs
    FOR SELECT USING (tenant_id IN (SELECT public.get_my_tenant_ids()));

-- ============================================================================
-- 6. FUNCIONES SEGURAS (RPC) PARA EL ACCESO QR DEL CLIENTE (SIN LOGIN)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_customer_statement_by_qr(p_qr_token UUID)
RETURNS JSONB AS $$
DECLARE
    v_customer RECORD;
    v_tenant RECORD;
    v_transactions JSONB;
BEGIN
    SELECT * INTO v_customer FROM public.customers WHERE qr_token = p_qr_token;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Código QR inválido o no encontrado');
    END IF;

    SELECT business_name, phone, currency_symbol, currency_code, logo_url 
    INTO v_tenant FROM public.tenants WHERE id = v_customer.tenant_id;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', t.id,
            'type', t.type,
            'amount', t.amount,
            'previous_balance', t.previous_balance,
            'new_balance', t.new_balance,
            'description', t.description,
            'items', t.items,
            'status', t.status,
            'validated_at', t.validated_at,
            'created_at', t.created_at
        ) ORDER BY t.created_at DESC
    ), '[]'::jsonb)
    INTO v_transactions
    FROM public.transactions t
    WHERE t.customer_id = v_customer.id;

    RETURN jsonb_build_object(
        'business', row_to_json(v_tenant),
        'customer', jsonb_build_object(
            'id', v_customer.id,
            'full_name', v_customer.full_name,
            'current_balance', v_customer.current_balance,
            'credit_limit', v_customer.credit_limit,
            'is_blocked', v_customer.is_blocked
        ),
        'transactions', v_transactions
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.certify_transaction_with_pin(
    p_qr_token UUID,
    p_transaction_id UUID,
    p_pin TEXT,
    p_method TEXT DEFAULT 'IN_STORE_PIN',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_customer RECORD;
    v_tx RECORD;
BEGIN
    SELECT * INTO v_customer FROM public.customers WHERE qr_token = p_qr_token;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cliente no válido');
    END IF;

    IF v_customer.pin_hash <> crypt(p_pin, v_customer.pin_hash) THEN
        RETURN jsonb_build_object('success', false, 'message', 'PIN de seguridad incorrecto');
    END IF;

    SELECT * INTO v_tx FROM public.transactions 
    WHERE id = p_transaction_id AND customer_id = v_customer.id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Operación no encontrada');
    END IF;

    IF v_tx.status = 'CERTIFIED_BOTH' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Esta operación ya fue certificada');
    END IF;

    UPDATE public.transactions
    SET status = 'CERTIFIED_BOTH',
        validated_at = NOW(),
        validation_method = p_method,
        validation_metadata = p_metadata
    WHERE id = p_transaction_id;

    INSERT INTO public.audit_logs (tenant_id, actor_type, actor_id, action, target_id, details)
    VALUES (v_customer.tenant_id, 'CUSTOMER', v_customer.id::text, 'CERTIFY_TX', p_transaction_id, p_metadata);

    RETURN jsonb_build_object('success', true, 'message', 'Operación certificada exitosamente');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE VIEW public.merchant_dashboard_kpis AS
SELECT 
    t.id AS tenant_id,
    COALESCE(SUM(c.current_balance) FILTER (WHERE c.current_balance > 0), 0) AS total_receivable,
    COUNT(c.id) FILTER (WHERE c.current_balance > 0) AS active_debtors_count,
    COUNT(c.id) AS total_customers_count,
    COALESCE((
        SELECT SUM(amount) FROM public.transactions tx 
        WHERE tx.tenant_id = t.id 
          AND tx.type = 'CREDIT_PAYMENT' 
          AND tx.created_at >= DATE_TRUNC('day', NOW())
    ), 0) AS collected_today,
    COALESCE((
        SELECT COUNT(*) FROM public.transactions tx 
        WHERE tx.tenant_id = t.id 
          AND tx.status = 'PENDING_CUSTOMER'
    ), 0) AS pending_certifications_count
FROM public.tenants t
LEFT JOIN public.customers c ON c.tenant_id = t.id
GROUP BY t.id;

ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
