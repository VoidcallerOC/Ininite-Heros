# Infinite Heroes Comics CMS

This repository contains the production CMS foundation for the **Infinite Heroes Comics** website. It replaces the former static HTML site with a Vercel-ready **Next.js App Router** application backed by **Supabase Auth and Postgres**. The public experience retains the existing emerald-and-black design system, authentic store photography, existing `.html` URLs, accessibility patterns, canonical metadata, and business details. Site content is now seeded in and retrieved from Postgres; it is not the primary source in hard-coded HTML files.

## Architecture

| Layer | Implementation | Responsibility |
| --- | --- | --- |
| Public web application | Next.js 15 App Router | Renders each public page from published CMS records while preserving `/comics.html`, `/cards.html`, `/collectibles.html`, `/about.html`, and `/visit.html`. |
| Content database | Supabase Postgres | Stores settings, pages, sections, media metadata, card games, events, social links, hours, profiles, and analytics events. |
| Authentication | Supabase Auth magic links | Sends passwordless sign-in links; users must also hold an explicitly assigned `admin` profile role. |
| Authorization | Server action guards + Postgres RLS | Each CMS mutation calls `requireAdmin`; Postgres independently restricts writes and analytics reads to `admin` accounts. |
| Media storage | Vercel Blob + CMS media records | Authenticated admins can upload image files through the protected media route; bundled current photography remains available under `/assets`. |
| Analytics | First-party Next route + server-only Supabase client | Stores only page path, origin-only referrer, anonymous session UUID, and timestamp. It is visible only in the admin dashboard. |
| Deployment | Vercel | `vercel.json` identifies the Next.js application and caches immutable local assets. |

> **Design-system boundary:** The CMS manages content, images, links, card-game listings, events, hours, and business information. It does not expose typography, font size, layout, color palette, or brand controls to administrators.

## Initial setup

1. Create a Supabase project and copy `.env.example` to `.env.local` for local development. Populate all required variables.
2. Apply the migration at `supabase/migrations/20260912103000_cms_foundation.sql` through the Supabase SQL editor or `supabase db push`. It creates tables, indexes, RLS policies, functions, and the current Infinite Heroes content seed.
3. In **Supabase Authentication**, enable Email / magic-link sign-in. Add `http://localhost:3000/api/auth/callback` and `https://YOUR-DOMAIN/api/auth/callback` to the redirect allow list.
4. Use `/admin/login` once with the owner email. Then, in the Supabase SQL editor, explicitly grant that account access:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'owner@example.com';
   ```

5. For image uploads, create a Vercel Blob store and set its `BLOB_READ_WRITE_TOKEN` in Vercel. For first-party page-view recording, set the server-only `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
6. Set the equivalent production environment variables in Vercel and deploy. Run `npm run seed:check` after the migration to verify anonymous public reads can see the seed data.

## Environment variables

| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser and server | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser and server | Supabase publishable/anon key; RLS enforces public and admin access boundaries. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for analytics | Server only | Writes anonymous analytics events. It is never imported by client code. |
| `BLOB_READ_WRITE_TOKEN` | Yes for uploads | Server only | Allows the authenticated `/api/admin/media/upload` route to create Vercel Blob objects. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Browser and server | Canonical site origin and Supabase magic-link callback origin. |
| `CMS_INTEGRATION_TESTS` | Test only | Local test process | Set to `1` only when intentionally running live connectivity and CRUD tests. Do not set in Vercel. |

## Admin authentication and protection

The `/admin/login` page uses Supabase passwordless email links. Signing in alone is not sufficient. The database trigger creates a `profiles` row with the conservative `editor` default; an existing administrator must promote the intended account to `admin` explicitly. The protected admin route layout then calls `requireAdmin`, which retrieves the verified Auth user from Supabase and confirms `profiles.role = 'admin'` before rendering any CMS interface. Every mutation is a server action that repeats this check. Row Level Security policies independently prevent anonymous or non-admin writes, even if a client bypasses the UI.

## Public content retrieval

Public routes use server-side `getPublishedPage()` and `getPublicSiteData()`. They query only `pages.published = true` and published sections. Supabase RLS also enforces that public readers can see only published page records and sections belonging to published pages. Public content changes trigger `revalidatePath` for the public routes and sitemap, so the approved visual components render updated database content without a redeploy.

## Database schema

| Table | Purpose |
| --- | --- |
| `profiles` | Links Supabase Auth users to CMS roles. |
| `site_settings` | Address, phone, email, timezone, maps URL, site description, and footer settings. |
| `pages` | Public page metadata, URL slug, SEO fields, Open Graph image, and publication state. |
| `page_sections` | Ordered typed content blocks stored as validated JSONB payloads. |
| `media` | Image metadata, descriptive alt text, URL, dimensions, MIME type, and storage provider. |
| `card_games` | Managed trading-card/game listings for the real Cards page. |
| `events` | Publishable store events using timezone-aware timestamps. |
| `social_links` | Ordered public social destinations. |
| `business_hours` | Daily shop hours and closed-day state. |
| `analytics_events` | First-party page view data, restricted to administrators. |

## Commands and tests

```bash
npm install
npm run dev
npm run verify
npm run check:browser        # run while `npm run start` is serving the production build
npm run seed:check           # requires Supabase public variables after applying migration
npm run test:integration     # requires CMS_INTEGRATION_TESTS=1 plus Supabase variables
```

`npm run verify` runs CMS architecture validation, seed-content validation, TypeScript validation, unit tests, and the production build. Unit tests cover role authorization and input validation. Integration tests cover anonymous database connectivity, RLS denial of anonymous writes, and authenticated administrator CRUD; they are intentionally skipped unless explicitly enabled with real Supabase credentials because they create and remove a temporary Auth user and draft page.

## Manual configuration still required

No Supabase or Vercel project credentials were available in this repository, so applying the SQL migration, adding Vercel environment variables, configuring Supabase email delivery and redirect allow-lists, promoting the initial admin account, and creating a Vercel Blob store must be completed by the project owner. The application build, static architecture validation, content seed validation, and unit tests can run without those credentials; live database and authenticated end-to-end tests cannot truthfully be claimed until the credentials are configured.
