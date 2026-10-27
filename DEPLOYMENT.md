# Deployment Guide

## Theme Schedule

Shared blog pages use the light theme from 06:00 to 18:00 in Asia/Seoul and the
dark theme otherwise, regardless of the visitor's browser timezone. The single
theme switch at the top of the homepage overrides the schedule until the next
06:00/18:00 boundary. That selection persists across navigation/reloads when
local storage is available. Open pages switch automatically and recheck on focus.
Independent HTML posts retain their original styles and do not inherit this theme.
Run `node tests/theme-browser.mjs` against a local server to verify scheduling,
override expiry and both themes; `TEST_URL` and `PLAYWRIGHT_PATH` are supported.

## HTML Posts

Markdown remains supported. Add an `.html` file under `posts/` to publish a
self-contained interactive document. See `tests/fixtures/html-demo.html` for the
required leading HTML comment containing YAML frontmatter. HTML requires string
`title`, `date`, `category`, and `description`; quote dates. `label` and `scope`
follow the Markdown conventions. Visibility defaults to private, except folders
in `allow.yml`. The extension is omitted from the public post URL.

HTML posts at `/posts/...` redirect to the authenticated `/html-posts/...`
endpoint and display as independent documents, without a blog wrapper or iframe.
The response retains a CSP sandbox. Inline CSS and
JavaScript work; external scripts, CSS, network requests, nested frames, forms,
shared storage, and parent DOM access are intentionally blocked. Images must use
data/blob URLs. HTML-local `resource/` files and JS modules are not supported in
this first version. Documents use the full browser viewport and their own
scrolling and responsive styles. HTML authors provide their own title and layout.
The server adds a metadata bar (back link, date, category, labels and private
status) at the start of the body, isolated using declarative Shadow DOM. Put
`<psnote-meta></psnote-meta>` inside the body to choose its location instead.
The source file, styles and scripts are unchanged. Missing description/Open Graph
head metadata is filled from frontmatter without replacing existing values.

Do not place a Markdown and HTML post at the same slug. `npm run build` validates
duplicates and HTML metadata before compiling. Files in `resource/` and symlinks
are excluded from HTML/Markdown discovery. Deployment traces explicitly include
the source `posts/` files for server-side reading; they are not public assets.

Only raster images and PDFs are exposed by the resource route or copied to
`public/posts`. Existing Markdown resource visibility remains directory-based:
resources shared with a public Markdown post may be public. Never mix private
resources into such a directory. HTML posts do not make shared resources public.

Run `npm test`, `npm run lint`, and `npm run build` for automated checks.
For browser integration checks, install Playwright and Chromium separately, run
the server with `BLOG_AUTH_PASSWORD=local-html-test`, then run
`node tests/browser.mjs`. Set `PLAYWRIGHT_PATH` to an installed Playwright module
and `TEST_URL` to override the default `http://localhost:3100`. The browser test
creates and removes temporary public/private HTML posts on a local server only
(no demo post is deployed) and writes screenshots to
`/tmp/blog-html-desktop.png` and `/tmp/blog-html-mobile.png`.

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
