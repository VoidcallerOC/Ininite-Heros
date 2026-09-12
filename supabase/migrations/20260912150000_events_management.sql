-- Phase 6: managed events, recurring schedules, and timezone-safe display.
alter table public.events
  add column if not exists category text not null default 'Community event' check (char_length(category) between 1 and 120),
  add column if not exists location text not null default 'Infinite Heroes Comics' check (char_length(location) between 1 and 240),
  add column if not exists image_alt text,
  add column if not exists recurrence text not null default 'none' check (recurrence in ('none', 'weekly')),
  add column if not exists recurrence_day integer check (recurrence_day is null or recurrence_day between 0 and 6),
  add column if not exists timezone text not null default 'America/New_York',
  add column if not exists sort_order integer not null default 0 check (sort_order between 0 and 999),
  add column if not exists max_occurrences integer check (max_occurrences is null or max_occurrences between 1 and 520);

create index if not exists events_published_order_idx on public.events(published, sort_order, starts_at);

insert into public.events (title, category, description, starts_at, ends_at, location, recurrence, recurrence_day, timezone, image_url, image_alt, published, sort_order)
select 'Friday Night Magic — Commander', 'Magic: The Gathering', 'A welcoming Commander table for the local community. New players are welcome; ask the shop about the current event details.', '2026-01-02T19:30:00-05:00'::timestamptz, null, 'Infinite Heroes Comics, 1098 Main St, Watertown, CT', 'weekly', 5, 'America/New_York', '/assets/images/trading-cards.webp', 'Magic: The Gathering cards at Infinite Heroes Comics', true, 10
where not exists (select 1 from public.events where title = 'Friday Night Magic — Commander');
