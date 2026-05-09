/**
 * moiseev_portfolio — общий JS:
 *  - Theme toggle (тёмная/светлая) с сохранением в localStorage
 *  - Кастомный AI-курсор (точка + кольцо, magnetic к интерактивным элементам)
 *  - View Transitions для плавных переходов между страницами
 *  - AI-терминал в hero (typewriter)
 *
 * Загружается defer; не дублирует существующий inline JS (частицы, прогресс-бар).
 */
(function () {
  'use strict';

  /* ---------- Theme toggle ---------- */
  var THEME_KEY = 'moi_theme';
  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = theme === 'light' ? '☀' : '☾';
  }
  function initTheme() {
    var stored = getStoredTheme();
    var theme = stored === 'light' ? 'light' : 'dark';
    applyTheme(theme);
  }
  function buildThemeToggle() {
    var nav = document.querySelector('nav');
    if (!nav || nav.querySelector('.theme-toggle')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.setAttribute('aria-label', 'Toggle theme');
    btn.textContent = (document.documentElement.getAttribute('data-theme') === 'light') ? '☀' : '☾';
    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      var next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
    var langSwitcher = nav.querySelector('.lang-switcher');
    if (langSwitcher) nav.insertBefore(btn, langSwitcher);
    else nav.appendChild(btn);
  }

  /* ---------- AI custom cursor + magnetic ---------- */
  function initCursor() {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.body.classList.add('has-ai-cursor');
    var dot = document.createElement('div');
    dot.className = 'ai-cursor';
    var ring = document.createElement('div');
    ring.className = 'ai-cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var x = window.innerWidth / 2, y = window.innerHeight / 2;
    var rx = x, ry = y;
    var raf = null;

    document.addEventListener('mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      dot.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%)';
      if (!raf) raf = requestAnimationFrame(loop);
    });
    function loop() {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      if (Math.abs(x - rx) > 0.4 || Math.abs(y - ry) > 0.4) {
        raf = requestAnimationFrame(loop);
      } else { raf = null; }
    }

    var hoverSel = 'a, button, .btn, [data-tilt], .case-card, .project-card, .gallery-item, .filter-btn, .quick-route, .social-link, .theme-toggle, .lang-select, input, select, textarea';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(hoverSel)) {
        dot.classList.add('is-active');
        ring.classList.add('is-active');
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(hoverSel)) {
        dot.classList.remove('is-active');
        ring.classList.remove('is-active');
      }
    });
    document.addEventListener('mouseleave', function () {
      dot.style.opacity = '0'; ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', function () {
      dot.style.opacity = '1'; ring.style.opacity = '1';
    });
  }

  /* ---------- AI terminal (typewriter) ---------- */
  function initTerminal() {
    var term = document.querySelector('.ai-terminal-body');
    if (!term || term.dataset.inited) return;
    term.dataset.inited = '1';

    var raw = term.getAttribute('data-lines');
    if (!raw) return;
    var lines;
    try { lines = JSON.parse(raw); } catch (e) { return; }
    if (!Array.isArray(lines) || !lines.length) return;

    function start() {
      term.innerHTML = '';
      var i = 0;
      function typeLine() {
        if (i >= lines.length) {
          // pause then loop
          setTimeout(start, 4500);
          return;
        }
        var data = lines[i];
        var span = document.createElement('span');
        span.className = 'ai-terminal-line';
        var promptStr = data.prompt || '$';
        var html = '<span class="prompt">' + promptStr + '</span><span class="content"></span>';
        span.innerHTML = html;
        term.appendChild(span);
        requestAnimationFrame(function () { span.classList.add('is-visible'); });

        var content = span.querySelector('.content');
        var text = data.text || '';
        var pos = 0;
        var cursorClass = 'typing';
        content.classList.add(cursorClass);
        var step = Math.max(20, Math.min(45, 1200 / Math.max(text.length, 1)));
        function tick() {
          if (pos < text.length) {
            content.firstChild
              ? (content.textContent = text.substring(0, ++pos))
              : (content.textContent = text.substring(0, ++pos));
            setTimeout(tick, step);
          } else {
            content.classList.remove(cursorClass);
            if (data.suffix) {
              var suf = document.createElement('span');
              suf.className = data.suffixClass || 'ok';
              suf.textContent = ' ' + data.suffix;
              content.appendChild(suf);
            }
            i++;
            setTimeout(typeLine, data.pause || 600);
          }
        }
        tick();
      }
      typeLine();
    }

    // Запускаем когда терминал в зоне видимости, чтобы не тратить ресурсы
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { start(); io.disconnect(); }
        });
      }, { threshold: 0.2 });
      io.observe(term);
    } else { start(); }
  }

  /* ---------- View Transitions: hint browsers to keep nav smooth ----------
     Само @view-transition в CSS уже включает плавность; здесь только haptic-fallback. */

  /* ---------- Mascot (AI-человечек, бегущий за курсором) ---------- */
  function initMascot() {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var wrap = document.createElement('div');
    wrap.className = 'moi-mascot';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.dataset.state = 'idle';
    // SVG структура: облачко выхлопа, машина, ракета, персонаж
    wrap.innerHTML = ''
      + '<svg viewBox="0 0 100 120">'
      +   '<defs>'
      +     '<linearGradient id="moiFlameGrad" x1="0" y1="0" x2="0" y2="1">'
      +       '<stop offset="0%" stop-color="#ffd166"/>'
      +       '<stop offset="50%" stop-color="#ff7a3a"/>'
      +       '<stop offset="100%" stop-color="#ff3838" stop-opacity="0"/>'
      +     '</linearGradient>'
      +     '<linearGradient id="moiBodyGrad" x1="0" y1="0" x2="0" y2="1">'
      +       '<stop offset="0%" stop-color="#7f5af0"/>'
      +       '<stop offset="100%" stop-color="#5a37d8"/>'
      +     '</linearGradient>'
      +   '</defs>'
      +   '<g class="mascot-cloud">'
      +     '<ellipse cx="14" cy="100" rx="9" ry="4" fill="#a0aec0" opacity="0.6"/>'
      +     '<ellipse cx="6"  cy="103" rx="6" ry="3" fill="#a0aec0" opacity="0.4"/>'
      +   '</g>'
      +   '<g class="mascot-rocket">'
      +     '<path d="M50,2 L66,32 L66,80 L34,80 L34,32 Z" fill="url(#moiBodyGrad)"/>'
      +     '<circle cx="50" cy="38" r="6" fill="#cdd6f4" opacity="0.85"/>'
      +     '<path d="M34,60 L18,80 L34,80 Z" fill="#5a37d8"/>'
      +     '<path d="M66,60 L82,80 L66,80 Z" fill="#5a37d8"/>'
      +   '</g>'
      +   '<g class="mascot-rocket-flame">'
      +     '<ellipse cx="50" cy="92" rx="12" ry="22" fill="url(#moiFlameGrad)"/>'
      +   '</g>'
      +   '<g class="mascot-car">'
      +     '<rect x="14" y="78" width="72" height="20" rx="6" fill="url(#moiBodyGrad)"/>'
      +     '<rect x="26" y="66" width="48" height="16" rx="5" fill="#7f5af0" opacity="0.85"/>'
      +     '<rect x="32" y="70" width="16" height="10" rx="2" fill="#cdd6f4" opacity="0.7"/>'
      +     '<rect x="52" y="70" width="16" height="10" rx="2" fill="#cdd6f4" opacity="0.7"/>'
      +     '<g class="car-wheel-l"><circle cx="28" cy="100" r="8" fill="#161a26"/><circle cx="28" cy="100" r="3" fill="#7f5af0"/></g>'
      +     '<g class="car-wheel-r"><circle cx="72" cy="100" r="8" fill="#161a26"/><circle cx="72" cy="100" r="3" fill="#7f5af0"/></g>'
      +   '</g>'
      +   '<g class="mascot-character">'
      +     '<rect class="leg leg-l" x="40" y="68" width="8" height="22" rx="3" fill="#2cb67d"/>'
      +     '<rect class="leg leg-r" x="52" y="68" width="8" height="22" rx="3" fill="#2cb67d"/>'
      +     '<rect class="body" x="36" y="40" width="28" height="30" rx="6" fill="url(#moiBodyGrad)"/>'
      +     '<rect class="arm arm-l" x="24" y="42" width="8" height="22" rx="3" fill="#7f5af0"/>'
      +     '<rect class="arm arm-r" x="68" y="42" width="8" height="22" rx="3" fill="#7f5af0"/>'
      +     '<circle class="head" cx="50" cy="26" r="13" fill="url(#moiBodyGrad)"/>'
      +     '<circle cx="44" cy="25" r="2" fill="#fff"/>'
      +     '<circle cx="56" cy="25" r="2" fill="#fff"/>'
      +     '<circle cx="44" cy="25.5" r="0.9" fill="#161a26"/>'
      +     '<circle cx="56" cy="25.5" r="0.9" fill="#161a26"/>'
      +     '<path d="M44,32 Q50,36 56,32" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
      +     // антеннка с лампочкой как у AI-робота
      +     '<line x1="50" y1="13" x2="50" y2="6" stroke="#7f5af0" stroke-width="1.5"/>'
      +     '<circle cx="50" cy="5" r="2.2" fill="#2cb67d"/>'
      +   '</g>'
      + '</svg>';
    document.body.appendChild(wrap);

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var posX = mouseX, posY = mouseY;
    var lastMouseX = mouseX, lastMouseY = mouseY;
    var lastT = performance.now();
    var lastMoveT = -10000;
    var speed = 0;     // px/s, сглаженная
    var lastDirX = 1;  // -1 / +1
    var state = 'idle';

    function onMove(e) {
      var t = performance.now();
      var dx = e.clientX - lastMouseX;
      var dy = e.clientY - lastMouseY;
      var dt = Math.max(t - lastT, 1);
      var v = Math.hypot(dx, dy) / (dt / 1000);
      // Экспоненциальное сглаживание скорости
      speed = speed * 0.6 + v * 0.4;
      lastMouseX = e.clientX; lastMouseY = e.clientY; lastT = t;
      mouseX = e.clientX; mouseY = e.clientY;
      lastMoveT = t;
    }
    document.addEventListener('mousemove', onMove, { passive: true });

    function pickState(now) {
      var idleFor = now - lastMoveT;
      if (idleFor > 350) return 'idle';
      if (speed > 2400) return 'rocket';
      if (speed > 900)  return 'driving';
      if (speed > 60)   return 'walking';
      return 'idle';
    }

    function loop() {
      var now = performance.now();
      // Затухание скорости при паузе
      if (now - lastMoveT > 100) speed *= 0.86;

      var newState = pickState(now);
      if (newState !== state) {
        state = newState;
        wrap.dataset.state = state;
      }

      // Куда стремится маскот: позиция курсора + смещение «позади»
      // По горизонтали — сзади по направлению движения, по вертикали — чуть ниже курсора
      var dirX = (mouseX - posX) >= 0 ? 1 : -1;
      // Сохраняем направление, чтобы не дёргался при микро-колебаниях
      if (Math.abs(mouseX - posX) > 30) lastDirX = dirX;

      var trailX = (state === 'rocket') ? 110 : (state === 'driving' ? 90 : 70);
      var trailY = (state === 'rocket') ? -10 : 40;
      var targetX = mouseX - lastDirX * trailX;
      var targetY = mouseY + trailY;

      // Скорость преследования зависит от состояния
      var lerp = (state === 'rocket') ? 0.22 : (state === 'driving' ? 0.13 : (state === 'walking' ? 0.07 : 0.04));
      posX += (targetX - posX) * lerp;
      posY += (targetY - posY) * lerp;

      // Лёгкий 3D-наклон в сторону движения
      var tilt = Math.max(-22, Math.min(22, (mouseX - posX) / 14));
      var scaleX = lastDirX; // зеркалим для разворота персонажа
      // При полёте на ракете — ставим вертикально (нос вверх) с лёгким наклоном
      var rotateZ = (state === 'rocket') ? (-lastDirX * 12) : 0;

      wrap.style.transform =
        'translate3d(' + posX + 'px,' + posY + 'px,0) ' +
        'translate(-50%,-50%) ' +
        'rotateY(' + tilt + 'deg) ' +
        'rotateZ(' + rotateZ + 'deg) ' +
        'scaleX(' + scaleX + ')';

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ---------- Init ---------- */
  initTheme();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      buildThemeToggle();
      initCursor();
      initTerminal();
      initMascot();
    });
  } else {
    buildThemeToggle();
    initCursor();
    initTerminal();
    initMascot();
  }
})();
