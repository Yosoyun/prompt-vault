# STATE — aiprm-prompt-library (The Prompt Vault · getproprompt.com)

> Updated: 2026-08-17 (stamped by estate-dna DNA Pass 3 — keep current every session)
> Law: trust `git log` over this file if dates disagree.

**Phase:** SHIPPED and live  ·  **Health:** good — domain serving, verified 2026-08-17
**What works:** the free relaunch shipped 2026-07-18 (commit 70f0948 — all 2,711 prompts free, no accounts, no paywall). Herosmith content was merged in 07-31 and removed again 2026-08-01 (commit 180a615 — it lives in its own repo now; this domain is academic/prompt-vault only). **getproprompt.com still serves THIS static vault**: verified 2026-08-17 — HTTP 200 from GitHub Pages, last-modified 2026-08-01, matching the Herosmith-removal deploy.
**What's broken / unknown:** the per-prompt SEO layer is nearly all missing — only **56 `p/` pages exist** (counted 2026-08-17) against a 2,711-prompt corpus, so **~2,650 `p/` pages need regenerating** (plus sitemap). Also pending, tracked outside this repo: the domain's cutover to the Next.js app at `~/Desktop/Code/getproprompt` — until that ships, this static repo owns the domain; don't break it.
**Next 3 actions:**
1. Regenerate the ~2,650 missing `p/` prompt pages from `data/corpus.json` and rebuild `sitemap.xml`.
2. Verify a sample of regenerated pages live after deploy (structured data + canonical URLs intact).
3. When the getproprompt Next.js cutover is scheduled, decide this repo's post-cutover role (archive vs. subpath) — record it in a decision entry, not by silent edits.

Recent git evidence:
```
180a615 Remove Herosmith from getproprompt.com (moves to its own home)
6b537d6 Merge in Herosmith: hero-section prompt forge live at /herosmith/
70f0948 Free relaunch: all 2,711 prompts free, no accounts, no paywall
```
