import re, base64
from pathlib import Path

HOME = Path(__file__).resolve().parent.parent
raw = Path('/Users/bytedance/Downloads/Mokee design (2026_4_19 22：42：51).html').read_text(encoding='utf-8', errors='ignore')
OUT = HOME / 'assets' / 'covers'
OUT.mkdir(parents=True, exist_ok=True)
for f in OUT.iterdir():
    if f.is_file():
        f.unlink()

slugs_raw = [(m.start(), m.group(1)) for m in re.finditer(r'/projects/([a-z0-9\-]+)', raw) if m.start() > 100000]
seen = set(); sl = []
for p, s in slugs_raw:
    if s in seen:
        continue
    seen.add(s); sl.append((p, s))

def nearest_slug(pos):
    best = None
    for p, s in sl:
        if p < pos and (best is None or p > best[0]):
            best = (p, s)
    return best[1] if best else 'unknown'

EXT = {'jpeg': '.jpg', 'webp': '.webp', 'avif': '.avif', 'png': '.png'}
IMG_RE = re.compile(r'data:(image)/([a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]{8000,})')

saved = []
for i, m in enumerate(IMG_RE.finditer(raw), 1):
    fmt = m.group(2).lower()
    data = base64.b64decode(m.group(3), validate=False)
    slug = nearest_slug(m.start())
    ext = EXT.get(fmt, '.' + fmt)
    n = 1
    while True:
        name = f'{slug}{"" if n == 1 else "-" + str(n)}{ext}'
        path = OUT / name
        if not path.exists():
            break
        n += 1
    path.write_bytes(data)
    saved.append((name, len(data)))

for n, s in saved:
    print(f'  {n:<30} {s//1024:>5} KB')
