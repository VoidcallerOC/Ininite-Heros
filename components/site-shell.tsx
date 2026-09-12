import Link from 'next/link';
import Script from 'next/script';
import type { BusinessHour, PublicSiteData } from '@/lib/cms';
import { AnalyticsTracker } from '@/components/analytics-tracker';

const navigation = [
  { href: '/', label: 'Home', page: 'home' },
  { href: '/comics.html', label: 'Comics', page: 'comics' },
  { href: '/cards.html', label: 'Cards', page: 'cards' },
  { href: '/collectibles.html', label: 'Collectibles', page: 'collectibles' },
  { href: '/about.html', label: 'About', page: 'about' },
];

function timeForStatus(hours: BusinessHour[]) {
  return Object.fromEntries(hours.map((hour) => [String(hour.day_of_week), hour.is_closed ? null : {
    open: Number(hour.open_time?.slice(0, 2) ?? 0) * 60 + Number(hour.open_time?.slice(3, 5) ?? 0),
    close: Number(hour.close_time?.slice(0, 2) ?? 0) * 60 + Number(hour.close_time?.slice(3, 5) ?? 0),
  }]));
}

export function formatHours(hour: BusinessHour) {
  if (hour.is_closed) return 'Closed';
  const format = (time: string | null) => {
    if (!time) return '';
    const [h, m] = time.slice(0, 5).split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const display = h % 12 || 12;
    return `${display}${m ? `:${String(m).padStart(2, '0')}` : ''} ${suffix}`;
  };
  return `${format(hour.open_time)}–${format(hour.close_time)}`;
}

export function CmsConfigurationNotice() {
  return <main className="cms-state" id="main-content"><h1>Content service setup required</h1><p>The Infinite Heroes application is deployed, but its public CMS data is not connected yet. Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, apply the supplied migration, and publish the seeded content.</p></main>;
}

export function SiteShell({ children, currentPage, data }: Readonly<{ children: React.ReactNode; currentPage: string; data: PublicSiteData }>) {
  const settings = data.settings;
  const businessName = settings.business_name || 'Infinite Heroes Comics';
  const logo = '/assets/images/infinite-heroes-logo.webp';
  const socials = data.socials;
  const currentYear = new Date().getFullYear();

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" href="/" aria-label={`${businessName} home`}><img className="brand__logo" src={logo} width="620" height="394" alt={businessName} /></Link>
          <button className="menu-toggle" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="Open navigation menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeLinecap="square" strokeWidth="2.5" d="M3 6h18M3 12h18M3 18h18" /></svg></button>
          <nav className="site-nav" id="site-nav" aria-label="Primary navigation">
            {navigation.map((item) => <Link key={item.page} href={item.href} aria-current={item.page === currentPage ? 'page' : undefined}>{item.label}</Link>)}
            <Link className="nav-cta" href="/visit.html" aria-current={currentPage === 'visit' ? 'page' : undefined}>Visit the shop</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="site-footer"><div className="container"><div className="footer-grid footer-grid--home"><div><Link className="brand" href="/" aria-label={`${businessName} home`}><img className="brand__logo" src={logo} width="620" height="394" alt={businessName} /></Link><p className="footer-summary">Comics and collectibles in Watertown, Connecticut.</p></div><div><p className="footer-title">Explore</p><nav className="footer-links" aria-label="Footer navigation">{navigation.slice(1).map((item) => <Link key={item.page} href={item.href}>{item.label === 'About' ? 'About the Shop' : item.label}</Link>)}<Link href="/visit.html">Visit &amp; Contact</Link></nav></div><div><p className="footer-title">Visit</p><div className="footer-links"><a href={settings.maps_url} target="_blank" rel="noopener">{settings.address_line_1}, {settings.address_line_2?.replace(', ', ', ')}</a><a href={`tel:${settings.phone_e164}`}>{settings.phone_display}</a><a href={`mailto:${settings.email}`}>{settings.email}</a></div></div><div><p className="footer-title">Hours</p><div className="footer-links footer-hours">{data.hours.map((hour) => <span key={hour.id}>{hour.label.slice(0, 3)} — {formatHours(hour)}</span>)}</div><p className="footer-title footer-title--spaced">Social</p><div className="footer-links">{socials.map((social) => <a key={social.id} href={social.url} target="_blank" rel="noopener">{social.label}</a>)}</div></div></div><div className="footer-bottom"><span>© {currentYear} {businessName}</span><span>{settings.copyright_location || 'Watertown, Connecticut'}</span></div></div></footer>
      <AnalyticsTracker />
      <Script id="shop-hours" strategy="beforeInteractive">{`window.__IH_HOURS__ = ${JSON.stringify(timeForStatus(data.hours))}; window.__IH_TIME_ZONE__ = ${JSON.stringify(settings.time_zone || 'America/New_York')};`}</Script>
      <Script src="/assets/js/site.js" strategy="afterInteractive" />
    </>
  );
}
