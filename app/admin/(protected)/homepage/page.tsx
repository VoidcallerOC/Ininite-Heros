import Link from 'next/link';
import { HomepageEditor } from '@/components/homepage-editor';
import { restoreHomepage } from '@/app/admin/actions';
import { ActionForm } from '@/components/admin-action-form';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { ContentRevision, PageSection } from '@/lib/cms';

export const dynamic = 'force-dynamic';

export default async function HomepageAdminPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data: page } = await supabase.from('pages').select('id').eq('slug', 'home').single();
  const sectionsResult = page ? await supabase.from('page_sections').select('*').eq('page_id', page.id).order('sort_order') : { data: [], error: null };
  const revisionsResult = page ? await supabase.from('content_revisions').select('*').eq('entity_type', 'page_sections').eq('entity_id', page.id).order('created_at', { ascending: false }).limit(8) : { data: [], error: null };
  const sections = (sectionsResult.data ?? []) as PageSection[];
  const revisions = (revisionsResult.data ?? []) as ContentRevision[];
  return <><header className="admin-header"><div><h1>Homepage</h1><p>Edit homepage business messaging, headings, descriptions, calls to action, and optional announcements without touching HTML, CSS, or layout code.</p></div><Link className="admin-button admin-button--quiet" href="/" target="_blank">Open public homepage ↗</Link></header><HomepageEditor sections={sections} /><section className="admin-panel"><h2>Restore history</h2><p>Each successful homepage save creates a snapshot before the change. Restoring also creates a safety snapshot before it replaces the current content.</p>{revisions.length === 0 ? <div className="admin-empty">No homepage revisions have been saved yet.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Saved</th><th>Revision</th><th>Action</th></tr></thead><tbody>{revisions.map((revision) => <tr key={revision.id}><td>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(revision.created_at))}</td><td>{revision.label}</td><td><ActionForm action={restoreHomepage} className="admin-form" submitLabel="Restore this version"><input type="hidden" name="revision_id" value={revision.id} /></ActionForm></td></tr>)}</tbody></table></div>}</section></>;
}
