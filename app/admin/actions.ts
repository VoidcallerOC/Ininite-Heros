'use server';

import { revalidatePath } from 'next/cache';
import { del } from '@vercel/blob';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import type { ActionState, Json, MediaAsset } from '@/lib/cms';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getMediaUsage } from '@/lib/media-usage';
import { cardGameSchema, cardsContentSchema, catalogSectionSchema, eventSchema, formBoolean, homeAnnouncementSchema, homeCtaSchema, homeHeroSchema, homeIntroSchema, homeSectionSchema, hourSchema, mediaSchema, nullableFormValue, pageSchema, sectionSchema, settingsSchema, socialSchema } from '@/lib/validation';

const success = (message: string): ActionState => ({ status: 'success', message });
const failure = (message: string): ActionState => ({ status: 'error', message });

function validationMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message || 'Please review the form and try again.';
}

function revalidatePublic() {
  ['/', '/comics.html', '/cards.html', '/collectibles.html', '/events.html', '/about.html', '/visit.html', '/sitemap.xml'].forEach((path) => revalidatePath(path));
}

async function adminClient() {
  await requireAdmin();
  return createSupabaseServerClient();
}

async function saveRevision(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, entityType: string, entityId: string, label: string, snapshot: unknown) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('content_revisions').insert({ entity_type: entityType, entity_id: entityId, label, snapshot, created_by: user?.id ?? null });
}

function parseJsonField(formData: FormData, key: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(String(formData.get(key) || '{}'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

export async function saveHomepage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const sections = ['hero', 'intro', 'categories', 'gallery', 'owner', 'visit', 'announcement', 'cta']
    .map((key) => [key, parseJsonField(formData, key)] as const)
    .filter((entry): entry is readonly [string, Record<string, unknown>] => Boolean(entry[1]));
  const hero = homeHeroSchema.safeParse(sections.find(([key]) => key === 'hero')?.[1]);
  const intro = homeIntroSchema.safeParse(sections.find(([key]) => key === 'intro')?.[1]);
  const categories = homeSectionSchema.safeParse(sections.find(([key]) => key === 'categories')?.[1]);
  const gallery = homeSectionSchema.safeParse(sections.find(([key]) => key === 'gallery')?.[1]);
  const owner = z.object({ eyebrow: z.string().trim().min(1).max(120), title: z.string().trim().min(1).max(160), body: z.array(z.string().trim().min(1).max(500)).min(1).max(3), buttonLabel: z.string().trim().min(1).max(80), buttonHref: z.string().trim().min(1).max(300), imageUrl: z.string().trim().min(1).max(1000), imageAlt: z.string().trim().min(1).max(250) }).safeParse(sections.find(([key]) => key === 'owner')?.[1]);
  const visit = homeSectionSchema.extend({ socialHeading: z.string().trim().min(1).max(160), socialCopy: z.string().trim().min(1).max(500) }).safeParse(sections.find(([key]) => key === 'visit')?.[1]);
  const announcement = homeAnnouncementSchema.safeParse(sections.find(([key]) => key === 'announcement')?.[1] ?? { enabled: false, eyebrow: 'Now at the shop', title: 'What is happening this week.', body: 'Announcements and promotions can be published here when there is something worth sharing.', buttonLabel: 'Visit the shop', buttonHref: '/visit.html' });
  const cta = homeCtaSchema.safeParse(sections.find(([key]) => key === 'cta')?.[1]);
  const invalid = [hero, intro, categories, gallery, owner, visit, announcement, cta].find((result) => !result.success);
  if (invalid && !invalid.success) return failure(validationMessage(invalid.error));
  try {
    const supabase = await adminClient();
    const { data: page, error: pageError } = await supabase.from('pages').select('id').eq('slug', 'home').single();
    if (pageError || !page) return failure('The homepage record could not be found.');
    const { data: currentSections } = await supabase.from('page_sections').select('*').eq('page_id', page.id);
    await saveRevision(supabase, 'page_sections', page.id, 'Homepage before save', currentSections ?? []);
    for (const [key, content] of sections) {
      const { error } = await supabase.from('page_sections').update({ content }).eq('page_id', page.id).eq('key', key);
      if (error) return failure(`The homepage ${key} section could not be saved.`);
    }
    revalidatePublic();
    return success('Homepage saved. The public site now uses the updated content, and the previous version is available under Restore history.');
  } catch { return failure('Authorization failed. Please sign in again.'); }
}

export async function restoreHomepage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const revisionId = nullableFormValue(formData, 'revision_id');
  if (!revisionId) return failure('Choose a revision to restore.');
  try {
    const supabase = await adminClient();
    const { data: revision, error } = await supabase.from('content_revisions').select('*').eq('id', revisionId).single();
    if (error || !revision || !Array.isArray(revision.snapshot)) return failure('That revision is unavailable.');
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('content_revisions').insert({ entity_type: 'page_sections', entity_id: revision.entity_id, label: 'Homepage before restore', snapshot: revision.snapshot, created_by: user?.id ?? null });
    for (const section of revision.snapshot as Array<{ key: string; content: Record<string, Json> }>) {
      await supabase.from('page_sections').update({ content: section.content }).eq('page_id', revision.entity_id).eq('key', section.key);
    }
    revalidatePublic();
    return success('Homepage restored.');
  } catch { return failure('Authorization failed.'); }
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
    if (id) {
      const { data: current } = await supabase.from('pages').select('*').eq('id', id).single();
      if (current) await saveRevision(supabase, 'pages', id, 'Page before save', current);
    }
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
    if (id) {
      const { data: current } = await supabase.from('page_sections').select('*').eq('id', id).single();
      if (current) await saveRevision(supabase, 'page_sections', id, 'Section before save', current);
    }
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
  const parsed = mediaSchema.safeParse({ id: nullableFormValue(formData, 'id') || undefined, name: formData.get('name'), alt_text: formData.get('alt_text'), title: nullableFormValue(formData, 'title'), caption: nullableFormValue(formData, 'caption'), original_filename: nullableFormValue(formData, 'original_filename'), url: formData.get('url'), width: nullableFormValue(formData, 'width') ? formData.get('width') : null, height: nullableFormValue(formData, 'height') ? formData.get('height') : null, mime_type: formData.get('mime_type'), storage_provider: formData.get('storage_provider') });
  if (!parsed.success) return failure(validationMessage(parsed.error));
  try { const supabase = await adminClient(); const { id, ...values } = parsed.data; const { error } = await (id ? supabase.from('media').update(values).eq('id', id) : supabase.from('media').insert(values)); if (error) return failure('The media record could not be saved.'); revalidatePublic(); return success('Media record saved.'); } catch { return failure('Authorization failed.'); }
}

export async function deleteMedia(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = nullableFormValue(formData, 'id'); if (!id) return failure('Missing media ID.');
  try { const supabase = await adminClient(); const { data: asset } = await supabase.from('media').select('*').eq('id', id).single(); if (!asset) return failure('The media record could not be found.'); const usage = await getMediaUsage([asset as MediaAsset]); if (usage[id]?.count) return failure(`This image is still used by ${usage[id].locations.slice(0, 3).join(', ')}. Replace or remove those references before deleting it.`); const { error } = await supabase.from('media').delete().eq('id', id); if (error) return failure('The media record could not be deleted.'); if (asset.storage_provider === 'vercel_blob' && process.env.BLOB_READ_WRITE_TOKEN) { await del(asset.url).catch(() => undefined); for (const legacyUrl of asset.legacy_urls || []) await del(legacyUrl).catch(() => undefined); } revalidatePublic(); return success('Media record deleted.'); } catch { return failure('Authorization failed.'); }
}

export async function saveCatalogSection(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = catalogSectionSchema.safeParse({ id: nullableFormValue(formData, 'id') || undefined, catalog_type: formData.get('catalog_type'), title: formData.get('title'), description: formData.get('description'), image_url: nullableFormValue(formData, 'image_url'), image_alt: nullableFormValue(formData, 'image_alt'), cta_label: formData.get('cta_label'), cta_href: formData.get('cta_href'), sort_order: formData.get('sort_order'), enabled: formBoolean(formData, 'enabled') });
  if (!parsed.success) return failure(validationMessage(parsed.error));
  if (parsed.data.image_url && !parsed.data.image_alt) return failure('Image alt text is required when a section has an image.');
  try { const supabase = await adminClient(); const { id, ...values } = parsed.data; const { error } = await (id ? supabase.from('catalog_sections').update(values).eq('id', id) : supabase.from('catalog_sections').insert(values)); if (error) return failure('The catalog section could not be saved.'); revalidatePublic(); return success('Catalog section saved and public content revalidated.'); } catch { return failure('Authorization failed.'); }
}

export async function deleteCatalogSection(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = nullableFormValue(formData, 'id'); if (!id) return failure('Missing catalog section ID.');
  try { const { error } = await (await adminClient()).from('catalog_sections').delete().eq('id', id); if (error) return failure('The catalog section could not be deleted.'); revalidatePublic(); return success('Catalog section deleted.'); } catch { return failure('Authorization failed.'); }
}

export async function saveCardGame(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = cardGameSchema.safeParse({ id: nullableFormValue(formData, 'id') || undefined, name: formData.get('name'), slug: formData.get('slug'), description: formData.get('description'), image_url: nullableFormValue(formData, 'image_url'), image_alt: nullableFormValue(formData, 'image_alt'), cta_label: nullableFormValue(formData, 'cta_label'), cta_href: nullableFormValue(formData, 'cta_href'), active: formBoolean(formData, 'active'), sort_order: formData.get('sort_order') });
  if (!parsed.success) return failure(validationMessage(parsed.error));
  if (parsed.data.image_url && !nullableFormValue(formData, 'image_alt')) return failure('Image alt text is required when a card game has an image.');
  try { const supabase = await adminClient(); const { id, ...values } = parsed.data; const { error } = await (id ? supabase.from('card_games').update(values).eq('id', id) : supabase.from('card_games').insert(values)); if (error) return failure(error.code === '23505' ? 'A card game with that URL slug already exists.' : 'The card game could not be saved.'); revalidatePublic(); return success('Card game saved.'); } catch { return failure('Authorization failed.'); }
}

export async function deleteCardGame(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = nullableFormValue(formData, 'id'); if (!id) return failure('Missing card game ID.');
  try { const { error } = await (await adminClient()).from('card_games').delete().eq('id', id); if (error) return failure('The card game could not be deleted.'); revalidatePublic(); return success('Card game deleted.'); } catch { return failure('Authorization failed.'); }
}

export async function saveCardsContent(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = cardsContentSchema.safeParse({ id: 'default', eyebrow: formData.get('eyebrow'), title: formData.get('title'), description: formData.get('description'), magic_eyebrow: formData.get('magic_eyebrow'), magic_title: formData.get('magic_title'), magic_description: formData.get('magic_description'), magic_event_wording: formData.get('magic_event_wording'), magic_event_time: formData.get('magic_event_time'), magic_event_frequency: formData.get('magic_event_frequency'), magic_prerelease_text: formData.get('magic_prerelease_text'), announcement: nullableFormValue(formData, 'announcement'), featured_game_slug: nullableFormValue(formData, 'featured_game_slug') });
  if (!parsed.success) return failure(validationMessage(parsed.error));
  try { const supabase = await adminClient(); const { error } = await supabase.from('card_page_content').upsert(parsed.data, { onConflict: 'id' }); if (error) return failure('Cards page content could not be saved.'); revalidatePublic(); return success('Cards page content saved and public routes revalidated.'); } catch { return failure('Authorization failed.'); }
}

export async function saveEvent(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = eventSchema.safeParse({ id: nullableFormValue(formData, 'id') || undefined, title: formData.get('title'), category: formData.get('category'), description: nullableFormValue(formData, 'description'), starts_at: formData.get('starts_at'), ends_at: nullableFormValue(formData, 'ends_at'), location: formData.get('location'), image_url: nullableFormValue(formData, 'image_url'), image_alt: nullableFormValue(formData, 'image_alt'), registration_url: nullableFormValue(formData, 'registration_url'), recurrence: formData.get('recurrence') || 'none', recurrence_day: nullableFormValue(formData, 'recurrence_day'), timezone: 'America/New_York', sort_order: formData.get('sort_order') || 0, max_occurrences: nullableFormValue(formData, 'max_occurrences'), published: formBoolean(formData, 'published') });
  if (!parsed.success) return failure(validationMessage(parsed.error));
  if (parsed.data.ends_at && parsed.data.ends_at < parsed.data.starts_at) return failure('End time must be after the start time.');
  if (parsed.data.recurrence === 'weekly' && parsed.data.recurrence_day == null) return failure('Choose the weekday for a recurring event.');
  if (parsed.data.image_url && !parsed.data.image_alt) return failure('Image alt text is required when an event has an image.');
  try { const supabase = await adminClient(); const { id, ...values } = parsed.data; const { error } = await (id ? supabase.from('events').update(values).eq('id', id) : supabase.from('events').insert(values)); if (error) return failure('The event could not be saved.'); revalidatePublic(); return success('Event saved.'); } catch { return failure('Authorization failed.'); }
}

export async function deleteEvent(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = nullableFormValue(formData, 'id'); if (!id) return failure('Missing event ID.');
  try { const { error } = await (await adminClient()).from('events').delete().eq('id', id); if (error) return failure('The event could not be deleted.'); revalidatePublic(); return success('Event deleted.'); } catch { return failure('Authorization failed.'); }
}

export async function duplicateEvent(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = nullableFormValue(formData, 'id'); if (!id) return failure('Missing event ID.');
  try { const supabase = await adminClient(); const { data: event, error } = await supabase.from('events').select('*').eq('id', id).single(); if (error || !event) return failure('The event could not be found.'); const { id: _id, created_at: _created, updated_at: _updated, title, ...copy } = event; const result = await supabase.from('events').insert({ ...copy, title: `${title} (copy)`, published: false }); if (result.error) return failure('The event could not be duplicated.'); revalidatePublic(); return success('Event duplicated as a draft.'); } catch { return failure('Authorization failed.'); }
}

export async function reorderEvent(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = nullableFormValue(formData, 'id'); const sortOrder = Number(formData.get('sort_order')); if (!id || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) return failure('Choose a valid display order.');
  try { const { error } = await (await adminClient()).from('events').update({ sort_order: sortOrder }).eq('id', id); if (error) return failure('The event order could not be saved.'); revalidatePublic(); return success('Event order saved.'); } catch { return failure('Authorization failed.'); }
}

export async function saveSetting(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = settingsSchema.safeParse({ key: formData.get('key'), label: formData.get('label'), value: formData.get('value') });
  if (!parsed.success) return failure(validationMessage(parsed.error));
  try { const supabase = await adminClient(); const { data: current } = await supabase.from('site_settings').select('*').eq('key', parsed.data.key).single(); if (current) await saveRevision(supabase, 'site_settings', parsed.data.key, 'Setting before save', current); const { error } = await supabase.from('site_settings').upsert(parsed.data, { onConflict: 'key' }); if (error) return failure('The setting could not be saved.'); revalidatePublic(); return success('Site setting saved.'); } catch { return failure('Authorization failed.'); }
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
