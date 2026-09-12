import { ActionForm, DeleteForm } from '@/components/admin-action-form';
import { deletePage, savePage } from '@/app/admin/actions';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { CmsPage } from '@/lib/cms';

export const dynamic = 'force-dynamic';

function PageForm({ page }: { page?: CmsPage }) {
  return <ActionForm action={savePage}><input type="hidden" name="id" value={page?.id || ''} /><div className="admin-form__grid"><div className="admin-field"><label>Internal title<input name="title" maxLength={140} defaultValue={page?.title} required /></label></div><div className="admin-field"><label>URL slug<input name="slug" maxLength={80} defaultValue={page?.slug} placeholder="cards" required /></label></div><div className="admin-field"><label>SEO title<input name="seo_title" maxLength={70} defaultValue={page?.seo_title || ''} /></label></div><div className="admin-field"><label>Social image URL<input name="og_image_url" type="url" defaultValue={page?.og_image_url || ''} placeholder="https://… or /assets/images/…" /></label></div></div><div className="admin-field"><label>SEO description<textarea name="seo_description" maxLength={160} defaultValue={page?.seo_description || ''} /></label></div><label className="admin-checkbox"><input name="published" type="checkbox" defaultChecked={page?.published ?? true} /> Publish this page</label></ActionForm>;
}

export default async function PagesAdminPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('pages').select('*').order('slug');
  const pages = (data ?? []) as CmsPage[];
  return <><header className="admin-header"><div><h1>Pages</h1><p>Manage public route metadata and publication status. Page sections are edited separately to preserve the layout system.</p></div></header>{error && <p className="admin-notice admin-notice--error">Pages could not be loaded.</p>}<section className="admin-panel"><h2>Add page</h2><PageForm /></section><section className="admin-panel"><h2>Existing pages</h2>{pages.length === 0 ? <div className="admin-empty">No pages have been seeded yet.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Page</th><th>URL</th><th>Status</th><th>Actions</th></tr></thead><tbody>{pages.map((page) => <tr key={page.id}><td><strong>{page.title}</strong><br /><small>{page.seo_title || 'No SEO title'}</small></td><td>/{page.slug === 'home' ? '' : `${page.slug}.html`}</td><td>{page.published ? 'Published' : 'Draft'}</td><td className="actions"><details><summary className="admin-button admin-button--quiet">Edit</summary><div className="admin-panel"><PageForm page={page} /></div></details><DeleteForm action={deletePage} id={page.id} /></td></tr>)}</tbody></table></div>}</section></>;
}
