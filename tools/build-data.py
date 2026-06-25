#!/usr/bin/env python3
"""
Build The Prompt Vault dataset — PREMIUM ONLY (v3).

100% hand-built, original prompts by Indrajeet Yadav. The old community export is
NOT used. Source is incoming/*.json, routed to a group by filename prefix:

  <group>__<name>.json   -> that group   (image / agents / mega)
  <name>.json            -> "viral" group (the trending/viral set)

Writes:
  data/index.json  - slim search/browse index (loads first)
  data/bodies.json - full prompt bodies + hints (lazy-loaded)
  data/meta.json   - groups, categories, counts, build stats

Run:  python3 tools/build-data.py
"""
import json
import re
import os
import glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
INCOMING = os.path.join(ROOT, "incoming")
OUT_DATA = os.path.join(ROOT, "data")
CURATOR = "Indrajeet Yadav"

# Premium groups, in display order (featured first). key, label, icon, color
GROUPS = [
    ("viral",   "Trending & Viral",       "🔥", "#ff6b4a"),
    ("elite",   "Million-Dollar Prompts", "💎", "#36c98b"),
    ("expert",  "Expert Picks",           "🧠", "#34c3c9"),
    ("image",   "AI Image Prompts",       "🖼️", "#e0729e"),
    ("writing", "Content & Writing",      "✍️", "#e3b341"),
    ("gen",     "Generators & Templates", "🛠️", "#9bbf3f"),
    ("agents",  "Agentic & System",       "🤖", "#6c8cff"),
    ("mega",    "Pro Mega-Prompts",       "⚡", "#b48cff"),
    ("work",    "Work & Career",          "🏢", "#d98c4a"),
    ("living",  "Life & Wellbeing",       "🌿", "#5fc9a8"),
    ("biz",     "Business & Verticals",   "🛒", "#c77dba"),
    ("comms",   "Communication & Influence","🗣️", "#3fb6c2"),
    ("ops",     "Operations & Admin",     "📋", "#9a8fd8"),
    ("tech",    "Tech & Engineering",     "💻", "#5fa8d3"),
    ("create",  "Creative & Media",       "🎬", "#d56b8a"),
    ("grow",    "Learning & Growth",      "🌱", "#6fae5a"),
    ("community","Open & Community",       "🌐", "#8a93a0"),
]
GROUP_KEYS = {g[0] for g in GROUPS}
VAR_RE = re.compile(r"\[([A-Z][A-Z0-9 _\-/]{1,40})\]")


def clean(s):
    if not s:
        return ""
    return str(s).replace("\r\n", "\n").replace("\r", "\n").strip()


def detect_vars(prompt):
    seen = []
    for m in VAR_RE.findall(prompt or ""):
        tok = "[" + m.strip() + "]"
        if tok not in seen:
            seen.append(tok)
    return seen[:8]


def norm_title(t):
    return re.sub(r"[^a-z0-9]", "", (t or "").lower())[:48]


def group_of(filename):
    base = os.path.basename(filename)[:-5]  # strip .json
    if "__" in base:
        g = base.split("__", 1)[0]
        return g if g in GROUP_KEYS else "viral"
    return "viral"


def main():
    files = sorted(glob.glob(os.path.join(INCOMING, "*.json")))
    index, bodies = [], []
    seen = set()
    group_counts = {g[0]: 0 for g in GROUPS}
    cat_counts = {}       # (group, category) -> n
    skipped = 0

    for fp in files:
        gkey = group_of(fp)
        try:
            arr = json.load(open(fp, encoding="utf-8"))
        except Exception as e:
            print(f"  ! skip {os.path.basename(fp)}: {e}")
            continue
        if not isinstance(arr, list):
            continue
        for d in arr:
            if not isinstance(d, dict):
                continue
            prompt = clean(d.get("Prompt"))
            title = clean(d.get("Title"))
            if not prompt or not title or len(prompt) < 40:
                skipped += 1
                continue
            nt = norm_title(title)
            if nt in seen:
                skipped += 1
                continue
            seen.add(nt)
            cat = clean(d.get("Category")) or "Trending"
            idx = len(index)
            rec = {
                "i": idx, "t": title[:160], "te": clean(d.get("Teaser"))[:280],
                "c": cat, "g": gkey, "v": detect_vars(prompt), "len": len(prompt),
            }
            cr = d.get("Credit")
            if isinstance(cr, dict) and cr.get("name") and cr.get("url"):
                rec["cr"] = {"n": clean(cr["name"])[:60], "u": clean(cr["url"])[:200]}
            index.append(rec)
            bodies.append({"p": prompt, "h": clean(d.get("PromptHint"))[:240]})
            group_counts[gkey] += 1
            cat_counts[(gkey, cat)] = cat_counts.get((gkey, cat), 0) + 1

    groups_meta = []
    for i, (key, label, icon, color) in enumerate(GROUPS):
        cats = [{"name": c, "label": c, "count": n}
                for (g, c), n in cat_counts.items() if g == key]
        cats.sort(key=lambda x: -x["count"])
        if group_counts[key] == 0:
            continue
        groups_meta.append({
            "key": key, "label": label, "icon": icon, "color": color,
            "count": group_counts[key], "featured": i == 0, "categories": cats,
        })

    meta = {
        "total": len(index),
        "groups": groups_meta,
        "curator": CURATOR,
        "tagline": "Premium AI prompts, hand-built by " + CURATOR,
    }

    os.makedirs(OUT_DATA, exist_ok=True)
    json.dump(index, open(os.path.join(OUT_DATA, "index.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    json.dump(bodies, open(os.path.join(OUT_DATA, "bodies.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    json.dump(meta, open(os.path.join(OUT_DATA, "meta.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    isize = os.path.getsize(os.path.join(OUT_DATA, "index.json")) / 1024
    bsize = os.path.getsize(os.path.join(OUT_DATA, "bodies.json")) / 1024
    print(f"PREMIUM prompts: {len(index)}   (skipped/deduped: {skipped})")
    print(f"index.json {isize:.0f} KB · bodies.json {bsize:.0f} KB")
    for g in groups_meta:
        print(f"  {g['count']:4d}  {g['icon']} {g['label']}  ({len(g['categories'])} topics)")


if __name__ == "__main__":
    main()
