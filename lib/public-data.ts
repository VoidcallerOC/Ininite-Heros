import 'server-only';

import type { BusinessHour, CardGame, CmsPageData, MediaAsset, PageSection, PublicSiteData, SocialLink, StoreEvent } from '@/lib/cms';
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase-server';

export async function getPublicSiteData(): Promise<PublicSiteData | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const [settingsResult, hoursResult, socialsResult] = await Promise.all([
    supabase.from('site_settings').select('key,value,label,updated_at').order('key'),
    supabase.from('business_hours').select('*').order('sort_order'),
    supabase.from('social_links').select('*').eq('active', true).order('sort_order'),
  ]);
  if (settingsResult.error || hoursResult.error || socialsResult.error) return null;
  const settings = Object.fromEntries((settingsResult.data ?? []).map((item) => [item.key, item.value]));
  return { settings, hours: (hoursResult.data ?? []) as BusinessHour[], socials: (socialsResult.data ?? []) as SocialLink[] };
}

export async function getPublishedPage(slug: string): Promise<CmsPageData | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data: page, error } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error || !page) return null;

  const { data: sections, error: sectionError } = await supabase
    .from('page_sections')
    .select('*')
    .eq('page_id', page.id)
    .eq('published', true)
    .order('sort_order');
  if (sectionError) return null;
  return { page, sections: (sections ?? []) as PageSection[] } as CmsPageData;
}

export async function getActiveCardGames(): Promise<CardGame[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('card_games').select('*').eq('active', true).order('sort_order');
  return (data ?? []) as CardGame[];
}

export async function getPublishedEvents(): Promise<StoreEvent[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('published', true)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(12);
  return (data ?? []) as StoreEvent[];
}

export async function getPublicMedia(): Promise<MediaAsset[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('media').select('*').order('created_at', { ascending: false });
  return (data ?? []) as MediaAsset[];
}
