-- Phase 3: persistent media metadata and image captions.
-- Apply after 20260912103000_cms_foundation.sql.

alter table public.media add column if not exists title text;
alter table public.media add column if not exists caption text;
alter table public.media add column if not exists original_filename text;
alter table public.media add column if not exists legacy_urls text[] not null default '{}';
alter table public.media add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_media_updated_at on public.media;
create trigger set_media_updated_at before update on public.media for each row execute function public.set_updated_at();

alter table public.media drop constraint if exists media_title_length_check;
alter table public.media add constraint media_title_length_check check (title is null or char_length(title) <= 180);
alter table public.media drop constraint if exists media_caption_length_check;
alter table public.media add constraint media_caption_length_check check (caption is null or char_length(caption) <= 500);
alter table public.media drop constraint if exists media_original_filename_length_check;
alter table public.media add constraint media_original_filename_length_check check (original_filename is null or char_length(original_filename) <= 255);
