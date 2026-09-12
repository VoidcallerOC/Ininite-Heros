import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'); process.exit(1); }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const expectedPages = ['home', 'comics', 'cards', 'collectibles', 'about', 'visit'];
  const expectedSettings = ['business_name', 'address_line_1', 'phone_e164', 'email', 'time_zone'];
  const [pages, settings, hours, media] = await Promise.all([
    client.from('pages').select('slug').eq('published', true),
    client.from('site_settings').select('key'),
    client.from('business_hours').select('id'),
    client.from('media').select('id'),
  ]);
  for (const result of [pages, settings, hours, media]) if (result.error) throw new Error(result.error.message);
  const missingPages = expectedPages.filter((slug) => !pages.data?.some((page) => page.slug === slug));
  const missingSettings = expectedSettings.filter((keyName) => !settings.data?.some((setting) => setting.key === keyName));
  if (missingPages.length || missingSettings.length || (hours.data?.length ?? 0) !== 7 || (media.data?.length ?? 0) < 10) throw new Error(`Seed verification failed. Missing pages: ${missingPages.join(', ') || 'none'}; missing settings: ${missingSettings.join(', ') || 'none'}; hours: ${hours.data?.length}; media: ${media.data?.length}`);
  console.log(`Seed verification passed: ${pages.data?.length} public pages, ${settings.data?.length} settings, ${hours.data?.length} business-hour records, and ${media.data?.length} media records.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
