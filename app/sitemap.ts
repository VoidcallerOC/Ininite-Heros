import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://infiniteheroes.net';
  const routes = ['', '/comics.html', '/cards.html', '/collectibles.html', '/events.html', '/about.html', '/visit.html'];
  return routes.map((route) => ({ url: `${origin}${route}`, lastModified: new Date(), changeFrequency: route ? 'monthly' : 'weekly', priority: route ? 0.8 : 1 }));
}
