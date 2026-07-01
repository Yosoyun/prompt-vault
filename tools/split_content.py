#!/usr/bin/env python3
"""
ProPrompt — content tier splitter.

Single source of truth: _blueprint/02-tiering.md (§3) + _blueprint/07-pricing-ladder.md.

CONTENT has exactly 3 access levels (independent of how many PAID tiers exist):
    free    — ships free, in the browser
    pro     — the working library, unlocks at Pro ($100) and above
    studio  — the crown jewels (frameworks, Unicorn, optimizers, elite-deep,
              mega-deep), unlock at Studio ($250) and above
The paid ladder (Pro $100 / Studio $250 / Business $500 / Inner Circle $1000)
differentiates on RIGHTS + SERVICE + ACCESS, not on more rows — every tier from
Studio up sees the same full corpus. So content only ever splits 3 ways.

Emits three artifacts:
  data/catalog.json        PUBLIC. Every row + its content tier (titles+teasers
                           for ALL prompts, even locked — that's what sells upgrade).
  data/bodies.free.json    PUBLIC. { id: body } for FREE prompts only — the only
                           bodies the browser ever receives.
  tools/premium-seed.json  PRIVATE (gitignored). pro+studio bodies, shaped for
                           Supabase `prompts_premium`; loaded server-side with the
                           SECRET key. These bodies NEVER touch the public repo.

Run:  python3 tools/split_content.py
"""
import json, os, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
TOOLS = os.path.join(ROOT, "tools")

# ── Tier rules (mirror of _blueprint/02-tiering.md §3, free trimmed to ~220) ──
FREE_WHOLE   = {"living", "personal", "fun"}        # 3 whole free shelves (168)
PRO_WHOLE    = {"industry", "biz", "money"}          # gated at Pro
STUDIO_WHOLE = {"unicorn"}                            # crown-jewel shelf, Studio+

# Free-taste shelves: N prompts free (spread across categories), remainder = pro.
# Trimmed so total free ≈ 220 (168 whole-free + 52 tastes).
FREE_TASTE = {
    "viral": 10, "image": 10, "writing": 6, "favorites": 5, "grow": 3,
    "expert": 2, "work": 2, "comms": 2, "tech": 2, "create": 2, "ops": 2, "social": 2,
    "design": 1, "research": 1, "gen": 1, "agents": 1,
}

# Split shelves: these CATEGORIES are studio-only; the rest of the shelf = pro.
STUDIO_CATEGORIES = {
    "mega":  {"Deep Research"},
    "elite": {"Founder & Strategy", "Mastery & Mental Models",
              "Deep Research & Due Diligence"},
    "promptlab": {"AI Agent Designers", "Reasoning Frameworks",
                  "Evaluation & LLM-as-Judge", "Mega-Prompt Generators",
                  "Advanced Meta-Prompting", "Multi-Agent Orchestrators",
                  "Prompt Optimizers"},
}
RANK = {"free": 0, "pro": 1, "studio": 2}  # content-access ranks


def pick_free_taste(rows, n):
    """Spread n free slots across the shelf's categories round-robin, lowest id
    first — a taste of almost every category, deterministically."""
    by_cat = collections.defaultdict(list)
    for r in rows:
        by_cat[r["c"]].append(r)
    for lst in by_cat.values():
        lst.sort(key=lambda r: r["i"])
    cats = sorted(by_cat)
    free, i = set(), 0
    while len(free) < n and any(by_cat[c] for c in cats):
        c = cats[i % len(cats)]
        if by_cat[c]:
            free.add(by_cat[c].pop(0)["i"])
        i += 1
    return free


def tier_for_shelf(group, rows):
    if group in FREE_WHOLE:
        return {r["i"]: "free" for r in rows}
    if group in PRO_WHOLE:
        return {r["i"]: "pro" for r in rows}
    if group in STUDIO_WHOLE:
        return {r["i"]: "studio" for r in rows}
    if group in STUDIO_CATEGORIES:
        deep = STUDIO_CATEGORIES[group]
        return {r["i"]: ("studio" if r["c"] in deep else "pro") for r in rows}
    if group in FREE_TASTE:
        free = pick_free_taste(rows, FREE_TASTE[group])
        return {r["i"]: ("free" if r["i"] in free else "pro") for r in rows}
    return {r["i"]: "pro" for r in rows}  # safe default: never accidentally free


def main():
    index  = json.load(open(os.path.join(DATA, "index.json")))
    bodies = json.load(open(os.path.join(DATA, "bodies.json")))
    meta   = json.load(open(os.path.join(DATA, "meta.json")))
    assert len(index) == len(bodies), "index/bodies length mismatch"

    by_group = collections.defaultdict(list)
    for r in index:
        by_group[r["g"]].append(r)

    tier = {}
    for g, rows in by_group.items():
        tier.update(tier_for_shelf(g, rows))

    ruled = FREE_WHOLE | PRO_WHOLE | STUDIO_WHOLE | set(STUDIO_CATEGORIES) | set(FREE_TASTE)
    for g in by_group:
        if g not in ruled:
            print(f"  ! WARNING: shelf '{g}' has no explicit rule -> defaulted to pro")

    catalog = [{
        "i": r["i"], "t": r["t"], "te": r.get("te", ""),
        "c": r["c"], "g": r["g"], "v": r.get("v", []),
        "len": r.get("len", 0), "tier": tier[r["i"]],
    } for r in index]

    free_bodies = {str(r["i"]): bodies[r["i"]]["p"]
                   for r in index if tier[r["i"]] == "free"}

    seed = []
    for r in index:
        t = tier[r["i"]]
        if t == "free":
            continue
        seed.append({
            "prompt_id": r["i"], "title": r["t"], "teaser": r.get("te", ""),
            "category": r["c"], "grp": r["g"], "variables": r.get("v", []),
            "body": bodies[r["i"]]["p"], "char_len": r.get("len", 0),
            "min_tier": t, "is_flagship": (r["g"] in ("unicorn", "elite")),
        })

    json.dump(catalog, open(os.path.join(DATA, "catalog.json"), "w"),
              ensure_ascii=False, separators=(",", ":"))
    json.dump(free_bodies, open(os.path.join(DATA, "bodies.free.json"), "w"),
              ensure_ascii=False, separators=(",", ":"))
    json.dump(seed, open(os.path.join(TOOLS, "premium-seed.json"), "w"),
              ensure_ascii=False, separators=(",", ":"))

    counts = collections.Counter(tier.values())
    print(f"\nTotal prompts: {len(index)}")
    print(f"  free   : {counts['free']:>4}   -> data/bodies.free.json (public)")
    print(f"  pro    : {counts['pro']:>4}")
    print(f"  studio : {counts['studio']:>4}  (crown jewels)")
    print(f"  paid   : {counts['pro']+counts['studio']:>4}   -> tools/premium-seed.json (private)")
    print(f"\nFree account sees : {counts['free']:>4}")
    print(f"Pro $100 unlocks  : {counts['free']+counts['pro']:>4}  (free + pro)")
    print(f"Studio $250+ sees : {len(index):>4}  (everything)")
    print("\nPer-shelf:")
    print(f"  {'shelf':<11}{'tot':>5}{'free':>6}{'pro':>5}{'studio':>7}")
    for g in sorted(by_group, key=lambda g: -len(by_group[g])):
        rows = by_group[g]
        c = collections.Counter(tier[r["i"]] for r in rows)
        print(f"  {g:<11}{len(rows):>5}{c['free']:>6}{c['pro']:>5}{c['studio']:>7}")

    assert len(free_bodies) + len(seed) == len(index), "partition leak!"
    print("\nPartition: free-bodies + premium-seed == corpus ✓")


if __name__ == "__main__":
    main()
