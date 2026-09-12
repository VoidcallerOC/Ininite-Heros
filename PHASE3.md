# Phase 3 — Admin Media / Photo Management

Phase 3 adds a persistent media library for the Infinite Heroes owner.

## Persistent storage

New image uploads go through `/api/admin/media/upload` and are written to **Vercel Blob** with `access: 'public'`. The database stores the Blob URL and metadata in `public.media`; images are not written to the app filesystem, local storage, memory, or base64 database fields. Uploads require `BLOB_READ_WRITE_TOKEN` and an authenticated administrator session.

Apply `supabase/migrations/20260912120000_media_management.sql` after the Phase 1 and Phase 2 migrations. It adds title, caption, original filename, legacy replacement URLs, and update timestamps to media records.

## Admin capabilities

**Admin → Media** provides a card-based library with thumbnails, title/name, original filename, alt text, optional caption, MIME type, dimensions, upload date, persistent/bundled storage badge, and public usage locations. The owner can upload new images, edit metadata, copy an existing URL for reuse, replace an existing image, and delete unused images.

Replacement uploads preserve the media record identity and update known references in page SEO images, page-section JSON, card-game images, and event images. Previous URLs are retained as legacy aliases so deletion remains protected if a reference update is interrupted. The old Blob object is removed only after the replacement record is committed and references have been processed.

Deletion is blocked whenever the image is referenced by public page content, SEO metadata, cards, or events. The UI shows the reference locations and offers a protected state instead of a destructive delete button. Bundled assets remain undeletable while referenced by seeded content.

## Media selection and public rendering

The homepage editor can select an existing media-library asset and stores a stable `media://<id>` reference. Public page loading resolves those references through the CMS media table. Existing `/assets/images/*` records remain seeded so the current Infinite Heroes appearance is preserved. The current logo, store photography, comic images, collectible images, and trading-card images are all represented in the initial media seed.

## Validation

The upload endpoint validates JPEG, PNG, WebP, and GIF files, rejects empty files, enforces a 10 MB maximum, requires alt text, sanitizes Blob object names, removes orphaned newly uploaded objects when record creation fails, and reports storage/database errors. Metadata validation rejects unsafe URLs, oversized captions, malformed values, and invalid storage providers.

Live upload, replacement, and deletion persistence require a configured Supabase project and Vercel Blob token. The implementation does not claim those live operations were executed in this sandbox because those credentials were not supplied. Static architecture validation, media validation tests, TypeScript checks, production build, audit, and the existing responsive public-route checks pass.
