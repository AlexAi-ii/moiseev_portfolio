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

  /* ---------- Mascot: AI-стикмен с плавным догоном курсора ---------- */
  function initMascot() {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // SVG-стикмен: голова без лица, тонкие линии-руки/ноги, антенна-«мысль» сверху.
    // Все шарниры собраны в (28, *) для удобства transform-origin.
    var wrap = document.createElement('div');
    wrap.className = 'moi-mascot';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.dataset.state = 'idle';
    wrap.innerHTML = ''
      + '<svg viewBox="0 0 56 76">'
      +   '<g class="mascot-body" stroke="#7f5af0" stroke-width="2.4" stroke-linecap="round" fill="none">'
      +     // антенна + лампочка (AI-маркер)
      +     '<line class="mascot-antenna" x1="28" y1="14" x2="28" y2="6"/>'
      +     '<circle class="mascot-bulb" cx="28" cy="4" r="1.8" fill="#2cb67d" stroke="none"/>'
      +     // голова — кружок без лица
      +     '<circle class="mascot-head" cx="28" cy="14" r="6" fill="#7f5af0" stroke="none"/>'
      +     // halo-волна вокруг головы (idle)
      +     '<circle class="mascot-halo" cx="28" cy="14" r="9" stroke="#7f5af0" stroke-width="1" fill="none" opacity="0"/>'
      +     // тело
      +     '<line class="mascot-spine" x1="28" y1="20" x2="28" y2="50"/>'
      +     // руки (пара отрезков от плеч 28,30 в стороны)
      +     '<line class="arm arm-l" x1="28" y1="30" x2="14" y2="42"/>'
      +     '<line class="arm arm-r" x1="28" y1="30" x2="42" y2="42"/>'
      +     // ноги (от таза 28,50)
      +     '<line class="leg leg-l" x1="28" y1="50" x2="20" y2="68"/>'
      +     '<line class="leg leg-r" x1="28" y1="50" x2="36" y2="68"/>'
      +     // ступни-точки
      +     '<circle cx="20" cy="68" r="1.6" fill="#2cb67d" stroke="none"/>'
      +     '<circle cx="36" cy="68" r="1.6" fill="#2cb67d" stroke="none"/>'
      +   '</g>'
      + '</svg>';
    document.body.appendChild(wrap);

    // Пунктирный след — отдельный SVG поверх viewport
    var trailSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    trailSvg.setAttribute('class', 'moi-trail');
    trailSvg.setAttribute('aria-hidden', 'true');
    var trailLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    trailLine.setAttribute('x1', '0'); trailLine.setAttribute('y1', '0');
    trailLine.setAttribute('x2', '0'); trailLine.setAttribute('y2', '0');
    trailSvg.appendChild(trailLine);
    document.body.appendChild(trailSvg);

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var posX = mouseX, posY = mouseY;
    var lastMouseX = mouseX, lastMouseY = mouseY;
    var lastT = performance.now();
    var lastMoveT = -10000;
    var speed = 0;
    var lastDirX = 1;
    var state = 'idle';

    function onMove(e) {
      var t = performance.now();
      var dx = e.clientX - lastMouseX;
      var dy = e.clientY - lastMouseY;
      var dt = Math.max(t - lastT, 1);
      var v = Math.hypot(dx, dy) / (dt / 1000);
      speed = speed * 0.7 + v * 0.3;
      lastMouseX = e.clientX; lastMouseY = e.clientY; lastT = t;
      mouseX = e.clientX; mouseY = e.clientY;
      lastMoveT = t;
    }
    document.addEventListener('mousemove', onMove, { passive: true });

    function pickState(now, dist) {
      var idleFor = now - lastMoveT;
      // Бежит, если до курсора заметное расстояние ИЛИ мышка только что двигалась
      if (dist > 14 || idleFor < 250) return 'running';
      return 'idle';
    }

    function loop() {
      var now = performance.now();
      if (now - lastMoveT > 100) speed *= 0.9;

      // Цель — прямо в центр курсора
      var dx = mouseX - posX;
      var dy = mouseY - posY;
      var dist = Math.hypot(dx, dy);

      // Плавный lerp: маленький коэффициент → медленно догоняет
      // При большом расстоянии чуть ускоряемся, чтобы не отставать совсем
      var lerp = 0.04 + Math.min(0.06, dist / 4000);
      posX += dx * lerp;
      posY += dy * lerp;

      // Направление (для зеркалирования) и состояние
      if (Math.abs(dx) > 20) lastDirX = dx >= 0 ? 1 : -1;
      var newState = pickState(now, dist);
      if (newState !== state) {
        state = newState;
        wrap.dataset.state = state;
      }

      // Микро-наклон корпуса при беге
      var tilt = Math.max(-12, Math.min(12, dx / 24));
      wrap.style.transform =
        'translate3d(' + posX + 'px,' + posY + 'px,0) ' +
        'translate(-50%,-50%) ' +
        'rotateZ(' + (state === 'running' ? tilt : 0) + 'deg) ' +
        'scaleX(' + lastDirX + ')';

      // Пунктирный след виден только в движении и если расстояние > 30px
      if (state === 'running' && dist > 30) {
        trailLine.setAttribute('x1', mouseX);
        trailLine.setAttribute('y1', mouseY);
        trailLine.setAttribute('x2', posX);
        trailLine.setAttribute('y2', posY);
        trailSvg.style.opacity = '1';
      } else {
        trailSvg.style.opacity = '0';
      }

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
