#!/usr/bin/env python3
"""Build comprehensive game dictionary (3-7 letter common English words)."""

import json
import re
import sys
sys.path.insert(0, '/home/z/.local/lib/python3.13/site-packages')

from english_words import get_english_words_set
import nltk
nltk.download('words', quiet=True)
from nltk.corpus import words as nltk_words

# ─── Load sources ────────────────────────────────────────────────────────
web2 = get_english_words_set(['web2'], lower=True)
gcide = get_english_words_set(['gcide'], lower=True)
nltk_set = set(w.lower() for w in nltk_words.words() if w.isalpha())

# ─── Base: web2 3-7 letter + gcide words also in NLTK ───────────────────
web2_words = set(w for w in web2 if 3 <= len(w) <= 7 and w.isalpha())
gcide_extra = set(w for w in gcide if 3 <= len(w) <= 7 and w.isalpha() and w not in web2 and w in nltk_set)
candidate = web2_words | gcide_extra

print(f'web2 (3-7): {len(web2_words)}')
print(f'gcide+NLTK extra: {len(gcide_extra)}')
print(f'Combined: {len(candidate)}')

# ─── Quality filters ─────────────────────────────────────────────────────
vowels = set('aeiou')
removed = set()

# 1. Words with triple repeated letters (aaa, bbb, etc.)
for w in candidate:
    if re.search(r'(.)\1{2,}', w):
        removed.add(w)

# 2. Words with no vowels at all AND no 'y' (gibberish)
for w in candidate:
    if not any(c in vowels or c == 'y' for c in w):
        removed.add(w)

# 3. Words containing non-standard patterns for English
#    - 4+ consecutive consonants starting with unusual combos
for w in candidate:
    # Very unusual patterns like 'schtr' or 'ngthr'
    if re.search(r'schtr|ngthr|mpht|lphth', w, re.IGNORECASE):
        removed.add(w)

filtered = candidate - removed
print(f'After quality filters: {len(filtered)} removed {len(removed)}')

# ─── Final sorted list ───────────────────────────────────────────────────
final = sorted(filtered)

# Stats
lens = {}
for w in final:
    lens[len(w)] = lens.get(len(w), 0) + 1
print('\nFinal dictionary stats:')
for k, v in sorted(lens.items()):
    print(f'  {k}-letter: {v}')
print(f'  TOTAL: {len(final)}')

# Pattern coverage check
print('\nPattern coverage:')
for suffix in ['at', 'an', 'in', 'un', 'op', 'og', 'it', 'am', 'ig', 'ay', 'ow', 'ub', 'ash', 'ink', 'all', 'ill', 'ock', 'oke', 'ent', 'ing']:
    c = len([w for w in final if w.endswith(suffix)])
    print(f'  ending "{suffix}": {c}')
for prefix in ['st', 'br', 'tr', 'bl', 'cr', 'fl', 'gr', 'pr', 'ch', 'sh', 'cl', 'sp', 'sn', 'dr', 'gl', 'pl', 'sc', 'sk', 'sl', 'sm', 'sq', 'sw']:
    c = len([w for w in final if w.startswith(prefix)])
    print(f'  starting "{prefix}": {c}')

# ─── Write JSON ──────────────────────────────────────────────────────────
output_path = '/home/z/my-project/src/lib/dictionary.json'
with open(output_path, 'w') as f:
    json.dump(final, f, separators=(',', ':'))

import os
size_kb = os.path.getsize(output_path) / 1024
print(f'\nWrote {output_path}')
print(f'File size: {size_kb:.1f} KB')
print('Done!')
