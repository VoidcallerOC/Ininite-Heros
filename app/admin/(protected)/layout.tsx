import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase-server';
import { signOut } from '@/app/admin/actions';

const navigation = [
  ['/','Dashboard'], ['/homepage', 'Homepage'], ['/pages', 'Pages'], ['/sections', 'Sections'], ['/catalog', 'Comics & Collectibles'], ['/media', 'Media'], ['/cards', 'Cards'], ['/events', 'Events'], ['/settings', 'Site Settings'], ['/analytics', 'Analytics'],
];

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!isSupabaseConfigured()) redirect('/admin/login?message=Supabase%20must%20be%20configured%20before%20the%20admin%20area%20can%20be%20used.');
  const { profile } = await requireAdmin();
  return <div className="admin-shell"><aside className="admin-sidebar"><Link href="/admin" className="admin-brand"><img src="/assets/images/infinite-heroes-logo.webp" width="620" height="394" alt="Infinite Heroes Comics" />CMS</Link><nav className="admin-nav" aria-label="CMS administration">{navigation.map(([path, label]) => <Link key={path} href={`/admin${path}`}>{label}</Link>)}</nav><div className="admin-sidebar__footer"><span className="admin-user">{profile.email || 'Administrator'}</span><Link href="/" target="_blank">View public site ↗</Link><form action={signOut}><button type="submit">Sign out</button></form></div></aside><main className="admin-main">{children}</main></div>;
}
