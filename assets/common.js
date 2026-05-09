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
    // Стик-фигура «палка-палка-огуречек»: голова, вертикальное туловище,
    // 2 руки сверху + 2 ноги снизу, у каждой руки есть локоть, у каждой ноги — колено.
    // Все шарниры управляются JS через setAttribute('transform', 'rotate(angle cx cy)').
    // Это работает 100% надёжно во всех браузерах (CSS на вложенных <g> — нет).
    wrap.innerHTML = ''
      + '<svg viewBox="0 0 56 70">'
      +   '<g class="mascot-character" stroke="#7f5af0" stroke-width="2.6" stroke-linecap="round" fill="none">'
      +     // антенна + лампочка
      +     '<line class="mascot-antenna" x1="28" y1="9" x2="28" y2="4"/>'
      +     '<circle class="mascot-bulb" cx="28" cy="3" r="1.5" fill="#2cb67d" stroke="none"/>'
      +     // голова
      +     '<circle class="mascot-head" cx="28" cy="14" r="5" fill="#7f5af0" stroke="none"/>'
      +     // halo
      +     '<circle class="mascot-halo" cx="28" cy="14" r="5" stroke="#7f5af0" stroke-width="1" fill="none" opacity="0"/>'
      +     // ВЕРТИКАЛЬНОЕ ТУЛОВИЩЕ-ПАЛОЧКА: от плеч (y=19) до таза (y=38)
      +     '<line class="mascot-spine" x1="28" y1="19" x2="28" y2="38"/>'
      +     // ЛЕВАЯ РУКА: плечо(28,19) → локоть(20,28) → кисть(15,38)
      +     '<g class="upper-arm-l">'
      +       '<line x1="28" y1="19" x2="20" y2="28"/>'
      +       '<g class="forearm-l">'
      +         '<line x1="20" y1="28" x2="15" y2="38"/>'
      +       '</g>'
      +     '</g>'
      +     // ПРАВАЯ РУКА: плечо(28,19) → локоть(36,28) → кисть(41,38)
      +     '<g class="upper-arm-r">'
      +       '<line x1="28" y1="19" x2="36" y2="28"/>'
      +       '<g class="forearm-r">'
      +         '<line x1="36" y1="28" x2="41" y2="38"/>'
      +       '</g>'
      +     '</g>'
      +     // ЛЕВАЯ НОГА: бедро(28,38) → колено(24,50) → ступня(22,62)
      +     '<g class="thigh-l">'
      +       '<line x1="28" y1="38" x2="24" y2="50"/>'
      +       '<g class="shin-l">'
      +         '<line x1="24" y1="50" x2="22" y2="62"/>'
      +       '</g>'
      +     '</g>'
      +     // ПРАВАЯ НОГА: бедро(28,38) → колено(32,50) → ступня(34,62)
      +     '<g class="thigh-r">'
      +       '<line x1="28" y1="38" x2="32" y2="50"/>'
      +       '<g class="shin-r">'
      +         '<line x1="32" y1="50" x2="34" y2="62"/>'
      +       '</g>'
      +     '</g>'
      +   '</g>'
      + '</svg>';

    // Ссылки на шарниры
    var refs = {
      uArmL:  wrap.querySelector('.upper-arm-l'),
      fArmL:  wrap.querySelector('.forearm-l'),
      uArmR:  wrap.querySelector('.upper-arm-r'),
      fArmR:  wrap.querySelector('.forearm-r'),
      thighL: wrap.querySelector('.thigh-l'),
      shinL:  wrap.querySelector('.shin-l'),
      thighR: wrap.querySelector('.thigh-r'),
      shinR:  wrap.querySelector('.shin-r')
    };
    // Координаты шарниров (исходные точки, до rotate)
    var H = {
      shoulderL: '28 19', elbowL: '20 28',
      shoulderR: '28 19', elbowR: '36 28',
      hipL: '28 38', kneeL: '24 50',
      hipR: '28 38', kneeR: '32 50'
    };
    function setRot(node, deg, hinge) {
      node.setAttribute('transform', 'rotate(' + deg.toFixed(1) + ' ' + hinge + ')');
    }
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
    var stateStart = performance.now();

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

      // Очень плавный lerp.
      var lerp = 0.011 + Math.min(0.014, dist / 14000);
      posX += dx * lerp;
      posY += dy * lerp;

      if (Math.abs(dx) > 20) lastDirX = dx >= 0 ? 1 : -1;

      var newState = pickState(now, dist);
      if (newState !== state) {
        if (state === 'running' && newState === 'idle') triggerLanding();
        state = newState;
        stateStart = now;
        wrap.dataset.state = state;
      }

      // === Анимация суставов через JS (надёжный способ для вложенных <g>) ===
      var t = (now - stateStart) / 1000; // секунды с начала состояния

      if (state === 'running') {
        // Бег: цикл 0.42с → ω = 2π/0.42 ≈ 15
        var run = t * 14;
        var s = Math.sin(run);
        var c = Math.cos(run);

        // Бёдра: махают вперёд-назад противофазно (-30..+40°)
        setRot(refs.thighL,  35 * s,        H.hipL);
        setRot(refs.thighR, -35 * s,        H.hipR);
        // Голени: согнуты когда нога позади (cos ≈ -1) → выпрямляются вперёд
        setRot(refs.shinL,  Math.max(0, -50 * c) + 10, H.kneeL);
        setRot(refs.shinR,  Math.max(0,  50 * c) + 10, H.kneeR);
        // Руки: противофазно ногам, локти всегда согнуты на ~50°
        setRot(refs.uArmL, -45 * s, H.shoulderL);
        setRot(refs.uArmR,  45 * s, H.shoulderR);
        setRot(refs.fArmL, -50,     H.elbowL);
        setRot(refs.fArmR,  50,     H.elbowR);
      } else {
        // IDLE: длинная танцевальная программа (несколько ритмов одновременно)
        var s1 = Math.sin(t * 1.6);
        var s2 = Math.sin(t * 2.4);
        var s3 = Math.sin(t * 0.9);
        var s4 = Math.sin(t * 1.2);

        // Плечи — широкие махи туда-сюда (-90..+50°)
        setRot(refs.uArmL, -50 + 60 * s1, H.shoulderL);
        setRot(refs.uArmR,  50 - 60 * s1, H.shoulderR);
        // Локти — постоянно согнуты, ритм быстрее
        setRot(refs.fArmL, -40 - 35 * s2, H.elbowL);
        setRot(refs.fArmR,  40 + 35 * s2, H.elbowR);
        // Бёдра — мягкое раскачивание
        setRot(refs.thighL,  18 * s3, H.hipL);
        setRot(refs.thighR, -18 * s3, H.hipR);
        // Колени — приседания, синхронны (приплясывает)
        var kneeBend = 25 + 25 * s4;
        setRot(refs.shinL,  kneeBend, H.kneeL);
        setRot(refs.shinR,  kneeBend, H.kneeR);
      }

      // Перемещение wrap — JS управляет позицией. Прыжок is-landing работает
      // на внутреннем .mascot-character, не конфликтует с этим transform.
      var tilt = Math.max(-10, Math.min(10, dx / 30));
      wrap.style.transform =
        'translate3d(' + posX + 'px,' + posY + 'px,0) ' +
        'translate(-50%,-50%) ' +
        'rotateZ(' + (state === 'running' ? tilt : 0) + 'deg) ' +
        'scaleX(' + lastDirX + ')';

      // Пунктирный след
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
