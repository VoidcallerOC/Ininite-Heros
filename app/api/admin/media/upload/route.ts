import { del, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const maxBytes = 10 * 1024 * 1024;
export const runtime = 'nodejs';

function textValue(value: FormDataEntryValue | null, max: number) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}
function safeName(name: string) { return name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase().slice(0, 180); }
function replaceUrl(value: unknown, oldUrl: string, newUrl: string): unknown {
  if (typeof value === 'string') return value === oldUrl ? newUrl : value;
  if (Array.isArray(value)) return value.map((item) => replaceUrl(item, oldUrl, newUrl));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceUrl(item, oldUrl, newUrl)]));
  return value;
}

export async function POST(request: Request) {
  let newUrl: string | null = null;
  let databaseCommitted = false;
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
    const { data: existing } = replaceId ? await supabase.from('media').select('*').eq('id', replaceId).single() : { data: null };
    if (replaceId && !existing) return NextResponse.json({ error: 'The image to replace could not be found.' }, { status: 404 });
    const blob = await put(`infinite-heroes/${Date.now()}-${safeName(file.name)}`, file, { access: 'public', addRandomSuffix: true });
    newUrl = blob.url;
    const metadata = { name: existing?.name || file.name.slice(0, 140), alt_text: altText, title, caption, original_filename: file.name.slice(0, 255), legacy_urls: existing ? [...(existing.legacy_urls || []), existing.url].slice(-10) : [], url: blob.url, mime_type: file.type, storage_provider: 'vercel_blob' as const };

    if (existing) {
      const oldUrl = existing.url;
      const { error: mediaError } = await supabase.from('media').update(metadata).eq('id', existing.id);
      if (mediaError) throw new Error('The replacement was uploaded but its media record could not be updated.');
      databaseCommitted = true;
      const [pages, sections, games, events] = await Promise.all([
        supabase.from('pages').select('id,og_image_url'), supabase.from('page_sections').select('id,content'), supabase.from('card_games').select('id,image_url'), supabase.from('events').select('id,image_url'),
      ]);
      for (const page of pages.data ?? []) if (page.og_image_url === oldUrl) { const result = await supabase.from('pages').update({ og_image_url: blob.url }).eq('id', page.id); if (result.error) throw new Error('A public SEO image reference could not be updated.'); }
      for (const section of sections.data ?? []) if (JSON.stringify(section.content).includes(oldUrl)) { const result = await supabase.from('page_sections').update({ content: replaceUrl(section.content, oldUrl, blob.url) }).eq('id', section.id); if (result.error) throw new Error('A public section image reference could not be updated.'); }
      for (const game of games.data ?? []) if (game.image_url === oldUrl) { const result = await supabase.from('card_games').update({ image_url: blob.url }).eq('id', game.id); if (result.error) throw new Error('A card image reference could not be updated.'); }
      for (const event of events.data ?? []) if (event.image_url === oldUrl) { const result = await supabase.from('events').update({ image_url: blob.url }).eq('id', event.id); if (result.error) throw new Error('An event image reference could not be updated.'); }
      if (existing.storage_provider === 'vercel_blob' && process.env.BLOB_READ_WRITE_TOKEN) await del(oldUrl).catch(() => undefined);
      return NextResponse.json({ media: { ...existing, ...metadata }, replaced: true }, { status: 200 });
    }
    const { data, error } = await supabase.from('media').insert(metadata).select('*').single();
    if (error) throw new Error('Image stored but media record could not be created.');
    return NextResponse.json({ media: data, replaced: false }, { status: 201 });
  } catch (error) {
    if (newUrl && !databaseCommitted) await del(newUrl).catch(() => undefined);
    const message = error instanceof Error && error.message.includes('could not') ? error.message : 'You are not authorized to upload media or the storage service failed.';
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
