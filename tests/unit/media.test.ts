import assert from 'node:assert/strict';
import test from 'node:test';
import { mediaSchema } from '@/lib/validation';

test('media metadata accepts managed assets and persistent URLs', () => {
  const managed = mediaSchema.safeParse({ name: 'Store photo', alt_text: 'Comic shelves', title: 'New arrivals', caption: 'Fresh books on the wall.', original_filename: 'store.webp', url: '/assets/images/new-comics.webp', width: 1600, height: 944, mime_type: 'image/webp', storage_provider: 'public' });
  const blob = mediaSchema.safeParse({ name: 'Uploaded photo', alt_text: 'Uploaded store photo', title: '', caption: '', original_filename: 'upload.png', url: 'https://blob.vercel-storage.com/infinite-heroes/photo.png', width: null, height: null, mime_type: 'image/png', storage_provider: 'vercel_blob' });
  assert.equal(managed.success, true);
  assert.equal(blob.success, true);
});

test('media metadata rejects unsafe URLs and oversized captions', () => {
  assert.equal(mediaSchema.safeParse({ name: 'Bad', alt_text: 'Bad', url: 'javascript:alert(1)', mime_type: 'image/webp', storage_provider: 'public' }).success, false);
  assert.equal(mediaSchema.safeParse({ name: 'Bad', alt_text: 'Bad', url: '/assets/images/a.webp', caption: 'x'.repeat(501), mime_type: 'image/webp', storage_provider: 'public' }).success, false);
});
