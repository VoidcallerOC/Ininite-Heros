import { notFound } from 'next/navigation';
import { CmsConfigurationNotice } from '@/components/site-shell';
import { PublicPage } from '@/components/public-page';
import { getActiveCardGames, getCatalogSections, getPublicSiteData, getPublishedPage } from '@/lib/public-data';

export async function PublicRoute({ slug }: { slug: string }) {
  const [siteData, pageData, games, catalogSections] = await Promise.all([
    getPublicSiteData(),
    getPublishedPage(slug),
    slug === 'cards' ? getActiveCardGames() : Promise.resolve([]),
    slug === 'comics' || slug === 'collectibles' ? getCatalogSections(slug) : Promise.resolve([]),
  ]);
  if (!siteData) return <CmsConfigurationNotice />;
  if (!pageData) notFound();
  return <PublicPage pageData={pageData} siteData={siteData} page={slug} games={games} catalogSections={catalogSections} />;
}
