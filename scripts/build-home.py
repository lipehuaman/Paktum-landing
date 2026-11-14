#!/usr/bin/env python3
"""Generate the three static home pages from their shared content and layout."""
import html
import json
from pathlib import Path
from urllib.parse import quote

from site_nav import site_nav

ROOT = Path(__file__).resolve().parents[1]
CONTENT = json.loads((ROOT / 'content/home.json').read_text())
SLUGS = ['home', 'product-catalog', 'position-editor', 'partner-crm', 'contracts', 'activation', 'led-planner', 'invoicing', 'analytics']
LOGOS = [
    ('FC Zürich', 'FC_Zuerich.svg.webp'), ('BSV Bern', 'BSV_Bern.svg'),
    ('DEL2', 'DEL2.svg.webp'), ('Volleyball Bundesliga', 'Volleyball Bundesliga.webp'),
    ('Hamburger SV e.V.', 'Hamburger_SV.webp'), ('SC Fortuna Köln', 'SC_Fortuna_Koeln.svg.webp'),
    ('SSV Ulm 1846 Fussball', 'SSV_Ulm_1846_Fussball.svg.webp'), ('Bremer Fussball-Verband', 'Bremer_Fussball-Verband.svg')
]
PATHS = [
    '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M12 5v14M3 12h18"/><circle cx="12" cy="12" r="3"/>',
    '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/>',
    '<path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h6"/>',
    '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 11h16m-12 5 3 2 5-4"/>',
    '<rect x="2" y="5" width="20" height="13" rx="2"/><path d="M8 21h8m-4-3v3m-3-13 6 3-6 3Z"/>',
    '<path d="m5 3 2 1 2-1 3 1 3-1 2 1 2-1v18l-2-1-2 1-3-1-3 1-2-1-2 1Zm3 5h8m-8 4h8m-8 4h4"/>',
    '<path d="M4 3v17h17M8 15l4-5 4 2 5-7"/>'
]


def esc(value):
    return html.escape(str(value), quote=True)


def icon(paths, cls=''):
    return f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths}</svg>'


def asset(name):
    return '/SVG%20Logos/' + quote(name)


ARROW = '<span class="arrow" aria-hidden="true">↗</span>'
PLAY = icon('<path d="m9 5 11 7-11 7Z"/>')

# Hero demo: an interactive, scripted replica of the Position Editor and Analytics views.
# Coordinates are in em inside a 38 × 22 em stadium box; status letters: a = available, r = reserved, b = booked, '' = free slot.
STADIUM_W, STADIUM_H = 38, 22
BOARD_ROWS = {
    'top': 'aabaraabaaar', 'bottom': 'baraabaa.rba', 'left': 'aaaaba', 'right': 'abaraa',
}
STATUS = {'a': 'available', 'r': 'reserved', 'b': 'booked'}


def demo_boards(d):
    boards, slots = [], []
    number = 101

    def pct(x, y, w, h):
        return f'--x:{x / STADIUM_W * 100:.3f}%;--y:{y / STADIUM_H * 100:.3f}%;--w:{w / STADIUM_W * 100:.3f}%;--h:{h / STADIUM_H * 100:.3f}%'

    for side, pattern in BOARD_ROWS.items():
        for i, code in enumerate(pattern):
            if side in ('top', 'bottom'):
                x, y, w, h, price = 4.6 + i * 2.42, (0.5 if side == 'top' else 20.4), 2.06, 1.1, 12000
            else:
                x, y, w, h, price = (2.5 if side == 'left' else 34.4), 2.75 + i * 2.8, 1.1, 2.36, 8000
            if code == '.':
                slots.append(f'<span class="demo-slot" data-slot="{side}-{i}" style="{pct(x, y, w, h)}" aria-hidden="true"></span>')
                continue
            status = STATUS[code]
            boards.append(f'<span class="board" data-board="{side}-{i}" data-price="{price}" data-status="{status}" style="{pct(x, y, w, h)}"><span>{number}</span></span>')
            number += 1
    return ''.join(slots) + ''.join(boards)


def money(n, lang):
    return f'{n:,}'.replace(',', ',' if lang == 'en' else '.') + ' EUR'


def hero_demo(c, lang):
    d = c['heroDemo']
    view_attr = {2: ' data-view-target="editor"', 8: ' data-view-target="analytics"'}
    side_icons = ''.join(f'<span class="app-nav{" is-active" if i == 2 else ""}"{view_attr.get(i, "")}>{icon(PATHS[i])}</span>' for i in range(9))
    legend = ''.join(f'<li class="lg-{key}"><i></i><span>{esc(label)}</span><b data-count="{key}">0</b></li>' for key, label in zip(['available', 'reserved', 'booked', 'selected'], d['legend']))
    tabs = ''.join(f'<span{" class=is-active" if i == 2 else ""}>{esc(t)}</span>' for i, t in enumerate(d['tabs']))
    heights = [38, 52, 45, 62, 58, 72, 66, 82, 78, 92, 88, 98]
    bars = ''.join(f'<div class="bar{" is-forecast" if i > 7 else ""}" style="--h:{h};--i:{i}"><i class="bar-new"></i><span>{esc(m)}</span></div>' for i, (h, m) in enumerate(zip(heights, d['months'])))
    products = ''.join(f'<li><i></i><span>{esc(p)}</span><b>{v}%</b></li>' for p, v in zip(d['products'], [38, 26, 20, 16]))
    cursor = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3v16l4.2-4.1 2.7 6.1 2.6-1.2-2.7-6H18Z" fill="#fff" stroke="#120a1c" stroke-width="1.4" stroke-linejoin="round"/></svg>'
    return f'''<div class="hero-visual" data-parallax>
<div class="hero-orb" data-depth="-26" aria-hidden="true"></div>
<div class="demo-stage" data-tilt>
<div class="product-window demo" data-demo data-locale="{lang}" data-strings="{esc(json.dumps({k: d[k] for k in ['selected', 'emptySelection', 'analyticsWindow']}, ensure_ascii=False))}" data-editor-title="{esc(c['productTitle'])}" role="img" aria-label="{esc(d['label'])}">
<div class="window-toolbar"><span class="window-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="window-title" data-window-title>{esc(c['productTitle'])}</span><span class="window-spacer" aria-hidden="true"></span></div>
<div class="app" data-view="editor">
<aside class="app-side"><img src="/favicon.svg" width="20" height="20" alt="">{side_icons}</aside>
<div class="app-views">
<section class="app-view view-editor" data-view-panel="editor">
<header class="app-head"><div><h2 class="app-title">{esc(d['editorTitle'])}</h2><p class="app-sub">{esc(d['editorSub'])}</p></div></header>
<nav class="app-tabs" aria-hidden="true">{tabs}</nav>
<div class="app-filters"><span class="f-label">{esc(d['gameDay'])}</span><span class="f-pill">{esc(d['season'])} ▾</span><span class="f-label">{esc(d['bookingDate'])}</span><span class="f-pill">{esc(d['date'])}</span><span class="f-status"><i></i>{esc(d['status'])}</span></div>
<div class="app-canvas">
<ul class="app-legend">{legend}</ul>
<div class="stadium" data-stadium><div class="pitch" aria-hidden="true"><i class="pitch-mid"></i><i class="pitch-circle"></i><i class="pitch-box l"></i><i class="pitch-box r"></i></div>{demo_boards(d)}</div>
<div class="app-donut"><svg viewBox="0 0 42 42" aria-hidden="true"><circle class="d-track" cx="21" cy="21" r="15.9"/><circle class="d-booked" cx="21" cy="21" r="15.9" pathLength="100"/><circle class="d-reserved" cx="21" cy="21" r="15.9" pathLength="100"/><circle class="d-avail" cx="21" cy="21" r="15.9" pathLength="100"/></svg><p><b data-available-pct>0%</b> {esc(d['availableShort'])}</p></div>
</div>
<div class="app-selection" data-selection><span data-selection-text>{esc(d['emptySelection'])}</span><b data-selection-value></b><span class="app-book" data-book>{esc(d['book'])}</span></div>
</section>
<section class="app-view view-analytics" data-view-panel="analytics">
<header class="app-head"><div><h2 class="app-title">Analytics</h2><p class="app-sub">{esc(d['analyticsSub'])}</p></div><span class="f-pill">{esc(d['seasonShort'])} ▾</span></header>
<div class="an-grid">
<div class="an-card an-revenue"><div class="an-card-head"><h3>{esc(d['revenue'])}</h3><span class="an-key"><i></i>{esc(d['invoiced'])}<i class="fc"></i>{esc(d['forecast'])}</span></div><div class="bars">{bars}<span class="bar-tag" data-bar-tag>{esc(d['newBooking'])} <b data-new-value></b></span></div></div>
<div class="an-card an-total"><h3>{esc(d['sponsoringTotal'])}</h3><div class="an-total-body"><div class="an-ring"><svg viewBox="0 0 42 42" aria-hidden="true"><circle class="d-track" cx="21" cy="21" r="15.9"/><circle class="r-contract" cx="21" cy="21" r="15.9" pathLength="100"/></svg><p><small>{esc(d['total'])}</small><b data-total>{'121.5K' if lang == 'en' else '121,5K'}</b></p></div><dl><dt><i></i>{esc(d['contractual'])}</dt><dd data-contractual>{money(66500, lang)}</dd><dt><i class="p"></i>{esc(d['pipeline'])}</dt><dd>{money(55000, lang)}</dd></dl></div></div>
<div class="an-card an-products"><h3>{esc(d['byProduct'])}</h3><div class="an-products-body"><svg viewBox="0 0 42 42" aria-hidden="true"><circle class="d-track" cx="21" cy="21" r="15.9"/><circle class="p1" cx="21" cy="21" r="15.9" pathLength="100"/><circle class="p2" cx="21" cy="21" r="15.9" pathLength="100"/><circle class="p3" cx="21" cy="21" r="15.9" pathLength="100"/><circle class="p4" cx="21" cy="21" r="15.9" pathLength="100"/></svg><ul>{products}</ul></div></div>
</div>
</section>
</div>
<div class="demo-cursor" data-cursor aria-hidden="true">{cursor}</div>
<div class="demo-toast" data-toast><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#22c55e"/><path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>{esc(d['toast'])}</span><b data-toast-value></b></div>
</div>
</div>
<div class="float-card float-contract" data-depth="34" data-float-contract aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14 3H5v18h14V8Zm0 0v5h5M8 13l3 3 5-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><div><small>{esc(d['contract'])}</small><b data-float-value>—</b></div></div>
<div class="float-card float-util" data-depth="22" aria-hidden="true"><svg viewBox="0 0 42 42"><circle class="d-track" cx="21" cy="21" r="15.9"/><circle class="u-ring" cx="21" cy="21" r="15.9" pathLength="100"/></svg><div><small>{esc(d['utilisation'])}</small><b data-util>0%</b></div></div>
</div>
</div>'''


for lang, c in CONTENT.items():
    prefix = '' if lang == 'de' else '/' + lang
    home = prefix + '/'

    def url(dest):
        if dest.startswith('blog'):
            base = 'https://www.paktum.ch/blog' + ('' if lang == 'de' else '/' + lang)
            return base + dest[len('blog'):]
        if dest.startswith('#'):
            return dest
        return prefix + '/' + dest

    def textlink(label, target, cls='text-link'):
        return f'<a class="{cls}" href="{esc(target)}">{esc(label)}{ARROW}</a>'

    modules = []
    for i, (name, description) in enumerate(c['modules']):
        target = url('features#' + SLUGS[i]) if i < 9 else url('blog/ssv-jeddeloh-ii-paktum')
        art = icon(PATHS[i]) if i < 9 else f'<img src="{asset("Rollo.webp")}" width="30" height="30" alt="" loading="lazy">'
        modules.append(f'<a class="module-card{" rollo-card" if i == 9 else ""}" href="{target}"><div class="module-card-top">{art}<span>{i + 1:02}</span></div><h3>{esc(name)}</h3><p>{esc(description)}</p><span class="card-arrow" aria-hidden="true">↗</span></a>')

    logos = ''.join(f'<div class="{"wide" if i in [2, 3, 7] else ""}"><img src="{asset(file)}" alt="{esc(name)}" width="108" height="58" loading="lazy"></div>' for i, (name, file) in enumerate(LOGOS))
    problems = ''.join(f'<article><span>0{i + 1}</span><h3>{esc(title)}</h3><p>{esc(body)}</p></article>' for i, (title, body) in enumerate(c['problems']))
    quotes = []
    for q in c['quotes']:
        quotes.append(f'''<figure class="quote-card">
<div class="quote-brand"><img src="{asset(q['logo'])}" width="42" height="42" alt="" loading="lazy"><span>{esc(q['club'])}</span></div>
<blockquote cite="{esc('https://www.paktum.ch' + url(q['source']) if not q['source'].startswith('blog') else url(q['source']))}"><p>“{esc(q['quote'])}”</p></blockquote>
<figcaption><img src="{asset(q['portrait'])}" width="42" height="42" alt="" loading="lazy"><div><strong>{esc(q['person'])}</strong><p>{esc(q['role'])}</p></div></figcaption>
<a class="quote-source" href="{url(q['source'])}">{esc(c['readArticle'] if q['source'].startswith('blog') else c['voicesLink'])} ↗</a>
</figure>''')
    stats = ''.join(f'<div class="stat"><div class="stat-number">{esc(number)}<span>{esc(unit)}</span></div><div><p>{esc(label)}</p><small>{esc(team)}</small></div></div>' for number, unit, label, team in c['stats'])
    arts = [f'<div class="article-art guide" aria-hidden="true"><span>Excel<br/>→ Paktum</span>{icon(PATHS[4])}</div>', f'<div class="article-art customer" aria-hidden="true"><img src="{asset("Recurso 5.svg")}" alt="" loading="lazy"><span>×</span><img src="{asset("FC_Zuerich.svg.webp")}" alt="" loading="lazy"></div>', f'<div class="article-art rollo" aria-hidden="true"><img src="{asset("Rollo.webp")}" alt="" loading="lazy"></div>']
    articles = ''.join(f'<a class="article-card" href="{url("blog/" + slug)}">{arts[i]}<span class="article-meta">{esc(category)}</span><h3>{esc(title)}</h3><p>{esc(body)}</p><span class="text-link">{esc(c["readArticle"])}{ARROW}</span></a>' for i, (category, title, body, slug) in enumerate(c['articles']))
    faq = ''.join(f'<details><summary>{esc(question)}</summary><div class="faq-answer"><p>{esc(answer)}</p>{textlink(label, url(dest))}</div></details>' for question, answer, dest, label in c['faq'])
    schema = [
        {'@context': 'https://schema.org', '@type': 'Organization', 'name': 'Paktum', 'legalName': 'KLTechnologies GmbH', 'url': 'https://www.paktum.ch', 'logo': 'https://www.paktum.ch/og-image.png', 'sameAs': ['https://www.linkedin.com/company/paktum-software/'], 'address': {'@type': 'PostalAddress', 'addressLocality': 'Luzern', 'addressCountry': 'CH'}},
        {'@context': 'https://schema.org', '@type': 'SoftwareApplication', 'name': 'Paktum', 'applicationCategory': 'BusinessApplication', 'operatingSystem': 'Web', 'url': 'https://www.paktum.ch' + prefix, 'description': c['description'], 'inLanguage': lang, 'publisher': {'@type': 'Organization', 'name': 'KLTechnologies GmbH'}},
        {'@context': 'https://schema.org', '@type': 'FAQPage', 'inLanguage': lang, 'mainEntity': [{'@type': 'Question', 'name': row[0], 'acceptedAnswer': {'@type': 'Answer', 'text': row[1]}} for row in c['faq']]}
    ]
    schema_html = '\n'.join('<script type="application/ld+json">' + json.dumps(s, ensure_ascii=False).replace('</', '<\\/') + '</script>' for s in schema)
    alternates = '\n'.join(f'<link rel="alternate" hreflang="{key}" href="https://www.paktum.ch{path}">' for key, path in [('de', '/'), ('en', '/en'), ('es', '/es'), ('x-default', '/')])
    locale = {'de': 'de_DE', 'en': 'en_US', 'es': 'es_ES'}[lang]
    html_page = f'''<!DOCTYPE html>
<!-- Generated by scripts/build-home.py from content/home.json. -->
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(c['title'])}</title>
<meta name="description" content="{esc(c['description'])}">
<link rel="canonical" href="https://www.paktum.ch{prefix if prefix else '/'}">
{alternates}
<meta property="og:type" content="website">
<meta property="og:title" content="{esc(c['title'])}">
<meta property="og:description" content="{esc(c['description'])}">
<meta property="og:url" content="https://www.paktum.ch{prefix if prefix else '/'}">
<meta property="og:image" content="https://www.paktum.ch/og-image.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="{locale}"><meta property="og:site_name" content="Paktum">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(c['title'])}">
<meta name="twitter:description" content="{esc(c['description'])}">
<meta name="twitter:image" content="https://www.paktum.ch/og-image.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script src="https://web.cmp.usercentrics.eu/modules/autoblocker.js"></script>
<script async data-settings-id="vroPjhUClfR6mc" id="usercentrics-cmp" src="https://web.cmp.usercentrics.eu/ui/loader.js"></script>
<script async src="https://t.webmetic.de/iav.js?id=z3f444"></script>
<link rel="preconnect" href="https://use.typekit.net" crossorigin>
<link rel="stylesheet" href="https://use.typekit.net/apb2slf.css">
<link rel="stylesheet" href="/site-nav.css">
<link rel="stylesheet" href="/home.css">
<script>if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('motion');</script>
{schema_html}
<script defer src="/site-nav.js"></script>
<script defer src="/home.js"></script>
<script defer src="/lang-preference.js"></script>
</head>
<body>
<a class="skip-link" href="#main">{esc(c['skip'])}</a>
{site_nav(lang, '')}
<main id="main">
<section class="hero" aria-labelledby="hero-title">
<div class="container hero-grid">
<div class="hero-copy"><p class="eyebrow">{esc(c['eyebrow'])}</p>
<h1 id="hero-title">{c['hero']}</h1>
<p class="hero-description">{c['heroDescription']}</p>
<div class="hero-ctas"><a class="btn btn-primary" href="{url('book-a-demo')}">{esc(c['demo'])}{ARROW}</a><a class="btn btn-outline" href="/videos/home/overview-{lang}.mp4" data-open-tour>{PLAY}{esc(c['tour'])}</a></div>
<p class="hero-note">{esc(c['heroNote'])}</p></div>
{hero_demo(c, lang)}</div>
</section>
<section class="trust container" aria-label="{esc(c['trust'])}"><div class="trust-top"><p>{esc(c['trust'])}</p>{textlink(c['allReferences'], url('references'))}</div><div class="logo-grid">{logos}</div></section>
<section class="problem container" id="product" aria-labelledby="problem-title"><div class="problem-layout"><div><p class="eyebrow">{esc(c['problemEyebrow'])}</p><h2 id="problem-title">{c['problemTitle']}</h2></div><div class="problem-list">{problems}</div></div></section>
<section class="overview section" id="features" aria-labelledby="overview-title"><div class="container"><p class="eyebrow">{esc(c['overviewEyebrow'])}</p><div class="section-heading"><h2 id="overview-title">{c['overviewTitle']}</h2><p>{esc(c['overviewDescription'])}</p></div>
<div class="overview-links"><a class="btn btn-light" href="/videos/home/overview-{lang}.mp4" data-open-tour>{PLAY}{esc(c['tour'])} · {esc(c['tourLength'])}</a>{textlink(c['allFeatures'], url('features'))}</div>
<div class="module-grid">{''.join(modules)}</div></div></section>
<section class="section container" id="customers" aria-labelledby="voices-title"><p class="eyebrow">{esc(c['voicesEyebrow'])}</p><div class="section-heading"><h2 id="voices-title">{c['voicesTitle']}</h2>{textlink(c['voicesLink'], url('references#voices'))}</div><div class="voices-grid">{''.join(quotes)}</div><p class="quote-source">{esc(c['quoteSource'])}</p></section>
<section class="results container" id="stats" aria-labelledby="results-title"><div class="results-layout"><div class="results-intro"><p class="eyebrow">{esc(c['resultsEyebrow'])}</p><h2 id="results-title">{c['resultsTitle']}</h2><p>{esc(c['resultsContext'])}</p>{textlink(c['resultsLink'], url('blog/rechnungsstellung-automatisieren'))}</div><div class="stats-grid">{stats}</div></div></section>
<section class="resources section" aria-labelledby="resources-title"><div class="container"><p class="eyebrow">{esc(c['resourcesEyebrow'])}</p><div class="section-heading"><h2 id="resources-title">{c['resourcesTitle']}</h2>{textlink(c['allArticles'], url('blog'))}</div><div class="article-grid">{articles}</div></div></section>
<section class="faq section container" id="faq" aria-labelledby="faq-title"><div class="faq-layout"><div class="faq-intro"><p class="eyebrow">{esc(c['faqEyebrow'])}</p><h2 id="faq-title">{c['faqTitle']}</h2><p>{esc(c['faqDescription'])}</p>{textlink(c['talk'], url('about'))}</div><div class="faq-list">{faq}</div></div></section>
<section class="final-cta" id="demo" aria-labelledby="final-title"><div class="container final-layout"><h2 id="final-title">{c['finalTitle']}</h2><div class="final-actions"><p>{esc(c['finalDescription'])}</p><a class="btn btn-primary" href="{url('book-a-demo')}">{esc(c['demo'])}{ARROW}</a>{textlink(c['sales'], url('about'))}</div></div></section>
</main>
<footer class="footer container"><div class="footer-grid"><div class="footer-brand"><a href="{home}" aria-label="Paktum"><img src="{asset('Recurso 5.svg')}" width="140" height="34" alt="Paktum" loading="lazy"></a><p>{esc(c['footerTagline'])}</p></div>
<div><h2>{esc(c['footerHeadings'][0])}</h2><ul><li><a href="{url('features')}">{esc(c['nav'][0])}</a></li><li><a href="{url('references')}">{esc(c['nav'][1])}</a></li><li><a href="{url('pricing')}">{esc(c['nav'][2])}</a></li></ul></div>
<div><h2>{esc(c['footerHeadings'][1])}</h2><ul><li><a href="#faq">{esc(c['faqLabel'])}</a></li><li><a href="{url('blog')}">Blog</a></li><li><a href="{url('about')}">{esc(c['nav'][4])}</a></li><li><a href="{url('book-a-demo')}">{esc(c['demo'])}</a></li></ul></div>
<div><h2>{esc(c['footerHeadings'][2])}</h2><ul><li><a href="{url('impressum')}">{esc(c['imprint'])}</a></li><li><a href="https://www.linkedin.com/company/paktum-software/" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></li></ul></div></div>
<div class="footer-bottom"><span>© 2026 KLTechnologies GmbH</span><img src="{asset('Swiss_Made.svg')}" width="54" height="46" alt="Swiss made software" loading="lazy"></div></footer>
<dialog class="tour-dialog" id="product-tour" aria-labelledby="tour-title"><div class="tour-dialog-header"><span id="tour-title">Paktum · {esc(c['tour'])}</span><button type="button" class="tour-close" data-close-tour aria-label="{esc(c['close'])}">×</button></div>
<video controls playsinline preload="none" data-src="/videos/home/overview-{lang}.mp4" poster="/assets/home/product-{lang}.png" aria-label="{esc(c['tour'])}"><track kind="captions" srclang="{lang}" label="{lang.upper()}" src="/videos/home/overview-{lang}.vtt" default></video>
<div class="tour-dialog-footer"><p>{esc(c['tourDescription'])}</p><a class="btn btn-primary" href="{url('book-a-demo')}">{esc(c['demo'])}{ARROW}</a></div></dialog>
</body>
</html>
'''
    destination = ROOT / ('index.html' if lang == 'de' else f'{lang}/index.html')
    destination.write_text(html_page)
    print(f'Generated {destination.relative_to(ROOT)}')
