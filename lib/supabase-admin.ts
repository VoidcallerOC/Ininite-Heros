import 'server-only';

import { createClient } from '@supabase/supabase-js';

/**
 * This client is intentionally server-only. It is used only by the anonymous
 * analytics ingestion route, never by React components or browser JavaScript.
 */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
