#!/usr/bin/env python3
"""Generate the Features page module tour from content/features.json.

Follows the client brief: one text block per module scrolling on the left, a sticky app window on the
right whose video changes at the viewport midpoint, a 01–09 progress control with direct links, and a
customer testimonial before the closing call to action. Safe to run repeatedly.
"""
import html
import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
CONTENT = json.loads((ROOT / 'content/features.json').read_text())
START, END = '<!-- features-story:start -->', '<!-- features-story:end -->'
CSS = '<link rel="stylesheet" href="/features-story.css">'
JS = '<script src="/features-story.js" defer></script>'
OLD_JS = re.compile(r'\n// ============ FEATURES PAGE: product tour stage ============.*?\n\}\)\(\);\n(?=</script>)', re.S)


def esc(value):
    return html.escape(str(value), quote=True)


def logo(name):
    return '/SVG%20Logos/' + quote(name)


def section(c):
    blocks, links = [], []
    for i, m in enumerate(c['modules']):
        num = f'{i + 1:02}'
        poster = m['video'].replace('.mp4', '-ui.jpg')
        bullets = ''.join(f'<li>{b}</li>' for b in m['bullets'])
        blocks.append(f'''<article class="fx-block{" is-active" if i == 0 else ""}" id="{m['slug']}" data-fx-block aria-labelledby="fx-h-{m['slug']}">
<div class="fx-text">
<p class="fx-eyebrow"><span class="fx-num">{num}</span>{m['subtitle']}</p>
<h3 id="fx-h-{m['slug']}">{m['heading']}</h3>
<p class="fx-intro">{m['intro']}</p>
<ul class="feature-list fx-list">{bullets}</ul>
</div>
<div class="fx-media"><video data-fx-video data-title="{esc(m['name'])}" muted playsinline preload="none" poster="{poster}" aria-label="{esc(m['videoLabel'])}"><source src="{m['video']}#t=2.8" type="video/mp4"></video></div>
</article>''')
        links.append(f'<li><a href="#{m["slug"]}" data-fx-jump="{i}" aria-label="{num} {esc(m["name"])}"><span class="fx-pnum">{num}</span><span class="fx-pname">{esc(m["name"])}</span></a></li>')
    v = c['voice']
    first = c['modules'][0]['name']
    return f'''{START}
<section class="module-story fx" id="module-tour" aria-labelledby="fx-title">
<div class="container">
<div class="section-header">
<div class="section-tag">{c['sectionTag']}</div>
<h2 class="section-title-xl" id="fx-title">{c['sectionTitle']}</h2>
</div>
<div class="fx-layout" data-fx>
<nav class="fx-progress" aria-label="{esc(c['progressLabel'])}" data-fx-progress><ol>{''.join(links)}</ol><span class="fx-track" aria-hidden="true"><i data-fx-fill></i></span></nav>
<div class="fx-copy">
{chr(10).join(blocks)}
</div>
<div class="fx-stage-col"><div class="fx-stage" data-fx-stage><div class="fx-window"><div class="fx-bar" aria-hidden="true"><span class="fx-dots"><i></i><i></i><i></i></span><span class="fx-title" data-fx-title>{esc(first)}</span><span class="fx-count" data-fx-count>01 / {len(c['modules']):02}</span></div><div class="fx-screen" data-fx-screen></div></div></div></div>
</div>
</div>
</section>
<section class="fx-voice" aria-label="{esc(c['voiceLabel'])}">
<figure class="fx-voice-card">
<div class="fx-voice-club"><img src="{logo(v['logo'])}" width="44" height="44" alt="" loading="lazy"><span><b>{v['club']}</b><small>{v['sport']}</small></span></div>
<blockquote><p>“{v['quote']}”</p></blockquote>
<figcaption><img src="{logo(v['photo'])}" width="52" height="52" alt="" loading="lazy"><span><b>{v['person']}</b><small>{v['role']}</small></span><a class="fx-voice-link" href="{c['referencesUrl']}">{esc(v['link'])}<span aria-hidden="true">↗</span></a></figcaption>
</figure>
</section>
{END}'''


for lang in ['de', 'en', 'es']:
    path = ROOT / ('features.html' if lang == 'de' else f'{lang}/features.html')
    s = path.read_text()
    c = dict(CONTENT[lang], referencesUrl=('' if lang == 'de' else '/' + lang) + '/references#voices')
    if START in s:
        a, b = s.index(START), s.index(END) + len(END)
    else:
        a = s.index('<section class="module-story" id="module-tour">')
        b = s.index('<!-- ============ FINAL CTA')
    s = s[:a] + section(c) + '\n' + s[b:].lstrip('\n')
    s = OLD_JS.sub('\n', s)
    if CSS not in s:
        s = s.replace('</head>', CSS + '\n</head>', 1)
    if JS not in s:
        s = s.replace('</body>', JS + '\n</body>', 1)
    path.write_text(s)
    print(f'Generated module tour in {path.relative_to(ROOT)}')
