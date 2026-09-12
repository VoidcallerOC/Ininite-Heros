# Phase 5 — Trading Cards / Cards System

Phase 5 makes `/cards.html` a real CMS-driven Cards page. It no longer redirects to Comics.

## Public Cards page

The page preserves the Infinite Heroes emerald/black site shell and includes a managed hero, a Magic programming feature, and ordered active card-game cards. Each game card supports an image, accessible alt text, description, optional CTA, and direct link.

The editable Magic feature supports WPN store messaging, Friday Night Magic, Commander, event wording, event frequency, event time, prerelease wording for every new Magic release, featured game slug, and a Cards announcement. The seeded defaults preserve:

- WPN store
- Friday Night Magic
- Commander
- Every Friday
- 7:30 PM
- Prerelease events for every new Magic release

## Admin workflow

Use **Admin → Cards** to edit Cards page and Magic content. The same screen supports adding, editing, reordering, activating/deactivating, or deleting card games. Image URL, alt text, CTA text/link, description, and display order are editable. The visual system remains developer-controlled.

The initial card-game records are Magic: The Gathering, Pokémon, Lorcana, Star Wars, Yu-Gi-Oh!, and More. The public page falls back to these verified records if the CMS is temporarily unavailable.

## Migration

Apply `supabase/migrations/20260912140000_cards_management.sql` after the earlier CMS migrations. It adds card image and CTA metadata, creates the RLS-protected `card_page_content` singleton, seeds editable Magic content, and seeds the six initial card-game records.

## Validation

Validation covers card-game schema, active/inactive state, ordering, image alt text, CTA values, Magic event wording, direct `/cards.html` access, mobile/tablet/desktop rendering, navigation, SEO route metadata, accessibility landmarks, no horizontal overflow, and complete production build checks. Live Supabase CRUD persistence requires the migration and deployment credentials; no live persistence claim is made without those credentials.
