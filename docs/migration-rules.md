# Historical blog migration rules

These are the user's migration requirements. Apply them to Naver Blog, Tistory,
and Hugo imports; do not rewrite the user's historical writing.

## Confirmed sources and collection choice (2026-10-31)

- Naver: https://blog.naver.com/palyly
- Tistory: https://paulsmooth.tistory.com/
- Hugo site: https://pskim-b.github.io/
- Hugo source: private repository `pskim-b/hugo-blog`. Its `.gitmodules` points
  the `public` submodule to `pskim-b/pskim-b.github.io`, confirming the relationship.

The user chose **administrator backups first**, rather than a logged-in browser
collection pass. The user requires private originals to remain privately stored.
This includes raw exports, bodies, assets and any sensitive inventory metadata.
Do not commit them to the current public `vercel-my-blog` repository. A web-level
`scope: private` flag does not make a public Git blob private. Before importing
private content into production, provision genuinely private content storage and
review the authentication audience. Until then, private imports remain pending.

## Mandatory rules

1. Keep the exact original URL, including path, query and fragment. Display
   **원문 보기** on both Markdown and HTML posts so the original site/style is
   reachable. Also retain the source post ID and Hugo repository-relative source
   path when available. Keep original files/exports as migration evidence.
2. Preserve original tags and add the canonical source label: `naver`, `tistory`,
   or `hugo`. These are labels, not replacement categories. Imported historical
   posts must not receive `ai-generate` or `ai-generated` labels. The reader
   normalizes imported labels and enforces this policy.
3. Markdown and HTML are both valid targets. Preserve all prose, code (including
   whitespace and language), images, captions, tables, graphs and their data.
   Inventory these before conversion and reconcile every item after import.
   Download assets where possible and retain source-to-local mappings. Check
   that images actually load and tables/graphs render; counting links alone is
   insufficient. Missing or unverifiable items block completion of that post;
   record them as pending rather than silently dropping them.
4. `date` must equal `migration.originalPublishedAt`: the source's publication
   date/time at its original precision and timezone. Quote dates. Do not use
   migration time or a source's last-modified date as the publication date. Store
   import time separately in `migration.importedAt`. Do not invent missing times
   or timezones; date-only sources remain date-only. Resolve ambiguous timestamp
   formats from source evidence before importing.
5. The archive must support posts from the 2000s and earlier. Index by publication
   year independently of labels, allow year + label/category filtering, and keep
   the visible post's year/month displayed while scrolling. Use the source's
   recorded calendar year/month rather than the server/browser timezone.

## Metadata contract

```yaml
---
title: "Original title"
date: "2004-01-01T00:30:00+09:00"
category: "note"
label: ["writing", "tistory"]
scope: private
migration:
  source: tistory
  originalUrl: "https://example.tistory.com/entry/original-post"
  originalPath: "/entry/original-post"
  originalId: "123"
  originalPublishedAt: "2004-01-01T00:30:00+09:00"
  importedAt: "2026-10-30T10:00:00+09:00"
---
```

`originalPath` is derived from the original URL when omitted; when supplied it
must match its path, query and fragment. `originalId` and `sourcePath` are optional
strings. `sourcePath` is especially useful for Hugo, e.g.
`content/posts/book/original-post.md`. HTML posts use the same metadata in the
leading frontmatter comment and additionally require `description`.

Source URLs must use HTTP(S) without embedded credentials. Invalid migration
metadata, publication-date mismatches, or missing import timestamps fail content
validation. Unmigrated legacy posts retain their existing behavior.

## Batch record and acceptance

Before bulk import, create a manifest outside `posts/`, under
`migrations/<batch-id>/manifest.json`. For each source post record its platform,
original URL/ID, source publication date, target slug/format, import timestamp,
source-file checksum, source/local asset mappings and checksums, and code/image/
table/graph reconciliation results. Use explicit states such as `pending`,
`verified`, and `blocked`, with reasons for any unresolved item. Deduplicate
against both other platforms and existing posts before writing targets; retain
all alternate source URLs in the manifest. Re-running a batch must not duplicate
posts or replace original publication dates.

An original URL preserves a route to the old presentation, not a guarantee the
external site will remain online. Retain original exports and available original
HTML/assets alongside the migration records for future recovery. Do not put raw
source archives under the discovered `posts/` tree or publicly served folders.

The current standalone HTML sandbox blocks external scripts/styles/network
requests and permits embedded images. Convert dependencies to self-contained
content or embedded assets while preserving their visible results and original
data. If a graph or interactive element cannot be preserved, mark the post
blocked and resolve it before considering the import complete. Do not relax the
sandbox as an import shortcut.

Preserve each source's visibility. The target defaults to private, but `book`,
`poem`, and `study` are public folders via `posts/allow.yml`; never place a private
source post into one of those folders. Review visibility and resource sharing
explicitly. Test a representative sample from each source, including old dates,
code, tables, images and graphs, before applying the same conversion in bulk.

## Private content and complete enumeration

Administrator backups must be reconciled against an **owner-visible inventory**,
not assumed to contain everything. Record the source post ID, exact URL when one
exists, source publication time, category, visibility, and any draft/protection
state. Include owner-visible posts hidden by categories or audience restrictions.
Preserve public/private/protected/neighbors/mutual-neighbors distinctions in the
private ledger; restricted audiences map to private initially, never to public.
Drafts without a publication time are separately pending: do not invent one to
fit the target schema. Deleted/unavailable posts can only be recovered from an
existing export or other source evidence, not inferred from gaps in numeric IDs.

Use owner backups as the starting source for Naver and Tistory. Naver's official
export is a PDF workflow, with date/category/visibility filters:
https://help.naver.com/service/5593/contents/15295?lang=ko&osType=PC.
Treat PDF as preservation evidence; verify whether structured HTML/editor data
and separate assets are also needed to preserve code, tables and graphs. For
Tistory, inspect the actual administrator export and verify its private/protected
coverage and attachment coverage against the owner inventory. Do not assert
that either export contains all visibility states without checking the files.

For Hugo, enumerate source content and its assets, inspect `draft`, `publishDate`,
`expiryDate`, build settings and relevant branches/working directories, and
compare rendered permalinks with the public output/sitemap. A private repository
does not mean every contained post is private; determine visibility per post.

Every authoritative source ID gets a ledger entry **before conversion**. Track
`discovered`, `collected`, `imported`, `verified`, `blocked`, or an explicitly
reasoned exclusion, plus the target URL when available. Match sets of IDs and
URLs, not just counts: equal counts can still conceal a missing post and a
duplicate. All source IDs must have a disposition. A full migration is complete
only when no unexplained or blocked entries remain and content/asset checks pass.
Reconcile additional totals by source, year, category and visibility.

When multiple source posts map to one target, retain a record for every original
and link each to the shared target; preserve all source labels and original URLs.
Do not compare distinct target count directly with original post count. A public
RSS feed or sitemap is only an additional discovery/check source, never proof
that all private or historical posts were enumerated. Avoid numeric-ID brute
force as a completeness strategy.

The initial **public-only** snapshot is under
`migrations/2026-10-31-discovery/`: Tistory has 93 candidate post URLs in 237
unique sitemap URLs; Hugo has 44 candidate post URLs in 82 unique sitemap URLs.
These are not authoritative totals. The Hugo source tree
`9e32db95a0ee7dafb80fc946e71487271fa39547` has 44 document candidates under
`content/` and 2 under `working/`; individual publication states are unverified.
Naver's complete inventory remains pending the owner's administrator export.
No private source bodies or assets have been written to this public repository.
