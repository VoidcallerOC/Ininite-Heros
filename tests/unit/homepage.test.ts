import assert from 'node:assert/strict';
import test from 'node:test';
import { fallbackPages, fallbackPublicSiteData } from '@/lib/fallback-content';
import { homeAnnouncementSchema, homeHeroSchema, homeIntroSchema } from '@/lib/validation';

test('fallback public content preserves the verified business information', () => {
  assert.equal(fallbackPublicSiteData.settings.business_name, 'Infinite Heroes Comics');
  assert.equal(fallbackPublicSiteData.settings.address_line_1, '1098 Main St');
  assert.equal(fallbackPublicSiteData.settings.phone_display, '860-417-2559');
  assert.equal(fallbackPublicSiteData.socials.length, 2);
});

test('fallback pages retain every public route and managed homepage CTA', () => {
  for (const slug of ['home', 'comics', 'cards', 'collectibles', 'about', 'visit']) assert.ok(fallbackPages[slug]);
  assert.equal(fallbackPages.home.sections.some((section) => section.key === 'cta'), true);
});

test('homepage content schemas reject oversized or incomplete editor values', () => {
  assert.equal(homeHeroSchema.safeParse({ eyebrow: 'x', title: 'x', emphasis: '', body: 'x', primaryLabel: 'x', primaryHref: '/', secondaryLabel: 'x', secondaryHref: '/', imageUrl: '/assets/images/new-comics.webp', imageAlt: 'x', meta: ['x'] }).success, true);
  assert.equal(homeIntroSchema.safeParse({ eyebrow: 'x', titleLines: [], body: ['x'] }).success, false);
  assert.equal(homeAnnouncementSchema.safeParse({ enabled: true, eyebrow: 'x', title: 'x', body: 'x', buttonLabel: 'x', buttonHref: '/' }).success, true);
});
