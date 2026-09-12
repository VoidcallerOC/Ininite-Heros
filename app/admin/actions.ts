'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import type { ActionState } from '@/lib/cms';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { cardGameSchema, eventSchema, formBoolean, hourSchema, mediaSchema, nullableFormValue, pageSchema, sectionSchema, settingsSchema, socialSchema } from '@/lib/validation';

const success = (message: string): ActionState => ({ status: 'success', message });
const failure = (message: string): ActionState => ({ status: 'error', message });

function validationMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message || 'Please review the form and try again.';
}

function revalidatePublic() {
  ['/', '/comics.html', '/cards.html', '/collectibles.html', '/about.html', '/visit.html', '/sitemap.xml'].forEach((path) => revalidatePath(path));
}

async function adminClient() {
  await requireAdmin();
  return createSupabaseServerClient();
}

export async function savePage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = pageSchema.safeParse({
    id: nullableFormValue(formData, 'id') || undefined,
    slug: formData.get('slug'), title: formData.get('title'), seo_title: nullableFormValue(formData, 'seo_title'),
    seo_description: nullableFormValue(formData, 'seo_description'), og_image_url: nullableFormValue(formData, 'og_image_url'), published: formBoolean(formData, 'published'),
  });
  if (!parsed.success) return failure(validationMessage(parsed.error));
  try {
    const supabase = await adminClient();
    const { id, ...values } = parsed.data;
    const query = id ? supabase.from('pages').update(values).eq('id', id) : supabase.from('pages').insert(values);
    const { error } = await query;
    if (error) return failure(error.code === '23505' ? 'A page with that URL slug already exists.' : 'The page could not be saved.');
    revalidatePublic();
    return success('Page saved and public routes revalidated.');
  } catch { return failure('Authorization failed. Please sign in again.'); }
}

export async function deletePage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = nullableFormValue(formData, 'id');
  if (!id) return failure('Missing page ID.');
  try {
    const supabase = await adminClient();
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (error) return failure('The page could not be deleted.');
    revalidatePublic();
    return success('Page deleted.');
  } catch { return failure('Authorization failed.'); }
}

export async function saveSection(_state: ActionState, formData: FormData): Promise<ActionState> {
  let content: unknown;
  try { content = JSON.parse(String(formData.get('content_json') || '')); } catch { return failure('Section content must be valid JSON.'); }
  const parsed = sectionSchema.safeParse({
    id: nullableFormValue(formData, 'id') || undefined, page_id: formData.get('page_id'), key: formData.get('key'), label: formData.get('label'),
    section_type: formData.get('section_type'), content_json: formData.get('content_json'), sort_order: formData.get('sort_order'), published: formBoolean(formData, 'published'),
  });
  if (!parsed.success) return failure(validationMessage(parsed.error));
  if (!content || Array.isArray(content) || typeof content !== 'object') return failure('Section JSON must be an object.');
  try {
    const supabase = await adminClient();
    const { id, content_json: _content, ...values } = parsed.data;
    const payload = { ...values, content };
    const query = id ? supabase.from('page_sections').update(payload).eq('id', id) : supabase.from('page_sections').insert(payload);
    const { error } = await query;
    if (error) return failure(error.code === '23505' ? 'This page already has a section with that key.' : 'The section could not be saved.');
    revalidatePublic();
    return success('Section saved and public routes revalidated.');
  } catch { return failure('Authorization failed. Please sign in again.'); }
}

export async function deleteSection(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = nullableFormValue(formData, 'id');
  if (!id) return failure('Missing section ID.');
  try { const { error } = await (await adminClient()).from('page_sections').delete().eq('id', id); if (error) return failure('The section could not be deleted.'); revalidatePublic(); return success('Section deleted.'); } catch { return failure('Authorization failed.'); }
}

export async function saveMedia(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = mediaSchema.safeParse({ id: nullableFormValue(formData, 'id') || undefined, name: formData.get('name'), alt_text: formData.get('alt_text'), url: formData.get('url'), width: nullableFormValue(formData, 'width') ? formData.get('width') : null, height: nullableFormValue(formData, 'height') ? formData.get('height') : null, mime_type: formData.get('mime_type'), storage_provider: formData.get('storage_provider') });
  if (!parsed.success) return failure(validationMessage(parsed.error));
  try { const supabase = await adminClient(); const { id, ...values } = parsed.data; const { error } = await (id ? supabase.from('media').update(values).eq('id', id) : supabase.from('media').insert(values)); if (error) return failure('The media record could not be saved.'); revalidatePublic(); return success('Media record saved.'); } catch { return failure('Authorization failed.'); }
}

export async function deleteMedia(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = nullableFormValue(formData, 'id'); if (!id) return failure('Missing media ID.');
  try { const { error } = await (await adminClient()).from('media').delete().eq('id', id); if (error) return failure('The media record could not be deleted.'); revalidatePublic(); return success('Media record deleted.'); } catch { return failure('Authorization failed.'); }
}

export async function saveCardGame(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = cardGameSchema.safeParse({ id: nullableFormValue(formData, 'id') || undefined, name: formData.get('name'), slug: formData.get('slug'), description: formData.get('description'), image_url: nullableFormValue(formData, 'image_url'), active: formBoolean(formData, 'active'), sort_order: formData.get('sort_order') });
  if (!parsed.success) return failure(validationMessage(parsed.error));
  try { const supabase = await adminClient(); const { id, ...values } = parsed.data; const { error } = await (id ? supabase.from('card_games').update(values).eq('id', id) : supabase.from('card_games').insert(values)); if (error) return failure(error.code === '23505' ? 'A card game with that URL slug already exists.' : 'The card game could not be saved.'); revalidatePublic(); return success('Card game saved.'); } catch { return failure('Authorization failed.'); }
}

export async function deleteCardGame(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = nullableFormValue(formData, 'id'); if (!id) return failure('Missing card game ID.');
  try { const { error } = await (await adminClient()).from('card_games').delete().eq('id', id); if (error) return failure('The card game could not be deleted.'); revalidatePublic(); return success('Card game deleted.'); } catch { return failure('Authorization failed.'); }
}

export async function saveEvent(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = eventSchema.safeParse({ id: nullableFormValue(formData, 'id') || undefined, title: formData.get('title'), description: nullableFormValue(formData, 'description'), starts_at: formData.get('starts_at'), ends_at: nullableFormValue(formData, 'ends_at'), image_url: nullableFormValue(formData, 'image_url'), registration_url: nullableFormValue(formData, 'registration_url'), published: formBoolean(formData, 'published') });
  if (!parsed.success) return failure(validationMessage(parsed.error));
  if (parsed.data.ends_at && parsed.data.ends_at < parsed.data.starts_at) return failure('End time must be after the start time.');
  try { const supabase = await adminClient(); const { id, ...values } = parsed.data; const { error } = await (id ? supabase.from('events').update(values).eq('id', id) : supabase.from('events').insert(values)); if (error) return failure('The event could not be saved.'); revalidatePublic(); return success('Event saved.'); } catch { return failure('Authorization failed.'); }
}

export async function deleteEvent(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = nullableFormValue(formData, 'id'); if (!id) return failure('Missing event ID.');
  try { const { error } = await (await adminClient()).from('events').delete().eq('id', id); if (error) return failure('The event could not be deleted.'); revalidatePublic(); return success('Event deleted.'); } catch { return failure('Authorization failed.'); }
}

export async function saveSetting(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = settingsSchema.safeParse({ key: formData.get('key'), label: formData.get('label'), value: formData.get('value') });
  if (!parsed.success) return failure(validationMessage(parsed.error));
  try { const { error } = await (await adminClient()).from('site_settings').upsert(parsed.data, { onConflict: 'key' }); if (error) return failure('The setting could not be saved.'); revalidatePublic(); return success('Site setting saved.'); } catch { return failure('Authorization failed.'); }
}

export async function saveSocial(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = socialSchema.safeParse({ id: nullableFormValue(formData, 'id') || undefined, platform: formData.get('platform'), label: formData.get('label'), url: formData.get('url'), sort_order: formData.get('sort_order'), active: formBoolean(formData, 'active') });
  if (!parsed.success) return failure(validationMessage(parsed.error));
  try { const supabase = await adminClient(); const { id, ...values } = parsed.data; const { error } = await (id ? supabase.from('social_links').update(values).eq('id', id) : supabase.from('social_links').insert(values)); if (error) return failure('The social link could not be saved.'); revalidatePublic(); return success('Social link saved.'); } catch { return failure('Authorization failed.'); }
}

export async function deleteSocial(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = nullableFormValue(formData, 'id'); if (!id) return failure('Missing social link ID.');
  try { const { error } = await (await adminClient()).from('social_links').delete().eq('id', id); if (error) return failure('The social link could not be deleted.'); revalidatePublic(); return success('Social link deleted.'); } catch { return failure('Authorization failed.'); }
}

export async function saveHour(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = hourSchema.safeParse({ id: formData.get('id'), label: formData.get('label'), open_time: formData.get('open_time') || '', close_time: formData.get('close_time') || '', is_closed: formBoolean(formData, 'is_closed') });
  if (!parsed.success) return failure(validationMessage(parsed.error));
  const values = { label: parsed.data.label, open_time: parsed.data.is_closed ? null : parsed.data.open_time, close_time: parsed.data.is_closed ? null : parsed.data.close_time, is_closed: parsed.data.is_closed };
  try { const { error } = await (await adminClient()).from('business_hours').update(values).eq('id', parsed.data.id); if (error) return failure('The business hour could not be saved.'); revalidatePublic(); return success('Business hours saved.'); } catch { return failure('Authorization failed.'); }
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
