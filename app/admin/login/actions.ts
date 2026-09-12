'use server';

import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { ActionState } from '@/lib/cms';

export async function sendLoginLink(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = z.string().email('Enter a valid email address.').safeParse(formData.get('email'));
  if (!email.success) return { status: 'error', message: email.error.issues[0]?.message || 'Enter a valid email address.' };
  try {
    const supabase = await createSupabaseServerClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const { error } = await supabase.auth.signInWithOtp({
      email: email.data,
      options: { emailRedirectTo: `${origin}/api/auth/callback?next=/admin` },
    });
    if (error) return { status: 'error', message: 'A sign-in link could not be sent. Check the Auth email provider configuration.' };
    return { status: 'success', message: 'Check your email for a secure sign-in link. Only accounts promoted to administrator can access the CMS.' };
  } catch {
    return { status: 'error', message: 'Authentication is not configured yet.' };
  }
}
