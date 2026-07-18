# The Prompt Vault

A free, fast, fully-static library of **2,600+ hand-built AI prompts** for ChatGPT,
Claude & Gemini — search, filter, and copy any prompt in one click. No accounts, no
paywall, no tracking.

**Written and signed by ProPrompt.** Every prompt is original and refined to a
premium bar — no recycled filler. 28 curated collections spanning writing, business,
image generation, agents & system prompts, mega-prompts, and more. Many document-shaped
prompts now deliver a finished **PDF / DOCX / XLSX / PPTX** file, not just a wall of
chat text — matching what ChatGPT, Claude and Gemini can produce in 2026.

## Features

- 🔎 Instant search across every prompt (title, teaser, category)
- 🗂️ 28 collections with sub-topics
- ⧉ One-click copy · 🏷️ auto-highlighted `[VARIABLES]` so you know what to swap
- 🎲 Live hero preview · 🌗 editorial dark theme · responsive · keyboard friendly
- ⚡ Loads a slim search index first; prompt bodies stream from one static JSON file
- 🔍 SEO: structured data, Open Graph image, sitemap, per-shelf + per-prompt pages

## 100% static — host anywhere

No backend, no build step to view, no sign-up. Designed for GitHub Pages; works on any
static host. Data is loaded with `fetch()`, so open through a local server (not `file://`).

### Run locally

```bash
python3 -m http.server 8123
# open http://localhost:8123
```

## Files

```
index.html            markup + SEO meta + structured data + the whole app (inline JS)
styles.css            shared styles for legal + SEO pages
data/corpus.json      canonical source of truth — {id,title,teaser,category,group,hint,prompt}
data/catalog.json     slim search index (no bodies) — loads first
data/bodies.byid.json full prompt text + hint, keyed by id — lazy-loaded
data/meta.json        collections, categories, counts
p/<slug>/             generated SEO pages, one per sampled prompt (full body, copyable)
shelf/<group>/        generated SEO pages, one per collection
about/ privacy.html terms.html   static pages
og-cover.png          social share image
```

## Rebuilding

Everything derives from `data/corpus.json`:

```bash
python3 tools/build.py        # corpus.json  → catalog.json + bodies.byid.json + meta.json
python3 _seo/build_seo.py     # → shelf/*, p/*, sitemap.xml (fresh lastmod)
```

`tools/build.py` re-extracts `[VARIABLE]` tokens and per-collection counts from the
corpus, so counts are always accurate. Collection labels/icons/colors live in
`GROUP_META` inside that script. To edit prompts, edit `data/corpus.json` and re-run
both commands.

`tools/make_corpus.py` is the one-time reconstruction that built `corpus.json` from the
earlier data fragments; `tools/merge_rewrites.py` folds batched prompt-modernization
edits back into the corpus. Neither is needed for normal rebuilds.

## Credit

Prompts by **ProPrompt** — getproprompt.com. Published free so the maximum number of
people can get exceptional results from AI.
