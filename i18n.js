/**
 * i18n Engine — 6 languages (ru, en, de, fr, it, es)
 * Dropdown switcher, geo-detection (ru zone → RU, else → EN)
 * Loads locale JSON: locales/{lang}.json
 * Applies translations via data-i18n attributes
 */
(function() {
  'use strict';

  var LANGS = ['ru', 'en', 'de', 'fr', 'it', 'es'];
  var DEFAULT = 'ru';
  var KEY = 'moi_lang';
  var LABELS = { ru: 'Русский', en: 'English', de: 'Deutsch', fr: 'Français', it: 'Italiano', es: 'Español' };

  var locale = {};
  var currentLang = DEFAULT;

  /* ---- helpers ---- */
  function getLang() {
    // 1. localStorage override
    try { var s = localStorage.getItem(KEY); } catch(e) {}
    if (s && LANGS.indexOf(s) !== -1) return s;

    // 2. URL parameter
    var m = window.location.search.match(/[?&]lang=([a-z]{2})/);
    if (m && LANGS.indexOf(m[1]) !== -1) return m[1];

    // 3. Auto-detect via timezone then geo
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (/^Europe\/Moscow|^Europe\/(Stalingrad|Kirov)/.test(tz)) return 'ru';
    if (/^Europe\/Kiev|^Europe\/Kyiv|^Europe\/Minsk/.test(tz)) return 'ru';

    return null; // means detect via geo
  }

  function detectGeo() {
    fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var country = (data.country_code || '').toUpperCase();
        var lang = (country === 'RU' || country === 'BY') ? 'ru' : 'en';
        if (currentLang === null) {
          currentLang = lang;
          document.documentElement.lang = lang;
          try { localStorage.setItem(KEY, lang); } catch(e) {}
          var url = new URL(window.location.href);
          if (lang !== 'ru') url.searchParams.set('lang', lang);
          else url.searchParams.delete('lang');
          history.replaceState({}, '', url);
          fetchLocale(lang).then(function(){ applyTranslations(); finishInit(); }).catch(function(){ finishInit(); });
        }
      })
      .catch(function() {
        // Fallback on failure: default to EN
        if (currentLang === null) {
          currentLang = 'en';
          document.documentElement.lang = 'en';
          try { localStorage.setItem(KEY, 'en'); } catch(e) {}
          var url = new URL(window.location.href);
          url.searchParams.set('lang', 'en');
          history.replaceState({}, '', url);
          fetchLocale('en').then(function(){ applyTranslations(); finishInit(); }).catch(function(){ finishInit(); });
        }
      });
  }

  function resolve(key) {
    var parts = key.split('.');
    var obj = locale;
    for (var i = 0; i < parts.length; i++) {
      if (obj === null || obj === undefined || typeof obj !== 'object') return null;
      obj = obj[parts[i]];
    }
    return (obj !== undefined && obj !== null) ? String(obj) : null;
  }

  function fetchLocale(lang) {
    if (lang === DEFAULT) { locale = {}; return Promise.resolve(); }
    return fetch('locales/' + lang + '.json')
      .then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function(d) { locale = d || {}; document.dispatchEvent(new CustomEvent('moi:localeloaded')); });
  }

  /* ---- build dropdown switcher ---- */
  function buildSwitcher() {
    var wrap = document.createElement('div');
    wrap.className = 'lang-switcher';

    var sel = document.createElement('select');
    sel.className = 'lang-select';
    sel.setAttribute('aria-label', 'Language selector');

    LANGS.forEach(function(lang) {
      var opt = document.createElement('option');
      opt.value = lang;
      opt.textContent = LABELS[lang];
      if (lang === currentLang) opt.selected = true;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', function() {
      setLang(this.value);
    });

    wrap.appendChild(sel);
    return wrap;
  }

  function finishInit() {
    if (window._moiLocaleReady) return;
    window._moiLocaleReady = true;
    document.dispatchEvent(new CustomEvent('moi:localeloaded'));
  }

  /* ---- main translations ---- */
  function applyTranslations() {
    if (currentLang === DEFAULT) {
      document.querySelectorAll('[data-i18n-orig]').forEach(function(el) {
        el.innerHTML = el.getAttribute('data-i18n-orig');
      });
      document.querySelectorAll('[data-i18n-attr-orig]').forEach(function(el) {
        var attr = el.getAttribute('data-i18n-attr-name');
        if (attr) el.setAttribute(attr, el.getAttribute('data-i18n-attr-orig'));
      });
      document.querySelectorAll('[data-i18n-title-orig]').forEach(function(el) {
        document.title = el.getAttribute('data-i18n-title-orig');
      });
      document.querySelectorAll('[data-i18n-meta-orig]').forEach(function(el) {
        var attr = el.getAttribute('data-i18n-meta-name');
        if (attr) el.setAttribute(attr, el.getAttribute('data-i18n-meta-orig'));
      });
      finishInit();
      return;
    }

    // Text content
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (!el.hasAttribute('data-i18n-orig')) {
        el.setAttribute('data-i18n-orig', el.innerHTML);
      }
      var v = resolve(key);
      if (v !== null) el.innerHTML = v;
    });

    // Attributes
    document.querySelectorAll('[data-i18n-attr]').forEach(function(el) {
      var spec = el.getAttribute('data-i18n-attr');
      var parts = spec.split(':');
      var attr = parts[0];
      var key = parts[1];
      if (!el.hasAttribute('data-i18n-attr-orig')) {
        el.setAttribute('data-i18n-attr-orig', el.getAttribute(attr));
        el.setAttribute('data-i18n-attr-name', attr);
      }
      var v = resolve(key);
      if (v !== null) el.setAttribute(attr, v);
    });
  }

  function setLang(lang) {
    if (LANGS.indexOf(lang) === -1) return;
    currentLang = lang;
    document.documentElement.lang = lang;
    try { localStorage.setItem(KEY, lang); } catch(e) {}

    var url = new URL(window.location.href);
    if (lang === DEFAULT) url.searchParams.delete('lang');
    else url.searchParams.set('lang', lang);
    history.replaceState({}, '', url);

    fetchLocale(lang).then(function() {
      applyTranslations();
      document.dispatchEvent(new CustomEvent('moi:langchange'));
    }).catch(function(){});
  }

  // Expose
  window.moiLang = { setLang: setLang, current: function() { return currentLang; }, resolve: resolve };
  window._moiResolve = resolve;
  window._moiLocaleLoaded = new Promise(function(ok) {
    var _done = false;
    function mark() { if (!_done) { _done = true; ok(); } }
    document.addEventListener('moi:localeloaded', mark);
  });

  /* ---- init ---- */
  function init() {
    currentLang = getLang();

    // If geo-undetermined, detect
    if (currentLang === null) {
      document.documentElement.lang = 'ru'; // fallback display
      detectGeo();
      return;
    }

    document.documentElement.lang = currentLang;

    // Build and inject dropdown into nav
    var nav = document.querySelector('nav');
    if (nav) {
      var existing = nav.querySelector('.lang-switcher');
      if (!existing) {
        var switcher = buildSwitcher();
        var style = document.createElement('style');
        style.textContent = '.lang-switcher{display:flex;align-items:center}.lang-select{background:var(--surface,transparent);color:var(--muted,#a0aec0);border:1px solid var(--line,rgba(127,90,240,.2));border-radius:6px;padding:4px 8px;font-size:.82rem;font-weight:600;font-family:inherit;cursor:pointer;outline:none}.lang-select:hover{border-color:var(--primary,#7f5af0)}.lang-select:focus{border-color:var(--primary,#7f5af0);box-shadow:0 0 0 2px rgba(127,90,240,.3)}';
        document.head.appendChild(style);
        var contactBtn = nav.querySelector('.btn[href*="t.me"], .btn:last-of-type');
        if (contactBtn) nav.insertBefore(switcher, contactBtn);
        else nav.appendChild(switcher);
      }
    }

    // Load locale and translate
    if (currentLang !== DEFAULT) {
      fetchLocale(currentLang).then(function(){ applyTranslations(); finishInit(); }).catch(function(){ finishInit(); });
    } else {
      finishInit();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
