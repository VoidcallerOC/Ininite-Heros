import { ActionForm, DeleteForm } from '@/components/admin-action-form';
import { deleteCatalogSection, saveCatalogSection } from '@/app/admin/actions';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { CatalogSection } from '@/lib/cms';

export const dynamic = 'force-dynamic';

function CatalogForm({ section }: { section?: CatalogSection }) {
  return <ActionForm action={saveCatalogSection}><input type="hidden" name="id" value={section?.id || ''} /><div className="admin-form__grid"><div className="admin-field"><label>Catalog<select name="catalog_type" defaultValue={section?.catalog_type || 'comics'} required><option value="comics">Comics</option><option value="collectibles">Collectibles</option></select></label></div><div className="admin-field"><label>Section title<input name="title" maxLength={160} defaultValue={section?.title} placeholder="NEW COMICS" required /></label></div><div className="admin-field"><label>Display order<input name="sort_order" type="number" min="0" max="999" defaultValue={section?.sort_order ?? 10} required /></label></div><div className="admin-field"><label>Image URL<input name="image_url" type="text" defaultValue={section?.image_url || ''} placeholder="/assets/images/… or https://…" /></label></div><div className="admin-field"><label>Image alt text<input name="image_alt" maxLength={250} defaultValue={section?.image_alt || ''} /></label></div><div className="admin-field"><label>CTA text<input name="cta_label" maxLength={100} defaultValue={section?.cta_label} required /></label></div><div className="admin-field"><label>CTA link<input name="cta_href" maxLength={300} defaultValue={section?.cta_href || '/visit.html'} required /></label></div></div><div className="admin-field"><label>Description<textarea name="description" maxLength={1200} defaultValue={section?.description} required /></label></div><label className="admin-checkbox"><input name="enabled" type="checkbox" defaultChecked={section?.enabled ?? true} /> Show this section publicly</label></ActionForm>;
}

function CatalogGroup({ title, sections }: { title: string; sections: CatalogSection[] }) {
  return <section className="admin-panel"><h2>{title}</h2>{sections.length === 0 ? <div className="admin-empty">No sections yet.</div> : <div className="catalog-admin-grid">{sections.map((section, index) => <article className="catalog-admin-card" key={section.id}><div className="catalog-admin-card__number">{String(index + 1).padStart(2, '0')}</div>{section.image_url && <img src={section.image_url} alt={section.image_alt || ''} width="480" height="300" /> }<div className="catalog-admin-card__body"><h3>{section.title}</h3><p>{section.description}</p><small>Order {section.sort_order} · {section.enabled ? 'Published' : 'Hidden'} · CTA: {section.cta_label}</small><div className="catalog-admin-card__actions"><details><summary className="admin-button admin-button--quiet">Edit</summary><div className="admin-panel"><CatalogForm section={section} /></div></details><DeleteForm action={deleteCatalogSection} id={section.id} /></div></div></article>)}</div>}</section>;
}

export default async function CatalogAdminPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('catalog_sections').select('*').order('catalog_type').order('sort_order');
  const sections = (data ?? []) as CatalogSection[];
  return <><header className="admin-header"><div><h1>Comics &amp; Collectibles</h1><p>Manage the numbered sections displayed on the public Comics and Collectibles pages. Ordering, visibility, copy, images, and CTAs are content controls only; the visual system remains developer-controlled.</p></div></header><section className="admin-panel"><h2>Add section</h2><CatalogForm /></section>{error && <p className="admin-notice admin-notice--error">Catalog sections could not be loaded. Apply the Phase 4 migration before using this area.</p>}<CatalogGroup title="Comics" sections={sections.filter((section) => section.catalog_type === 'comics')} /><CatalogGroup title="Collectibles" sections={sections.filter((section) => section.catalog_type === 'collectibles')} /></>;
}
