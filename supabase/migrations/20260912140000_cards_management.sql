-- Phase 5: trading card games and editable Magic programming content.
-- Apply after 20260912103000_cms_foundation.sql.

alter table public.card_games add column if not exists image_alt text;
alter table public.card_games add column if not exists cta_label text;
alter table public.card_games add column if not exists cta_href text;
alter table public.card_games add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_card_games_updated_at on public.card_games;
create trigger set_card_games_updated_at before update on public.card_games for each row execute function public.set_updated_at();

create table public.card_page_content (
  id text primary key default 'default' check (id = 'default'),
  eyebrow text not null check (char_length(eyebrow) between 1 and 120),
  title text not null check (char_length(title) between 1 and 180),
  description text not null check (char_length(description) between 1 and 1200),
  magic_eyebrow text not null check (char_length(magic_eyebrow) between 1 and 120),
  magic_title text not null check (char_length(magic_title) between 1 and 180),
  magic_description text not null check (char_length(magic_description) between 1 and 1200),
  magic_event_wording text not null check (char_length(magic_event_wording) between 1 and 500),
  magic_event_time text not null check (char_length(magic_event_time) between 1 and 120),
  magic_event_frequency text not null check (char_length(magic_event_frequency) between 1 and 120),
  magic_prerelease_text text not null check (char_length(magic_prerelease_text) between 1 and 500),
  announcement text,
  featured_game_slug text,
  updated_at timestamptz not null default now()
);

alter table public.card_page_content enable row level security;
create policy "public can read card page content" on public.card_page_content for select using (true);
create policy "admins manage card page content" on public.card_page_content for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger set_card_page_content_updated_at before update on public.card_page_content for each row execute function public.set_updated_at();

insert into public.card_page_content (id, eyebrow, title, description, magic_eyebrow, magic_title, magic_description, magic_event_wording, magic_event_time, magic_event_frequency, magic_prerelease_text, announcement, featured_game_slug)
values ('default', '01 — The card table', 'Find your next pull.', 'Trading cards have a place at Infinite Heroes. Find the games, events, and community that are part of the shop.', '02 — Infinite Heroes Magic', 'A WPN store with a Friday table.', 'Infinite Heroes is a Wizards Play Network store built around playing together, learning the formats, and showing up for the next release.', 'Friday Night Magic, Commander, and a table for the local community.', '7:30 PM', 'Every Friday', 'Prerelease events happen for every new Magic release. Check the latest announcement or contact the shop for details.', 'Magic announcements and event details are updated here by the shop.', 'magic');

insert into public.card_games (name, slug, description, image_url, image_alt, cta_label, cta_href, active, sort_order)
values
  ('Magic: The Gathering', 'magic', 'WPN-supported Magic play, Commander nights, Friday Night Magic, and prerelease events for every new release.', '/assets/images/trading-cards.webp', 'Magic: The Gathering cards at Infinite Heroes Comics', 'Explore Magic', '#magic', true, 10),
  ('Pokémon', 'pokemon', 'Pokémon cards and the current trading-card scene at Infinite Heroes.', '/assets/images/trading-cards.webp', 'Pokémon trading cards at Infinite Heroes Comics', 'Ask at the counter', '/visit.html', true, 20),
  ('Lorcana', 'lorcana', 'Disney Lorcana for collectors, players, and the next great pull.', '/assets/images/shop-detail-1.webp', 'Trading cards at Infinite Heroes Comics', 'See what is in stock', '/visit.html', true, 30),
  ('Star Wars', 'star-wars', 'Star Wars cards and collectibles for fans of a galaxy far, far away.', '/assets/images/shop-detail-2.webp', 'Star Wars collectibles at Infinite Heroes Comics', 'Browse the shop', '/visit.html', true, 40),
  ('Yu-Gi-Oh!', 'yu-gi-oh', 'Yu-Gi-Oh! cards and the current card conversation at Infinite Heroes.', '/assets/images/shop-detail-3.webp', 'Trading cards at Infinite Heroes Comics', 'Ask about cards', '/visit.html', true, 50),
  ('More', 'more', 'The card scene changes. Ask the shop what just arrived and what is being played next.', '/assets/images/shop-detail-4.webp', 'Card display at Infinite Heroes Comics', 'Contact the shop', '/visit.html', true, 60)
on conflict (slug) do update set image_alt = excluded.image_alt, cta_label = excluded.cta_label, cta_href = excluded.cta_href;
