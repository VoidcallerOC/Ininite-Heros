import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured() {
  return Boolean(url && key);
}

export function requireSupabaseConfiguration() {
  if (!url || !key) {
    throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return { url, key };
}

export async function createSupabaseServerClient() {
  const { url: supabaseUrl, key: supabaseKey } = requireSupabaseConfiguration();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. Middleware refreshes sessions instead.
        }
      },
    },
  });
}
