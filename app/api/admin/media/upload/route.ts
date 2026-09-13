import { del, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const maxBytes = 10 * 1024 * 1024;
export const runtime = 'nodejs';

type Reference = {
  table: 'pages' | 'page_sections' | 'card_games' | 'events';
  id: string;
  field: 'og_image_url' | 'content' | 'image_url';
  value: unknown;
};

function textValue(value: FormDataEntryValue | null, max: number) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function safeName(name: string) {
  const normalized = name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase().slice(0, 180);
  return normalized || 'upload';
}

function replaceUrl(value: unknown, oldUrl: string, newUrl: string): unknown {
  if (typeof value === 'string') return value === oldUrl ? newUrl : value;
  if (Array.isArray(value)) return value.map((item) => replaceUrl(item, oldUrl, newUrl));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceUrl(item, oldUrl, newUrl)]));
  return value;
}

async function restoreReferences(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, references: Reference[], oldUrl: string, newUrl: string) {
  for (const reference of references) {
    const value = reference.field === 'content' ? replaceUrl(reference.value, newUrl, oldUrl) : reference.value;
    const { error } = await supabase.from(reference.table).update({ [reference.field]: value }).eq('id', reference.id);
    if (error) return false;
  }
  return true;
}

export async function POST(request: Request) {
  let newUrl: string | null = null;
  let databaseCommitted = false;
  let rollbackReplacement: (() => Promise<boolean>) | null = null;
  try {
    await requireAdmin();
    if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'Vercel Blob is not configured. Add BLOB_READ_WRITE_TOKEN in the deployment environment.' }, { status: 503 });
    const formData = await request.formData();
    const file = formData.get('file');
    const replaceId = textValue(formData.get('replaceId'), 80);
    const title = textValue(formData.get('title'), 180);
    const caption = textValue(formData.get('caption'), 500);
    const altText = textValue(formData.get('altText'), 250);
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image file.' }, { status: 400 });
    if (!allowedTypes.has(file.type)) return NextResponse.json({ error: 'Upload a JPEG, PNG, WebP, or GIF image.' }, { status: 400 });
    if (file.size <= 0 || file.size > maxBytes) return NextResponse.json({ error: 'Images must be larger than 0 bytes and smaller than 10 MB.' }, { status: 400 });
    if (!altText) return NextResponse.json({ error: 'Accessible alt text is required.' }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    let existing: any = null;
    if (replaceId) {
      const result = await supabase.from('media').select('*').eq('id', replaceId).maybeSingle();
      if (result.error || !result.data) return NextResponse.json({ error: 'The image to replace could not be found.' }, { status: 404 });
      existing = result.data;
    }

    const blob = await put(`infinite-heroes/${Date.now()}-${safeName(file.name)}`, file, { access: 'public', addRandomSuffix: true });
    newUrl = blob.url;
    const metadata = { name: existing?.name || file.name.slice(0, 140), alt_text: altText, title, caption, original_filename: file.name.slice(0, 255), legacy_urls: existing ? [...(existing.legacy_urls || []), existing.url].slice(-10) : [], url: blob.url, mime_type: file.type, storage_provider: 'vercel_blob' as const };

    if (existing) {
      const oldUrl = existing.url;
      const [pages, sections, games, events] = await Promise.all([
        supabase.from('pages').select('id,og_image_url'),
        supabase.from('page_sections').select('id,content'),
        supabase.from('card_games').select('id,image_url'),
        supabase.from('events').select('id,image_url'),
      ]);
      if (pages.error || sections.error || games.error || events.error) throw new Error('The existing media references could not be loaded.');

      const references: Reference[] = [];
      for (const page of pages.data ?? []) if (page.og_image_url === oldUrl) references.push({ table: 'pages', id: page.id, field: 'og_image_url', value: page.og_image_url });
      for (const section of sections.data ?? []) if (JSON.stringify(section.content).includes(oldUrl)) references.push({ table: 'page_sections', id: section.id, field: 'content', value: section.content });
      for (const game of games.data ?? []) if (game.image_url === oldUrl) references.push({ table: 'card_games', id: game.id, field: 'image_url', value: game.image_url });
      for (const event of events.data ?? []) if (event.image_url === oldUrl) references.push({ table: 'events', id: event.id, field: 'image_url', value: event.image_url });

      const { error: mediaError } = await supabase.from('media').update(metadata).eq('id', existing.id);
      if (mediaError) throw new Error('The replacement was uploaded but its media record could not be updated.');
      rollbackReplacement = async () => {
        const referencesRestored = await restoreReferences(supabase, references, oldUrl, blob.url);
        const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...originalMedia } = existing;
        const { error: mediaRollbackError } = await supabase.from('media').update(originalMedia).eq('id', existing.id);
        return referencesRestored && !mediaRollbackError;
      };

      for (const reference of references) {
        const value = reference.field === 'content' ? replaceUrl(reference.value, oldUrl, blob.url) : blob.url;
        const { error } = await supabase.from(reference.table).update({ [reference.field]: value }).eq('id', reference.id);
        if (error) throw new Error('A public media reference could not be updated.');
      }
      databaseCommitted = true;
      rollbackReplacement = null;
      if (existing.storage_provider === 'vercel_blob') await del(oldUrl).catch(() => undefined);
      return NextResponse.json({ media: { ...existing, ...metadata }, replaced: true }, { status: 200 });
    }

    const { data, error } = await supabase.from('media').insert(metadata).select('*').single();
    if (error) throw new Error('Image stored but media record could not be created.');
    databaseCommitted = true;
    return NextResponse.json({ media: data, replaced: false }, { status: 201 });
  } catch (error) {
    const rollbackSucceeded = rollbackReplacement ? await rollbackReplacement().catch(() => false) : true;
    if (newUrl && !databaseCommitted && rollbackSucceeded) await del(newUrl).catch(() => undefined);
    const message = error instanceof Error && error.message.includes('could not') ? error.message : 'You are not authorized to upload media or the storage service failed.';
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
