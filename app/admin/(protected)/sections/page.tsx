import { ActionForm, DeleteForm } from '@/components/admin-action-form';
import { deleteSection, saveSection } from '@/app/admin/actions';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { CmsPage, PageSection } from '@/lib/cms';

export const dynamic = 'force-dynamic';

function SectionForm({ section, pages }: { section?: PageSection; pages: CmsPage[] }) {
  return <ActionForm action={saveSection}><input type="hidden" name="id" value={section?.id || ''} /><div className="admin-form__grid"><div className="admin-field"><label>Page<select name="page_id" defaultValue={section?.page_id} required><option value="">Select a page</option>{pages.map((page) => <option value={page.id} key={page.id}>{page.title}</option>)}</select></label></div><div className="admin-field"><label>Section key<input name="key" maxLength={80} defaultValue={section?.key} placeholder="hero" required /></label></div><div className="admin-field"><label>Editor label<input name="label" maxLength={120} defaultValue={section?.label} required /></label></div><div className="admin-field"><label>Section type<select name="section_type" defaultValue={section?.section_type || 'rich-text'}><option value="hero">Hero</option><option value="rich-text">Rich text</option><option value="feature-list">Feature list</option><option value="image-gallery">Image gallery</option><option value="call-to-action">Call to action</option><option value="cards">Cards</option><option value="events">Events</option><option value="hours">Hours</option></select></label></div><div className="admin-field"><label>Display order<input name="sort_order" type="number" min="0" max="999" defaultValue={section?.sort_order ?? 0} required /></label></div></div><div className="admin-field"><label>Structured content (JSON)<textarea name="content_json" spellCheck="false" defaultValue={section ? JSON.stringify(section.content, null, 2) : '{\n  "title": ""\n}'} required /></label><small>Use the existing seeded section shape as a guide. Unsupported layout keys are ignored rather than changing site design.</small></div><label className="admin-checkbox"><input name="published" type="checkbox" defaultChecked={section?.published ?? true} /> Publish this section</label></ActionForm>;
}

export default async function SectionsAdminPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const [pagesResult, sectionsResult] = await Promise.all([supabase.from('pages').select('*').order('title'), supabase.from('page_sections').select('*').order('sort_order')]);
  const pages = (pagesResult.data ?? []) as CmsPage[];
  const sections = (sectionsResult.data ?? []) as PageSection[];
  const nameById = new Map(pages.map((page) => [page.id, page.title]));
  return <><header className="admin-header"><div><h1>Sections</h1><p>Update the approved content blocks that compose each public page. JSON controls content only; it does not expose typography, layout, or brand controls.</p></div></header><section className="admin-panel"><h2>Add section</h2><SectionForm pages={pages} /></section><section className="admin-panel"><h2>Existing sections</h2>{sections.length === 0 ? <div className="admin-empty">No sections have been seeded yet.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Page</th><th>Section</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>{sections.map((section) => <tr key={section.id}><td>{nameById.get(section.page_id) || 'Deleted page'}</td><td><strong>{section.label}</strong><br /><small>{section.key} · #{section.sort_order}</small></td><td>{section.section_type}</td><td>{section.published ? 'Published' : 'Draft'}</td><td className="actions"><details><summary className="admin-button admin-button--quiet">Edit</summary><div className="admin-panel"><SectionForm section={section} pages={pages} /></div></details><DeleteForm action={deleteSection} id={section.id} /></td></tr>)}</tbody></table></div>}</section></>;
}
