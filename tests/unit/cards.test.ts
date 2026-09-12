import assert from 'node:assert/strict';
import test from 'node:test';
import { fallbackCardsContent } from '@/lib/fallback-content';
import { cardsContentSchema, cardGameSchema } from '@/lib/validation';

test('editable Cards fallback preserves the Infinite Heroes Magic offering', () => {
  assert.equal(fallbackCardsContent.magic_event_frequency, 'Every Friday');
  assert.equal(fallbackCardsContent.magic_event_time, '7:30 PM');
  assert.match(fallbackCardsContent.magic_event_wording, /Friday Night Magic/);
  assert.match(fallbackCardsContent.magic_prerelease_text, /every new Magic release/);
});

test('card game records validate ordering, visibility, image alt text, and CTAs', () => {
  const result = cardGameSchema.safeParse({ name: 'Magic: The Gathering', slug: 'magic', description: 'WPN play.', image_url: '/assets/images/trading-cards.webp', image_alt: 'Magic cards', cta_label: 'Explore Magic', cta_href: '#magic', active: true, sort_order: 10 });
  assert.equal(result.success, true);
  assert.equal(cardsContentSchema.safeParse(fallbackCardsContent).success, true);
});
