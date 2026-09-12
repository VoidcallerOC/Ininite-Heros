# Phase 4 — Comics and Collectibles Content Management

Phase 4 adds dedicated ordered catalog content for the public Comics and Collectibles pages.

## Admin workflow

Use **Admin → Comics & Collectibles** to create, edit, reorder, show, hide, or delete catalog sections. Each record contains a catalog type, title, description, image URL, image alt text, CTA text, CTA link, display order, and enabled state. The form validates content and requires alt text whenever an image is supplied. The interface does not expose fonts, colors, layout, spacing, breakpoints, or CSS controls.

The seeded Comics sections are data records, not hardcoded labels:

1. NEW COMICS
2. DC & MARVEL
3. GRAPHIC NOVELS AND WALL BOOKS

The seeded Collectibles sections are also data records:

1. FIGURES & STATUES
2. FUNKO POP VINYLS
3. WHAT IS ON THE FLOOR

Changing `sort_order` changes the numbered public navigation and display order. Disabling a record removes it from public output while preserving it in the admin database.

## Public rendering

The public Comics and Collectibles pages load enabled `catalog_sections` records from Supabase, sorted by `sort_order` and creation time. The numbered navigation anchors and section numbers are generated from the returned records, so they cannot drift away from the content. Missing images render an accessible “Image coming soon” placeholder; missing or unavailable CMS data falls back to the verified existing Infinite Heroes sections and imagery.

Existing visual styling is preserved through a developer-controlled catalog layout. Content administrators control only the section data.

## Migration and validation

Apply `supabase/migrations/20260912130000_catalog_sections.sql` after the earlier CMS migrations. The migration creates the RLS-protected `catalog_sections` table, public read policy for enabled records, admin management policy, ordering index, updated timestamp trigger, and the current Comics/Collectibles seed records.

Validation includes catalog schema tests, fallback ordering tests, responsive browser assertions at 390px, 768px, and 1440px, numbered navigation checks, TypeScript, full unit/integration test suite, architecture checks, production build, content checks, and dependency audit.
