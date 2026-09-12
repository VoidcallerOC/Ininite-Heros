-- Phase 2: global business information, homepage editing, preview, and restore history.
-- Apply after 20260912103000_cms_foundation.sql.

create table public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('site_settings', 'pages', 'page_sections', 'social_links', 'business_hours')),
  entity_id text not null,
  label text not null check (char_length(label) between 1 and 180),
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index content_revisions_entity_idx on public.content_revisions(entity_type, entity_id, created_at desc);

alter table public.content_revisions enable row level security;
create policy "admins manage content revisions" on public.content_revisions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Preserve a human-readable business description as a global setting.
insert into public.site_settings (key, label, value) values
  ('business_description', 'Business description', 'Infinite Heroes Comics is the Main Street comic shop in Watertown, Connecticut — new comics and collectibles.'),
  ('footer_summary', 'Footer summary', 'Comics and collectibles in Watertown, Connecticut.'),
  ('footer_legal', 'Footer legal line', 'Independent comics and collectibles shop on Main Street.')
on conflict (key) do nothing;

-- Homepage promotional/announcement content is a typed, design-safe section.
alter table public.page_sections drop constraint if exists page_sections_section_type_check;
alter table public.page_sections add constraint page_sections_section_type_check
  check (section_type in ('hero', 'rich-text', 'feature-list', 'image-gallery', 'call-to-action', 'cards', 'events', 'hours', 'announcement'));

insert into public.page_sections (page_id, key, label, section_type, content, sort_order, published)
select p.id, 'announcement', 'Homepage announcement', 'announcement',
  '{"enabled":false,"eyebrow":"Now at the shop","title":"What is happening this week.","body":"Announcements and promotions can be published here when there is something worth sharing.","buttonLabel":"Visit the shop","buttonHref":"/visit.html"}'::jsonb,
  5, true
from public.pages p
where p.slug = 'home'
on conflict (page_id, key) do nothing;

insert into public.page_sections (page_id, key, label, section_type, content, sort_order, published)
select p.id, 'cta', 'Homepage call to action', 'call-to-action',
  '{"eyebrow":"07 — Come by","title":"Your next favorite is waiting.","body":"Bring a pull list or just bring time.","buttonLabel":"Visit the shop","buttonHref":"/visit.html"}'::jsonb,
  70, true
from public.pages p
where p.slug = 'home'
on conflict (page_id, key) do nothing;
