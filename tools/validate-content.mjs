import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const pages = ['index.html', 'comics.html', 'cards.html', 'collectibles.html', 'about.html', 'visit.html'];
const errors = [];
const imagePattern = /<img\b[^>]*>/gi;
const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1] ?? null;

for (const page of pages) {
  const path = join(root, page);
  const html = readFileSync(path, 'utf8');

  for (const [label, pattern] of [
    ['meta description', /<meta\s+name=["']description["']\s+content=["'][^"']{20,}["']/i],
    ['canonical URL', /<link\s+rel=["']canonical["']\s+href=["']https:\/\/infiniteheroes\.net\//i],
    ['Open Graph title', /<meta\s+property=["']og:title["']\s+content=["'][^"']+["']/i],
    ['Open Graph description', /<meta\s+property=["']og:description["']\s+content=["'][^"']+["']/i],
    ['Open Graph image', /<meta\s+property=["']og:image["']\s+content=["']https:\/\/infiniteheroes\.net\/assets\/images\/shop-interior-wide-social\.jpg["']/i],
    ['Twitter card', /<meta\s+name=["']twitter:card["']\s+content=["']summary_large_image["']/i],
    ['linked supplied logo', /<a\s+class=["']brand["']\s+href=["']index\.html["'][^>]*>\s*<img[^>]+src=["']assets\/images\/infinite-heroes-logo\.webp["']/i],
  ]) {
    if (!pattern.test(html)) errors.push(`${page}: missing or invalid ${label}`);
  }

  const images = html.match(imagePattern) || [];
  if (!images.length) errors.push(`${page}: no image elements found`);
  images.forEach((tag, index) => {
    const src = attribute(tag, 'src');
    const alt = attribute(tag, 'alt');
    if (!src) errors.push(`${page}: image ${index + 1} has no src`);
    if (alt === null) errors.push(`${page}: image ${index + 1} has no alt text`);
    if (!attribute(tag, 'width') || !attribute(tag, 'height')) errors.push(`${page}: image ${index + 1} is missing intrinsic dimensions`);
    if (src && !existsSync(join(root, src))) errors.push(`${page}: image ${index + 1} has a missing local file (${src})`);
  });

  if (/hero-art|category-card__graphic|owner-portrait|story-panel__art|page-hero__ornament|map-link|brand__mark|brand__name/i.test(html)) {
    errors.push(`${page}: contains obsolete CSS-placeholder markup`);
  }
}

const home = readFileSync(join(root, 'index.html'), 'utf8');
const schemaBlock = home.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i)?.[1];
try {
  const schema = JSON.parse(schemaBlock || '');
  if (schema['@type'] !== 'Store' || schema.name !== 'Infinite Heroes Comics') errors.push('index.html: invalid Store structured data');
  if (schema.image !== 'https://infiniteheroes.net/assets/images/shop-interior-wide-social.jpg') errors.push('index.html: structured data image is missing');
} catch {
  errors.push('index.html: invalid JSON-LD structured data');
}

const visit = readFileSync(join(root, 'visit.html'), 'utf8');
for (const [label, value] of [
  ['address', '1098 Main St'],
  ['phone link', 'tel:+18604172559'],
  ['email link', 'mailto:paul@infiniteheroes.net'],
  ['maps directions', 'https://maps.google.com/?q=1098+Main+St,+Watertown,+CT+06795'],
  ['Facebook link', 'https://www.facebook.com/infiniteheroescomics/'],
  ['Instagram link', 'https://www.instagram.com/infiniteheroescomics/'],
]) {
  if (!visit.includes(value)) errors.push(`visit.html: missing ${label}`);
}

if (errors.length) {
  console.error('\nContent and SEO validation failed:\n');
  errors.forEach((error) => console.error(`  ✗ ${error}`));
  process.exit(1);
}

console.log(`Content and SEO validation passed for ${pages.length} pages, ${pages.map((page) => (readFileSync(join(root, page), 'utf8').match(imagePattern) || []).length).reduce((total, count) => total + count, 0)} images, local brand assets, metadata, JSON-LD, and visit links.`);
