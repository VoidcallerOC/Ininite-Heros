import assert from 'node:assert/strict';
import test from 'node:test';
import { cardGameSchema, eventSchema, pageSchema, sectionSchema } from '@/lib/validation';

test('page validation accepts a managed public page and rejects unsafe slugs', () => {
  const valid = pageSchema.safeParse({ slug: 'cards', title: 'Cards', seo_title: 'Cards | Infinite Heroes Comics', seo_description: 'Trading cards and the current card scene at Infinite Heroes Comics in Watertown, Connecticut.', og_image_url: '/assets/images/trading-cards.webp', published: true });
  assert.equal(valid.success, true);
  const invalid = pageSchema.safeParse({ slug: '../../admin', title: '', published: true });
  assert.equal(invalid.success, false);
});

test('section validation requires a constrained section type and valid JSON source', () => {
  const valid = sectionSchema.safeParse({ page_id: '00000000-0000-4000-8000-000000000001', key: 'hero', label: 'Homepage hero', section_type: 'hero', content_json: '{"title":"Every shelf"}', sort_order: 10, published: true });
  assert.equal(valid.success, true);
  const invalid = sectionSchema.safeParse({ page_id: 'not-a-uuid', key: 'hero script', label: '', section_type: 'arbitrary-html', content_json: '', sort_order: -1, published: true });
  assert.equal(invalid.success, false);
});

test('card game CRUD inputs stay within content constraints', () => {
  const valid = cardGameSchema.safeParse({ name: 'Magic: The Gathering', slug: 'magic-the-gathering', description: 'Current card game information from the Infinite Heroes floor.', image_url: null, active: true, sort_order: 10 });
  assert.equal(valid.success, true);
  const invalid = cardGameSchema.safeParse({ name: 'X', slug: 'Not Valid', description: '', image_url: 'javascript:alert(1)', active: true, sort_order: -2 });
  assert.equal(invalid.success, false);
});

test('event input converts an Eastern local time into a timezone-aware ISO timestamp', () => {
  const result = eventSchema.safeParse({ title: 'Commander Night', description: null, starts_at: '2026-09-16T19:00', ends_at: '2026-09-16T22:00', image_url: null, registration_url: null, published: true });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.starts_at, '2026-09-16T23:00:00.000Z');
    assert.equal(result.data.ends_at, '2026-09-17T02:00:00.000Z');
  }
});
