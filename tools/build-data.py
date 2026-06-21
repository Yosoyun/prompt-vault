#!/usr/bin/env python3
"""
Build the Prompt Vault dataset from the raw AIPRM community export.

Reads tools/aiprm_raw.json (array of prompt objects) and writes:
  data/index.json    - slim search/browse index, NO prompt bodies (loads first)
  data/bodies.json    - full prompt bodies + hints, aligned by index (lazy-loaded)
  data/meta.json     - groups, categories, counts, build stats

Run:  python3 tools/build-data.py
"""
import json
import re
import os
import html

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(HERE, "aiprm_raw.json")
OUT_DATA = os.path.join(ROOT, "data")

# ---- 8 clean groups -> raw AIPRM categories ----------------------------------
GROUPS = [
    ("writing",     "Writing",          "✍️", "#e8b04b",
        ["writing", "Script Writing", "Sports Writing", "Text Editor",
         "Summarize", "Respond", "Improve"]),
    ("marketing",   "Marketing & SEO",  "📣", "#5fb0c4",
        ["marketing", "keywords", "link building", "call to action",
         "Subject Lines", "Positioning", "Persuade", "Segment your audience",
         "Outreach"]),
    ("sales",       "Sales & Support",  "💼", "#c98bbb",
        ["Products", "Product Description", "Pricing", "Partnerships", "CRM",
         "Cancel", "Quota", "Refunds", "Trial"]),
    ("dev",         "Development",       "⚙️", "#7ec699",
        ["Backend Development", "Web Development", "Configuration Management",
         "Containerization", "Database Administration",
         "Operating System Management", "Version Control"]),
    ("art",         "AI Art & Design",  "🎨", "#e08a6e",
        ["Midjourney", "Stable Diffusion", "Dall-E", "Design"]),
    ("ideas",       "Ideas & Planning", "💡", "#b6a4e0",
        ["Plan", "Research", "ideation", "Startup Ideas", "Spreadsheets"]),
    ("business",    "Business & Finance","📊", "#88b04b",
        ["Accounting", "Places (Media Channels)", "Games"]),
    ("other",       "Other",            "🗂️", "#9a9488",
        ["UNSURE", "Unmet Category-Related Needs"]),
]

# raw category -> group key
CAT2GROUP = {}
for key, label, icon, color, cats in GROUPS:
    for c in cats:
        CAT2GROUP[c] = key

# Nicer display names for a few raw categories
CAT_DISPLAY = {
    "ideation": "Ideation",
    "keywords": "Keywords",
    "marketing": "Marketing",
    "writing": "Writing",
    "link building": "Link Building",
    "call to action": "Call to Action",
    "Places (Media Channels)": "Media Channels",
    "UNSURE": "Uncategorized",
    "Unmet Category-Related Needs": "Misc",
    "Dall-E": "DALL·E",
}

VAR_RE = re.compile(r"\[([A-Z][A-Z0-9 _\-]{1,40})\]")


def clean(s):
    if not s:
        return ""
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    return s.strip()


def detect_vars(prompt):
    seen = []
    for m in VAR_RE.findall(prompt or ""):
        tok = "[" + m.strip() + "]"
        if tok not in seen:
            seen.append(tok)
    return seen[:8]


def main():
    with open(RAW, "r", encoding="utf-8") as f:
        raw = json.load(f)

    index = []   # slim, no bodies
    bodies = []  # full prompt + hint, aligned by index
    group_counts = {g[0]: 0 for g in GROUPS}
    cat_counts = {}
    skipped = 0

    for i, d in enumerate(raw):
        prompt = clean(d.get("Prompt"))
        title = clean(d.get("Title")) or "Untitled prompt"
        if not prompt or len(prompt) < 8:
            skipped += 1
            continue
        cat = d.get("Category") or "UNSURE"
        gkey = CAT2GROUP.get(cat, "other")
        idx = len(index)
        index.append({
            "i": idx,
            "t": title[:160],
            "te": clean(d.get("Teaser"))[:280],
            "a": clean(d.get("AuthorName"))[:60],
            "u": (d.get("AuthorURL") or "").strip()[:200],
            "c": cat,
            "g": gkey,
            "v": detect_vars(prompt),
            "len": len(prompt),
        })
        bodies.append({"p": prompt, "h": clean(d.get("PromptHint"))[:240]})
        group_counts[gkey] += 1
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    # Build meta with categories nested per group, sorted by count desc
    groups_meta = []
    for key, label, icon, color, cats in GROUPS:
        cat_list = []
        for c in cats:
            n = cat_counts.get(c, 0)
            if n == 0:
                continue
            cat_list.append({
                "name": c,
                "label": CAT_DISPLAY.get(c, c[:1].upper() + c[1:]),
                "count": n,
            })
        cat_list.sort(key=lambda x: -x["count"])
        groups_meta.append({
            "key": key, "label": label, "icon": icon, "color": color,
            "count": group_counts[key], "categories": cat_list,
        })

    meta = {
        "total": len(index),
        "groups": groups_meta,
        "source": "AIPRM community prompts (October 2023)",
        "curator": "Indrajeet Yadav",
    }

    os.makedirs(OUT_DATA, exist_ok=True)
    with open(os.path.join(OUT_DATA, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT_DATA, "bodies.json"), "w", encoding="utf-8") as f:
        json.dump(bodies, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT_DATA, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    isize = os.path.getsize(os.path.join(OUT_DATA, "index.json"))
    bsize = os.path.getsize(os.path.join(OUT_DATA, "bodies.json"))
    print(f"prompts kept: {len(index)}  skipped: {skipped}")
    print(f"index.json : {isize/1024/1024:.2f} MB  (loads first)")
    print(f"bodies.json: {bsize/1024/1024:.2f} MB  (lazy)")
    print("group counts:")
    for g in groups_meta:
        print(f"  {g['count']:5d}  {g['label']}  ({len(g['categories'])} cats)")


if __name__ == "__main__":
    main()
