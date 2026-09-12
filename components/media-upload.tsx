'use client';

import { useState } from 'react';

export function MediaUpload() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement;
    if (!fileInput.files?.[0]) return;
    setBusy(true); setMessage('Uploading image…');
    try {
      const response = await fetch('/api/admin/media/upload', { method: 'POST', body: new FormData(form) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Upload failed.');
      setMessage(`Uploaded ${result.media.name}. Reload the page to see the media library entry.`);
      form.reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload failed.'); }
    finally { setBusy(false); }
  }

  return <form className="admin-form" onSubmit={upload}><div className="admin-form__grid"><div className="admin-field"><label htmlFor="file">Image file</label><input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required /></div><div className="admin-field"><label htmlFor="altText">Accessible alt text</label><input id="altText" name="altText" maxLength={250} placeholder="Describe the photo for visitors using a screen reader" required /></div></div>{message && <p className="admin-notice admin-notice--success" role="status">{message}</p>}<button className="admin-button" type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Upload image'}</button></form>;
}
