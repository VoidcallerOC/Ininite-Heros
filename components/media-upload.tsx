'use client';

import { useState } from 'react';
import type { MediaAsset } from '@/lib/cms';

export function MediaUpload({ replace }: { replace?: MediaAsset }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [busy, setBusy] = useState(false);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement;
    if (!fileInput.files?.[0]) { setStatus('error'); setMessage('Choose an image file first.'); return; }
    setBusy(true); setStatus('idle'); setMessage(replace ? 'Replacing image and updating public references…' : 'Uploading image to persistent storage…');
    try {
      const response = await fetch('/api/admin/media/upload', { method: 'POST', body: new FormData(form) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Upload failed.');
      setStatus('success'); setMessage(replace ? `Replaced ${result.media.name}. Existing public references were updated.` : `Uploaded ${result.media.name} to Vercel Blob.`);
      form.reset();
      window.location.reload();
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Upload failed.'); }
    finally { setBusy(false); }
  }

  return <form className="admin-form media-upload-form" onSubmit={upload}><input type="hidden" name="replaceId" value={replace?.id || ''} /><div className="admin-form__grid"><div className="admin-field"><label htmlFor={`file-${replace?.id || 'new'}`}>{replace ? 'Replacement image' : 'Image file'}</label><input id={`file-${replace?.id || 'new'}`} name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required /></div><div className="admin-field"><label htmlFor={`altText-${replace?.id || 'new'}`}>Accessible alt text</label><input id={`altText-${replace?.id || 'new'}`} name="altText" maxLength={250} defaultValue={replace?.alt_text || ''} placeholder="Describe the photo for screen-reader users" required /></div><div className="admin-field"><label htmlFor={`title-${replace?.id || 'new'}`}>Image title (optional)</label><input id={`title-${replace?.id || 'new'}`} name="title" maxLength={180} defaultValue={replace?.title || ''} /></div><div className="admin-field"><label htmlFor={`caption-${replace?.id || 'new'}`}>Caption (optional)</label><input id={`caption-${replace?.id || 'new'}`} name="caption" maxLength={500} defaultValue={replace?.caption || ''} /></div></div>{message && <p className={`admin-notice admin-notice--${status}`} role="status">{message}</p>}<button className="admin-button" type="submit" disabled={busy}>{busy ? (replace ? 'Replacing…' : 'Uploading…') : (replace ? 'Replace image' : 'Upload image')}</button></form>;
}

export function CopyMediaUrl({ url }: { url: string }) {
  const [message, setMessage] = useState('Select URL');
  return <button type="button" className="admin-button admin-button--quiet" onClick={async () => { await navigator.clipboard.writeText(url); setMessage('URL copied'); }}>{message}</button>;
}
