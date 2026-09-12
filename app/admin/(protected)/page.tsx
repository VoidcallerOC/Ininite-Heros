import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const [pages, sections, media, cardGames, events, views] = await Promise.all([
    supabase.from('pages').select('*', { count: 'exact', head: true }),
    supabase.from('page_sections').select('*', { count: 'exact', head: true }),
    supabase.from('media').select('*', { count: 'exact', head: true }),
    supabase.from('card_games').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).gte('occurred_at', new Date(Date.now() - 7 * 86400000).toISOString()),
  ]);
  const dashboardCards: Array<[string, number, string, string]> = [
    ['Pages', pages.count ?? 0, 'Managed public routes', '/admin/pages'],
    ['Sections', sections.count ?? 0, 'Structured content blocks', '/admin/sections'],
    ['Media', media.count ?? 0, 'Photos and image metadata', '/admin/media'],
    ['Cards', cardGames.count ?? 0, 'Card game listings', '/admin/cards'],
    ['Events', events.count ?? 0, 'Published or draft events', '/admin/events'],
    ['Views', views.count ?? 0, 'First-party page views in 7 days', '/admin/analytics'],
  ];
  return <><header className="admin-header"><div><h1>Dashboard</h1><p>Manage content without changing the approved Infinite Heroes visual system. Public changes are revalidated after every successful update.</p></div></header><div className="admin-grid">{dashboardCards.map(([label, count, detail, href]) => <Link className="admin-card" href={href} key={label}><small>{label}</small><h2>{count}</h2><p>{detail}</p></Link>)}</div><section className="admin-panel"><h2>CMS setup checkpoint</h2><p>The public content is seeded by the Supabase migration. The next required manual step is promoting the first authenticated owner account to <strong>admin</strong> in the Supabase SQL editor. This dashboard will remain inaccessible to ordinary authenticated users.</p><p><Link className="admin-button" href="/admin/settings">Review business settings</Link></p></section></>;
}
