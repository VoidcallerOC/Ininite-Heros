-- Phase 4: ordered, visible Comics and Collectibles catalog sections.
-- Apply after 20260912103000_cms_foundation.sql.

create table public.catalog_sections (
  id uuid primary key default gen_random_uuid(),
  catalog_type text not null check (catalog_type in ('comics', 'collectibles')),
  title text not null check (char_length(title) between 1 and 160),
  description text not null check (char_length(description) between 1 and 1200),
  image_url text,
  image_alt text,
  cta_label text not null check (char_length(cta_label) between 1 and 100),
  cta_href text not null check (char_length(cta_href) between 1 and 300),
  sort_order integer not null default 0 check (sort_order between 0 and 999),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index catalog_sections_order_idx on public.catalog_sections(catalog_type, enabled, sort_order);
alter table public.catalog_sections enable row level security;
create policy "public can read enabled catalog sections" on public.catalog_sections for select using (enabled = true);
create policy "admins manage catalog sections" on public.catalog_sections for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger set_catalog_sections_updated_at before update on public.catalog_sections for each row execute function public.set_updated_at();

insert into public.catalog_sections (catalog_type, title, description, image_url, image_alt, cta_label, cta_href, sort_order, enabled) values
  ('comics', 'NEW COMICS', 'The weekly drop. Come in on Wednesday or catch the issues that are still on the rack.', '/assets/images/new-comics.webp', 'New comic books at Infinite Heroes Comics', 'See new comics', '/visit.html', 10, true),
  ('comics', 'DC & MARVEL', 'The big two, plus the indie and mid-list titles that sit next to them.', '/assets/images/dc-comics.webp', 'DC comics at Infinite Heroes Comics', 'Browse the wall', '/visit.html', 20, true),
  ('comics', 'GRAPHIC NOVELS AND WALL BOOKS', 'Trades and hardcovers for the longer sit-down, not just the weekly pull.', '/assets/images/shop-detail-2.webp', 'Graphic novels and wall books at Infinite Heroes Comics', 'Find a longer read', '/visit.html', 30, true),
  ('collectibles', 'FIGURES & STATUES', 'Characters and worlds that sit on a shelf, not just in a longbox.', '/assets/images/collectibles-and-statues.webp', 'Figures and statues at Infinite Heroes Comics', 'See the display', '/visit.html', 10, true),
  ('collectibles', 'FUNKO POP VINYLS', 'The recognizable faces, when they are in stock.', '/assets/images/shop-detail-3.webp', 'Funko Pop vinyl figures at Infinite Heroes Comics', 'Check availability', '/visit.html', 20, true),
  ('collectibles', 'WHAT IS ON THE FLOOR', 'Inventory moves. Call or stop in before you drive for one piece.', '/assets/images/shop-detail-4.webp', 'Collectibles on the shop floor at Infinite Heroes Comics', 'Plan your visit', '/visit.html', 30, true);
