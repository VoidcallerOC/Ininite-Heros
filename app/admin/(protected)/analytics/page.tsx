import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type AnalyticsRow = { path: string; referrer: string | null; occurred_at: string; session_id: string | null };

export default async function AnalyticsAdminPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data, error } = await supabase.from('analytics_events').select('path,referrer,occurred_at,session_id').gte('occurred_at', since).order('occurred_at', { ascending: false }).limit(5000);
  const events = (data ?? []) as AnalyticsRow[];
  const byPath = [...events.reduce((map, event) => map.set(event.path, (map.get(event.path) || 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]);
  const sessions = new Set(events.map((event) => event.session_id).filter(Boolean)).size;
  const days = Array.from({ length: 14 }, (_, index) => { const day = new Date(); day.setUTCHours(0, 0, 0, 0); day.setUTCDate(day.getUTCDate() - 13 + index); return day; });
  const dateKey = (date: Date) => date.toISOString().slice(0, 10);
  const counts = days.map((day) => ({ label: new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', timeZone: 'UTC' }).format(day), count: events.filter((event) => event.occurred_at.slice(0, 10) === dateKey(day)).length }));
  const max = Math.max(...counts.map((item) => item.count), 1);
  return <><header className="admin-header"><div><h1>Analytics</h1><p>Private, first-party page-view reporting for the last 14 days. The public tracker stores path, origin-only referrer, a session UUID, and timestamp—never admin or customer credentials.</p></div></header>{error && <p className="admin-notice admin-notice--error">Analytics could not be loaded. Set the server-only <code>SUPABASE_SERVICE_ROLE_KEY</code> to enable anonymous event ingestion.</p>}<div className="admin-grid"><div className="admin-card"><small>Page views</small><h2>{events.length}</h2><p>Last 14 days</p></div><div className="admin-card"><small>Anonymous sessions</small><h2>{sessions}</h2><p>Last 14 days</p></div><div className="admin-card"><small>Top page</small><h2 style={{ fontSize: '1.2rem', overflowWrap: 'anywhere' }}>{byPath[0]?.[0] || '—'}</h2><p>{byPath[0]?.[1] || 0} views</p></div></div><section className="admin-panel"><h2>Daily page views</h2><div className="admin-analytics-chart">{counts.map((item) => <div className="admin-analytics-bar" key={item.label}><span title={`${item.count} views`} style={{ height: `${Math.max(4, Math.round((item.count / max) * 100))}%` }} /><small>{item.label}</small></div>)}</div></section><section className="admin-panel"><h2>Top paths</h2>{byPath.length === 0 ? <div className="admin-empty">No first-party analytics events have been recorded yet.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Path</th><th>Views</th></tr></thead><tbody>{byPath.slice(0, 20).map(([path, count]) => <tr key={path}><td>{path}</td><td>{count}</td></tr>)}</tbody></table></div>}</section></>;
}
