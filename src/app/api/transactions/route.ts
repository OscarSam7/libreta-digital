import { NextRequest, NextResponse } from 'next/server';
import { Customer, Transaction } from '@/types';
import {
  INITIAL_TENANT,
  INITIAL_TRANSACTIONS,
  UUID_REGEX,
  cleanTransactionForSupabase,
  cleanTenantForSupabase,
  cleanCustomerForSupabase,
  restoreTransactionFromSupabase,
  deduplicateTransactions,
  ensureValidUuid,
} from '@/lib/storage';
import {
  reconcileCustomerTransactions,
  reconcileTransactionsByCustomer,
} from '@/lib/ledgerMath';
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

if (!globalThis.__LIBRETA_SHARED_TRANSACTIONS__) {
  globalThis.__LIBRETA_SHARED_TRANSACTIONS__ = new Map<string, Transaction[]>();
  // Pre-cargar transacciones iniciales del demo Don Mario
  globalThis.__LIBRETA_SHARED_TRANSACTIONS__.set(INITIAL_TENANT.id, [...INITIAL_TRANSACTIONS]);
}

const txStore = globalThis.__LIBRETA_SHARED_TRANSACTIONS__;

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('tu-proyecto') || url.includes('placeholder')) return null;
  try {
    return createSupabaseClient(url, key);
  } catch (err) {
    return null;
  }
}

async function ensureCustomerExistsInSupabase(
  supabase: any,
  tenantId: string,
  customerId: string
): Promise<void> {
  const sharedMap = globalThis.__LIBRETA_SHARED_CUSTOMERS__;
  if (!sharedMap) return;

  let matched: Customer | undefined;
  const tenantList = sharedMap.get(tenantId);
  if (tenantList) {
    matched = tenantList.find((c) => c.id === customerId || ensureValidUuid(c.id) === customerId);
  }
  if (!matched) {
    for (const list of sharedMap.values()) {
      matched = list.find((c) => c.id === customerId || ensureValidUuid(c.id) === customerId);
      if (matched) break;
    }
  }
  if (!matched) return;

  const custPayload: Record<string, any> = {
    ...cleanCustomerForSupabase(matched),
    id: customerId,
    tenant_id: tenantId,
  };

  for (let attempt = 0; attempt < 6; attempt++) {
    const { error } = await supabase.from('customers').insert(custPayload);
    if (!error || error.code === '23505') return;

    const colMatch =
      error.message?.match(/Could not find the '([^']+)' column/i) ||
      error.message?.match(/column "([^"]+)" of relation/i);
    if (colMatch && colMatch[1] && colMatch[1] in custPayload) {
      delete custPayload[colMatch[1]];
      continue;
    }
    break;
  }
}

async function markCertifiedInCustomerMetadata(
  supabase: any,
  customerId: string,
  txId: string,
  validatedAt: string,
  validationMethod: string
): Promise<void> {
  try {
    const { data: custRow } = await supabase
      .from('customers')
      .select('terms_acceptance_metadata')
      .eq('id', customerId)
      .maybeSingle();

    const existingMeta =
      custRow?.terms_acceptance_metadata && typeof custRow.terms_acceptance_metadata === 'object'
        ? custRow.terms_acceptance_metadata
        : {};
    const nextMeta = {
      ...existingMeta,
      certified_txs: {
        ...(existingMeta.certified_txs || {}),
        [txId]: {
          validated_at: validatedAt,
          validation_method: validationMethod,
        },
      },
    };
    await supabase
      .from('customers')
      .update({ terms_acceptance_metadata: nextMeta })
      .eq('id', customerId);
  } catch {}
}

function getCertifiedMarkersFromMemory(tenantId: string): Map<string, Record<string, { validated_at?: string; validation_method?: string }>> {
  const map = new Map<string, Record<string, { validated_at?: string; validation_method?: string }>>();
  const shared = globalThis.__LIBRETA_SHARED_CUSTOMERS__;
  if (!shared) return map;
  const custs = shared.get(tenantId) || [];
  for (const c of custs) {
    const markers = c?.terms_acceptance_metadata?.certified_txs;
    if (markers && typeof markers === 'object') {
      map.set(ensureValidUuid(c.id), markers);
    }
  }
  return map;
}

// Helper resiliente compatible con inmutabilidad RLS (transactions solo permite SELECT e INSERT)
async function persistTransactionToSupabase(
  supabase: any,
  tenantId: string,
  tx: Transaction
): Promise<{ synced: boolean; error?: string }> {
  try {
    if (tenantId === INITIAL_TENANT.id) {
      try {
        await supabase.from('tenants').insert(cleanTenantForSupabase(INITIAL_TENANT));
      } catch (e) {}
    }

    const payload: Record<string, any> = { ...cleanTransactionForSupabase(tx) };
    // Si el cliente ya certificó esta operación antes de que llegara la fila inicial, asentamos directamente certificada
    if (payload.status === 'PENDING_CUSTOMER') {
      const memMarkers = getCertifiedMarkersFromMemory(tenantId).get(payload.customer_id);
      const memCert = memMarkers?.[payload.id];
      if (memCert) {
        payload.status = 'CERTIFIED_BOTH';
        payload.validated_at = memCert.validated_at || new Date().toISOString();
        payload.validation_method = memCert.validation_method || 'QR_SCAN_IN_STORE';
      }
    }

    let retriedMissingCustomer = false;
    let lastError: string | undefined;

    for (let attempt = 0; attempt < 8; attempt++) {
      const { error } = await supabase.from('transactions').insert(payload);

      if (!error) {
        return { synced: true };
      }

      // El asiento ya existe en el libro inmutable (clave primaria duplicada)
      if (error.code === '23505') {
        if (payload.status === 'CERTIFIED_BOTH') {
          const validatedAt = payload.validated_at || new Date().toISOString();
          const validationMethod = payload.validation_method || 'REMOTE_QR_APPROVAL';
          let txUpdated = false;
          try {
            const { data: updRows, error: updErr } = await supabase
              .from('transactions')
              .update({
                status: 'CERTIFIED_BOTH',
                validated_at: validatedAt,
                validation_method: validationMethod,
                validation_metadata: payload.validation_metadata || {},
              })
              .eq('id', payload.id)
              .select('id');
            if (!updErr && Array.isArray(updRows) && updRows.length > 0) {
              txUpdated = true;
            }
          } catch {}
          if (!txUpdated) {
            await markCertifiedInCustomerMetadata(
              supabase,
              payload.customer_id,
              payload.id,
              validatedAt,
              validationMethod
            );
          }
        }
        return { synced: true };
      }

      lastError = `${error.code || ''} ${error.message || ''}`.trim();

      // Caso 1: Columna inexistente en el esquema desplegado (PGRST204 / 42703)
      const colMatch =
        error.message?.match(/Could not find the '([^']+)' column/i) ||
        error.message?.match(/column "([^"]+)" of relation/i);
      if (colMatch && colMatch[1] && colMatch[1] in payload) {
        delete payload[colMatch[1]];
        continue;
      }

      // Caso 2: Sintaxis UUID inválida en columna opcional en esquema previo (22P02)
      if (error.code === '22P02') {
        if ('created_by' in payload && !UUID_REGEX.test(String(payload.created_by || ''))) {
          delete payload.created_by;
          continue;
        }
        if ('operator_id' in payload && payload.operator_id && !UUID_REGEX.test(String(payload.operator_id))) {
          delete payload.operator_id;
          continue;
        }
      }

      // Caso 3: Violación de clave foránea porque el cliente aún no se persistió en Supabase (23503)
      if (error.code === '23503' && !retriedMissingCustomer) {
        retriedMissingCustomer = true;
        await ensureCustomerExistsInSupabase(supabase, tenantId, payload.customer_id);
        continue;
      }

      break;
    }

    return { synced: false, error: lastError };
  } catch (e: any) {
    return { synced: false, error: e?.message || 'Unexpected Supabase transaction insert error' };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || INITIAL_TENANT.id;
    const customerId = searchParams.get('customerId');
    const txId = searchParams.get('txId');
    const debugMode = searchParams.get('debug') === '1';

    if (!txStore.has(tenantId) && tenantId === INITIAL_TENANT.id) {
      txStore.set(INITIAL_TENANT.id, [...INITIAL_TRANSACTIONS]);
    }

    const memoryList = txStore.get(tenantId) || (tenantId === INITIAL_TENANT.id ? [...INITIAL_TRANSACTIONS] : []);
    let txs = memoryList;

    const supabase = getServerSupabase();
    let sbErrorMsg: string | null = null;
    let sbRowCount = 0;

    if (supabase) {
      try {
        let query = supabase.from('transactions').select('*').eq('tenant_id', tenantId);
        if (customerId) {
          query = query.eq('customer_id', ensureValidUuid(customerId));
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          sbRowCount = data.length;
          const restoredData = (data as any[]).map(restoreTransactionFromSupabase);
          // Conservar SIEMPRE todo el listado del comercio en txStore sin sobrescribir otros clientes
          const combinedTenantTxs = deduplicateTransactions([...restoredData, ...memoryList]).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          txStore.set(tenantId, combinedTenantTxs);
          txs = combinedTenantTxs;
        } else if (error) {
          sbErrorMsg = `${error.code || ''} ${error.message || ''}`.trim();
        }
      } catch (e: any) {
        sbErrorMsg = e?.message || 'Exception querying Supabase transactions';
      }
    }

    // Reconciliar asientos pendientes usando marcadores de certificación guardados en metadata de clientes (resiliencia RLS)
    const pendingCustomerIds = Array.from(
      new Set(
        txs
          .filter((t) => t.status === 'PENDING_CUSTOMER')
          .map((t) => ensureValidUuid(t.customer_id))
      )
    );

    if (pendingCustomerIds.length > 0) {
      const markerMap = getCertifiedMarkersFromMemory(tenantId);

      if (supabase) {
        try {
          const { data: custMetaRows } = await supabase
            .from('customers')
            .select('id, terms_acceptance_metadata')
            .in('id', pendingCustomerIds);

          if (Array.isArray(custMetaRows)) {
            for (const row of custMetaRows) {
              const markers = row?.terms_acceptance_metadata?.certified_txs;
              if (markers && typeof markers === 'object') {
                const cid = ensureValidUuid(row.id);
                markerMap.set(cid, { ...(markerMap.get(cid) || {}), ...markers });
              }
            }
          }
        } catch {}
      }

      if (markerMap.size > 0) {
        let anyPromoted = false;
        txs = txs.map((t) => {
          if (t.status !== 'PENDING_CUSTOMER') return t;
          const normCid = ensureValidUuid(t.customer_id);
          const normId = ensureValidUuid(t.id);
          const certMarker = markerMap.get(normCid)?.[normId];
          if (!certMarker) return t;
          anyPromoted = true;
          return {
            ...t,
            status: 'CERTIFIED_BOTH' as const,
            validated_at: certMarker.validated_at || t.validated_at || new Date().toISOString(),
            validation_method: certMarker.validation_method || t.validation_method || 'REMOTE_QR_APPROVAL',
          };
        });
        if (anyPromoted) {
          txStore.set(tenantId, txs);
        }
      }
    }

    const reconciledLedger = reconcileTransactionsByCustomer(txs, ensureValidUuid);
    txs = reconciledLedger.transactions;
    txStore.set(tenantId, txs);

    // Auto-sanar saldos en memoria del almacén compartido de clientes
    if (globalThis.__LIBRETA_SHARED_CUSTOMERS__ && reconciledLedger.balancesByCustomerKey.size > 0) {
      const custList = globalThis.__LIBRETA_SHARED_CUSTOMERS__.get(tenantId);
      if (custList && custList.length > 0) {
        let custChanged = false;
        const healedCusts = custList.map((c) => {
          const expected = reconciledLedger.balancesByCustomerKey.get(ensureValidUuid(c.id));
          if (expected !== undefined && c.current_balance !== expected) {
            custChanged = true;
            return { ...c, current_balance: expected };
          }
          return c;
        });
        if (custChanged) {
          globalThis.__LIBRETA_SHARED_CUSTOMERS__.set(tenantId, healedCusts);
        }
      }
    }

    let responseTxs = txs;
    if (customerId) {
      const targetCustomerUuid = ensureValidUuid(customerId);
      responseTxs = responseTxs.filter(
        (t) => t.customer_id === customerId || ensureValidUuid(t.customer_id) === targetCustomerUuid
      );
    }
    if (txId) {
      const targetTxUuid = ensureValidUuid(txId);
      responseTxs = responseTxs.filter((t) => t.id === txId || ensureValidUuid(t.id) === targetTxUuid);
    }

    return NextResponse.json(
      {
        success: true,
        transactions: responseTxs,
        ...(debugMode
          ? {
              debug: {
                supabase_configured: Boolean(supabase),
                supabase_rows: sbRowCount,
                memory_rows: memoryList.length,
                supabase_error: sbErrorMsg,
              },
            }
          : {}),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error al obtener transacciones' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

async function reconcileAndPersistCustomerBalance(
  supabase: any,
  tenantId: string,
  customerId: string,
  extraTransactions: Transaction[]
): Promise<{ currentBalance: number; transactionsDesc: Transaction[] }> {
  const normCustId = ensureValidUuid(customerId);
  const currentTenantTxs = txStore.get(tenantId) || (tenantId === INITIAL_TENANT.id ? [...INITIAL_TRANSACTIONS] : []);
  const memCustTxs = currentTenantTxs.filter((t) => ensureValidUuid(t.customer_id) === normCustId);

  let sbCustTxs: Transaction[] = [];
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', normCustId);
      if (!error && Array.isArray(data)) {
        sbCustTxs = data.map(restoreTransactionFromSupabase);
      }
    } catch {}
  }

  const combinedCustTxs = deduplicateTransactions([...sbCustTxs, ...extraTransactions, ...memCustTxs]);
  const reconciled = reconcileCustomerTransactions(combinedCustTxs);

  const otherTxs = currentTenantTxs.filter((t) => ensureValidUuid(t.customer_id) !== normCustId);
  const nextTenantTxs = deduplicateTransactions([...reconciled.transactionsDesc, ...otherTxs]).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  txStore.set(tenantId, nextTenantTxs);

  const nowIso = new Date().toISOString();
  if (globalThis.__LIBRETA_SHARED_CUSTOMERS__) {
    const custList = globalThis.__LIBRETA_SHARED_CUSTOMERS__.get(tenantId);
    if (custList) {
      const cIndex = custList.findIndex(
        (c) => c.id === customerId || ensureValidUuid(c.id) === normCustId
      );
      if (cIndex !== -1) {
        custList[cIndex] = {
          ...custList[cIndex],
          current_balance: reconciled.currentBalance,
          updated_at: nowIso,
        };
        globalThis.__LIBRETA_SHARED_CUSTOMERS__.set(tenantId, custList);
      }
    }
  }

  if (supabase && combinedCustTxs.length > 0) {
    try {
      await supabase
        .from('customers')
        .update({ current_balance: reconciled.currentBalance, updated_at: nowIso })
        .eq('id', normCustId);
    } catch {}
  }

  return {
    currentBalance: reconciled.currentBalance,
    transactionsDesc: reconciled.transactionsDesc,
  };
}

export async function POST(req: NextRequest) {
  try {
    const rawTx: Transaction = await req.json();
    if (!rawTx || !rawTx.tenant_id || !rawTx.customer_id) {
      return NextResponse.json(
        { success: false, error: 'Datos de transacción incompletos' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const normalizedTx: Transaction = {
      ...rawTx,
      id: ensureValidUuid(rawTx.id),
      tenant_id: ensureValidUuid(rawTx.tenant_id),
      customer_id: ensureValidUuid(rawTx.customer_id),
      amount: Number(rawTx.amount) || 0,
      previous_balance: Number(rawTx.previous_balance) || 0,
      new_balance: Number(rawTx.new_balance) || 0,
      items: Array.isArray(rawTx.items) ? rawTx.items : [],
      created_at: rawTx.created_at || new Date().toISOString(),
    };

    const tenantId = normalizedTx.tenant_id;
    const currentTxs = txStore.get(tenantId) || (tenantId === INITIAL_TENANT.id ? [...INITIAL_TRANSACTIONS] : []);
    const updated = deduplicateTransactions([normalizedTx, ...currentTxs]).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    txStore.set(tenantId, updated);

    const supabase = getServerSupabase();
    let cloudSync: { synced: boolean; error?: string } = {
      synced: false,
      error: 'Supabase no configurado',
    };
    if (supabase) {
      cloudSync = await persistTransactionToSupabase(supabase, tenantId, normalizedTx);
      if (!cloudSync.synced) {
        console.warn('Supabase transaction persist warning:', cloudSync.error);
      }
    }

    // Recalcular y persistir el saldo del cliente exclusivamente desde su historial cronológico completo
    const reconciledResult = await reconcileAndPersistCustomerBalance(
      supabase,
      tenantId,
      normalizedTx.customer_id,
      [normalizedTx]
    );
    const reconciledTx =
      reconciledResult.transactionsDesc.find((t) => ensureValidUuid(t.id) === normalizedTx.id) || normalizedTx;

    return NextResponse.json(
      {
        success: true,
        transaction: reconciledTx,
        current_balance: reconciledResult.currentBalance,
        cloud_synced: cloudSync.synced,
        ...(cloudSync.error ? { cloud_error: cloudSync.error } : {}),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error al guardar transacción' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
