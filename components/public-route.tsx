import { notFound } from 'next/navigation';
import { CmsConfigurationNotice } from '@/components/site-shell';
import { PublicPage } from '@/components/public-page';
import { getActiveCardGames, getPublicSiteData, getPublishedPage } from '@/lib/public-data';

export async function PublicRoute({ slug }: { slug: string }) {
  const [siteData, pageData, games] = await Promise.all([
    getPublicSiteData(),
    getPublishedPage(slug),
    slug === 'cards' ? getActiveCardGames() : Promise.resolve([]),
  ]);
  if (!siteData) return <CmsConfigurationNotice />;
  if (!pageData) notFound();
  return <PublicPage pageData={pageData} siteData={siteData} page={slug} games={games} />;
}
