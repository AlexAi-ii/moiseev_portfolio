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
    // Скелет с шарнирами (локти, колени) — вложенные SVG-группы для двойного rotate.
    // Шеи нет, тело — короткая ось от плеч (y=20) до таза (y=30). Анфас.
    wrap.innerHTML = ''
      + '<svg viewBox="0 0 56 76">'
      +   '<g class="mascot-character" stroke="#7f5af0" stroke-width="3" stroke-linecap="round" fill="none">'
      +     // антенна + лампочка
      +     '<line class="mascot-antenna" x1="28" y1="9" x2="28" y2="3"/>'
      +     '<circle class="mascot-bulb" cx="28" cy="2" r="1.8" fill="#2cb67d" stroke="none"/>'
      +     // голова
      +     '<circle class="mascot-head" cx="28" cy="11" r="6" fill="#7f5af0" stroke="none"/>'
      +     // halo вокруг головы (idle pulse)
      +     '<circle class="mascot-halo" cx="28" cy="11" r="6" stroke="#7f5af0" stroke-width="1" fill="none" opacity="0"/>'
      +     // короткое тело (плечи 20 — таз 30)
      +     '<line class="mascot-spine" x1="28" y1="17" x2="28" y2="30"/>'
      +     // ЛЕВАЯ РУКА: плечо (23,20) → локоть (18,29) → кисть (14,38)
      +     '<g class="upper-arm-l">'
      +       '<line x1="23" y1="20" x2="18" y2="29"/>'
      +       '<g class="forearm-l">'
      +         '<line x1="18" y1="29" x2="14" y2="38"/>'
      +       '</g>'
      +     '</g>'
      +     // ПРАВАЯ РУКА: плечо (33,20) → локоть (38,29) → кисть (42,38)
      +     '<g class="upper-arm-r">'
      +       '<line x1="33" y1="20" x2="38" y2="29"/>'
      +       '<g class="forearm-r">'
      +         '<line x1="38" y1="29" x2="42" y2="38"/>'
      +       '</g>'
      +     '</g>'
      +     // ЛЕВАЯ НОГА: бедро (24,30) → колено (21,44) → ступня (18,58)
      +     '<g class="thigh-l">'
      +       '<line x1="24" y1="30" x2="21" y2="44"/>'
      +       '<g class="shin-l">'
      +         '<line x1="21" y1="44" x2="18" y2="58"/>'
      +       '</g>'
      +     '</g>'
      +     // ПРАВАЯ НОГА: бедро (32,30) → колено (35,44) → ступня (38,58)
      +     '<g class="thigh-r">'
      +       '<line x1="32" y1="30" x2="35" y2="44"/>'
      +       '<g class="shin-r">'
      +         '<line x1="35" y1="44" x2="38" y2="58"/>'
      +       '</g>'
      +     '</g>'
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
      if (dist > 18 || idleFor < 250) return 'running';
      return 'idle';
    }

    var landingTimer = null;
    function triggerLanding() {
      // мини-прыжок при добегании
      wrap.classList.remove('is-landing');
      // принудительный reflow, чтобы анимация перезапустилась
      void wrap.offsetWidth;
      wrap.classList.add('is-landing');
      clearTimeout(landingTimer);
      landingTimer = setTimeout(function () {
        wrap.classList.remove('is-landing');
      }, 820);
    }

    function loop() {
      var now = performance.now();
      if (now - lastMoveT > 100) speed *= 0.9;

      var dx = mouseX - posX;
      var dy = mouseY - posY;
      var dist = Math.hypot(dx, dy);

      // Очень плавный lerp — маскот не должен догонять быстро.
      // 0.011 базово + лёгкое ускорение при большой дистанции (cap 0.014).
      var lerp = 0.011 + Math.min(0.014, dist / 14000);
      posX += dx * lerp;
      posY += dy * lerp;

      if (Math.abs(dx) > 20) lastDirX = dx >= 0 ? 1 : -1;

      var newState = pickState(now, dist);
      if (newState !== state) {
        // переход running → idle (прибежал) — запускаем прыжок
        if (state === 'running' && newState === 'idle') triggerLanding();
        state = newState;
        wrap.dataset.state = state;
      }

      // Лёгкий наклон корпуса при беге
      var tilt = Math.max(-10, Math.min(10, dx / 30));
      wrap.style.transform =
        'translate3d(' + posX + 'px,' + posY + 'px,0) ' +
        'translate(-50%,-50%) ' +
        'rotateZ(' + (state === 'running' ? tilt : 0) + 'deg) ' +
        'scaleX(' + lastDirX + ')';

      // Пунктирный след — только в беге, и только если расстояние > 40
      if (state === 'running' && dist > 40) {
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
      initTerminal();
      initMascot();
    });
  } else {
    buildThemeToggle();
    initTerminal();
    initMascot();
  }
})();
