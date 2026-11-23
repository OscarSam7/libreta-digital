import { NextRequest, NextResponse } from 'next/server';
import { Customer, Transaction } from '@/types';
import {
  INITIAL_CUSTOMERS,
  INITIAL_TENANT,
  INITIAL_TRANSACTIONS,
  ensureValidUuid,
  restoreCustomerFromSupabase,
  restoreTransactionFromSupabase,
} from '@/lib/storage';
import { safeCompare } from '@/lib/security';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

declare global {
  // eslint-disable-next-line no-var
  var __LIBRETA_SHARED_TRANSACTIONS__: Map<string, Transaction[]> | undefined;
  // eslint-disable-next-line no-var
  var __LIBRETA_SHARED_CUSTOMERS__: Map<string, Customer[]> | undefined;
}

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('tu-proyecto') || url.includes('placeholder')) return null;
  try {
    return createSupabaseClient(url, key);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawTransactionId = body?.transactionId ? String(body.transactionId).trim() : '';
    const rawCustomerId = body?.customerId ? String(body.customerId).trim() : '';
    const rawTenantId = body?.tenantId ? String(body.tenantId).trim() : '';
    const qrToken = body?.qrToken ? String(body.qrToken).trim() : '';
    const method = body?.method ? String(body.method).trim() : 'REMOTE_QR_APPROVAL';
    const customerPin = body?.customerPin !== undefined && body?.customerPin !== null ? String(body.customerPin).trim() : '';
    const operationCode = body?.operationCode !== undefined && body?.operationCode !== null ? String(body.operationCode).trim() : '';

    if (!rawTransactionId) {
      return NextResponse.json(
        { success: false, error: 'Falta el identificador de la operación a certificar.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const normTxId = ensureValidUuid(rawTransactionId);
    const normCustUuid = rawCustomerId ? ensureValidUuid(rawCustomerId) : '';
    const supabase = getServerSupabase();

    // 1. Resolver transacción existente (Supabase -> memoria compartida -> INITIAL_TRANSACTIONS)
    let matchedTx: Transaction | null = null;
    if (supabase) {
      try {
        const { data: txRow } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', normTxId)
          .maybeSingle();
        if (txRow) {
          matchedTx = restoreTransactionFromSupabase(txRow);
        }
      } catch {}
    }

    if (!matchedTx && globalThis.__LIBRETA_SHARED_TRANSACTIONS__) {
      for (const list of globalThis.__LIBRETA_SHARED_TRANSACTIONS__.values()) {
        const found = list.find((t) => ensureValidUuid(t.id) === normTxId);
        if (found) {
          matchedTx = found;
          break;
        }
      }
    }

    if (!matchedTx) {
      const initialTx = INITIAL_TRANSACTIONS.find((t) => ensureValidUuid(t.id) === normTxId);
      if (initialTx) matchedTx = initialTx;
    }

    const effectiveCustomerUuid = normCustUuid || (matchedTx ? ensureValidUuid(matchedTx.customer_id) : '');

    // 2. Resolver cliente (Supabase -> memoria compartida -> INITIAL_CUSTOMERS)
    let matchedCustomer: Customer | null = null;
    if (supabase) {
      try {
        if (effectiveCustomerUuid) {
          const { data: cRow } = await supabase
            .from('customers')
            .select('*')
            .eq('id', effectiveCustomerUuid)
            .maybeSingle();
          if (cRow) matchedCustomer = restoreCustomerFromSupabase(cRow);
        }
        if (!matchedCustomer && qrToken) {
          const { data: cRow } = await supabase
            .from('customers')
            .select('*')
            .eq('qr_token', qrToken)
            .maybeSingle();
          if (cRow) matchedCustomer = restoreCustomerFromSupabase(cRow);
        }
      } catch {}
    }

    if (!matchedCustomer && globalThis.__LIBRETA_SHARED_CUSTOMERS__) {
      for (const list of globalThis.__LIBRETA_SHARED_CUSTOMERS__.values()) {
        const found = list.find(
          (c) =>
            (effectiveCustomerUuid && ensureValidUuid(c.id) === effectiveCustomerUuid) ||
            (qrToken && c.qr_token === qrToken)
        );
        if (found) {
          matchedCustomer = found;
          break;
        }
      }
    }

    if (!matchedCustomer) {
      const initFound = INITIAL_CUSTOMERS.find(
        (c) =>
          (effectiveCustomerUuid && ensureValidUuid(c.id) === effectiveCustomerUuid) ||
          (qrToken && c.qr_token === qrToken)
      );
      if (initFound) matchedCustomer = initFound;
    }

    if (!matchedCustomer) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado para certificar esta operación.' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // 3. Validar autorización criptográfica / PIN o código QR de operación
    if (method === 'QR_SCAN_IN_STORE') {
      if (qrToken && matchedCustomer.qr_token && !safeCompare(qrToken, matchedCustomer.qr_token)) {
        return NextResponse.json(
          { success: false, error: 'Este código QR pertenece a otro titular de cuenta.' },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }

      if (matchedTx && ensureValidUuid(matchedTx.customer_id) !== ensureValidUuid(matchedCustomer.id)) {
        return NextResponse.json(
          { success: false, error: 'La operación escaneada no corresponde a tu cuenta.' },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }

      if (!operationCode) {
        return NextResponse.json(
          { success: false, error: 'El código QR no contiene el token de autorización de compra.' },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }

      if (matchedTx?.validation_pin && !safeCompare(operationCode, String(matchedTx.validation_pin).trim())) {
        return NextResponse.json(
          { success: false, error: 'El código de operación del QR es inválido o expiró.' },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }
    } else {
      const storedPin = String(matchedCustomer.security_pin || '').trim();
      if (!customerPin || !storedPin || !safeCompare(customerPin, storedPin)) {
        return NextResponse.json(
          { success: false, error: 'El PIN secreto de 4 dígitos ingresado es incorrecto.' },
          { status: 401, headers: NO_CACHE_HEADERS }
        );
      }
    }

    // 4. Construir estado certificado atómico
    const validatedAt = new Date().toISOString();
    const tenantId = ensureValidUuid(rawTenantId || matchedTx?.tenant_id || matchedCustomer.tenant_id || INITIAL_TENANT.id);
    const validationMetadata = {
      ...(matchedTx?.validation_metadata || {}),
      certified_channel: method,
      certified_at: validatedAt,
    };

    const certifiedTx: Transaction = matchedTx
      ? {
          ...matchedTx,
          id: normTxId,
          status: 'CERTIFIED_BOTH',
          validated_at: validatedAt,
          validation_method: method,
          validation_metadata: validationMetadata,
        }
      : {
          id: normTxId,
          tenant_id: tenantId,
          customer_id: matchedCustomer.id,
          created_by: 'customer-portal-certify',
          type: 'DEBIT_PURCHASE',
          amount: 0,
          previous_balance: matchedCustomer.current_balance,
          new_balance: matchedCustomer.current_balance,
          description: 'Compra certificada',
          items: [],
          status: 'CERTIFIED_BOTH',
          validation_pin: operationCode || undefined,
          validated_at: validatedAt,
          validation_method: method,
          validation_metadata: validationMetadata,
          created_at: validatedAt,
        };

    // 5. Actualizar memoria compartida del servidor inmediatamente
    if (!globalThis.__LIBRETA_SHARED_TRANSACTIONS__) {
      globalThis.__LIBRETA_SHARED_TRANSACTIONS__ = new Map<string, Transaction[]>();
    }
    const storeTxs = globalThis.__LIBRETA_SHARED_TRANSACTIONS__.get(tenantId) || [];
    const txIdx = storeTxs.findIndex((t) => ensureValidUuid(t.id) === normTxId);
    if (txIdx !== -1) {
      storeTxs[txIdx] = {
        ...storeTxs[txIdx],
        status: 'CERTIFIED_BOTH',
        validated_at: validatedAt,
        validation_method: method,
        validation_metadata: validationMetadata,
      };
      globalThis.__LIBRETA_SHARED_TRANSACTIONS__.set(tenantId, storeTxs);
    } else if (matchedTx) {
      globalThis.__LIBRETA_SHARED_TRANSACTIONS__.set(tenantId, [certifiedTx, ...storeTxs]);
    }

    const existingMeta =
      matchedCustomer.terms_acceptance_metadata && typeof matchedCustomer.terms_acceptance_metadata === 'object'
        ? matchedCustomer.terms_acceptance_metadata
        : {};
    const nextMeta = {
      ...existingMeta,
      certified_txs: {
        ...(existingMeta.certified_txs || {}),
        [normTxId]: {
          validated_at: validatedAt,
          validation_method: method,
        },
      },
    };

    const updatedCustomer: Customer = {
      ...matchedCustomer,
      terms_acceptance_metadata: nextMeta,
      updated_at: validatedAt,
    };

    if (globalThis.__LIBRETA_SHARED_CUSTOMERS__) {
      const custList = globalThis.__LIBRETA_SHARED_CUSTOMERS__.get(tenantId);
      if (custList) {
        const cIdx = custList.findIndex(
          (c) => ensureValidUuid(c.id) === ensureValidUuid(matchedCustomer!.id)
        );
        if (cIdx !== -1) {
          custList[cIdx] = {
            ...custList[cIdx],
            terms_acceptance_metadata: nextMeta,
            updated_at: validatedAt,
          };
          globalThis.__LIBRETA_SHARED_CUSTOMERS__.set(tenantId, custList);
        }
      }
    }

    // 6. Persistir en Supabase (UPDATE directo si la política lo permite + respaldo RLS en customers.terms_acceptance_metadata)
    let cloudSynced = false;
    if (supabase) {
      try {
        const { data: updatedRows, error: txUpdErr } = await supabase
          .from('transactions')
          .update({
            status: 'CERTIFIED_BOTH',
            validated_at: validatedAt,
            validation_method: method,
            validation_metadata: validationMetadata,
          })
          .eq('id', normTxId)
          .select('id');

        if (!txUpdErr && Array.isArray(updatedRows) && updatedRows.length > 0) {
          cloudSynced = true;
        }
      } catch {}

      try {
        const { error: custUpdErr } = await supabase
          .from('customers')
          .update({
            terms_acceptance_metadata: nextMeta,
          })
          .eq('id', matchedCustomer.id);

        if (!custUpdErr) {
          cloudSynced = true;
        }
      } catch {}
    } else {
      cloudSynced = true;
    }

    return NextResponse.json(
      {
        success: true,
        transaction: certifiedTx,
        customer: updatedCustomer,
        validated_at: validatedAt,
        validation_method: method,
        cloud_synced: cloudSynced,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Error al certificar operación' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
