import { EventsList } from '@/components/public-page';
import { SiteShell } from '@/components/site-shell';
import { getPublicSiteData, getPublishedEvents } from '@/lib/public-data';
import { CmsConfigurationNotice } from '@/components/site-shell';

export const dynamic = 'force-dynamic';
export default async function EventsPage() {
  const [siteData, events] = await Promise.all([getPublicSiteData(), getPublishedEvents()]);
  if (!siteData) return <CmsConfigurationNotice />;
  return <SiteShell currentPage="events" data={siteData}><main id="main-content"><section className="page-hero page-hero--ink"><div className="container page-hero__grid"><div><p className="eyebrow eyebrow--light">Infinite Heroes community</p><h1 className="display">Make a night of it.</h1><p className="page-hero__copy">From Friday Night Magic to special release weekends, this is where the shop calendar comes to life.</p></div></div></section><EventsList events={events} /></main></SiteShell>;
}
