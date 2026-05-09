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

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { start(); io.disconnect(); }
        });
      }, { threshold: 0.2 });
      io.observe(term);
    } else { start(); }
  }

  /* ---------- Mascot: SVG, шарниры, общие хелперы ---------- */
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

  // Поза = объект целевых углов суставов + transform корпуса.
  // Главный loop делает lerp от текущего state к target — это убирает «щёлканье».
  var JOINT_NAMES = ['uArmL','fArmL','uArmR','fArmR','thighL','shinL','thighR','shinR'];
  function makePoseState() {
    return {
      uArmL: 0, fArmL: 0, uArmR: 0, fArmR: 0,
      thighL: 0, shinL: 5, thighR: 0, shinR: 5,
      tx: 0, ty: 0, rot: 0
    };
  }
  function lerpPose(state, target, k) {
    for (var i = 0; i < JOINT_NAMES.length; i++) {
      var n = JOINT_NAMES[i];
      state[n] += (target[n] - state[n]) * k;
    }
    state.tx  += (target.tx  - state.tx)  * k;
    state.ty  += (target.ty  - state.ty)  * k;
    state.rot += (target.rot - state.rot) * k;
  }
  function applyPoseState(refs, state) {
    setRot(refs.uArmL,  state.uArmL,  HINGES.shoulderL);
    setRot(refs.fArmL,  state.fArmL,  HINGES.elbowL);
    setRot(refs.uArmR,  state.uArmR,  HINGES.shoulderR);
    setRot(refs.fArmR,  state.fArmR,  HINGES.elbowR);
    setRot(refs.thighL, state.thighL, HINGES.hipL);
    setRot(refs.shinL,  state.shinL,  HINGES.kneeL);
    setRot(refs.thighR, state.thighR, HINGES.hipR);
    setRot(refs.shinR,  state.shinR,  HINGES.kneeR);
    refs.character.setAttribute(
      'transform',
      'translate(' + state.tx.toFixed(2) + ' ' + state.ty.toFixed(2) + ') ' +
      'rotate(' + state.rot.toFixed(2) + ' 28 40)'
    );
  }

  /* ---------- IDLE-позы для стоящего маскота: спокойные, амплитуды небольшие ---------- */
  function poseSwayBreathe(t) {
    var s = Math.sin(t * 1.2);
    return {
      uArmL: -8 + 4*s,  fArmL: -12 - 3*s,
      uArmR:  8 - 4*s,  fArmR:  12 + 3*s,
      thighL: 0, shinL: 5, thighR: 0, shinR: 5,
      tx: 0, ty: -1.2*s, rot: 0
    };
  }
  function poseHandsOnHips(t) {
    var s = Math.sin(t * 1.0);
    return {
      uArmL: -50, fArmL: -100,
      uArmR:  50, fArmR:  100,
      thighL: 3*s, shinL: 7, thighR: -3*s, shinR: 7,
      tx: 1.5*s, ty: 0, rot: 1*s
    };
  }
  function poseArmsSide(t) {
    var s = Math.sin(t * 1.4);
    return {
      uArmL: -85 + 4*s, fArmL: -10,
      uArmR:  85 - 4*s, fArmR:  10,
      thighL: 0, shinL: 6, thighR: 0, shinR: 6,
      tx: 0, ty: -0.8*s, rot: 0
    };
  }
  function poseStretchUp(t) {
    var s = Math.sin(t * 1.0);
    return {
      uArmL: -135 + 4*s, fArmL: -10,
      uArmR:  135 - 4*s, fArmR:  10,
      thighL: 0, shinL: 4, thighR: 0, shinR: 4,
      tx: 0, ty: -1.5 - 0.5*s, rot: 0
    };
  }
  function poseWaveRight(t) {
    var s = Math.sin(t * 4);
    return {
      uArmL: -10, fArmL: -15,
      uArmR: 125, fArmR: 20 + 18*s,
      thighL: 0, shinL: 6, thighR: 0, shinR: 6,
      tx: 0, ty: 0, rot: 0
    };
  }
  function poseWaveLeft(t) {
    var s = Math.sin(t * 4);
    return {
      uArmL: -125, fArmL: -20 - 18*s,
      uArmR: 10, fArmR: 15,
      thighL: 0, shinL: 6, thighR: 0, shinR: 6,
      tx: 0, ty: 0, rot: 0
    };
  }
  function poseThink(t) {
    var s = Math.sin(t * 1.2);
    return {
      uArmL: -35, fArmL: -130,
      uArmR:  10, fArmR:  20,
      thighL: 0, shinL: 7, thighR: 0, shinR: 7,
      tx: 0, ty: 0, rot: 3 + 1.5*s
    };
  }
  function poseLeanLeft(t) {
    var s = Math.sin(t * 1.2);
    return {
      uArmL: -25 + 3*s, fArmL: -22,
      uArmR:  25 - 3*s, fArmR:  22,
      thighL: 0, shinL: 7, thighR: 0, shinR: 7,
      tx: -2.5, ty: 0, rot: -7 + 1.5*s
    };
  }
  function poseLeanRight(t) {
    var s = Math.sin(t * 1.2);
    return {
      uArmL: -25 + 3*s, fArmL: -22,
      uArmR:  25 - 3*s, fArmR:  22,
      thighL: 0, shinL: 7, thighR: 0, shinR: 7,
      tx: 2.5, ty: 0, rot: 7 - 1.5*s
    };
  }
  function poseSquats(t) {
    // Плавные приседания: тело реально опускается, голова идёт ниже
    var phase = (Math.sin(t * 1.6 - Math.PI/2) + 1) / 2; // 0..1
    return {
      uArmL: -90 - 20*phase, fArmL: -10,
      uArmR:  90 + 20*phase, fArmR:  10,
      thighL: -18*phase, shinL: 22 + 32*phase,
      thighR:  18*phase, shinR: 22 + 32*phase,
      tx: 0, ty: 11*phase, rot: 0
    };
  }
  function poseTipToe(t) {
    var s = Math.sin(t * 1.3);
    var lift = 0.5 + 0.5 * s;
    return {
      uArmL: -25 - 8*lift, fArmL: -25,
      uArmR:  25 + 8*lift, fArmR:  25,
      thighL: 0, shinL: 5, thighR: 0, shinR: 5,
      tx: 0, ty: -3*lift, rot: 0
    };
  }
  function poseShrug(t) {
    var s = Math.sin(t * 1.4);
    return {
      uArmL: -90 + 4*s, fArmL: -100,
      uArmR:  90 - 4*s, fArmR:  100,
      thighL: 0, shinL: 6, thighR: 0, shinR: 6,
      tx: 0, ty: -2.5 - 0.6*s, rot: 0
    };
  }
  function poseLookAround(t) {
    var s = Math.sin(t * 0.9);
    return {
      uArmL: -15, fArmL: -12,
      uArmR:  15, fArmR:  12,
      thighL: 0, shinL: 5, thighR: 0, shinR: 5,
      tx: 0, ty: 0, rot: 6*s
    };
  }
  function poseSidestep(t) {
    var s = Math.sin(t * 1.6);
    return {
      uArmL: -22 + 8*s, fArmL: -22,
      uArmR:  22 - 8*s, fArmR:  22,
      thighL: 5*s, shinL: 10 + 4*s,
      thighR: -5*s, shinR: 10 - 4*s,
      tx: 4*s, ty: -0.4*Math.abs(s), rot: 0
    };
  }
  function poseStretchSide(t) {
    var s = Math.sin(t * 1.0);
    return {
      uArmL: -130, fArmL: -10,
      uArmR:  35, fArmR:  20,
      thighL: 0, shinL: 5, thighR: 0, shinR: 5,
      tx: 3*s, ty: 0, rot: 8*s
    };
  }
  function poseTapFoot(t) {
    var s = Math.sin(t * 4);
    return {
      uArmL: -25, fArmL: -25,
      uArmR:  25, fArmR:  25,
      thighL: 0, shinL: 6,
      thighR: -6 + 6*s, shinR: 25 + 12*s,
      tx: 0, ty: 0, rot: 0
    };
  }
  function poseGroove(t) {
    var s = Math.sin(t * 2.0);
    var s2 = Math.sin(t * 2.0 + Math.PI/2);
    return {
      uArmL: -35 - 18*s, fArmL: -25 - 12*s2,
      uArmR:  35 + 18*s, fArmR:  25 + 12*s2,
      thighL: 4*s, shinL: 14 + 6*s2,
      thighR: -4*s, shinR: 14 - 6*s2,
      tx: 2*s, ty: 0, rot: 1.5*s
    };
  }
  function poseSalute(t) {
    var s = Math.sin(t * 1.6);
    return {
      uArmL: -25, fArmL: -25,
      uArmR: 90 + 3*s, fArmR: 100,
      thighL: 0, shinL: 5, thighR: 0, shinR: 5,
      tx: 0, ty: 0, rot: 0
    };
  }
  function poseClapSoft(t) {
    var s = Math.sin(t * 4);
    var ang = 60 + 18*s;
    return {
      uArmL: -ang, fArmL: -45,
      uArmR:  ang, fArmR:  45,
      thighL: 0, shinL: 6 + 2*Math.abs(s), thighR: 0, shinR: 6 + 2*Math.abs(s),
      tx: 0, ty: -0.6*Math.abs(s), rot: 0
    };
  }
  function poseDeepBreath(t) {
    var s = Math.sin(t * 0.9);
    return {
      uArmL: -40 - 30*s, fArmL: -25,
      uArmR:  40 + 30*s, fArmR:  25,
      thighL: 0, shinL: 5, thighR: 0, shinR: 5,
      tx: 0, ty: -1 - 0.8*s, rot: 0
    };
  }

  var IDLE_POSES = [
    { fn: poseSwayBreathe,  duration: 4.5 },
    { fn: poseHandsOnHips,  duration: 4.0 },
    { fn: poseArmsSide,     duration: 3.8 },
    { fn: poseStretchUp,    duration: 4.0 },
    { fn: poseWaveRight,    duration: 3.0 },
    { fn: poseWaveLeft,     duration: 3.0 },
    { fn: poseThink,        duration: 4.5 },
    { fn: poseLeanLeft,     duration: 3.5 },
    { fn: poseLeanRight,    duration: 3.5 },
    { fn: poseSquats,       duration: 5.0 },
    { fn: poseTipToe,       duration: 3.5 },
    { fn: poseShrug,        duration: 3.5 },
    { fn: poseLookAround,   duration: 3.8 },
    { fn: poseSidestep,     duration: 3.8 },
    { fn: poseStretchSide,  duration: 4.0 },
    { fn: poseTapFoot,      duration: 3.5 },
    { fn: poseGroove,       duration: 4.0 },
    { fn: poseSalute,       duration: 3.0 },
    { fn: poseClapSoft,     duration: 3.0 },
    { fn: poseDeepBreath,   duration: 4.5 }
  ];

  // Поза бега как target — чтобы быть совместимой с lerpPose-системой.
  function buildRunTarget(runPhase, ampFactor) {
    var s = Math.sin(runPhase);
    var c = Math.cos(runPhase);
    return {
      thighL:  35 * s * ampFactor,
      thighR: -35 * s * ampFactor,
      shinL:  Math.max(0, -50 * c) * ampFactor + 10,
      shinR:  Math.max(0,  50 * c) * ampFactor + 10,
      uArmL: -40 * s * ampFactor,
      uArmR:  40 * s * ampFactor,
      fArmL: -55 - 15 * s * ampFactor,
      fArmR:  55 + 15 * s * ampFactor,
      tx: 0, ty: 0, rot: 0
    };
  }

  /* ---------- Курсорный маскот ---------- */
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
    var poseState = makePoseState();

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var posX = mouseX - 40, posY = mouseY;
    var lastDirX = 1;
    var state = 'idle';
    var poseIndex = -1;
    var poseStart = performance.now();
    var poseDuration = 4;

    var TARGET_OFFSET_X = -34; // слева от курсора
    var TARGET_OFFSET_Y = 0;

    var MAX_SPEED = 720;            // px/s — медленнее, чтобы видно ноги
    var WALK_SPEED_FACTOR = 0.15;   // 15% — финальный шаг
    var RUN_DIST = 280;
    var WALK_DIST = 28;
    var SNAP_DIST = 4;

    function onMove(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
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

      // ease-out замедление: быстро падает на дальних → плавно у цели
      var speedFactor;
      if (dist > RUN_DIST) {
        speedFactor = 1.0;
      } else if (dist > WALK_DIST) {
        var k = (dist - WALK_DIST) / (RUN_DIST - WALK_DIST);
        var ease = 1 - (1 - k) * (1 - k); // easeOutQuad
        speedFactor = WALK_SPEED_FACTOR + (1 - WALK_SPEED_FACTOR) * ease;
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
          lastDirX = 1; // в idle всегда смотрит на курсор
          poseIndex = -1;
          nextPose();
        }
      }

      if (state === 'running') {
        // частота шагов с минимумом — на самом медленном шаге всё равно видно работу ног
        var stepFreq = Math.max(0.55, speedFactor);
        runPhase += dt * 7 * stepFreq;
        var ampFactor = 0.7 + 0.3 * speedFactor;
        var runTarget = buildRunTarget(runPhase, ampFactor);
        lerpPose(poseState, runTarget, 0.45);
      } else {
        var elapsed = (now - poseStart) / 1000;
        if (elapsed > poseDuration) { nextPose(); elapsed = 0; }
        var poseTarget = IDLE_POSES[poseIndex].fn(elapsed);
        lerpPose(poseState, poseTarget, 0.10); // плавный переход idle-поз
      }
      applyPoseState(refs, poseState);

      var tilt = state === 'running' ? Math.max(-6, Math.min(6, dx / 50)) : 0;
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

  /* ---------- Сидячие позы (для corner mascot) ----------
     Сидит на углу свесив ноги: бёдра идут горизонтально вперёд, голени свисают вниз.
     thighL ≈ -100°, shinL ≈ +90° (через родителя получается голень вертикально вниз).
     thighR ≈ -72°,  shinR ≈ +82°. Маленькие колебания накладываются на эту базу. */
  function sitBaseTarget() {
    return {
      uArmL: -25, fArmL: -50,
      uArmR:  25, fArmR:  50,
      thighL: -100, shinL: 90,
      thighR:  -72, shinR: 82,
      tx: 0, ty: 0, rot: 0
    };
  }
  function sitSwingLegs(t) {
    var s  = Math.sin(t * 2.4);
    var s2 = Math.sin(t * 2.4 + Math.PI * 0.7);
    var b = sitBaseTarget();
    b.shinL = 90 + 22 * s;
    b.shinR = 82 + 22 * s2;
    b.uArmL = -25 + 5 * s;
    b.uArmR =  25 + 5 * s2;
    b.ty = -0.6 * Math.sin(t * 1.2);
    return b;
  }
  function sitTapHands(t) {
    var s = Math.sin(t * 3);
    var b = sitBaseTarget();
    b.fArmL = -50 - 25 * s;
    b.fArmR =  50 + 25 * s;
    b.shinL = 90 + 12 * Math.sin(t * 1.5);
    b.shinR = 82 + 12 * Math.sin(t * 1.5 + Math.PI);
    return b;
  }
  function sitLookAround(t) {
    var s = Math.sin(t * 0.8);
    var b = sitBaseTarget();
    b.shinL = 90 + 10 * Math.sin(t * 1.6);
    b.shinR = 82 + 10 * Math.sin(t * 1.6 + Math.PI);
    b.rot = 5 * s;
    return b;
  }
  function sitWaveR(t) {
    var s = Math.sin(t * 4);
    var b = sitBaseTarget();
    b.uArmR = 110;
    b.fArmR = 30 + 22 * s;
    b.shinL = 90 + 10 * Math.sin(t * 1.6);
    b.shinR = 82 + 10 * Math.sin(t * 1.6 + Math.PI);
    return b;
  }
  function sitWaveL(t) {
    var s = Math.sin(t * 4);
    var b = sitBaseTarget();
    b.uArmL = -110;
    b.fArmL = -30 - 22 * s;
    b.shinL = 90 + 10 * Math.sin(t * 1.6);
    b.shinR = 82 + 10 * Math.sin(t * 1.6 + Math.PI);
    return b;
  }
  function sitArmsUp(t) {
    var s = Math.sin(t * 1.2);
    var b = sitBaseTarget();
    b.uArmL = -135 + 5*s;
    b.uArmR =  135 - 5*s;
    b.fArmL = -10;
    b.fArmR =  10;
    return b;
  }
  function sitBreathe(t) {
    var s = Math.sin(t * 1.0);
    var b = sitBaseTarget();
    b.shinL = 90 + 6 * Math.sin(t * 1.4);
    b.shinR = 82 + 6 * Math.sin(t * 1.4 + Math.PI);
    b.ty = -1 * s;
    return b;
  }

  var SIT_ACTIONS = [
    { fn: sitSwingLegs,  duration: 5.0 },
    { fn: sitWaveR,      duration: 3.0 },
    { fn: sitWaveL,      duration: 3.0 },
    { fn: sitTapHands,   duration: 3.5 },
    { fn: sitLookAround, duration: 4.0 },
    { fn: sitArmsUp,     duration: 3.0 },
    { fn: sitBreathe,    duration: 4.0 }
  ];

  /* ---------- Сидящий маскот: сидит на правом верхнем углу, переходит по параболе ---------- */
  function initCornerMascot() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Карточки + кнопки/ссылки — везде, где есть угол. Высокий приоритет: маскот будет
    // садиться и на CTA-кнопки, и на пункты в контактах, не только на «облачка».
    var SELECTOR = [
      '.section-card', '.case-card', '.project-card', '.feature-card',
      '.tech-item', '.psr-box', '.skill-category', '.offer-card',
      '.who-item', '.process-step', '.stat-card', '.showcase-stat',
      '.ai-terminal', '.gallery-item', '.about-content', '.cta-box',
      '.btn', '.btn-secondary', '.btn-white',
      '.social-link', '.filter-btn', '.offer-cta', '.quick-route'
    ].join(',');

    var wrap = document.createElement('div');
    wrap.className = 'moi-corner-mascot';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = mascotSvgMarkup();
    document.body.appendChild(wrap);
    var refs = getMascotRefs(wrap);
    var poseState = makePoseState();
    var sb = sitBaseTarget();
    poseState.thighL = sb.thighL; poseState.thighR = sb.thighR;
    poseState.shinL  = sb.shinL;  poseState.shinR  = sb.shinR;
    poseState.uArmL  = sb.uArmL;  poseState.uArmR  = sb.uArmR;
    poseState.fArmL  = sb.fArmL;  poseState.fArmR  = sb.fArmR;

    var state = 'idle';   // 'idle' | 'sitting' | 'walking'
    var currentEl = null;
    var currentCorner = 'tr';   // 'tr' | 'tl' — на какой угол сел
    var nextEl = null;
    var nextCorner = 'tr';
    var nextSwitchAt = 0;
    var actionIndex = -1;
    var actionStart = performance.now();
    var actionDuration = 3;

    // Walking
    var walkStart = 0;
    var walkDuration = 1.4;
    var walkStartX = 0, walkStartY = 0;
    var walkApex = 80;
    var walkRunPhase = 0;
    var walkDirX = 1;

    function findCandidates() {
      var els = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
      var vh = window.innerHeight, vw = window.innerWidth;
      var out = [];
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        var r = el.getBoundingClientRect();
        // Кнопки могут быть невысокие → 32 px достаточно
        if (r.width < 80 || r.height < 32) continue;
        if (r.top < 30 || r.top > vh - 60) continue;
        if (r.right < 60 || r.left > vw - 60) continue;
        var st = window.getComputedStyle(el);
        if (st.visibility === 'hidden' || st.display === 'none') continue;
        out.push(el);
      }
      return out;
    }

    function nextAction() {
      var idx;
      do { idx = Math.floor(Math.random() * SIT_ACTIONS.length); }
      while (idx === actionIndex && SIT_ACTIONS.length > 1);
      actionIndex = idx;
      actionStart = performance.now();
      actionDuration = SIT_ACTIONS[idx].duration;
    }

    function rectAnchor(el, corner) {
      var r = el.getBoundingClientRect();
      if (corner === 'tl') return { x: r.left, y: r.top };
      return { x: r.right, y: r.top };
    }

    function startWalkTo(el, corner) {
      var fromX, fromY;
      if (currentEl) {
        var a = rectAnchor(currentEl, currentCorner);
        fromX = a.x; fromY = a.y;
      } else {
        // Первое появление: «прибегает» из-за края экрана со стороны цели
        fromX = corner === 'tl' ? -40 : window.innerWidth + 40;
        fromY = Math.min(window.innerHeight * 0.35, 200);
      }
      var to = rectAnchor(el, corner);
      walkStartX = fromX;
      walkStartY = fromY;
      var dx = to.x - fromX;
      var dy = to.y - fromY;
      var dist = Math.hypot(dx, dy);
      walkApex = Math.max(60, Math.min(180, dist * 0.32 + Math.abs(dy) * 0.18 + 30));
      walkDuration = 0.9 + Math.min(2.0, dist / 700);
      walkStart = performance.now();
      walkDirX = dx >= 0 ? 1 : -1;
      walkRunPhase = 0;
      nextEl = el;
      nextCorner = corner;
      currentEl = null;
      state = 'walking';
      wrap.classList.add('is-visible');
    }

    function settleOn(el, corner) {
      currentEl = el;
      currentCorner = corner;
      nextEl = null;
      state = 'sitting';
      nextSwitchAt = performance.now() + 18000 + Math.random() * 18000;
      nextAction();
    }

    function chooseTarget() {
      var candidates = findCandidates();
      if (!candidates.length) return null;
      var pool = candidates.length > 1
        ? candidates.filter(function (e) { return e !== currentEl; })
        : candidates;
      return {
        el: pool[Math.floor(Math.random() * pool.length)],
        corner: Math.random() < 0.5 ? 'tr' : 'tl'
      };
    }

    function tryTransition() {
      var target = chooseTarget();
      if (!target) {
        nextSwitchAt = performance.now() + 5000;
        return;
      }
      startWalkTo(target.el, target.corner);
    }

    var lastFrameT = performance.now();

    function loop() {
      var now = performance.now();
      var dt = Math.min(0.05, (now - lastFrameT) / 1000);
      lastFrameT = now;

      // Триггер смены места — только если сидим
      if (state === 'sitting' && now > nextSwitchAt) {
        tryTransition();
      }
      // Если ещё не появлялись — выберем первое место
      if (state === 'idle') {
        tryTransition();
      }

      if (state === 'walking' && nextEl) {
        var to = rectAnchor(nextEl, nextCorner);
        var t = (now - walkStart) / (walkDuration * 1000);
        if (t >= 1) {
          var sxLand = nextCorner === 'tl' ? -1 : 1;
          wrap.style.transform =
            'translate3d(' + to.x.toFixed(1) + 'px,' + to.y.toFixed(1) + 'px,0) ' +
            'translate(-50%,-54%) scaleX(' + sxLand + ')';
          settleOn(nextEl, nextCorner);
        } else {
          var easeT = t * t * (3 - 2 * t);
          var posX_ = walkStartX + (to.x - walkStartX) * easeT;
          var posY_ = walkStartY + (to.y - walkStartY) * easeT;
          posY_ -= walkApex * 4 * t * (1 - t);

          walkRunPhase += dt * 7.5;
          var runT = buildRunTarget(walkRunPhase, 0.95);
          lerpPose(poseState, runT, 0.45);
          applyPoseState(refs, poseState);

          wrap.style.transform =
            'translate3d(' + posX_.toFixed(1) + 'px,' + posY_.toFixed(1) + 'px,0) ' +
            'translate(-50%,-54%) ' +
            'scaleX(' + walkDirX + ')';
        }
      } else if (state === 'sitting' && currentEl) {
        var rc = currentEl.getBoundingClientRect();
        var vh = window.innerHeight, vw = window.innerWidth;
        if (rc.bottom < 0 || rc.top > vh || rc.right < 0 || rc.left > vw) {
          nextSwitchAt = now;
        }

        var elapsed = (now - actionStart) / 1000;
        if (elapsed > actionDuration) { nextAction(); elapsed = 0; }
        var target = SIT_ACTIONS[actionIndex].fn(elapsed);
        lerpPose(poseState, target, 0.10);
        applyPoseState(refs, poseState);

        var px = currentCorner === 'tl' ? rc.left : rc.right;
        var sx = currentCorner === 'tl' ? -1 : 1;
        wrap.style.transform =
          'translate3d(' + px.toFixed(1) + 'px,' + rc.top.toFixed(1) + 'px,0) ' +
          'translate(-50%,-54%) scaleX(' + sx + ')';
      }

      requestAnimationFrame(loop);
    }

    setTimeout(function () {
      requestAnimationFrame(loop);
    }, 800);
  }

  /* ---------- Прогресс-бар: переносим внутрь шапки ----------
     В исходных HTML #progress-bar лежит сразу за <body> на самом верху.
     Из-за этого в светлой теме между прогрессом и текстом шапки видна
     белая полоса. Перемещаем его внутрь <header> — теперь он на нижней
     кромке шапки и «лежит» на её градиенте. */
  function relocateProgressBar() {
    var bar = document.getElementById('progress-bar');
    var header = document.querySelector('header');
    if (!bar || !header) return;
    if (bar.parentElement === header) return;
    header.appendChild(bar);
  }

  /* ---------- Mobile nav: бургер + выезжающая панель ---------- */
  function setupMobileNav() {
    var nav = document.querySelector('header nav');
    if (!nav || nav.querySelector('.nav-burger')) return;
    var navLinks = nav.querySelector('.nav-links');

    // Клон большой CTA «Связаться» в выезжающее меню
    var origCta = nav.querySelector(':scope > a.btn');
    if (origCta && navLinks && !navLinks.querySelector('.nav-cta-mobile')) {
      var li = document.createElement('li');
      li.className = 'nav-cta-mobile-li';
      var ctaClone = origCta.cloneNode(true);
      ctaClone.className = 'nav-cta-mobile';
      li.appendChild(ctaClone);
      navLinks.appendChild(li);
    }

    var burger = document.createElement('button');
    burger.type = 'button';
    burger.className = 'nav-burger';
    burger.setAttribute('aria-label', 'Меню');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '<span></span><span></span><span></span>';
    nav.appendChild(burger);

    function close() {
      nav.classList.remove('is-open');
      document.body.classList.remove('nav-open');
      burger.setAttribute('aria-expanded', 'false');
    }
    function open() {
      updateHeaderHeight();
      nav.classList.add('is-open');
      document.body.classList.add('nav-open');
      burger.setAttribute('aria-expanded', 'true');
    }
    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (nav.classList.contains('is-open')) close(); else open();
    });

    if (navLinks) {
      navLinks.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', close);
      });
    }
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target)) return;
      close();
    });
    window.addEventListener('resize', function () {
      updateHeaderHeight();
      if (window.innerWidth > 768 && nav.classList.contains('is-open')) close();
    });

    function updateHeaderHeight() {
      var header = document.querySelector('header');
      if (!header) return;
      var h = header.offsetHeight;
      if (h > 0) document.documentElement.style.setProperty('--moi-header-h', h + 'px');
    }
    updateHeaderHeight();
    window.addEventListener('load', updateHeaderHeight);
  }

  /* ---------- Init ---------- */
  initTheme();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      relocateProgressBar();
      buildThemeToggle();
      setupMobileNav();
      initTerminal();
      initMascot();
      initCornerMascot();
    });
  } else {
    relocateProgressBar();
    buildThemeToggle();
    setupMobileNav();
    initTerminal();
    initMascot();
    initCornerMascot();
  }
})();
