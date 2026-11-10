"""Stamp every game file with a hash of its contents, so browsers never mix old and new files.

The game is split into many ES modules. If a browser keeps an old copy of one file but fetches a
new copy of another, an import can fail and the whole game stops loading. Run this before every
commit: it writes an import map into index.html that gives each module a ?v=<hash> address, so
a changed file gets a new address and an unchanged one stays cached.

    python stamp.py
"""
import hashlib
import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))


def digest(path):
    with open(path, 'rb') as f:
        return hashlib.sha1(f.read()).hexdigest()[:10]


src = os.path.join(ROOT, 'src')
mods = {f'./src/{n}': f'./src/{n}?v={digest(os.path.join(src, n))}' for n in sorted(os.listdir(src)) if n.endswith('.js')}
css = digest(os.path.join(ROOT, 'style.css'))
block = (
    '<!-- STAMP:BEGIN written by stamp.py, do not edit by hand -->\n'
    f'<script type="importmap">{json.dumps({"imports": mods}, separators=(",", ":"))}</script>\n'
    f'<script type="module" src="{mods["./src/main.js"]}"></script>\n'
    '<!-- STAMP:END -->'
)

p = os.path.join(ROOT, 'index.html')
html = open(p, encoding='utf-8').read()
html, n = re.subn(r'<!-- STAMP:BEGIN.*?<!-- STAMP:END -->', lambda m: block, html, flags=re.S)
assert n == 1, 'index.html needs one STAMP:BEGIN ... STAMP:END block'
html, n = re.subn(r'href="style\.css(\?v=\w+)?"', f'href="style.css?v={css}"', html)
assert n == 1, 'index.html needs one link to style.css'
open(p, 'w', encoding='utf-8', newline='\n').write(html)
print(f'stamped {len(mods)} modules and style.css')
