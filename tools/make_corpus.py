#!/usr/bin/env python3
"""One-time reconstruction of the canonical corpus (2026-07-11 free relaunch).

Merges the three fragments of the old gated pipeline into a single committed
source of truth, data/corpus.json:

  data/catalog.json          all 2,713 rows of metadata (i/t/te/c/g/v/len/tier)
  data/bodies.free.byid.json the 221 previously-free bodies
  tools/premium-seed.json    the 2,492 previously-gated bodies

Hints (PromptHint) are recovered from incoming/*.json and product/*.json by
normalized-title match where available.

After this runs once, data/corpus.json is canonical and tools/build.py derives
everything the site needs from it. incoming/ and product/ become archival.
"""
import json, glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def norm(t):
    return re.sub(r'[^a-z0-9]+', ' ', (t or '').lower()).strip()

def main():
    cat = json.load(open(f'{ROOT}/data/catalog.json'))
    free = json.load(open(f'{ROOT}/data/bodies.free.byid.json'))
    seed = json.load(open(f'{ROOT}/tools/premium-seed.json'))

    bodies = {int(k): v for k, v in free.items()}
    for r in seed:
        bodies[r['prompt_id']] = r['body']

    # recover hints from raw sources by title
    hints = {}
    raw_files = glob.glob(f'{ROOT}/incoming/*.json') + glob.glob(f'{ROOT}/product/*.json') \
        + glob.glob(f'{ROOT}/product/context-engineering/*.json')
    for f in raw_files:
        try:
            d = json.load(open(f))
        except Exception:
            continue
        recs = d if isinstance(d, list) else d.get('prompts', [])
        for r in recs:
            if isinstance(r, dict) and r.get('Title') and r.get('PromptHint'):
                hints.setdefault(norm(r['Title']), r['PromptHint'])

    corpus, missing = [], []
    for c in cat:
        i = c['i']
        body = bodies.get(i)
        if not body:
            missing.append(i)
            continue
        corpus.append({
            'id': i,
            'title': c['t'],
            'teaser': c['te'],
            'category': c['c'],
            'group': c['g'],
            'hint': hints.get(norm(c['t']), ''),
            'prompt': body,
        })

    if missing:
        sys.exit(f'FATAL: {len(missing)} catalog ids have no body: {missing[:10]}')

    out = f'{ROOT}/data/corpus.json'
    with open(out, 'w') as fh:
        json.dump(corpus, fh, ensure_ascii=False, indent=1)
    hinted = sum(1 for r in corpus if r['hint'])
    print(f'wrote {out}: {len(corpus)} prompts ({hinted} with hints)')

if __name__ == '__main__':
    main()
