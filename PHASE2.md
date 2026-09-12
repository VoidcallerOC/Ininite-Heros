# Phase 2 — Global Site Content Management

Phase 2 adds owner-facing global business and homepage content management without exposing the visual design system.

## Apply the migration

After the Phase 1 foundation migration, apply:

```text
supabase/migrations/20260912110000_global_content_management.sql
```

The migration creates `content_revisions`, seeds editable business description and footer fields, adds the homepage announcement section, and adds the homepage CTA section. The migration expands the existing section constraint before inserting the announcement record.

## Admin workflow

Use **Admin → Site Settings** to edit the business name, business description, address, phone, email, footer copy, timezone, map link, store hours, and social links. Use **Admin → Pages** to edit each public page’s SEO title, SEO description, Open Graph image, title, and publication state. Each form includes validation feedback, a clear save confirmation, and a browser-native cancel/reset control.

Use **Admin → Homepage** for non-technical editing of the hero, introductory copy, homepage section headings and descriptions, owner story, CTA label/link, and optional promotional announcement. The page includes a live draft preview that updates while typing. Saving creates a revision snapshot; the Restore history panel can restore one of the latest saved homepage versions and creates a safety snapshot before restoring.

The editor does not expose fonts, font sizes, CSS, layout, spacing, colors, responsive breakpoints, or component architecture.

## Public behavior

Public pages read published CMS records. If Supabase is not configured or a CMS request fails, `lib/fallback-content.ts` supplies the verified Infinite Heroes business data, hours, social links, images, page copy, and homepage content. This fallback prevents a blank or broken public site during temporary CMS unavailability. Once the CMS is available again, the database content is used automatically and public route cache paths are revalidated after saves.

## Verification

```bash
npm run verify
npm run check:browser
```

The browser smoke test checks all preserved public routes and the admin sign-in route at mobile (390px), tablet (768px), and desktop (1440px) widths for main-content rendering and horizontal overflow. Live persistence and authenticated admin editing require configured Supabase credentials; the repository includes the real server actions and integration test hooks but does not fabricate a successful live test without credentials.
