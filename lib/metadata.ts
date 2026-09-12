import type { Metadata } from 'next';
import { getPublishedPage } from '@/lib/public-data';

const paths: Record<string, string> = {
  home: '/', comics: '/comics.html', cards: '/cards.html', collectibles: '/collectibles.html', about: '/about.html', visit: '/visit.html',
};

export async function pageMetadata(slug: string): Promise<Metadata> {
  const page = await getPublishedPage(slug);
  if (!page) return {};
  const canonical = paths[slug] || '/';
  const title = page.page.seo_title || page.page.title;
  const description = page.page.seo_description || undefined;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: 'website', title, description, url: canonical, images: page.page.og_image_url ? [{ url: page.page.og_image_url }] : undefined },
    twitter: { card: 'summary_large_image', title, description, images: page.page.og_image_url ? [page.page.og_image_url] : undefined },
  };
}
