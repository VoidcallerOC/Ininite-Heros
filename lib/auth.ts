import 'server-only';

import { redirect } from 'next/navigation';
import type { Profile, Role } from '@/lib/cms';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { canManageContent } from '@/lib/authorization';

export async function requireAdmin(): Promise<{ userId: string; profile: Profile }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect('/admin/login?message=Sign%20in%20is%20required.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,role,created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || !canManageContent(profile.role as Role)) {
    redirect('/admin/login?message=Your%20account%20is%20not%20authorized%20for%20administration.');
  }

  return { userId: user.id, profile: profile as Profile };
}
