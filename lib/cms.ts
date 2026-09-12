export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = 'admin' | 'editor';

export type SiteSetting = {
  key: string;
  value: string;
  label: string;
  updated_at: string;
};

export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  published: boolean;
  updated_at: string;
};

export type PageSection = {
  id: string;
  page_id: string;
  key: string;
  label: string;
  section_type: 'hero' | 'rich-text' | 'feature-list' | 'image-gallery' | 'call-to-action' | 'cards' | 'events' | 'hours' | 'announcement';
  content: Record<string, Json>;
  sort_order: number;
  published: boolean;
  updated_at: string;
};

export type ContentRevision = {
  id: string;
  entity_type: 'site_settings' | 'pages' | 'page_sections' | 'social_links' | 'business_hours';
  entity_id: string;
  label: string;
  snapshot: Json;
  created_by: string | null;
  created_at: string;
};

export type MediaAsset = {
  id: string;
  name: string;
  alt_text: string;
  url: string;
  width: number | null;
  height: number | null;
  mime_type: string;
  storage_provider: 'public' | 'vercel_blob';
  created_at: string;
};

export type CardGame = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  active: boolean;
  sort_order: number;
};

export type StoreEvent = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  image_url: string | null;
  registration_url: string | null;
  published: boolean;
  created_at: string;
};

export type SocialLink = {
  id: string;
  platform: string;
  label: string;
  url: string;
  sort_order: number;
  active: boolean;
};

export type BusinessHour = {
  id: string;
  day_of_week: number;
  label: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  sort_order: number;
};

export type Profile = {
  id: string;
  email: string | null;
  role: Role;
  created_at: string;
};

export type CmsPageData = {
  page: CmsPage;
  sections: PageSection[];
};

export type PublicSiteData = {
  settings: Record<string, string>;
  hours: BusinessHour[];
  socials: SocialLink[];
};

export type ActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

export const initialActionState: ActionState = { status: 'idle', message: '' };

export function contentString(content: Record<string, Json>, key: string, fallback = ''): string {
  const value = content[key];
  return typeof value === 'string' ? value : fallback;
}

export function contentStrings(content: Record<string, Json>, key: string): string[] {
  const value = content[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function contentItems(content: Record<string, Json>, key: string): Array<Record<string, Json>> {
  const value = content[key];
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, Json> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}
