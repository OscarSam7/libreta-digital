import { NextRequest, NextResponse } from 'next/server';
import { Customer } from '@/types';
import { sanitizeText, validateAmount } from '@/lib/validation';
import { INITIAL_CUSTOMERS, INITIAL_TENANT } from '@/lib/storage';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Repositorio en memoria compartido a nivel de servidor (Node / Edge runtime en Vercel)
// Permite que un cliente que se registre en su teléfono móvil aparezca DE INMEDIATO
// en la pantalla del almacenero sin importar que estén en dispositivos distintos
declare global {
  // eslint-disable-next-line no-var
  var __LIBRETA_SHARED_CUSTOMERS__: Map<string, Customer[]> | undefined;
}

if (!globalThis.__LIBRETA_SHARED_CUSTOMERS__) {
  globalThis.__LIBRETA_SHARED_CUSTOMERS__ = new Map<string, Customer[]>();
  // Inicializar clientes iniciales de Don Mario para que funcionen de manera real inmediata
  globalThis.__LIBRETA_SHARED_CUSTOMERS__.set(INITIAL_TENANT.id, [...INITIAL_CUSTOMERS]);
}

const customerStore = globalThis.__LIBRETA_SHARED_CUSTOMERS__;

// Helper para crear cliente Supabase server-side si las credenciales están configuradas
function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes('tu-proyecto') || url.includes('placeholder')) {
    return null;
  }

  try {
    return createSupabaseClient(url, key);
  } catch (err) {
    console.warn('Supabase server init notice:', err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const tenantId = searchParams.get('tenantId');

    // BÚSQUEDA POR TOKEN QR (Para visualización real en el celular del cliente /portal/[token])
    if (token) {
      // 1. Buscar en memoria compartida
      for (const [tId, custList] of customerStore.entries()) {
        const found = custList.find((c) => c.qr_token === token);
        if (found) {
          const tenant = tId === INITIAL_TENANT.id ? INITIAL_TENANT : null;
          return NextResponse.json({
            success: true,
            customer: found,
            tenant: tenant || INITIAL_TENANT,
          });
        }
      }

      // 2. Buscar en clientes base de Don Mario
      const initialMatch = INITIAL_CUSTOMERS.find((c) => c.qr_token === token);
      if (initialMatch) {
        return NextResponse.json({
          success: true,
          customer: initialMatch,
          tenant: INITIAL_TENANT,
        });
      }

      // 3. Buscar en Supabase
      const supabase = getServerSupabase();
      if (supabase) {
        try {
          const { data: cData } = await supabase.from('customers').select('*').eq('qr_token', token).single();
          if (cData) {
            const { data: tData } = await supabase.from('tenants').select('*').eq('id', cData.tenant_id).single();
            return NextResponse.json({
              success: true,
              customer: cData,
              tenant: tData || INITIAL_TENANT,
            });
          }
        } catch (e) {}
      }

      return NextResponse.json({ success: false, error: 'Código o cliente no encontrado' }, { status: 404 });
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId o token es requerido' },
        { status: 400 }
      );
    }

    if (tenantId === INITIAL_TENANT.id && !customerStore.has(INITIAL_TENANT.id)) {
      customerStore.set(INITIAL_TENANT.id, [...INITIAL_CUSTOMERS]);
    }

    const memoryList = customerStore.get(tenantId) || (tenantId === INITIAL_TENANT.id ? [...INITIAL_CUSTOMERS] : []);

    // Si Supabase está configurado, consultar también en Supabase y combinar
    const supabase = getServerSupabase();
    if (supabase) {
      try {
        if (tenantId === INITIAL_TENANT.id) {
          await supabase.from('tenants').upsert(INITIAL_TENANT);
        }

        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          // Combinar registros sin duplicar IDs
          const map = new Map<string, Customer>();
          if (tenantId === INITIAL_TENANT.id) {
            for (const c of INITIAL_CUSTOMERS) {
              map.set(c.id, c);
            }
          }
          for (const c of data as Customer[]) {
            map.set(c.id, c);
          }
          for (const c of memoryList) {
            if (!map.has(c.id)) {
              map.set(c.id, c);
            }
          }
          const combined = Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          customerStore.set(tenantId, combined);
          return NextResponse.json({ success: true, customers: combined });
        }
      } catch (sbErr) {
        console.warn('Error al consultar Supabase:', sbErr);
      }
    }

    return NextResponse.json({ success: true, customers: memoryList });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error al obtener clientes' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const tenantId = sanitizeText(body.tenant_id, 100);
    const fullName = sanitizeText(body.full_name, 100);

    if (!tenantId || !fullName) {
      return NextResponse.json(
        { success: false, error: 'tenant_id y full_name son obligatorios' },
        { status: 400 }
      );
    }

    const phone = sanitizeText(body.phone, 30);
    const nickname = body.nickname ? sanitizeText(body.nickname, 100) : undefined;
    const documentId = body.document_id ? sanitizeText(body.document_id, 30) : undefined;
    const qrToken = sanitizeText(body.qr_token, 100);
    const securityPin = body.security_pin ? String(body.security_pin).slice(0, 6) : '1234';
    const creditLimit = validateAmount(body.credit_limit, 0).value;
    const currentBalance = validateAmount(body.current_balance, 0).value;
    const registeredVia = body.registered_via || (body.phone?.includes('Excepción') ? 'EXCEPTION_NO_PHONE' : 'SELF_MOBILE_LINK');

    // Garantizar UUID válido para evitar rechazos en bases de datos relacionales
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const customerId = body.id && uuidRegex.test(body.id) ? body.id : crypto.randomUUID();

    const customer: Customer = {
      id: customerId,
      tenant_id: tenantId,
      full_name: fullName,
      nickname,
      document_id: documentId,
      phone,
      qr_token: qrToken,
      security_pin: securityPin,
      pin_hash: `$2a$06$hash_${securityPin}`,
      credit_limit: creditLimit,
      current_balance: currentBalance,
      is_blocked: Boolean(body.is_blocked),
      credit_cycle: body.credit_cycle || 'MENSUAL',
      terms_accepted: Boolean(body.terms_accepted),
      terms_accepted_at: body.terms_accepted_at || new Date().toISOString(),
      terms_acceptance_method: body.terms_acceptance_method || 'PORTAL_PIN',
      terms_acceptance_metadata: body.terms_acceptance_metadata || {
        registeredVia,
        registrationDate: new Date().toISOString(),
      },
      registered_via: registeredVia,
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Guardar en store compartido en servidor
    if (tenantId === INITIAL_TENANT.id && !customerStore.has(INITIAL_TENANT.id)) {
      customerStore.set(INITIAL_TENANT.id, [...INITIAL_CUSTOMERS]);
    }
    const currentList = customerStore.get(tenantId) || [];
    // Evitar duplicados por id o qr_token
    const filtered = currentList.filter((c) => c.id !== customer.id && c.qr_token !== customer.qr_token);
    const updated = [customer, ...filtered];
    customerStore.set(tenantId, updated);

    // 2. Guardar en Supabase si está disponible
    const supabase = getServerSupabase();
    if (supabase) {
      try {
        if (tenantId === INITIAL_TENANT.id) {
          await supabase.from('tenants').upsert(INITIAL_TENANT);
        }
        const { error: sbError } = await supabase.from('customers').upsert(customer);
        if (sbError) {
          console.warn('Supabase upsert warning:', sbError.message);
        }
      } catch (e) {
        console.warn('Supabase error on save:', e);
      }
    }

    return NextResponse.json({ success: true, customer });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error al guardar cliente' },
      { status: 500 }
    );
  }
}
