import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  INITIAL_CUSTOMERS,
  INITIAL_TENANT,
  normalizeDocumentId,
  normalizePhone,
  restoreCustomerFromSupabase,
  deduplicateCustomers,
} from '@/lib/storage';
import { safeCompare } from '@/lib/security';
import { Customer, Tenant } from '@/types';

export const dynamic = 'force-dynamic';

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawIdentifier = String(body.identifier || '').trim();
    const rawPin = String(body.pin || '').trim();

    if (!rawIdentifier || !rawPin) {
      return NextResponse.json(
        { success: false, error: 'Ingresá tu Cédula o Teléfono y tu PIN de 4 dígitos.' },
        { status: 400 }
      );
    }

    const normDoc = normalizeDocumentId(rawIdentifier);
    const normPhone = normalizePhone(rawIdentifier);

    if (normDoc.length < 4 && normPhone.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Ingresá un número de Cédula o Teléfono válido.' },
        { status: 400 }
      );
    }

    let allCustomers: Customer[] = [...INITIAL_CUSTOMERS];
    const tenantMap = new Map<string, string>();
    tenantMap.set(INITIAL_TENANT.id, INITIAL_TENANT.business_name);

    // 1. Incluir memoria compartida del servidor si existe
    const globalCustomers = (globalThis as any).__LIBRETA_SHARED_CUSTOMERS__ as Map<string, Customer[]> | undefined;
    if (globalCustomers) {
      for (const list of globalCustomers.values()) {
        allCustomers = [...list, ...allCustomers];
      }
    }

    // 2. Consultar Supabase (fuente principal persistente)
    const supabase = getServerSupabase();
    if (supabase) {
      try {
        const [custRes, tenRes] = await Promise.all([
          supabase.from('customers').select('*'),
          supabase.from('tenants').select('id, business_name'),
        ]);

        if (tenRes.data) {
          for (const t of tenRes.data as Pick<Tenant, 'id' | 'business_name'>[]) {
            tenantMap.set(t.id, t.business_name);
          }
        }
        if (custRes.data && custRes.data.length > 0) {
          const restored = (custRes.data as any[]).map(restoreCustomerFromSupabase);
          allCustomers = [...restored, ...allCustomers];
        }
      } catch (err) {
        console.warn('Customer login Supabase query notice:', err);
      }
    }

    // Agrupar por tenant_id para deduplicar dentro de cada comercio sin fusionar cuentas de distintos comercios
    const byTenant = new Map<string, Customer[]>();
    for (const c of allCustomers) {
      const list = byTenant.get(c.tenant_id) || [];
      list.push(c);
      byTenant.set(c.tenant_id, list);
    }

    const matchedAccounts: {
      id: string;
      full_name: string;
      qr_token: string;
      tenant_id: string;
      business_name: string;
      current_balance: number;
    }[] = [];

    let foundIdentifierButWrongPin = false;

    for (const [tId, list] of byTenant.entries()) {
      const deduped = deduplicateCustomers(list);
      for (const c of deduped) {
        const cDoc = normalizeDocumentId(c.document_id);
        const cPhone = normalizePhone(c.phone);

        const docMatch = Boolean(normDoc.length >= 4 && cDoc && cDoc === normDoc);
        const phoneMatch = Boolean(normPhone.length >= 6 && cPhone && cPhone === normPhone);

        if (docMatch || phoneMatch) {
          const storedPin = String(c.security_pin || '').trim();
          if (storedPin && safeCompare(storedPin, rawPin)) {
            matchedAccounts.push({
              id: c.id,
              full_name: c.full_name,
              qr_token: c.qr_token,
              tenant_id: tId,
              business_name: tenantMap.get(tId) || 'Almacén Adherido',
              current_balance: Number(c.current_balance) || 0,
            });
          } else {
            foundIdentifierButWrongPin = true;
          }
        }
      }
    }

    if (matchedAccounts.length === 0) {
      if (foundIdentifierButWrongPin) {
        return NextResponse.json(
          { success: false, error: 'El PIN de 4 dígitos ingresado es incorrecto.' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: 'No encontramos ninguna cuenta con esa Cédula o Teléfono. Verificá los datos o registrate primero.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      accounts: matchedAccounts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Error al verificar acceso de cliente' },
      { status: 500 }
    );
  }
}
