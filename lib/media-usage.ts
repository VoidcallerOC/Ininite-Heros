import 'server-only';

import type { MediaAsset } from '@/lib/cms';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export type MediaUsage = { count: number; locations: string[] };

export async function getMediaUsage(assets: MediaAsset[]): Promise<Record<string, MediaUsage>> {
  const usage = Object.fromEntries(assets.map((asset) => [asset.id, { count: 0, locations: [] as string[] }]));
  if (!assets.length) return usage;
  const supabase = await createSupabaseServerClient();
  const [pages, sections, games, events] = await Promise.all([
    supabase.from('pages').select('id,slug,og_image_url'),
    supabase.from('page_sections').select('id,page_id,key,content'),
    supabase.from('card_games').select('id,name,image_url'),
    supabase.from('events').select('id,title,image_url'),
  ]);
  const records: Array<{ label: string; value: unknown }> = [];
  for (const page of pages.data ?? []) records.push({ label: `SEO image: ${page.slug}`, value: page.og_image_url });
  for (const section of sections.data ?? []) records.push({ label: `Section: ${section.key}`, value: section.content });
  for (const game of games.data ?? []) records.push({ label: `Card game: ${game.name}`, value: game.image_url });
  for (const event of events.data ?? []) records.push({ label: `Event: ${event.title}`, value: event.image_url });
  for (const asset of assets) {
    for (const record of records) {
      const urls = [asset.url, ...(asset.legacy_urls || [])];
      if (urls.some((url) => JSON.stringify(record.value).includes(url))) {
        usage[asset.id].count += 1;
        if (usage[asset.id].locations.length < 8) usage[asset.id].locations.push(record.label);
      }
    }
  }
  return usage;
}
