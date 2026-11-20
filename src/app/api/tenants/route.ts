import { NextRequest, NextResponse } from 'next/server';
import { Tenant } from '@/types';
import { INITIAL_TENANT } from '@/lib/storage';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

declare global {
  // eslint-disable-next-line no-var
  var __LIBRETA_SHARED_TENANTS__: Map<string, Tenant> | undefined;
}

if (!globalThis.__LIBRETA_SHARED_TENANTS__) {
  globalThis.__LIBRETA_SHARED_TENANTS__ = new Map<string, Tenant>();
  // Inicializar con Don Mario para garantizar funcionamiento inmediato
  globalThis.__LIBRETA_SHARED_TENANTS__.set(INITIAL_TENANT.id, INITIAL_TENANT);
}

const tenantStore = globalThis.__LIBRETA_SHARED_TENANTS__;

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes('tu-proyecto') || url.includes('placeholder')) {
    return null;
  }

  try {
    return createSupabaseClient(url, key);
  } catch (err) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    // Consultar Supabase si está activo
    const supabase = getServerSupabase();
    if (supabase) {
      try {
        if (id) {
          const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
          if (data) {
            tenantStore.set(data.id, data);
            return NextResponse.json({ success: true, tenant: data });
          }
        } else {
          const { data } = await supabase.from('tenants').select('*').order('business_name');
          if (data && data.length > 0) {
            for (const t of data) {
              tenantStore.set(t.id, t);
            }
            return NextResponse.json({ success: true, tenants: data });
          }
        }
      } catch (e) {}
    }

    if (id) {
      const found = tenantStore.get(id) || INITIAL_TENANT;
      return NextResponse.json({ success: true, tenant: found });
    }

    const all = Array.from(tenantStore.values());
    return NextResponse.json({ success: true, tenants: all });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error al obtener comercios' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.id || !body.business_name) {
      return NextResponse.json({ success: false, error: 'Datos incompletos' }, { status: 400 });
    }

    tenantStore.set(body.id, body);

    const supabase = getServerSupabase();
    if (supabase) {
      try {
        await supabase.from('tenants').upsert(body);
      } catch (e) {}
    }

    return NextResponse.json({ success: true, tenant: body });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
