import { z } from 'zod';

const optionalUrl = z.union([
  z.string().url(),
  z.string().regex(/^\/assets\/[a-zA-Z0-9_./-]+$/, 'Use a valid URL or a managed /assets/ path.'),
  z.literal(''),
  z.null(),
]).transform((value) => value || null);
const requiredText = (label: string, max = 500) => z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

export const pageSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only.').max(80),
  title: requiredText('Title', 140),
  seo_title: z.string().trim().max(70).nullable().optional(),
  seo_description: z.string().trim().max(160).nullable().optional(),
  og_image_url: optionalUrl.optional(),
  published: z.boolean(),
});

export const sectionSchema = z.object({
  id: z.string().uuid().optional(),
  page_id: z.string().uuid(),
  key: z.string().trim().regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only.').max(80),
  label: requiredText('Section label', 120),
  section_type: z.enum(['hero', 'rich-text', 'feature-list', 'image-gallery', 'call-to-action', 'cards', 'events', 'hours', 'announcement']),
  content_json: z.string().trim().min(2, 'Section content JSON is required.').max(30000),
  sort_order: z.coerce.number().int().min(0).max(999),
  published: z.boolean(),
});

export const mediaSchema = z.object({
  id: z.string().uuid().optional(),
  name: requiredText('Name', 140),
  alt_text: requiredText('Alt text', 250),
  url: z.string().url('Provide a valid asset URL.'),
  width: z.coerce.number().int().positive().max(20000).nullable().optional(),
  height: z.coerce.number().int().positive().max(20000).nullable().optional(),
  mime_type: requiredText('MIME type', 120),
  storage_provider: z.enum(['public', 'vercel_blob']),
});

export const cardGameSchema = z.object({
  id: z.string().uuid().optional(),
  name: requiredText('Card game name', 120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only.').max(80),
  description: requiredText('Description', 700),
  image_url: optionalUrl.optional(),
  active: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(999),
});

const dateTimeLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Choose a valid local date and time.');

function newYorkDateTimeToIso(value: string) {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let result = new Date(target);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(result).filter(({ type }) => type !== 'literal').map(({ type, value: part }) => [type, part]));
    const observed = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    result = new Date(result.getTime() + target - observed);
  }
  return result.toISOString();
}

export const eventSchema = z.object({
  id: z.string().uuid().optional(),
  title: requiredText('Event title', 180),
  description: z.string().trim().max(4000).nullable().optional(),
  starts_at: dateTimeLocal.transform(newYorkDateTimeToIso),
  ends_at: dateTimeLocal.transform(newYorkDateTimeToIso).nullable().optional(),
  image_url: optionalUrl.optional(),
  registration_url: optionalUrl.optional(),
  published: z.boolean(),
});

export const settingsSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers, and underscores only.').max(80),
  label: requiredText('Label', 120),
  value: z.string().trim().max(4000),
});

export const homeHeroSchema = z.object({
  eyebrow: requiredText('Hero eyebrow', 120), title: requiredText('Hero title', 160), emphasis: z.string().trim().max(80), body: requiredText('Hero description', 500),
  primaryLabel: requiredText('Primary button label', 80), primaryHref: z.string().trim().min(1).max(300), secondaryLabel: requiredText('Secondary button label', 80), secondaryHref: z.string().trim().min(1).max(300),
  imageUrl: requiredText('Hero image URL', 1000), imageAlt: requiredText('Hero image alt text', 250), meta: z.array(requiredText('Hero highlight', 60)).min(1).max(5),
});

export const homeIntroSchema = z.object({
  eyebrow: requiredText('Intro eyebrow', 120), titleLines: z.array(requiredText('Intro title line', 80)).min(1).max(4), body: z.array(requiredText('Intro paragraph', 500)).min(1).max(3),
});

export const homeSectionSchema = z.object({
  eyebrow: requiredText('Section eyebrow', 120), title: requiredText('Section title', 160), intro: requiredText('Section description', 700),
});

export const homeCtaSchema = z.object({
  eyebrow: requiredText('CTA eyebrow', 120), title: requiredText('CTA title', 160), body: z.string().trim().max(700), buttonLabel: requiredText('CTA button label', 80), buttonHref: z.string().trim().min(1).max(300),
});

export const homeAnnouncementSchema = z.object({
  enabled: z.boolean(), eyebrow: requiredText('Announcement eyebrow', 120), title: requiredText('Announcement title', 160), body: requiredText('Announcement body', 700), buttonLabel: requiredText('Announcement button label', 80), buttonHref: z.string().trim().min(1).max(300),
});

export const socialSchema = z.object({
  id: z.string().uuid().optional(),
  platform: requiredText('Platform', 80),
  label: requiredText('Label', 80),
  url: z.string().url('Provide a valid URL.'),
  sort_order: z.coerce.number().int().min(0).max(999),
  active: z.boolean(),
});

export const hourSchema = z.object({
  id: z.string().uuid(),
  label: requiredText('Day', 80),
  open_time: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM time.'), z.literal('')]),
  close_time: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM time.'), z.literal('')]),
  is_closed: z.boolean(),
});

export const analyticsEventSchema = z.object({
  path: z.string().startsWith('/').max(500),
  referrer: z.string().max(1000).optional().nullable(),
  sessionId: z.string().uuid().optional().nullable(),
});

export function formBoolean(formData: FormData, key: string) {
  return formData.get(key) === 'on';
}

export function nullableFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
