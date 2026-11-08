# Private content outside the public repository

`BLOG_PRIVATE_POSTS_DIR` optionally points to an absolute directory containing
private `.md`/`.html` posts. Its relative paths become normal blog slugs. The
source directory must be outside the public app repository. Duplicate slugs
across public and private sources are configuration errors.

Every post from this directory requires blog authentication, including posts
whose metadata says `scope: public` or whose folder is otherwise public. Private
posts are filtered before labels, section counts and year indexes are rendered
for anonymous readers. The optional root does not alter existing public posts.
Only add self-contained HTML imports or resource-free Markdown working copies: the existing asset route and build
asset copier do not expose files from this directory. Keep originals, downloaded
assets and detailed migration ledgers outside the repository as well.

For a local review, mount/configure the private directory and a temporary access
key when starting the server. Bind the preview server to `127.0.0.1`.

```sh
BLOG_PRIVATE_POSTS_DIR=/absolute/private/staged/posts \
BLOG_AUTH_PASSWORD=your-local-review-key \
npm run dev -- --hostname 127.0.0.1 --port 3106
```

This runtime path is not automatically uploaded or bundled into Vercel. A
production deployment needs genuine private content storage available to that
runtime, or a deployment source that privately includes the content. Do not copy
private files into the public Git repository to make deployment work. Keep the
existing authentication and standalone HTML sandbox enabled.

The Tistory import scripts operate on the private backup audit directory:

```sh
python3 scripts/collect-tistory-assets.py --archive /private/source.zip --workdir /private/batch
node scripts/import-tistory.mjs --workdir /private/batch
python3 scripts/recover-tistory-assets.py --workdir /private/batch
node scripts/import-tistory.mjs --workdir /private/batch
```

The batch must already contain `inventory.json`, `summary.json`, and
`asset-audit.json` from the backup inventory. Collection retains the original ZIP,
checks archive hashes/CRC, and records success/failure for external assets. Font
recovery is recorded as matching family/style/weight, not identical original
missing bytes. Archive recovery only queries unsigned public image URLs and
records the snapshot and remaining visual-review requirement. Never bypass TLS
errors or substitute an arbitrary illustration for a missing source image.

Imports retain the source publication date (including seconds and corroborated
Korean timezone), original ID/path/category/tags and original URL. They add the
`tistory` label without AI-generated attribution. The import timestamp is stable
on re-runs. All converted files initially have private scope. Inline resources,
HTML text, code whitespace and content-element counts are checked. Missing
resources and disabled iframe playback stay visible as review blockers; a
successful conversion is not a declaration that all posts are publish-ready.

Run `tests/tistory-review-browser.mjs` against a loopback review server with
`TISTORY_MIGRATION_WORKDIR`, `TEST_URL`, `BLOG_REVIEW_PASSWORD` and
`PLAYWRIGHT_PATH`. It tests anonymous denial, a private-source post incorrectly
marked public, all 232 Tistory posts after login, year/provenance filters,
representative HTML elements/images, fold controls and mobile/desktop layout.
Fixtures are removed from the private root after the check.


For user-approved category assignments, keep the rule file in the private batch
and run `scripts/apply-tistory-taxonomy.mjs --workdir /private/batch --rules
/private/batch/category-taxonomy-rules.json` before re-importing. It validates all
target sections/types/topics against the catalog, and records the decisions in
private `taxonomy-assignments.json`. Reimport preserves originals and writes the
explicit target to `migration.taxonomy`. These overrides apply to private
Tistory and Hugo review posts, never as a way to override authorization of public posts.
The `source=tistory` menu scopes section/type/topic/year navigation to imported
Tistory posts after authentication. Other posts keep their existing behavior.

## Hugo imports and the combined private library

Hugo source Markdown is inventoried separately from published HTML. Retain both
Git snapshots, commits, source metadata and original paths in a private batch.
Use published article HTML for the original layout, and exact source Markdown
for fenced code. Treat files outside Hugo's content root as working copies with
immutable source-file URLs. Never invent a public permalink or publication time
for them. Preserve date-only precision where that is all the source supplies.
Exact duplicate published routes are aliases, not additional imported posts.

The reproducible pipeline expects private `raw/source` and `raw/published` Git
checkouts. It never runs source repository scripts or Hugo templates:

```sh
python3 scripts/inventory-hugo.py --workdir /private/hugo-batch
node scripts/inventory-hugo-published.mjs --workdir /private/hugo-batch
node scripts/prepare-hugo-import.mjs --workdir /private/hugo-batch
python3 scripts/collect-hugo-assets.py --workdir /private/hugo-batch
# Supply the pinned Mermaid 10.9.3 script in the private batch's tools/ directory.
# PLAYWRIGHT_PATH can point at an existing Playwright installation.
node scripts/render-hugo-diagrams.mjs --workdir /private/hugo-batch
node scripts/import-hugo.mjs --workdir /private/hugo-batch
node scripts/audit-hugo-prose.mjs --workdir /private/hugo-batch
node scripts/audit-hugo-duplicates.mjs /private/hugo-batch /private/tistory-batch
node scripts/sync-private-library.mjs /private/library/posts /private/tistory-batch /private/hugo-batch
```

The library contains only staged post files; originals, assets and ledgers stay
in their source batches. Sync verifies post checksums/private scope and refuses
slug collisions. Point `BLOG_PRIVATE_POSTS_DIR` at this combined library to use
both sources in one runtime. Provenance menus use `source=hugo` and
`source=tistory`, scoped after authentication. The explicit taxonomy override
also supports private Hugo imports. Initial Hugo taxonomy is based on source
categories/folders and can be reviewed separately from unchanged source labels.
Self-contained Markdown working copies are allowed when they have no unresolved
images or Hugo shortcodes; other imports remain standalone HTML.

Hugo import verifies exact source code, published prose/element/table content,
local or downloaded resource hashes, and static Mermaid rendering. Missing
resources and external subscription widgets remain explicit blockers. The
additional source-prose audit normalizes Hugo punctuation/emoji and checks source
text against the published snapshot; it supplements exact checks rather than
replacing them. Similarity candidates are review-only and never auto-merge posts.

`tests/hugo-review-browser.mjs` uses `HUGO_MIGRATION_WORKDIR`, `TEST_URL`,
`BLOG_REVIEW_PASSWORD`, and `PLAYWRIGHT_PATH`; it checks authentication, both source
menus/counts, filters, every imported article at mobile/desktop sizes, embedded
image decoding, element counts, original links, static diagrams, and overflow.

## Private HTML editing and anonymization

Set `BLOG_ENABLE_POST_EDITING=true` only for a runtime with a writable external
private post library. Authenticated imported HTML pages then show **수정**;
`/edit/<slug>` edits the article HTML and title without exposing or changing
provenance/date/privacy metadata. Surrounding CSS and resources are preserved.
Saving requires authentication, a same-origin POST, and the current revision hash.
Stale saves return409. The previous full file is retained under `revisions/`
beside the private `posts/` root. Editor pages have no anonymous content access.
There is no web editing of files from the public Git checkout through this route.

The private library is the editable serving copy. Raw backups and staged imports
remain unchanged. `sync-private-library.mjs` detects changes against its previous
import baseline and preserves locally edited files, recording their checksums in
the private manifest. Reimporting must not undo manual privacy corrections.

For a batch replacement, store exact `{from,to}` rules in a private JSON array
outside this repository and run:

```sh
node scripts/redact-post-names.mjs /private/library/posts /private/privacy-rules.json /private/library/revisions
```

The script changes HTML text and display metadata/attributes; it does not modify
source URLs, provenance, binary media or original backups. It keeps revisions and
a private audit. Source-name rules and original private text must never be
committed into the public repository. Apply the rules to newly imported posts
before review. Text replacements do not redact names embedded in image pixels.
