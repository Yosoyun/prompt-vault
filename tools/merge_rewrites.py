#!/usr/bin/env python3
"""Merge completed rewrite chunks back into data/corpus.json (idempotent).

Reads every out/chunk_*.json produced by the rewrite workflow, applies edits by
id, drops records marked "cut", and reports coverage. Safe to re-run as more
chunks land — it always rebuilds corpus from the pristine backup + all chunks
present, so partial runs never compound.
"""
import json, glob, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('REWRITE_OUT',
    '/private/tmp/claude-501/-Users-vanindra-Desktop-Code-automate-x/'
    'c457adeb-d6ef-4b33-98d5-0941fe01b5ee/scratchpad/rewrite/out')
BACKUP = f'{ROOT}/data/corpus.pristine.json'

def vs(s):
    return set(re.findall(r'\[[A-Z0-9][^\]]*\]', s or ''))

def main():
    # keep a pristine snapshot the first time so re-runs are deterministic
    if not os.path.exists(BACKUP):
        with open(f'{ROOT}/data/corpus.json') as f:
            open(BACKUP, 'w').write(f.read())

    base = {r['id']: r for r in json.load(open(BACKUP))}
    order = [r['id'] for r in json.load(open(BACKUP))]

    edits = {}
    cuts = set()
    processed = set()
    files = sorted(glob.glob(f'{OUT}/chunk_*.json'))
    skipped_var_loss = 0
    for fp in files:
        for r in json.load(open(fp)):
            i = r.get('id')
            if i not in base:
                continue
            processed.add(i)
            act = r.get('action', 'keep')
            if act == 'cut':
                cuts.add(i)
            elif act == 'edit':
                # guard: never accept an edit that dropped a [VARIABLE]
                if vs(base[i]['prompt']) - vs(r.get('prompt', '')):
                    skipped_var_loss += 1
                    continue
                edits[i] = r

    corpus = []
    for i in order:
        if i in cuts:
            continue
        if i in edits:
            e = edits[i]
            src = base[i]
            corpus.append({
                'id': i,
                'title': e.get('title', src['title']),
                'teaser': e.get('teaser', src['teaser']),
                'category': src['category'],   # never changed by rewrite
                'group': src['group'],
                'hint': src.get('hint', ''),
                'prompt': e.get('prompt', src['prompt']),
            })
        else:
            corpus.append(base[i])

    json.dump(corpus, open(f'{ROOT}/data/corpus.json', 'w'), ensure_ascii=False, indent=1)
    n_edit = sum(1 for i in edits if i not in cuts)
    print(f'chunks merged: {len(files)}  |  prompts processed: {len(processed)}/{len(base)}')
    print(f'edits applied: {n_edit}  |  cuts: {len(cuts)}  |  var-loss edits skipped: {skipped_var_loss}')
    print(f'corpus now: {len(corpus)} prompts')

if __name__ == '__main__':
    main()
