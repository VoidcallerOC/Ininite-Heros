import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migrationPath = join(root, 'supabase/migrations/20260912103000_cms_foundation.sql');
if (!existsSync(migrationPath)) throw new Error('CMS migration not found.');
const migration = readFileSync(migrationPath, 'utf8');
const errors = [];

for (const content of [
  'Infinite Heroes Comics', '1098 Main St', 'Watertown, CT 06795', '860-417-2559', 'paul@infiniteheroes.net',
  'Every shelf is a new world.', 'Paul Santos', 'From DC to Main Street.', 'Find your next pull.',
  'https://www.facebook.com/infiniteheroescomics/', 'https://www.instagram.com/infiniteheroescomics/',
]) if (!migration.includes(content)) errors.push(`Seed migration missing expected public content: ${content}`);

for (const slug of ['home', 'comics', 'cards', 'collectibles', 'about', 'visit']) {
  if (!migration.includes(`('${slug}',`)) errors.push(`Seed migration missing ${slug} page record.`);
}
for (const asset of ['infinite-heroes-logo.webp', 'new-comics.webp', 'trading-cards.webp', 'collectibles-and-statues.webp', 'shop-detail-1.webp']) {
  if (!existsSync(join(root, 'public/assets/images', asset))) errors.push(`Seed-referenced media file is missing: public/assets/images/${asset}`);
}
if (!migration.includes("('cards', 'Cards'")) errors.push('Managed Cards page seed is absent.');
if (/<script|javascript:/i.test(migration)) errors.push('Seed content must not contain executable script URLs or script markup.');

if (errors.length) {
  console.error('\nCMS content seed validation failed:\n');
  errors.forEach((error) => console.error(`  ✗ ${error}`));
  process.exit(1);
}
console.log('CMS content seed validation passed: existing business information, photography assets, branded copy, social links, and all six managed pages are present.');
