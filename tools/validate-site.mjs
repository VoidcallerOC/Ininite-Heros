import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const errors = [];
const requiredFiles = [
  'app/layout.tsx', 'app/page.tsx', 'app/admin/(protected)/layout.tsx', 'app/admin/login/page.tsx',
  'app/admin/actions.ts', 'app/api/analytics/route.ts', 'app/api/admin/media/upload/route.ts',
  'lib/auth.ts', 'lib/authorization.ts', 'lib/public-data.ts', 'proxy.ts',
  'supabase/migrations/20260912103000_cms_foundation.sql', '.env.example', 'vercel.json',
];
for (const file of requiredFiles) if (!existsSync(join(root, file))) errors.push(`Missing required CMS file: ${file}`);

const migration = existsSync(join(root, 'supabase/migrations/20260912103000_cms_foundation.sql')) ? readFileSync(join(root, 'supabase/migrations/20260912103000_cms_foundation.sql'), 'utf8') : '';
for (const table of ['profiles', 'site_settings', 'pages', 'page_sections', 'media', 'card_games', 'events', 'social_links', 'business_hours', 'analytics_events']) {
  if (!new RegExp(`create table public\\.${table}`, 'i').test(migration)) errors.push(`Database migration missing table: ${table}`);
  if (!new RegExp(`alter table public\\.${table} enable row level security`, 'i').test(migration)) errors.push(`Database migration missing RLS enablement: ${table}`);
}
for (const policy of ['public can read published pages', 'admins manage pages', 'admins manage sections', 'admins can read analytics']) {
  if (!migration.includes(policy)) errors.push(`Database migration missing expected policy: ${policy}`);
}

const envExample = existsSync(join(root, '.env.example')) ? readFileSync(join(root, '.env.example'), 'utf8') : '';
for (const variable of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'BLOB_READ_WRITE_TOKEN']) {
  if (!new RegExp(`^${variable}=`, 'm').test(envExample)) errors.push(`Missing documented environment variable: ${variable}`);
}
if (/SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s#]/.test(envExample)) errors.push('A service-role key must not be committed to .env.example.');

const publicRoutes = ['app/page.tsx', 'app/comics.html/page.tsx', 'app/cards.html/page.tsx', 'app/collectibles.html/page.tsx', 'app/about.html/page.tsx', 'app/visit.html/page.tsx'];
for (const route of publicRoutes) if (!existsSync(join(root, route))) errors.push(`Missing preserved public route: ${route}`);
const cardsRoute = existsSync(join(root, 'app/cards.html/page.tsx')) ? readFileSync(join(root, 'app/cards.html/page.tsx'), 'utf8') : '';
if (!cardsRoute.includes('PublicRoute slug="cards"')) errors.push('Cards route must render managed Cards content, not redirect to Comics.');

const publicData = existsSync(join(root, 'lib/public-data.ts')) ? readFileSync(join(root, 'lib/public-data.ts'), 'utf8') : '';
if (!publicData.includes("eq('published', true)")) errors.push('Public page reads must explicitly filter to published content.');
const adminActions = existsSync(join(root, 'app/admin/actions.ts')) ? readFileSync(join(root, 'app/admin/actions.ts'), 'utf8') : '';
if (!adminActions.includes('await requireAdmin()')) errors.push('Admin mutations must invoke the server-side administrator guard.');

if (errors.length) {
  console.error('\nCMS architecture validation failed:\n');
  errors.forEach((error) => console.error(`  ✗ ${error}`));
  process.exit(1);
}
console.log(`CMS architecture validation passed: ${requiredFiles.length} foundation files, 10 RLS-protected tables, preserved public routes, documented secrets, and admin guards.`);
