# Deployment Guide

This blog protects posts by default and allows selected public exceptions.

## Visibility Rules

- All posts require authentication by default.
- Top-level folders listed in `posts/allow.yml` are public.
- Any post can bypass authentication with frontmatter:

```markdown
---
title: "Public note"
date: "2026-08-09"
category: "note"
scope: public
---
```

The default public folders are:

```yml
folders:
  - book
  - poem
  - study
```

## Vercel Environment Variables

Set one of these in Vercel Project Settings > Environment Variables:

- `BLOG_AUTH_PASSWORD_HASH`: SHA-256 hex hash of the access key.
- `BLOG_AUTH_PASSWORD`: plain access key. This is easier, but the hash variant is preferred.

Also set:

- `BLOG_AUTH_SESSION_SECRET`: random string used to sign the auth cookie.

Generate a password hash locally:

```bash
node -e "const crypto=require('crypto'); console.log(crypto.createHash('sha256').update('your-access-key').digest('hex'))"
```

Only the signed HttpOnly cookie is sent to the browser. The configured key or hash is read on the server and is not rendered into any page.

## Build

```bash
npm run build
```

During build, `scripts/sync-post-assets.mjs` removes stale generated files under `public/posts` and only copies resources for public posts. Private post resources are served through `/post-assets/...`, which checks authentication before returning the file.
