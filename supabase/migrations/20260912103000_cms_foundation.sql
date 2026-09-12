-- Infinite Heroes CMS foundation
-- Apply with: supabase db push (or paste into the Supabase SQL editor).

create extension if not exists pgcrypto;

create type public.cms_role as enum ('admin', 'editor');
create type public.media_storage_provider as enum ('public', 'vercel_blob');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role public.cms_role not null default 'editor',
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  label text not null check (char_length(label) between 1 and 120),
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 1 and 140),
  seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text check (seo_description is null or char_length(seo_description) <= 160),
  og_image_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9-]+$'),
  label text not null check (char_length(label) between 1 and 120),
  section_type text not null check (section_type in ('hero', 'rich-text', 'feature-list', 'image-gallery', 'call-to-action', 'cards', 'events', 'hours')),
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0 check (sort_order between 0 and 999),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, key)
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 140),
  alt_text text not null check (char_length(alt_text) between 1 and 250),
  url text not null,
  width integer check (width is null or width between 1 and 20000),
  height integer check (height is null or height between 1 and 20000),
  mime_type text not null check (char_length(mime_type) between 1 and 120),
  storage_provider public.media_storage_provider not null default 'public',
  created_at timestamptz not null default now()
);

create table public.card_games (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text not null check (char_length(description) between 1 and 700),
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0 check (sort_order between 0 and 999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  description text check (description is null or char_length(description) <= 4000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  image_url text,
  registration_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (char_length(platform) between 1 and 80),
  label text not null check (char_length(label) between 1 and 80),
  url text not null,
  sort_order integer not null default 0 check (sort_order between 0 and 999),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null unique check (day_of_week between 0 and 6),
  label text not null check (char_length(label) between 1 and 80),
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  sort_order integer not null check (sort_order between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_closed and open_time is null and close_time is null) or (not is_closed and open_time is not null and close_time is not null and close_time > open_time))
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null default 'page_view' check (event_type in ('page_view')),
  path text not null check (path like '/%'),
  referrer text,
  session_id uuid,
  occurred_at timestamptz not null default now()
);

create index page_sections_page_sort_idx on public.page_sections(page_id, sort_order);
create index card_games_active_sort_idx on public.card_games(active, sort_order);
create index events_published_starts_idx on public.events(published, starts_at);
create index analytics_events_occurred_at_idx on public.analytics_events(occurred_at desc);
create index analytics_events_path_idx on public.analytics_events(path);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_site_settings_updated_at before update on public.site_settings for each row execute function public.set_updated_at();
create trigger set_pages_updated_at before update on public.pages for each row execute function public.set_updated_at();
create trigger set_page_sections_updated_at before update on public.page_sections for each row execute function public.set_updated_at();
create trigger set_card_games_updated_at before update on public.card_games for each row execute function public.set_updated_at();
create trigger set_events_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger set_social_links_updated_at before update on public.social_links for each row execute function public.set_updated_at();
create trigger set_business_hours_updated_at before update on public.business_hours for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'editor')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.pages enable row level security;
alter table public.page_sections enable row level security;
alter table public.media enable row level security;
alter table public.card_games enable row level security;
alter table public.events enable row level security;
alter table public.social_links enable row level security;
alter table public.business_hours enable row level security;
alter table public.analytics_events enable row level security;

create policy "users can view their own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admins can view profiles" on public.profiles for select to authenticated using (public.is_admin());
create policy "admins can update profiles" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public can read site settings" on public.site_settings for select using (true);
create policy "admins manage site settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public can read published pages" on public.pages for select using (published = true);
create policy "admins manage pages" on public.pages for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public can read published sections for published pages" on public.page_sections for select using (
  published = true and exists (select 1 from public.pages where pages.id = page_sections.page_id and pages.published = true)
);
create policy "admins manage sections" on public.page_sections for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public can read media" on public.media for select using (true);
create policy "admins manage media" on public.media for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public can read active card games" on public.card_games for select using (active = true);
create policy "admins manage card games" on public.card_games for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public can read published events" on public.events for select using (published = true);
create policy "admins manage events" on public.events for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public can read active social links" on public.social_links for select using (active = true);
create policy "admins manage social links" on public.social_links for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public can read business hours" on public.business_hours for select using (true);
create policy "admins manage business hours" on public.business_hours for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admins can read analytics" on public.analytics_events for select to authenticated using (public.is_admin());

-- Seed the current Infinite Heroes content. These values are editable from /admin after setup.
insert into public.site_settings (key, label, value) values
  ('business_name', 'Business name', 'Infinite Heroes Comics'),
  ('address_line_1', 'Address line 1', '1098 Main St'),
  ('address_line_2', 'Address line 2', 'Watertown, CT 06795'),
  ('phone_display', 'Phone display', '860-417-2559'),
  ('phone_e164', 'Phone E.164', '+18604172559'),
  ('email', 'Business email', 'paul@infiniteheroes.net'),
  ('time_zone', 'Time zone', 'America/New_York'),
  ('maps_url', 'Google Maps directions URL', 'https://maps.google.com/?q=1098+Main+St,+Watertown,+CT+06795'),
  ('site_description', 'Default site description', 'Infinite Heroes Comics is the Main Street comic shop in Watertown, Connecticut — new comics and collectibles.'),
  ('copyright_location', 'Footer location', 'Watertown, Connecticut')
on conflict (key) do nothing;

insert into public.media (name, alt_text, url, width, height, mime_type, storage_provider) values
  ('Infinite Heroes logo', 'Infinite Heroes Comics', '/assets/images/infinite-heroes-logo.webp', 620, 394, 'image/webp', 'public'),
  ('New comics', 'New comics on the floor at Infinite Heroes', '/assets/images/new-comics.webp', 1600, 944, 'image/webp', 'public'),
  ('Collectibles and statues', 'Collectible action figures and statues at Infinite Heroes Comics', '/assets/images/collectibles-and-statues.webp', 1600, 944, 'image/webp', 'public'),
  ('Trading cards', 'Trading cards at Infinite Heroes Comics', '/assets/images/trading-cards.webp', 1600, 944, 'image/webp', 'public'),
  ('DC Comics', 'DC comic books at Infinite Heroes Comics', '/assets/images/dc-comics.webp', 1600, 944, 'image/webp', 'public'),
  ('Marvel Comics', 'Marvel comic books at Infinite Heroes Comics', '/assets/images/marvel-comics.webp', 1600, 944, 'image/webp', 'public'),
  ('Shop detail 1', 'A selection of bagged comic books on display', '/assets/images/shop-detail-1.webp', 360, 480, 'image/webp', 'public'),
  ('Shop detail 2', 'A selection of superhero comic books on display', '/assets/images/shop-detail-2.webp', 360, 480, 'image/webp', 'public'),
  ('Shop detail 3', 'Shelves of graphic novels at Infinite Heroes Comics', '/assets/images/shop-detail-3.webp', 360, 480, 'image/webp', 'public'),
  ('Shop detail 4', 'Store shelves at Infinite Heroes Comics', '/assets/images/shop-detail-4.webp', 360, 480, 'image/webp', 'public');

insert into public.pages (slug, title, seo_title, seo_description, og_image_url, published) values
  ('home', 'Home', 'Infinite Heroes Comics | Watertown, CT', 'Infinite Heroes Comics is the Main Street comic shop in Watertown, Connecticut — new comics and collectibles.', '/assets/images/new-comics.webp', true),
  ('comics', 'Comics', 'Comics | Infinite Heroes Comics', 'New comics, DC, Marvel, and wall books at Infinite Heroes in Watertown, Connecticut.', '/assets/images/new-comics.webp', true),
  ('cards', 'Cards', 'Cards | Infinite Heroes Comics', 'Trading cards and the current card scene at Infinite Heroes Comics in Watertown, Connecticut.', '/assets/images/trading-cards.webp', true),
  ('collectibles', 'Collectibles', 'Collectibles | Infinite Heroes Comics', 'Figures, statues, and collectibles at Infinite Heroes Comics in Watertown, Connecticut.', '/assets/images/collectibles-and-statues.webp', true),
  ('about', 'About the Shop', 'About the Shop | Infinite Heroes Comics', 'Paul Santos opened Infinite Heroes Comics in Watertown after a career as a DC Comics editor.', '/assets/images/shop-detail-2.webp', true),
  ('visit', 'Visit & Contact', 'Visit & Contact | Infinite Heroes Comics', 'Visit Infinite Heroes Comics at 1098 Main Street in Watertown, Connecticut.', '/assets/images/shop-detail-4.webp', true)
on conflict (slug) do nothing;

insert into public.page_sections (page_id, key, label, section_type, content, sort_order, published) values
  ((select id from public.pages where slug = 'home'), 'hero', 'Homepage hero', 'hero', $$ {"eyebrow":"01 — Watertown, Connecticut","title":"Every shelf is a new world.","emphasis":"new world.","body":"Paul Santos edited at DC. Now the wall is on Main Street — new comics on Wednesday, collectibles on the floor whenever the door is open.","primaryLabel":"Visit the shop","primaryHref":"/visit.html","secondaryLabel":"See what we carry","secondaryHref":"#what-we-carry","imageUrl":"/assets/images/new-comics.webp","imageAlt":"New comics on the floor at Infinite Heroes","meta":["Comics","Collectibles","Main Street"]} $$::jsonb, 10, true),
  ((select id from public.pages where slug = 'home'), 'intro', 'Homepage introduction', 'rich-text', $$ {"eyebrow":"02 — A home base for fandom","titleLines":["Find your","next","favorite."],"body":["Walk in with a pull list or with nothing but time. Weekly new comics and a wall you can actually browse.","Ask at the counter. That is the shop."]} $$::jsonb, 20, true),
  ((select id from public.pages where slug = 'home'), 'categories', 'Homepage categories', 'cards', $$ {"eyebrow":"03 — Explore the shop","title":"Three ways in.","intro":"New comics, trading cards, and figures on the wall. Same shop. Different rabbit holes.","items":[{"number":"01 / Read","title":"Comics","label":"Explore comics","href":"/comics.html","imageUrl":"/assets/images/new-comics.webp","imageAlt":"New comic books displayed at Infinite Heroes Comics"},{"number":"02 / Play","title":"Cards","label":"Explore cards","href":"/cards.html","imageUrl":"/assets/images/trading-cards.webp","imageAlt":"Trading cards at Infinite Heroes Comics"},{"number":"03 / Display","title":"Collectibles","label":"Explore collectibles","href":"/collectibles.html","imageUrl":"/assets/images/collectibles-and-statues.webp","imageAlt":"Collectible action figures and statues at Infinite Heroes Comics"}]} $$::jsonb, 30, true),
  ((select id from public.pages where slug = 'home'), 'gallery', 'Homepage gallery', 'image-gallery', $$ {"eyebrow":"04 — Inside Infinite Heroes","title":"Browse the real thing.","intro":"New releases, bagged runs, and the wall books that take a longer look. This is a floor, not a catalog.","items":[{"url":"/assets/images/shop-detail-1.webp","alt":"A selection of bagged comic books on display","caption":"Stories in every direction."},{"url":"/assets/images/shop-detail-2.webp","alt":"A selection of superhero comic books on display","caption":"Find your next run."},{"url":"/assets/images/shop-detail-3.webp","alt":"Shelves of graphic novels at Infinite Heroes Comics","caption":"Books made to keep."},{"url":"/assets/images/shop-detail-4.webp","alt":"Rows of current comic books at Infinite Heroes Comics","caption":"Something new to see."}]} $$::jsonb, 40, true),
  ((select id from public.pages where slug = 'home'), 'owner', 'Homepage owner story', 'rich-text', $$ {"eyebrow":"05 — The story behind the shop","title":"From DC to Main Street.","body":["Owner Paul Santos spent more than twenty years in comics, including a run as an editor at DC. He came home to Connecticut and opened Infinite Heroes so the town would have a real shop — not a kiosk."],"buttonLabel":"Meet the shop","buttonHref":"/about.html","imageUrl":"/assets/images/shop-detail-2.webp","imageAlt":"Shelves inside Infinite Heroes Comics"} $$::jsonb, 50, true),
  ((select id from public.pages where slug = 'home'), 'visit', 'Homepage visit panel', 'hours', $$ {"eyebrow":"06 — Find us in Watertown","title":"1098 Main Street.","intro":"Hours, the address, and a phone that rings the counter.","socialHeading":"Follow the week.","socialCopy":"New comics and hours live on @infiniteheroescomics."} $$::jsonb, 60, true),
  ((select id from public.pages where slug = 'comics'), 'hero', 'Comics hero', 'hero', $$ {"eyebrow":"01 — The wall","title":"Comics live here.","body":"Wednesday new comics, DC and Marvel runs, and the books that stay on the wall.","imageUrl":"/assets/images/new-comics.webp","imageAlt":"New comic books at Infinite Heroes Comics"} $$::jsonb, 10, true),
  ((select id from public.pages where slug = 'comics'), 'features', 'Comics features', 'feature-list', $$ {"eyebrow":"02 — The comic shelf","title":"New issues, longer reads.","items":[{"title":"New comics","body":"The weekly drop. Come in on Wednesday or catch the issues that are still on the rack."},{"title":"DC & Marvel","body":"The big two, plus the indie and mid-list titles that sit next to them."},{"title":"Graphic novels & wall books","body":"Trades and hardcovers for the longer sit-down, not just the weekly pull."}]} $$::jsonb, 20, true),
  ((select id from public.pages where slug = 'comics'), 'cta', 'Comics CTA', 'call-to-action', $$ {"eyebrow":"03 — On the floor","title":"Come browse the shelves.","buttonLabel":"Get directions","buttonHref":"/visit.html"} $$::jsonb, 30, true),
  ((select id from public.pages where slug = 'cards'), 'hero', 'Cards hero', 'hero', $$ {"eyebrow":"01 — Trading cards","title":"Find your next pull.","body":"Trading cards have a place at Infinite Heroes. Check the current card scene, then stop in and see what is on the floor.","imageUrl":"/assets/images/trading-cards.webp","imageAlt":"Trading cards at Infinite Heroes Comics"} $$::jsonb, 10, true),
  ((select id from public.pages where slug = 'cards'), 'features', 'Cards features', 'feature-list', $$ {"eyebrow":"02 — The card table","title":"A real page, ready for the next drop.","items":[{"title":"Current card games","body":"The shop can publish the games it is carrying or supporting here as the selection changes."},{"title":"What is happening","body":"Upcoming events and announcements can be published from the admin dashboard without changing the design system."},{"title":"Check before you drive","body":"Card inventory and event details change. Contact the shop for the latest information."}]} $$::jsonb, 20, true),
  ((select id from public.pages where slug = 'cards'), 'games', 'Cards listing', 'cards', $$ {"eyebrow":"03 — Card games","title":"What is in the mix.","emptyTitle":"Updates are on the way.","emptyBody":"Card game listings will appear here when the shop publishes them."} $$::jsonb, 30, true),
  ((select id from public.pages where slug = 'cards'), 'cta', 'Cards CTA', 'call-to-action', $$ {"eyebrow":"04 — Ask at the counter","title":"See what is on the floor.","buttonLabel":"Visit the shop","buttonHref":"/visit.html"} $$::jsonb, 40, true),
  ((select id from public.pages where slug = 'collectibles'), 'hero', 'Collectibles hero', 'hero', $$ {"eyebrow":"01 — Display","title":"Bring fandom home.","body":"Figures and statues next to the comics — pieces you can take off the shelf.","imageUrl":"/assets/images/collectibles-and-statues.webp","imageAlt":"Collectibles at Infinite Heroes Comics"} $$::jsonb, 10, true),
  ((select id from public.pages where slug = 'collectibles'), 'features', 'Collectibles features', 'feature-list', $$ {"eyebrow":"02 — Beyond the page","title":"The details make the display.","items":[{"title":"Figures & statues","body":"Characters and worlds that sit on a shelf, not just in a longbox."},{"title":"Funko Pop vinyls","body":"The recognizable faces, when they are in stock."},{"title":"What is on the floor","body":"Inventory moves. Call or stop in before you drive for one piece."}]} $$::jsonb, 20, true),
  ((select id from public.pages where slug = 'collectibles'), 'cta', 'Collectibles CTA', 'call-to-action', $$ {"eyebrow":"03 — Come take a look","title":"See it in the shop.","buttonLabel":"Plan your visit","buttonHref":"/visit.html"} $$::jsonb, 30, true),
  ((select id from public.pages where slug = 'about'), 'hero', 'About hero', 'hero', $$ {"eyebrow":"01 — Origin","title":"Built for the love of comics.","body":"An independent shop run by someone who already spent a career inside the books."} $$::jsonb, 10, true),
  ((select id from public.pages where slug = 'about'), 'owner-story', 'About owner story', 'rich-text', $$ {"eyebrow":"02 — Meet the owner","title":"Paul Santos has been in the story for decades.","body":["Paul started with an internship at Warner Bros. and spent years as an editor at DC Comics. After California, he came back to Connecticut and opened Infinite Heroes so Watertown would have a real comic shop on Main Street.","The floor is comics-first. Collectibles sit next to the wall. Ask him what to read next."]} $$::jsonb, 20, true),
  ((select id from public.pages where slug = 'about'), 'why', 'About shop belief', 'feature-list', $$ {"eyebrow":"03 — Why this shop","title":"A local shop with a long memory.","intro":"Good shops make it easy to follow a run, find the unexpected book, and feel like you can stay.","items":[{"title":"Industry years","body":"The person behind the counter already worked the books at DC."},{"title":"Comics and the wall","body":"New issues, trades, and collectibles under one roof."},{"title":"Main Street, Watertown","body":"1098 Main. Hours on the door. A phone that reaches the shop."}]} $$::jsonb, 30, true),
  ((select id from public.pages where slug = 'about'), 'cta', 'About CTA', 'call-to-action', $$ {"eyebrow":"04 — Come say hello","title":"The next chapter is in Watertown.","body":"Visit the shop and see the wall in person.","buttonLabel":"Visit Infinite Heroes","buttonHref":"/visit.html"} $$::jsonb, 40, true),
  ((select id from public.pages where slug = 'visit'), 'hero', 'Visit hero', 'hero', $$ {"eyebrow":"01 — Visit","title":"1098 Main Street.","body":"Watertown’s comic shop. Hours on this page. A phone that rings the counter."} $$::jsonb, 10, true),
  ((select id from public.pages where slug = 'visit'), 'details', 'Visit details', 'hours', $$ {"eyebrow":"02 — Plan the stop","title":"We’ll see you in Watertown.","ctaEyebrow":"03 — Before you drive","ctaTitle":"Reach the shop first.","ctaButtonLabel":"Email the shop"} $$::jsonb, 20, true)
on conflict (page_id, key) do nothing;

insert into public.social_links (platform, label, url, sort_order, active) values
  ('facebook', 'Facebook', 'https://www.facebook.com/infiniteheroescomics/', 10, true),
  ('instagram', 'Instagram', 'https://www.instagram.com/infiniteheroescomics/', 20, true);

insert into public.business_hours (day_of_week, label, open_time, close_time, is_closed, sort_order) values
  (1, 'Monday', null, null, true, 1),
  (2, 'Tuesday', '11:00', '16:00', false, 2),
  (3, 'Wednesday', '11:00', '19:00', false, 3),
  (4, 'Thursday', '11:00', '19:00', false, 4),
  (5, 'Friday', '11:00', '19:00', false, 5),
  (6, 'Saturday', '11:00', '19:00', false, 6),
  (0, 'Sunday', '12:00', '17:00', false, 7)
on conflict (day_of_week) do nothing;

-- After creating the first Supabase Auth user, promote it manually in the SQL editor:
-- update public.profiles set role = 'admin' where email = 'owner@example.com';
