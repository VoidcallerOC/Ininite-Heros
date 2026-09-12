import { ActionForm, DeleteForm } from '@/components/admin-action-form';
import { MediaUpload } from '@/components/media-upload';
import { deleteMedia, saveMedia } from '@/app/admin/actions';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { MediaAsset } from '@/lib/cms';

export const dynamic = 'force-dynamic';

function MediaForm({ asset }: { asset?: MediaAsset }) {
  return <ActionForm action={saveMedia}><input type="hidden" name="id" value={asset?.id || ''} /><div className="admin-form__grid"><div className="admin-field"><label>Media name<input name="name" maxLength={140} defaultValue={asset?.name} required /></label></div><div className="admin-field"><label>Alt text<input name="alt_text" maxLength={250} defaultValue={asset?.alt_text} required /></label></div><div className="admin-field"><label>Image URL<input name="url" type="url" defaultValue={asset?.url} required /></label></div><div className="admin-field"><label>MIME type<input name="mime_type" defaultValue={asset?.mime_type || 'image/webp'} required /></label></div><div className="admin-field"><label>Width<input name="width" type="number" min="1" defaultValue={asset?.width || ''} /></label></div><div className="admin-field"><label>Height<input name="height" type="number" min="1" defaultValue={asset?.height || ''} /></label></div><div className="admin-field"><label>Storage<select name="storage_provider" defaultValue={asset?.storage_provider || 'public'}><option value="public">Bundled public asset</option><option value="vercel_blob">Vercel Blob</option></select></label></div></div></ActionForm>;
}

export default async function MediaAdminPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('media').select('*').order('created_at', { ascending: false });
  const assets = (data ?? []) as MediaAsset[];
  return <><header className="admin-header"><div><h1>Media</h1><p>Upload images to Vercel Blob or register an existing URL. Descriptive alt text is required so content updates preserve accessibility.</p></div></header><section className="admin-panel"><h2>Upload a new image</h2><MediaUpload /></section><section className="admin-panel"><h2>Register an image URL</h2><MediaForm /></section><section className="admin-panel"><h2>Media library</h2>{error && <p className="admin-notice admin-notice--error">Media could not be loaded.</p>}{assets.length === 0 ? <div className="admin-empty">No media records have been created.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Preview</th><th>Media</th><th>Source</th><th>Actions</th></tr></thead><tbody>{assets.map((asset) => <tr key={asset.id}><td><img src={asset.url} alt="" width="90" height="60" style={{ objectFit: 'cover', borderRadius: 4 }} /></td><td><strong>{asset.name}</strong><br /><small>{asset.alt_text}</small></td><td>{asset.storage_provider}<br /><small>{asset.mime_type}</small></td><td className="actions"><details><summary className="admin-button admin-button--quiet">Edit</summary><div className="admin-panel"><MediaForm asset={asset} /></div></details><DeleteForm action={deleteMedia} id={asset.id} /></td></tr>)}</tbody></table></div>}</section></>;
}
