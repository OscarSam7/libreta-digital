import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si aún no se han configurado las claves reales en .env.local, retornar null
  // de forma segura para que la app opere con el motor contable reactivo sin crashear
  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes('tu-proyecto') ||
    supabaseUrl.includes('placeholder')
  ) {
    return null as any;
  }

  try {
    return createBrowserClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.warn('Supabase client init warning:', err);
    return null as any;
  }
}
