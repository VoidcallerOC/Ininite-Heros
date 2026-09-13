'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { ActionState } from '@/lib/cms';

export async function signInWithPassword(_state: ActionState, formData: FormData): Promise<ActionState> {
  const credentials = z.object({ email: z.string().email('Enter a valid email address.'), password: z.string().min(1, 'Enter your password.') }).safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!credentials.success) return { status: 'error', message: credentials.error.issues[0]?.message || 'Enter your email and password.' };
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword(credentials.data);
    if (error || !authData.user) return { status: 'error', message: 'Invalid administrator email or password.' };
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
    if (profileError || profile?.role !== 'admin') {
      await supabase.auth.signOut();
      return { status: 'error', message: 'This account is not authorized to access the administrator dashboard.' };
    }
  } catch {
    return { status: 'error', message: 'Authentication is not configured yet.' };
  }
  redirect('/admin');
}
