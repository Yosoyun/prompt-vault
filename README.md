# The Prompt Vault

A free, fast, fully-static library of **4,408 ready-to-use AI prompts** for ChatGPT,
Claude & Gemini — search it, filter by shelf, and copy any prompt in one click.

**Curated & published by Indrajeet Yadav.**
Prompts are drawn from the open **AIPRM community library (October 2023)**; each
prompt keeps a credit to its original community author. Collected, cleaned and
re-organised into 8 clear shelves so anyone can find what they need fast.

## What it does

- 🔎 Instant search across 4,408 prompts (title, teaser, author, topic)
- 🗂️ 8 clean shelves (Writing, Marketing & SEO, Sales & Support, Development,
  AI Art & Design, Ideas & Planning, Business & Finance, Other) + 46 topics
- ⧉ One-click copy to clipboard
- 🏷️ Auto-detected variables (`[TARGETLANGUAGE]`, `[PROMPT]`, …) highlighted so you
  know what to swap before using
- 🌗 Dark / light theme, fully responsive, keyboard friendly (`/` to search, `Esc` to close)
- ⚡ Loads a slim index first (~0.35 MB gzipped); full prompt bodies stream in the background

## 100% static — host anywhere

No backend, no build step, no tracking, no sign-up. Just static files. Designed for
GitHub Pages but works on any static host.

### Run locally

```bash
python3 -m http.server 8920
# open http://localhost:8920
```

> The data files are loaded with `fetch()`, so open it through a local server
> (or the live site) — not via `file://`.

## Files

```
index.html         markup + SEO meta
styles.css         editorial "midnight library" design (dark + light)
app.js             search / filter / copy / modal logic (vanilla JS)
data/index.json    slim search index (no bodies) — loads first
data/bodies.json   full prompt text + hints — lazy-loaded
data/meta.json     shelves, topics, counts
tools/build-data.py  rebuilds the data files from the raw AIPRM export
```

## Rebuilding the data

The raw AIPRM export is not committed (7 MB). To rebuild:

```bash
curl -sL https://raw.githubusercontent.com/newmediacrew/aiprm/main/aiprmCommunityPromptsOktober2023 \
  -o tools/aiprm_raw.json
python3 tools/build-data.py
```

## Credit & licence

Prompt content © their respective AIPRM community authors (credited per card).
This collection — its organisation, design and curation — is published for free by
**Indrajeet Yadav** so that the maximum number of people can use great prompts at no cost.
