"""Shared site navigation, used by build-home.py and build-nav.py.

Follows the client's navigation brief: Features (with module dropdown), References, Pricing, Blog,
About us; language, LinkedIn and Book a demo as utilities. Solutions and Login are left out until
their pages and destinations exist.
"""
import html
import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
CONTENT = json.loads((ROOT / 'content/home.json').read_text())
LINKEDIN = 'https://www.linkedin.com/company/paktum-software/'
START, END = '<!-- site-nav:start -->', '<!-- site-nav:end -->'
SLUGS = ['home', 'product-catalog', 'position-editor', 'partner-crm', 'contracts', 'activation', 'led-planner', 'invoicing', 'analytics']
NAV_DESTS = ['features', 'references', 'pricing', 'blog', 'about']
LABELS = {'de': 'Hauptnavigation', 'en': 'Main navigation', 'es': 'Navegación principal'}
LANGS = [('de', 'Deutsch'), ('en', 'English'), ('es', 'Español')]


def esc(value):
    return html.escape(str(value), quote=True)


def svg(paths, cls=''):
    return f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths}</svg>'


GLOBE = svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>', 'sn-globe')
CHEVRON = svg('<path d="m7 10 5 5 5-5"/>', 'sn-chevron')
ARROW = '<span class="sn-arrow" aria-hidden="true">↗</span>'
LINKEDIN_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04s-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>'


def page_url(lang, page):
    """URL of a page ('' = home) in a language, matching the site's extensionless routes."""
    prefix = '' if lang == 'de' else '/' + lang
    if not page:
        return prefix + '/'
    return prefix + '/' + page


def dest_url(lang, dest):
    if dest == 'blog':
        return 'https://www.paktum.ch/blog' + ('' if lang == 'de' else '/' + lang)
    return page_url(lang, dest)


def site_nav(lang, page):
    """Navbar + mobile menu for one page. `page` is '' for home or a slug such as 'features'."""
    c = CONTENT[lang]
    current = page if page in NAV_DESTS else None
    modules = c['modules'][:9]
    items = []
    for dest, label in zip(NAV_DESTS, c['nav']):
        attrs = ' aria-current="page"' if dest == current else ''
        if dest == 'features':
            panel = ''.join(f'<a class="sn-item" href="{page_url(lang, "features")}#{slug}"><span class="sn-num">{i + 1:02}</span><span><b>{esc(name)}</b><small>{esc(desc)}</small></span></a>' for i, (slug, (name, desc)) in enumerate(zip(SLUGS, modules)))
            items.append(f'<li class="sn-dropdown"><a href="{page_url(lang, "features")}"{attrs}>{esc(label)}{CHEVRON}</a><div class="sn-panel"><div class="sn-panel-grid">{panel}</div><a class="sn-all" href="{page_url(lang, "features")}">{esc(c["allFeatures"])}{ARROW}</a></div></li>')
        else:
            items.append(f'<li><a href="{dest_url(lang, dest)}"{attrs}>{esc(label)}</a></li>')
    mobile_items = ''.join(f'<li><a href="{dest_url(lang, dest)}"{" aria-current=page" if dest == current else ""}>{esc(label)}</a></li>' for dest, label in zip(NAV_DESTS, c['nav']))
    mobile_modules = ''.join(f'<li><a href="{page_url(lang, "features")}#{slug}"><span>{i + 1:02}</span>{esc(name)}</a></li>' for i, (slug, (name, _)) in enumerate(zip(SLUGS, modules)))
    languages = ''.join(f'<a href="{page_url(key, page)}" class="lang-btn" data-lang="{key}"{" aria-current=true" if key == lang else ""} hreflang="{key}" lang="{key}"><span>{name}</span>{"✓" if key == lang else ""}</a>' for key, name in LANGS)
    demo = page_url(lang, 'book-a-demo')
    menu = svg('<path d="M4 6h16M4 12h16M4 18h16"/>', 'sn-open') + svg('<path d="m5 5 14 14M5 19 19 5"/>', 'sn-close')
    return f'''{START}
<nav class="site-nav" aria-label="{LABELS[lang]}">
<a class="sn-logo" href="{page_url(lang, '')}" aria-label="Paktum"><img src="/SVG%20Logos/{quote('Recurso 6.svg')}" width="139" height="30" alt="Paktum"></a>
<ul class="sn-links">{''.join(items)}</ul>
<div class="sn-actions">
<details class="sn-lang"><summary aria-label="{esc(c['language'])}">{GLOBE}<span>{lang.upper()}</span>{CHEVRON}</summary><div class="sn-lang-list">{languages}</div></details>
<a class="sn-social" href="{LINKEDIN}" target="_blank" rel="noopener noreferrer" aria-label="Paktum · LinkedIn">{LINKEDIN_ICON}</a>
<a class="sn-cta" href="{demo}">{esc(c['demo'])}</a>
<button class="sn-menu-btn" type="button" data-open-label="{esc(c['menuOpen'])}" data-close-label="{esc(c['menuClose'])}" aria-label="{esc(c['menuOpen'])}" aria-expanded="false" aria-controls="site-nav-menu">{menu}</button>
</div>
</nav>
<div class="sn-mobile" id="site-nav-menu" hidden>
<a class="sn-cta" href="{demo}">{esc(c['demo'])}{ARROW}</a>
<ul class="sn-mobile-links">{mobile_items}</ul>
<details class="sn-mobile-modules"><summary>{esc(c['exploreModules'])}</summary><ul>{mobile_modules}</ul></details>
</div>
{END}'''
