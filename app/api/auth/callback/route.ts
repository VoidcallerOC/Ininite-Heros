import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/admin';
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeNext(requestUrl.searchParams.get('next'));
  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch {
      // Fall through to a safe login error; configuration and auth errors stay private.
    }
  }
  return NextResponse.redirect(new URL('/admin/login?message=The%20sign-in%20link%20was%20invalid%20or%20expired.', requestUrl.origin));
}
