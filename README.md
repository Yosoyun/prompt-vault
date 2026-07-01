# The Prompt Vault

A free, fast, fully-static library of **470+ premium AI prompts** for ChatGPT, Claude
& Gemini — search, filter, and copy any prompt in one click.

**Hand-built, written & signed by ProPrompt.** Every prompt is original and
refined to a premium bar — no recycled filler. Four curated shelves:

- 🔥 **Trending & Viral** — what's actually going viral right now (hooks, threads, faceless YouTube, personal brand, money, study, careers…)
- 🖼️ **AI Image Prompts** — 100+ model-specific recipes for Midjourney v6/v7, DALL·E 3, Flux, Stable Diffusion (SDXL), Gemini "Nano Banana", Ideogram, logos & photoreal
- 🤖 **Agentic & System** — reusable system prompts, autonomous agents, multi-agent & tool-use patterns
- ⚡ **Pro Mega-Prompts** — strict-JSON / structured output, data extraction, deep research, business strategy, productivity systems

## Features

- 🔎 Instant search across every prompt (title, teaser, topic)
- 🗂️ 4 shelves + sub-topics, plus one-tap **Featured Collections**
- ⧉ One-click copy · 🏷️ auto-highlighted `[VARIABLES]` so you know what to swap
- ⭐ Save favourites (localStorage) · 🎲 Surprise me · 🔥 Trending rail
- ✍️ A consistent **calligraphy signature** (ProPrompt) on every card — the copied prompt text stays clean
- 🌗 Dark / light theme · responsive · keyboard friendly (`/` search, `Esc` close)
- ⚡ Loads a slim index first; full prompt bodies stream in the background
- 🔍 SEO: structured data (WebSite + FAQ), Open Graph image, sitemap

## 100% static — host anywhere

No backend, no build step, no tracking, no sign-up. Designed for GitHub Pages; works on any static host.

### Run locally

```bash
python3 -m http.server 8920
# open http://localhost:8920
```

> Data is loaded with `fetch()`, so open through a local server (or the live site), not `file://`.

## Files

```
index.html          markup + SEO meta + structured data
styles.css          editorial "midnight library" design (dark + light)
app.js              search / filter / copy / favourites / modal (vanilla JS)
data/index.json     slim search index (no bodies) — loads first
data/bodies.json    full prompt text + hints — lazy-loaded
data/meta.json      shelves, topics, counts
og-cover.png        social share image
tools/build-data.py rebuilds the data from incoming/*.json
incoming/*.json     the source prompts (grouped by filename prefix)
```

## Rebuilding

```bash
python3 tools/build-data.py
```

`incoming/<group>__<name>.json` routes to a group (`image` / `agents` / `mega`);
`incoming/<name>.json` goes to the `viral` shelf. Records use the keys
`Title, Teaser, PromptHint, Category, Prompt`.

## Credit

Every prompt is original work by **ProPrompt**, published free so the maximum
number of people can get exceptional results from AI.
