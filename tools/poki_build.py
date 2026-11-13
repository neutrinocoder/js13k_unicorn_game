"""Make the build that is uploaded to Poki.

    python tools/poki_build.py

It writes build/poki/ (the folder to upload) and build/angel-ascent-poki.zip (the same, zipped).
Compared with the game as it runs from this folder, the Poki build:

  - loads the Poki SDK, which the game then reports to (see src/host.js);
  - has no developer console and no cheats (src/dev.js is replaced by an empty stand-in);
  - drops everything between DEV:BEGIN and DEV:END markers in the page and the code
    (the link to the old js13k version, test helpers);
  - makes no request to anywhere but Poki: the fonts are in fonts/;
  - is minified, and loads its modules by plain relative paths (every Poki upload gets an
    address of its own, so the version stamps that stamp.py writes are not needed).
"""
import io
import os
import re
import shutil
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'build', 'poki')
ZIP = os.path.join(ROOT, 'build', 'angel-ascent-poki.zip')
SDK = '<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>'

DEV_STUB = """// Release build: there are no developer tools.
export const DEV_TOOLS = false;
export const dev = () => ({});
export const devOpen = () => false;
export function toggleDev() {}
export function initDev() {}
export function devLabel() { return ''; }
"""


def read(path):
    return io.open(path, encoding='utf-8').read()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(text)


if os.path.isdir(OUT):
    shutil.rmtree(OUT)
os.makedirs(os.path.join(OUT, 'src'))

# ---- the page
html = read(os.path.join(ROOT, 'index.html'))
html, n = re.subn(r'[ \t]*<!-- DEV:BEGIN -->.*?<!-- DEV:END -->\n?', '', html, flags=re.S)
assert n >= 3, 'expected the DEV blocks in index.html'
html, n = re.subn(r'<!-- STAMP:BEGIN.*?<!-- STAMP:END -->', '<script type="module" src="src/main.js"></script>', html, flags=re.S)
assert n == 1
html, n = re.subn(r'href="style\.css(\?v=\w+)?"', 'href="style.css"', html)
assert n == 1
assert '</head>' in html
html = html.replace('</head>', SDK + '\n</head>', 1)
write(os.path.join(OUT, 'index.html'), html)

# ---- styles and fonts
css = read(os.path.join(ROOT, 'style.css'))
css, n = re.subn(r'/\* DEV:BEGIN \*/.*?/\* DEV:END \*/\s*', '', css, flags=re.S)
assert n == 1
write(os.path.join(OUT, 'style.css'), css)
shutil.copytree(os.path.join(ROOT, 'fonts'), os.path.join(OUT, 'fonts'))

# ---- the code
for name in sorted(os.listdir(os.path.join(ROOT, 'src'))):
    if not name.endswith('.js'):
        continue
    code = DEV_STUB if name == 'dev.js' else read(os.path.join(ROOT, 'src', name))
    code = re.sub(r'[ \t]*// DEV:BEGIN.*?// DEV:END[^\n]*\n?', '', code, flags=re.S)
    write(os.path.join(OUT, 'src', name), code)
subprocess.run(['node', os.path.join(ROOT, 'tools', 'minify.cjs'), os.path.join(OUT, 'src')], check=True)

# ---- checks: nothing left that Poki would reject
problems = []
for folder, _, files in os.walk(OUT):
    for f in files:
        path = os.path.join(folder, f)
        if not f.endswith(('.js', '.css', '.html')):
            continue
        text = read(path)
        for url in re.findall(r'https?://[^\s"\'<>)]+', text):
            if 'game-cdn.poki.com' not in url and 'www.w3.org' not in url:
                problems.append(f'{os.path.relpath(path, OUT)}: outside address {url}')
        for word in ('devcon', 'selfTest', 'classic/'):
            if word in text:
                problems.append(f'{os.path.relpath(path, OUT)}: still mentions {word}')
if problems:
    print('\n'.join(problems))
    sys.exit('the build is not clean')

# ---- the zip
if os.path.exists(ZIP):
    os.remove(ZIP)
total = 0
with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for folder, _, files in os.walk(OUT):
        for f in sorted(files):
            path = os.path.join(folder, f)
            total += os.path.getsize(path)
            z.write(path, os.path.relpath(path, OUT).replace(os.sep, '/'))
print(f'build/poki: {total // 1024} KB in {sum(len(f) for _, _, f in os.walk(OUT))} files')
print(f'build/angel-ascent-poki.zip: {os.path.getsize(ZIP) // 1024} KB')
