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

  /* ---------- Mascot: общие хелперы ---------- */
  // Координаты шарниров SVG (исходные, до rotate)
  var HINGES = {
    shoulderL: '28 19', elbowL: '20 28',
    shoulderR: '28 19', elbowR: '36 28',
    hipL: '28 38', kneeL: '24 50',
    hipR: '28 38', kneeR: '32 50'
  };

  function mascotSvgMarkup() {
    return [
      '<svg viewBox="0 0 56 70">',
        '<g class="mascot-character" stroke="#7f5af0" stroke-width="2.6" stroke-linecap="round" fill="none">',
          '<circle class="mascot-head" cx="28" cy="14" r="5" fill="#7f5af0" stroke="none"/>',
          '<circle class="mascot-halo" cx="28" cy="14" r="5" stroke="#7f5af0" stroke-width="1" fill="none" opacity="0"/>',
          '<line class="mascot-spine" x1="28" y1="19" x2="28" y2="38"/>',
          '<g class="upper-arm-l">',
            '<line x1="28" y1="19" x2="20" y2="28"/>',
            '<g class="forearm-l"><line x1="20" y1="28" x2="15" y2="38"/></g>',
          '</g>',
          '<g class="upper-arm-r">',
            '<line x1="28" y1="19" x2="36" y2="28"/>',
            '<g class="forearm-r"><line x1="36" y1="28" x2="41" y2="38"/></g>',
          '</g>',
          '<g class="thigh-l">',
            '<line x1="28" y1="38" x2="24" y2="50"/>',
            '<g class="shin-l"><line x1="24" y1="50" x2="22" y2="62"/></g>',
          '</g>',
          '<g class="thigh-r">',
            '<line x1="28" y1="38" x2="32" y2="50"/>',
            '<g class="shin-r"><line x1="32" y1="50" x2="34" y2="62"/></g>',
          '</g>',
        '</g>',
      '</svg>'
    ].join('');
  }

  function getMascotRefs(wrap) {
    return {
      character: wrap.querySelector('.mascot-character'),
      uArmL:  wrap.querySelector('.upper-arm-l'),
      fArmL:  wrap.querySelector('.forearm-l'),
      uArmR:  wrap.querySelector('.upper-arm-r'),
      fArmR:  wrap.querySelector('.forearm-r'),
      thighL: wrap.querySelector('.thigh-l'),
      shinL:  wrap.querySelector('.shin-l'),
      thighR: wrap.querySelector('.thigh-r'),
      shinR:  wrap.querySelector('.shin-r')
    };
  }

  function setRot(node, deg, hinge) {
    node.setAttribute('transform', 'rotate(' + deg.toFixed(1) + ' ' + hinge + ')');
  }

  /* ---------- Idle-программа: 20 поз для стоящего маскота ----------
     Каждая поза — функция (refs, t) → { tx, ty, rot } для трансформа character.
     t — секунды от начала позы. Возвращает translation/rotation корпуса.
     Поза должна сама прокинуть углы шарниров через setRot. */
  function poseSwayBreathe(refs, t) {
    var s = Math.sin(t * 1.4);
    setRot(refs.uArmL, -10 + 6 * s, HINGES.shoulderL);
    setRot(refs.uArmR,  10 - 6 * s, HINGES.shoulderR);
    setRot(refs.fArmL, -15 - 4 * s, HINGES.elbowL);
    setRot(refs.fArmR,  15 + 4 * s, HINGES.elbowR);
    setRot(refs.thighL, 0, HINGES.hipL);
    setRot(refs.thighR, 0, HINGES.hipR);
    setRot(refs.shinL, 5, HINGES.kneeL);
    setRot(refs.shinR, 5, HINGES.kneeR);
    return { tx: 0, ty: -1.5 * s, rot: 0 };
  }
  function poseArmsUp(refs, t) {
    var s = Math.sin(t * 1.6);
    setRot(refs.uArmL,  -150 + 8 * s, HINGES.shoulderL);
    setRot(refs.uArmR,   150 - 8 * s, HINGES.shoulderR);
    setRot(refs.fArmL,  -10, HINGES.elbowL);
    setRot(refs.fArmR,   10, HINGES.elbowR);
    setRot(refs.thighL, 0, HINGES.hipL);
    setRot(refs.thighR, 0, HINGES.hipR);
    setRot(refs.shinL, 8, HINGES.kneeL);
    setRot(refs.shinR, 8, HINGES.kneeR);
    return { tx: 0, ty: 0, rot: 0 };
  }
  function poseArmsSide(refs, t) {
    var s = Math.sin(t * 1.8);
    setRot(refs.uArmL,  -90 + 5 * s, HINGES.shoulderL);
    setRot(refs.uArmR,   90 - 5 * s, HINGES.shoulderR);
    setRot(refs.fArmL,  -10, HINGES.elbowL);
    setRot(refs.fArmR,   10, HINGES.elbowR);
    setRot(refs.thighL, 0, HINGES.hipL);
    setRot(refs.thighR, 0, HINGES.hipR);
    setRot(refs.shinL, 6, HINGES.kneeL);
    setRot(refs.shinR, 6, HINGES.kneeR);
    return { tx: 0, ty: 0, rot: 0 };
  }
  function poseHandsOnHips(refs, t) {
    var s = Math.sin(t * 1.2);
    setRot(refs.uArmL,  -55, HINGES.shoulderL);
    setRot(refs.uArmR,   55, HINGES.shoulderR);
    setRot(refs.fArmL, -110, HINGES.elbowL);
    setRot(refs.fArmR,  110, HINGES.elbowR);
    setRot(refs.thighL,  4 * s, HINGES.hipL);
    setRot(refs.thighR, -4 * s, HINGES.hipR);
    setRot(refs.shinL, 8, HINGES.kneeL);
    setRot(refs.shinR, 8, HINGES.kneeR);
    return { tx: 2 * s, ty: 0, rot: 1.5 * s };
  }
  function poseWaveRight(refs, t) {
    var s = Math.sin(t * 4);
    setRot(refs.uArmL, -10, HINGES.shoulderL);
    setRot(refs.fArmL, -15, HINGES.elbowL);
    setRot(refs.uArmR,  130, HINGES.shoulderR);
    setRot(refs.fArmR,   30 + 25 * s, HINGES.elbowR);
    setRot(refs.thighL, 0, HINGES.hipL);
    setRot(refs.thighR, 0, HINGES.hipR);
    setRot(refs.shinL, 6, HINGES.kneeL);
    setRot(refs.shinR, 6, HINGES.kneeR);
    return { tx: 0, ty: 0, rot: 0 };
  }
  function poseWaveLeft(refs, t) {
    var s = Math.sin(t * 4);
    setRot(refs.uArmR, 10, HINGES.shoulderR);
    setRot(refs.fArmR, 15, HINGES.elbowR);
    setRot(refs.uArmL, -130, HINGES.shoulderL);
    setRot(refs.fArmL, -30 - 25 * s, HINGES.elbowL);
    setRot(refs.thighL, 0, HINGES.hipL);
    setRot(refs.thighR, 0, HINGES.hipR);
    setRot(refs.shinL, 6, HINGES.kneeL);
    setRot(refs.shinR, 6, HINGES.kneeR);
    return { tx: 0, ty: 0, rot: 0 };
  }
  function poseThink(refs, t) {
    var s = Math.sin(t * 1.5);
    setRot(refs.uArmR,  10, HINGES.shoulderR);
    setRot(refs.fArmR,  20, HINGES.elbowR);
    setRot(refs.uArmL, -40, HINGES.shoulderL);
    setRot(refs.fArmL, -150, HINGES.elbowL); // рука к голове
    setRot(refs.thighL, 0, HINGES.hipL);
    setRot(refs.thighR, 0, HINGES.hipR);
    setRot(refs.shinL, 7, HINGES.kneeL);
    setRot(refs.shinR, 7, HINGES.kneeR);
    return { tx: 0, ty: 0, rot: 4 + 2 * s };
  }
  function poseLeanLeft(refs, t) {
    var s = Math.sin(t * 1.4);
    var lean = -8 + 2 * s;
    setRot(refs.uArmL, -30 + 5 * s, HINGES.shoulderL);
    setRot(refs.uArmR,  30 - 5 * s, HINGES.shoulderR);
    setRot(refs.fArmL, -25, HINGES.elbowL);
    setRot(refs.fArmR,  25, HINGES.elbowR);
    setRot(refs.thighL, 0, HINGES.hipL);
    setRot(refs.thighR, 0, HINGES.hipR);
    setRot(refs.shinL, 8, HINGES.kneeL);
    setRot(refs.shinR, 8, HINGES.kneeR);
    return { tx: -3, ty: 0, rot: lean };
  }
  function poseLeanRight(refs, t) {
    var s = Math.sin(t * 1.4);
    var lean = 8 - 2 * s;
    setRot(refs.uArmL, -30 + 5 * s, HINGES.shoulderL);
    setRot(refs.uArmR,  30 - 5 * s, HINGES.shoulderR);
    setRot(refs.fArmL, -25, HINGES.elbowL);
    setRot(refs.fArmR,  25, HINGES.elbowR);
    setRot(refs.thighL, 0, HINGES.hipL);
    setRot(refs.thighR, 0, HINGES.hipR);
    setRot(refs.shinL, 8, HINGES.kneeL);
    setRot(refs.shinR, 8, HINGES.kneeR);
    return { tx: 3, ty: 0, rot: lean };
  }
  function poseSquats(refs, t) {
    // Настоящие приседания: голова идёт ниже вместе с корпусом.
    var phase = (Math.sin(t * 2.6 - Math.PI / 2) + 1) / 2; // 0..1
    var depth = phase * 14; // насколько ниже опускается тело
    setRot(refs.uArmL,  -110, HINGES.shoulderL);
    setRot(refs.uArmR,   110, HINGES.shoulderR);
    setRot(refs.fArmL,   10, HINGES.elbowL);
    setRot(refs.fArmR,  -10, HINGES.elbowR);
    setRot(refs.thighL, -22 * phase, HINGES.hipL);
    setRot(refs.thighR,  22 * phase, HINGES.hipR);
    setRot(refs.shinL, 25 + 35 * phase, HINGES.kneeL);
    setRot(refs.shinR, 25 + 35 * phase, HINGES.kneeR);
    return { tx: 0, ty: depth, rot: 0 };
  }
  function poseJumps(refs, t) {
    var jumpCycle = 0.7;
    var p = (t % jumpCycle) / jumpCycle; // 0..1
    var lift, crouch;
    if (p < 0.35) {
      // присед перед прыжком
      crouch = (p / 0.35) * 8;
      lift = 0;
    } else if (p < 0.75) {
      // в воздухе
      crouch = 0;
      lift = Math.sin(((p - 0.35) / 0.4) * Math.PI) * 16;
    } else {
      crouch = (1 - (p - 0.75) / 0.25) * 6;
      lift = 0;
    }
    setRot(refs.uArmL, -60 + (lift > 0 ? -40 : 0), HINGES.shoulderL);
    setRot(refs.uArmR,  60 + (lift > 0 ?  40 : 0), HINGES.shoulderR);
    setRot(refs.fArmL, -25, HINGES.elbowL);
    setRot(refs.fArmR,  25, HINGES.elbowR);
    setRot(refs.thighL, lift > 0 ? -8 : 0, HINGES.hipL);
    setRot(refs.thighR, lift > 0 ?  8 : 0, HINGES.hipR);
    setRot(refs.shinL, 10 + crouch * 2.5 + (lift > 0 ? 25 : 0), HINGES.kneeL);
    setRot(refs.shinR, 10 + crouch * 2.5 + (lift > 0 ? 25 : 0), HINGES.kneeR);
    return { tx: 0, ty: -lift + crouch, rot: 0 };
  }
  function poseSpin(refs, t) {
    // Полное кружение за 1.4с, не больше одного оборота за позу
    var rot = Math.min(360, (t / 1.4) * 360);
    setRot(refs.uArmL, -100, HINGES.shoulderL);
    setRot(refs.uArmR,  100, HINGES.shoulderR);
    setRot(refs.fArmL, -10, HINGES.elbowL);
    setRot(refs.fArmR,  10, HINGES.elbowR);
    setRot(refs.thighL, 0, HINGES.hipL);
    setRot(refs.thighR, 0, HINGES.hipR);
    setRot(refs.shinL, 8, HINGES.kneeL);
    setRot(refs.shinR, 8, HINGES.kneeR);
    return { tx: 0, ty: 0, rot: rot };
  }
  function poseBoxer(refs, t) {
    var s = Math.sin(t * 6);
    var s2 = Math.sin(t * 6 + Math.PI);
    setRot(refs.uArmL,  -50 + 30 * s, HINGES.shoulderL);
    setRot(refs.fArmL,  -90 + 60 * s, HINGES.elbowL);
    setRot(refs.uArmR,   50 + 30 * s2, HINGES.shoulderR);
    setRot(refs.fArmR,   90 - 60 * s2, HINGES.elbowR);
    setRot(refs.thighL, -3, HINGES.hipL);
    setRot(refs.thighR,  3, HINGES.hipR);
    setRot(refs.shinL, 12, HINGES.kneeL);
    setRot(refs.shinR, 12, HINGES.kneeR);
    return { tx: 0, ty: 0, rot: 0 };
  }
  function poseTapFoot(refs, t) {
    var s = Math.sin(t * 5);
    setRot(refs.uArmL, -30, HINGES.shoulderL);
    setRot(refs.uArmR,  30, HINGES.shoulderR);
    setRot(refs.fArmL, -25, HINGES.elbowL);
    setRot(refs.fArmR,  25, HINGES.elbowR);
    setRot(refs.thighL, 0, HINGES.hipL);
    setRot(refs.thighR, -8 + 8 * s, HINGES.hipR);
    setRot(refs.shinL, 8, HINGES.kneeL);
    setRot(refs.shinR, 30 + 15 * s, HINGES.kneeR);
    return { tx: 0, ty: 0, rot: 0 };
  }
  function poseGroove(refs, t) {
    var s = Math.sin(t * 2.6);
    var s2 = Math.sin(t * 2.6 + Math.PI / 2);
    setRot(refs.uArmL, -40 - 30 * s, HINGES.shoulderL);
    setRot(refs.uArmR,  40 + 30 * s, HINGES.shoulderR);
    setRot(refs.fArmL, -25 - 20 * s2, HINGES.elbowL);
    setRot(refs.fArmR,  25 + 20 * s2, HINGES.elbowR);
    setRot(refs.thighL, 8 * s, HINGES.hipL);
    setRot(refs.thighR, -8 * s, HINGES.hipR);
    setRot(refs.shinL, 18 + 10 * s2, HINGES.kneeL);
    setRot(refs.shinR, 18 - 10 * s2, HINGES.kneeR);
    return { tx: 3 * s, ty: 0, rot: 2 * s };
  }
  function poseStretchSide(refs, t) {
    var phase = Math.sin(t * 1.4);
    setRot(refs.uArmL, -150, HINGES.shoulderL);
    setRot(refs.fArmL, -10, HINGES.elbowL);
    setRot(refs.uArmR,  35, HINGES.shoulderR);
    setRot(refs.fArmR,  20, HINGES.elbowR);
    setRot(refs.thighL, 0, HINGES.hipL);
    setRot(refs.thighR, 0, HINGES.hipR);
    setRot(refs.shinL, 6, HINGES.kneeL);
    setRot(refs.shinR, 6, HINGES.kneeR);
    return { tx: 4 * phase, ty: 0, rot: 10 * phase };
  }
  function poseClap(refs, t) {
    var s = Math.sin(t * 6);
    var ang = 90 + 35 * s;
    setRot(refs.uArmL, -ang, HINGES.shoulderL);
    setRot(refs.uArmR,  ang, HINGES.shoulderR);
    setRot(refs.fArmL, -50, HINGES.elbowL);
    setRot(refs.fArmR,  50, HINGES.elbowR);
    setRot(refs.thighL, 0, HINGES.hipL);
    setRot(refs.thighR, 0, HINGES.hipR);
    setRot(refs.shinL, 10 + 4 * Math.abs(s), HINGES.kneeL);
    setRot(refs.shinR, 10 + 4 * Math.abs(s), HINGES.kneeR);
    return { tx: 0, ty: -1.5 * Math.abs(s), rot: 0 };
  }
  function posePointUp(refs, t) {
    var s = Math.sin(t * 2);
    setRot(refs.uArmL, -20, HINGES.shoulderL);
    setRot(refs.fArmL, -25, HINGES.elbowL);
    setRot(refs.uArmR, 160, HINGES.shoulderR);
    setRot(refs.fArmR,  10, HINGES.elbowR);
    setRot(refs.thighL, 0, HINGES.hipL);
    setRot(refs.thighR, 0, HINGES.hipR);
    setRot(refs.shinL, 6, HINGES.kneeL);
    setRot(refs.shinR, 6, HINGES.kneeR);
    return { tx: 0, ty: -1 + s, rot: 0 };
  }
  function poseSalute(refs, t) {
    var s = Math.sin(t * 2.5);
    setRot(refs.uArmL, -25, HINGES.shoulderL);
    setRot(refs.fArmL, -25, HINGES.elbowL);
    setRot(refs.uArmR,  90 + 5 * s, HINGES.shoulderR);
    setRot(refs.fArmR, 100, HINGES.elbowR);
    setRot(refs.thighL, 0, HINGES.hipL);
    setRot(refs.thighR, 0, HINGES.hipR);
    setRot(refs.shinL, 6, HINGES.kneeL);
    setRot(refs.shinR, 6, HINGES.kneeR);
    return { tx: 0, ty: 0, rot: 0 };
  }
  function poseLegLift(refs, t) {
    var s = Math.sin(t * 1.8);
    setRot(refs.uArmL, -90, HINGES.shoulderL);
    setRot(refs.uArmR,  90, HINGES.shoulderR);
    setRot(refs.fArmL, -10, HINGES.elbowL);
    setRot(refs.fArmR,  10, HINGES.elbowR);
    setRot(refs.thighL, -45 - 15 * s, HINGES.hipL);
    setRot(refs.thighR, 0, HINGES.hipR);
    setRot(refs.shinL, 60, HINGES.kneeL);
    setRot(refs.shinR, 6, HINGES.kneeR);
    return { tx: 0, ty: 0, rot: 0 };
  }
  function poseTwist(refs, t) {
    var s = Math.sin(t * 2.2);
    setRot(refs.uArmL, -60 + 40 * s, HINGES.shoulderL);
    setRot(refs.uArmR,  60 + 40 * s, HINGES.shoulderR);
    setRot(refs.fArmL, -30, HINGES.elbowL);
    setRot(refs.fArmR,  30, HINGES.elbowR);
    setRot(refs.thighL, -3 * s, HINGES.hipL);
    setRot(refs.thighR,  3 * s, HINGES.hipR);
    setRot(refs.shinL, 9, HINGES.kneeL);
    setRot(refs.shinR, 9, HINGES.kneeR);
    return { tx: 0, ty: 0, rot: 8 * s };
  }
  function poseShrug(refs, t) {
    var s = Math.sin(t * 1.7);
    setRot(refs.uArmL, -100 + 5 * s, HINGES.shoulderL);
    setRot(refs.uArmR,  100 - 5 * s, HINGES.shoulderR);
    setRot(refs.fArmL, -120, HINGES.elbowL);
    setRot(refs.fArmR,  120, HINGES.elbowR);
    setRot(refs.thighL, 0, HINGES.hipL);
    setRot(refs.thighR, 0, HINGES.hipR);
    setRot(refs.shinL, 8, HINGES.kneeL);
    setRot(refs.shinR, 8, HINGES.kneeR);
    return { tx: 0, ty: -2 + s, rot: 0 };
  }

  var IDLE_POSES = [
    { fn: poseSwayBreathe,  duration: 3.2 },
    { fn: poseArmsUp,       duration: 2.4 },
    { fn: poseArmsSide,     duration: 2.6 },
    { fn: poseHandsOnHips,  duration: 3.0 },
    { fn: poseWaveRight,    duration: 2.4 },
    { fn: poseWaveLeft,     duration: 2.4 },
    { fn: poseThink,        duration: 3.2 },
    { fn: poseLeanLeft,     duration: 2.6 },
    { fn: poseLeanRight,    duration: 2.6 },
    { fn: poseSquats,       duration: 4.0 },
    { fn: poseJumps,        duration: 2.8 },
    { fn: poseSpin,         duration: 1.4 },
    { fn: poseBoxer,        duration: 2.6 },
    { fn: poseTapFoot,      duration: 2.6 },
    { fn: poseGroove,       duration: 3.0 },
    { fn: poseStretchSide,  duration: 2.8 },
    { fn: poseClap,         duration: 2.4 },
    { fn: posePointUp,      duration: 2.2 },
    { fn: poseSalute,       duration: 2.0 },
    { fn: poseLegLift,      duration: 2.6 },
    { fn: poseTwist,        duration: 2.6 },
    { fn: poseShrug,        duration: 2.2 }
  ];

  function applyRunPose(refs, runPhase, ampFactor) {
    var s = Math.sin(runPhase);
    var c = Math.cos(runPhase);
    setRot(refs.thighL,  35 * s * ampFactor, HINGES.hipL);
    setRot(refs.thighR, -35 * s * ampFactor, HINGES.hipR);
    setRot(refs.shinL,  Math.max(0, -50 * c) * ampFactor + 10, HINGES.kneeL);
    setRot(refs.shinR,  Math.max(0,  50 * c) * ampFactor + 10, HINGES.kneeR);
    setRot(refs.uArmL, -40 * s * ampFactor, HINGES.shoulderL);
    setRot(refs.uArmR,  40 * s * ampFactor, HINGES.shoulderR);
    setRot(refs.fArmL, -55 - 15 * s * ampFactor, HINGES.elbowL);
    setRot(refs.fArmR,  55 + 15 * s * ampFactor, HINGES.elbowR);
  }

  /* ---------- Mascot: AI-стикмен с догоном курсора слева ---------- */
  function initMascot() {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var wrap = document.createElement('div');
    wrap.className = 'moi-mascot';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.dataset.state = 'idle';
    wrap.innerHTML = mascotSvgMarkup();
    document.body.appendChild(wrap);
    var refs = getMascotRefs(wrap);

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var posX = mouseX - 40, posY = mouseY;
    var lastMouseX = mouseX, lastMouseY = mouseY;
    var lastT = performance.now();
    var lastMoveT = -10000;
    var lastDirX = 1;
    var state = 'idle';
    var poseIndex = -1;
    var poseStart = performance.now();
    var poseDuration = 2;

    // Маскот всегда стоит СЛЕВА от курсора
    var TARGET_OFFSET_X = -34;
    var TARGET_OFFSET_Y = 0;

    var MAX_SPEED = 1400;       // px/s — полная скорость бега
    var WALK_SPEED_FACTOR = 0.25; // 25% — скорость шага у самой цели
    var RUN_DIST = 220;         // дистанция, начиная с которой бежим на полной
    var WALK_DIST = 22;         // ближе этой дистанции — шаг
    var SNAP_DIST = 4;          // совсем близко — сразу встаём в позицию

    function onMove(e) {
      lastMouseX = e.clientX; lastMouseY = e.clientY; lastT = performance.now();
      mouseX = e.clientX; mouseY = e.clientY;
      lastMoveT = lastT;
    }
    document.addEventListener('mousemove', onMove, { passive: true });

    function nextPose() {
      var idx;
      do { idx = Math.floor(Math.random() * IDLE_POSES.length); }
      while (idx === poseIndex && IDLE_POSES.length > 1);
      poseIndex = idx;
      poseStart = performance.now();
      poseDuration = IDLE_POSES[idx].duration;
    }

    var runPhase = 0;
    var lastFrameT = performance.now();

    function loop() {
      var now = performance.now();
      var dt = Math.min(0.05, (now - lastFrameT) / 1000);
      lastFrameT = now;

      var targetX = mouseX + TARGET_OFFSET_X;
      var targetY = mouseY + TARGET_OFFSET_Y;
      var dx = targetX - posX;
      var dy = targetY - posY;
      var dist = Math.hypot(dx, dy);

      // Движение с заданной скоростью (бег → шаг → стоп), без затухания до нуля
      var speedFactor;
      if (dist > RUN_DIST) speedFactor = 1.0;
      else if (dist > WALK_DIST) {
        var k = (dist - WALK_DIST) / (RUN_DIST - WALK_DIST); // 0..1
        speedFactor = WALK_SPEED_FACTOR + (1 - WALK_SPEED_FACTOR) * k;
      } else if (dist > SNAP_DIST) {
        speedFactor = WALK_SPEED_FACTOR;
      } else {
        speedFactor = 0;
      }
      if (speedFactor > 0 && dist > 0) {
        var step = MAX_SPEED * speedFactor * dt;
        if (step >= dist) { posX = targetX; posY = targetY; }
        else { posX += dx / dist * step; posY += dy / dist * step; }
      }

      var moving = dist > SNAP_DIST;
      if (moving && Math.abs(dx) > 4) lastDirX = dx >= 0 ? 1 : -1;

      var newState = moving ? 'running' : 'idle';
      if (newState !== state) {
        state = newState;
        wrap.dataset.state = state;
        if (state === 'idle') {
          lastDirX = 1; // в idle всегда смотрит на курсор (он справа)
          poseIndex = -1;
          nextPose();
        }
      }

      if (state === 'running') {
        var ampFactor = 0.55 + 0.45 * speedFactor;
        runPhase += dt * 8 * speedFactor;
        applyRunPose(refs, runPhase, ampFactor);
        refs.character.removeAttribute('transform');
      } else {
        var elapsed = (now - poseStart) / 1000;
        if (elapsed > poseDuration) { nextPose(); elapsed = 0; }
        var pose = IDLE_POSES[poseIndex].fn(refs, elapsed);
        refs.character.setAttribute(
          'transform',
          'translate(' + (pose.tx || 0).toFixed(1) + ' ' + (pose.ty || 0).toFixed(1) + ') ' +
          'rotate(' + (pose.rot || 0).toFixed(1) + ' 28 40)'
        );
      }

      var tilt = state === 'running' ? Math.max(-8, Math.min(8, dx / 36)) : 0;
      wrap.style.transform =
        'translate3d(' + posX.toFixed(1) + 'px,' + posY.toFixed(1) + 'px,0) ' +
        'translate(-50%,-50%) ' +
        'rotateZ(' + tilt.toFixed(1) + 'deg) ' +
        'scaleX(' + lastDirX + ')';

      requestAnimationFrame(loop);
    }
    nextPose();
    requestAnimationFrame(loop);
  }

  /* ---------- Сидящие маскоты на углах карточек ---------- */
  function initCornerMascot() {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var SELECTOR = [
      '.section-card', '.case-card', '.project-card', '.feature-card',
      '.tech-item', '.psr-box', '.skill-category', '.offer-card',
      '.who-item', '.process-step', '.stat-card', '.showcase-stat',
      '.ai-terminal', '.gallery-item', '.about-content', '.cta-box'
    ].join(',');

    var wrap = document.createElement('div');
    wrap.className = 'moi-corner-mascot';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = mascotSvgMarkup();
    document.body.appendChild(wrap);
    var refs = getMascotRefs(wrap);

    var currentEl = null;
    var corner = 'tr'; // 'tr' | 'tl'
    var sitStart = performance.now();
    var lastFrameT = performance.now();
    var visibleSince = 0;
    var stayMs = 0;
    var nextSwitchAt = 0;
    var actionIndex = 0;
    var actionStart = performance.now();
    var actionDuration = 2.5;

    function findCandidates() {
      var els = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
      var vh = window.innerHeight, vw = window.innerWidth;
      var out = [];
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        var r = el.getBoundingClientRect();
        if (r.width < 90 || r.height < 60) continue;
        // должен иметь видимый верх в окне
        if (r.top < 30 || r.top > vh - 80) continue;
        if (r.right < 60 || r.left > vw - 60) continue;
        var st = window.getComputedStyle(el);
        if (st.visibility === 'hidden' || st.display === 'none') continue;
        out.push(el);
      }
      return out;
    }

    function pickNew() {
      var candidates = findCandidates();
      if (!candidates.length) {
        currentEl = null;
        wrap.classList.remove('is-visible');
        nextSwitchAt = performance.now() + 1500;
        return;
      }
      // Стараемся не повторять последний блок
      var pool = candidates.length > 1
        ? candidates.filter(function (e) { return e !== currentEl; })
        : candidates;
      currentEl = pool[Math.floor(Math.random() * pool.length)];
      corner = Math.random() > 0.5 ? 'tr' : 'tl';
      sitStart = performance.now();
      visibleSince = sitStart;
      stayMs = 4500 + Math.random() * 3500; // 4.5–8 с на одном месте
      nextSwitchAt = sitStart + stayMs;
      actionIndex = Math.floor(Math.random() * SIT_ACTIONS.length);
      actionStart = sitStart;
      actionDuration = SIT_ACTIONS[actionIndex].duration;
      // плавное появление
      requestAnimationFrame(function () { wrap.classList.add('is-visible'); });
    }

    // Поза «сидит на углу»: ноги свисают вниз, тело прямое, руки могут менять движение.
    // Корни поз ниже задают плечи/локти/бёдра/колени, базовая поза задаёт ноги.
    function applySitBase(refs) {
      // ноги свисают вниз, слегка покачиваются — задаётся позой
      setRot(refs.thighL, -2, HINGES.hipL);
      setRot(refs.thighR, 2, HINGES.hipR);
      setRot(refs.shinL, 18, HINGES.kneeL);
      setRot(refs.shinR, 18, HINGES.kneeR);
      // руки слегка вниз
      setRot(refs.uArmL, -12, HINGES.shoulderL);
      setRot(refs.uArmR, 12, HINGES.shoulderR);
      setRot(refs.fArmL, -10, HINGES.elbowL);
      setRot(refs.fArmR, 10, HINGES.elbowR);
    }
    function sitSwingLegs(refs, t) {
      applySitBase(refs);
      var s = Math.sin(t * 3);
      var s2 = Math.sin(t * 3 + Math.PI);
      setRot(refs.thighL, -6 + 6 * s, HINGES.hipL);
      setRot(refs.thighR,  6 + 6 * s2, HINGES.hipR);
      setRot(refs.shinL, 22 + 18 * s, HINGES.kneeL);
      setRot(refs.shinR, 22 + 18 * s2, HINGES.kneeR);
      return { tx: 0, ty: -1 * Math.sin(t * 1.5), rot: 0 };
    }
    function sitWaveR(refs, t) {
      applySitBase(refs);
      var s = Math.sin(t * 5);
      setRot(refs.uArmR, 130, HINGES.shoulderR);
      setRot(refs.fArmR, 30 + 25 * s, HINGES.elbowR);
      var s2 = Math.sin(t * 2);
      setRot(refs.thighL, -4 + 4 * s2, HINGES.hipL);
      setRot(refs.thighR,  4 - 4 * s2, HINGES.hipR);
      return { tx: 0, ty: 0, rot: 0 };
    }
    function sitWaveL(refs, t) {
      applySitBase(refs);
      var s = Math.sin(t * 5);
      setRot(refs.uArmL, -130, HINGES.shoulderL);
      setRot(refs.fArmL, -30 - 25 * s, HINGES.elbowL);
      var s2 = Math.sin(t * 2);
      setRot(refs.thighL, -4 + 4 * s2, HINGES.hipL);
      setRot(refs.thighR,  4 - 4 * s2, HINGES.hipR);
      return { tx: 0, ty: 0, rot: 0 };
    }
    function sitLookAround(refs, t) {
      applySitBase(refs);
      var s = Math.sin(t * 1.4);
      setRot(refs.uArmL, -15, HINGES.shoulderL);
      setRot(refs.uArmR,  15, HINGES.shoulderR);
      var s2 = Math.sin(t * 2);
      setRot(refs.thighL, -3 + 5 * s2, HINGES.hipL);
      setRot(refs.thighR,  3 + 5 * s2, HINGES.hipR);
      setRot(refs.shinL, 22 + 6 * s2, HINGES.kneeL);
      setRot(refs.shinR, 22 - 6 * s2, HINGES.kneeR);
      return { tx: 0, ty: 0, rot: 6 * s };
    }
    function sitClap(refs, t) {
      applySitBase(refs);
      var s = Math.sin(t * 6);
      var ang = 70 + 25 * s;
      setRot(refs.uArmL, -ang, HINGES.shoulderL);
      setRot(refs.uArmR,  ang, HINGES.shoulderR);
      setRot(refs.fArmL, -45, HINGES.elbowL);
      setRot(refs.fArmR,  45, HINGES.elbowR);
      return { tx: 0, ty: -1 * Math.abs(s), rot: 0 };
    }
    function sitKick(refs, t) {
      applySitBase(refs);
      var s = Math.sin(t * 2.4);
      setRot(refs.thighL, -10 - 10 * s, HINGES.hipL);
      setRot(refs.thighR, 10 + 10 * s, HINGES.hipR);
      setRot(refs.shinL, 5 - 25 * s, HINGES.kneeL);
      setRot(refs.shinR, 5 - 25 * s, HINGES.kneeR);
      return { tx: 0, ty: 0, rot: 0 };
    }
    function sitArmsUp(refs, t) {
      applySitBase(refs);
      var s = Math.sin(t * 2);
      setRot(refs.uArmL, -150 + 8 * s, HINGES.shoulderL);
      setRot(refs.uArmR,  150 - 8 * s, HINGES.shoulderR);
      return { tx: 0, ty: 0, rot: 0 };
    }
    function sitBreathe(refs, t) {
      applySitBase(refs);
      var s = Math.sin(t * 1.2);
      return { tx: 0, ty: -1.5 * s, rot: 0 };
    }

    var SIT_ACTIONS = [
      { fn: sitSwingLegs,  duration: 3.2 },
      { fn: sitWaveR,      duration: 2.4 },
      { fn: sitWaveL,      duration: 2.4 },
      { fn: sitLookAround, duration: 2.8 },
      { fn: sitClap,       duration: 2.0 },
      { fn: sitKick,       duration: 2.4 },
      { fn: sitArmsUp,     duration: 2.2 },
      { fn: sitBreathe,    duration: 3.0 }
    ];

    function loop() {
      var now = performance.now();
      lastFrameT = now;

      if (!currentEl || now > nextSwitchAt) {
        if (currentEl) {
          // плавно скрыть, потом выбрать нового
          wrap.classList.remove('is-visible');
          var prev = currentEl;
          currentEl = null;
          setTimeout(function () {
            if (currentEl !== prev) pickNew();
          }, 320);
        } else {
          pickNew();
        }
      }

      if (currentEl) {
        // Если блок исчез/уехал из вьюпорта — переключиться раньше
        var r = currentEl.getBoundingClientRect();
        var vh = window.innerHeight, vw = window.innerWidth;
        if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) {
          nextSwitchAt = now; // сразу перевыбрать
        }

        // Применяем сидячую позу
        var elapsed = (now - actionStart) / 1000;
        if (elapsed > actionDuration) {
          var ni;
          do { ni = Math.floor(Math.random() * SIT_ACTIONS.length); }
          while (ni === actionIndex && SIT_ACTIONS.length > 1);
          actionIndex = ni;
          actionStart = now;
          actionDuration = SIT_ACTIONS[actionIndex].duration;
          elapsed = 0;
        }
        var pose = SIT_ACTIONS[actionIndex].fn(refs, elapsed);

        var rot = pose.rot || 0;
        // Применяем translate в svg-координатах
        refs.character.setAttribute(
          'transform',
          'translate(' + (pose.tx || 0).toFixed(1) + ' ' + (pose.ty || 0).toFixed(1) + ') ' +
          'rotate(' + rot.toFixed(1) + ' 28 40)'
        );

        // Сидим на углу: ноги ниже края, корпус выше.
        // Wrap 30x40, transform-origin центр; смещаем так, чтобы попа была на углу.
        var px, py, sx;
        if (corner === 'tr') {
          px = r.right - 4;
          py = r.top + 6;
          sx = -1; // смотрит влево (внутрь карточки)
        } else {
          px = r.left + 4;
          py = r.top + 6;
          sx = 1; // смотрит вправо (внутрь карточки)
        }
        wrap.style.transform =
          'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0) ' +
          'translate(-50%,-65%) ' +
          'scaleX(' + sx + ')';
      }

      requestAnimationFrame(loop);
    }
    // Первый запуск с задержкой чтобы DOM/AOS успели разметиться
    setTimeout(function () {
      pickNew();
      requestAnimationFrame(loop);
    }, 800);
  }

  /* ---------- Init ---------- */
  initTheme();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      buildThemeToggle();
      initTerminal();
      initMascot();
      initCornerMascot();
    });
  } else {
    buildThemeToggle();
    initTerminal();
    initMascot();
    initCornerMascot();
  }
})();
