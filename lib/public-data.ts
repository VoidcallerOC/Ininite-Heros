import 'server-only';

import type { BusinessHour, CardGame, CardsContent, CatalogSection, CatalogType, CmsPageData, MediaAsset, PageSection, PublicSiteData, SocialLink, StoreEvent } from '@/lib/cms';
import { fallbackPublicSiteData, fallbackPages, fallbackCatalogSections, fallbackCardsContent, fallbackCardGames } from '@/lib/fallback-content';
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase-server';
import { upcomingOccurrences } from '@/lib/events';

function resolveMediaValue(value: unknown, mediaById: Map<string, string>, mediaByUrl: Map<string, string>): unknown {
  if (typeof value === 'string') {
    if (value.startsWith('media://')) return mediaById.get(value.slice('media://'.length)) || value;
    return mediaByUrl.get(value) || value;
  }
  if (Array.isArray(value)) return value.map((item) => resolveMediaValue(item, mediaById, mediaByUrl));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveMediaValue(item, mediaById, mediaByUrl)]));
  return value;
}

export async function getPublicSiteData(): Promise<PublicSiteData | null> {
  if (!isSupabaseConfigured()) return fallbackPublicSiteData;
  try {
    const supabase = await createSupabaseServerClient();
    const [settingsResult, hoursResult, socialsResult] = await Promise.all([
      supabase.from('site_settings').select('key,value,label,updated_at').order('key'),
      supabase.from('business_hours').select('*').order('sort_order'),
      supabase.from('social_links').select('*').eq('active', true).order('sort_order'),
    ]);
    if (settingsResult.error || hoursResult.error || socialsResult.error) return fallbackPublicSiteData;
    const settings = Object.fromEntries((settingsResult.data ?? []).map((item) => [item.key, item.value]));
    return { settings, hours: (hoursResult.data ?? []) as BusinessHour[], socials: (socialsResult.data ?? []) as SocialLink[] };
  } catch { return fallbackPublicSiteData; }
}

export async function getPublishedPage(slug: string): Promise<CmsPageData | null> {
  if (!isSupabaseConfigured()) return fallbackPages[slug] ?? null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: page, error } = await supabase.from('pages').select('*').eq('slug', slug).eq('published', true).maybeSingle();
    if (error || !page) return fallbackPages[slug] ?? null;
    const [{ data: sections, error: sectionError }, { data: media }] = await Promise.all([
      supabase.from('page_sections').select('*').eq('page_id', page.id).eq('published', true).order('sort_order'),
      supabase.from('media').select('id,url'),
    ]);
    if (sectionError) return fallbackPages[slug] ?? null;
    const mediaById = new Map((media ?? []).map((asset) => [asset.id, asset.url]));
    const mediaByUrl = new Map((media ?? []).map((asset) => [asset.url, asset.url]));
    const resolvedSections = (sections ?? []).map((section) => ({ ...section, content: resolveMediaValue(section.content, mediaById, mediaByUrl) }));
    const resolvedPage = { ...page, og_image_url: page.og_image_url ? String(resolveMediaValue(page.og_image_url, mediaById, mediaByUrl)) : page.og_image_url };
    return { page: resolvedPage, sections: resolvedSections as PageSection[] } as CmsPageData;
  } catch { return fallbackPages[slug] ?? null; }
}

export async function getActiveCardGames(): Promise<CardGame[]> {
  if (!isSupabaseConfigured()) return fallbackCardGames;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('card_games').select('*').eq('active', true).order('sort_order');
    return error || !data?.length ? fallbackCardGames : data as CardGame[];
  } catch { return fallbackCardGames; }
}

export async function getCardsContent(): Promise<CardsContent> {
  if (!isSupabaseConfigured()) return fallbackCardsContent;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('card_page_content').select('*').eq('id', 'default').maybeSingle();
    return error || !data ? fallbackCardsContent : data as CardsContent;
  } catch { return fallbackCardsContent; }
}

export async function getCatalogSections(catalogType: CatalogType): Promise<CatalogSection[]> {
  if (!isSupabaseConfigured()) return fallbackCatalogSections[catalogType];
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('catalog_sections').select('*').eq('catalog_type', catalogType).eq('enabled', true).order('sort_order').order('created_at');
    if (error || !data?.length) return fallbackCatalogSections[catalogType];
    const media = await supabase.from('media').select('id,url');
    const mediaById = new Map((media.data ?? []).map((asset) => [asset.id, asset.url]));
    return (data as CatalogSection[]).map((section) => ({ ...section, image_url: section.image_url?.startsWith('media://') ? mediaById.get(section.image_url.slice('media://'.length)) || null : section.image_url }));
  } catch { return fallbackCatalogSections[catalogType]; }
}

export async function getPublishedEvents(): Promise<StoreEvent[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('events').select('*').eq('published', true).order('sort_order').order('starts_at').limit(100);
    return error ? [] : upcomingOccurrences((data ?? []) as StoreEvent[]);
  } catch { return []; }
}

export async function getPublicMedia(): Promise<MediaAsset[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('media').select('*').order('created_at', { ascending: false });
  return (data ?? []) as MediaAsset[];
}
