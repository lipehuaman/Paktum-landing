#!/usr/bin/env python3
"""Put the shared navigation (scripts/site_nav.py) into every static page except the generated home pages.

The first run replaces each page's own navbar, mobile menu and floating language button; later runs
replace the block between the site-nav markers. Also links site-nav.css/js and uses Forma DJR Text
for headings. Safe to run repeatedly.
"""
from site_nav import ROOT, START, END, site_nav

PAGES = ['features', 'references', 'pricing', 'about', 'book-a-demo', 'impressum']
CSS = '<link rel="stylesheet" href="/site-nav.css">'
JS = '<script src="/site-nav.js" defer></script>'

for lang in ['de', 'en', 'es']:
    for page in PAGES:
        path = ROOT / (f'{page}.html' if lang == 'de' else f'{lang}/{page}.html')
        s = path.read_text()
        block = site_nav(lang, page)
        if START in s:
            a, b = s.index(START), s.index(END) + len(END)
        else:
            a = s.index('<nav class="navbar">')
            b = s.index('</div>\n</div>', s.index('<div class="lang-floating">')) + len('</div>\n</div>')
        s = s[:a] + block + s[b:]
        if CSS not in s:
            s = s.replace('</head>', CSS + '\n</head>', 1)
        if JS not in s:
            s = s.replace('</body>', JS + '\n</body>', 1)
        s = s.replace("--font-display: 'forma-djr-display', 'forma-djr-text',", "--font-display: 'forma-djr-text',")
        path.write_text(s)
        print(f'Updated {path.relative_to(ROOT)}')
