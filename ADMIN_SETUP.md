# Infinite Heroes admin setup

The site now runs through the small Node server in `server.js`. Public pages remain ordinary HTML and are hydrated from `/api/content`; the private admin workspace is available at `/admin.html`.

The admin side is **disabled and hidden by default** so the client cannot access it before payment. The architecture, API, persistence, authentication, image management, and analytics remain in place.

Set these environment variables in production:

```bash
ADMIN_PASSWORD='use-a-long-unique-password'
ADMIN_SESSION_SECRET='use-a-long-random-secret'
ADMIN_ENABLED='false'
PORT=8080
```

Keep `ADMIN_ENABLED='false'` until payment is complete. After payment, change only that variable to `true` and restart the server; `/admin.html` and `/api/admin/*` will become available without code changes. When disabled, both the admin page and all admin API routes return `404`, while public content and visitor tracking continue to work.

The default development password is `infinite-heroes-admin`; replace it before deployment. The server writes managed content to `data/content.json`, visitor aggregates to `data/analytics.json`, and uploaded images to `uploads/`. These paths require persistent storage on the host. A purely static host or ephemeral serverless filesystem cannot satisfy the requested persistence without connecting the same API to a managed database and object-storage provider.

The admin intentionally exposes only labeled content, social URL, image URL/upload/alt-text, and analytics controls. Typography, colors, layout, CSS, component structure, and breakpoints are not editable through the interface. Public visitors receive only the public content payload; analytics is protected by the admin session cookie.

Run locally with:

```bash
ADMIN_PASSWORD='local-password' ADMIN_SESSION_SECRET='local-secret' npm start
```

Then visit `http://localhost:8080/admin.html`. For local admin testing, use `ADMIN_ENABLED='true'`. The existing static checks remain available through `npm run verify`.
