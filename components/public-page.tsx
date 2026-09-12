import Link from 'next/link';
import type { CardGame, CatalogSection, CmsPageData, Json, PublicSiteData, StoreEvent } from '@/lib/cms';
import { contentItems, contentString, contentStrings } from '@/lib/cms';
import { formatHours, SiteShell } from '@/components/site-shell';

const arrow = <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeLinecap="square" strokeWidth="2.4" d="M5 12h13M13 6l6 6-6 6" /></svg>;

type Item = Record<string, Json>;

function SectionHeading({ content, defaultTitle }: { content: Record<string, Json>; defaultTitle: string }) {
  return <div className="section-lede"><div><p className="eyebrow">{contentString(content, 'eyebrow')}</p><h2 className="section-title">{contentString(content, 'title', defaultTitle)}</h2></div>{contentString(content, 'intro') && <p className="section-intro">{contentString(content, 'intro')}</p>}</div>;
}

function Hero({ content, home = false }: { content: Record<string, Json>; home?: boolean }) {
  const title = contentString(content, 'title');
  const emphasis = contentString(content, 'emphasis');
  const split = emphasis && title.includes(emphasis) ? title.split(emphasis) : [title, ''];
  const image = contentString(content, 'imageUrl');
  return <section className={home ? 'hero' : 'page-hero page-hero--ink'} aria-labelledby="page-title"><div className={`container ${home ? 'hero__grid' : 'page-hero__grid'}`}><div>{home && <p className="status-pill" aria-label="Shop hours" aria-live="polite"><span className="status-pill__dot" aria-hidden="true" /> Checking shop status…</p>}<p className={`eyebrow${home || !image ? ' eyebrow--light' : ''}`}>{contentString(content, 'eyebrow')}</p><h1 className="display" id="page-title">{emphasis ? <>{split[0]}<em>{emphasis}</em>{split.slice(1).join(emphasis)}</> : title}</h1><p className={home ? 'hero__copy' : 'page-hero__copy'}>{contentString(content, 'body')}</p>{home && <><div className="hero__actions"><Link className="button button--primary" href={contentString(content, 'primaryHref', '/visit.html')}>{contentString(content, 'primaryLabel', 'Visit the shop')} {arrow}</Link><a className="button button--secondary" href={contentString(content, 'secondaryHref', '#what-we-carry')}>{contentString(content, 'secondaryLabel', 'See what we carry')}</a></div><ul className="hero__meta" aria-label="Shop highlights">{contentStrings(content, 'meta').map((item) => <li key={item}>{item}</li>)}</ul></>}</div>{image && <figure className={home ? 'hero__photo' : 'page-hero__visual'}><img src={image} width="1600" height="944" alt={contentString(content, 'imageAlt', 'Inside Infinite Heroes Comics')} fetchPriority="high" /></figure>}</div></section>;
}

function FeatureList({ content }: { content: Record<string, Json> }) {
  return <section className="content-section"><div className="container content-grid"><div><p className="eyebrow">{contentString(content, 'eyebrow')}</p><h2 className="section-title">{contentString(content, 'title')}</h2>{contentString(content, 'intro') && <p className="section-intro">{contentString(content, 'intro')}</p>}<ul className="feature-list">{contentItems(content, 'items').map((item, index) => <li key={`${contentString(item, 'title')}-${index}`}><span className="feature-list__number">{String(index + 1).padStart(2, '0')}</span><div><h3>{contentString(item, 'title')}</h3><p>{contentString(item, 'body')}</p></div></li>)}</ul></div></div></section>;
}

function CatalogSections({ sections, page }: { sections: CatalogSection[]; page: 'comics' | 'collectibles' }) {
  const label = page === 'comics' ? 'Comics' : 'Collectibles';
  return <section className="catalog-sections" aria-labelledby={`${page}-sections-title`}><div className="container"><div className="section-lede"><div><p className="eyebrow">02 — Explore the selection</p><h2 className="section-title" id={`${page}-sections-title`}>{label} on the floor.</h2></div><nav className="catalog-number-nav" aria-label={`${label} sections`}>{sections.map((section, index) => <a href={`#${page}-section-${section.id}`} key={section.id}><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</a>)}</nav></div><div className="catalog-section-list">{sections.map((section, index) => <article className="catalog-section" id={`${page}-section-${section.id}`} key={section.id}><div className="catalog-section__number">{String(index + 1).padStart(2, '0')}</div><div className="catalog-section__copy"><p className="eyebrow">{String(index + 1).padStart(2, '0')} — {label}</p><h3>{section.title}</h3><p>{section.description}</p><Link className="button button--primary" href={section.cta_href}>{section.cta_label} {arrow}</Link></div><div className="catalog-section__media">{section.image_url ? <img src={section.image_url} width="720" height="480" alt={section.image_alt || `${section.title} at Infinite Heroes Comics`} loading="lazy" /> : <div className="catalog-section__placeholder" role="img" aria-label={`${section.title} image unavailable`}>Image coming soon</div>}</div></article>)}</div></div></section>;
}

function Cta({ content }: { content: Record<string, Json> }) {
  return <section className="cta-band"><div className="container cta-band__grid"><div><p className="eyebrow">{contentString(content, 'eyebrow')}</p><h2 className="section-title">{contentString(content, 'title')}</h2>{contentString(content, 'body') && <p>{contentString(content, 'body')}</p>}</div><Link className="button button--dark" href={contentString(content, 'buttonHref', '/visit.html')}>{contentString(content, 'buttonLabel', 'Visit the shop')}</Link></div></section>;
}

function Announcement({ content }: { content: Record<string, Json> }) {
  if (content.enabled !== true) return null;
  return <section className="cta-band homepage-announcement"><div className="container cta-band__grid"><div><p className="eyebrow">{contentString(content, 'eyebrow')}</p><h2 className="section-title">{contentString(content, 'title')}</h2><p>{contentString(content, 'body')}</p></div><Link className="button button--dark" href={contentString(content, 'buttonHref', '/visit.html')}>{contentString(content, 'buttonLabel', 'Visit the shop')}</Link></div></section>;
}

function HomeIntro({ content }: { content: Record<string, Json> }) {
  const lines = contentStrings(content, 'titleLines');
  const paragraphs = contentStrings(content, 'body');
  return <section className="home-intro"><div className="container burst-copy"><div><p className="eyebrow">{contentString(content, 'eyebrow')}</p><h2 className="stacked-words">{lines.map((line) => <span key={line}>{line}</span>)}</h2></div><div className="intro-card">{paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></div></section>;
}

function HomeCategories({ content }: { content: Record<string, Json> }) {
  return <section className="category-section" id="what-we-carry"><div className="container"><SectionHeading content={content} defaultTitle="Explore the shop" /><div className="category-grid">{contentItems(content, 'items').map((item) => <Link className="category-card" href={contentString(item, 'href', '/')} key={contentString(item, 'title')}><div className="category-card__media"><img src={contentString(item, 'imageUrl')} width="1600" height="944" alt={contentString(item, 'imageAlt')} loading="lazy" /></div><div className="category-card__body"><span className="category-card__number">{contentString(item, 'number')}</span><h3 className="category-card__title">{contentString(item, 'title')}</h3><span className="category-card__link">{contentString(item, 'label')} {arrow}</span></div></Link>)}</div></div></section>;
}

function Gallery({ content }: { content: Record<string, Json> }) {
  return <section className="inside-section"><div className="container"><SectionHeading content={content} defaultTitle="Inside Infinite Heroes" /><div className="inside-gallery">{contentItems(content, 'items').map((item) => <figure className="gallery-item" key={contentString(item, 'url')}><img src={contentString(item, 'url')} width="360" height="480" alt={contentString(item, 'alt')} loading="lazy" /><figcaption>{contentString(item, 'caption')}</figcaption></figure>)}</div></div></section>;
}

function HomeOwner({ content }: { content: Record<string, Json> }) {
  return <section className="owner-section"><div className="container owner-grid"><div><p className="eyebrow">{contentString(content, 'eyebrow')}</p><h2 className="section-title">{contentString(content, 'title')}</h2>{contentStrings(content, 'body').map((paragraph) => <p className="section-intro" key={paragraph}>{paragraph}</p>)}<Link className="button button--primary" href={contentString(content, 'buttonHref', '/about.html')}>{contentString(content, 'buttonLabel')} {arrow}</Link></div>{contentString(content, 'imageUrl') && <figure className="owner-photo"><img src={contentString(content, 'imageUrl')} width="360" height="480" alt={contentString(content, 'imageAlt')} loading="lazy" /></figure>}</div></section>;
}

function HomeVisit({ content, data }: { content: Record<string, Json>; data: PublicSiteData }) {
  const s = data.settings;
  return <section className="visit-section"><div className="container"><SectionHeading content={content} defaultTitle="Visit the shop" /><div className="visit-shop-grid"><div className="visit-shop-card visit-shop-card--details"><span className="visit-shop-card__label">{s.business_name}</span><address>{s.address_line_1}<br />{s.address_line_2}</address><div className="visit-shop-card__contact"><a href={`tel:${s.phone_e164}`}>{s.phone_display}</a><a href={`mailto:${s.email}`}>{s.email}</a></div><a className="button button--primary" href={s.maps_url} target="_blank" rel="noopener">Get directions {arrow}</a></div><div className="visit-shop-card visit-shop-card--hours"><span className="visit-shop-card__label">Shop hours</span><dl className="home-hours">{data.hours.map((hour) => <div key={hour.id}><dt>{hour.label}</dt><dd>{formatHours(hour)}</dd></div>)}</dl></div><div className="visit-shop-card visit-shop-card--social"><span className="visit-shop-card__label">Stay connected</span><h3>{contentString(content, 'socialHeading')}</h3><p>{contentString(content, 'socialCopy')}</p><div className="visit-shop-card__social-links">{data.socials.map((social) => <a href={social.url} target="_blank" rel="noopener" key={social.id}>{social.label} ↗</a>)}</div></div></div></div></section>;
}

function RichText({ content, about = false }: { content: Record<string, Json>; about?: boolean }) {
  const paragraphs = contentStrings(content, 'body');
  if (!about && contentString(content, 'imageUrl')) return <HomeOwner content={content} />;
  return <section className="content-section"><div className="container story-panel"><div className="story-panel__copy"><p className="eyebrow">{contentString(content, 'eyebrow')}</p><h2 className="section-title">{contentString(content, 'title')}</h2>{paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></div></section>;
}

function CardGames({ content, games }: { content: Record<string, Json>; games: CardGame[] }) {
  return <section className="content-section content-section--paper-deep"><div className="container"><SectionHeading content={content} defaultTitle="Card games" />{games.length ? <div className="editorial-card-grid">{games.map((game, index) => <article className="editorial-card" key={game.id}>{game.image_url && <img src={game.image_url} alt="" width="720" height="480" loading="lazy" />}<span className="editorial-card__index">{String(index + 1).padStart(2, '0')}</span><h3>{game.name}</h3><p>{game.description}</p></article>)}</div> : <div className="admin-empty"><strong>{contentString(content, 'emptyTitle')}</strong><p>{contentString(content, 'emptyBody')}</p></div>}</div></section>;
}

function VisitDetails({ content, data }: { content: Record<string, Json>; data: PublicSiteData }) {
  const s = data.settings;
  return <><section className="content-section"><div className="container"><p className="eyebrow">{contentString(content, 'eyebrow')}</p><h2 className="section-title">{contentString(content, 'title')}</h2><div className="visit-grid"><article className="visit-card visit-card--address"><span className="visit-card__label">Location</span><h2>{s.address_line_1}<br />{s.address_line_2?.replace(', ', '\n')}</h2><p><a href={s.maps_url} target="_blank" rel="noopener">Open in Google Maps</a></p></article><article className="visit-card visit-card--hours"><span className="visit-card__label">Shop hours</span><div className="hours-list">{data.hours.map((hour) => <div key={hour.id}><strong>{hour.label}</strong><span>{formatHours(hour)}</span></div>)}</div></article><article className="visit-card visit-card--contact"><span className="visit-card__label">Call or email</span><h2><a href={`tel:${s.phone_e164}`}>{s.phone_display}</a></h2><p><a href={`mailto:${s.email}`}>{s.email}</a></p></article></div></div></section><section className="cta-band"><div className="container cta-band__grid"><div><p className="eyebrow">{contentString(content, 'ctaEyebrow')}</p><h2 className="section-title">{contentString(content, 'ctaTitle')}</h2></div><a className="button button--dark" href={`mailto:${s.email}`}>{contentString(content, 'ctaButtonLabel')}</a></div></section><div className="container" style={{ padding: '1rem 0 3rem' }}><p className="eyebrow">Follow the shop</p><p>{data.socials.map((social, index) => <span key={social.id}>{index > 0 && ' · '}<a href={social.url} target="_blank" rel="noopener">{social.label}</a></span>)}</p></div></>;
}

export function PublicPage({ pageData, siteData, page, games = [], catalogSections = [] }: { pageData: CmsPageData; siteData: PublicSiteData; page: string; games?: CardGame[]; catalogSections?: CatalogSection[]; events?: StoreEvent[] }) {
  const sections = pageData.sections;
  const get = (key: string) => sections.find((section) => section.key === key)?.content ?? {};
  return <SiteShell currentPage={page} data={siteData}><main id="main-content">{page === 'home' ? <><Hero content={get('hero')} home /><Announcement content={get('announcement')} /><HomeIntro content={get('intro')} /><HomeCategories content={get('categories')} /><Gallery content={get('gallery')} /><HomeOwner content={get('owner')} /><HomeVisit content={get('visit')} data={siteData} /><Cta content={get('cta')} /></> : <><Hero content={get('hero')} />{page === 'visit' ? <VisitDetails content={get('details')} data={siteData} /> : <>{(page === 'comics' || page === 'collectibles') ? <CatalogSections sections={catalogSections} page={page} /> : get('owner-story').title ? <RichText content={get('owner-story')} about /> : get('features').title ? <FeatureList content={get('features')} /> : null}{page === 'cards' && <CardGames content={get('games')} games={games} />}<Cta content={get('cta')} /></>}</>}</main></SiteShell>;
}
