import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@/types';
import { INITIAL_TENANT, INITIAL_TRANSACTIONS } from '@/lib/storage';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

declare global {
  // eslint-disable-next-line no-var
  var __LIBRETA_SHARED_TRANSACTIONS__: Map<string, Transaction[]> | undefined;
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || INITIAL_TENANT.id;
    const customerId = searchParams.get('customerId');

    if (!txStore.has(tenantId) && tenantId === INITIAL_TENANT.id) {
      txStore.set(INITIAL_TENANT.id, [...INITIAL_TRANSACTIONS]);
    }

    let txs = txStore.get(tenantId) || (tenantId === INITIAL_TENANT.id ? [...INITIAL_TRANSACTIONS] : []);

    const supabase = getServerSupabase();
    if (supabase) {
      try {
        let query = supabase.from('transactions').select('*').eq('tenant_id', tenantId);
        if (customerId) query = query.eq('customer_id', customerId);
        const { data } = await query.order('created_at', { ascending: false });
        if (data && data.length > 0) {
          const map = new Map<string, Transaction>();
          for (const t of data as Transaction[]) map.set(t.id, t);
          for (const t of txs) if (!map.has(t.id)) map.set(t.id, t);
          txs = Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          txStore.set(tenantId, txs);
        }
      } catch (e) {}
    }

    if (customerId) {
      txs = txs.filter((t) => t.customer_id === customerId);
    }

    return NextResponse.json({ success: true, transactions: txs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Error al obtener transacciones' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tx: Transaction = await req.json();
    if (!tx || !tx.tenant_id || !tx.customer_id) {
      return NextResponse.json({ success: false, error: 'Datos de transacción incompletos' }, { status: 400 });
    }

    const tenantId = tx.tenant_id;
    const currentTxs = txStore.get(tenantId) || (tenantId === INITIAL_TENANT.id ? [...INITIAL_TRANSACTIONS] : []);
    const updated = [tx, ...currentTxs.filter((t) => t.id !== tx.id)].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    txStore.set(tenantId, updated);

    // Actualizar saldo del cliente en el repositorio central de clientes
    if (globalThis.__LIBRETA_SHARED_CUSTOMERS__) {
      const custList = globalThis.__LIBRETA_SHARED_CUSTOMERS__.get(tenantId);
      if (custList) {
        const cIndex = custList.findIndex((c) => c.id === tx.customer_id);
        if (cIndex !== -1) {
          custList[cIndex] = {
            ...custList[cIndex],
            current_balance: tx.new_balance,
            updated_at: new Date().toISOString(),
          };
          globalThis.__LIBRETA_SHARED_CUSTOMERS__.set(tenantId, custList);
        }
      }
    }

    const supabase = getServerSupabase();
    if (supabase) {
      try {
        if (tenantId === INITIAL_TENANT.id) {
          await supabase.from('tenants').upsert(INITIAL_TENANT);
        }
        await supabase.from('transactions').upsert(tx);
        await supabase.from('customers').update({ current_balance: tx.new_balance }).eq('id', tx.customer_id);
      } catch (e) {}
    }

    return NextResponse.json({ success: true, transaction: tx });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Error al guardar transacción' }, { status: 500 });
  }
}
