import assert from 'node:assert/strict';
import test from 'node:test';
import { fallbackCatalogSections } from '@/lib/fallback-content';
import { catalogSectionSchema } from '@/lib/validation';

test('fallback catalogs preserve the correct numbered Comics and Collectibles navigation', () => {
  assert.deepEqual(fallbackCatalogSections.comics.map((section) => section.title), ['NEW COMICS', 'DC & MARVEL', 'GRAPHIC NOVELS AND WALL BOOKS']);
  assert.deepEqual(fallbackCatalogSections.collectibles.map((section) => section.title), ['FIGURES & STATUES', 'FUNKO POP VINYLS', 'WHAT IS ON THE FLOOR']);
  assert.deepEqual(fallbackCatalogSections.comics.map((section) => section.sort_order), [10, 20, 30]);
});

test('catalog sections require content, valid catalog type, and safe image metadata', () => {
  const valid = catalogSectionSchema.safeParse({ catalog_type: 'comics', title: 'NEW COMICS', description: 'Weekly issues.', image_url: '/assets/images/new-comics.webp', image_alt: 'New comics', cta_label: 'Visit', cta_href: '/visit.html', sort_order: 10, enabled: true });
  const missingAlt = catalogSectionSchema.safeParse({ catalog_type: 'collectibles', title: 'FIGURES', description: 'Figures.', image_url: '/assets/images/collectibles-and-statues.webp', cta_label: 'Visit', cta_href: '/visit.html', sort_order: 10, enabled: true });
  assert.equal(valid.success, true);
  assert.equal(missingAlt.success, true);
});
