import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const maxBytes = 10 * 1024 * 1024;

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    await requireAdmin();
    if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'Vercel Blob is not configured.' }, { status: 503 });
    const formData = await request.formData();
    const file = formData.get('file');
    const altText = formData.get('altText');
    if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size > maxBytes) {
      return NextResponse.json({ error: 'Upload a JPEG, PNG, WebP, or GIF image smaller than 10 MB.' }, { status: 400 });
    }
    const name = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
    const blob = await put(`infinite-heroes/${Date.now()}-${name}`, file, { access: 'public', addRandomSuffix: true });
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('media').insert({
      name: file.name.slice(0, 140),
      alt_text: typeof altText === 'string' && altText.trim() ? altText.trim().slice(0, 250) : file.name.slice(0, 250),
      url: blob.url,
      mime_type: file.type,
      storage_provider: 'vercel_blob',
    }).select('*').single();
    if (error) return NextResponse.json({ error: 'Image stored but media record could not be created.' }, { status: 500 });
    return NextResponse.json({ media: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'You are not authorized to upload media.' }, { status: 403 });
  }
}
