/* Remembers an explicit language choice from the switcher.
   The geo redirects in vercel.json send visitors from Spain to /es, but only
   while the paktum-lang cookie is absent — so once someone picks a language
   by hand, that choice wins on every later visit. */
(function () {
  var COOKIE = 'paktum-lang';
  var ONE_YEAR = 60 * 60 * 24 * 365;

  document.addEventListener('click', function (e) {
    var el = e.target;
    if (!el || typeof el.closest !== 'function') return;
    var btn = el.closest('.lang-btn[data-lang]');
    if (!btn) return;
    document.cookie =
      COOKIE + '=' + btn.getAttribute('data-lang') +
      ';path=/;max-age=' + ONE_YEAR + ';samesite=lax';
  }, true);
})();
