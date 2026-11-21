import { NextRequest, NextResponse } from 'next/server';
import { Customer, Transaction, Tenant, StaffMember } from '@/types';
import { INITIAL_CUSTOMERS, INITIAL_TENANT, INITIAL_STAFF, INITIAL_TRANSACTIONS, deduplicateCustomers, deduplicateTransactions } from '@/lib/storage';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes('tu-proyecto') || url.includes('placeholder')) {
    return null;
  }
  try {
    return createSupabaseClient(url, key);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    let tenants: Tenant[] = [INITIAL_TENANT];
    let customers: Customer[] = [...INITIAL_CUSTOMERS];
    let transactions: Transaction[] = [...INITIAL_TRANSACTIONS];
    let staff: StaffMember[] = [...INITIAL_STAFF];

    // Consultar Supabase si está disponible para extraer la totalidad de la nube
    const supabase = getServerSupabase();
    if (supabase) {
      try {
        const [tRes, cRes, txRes, sRes] = await Promise.all([
          supabase.from('tenants').select('*'),
          supabase.from('customers').select('*'),
          supabase.from('transactions').select('*'),
          supabase.from('staff_members').select('*'),
        ]);

        if (tRes.data && tRes.data.length > 0) tenants = tRes.data;
        if (cRes.data && cRes.data.length > 0) customers = deduplicateCustomers([...cRes.data, ...customers]);
        if (txRes.data && txRes.data.length > 0) transactions = deduplicateTransactions([...txRes.data, ...transactions]);
        if (sRes.data && sRes.data.length > 0) staff = sRes.data;
      } catch (sbErr) {
        console.warn('Error reading from Supabase for backup:', sbErr);
      }
    }

    // Consultar también stores compartidos en memoria si existen
    const globalCustomers = (globalThis as any).__LIBRETA_SHARED_CUSTOMERS__ as Map<string, Customer[]> | undefined;
    if (globalCustomers) {
      for (const list of globalCustomers.values()) {
        customers = deduplicateCustomers([...list, ...customers]);
      }
    }

    const globalTransactions = (globalThis as any).__LIBRETA_SHARED_TRANSACTIONS__ as Map<string, Transaction[]> | undefined;
    if (globalTransactions) {
      for (const list of globalTransactions.values()) {
        transactions = deduplicateTransactions([...list, ...transactions]);
      }
    }

    const timestamp = new Date().toISOString();
    const dateTag = timestamp.slice(0, 10);
    const totalBalance = customers.reduce((acc, c) => acc + (Number(c.current_balance) || 0), 0);
    const totalTransactionsAmount = transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const backupPayload = {
      app: 'LibretaDigital Pro',
      version: '2.4-PRO',
      backup_type: 'FULL_DISASTER_RECOVERY_SNAPSHOT',
      created_at: timestamp,
      summary: {
        total_tenants: tenants.length,
        total_customers: customers.length,
        total_transactions: transactions.length,
        total_staff_members: staff.length,
        total_street_capital_pyg: totalBalance,
        total_volume_transacted_pyg: totalTransactionsAmount,
      },
      data: {
        tenants,
        customers,
        transactions,
        staff,
      },
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="libretadigital_backup_${dateTag}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error al generar respaldo' },
      { status: 500 }
    );
  }
}
