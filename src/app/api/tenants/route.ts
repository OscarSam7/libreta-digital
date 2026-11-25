import { NextRequest, NextResponse } from 'next/server';
import { Tenant } from '@/types';
import {
  INITIAL_TENANT,
  cleanTenantForSupabase,
  restoreTenantFromSupabase,
  isSafeTenantImageUrl,
} from '@/lib/storage';
import { sanitizeText } from '@/lib/validation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

declare global {
  // eslint-disable-next-line no-var
  var __LIBRETA_SHARED_TENANTS__: Map<string, Tenant> | undefined;
}

if (!globalThis.__LIBRETA_SHARED_TENANTS__) {
  globalThis.__LIBRETA_SHARED_TENANTS__ = new Map<string, Tenant>();
  globalThis.__LIBRETA_SHARED_TENANTS__.set(INITIAL_TENANT.id, INITIAL_TENANT);
}

const tenantStore = globalThis.__LIBRETA_SHARED_TENANTS__;

function getReadSupabase() {
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

async function getWriteSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url.includes('tu-proyecto') || url.includes('placeholder')) {
    return null;
  }

  // 1. Service Role si está disponible
  if (serviceKey) {
    try {
      return createSupabaseClient(url, serviceKey);
    } catch {}
  }

  // 2. Cliente SSR con cookies de sesión del dueño autenticado (cumple RLS tenants_owner_update)
  try {
    const serverClient = await createServerSupabaseClient();
    if (serverClient) {
      return serverClient;
    }
  } catch {}

  // 3. Fallback anónimo
  if (anonKey) {
    try {
      return createSupabaseClient(url, anonKey);
    } catch {}
  }

  return null;
}

function getTenantTimestamp(t?: Partial<Tenant> | null): number {
  if (!t?.updated_at) return 0;
  const ms = new Date(t.updated_at).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function pickNewerTenant(a?: Tenant | null, b?: Tenant | null): Tenant | null {
  if (!a && !b) return null;
  if (!a) return b ? restoreTenantFromSupabase(b) : null;
  if (!b) return restoreTenantFromSupabase(a);
  const ra = restoreTenantFromSupabase(a);
  const rb = restoreTenantFromSupabase(b);
  return getTenantTimestamp(rb) > getTenantTimestamp(ra) ? rb : ra;
}

async function persistTenantToSupabase(
  supabase: any,
  tenant: Tenant
): Promise<{ synced: boolean; error?: string }> {
  try {
    const fullPayload: Record<string, any> = { ...cleanTenantForSupabase(tenant) };
    let updateFields: Record<string, any> = { ...fullPayload };
    delete updateFields.id;
    delete updateFields.created_at;

    let lastError: string | undefined;

    for (let attempt = 0; attempt < 6; attempt++) {
      // Intentar UPDATE directo primero (compatible con RLS tenants_owner_update sin insertar)
      const { data: updatedRows, error: updateErr } = await supabase
        .from('tenants')
        .update(updateFields)
        .eq('id', tenant.id)
        .select();

      if (!updateErr && Array.isArray(updatedRows) && updatedRows.length > 0) {
        return { synced: true };
      }

      if (updateErr) {
        lastError = `${updateErr.code || ''} ${updateErr.message}`.trim();
        const colMatch =
          updateErr.message?.match(/Could not find the '([^']+)' column/i) ||
          updateErr.message?.match(/column "([^"]+)" of relation/i);
        if (colMatch && colMatch[1] && colMatch[1] in updateFields) {
          delete updateFields[colMatch[1]];
          delete fullPayload[colMatch[1]];
          continue;
        }
      }

      // Si no existía fila aún, intentar INSERT
      const { data: insertedRows, error: insertErr } = await supabase
        .from('tenants')
        .insert(fullPayload)
        .select();

      if (!insertErr && Array.isArray(insertedRows) && insertedRows.length > 0) {
        return { synced: true };
      }

      if (insertErr) {
        lastError = `${insertErr.code || ''} ${insertErr.message}`.trim();
        const insColMatch =
          insertErr.message?.match(/Could not find the '([^']+)' column/i) ||
          insertErr.message?.match(/column "([^"]+)" of relation/i);
        if (insColMatch && insColMatch[1] && insColMatch[1] in fullPayload) {
          delete fullPayload[insColMatch[1]];
          delete updateFields[insColMatch[1]];
          continue;
        }
      }

      break;
    }

    return { synced: false, error: lastError || 'RLS o registro protegido en Supabase' };
  } catch (e: any) {
    return { synced: false, error: e?.message || 'Error al persistir en Supabase' };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const supabase = getReadSupabase();
    if (supabase) {
      try {
        // Garantizar que INITIAL_TENANT exista sin sobreescribir ediciones previas
        await supabase
          .from('tenants')
          .upsert(cleanTenantForSupabase(INITIAL_TENANT), {
            onConflict: 'id',
            ignoreDuplicates: true,
          });

        if (id) {
          const { data } = await supabase.from('tenants').select('*').eq('id', id).maybeSingle();
          const memTenant = tenantStore.get(id) || (id === INITIAL_TENANT.id ? INITIAL_TENANT : null);
          const sbTenant = data ? restoreTenantFromSupabase(data) : null;
          const best = pickNewerTenant(memTenant, sbTenant);
          if (best) {
            tenantStore.set(best.id, best);
            return NextResponse.json({ success: true, tenant: best }, { headers: NO_CACHE_HEADERS });
          }
        } else {
          const { data } = await supabase.from('tenants').select('*').order('business_name');
          if (Array.isArray(data) && data.length > 0) {
            const mergedList: Tenant[] = [];
            const seen = new Set<string>();

            for (const row of data) {
              const restored = restoreTenantFromSupabase(row);
              const best = pickNewerTenant(tenantStore.get(restored.id), restored) || restored;
              tenantStore.set(best.id, best);
              mergedList.push(best);
              seen.add(best.id);
            }

            for (const mem of tenantStore.values()) {
              if (!seen.has(mem.id)) {
                mergedList.push(restoreTenantFromSupabase(mem));
              }
            }

            if (!mergedList.some((t) => t.id === INITIAL_TENANT.id)) {
              mergedList.unshift(tenantStore.get(INITIAL_TENANT.id) || INITIAL_TENANT);
            }

            return NextResponse.json({ success: true, tenants: mergedList }, { headers: NO_CACHE_HEADERS });
          }
        }
      } catch {}
    }

    if (id) {
      const found = tenantStore.get(id) || (id === INITIAL_TENANT.id ? INITIAL_TENANT : null);
      if (found) {
        return NextResponse.json(
          { success: true, tenant: restoreTenantFromSupabase(found) },
          { headers: NO_CACHE_HEADERS }
        );
      }
      return NextResponse.json({ success: true, tenant: INITIAL_TENANT }, { headers: NO_CACHE_HEADERS });
    }

    const all = Array.from(tenantStore.values()).map((t) => restoreTenantFromSupabase(t));
    if (!all.some((t) => t.id === INITIAL_TENANT.id)) {
      all.unshift(INITIAL_TENANT);
    }
    return NextResponse.json({ success: true, tenants: all }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error al obtener comercios' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = sanitizeText(body?.id, 100);
    const businessName = sanitizeText(body?.business_name, 120);

    if (!id || !businessName) {
      return NextResponse.json(
        { success: false, error: 'El ID y el nombre del local son obligatorios.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const existing = tenantStore.get(id) || (id === INITIAL_TENANT.id ? INITIAL_TENANT : undefined);

    const resolveOptString = (key: keyof Tenant, maxLen: number): string | undefined => {
      if (key in body) {
        const val = sanitizeText(body[key], maxLen);
        return val || undefined;
      }
      const existingVal = existing?.[key];
      return typeof existingVal === 'string' && existingVal.trim() ? existingVal.trim() : undefined;
    };

    const resolveImageField = (key: 'logo_url' | 'cover_url'): string | undefined => {
      if (key in body) {
        const raw = typeof body[key] === 'string' ? body[key].trim() : '';
        if (!raw) return undefined;
        if (raw.length <= 600_000 && isSafeTenantImageUrl(raw)) {
          return raw;
        }
        return undefined;
      }
      const existingVal = existing?.[key];
      return isSafeTenantImageUrl(existingVal) ? existingVal : undefined;
    };

    const currencyCode = sanitizeText(body.currency_code || existing?.currency_code || 'PYG', 10) || 'PYG';
    const currencySymbol = sanitizeText(body.currency_symbol || existing?.currency_symbol || '₲', 10) || '₲';
    const nowIso = new Date().toISOString();

    const updatedTenant: Tenant = restoreTenantFromSupabase({
      ...existing,
      id,
      business_name: businessName,
      tax_id: resolveOptString('tax_id', 40),
      phone: resolveOptString('phone', 40),
      address: resolveOptString('address', 200),
      description: resolveOptString('description', 220),
      owner_name: resolveOptString('owner_name', 100),
      email: resolveOptString('email', 120),
      opening_hours: resolveOptString('opening_hours', 120),
      city: resolveOptString('city', 80),
      logo_url: resolveImageField('logo_url'),
      cover_url: resolveImageField('cover_url'),
      currency_code: currencyCode,
      currency_symbol: currencySymbol,
      subscription_plan: body.subscription_plan || existing?.subscription_plan || 'pro_monthly',
      sub_status: body.sub_status || existing?.sub_status || 'active',
      trial_ends_at: body.trial_ends_at || existing?.trial_ends_at || nowIso,
      subscription_ends_at: body.subscription_ends_at || existing?.subscription_ends_at || nowIso,
      created_at: body.created_at || existing?.created_at || nowIso,
      updated_at: nowIso,
    });

    tenantStore.set(updatedTenant.id, updatedTenant);

    const supabase = await getWriteSupabase();
    let cloudSync: { synced: boolean; error?: string } = {
      synced: false,
      error: 'Supabase no configurado',
    };
    if (supabase) {
      cloudSync = await persistTenantToSupabase(supabase, updatedTenant);
    }

    return NextResponse.json(
      {
        success: true,
        tenant: updatedTenant,
        cloud_synced: cloudSync.synced,
        ...(cloudSync.error ? { cloud_error: cloudSync.error } : {}),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error al guardar comercio' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PATCH(req: NextRequest) {
  return POST(req);
}
