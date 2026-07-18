#!/usr/bin/env python3
"""Build the site data files from the canonical corpus (all prompts free).

data/corpus.json  ->  data/catalog.json   slim search index (no bodies)
                      data/bodies.byid.json  {id: {p: prompt, h: hint}}
                      data/meta.json      groups, categories, counts

Group presentation (label/icon/color/featured) lives in GROUP_META below;
counts are always derived from the corpus. Run after any corpus edit:

    python3 tools/build.py
"""
import json, os, re
from collections import Counter, OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VAR_RE = re.compile(r'\[([A-Z0-9][A-Z0-9 _/&\'#+.,%()-]{1,60})\]')

# key -> (label, icon, color, featured) — carried over verbatim from the v3 meta
GROUP_META = OrderedDict([
    ('viral', ('Trending & Viral', '🔥', '#ff6b4a', True)),
    ('elite', ('Million-Dollar Prompts', '💎', '#36c98b', False)),
    ('expert', ('Expert Picks', '🧠', '#34c3c9', False)),
    ('image', ('AI Image Prompts', '🖼️', '#e0729e', False)),
    ('writing', ('Content & Writing', '✍️', '#e3b341', False)),
    ('gen', ('Generators & Templates', '🛠️', '#9bbf3f', False)),
    ('agents', ('Agentic & System', '🤖', '#6c8cff', False)),
    ('mega', ('Pro Mega-Prompts', '⚡', '#b48cff', False)),
    ('work', ('Work & Career', '🏢', '#d98c4a', False)),
    ('living', ('Life & Wellbeing', '🌿', '#5fc9a8', False)),
    ('biz', ('Business & Verticals', '🛒', '#c77dba', False)),
    ('comms', ('Communication & Influence', '🗣️', '#3fb6c2', False)),
    ('ops', ('Operations & Admin', '📋', '#9a8fd8', False)),
    ('tech', ('Tech & Engineering', '💻', '#5fa8d3', False)),
    ('create', ('Creative & Media', '🎬', '#d56b8a', False)),
    ('grow', ('Learning & Growth', '🌱', '#6fae5a', False)),
    ('social', ('Social Media', '📱', '#b388e0', False)),
    ('industry', ('Industry Packs', '🏭', '#9c8e6a', False)),
    ('personal', ('Personal & Lifestyle', '🎁', '#e69ec0', False)),
    ('research', ('Research & Analysis', '🔬', '#6d9b8f', False)),
    ('design', ('Design & UX', '🎨', '#c2627a', False)),
    ('money', ('Money & Finance', '💰', '#4faf7a', False)),
    ('fun', ('Fun & Games', '✨', '#e8845e', False)),
    ('promptlab', ('Prompt Lab', '🧪', '#6e56cf', False)),
    ('favorites', ('Community Favorites', '🏆', '#c79a3a', False)),
    ('unicorn', ('Unicorn Builder', '🦄', '#7048e8', False)),
    ('frameworks', ('Frameworks', '🏗️', '#e6b34c', True)),
    ('warroom', ('The War Room', '🎯', '#e6b34c', True)),
])

def main():
    corpus = json.load(open(f'{ROOT}/data/corpus.json'))

    catalog, bodies = [], {}
    for r in corpus:
        variables = list(OrderedDict.fromkeys(
            f'[{m}]' for m in VAR_RE.findall(r['prompt'])))
        catalog.append({
            'i': r['id'], 't': r['title'], 'te': r['teaser'],
            'c': r['category'], 'g': r['group'],
            'v': variables, 'len': len(r['prompt']),
        })
        bodies[str(r['id'])] = {'p': r['prompt'], 'h': r.get('hint', '')}

    group_counts = Counter(r['group'] for r in corpus)
    cat_counts = {}
    for r in corpus:
        cat_counts.setdefault(r['group'], Counter())[r['category']] += 1

    groups = []
    for key, (label, icon, color, featured) in GROUP_META.items():
        if not group_counts.get(key):
            continue
        groups.append({
            'key': key, 'label': label, 'icon': icon, 'color': color,
            'count': group_counts[key], 'featured': featured,
            'categories': [
                {'name': n, 'label': n, 'count': c}
                for n, c in cat_counts[key].most_common()
            ],
        })
    unknown = set(group_counts) - set(GROUP_META)
    if unknown:
        raise SystemExit(f'FATAL: groups missing from GROUP_META: {unknown}')

    meta = {
        'total': len(corpus),
        'groups': groups,
        'curator': 'ProPrompt',
        'tagline': 'Free AI prompts for ChatGPT, Claude & Gemini',
    }

    json.dump(catalog, open(f'{ROOT}/data/catalog.json', 'w'), ensure_ascii=False)
    json.dump(bodies, open(f'{ROOT}/data/bodies.byid.json', 'w'), ensure_ascii=False)
    json.dump(meta, open(f'{ROOT}/data/meta.json', 'w'), ensure_ascii=False, indent=1)
    print(f'built: {len(catalog)} catalog rows, {len(bodies)} bodies, {len(groups)} groups')

if __name__ == '__main__':
    main()
