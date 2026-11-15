/* ============================================
   js/fx.js — Pixel effects layer
   ─────────────────────────────────────────
   Everything drawn here snaps to a 6px grid so it reads as pixels.

   What it does:
     • Clicks react to WHAT was clicked (see KINDS below).
     • Clicking empty space leaves a small generated pixel sprite.
     • Page changes use a mosaic wipe.
     • A cursor readout names the thing under the pointer.
     • Titles marked data-scramble "decrypt" on hover.
     • The hero name is a grid of pixels that the cursor pushes around.

   All of it is off when the visitor prefers reduced motion,
   or after they press the "Effects" button (remembered per browser).
   ============================================ */

const FX = (function () {
  'use strict';

  const G = 6;                                   // grid size in CSS px
  const COL = { m: '#ff2a6d', c: '#05d9e8', y: '#f9f002' };
  const KEY = 'portfolio-fx';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  const cv = document.getElementById('fx');
  const ctx = cv.getContext('2d');
  const profiler = document.getElementById('profiler');

  let W = 0, H = 0;
  let parts = [], bars = [], sprites = [], wipe = null;
  let raf = 0, last = 0;

  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch (_) {}
  let enabled = !reduced.matches && stored !== 'off';

  const snap = v => Math.round(v / G) * G;
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const ink = () => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#fff';
  const bg  = () => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#000';

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- what was clicked? ---------- */
  // First match wins. `label` feeds the cursor readout.
  const KINDS = [
    { kind: 'hero',   sel: '.hero-name',                 label: 'the name. push it around' },
    { kind: 'row',    sel: '.row, .block, .strip, .trow', label: 'write-up' },
    { kind: 'code',   sel: 'pre, code',                  label: 'code' },
    { kind: 'button', sel: 'button, summary, input',     label: 'control' },
    { kind: 'link',   sel: 'a',                          label: 'link' },
    { kind: 'image',  sel: 'img',                        label: 'screenshot' },
    { kind: 'text',   sel: 'h1, h2, h3, h4, p, li, td, th, blockquote', label: 'text' }
  ];

  function classify(el) {
    if (!el || !el.closest) return { kind: 'empty', label: 'empty space. click it', el: null };
    for (const k of KINDS) {
      const hit = el.closest(k.sel);
      if (hit) {
        const named = el.closest('[data-p]');
        return { kind: k.kind, label: named ? named.dataset.p : k.label, el: hit };
      }
    }
    return { kind: 'empty', label: 'empty space. click it', el: null };
  }

  /* ---------- emitters ---------- */
  function spray(x, y, n, colors, speed, gravity) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (.4 + Math.random() * .6);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: gravity || 0,
                   life: 0, max: 260 + Math.random() * 320, c: pick(colors), s: G });
    }
  }

  // link: a ring that leaves in the eight compass directions
  function ring(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      for (let j = 1; j <= 2; j++) {
        parts.push({ x, y, vx: Math.cos(a) * .32 * j, vy: Math.sin(a) * .32 * j, g: 0,
                     life: 0, max: 380, c: j === 1 ? COL.c : ink(), s: G });
      }
    }
  }

  // button: a plus sign that shoots out along the axes
  function plus(x, y) {
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      for (let j = 1; j <= 4; j++) {
        parts.push({ x, y, vx: dx * .14 * j, vy: dy * .14 * j, g: 0,
                     life: 0, max: 300, c: COL.y, s: G });
      }
    });
  }

  // row / block: glitch slices across the whole element
  function slices(el, y) {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 7; i++) {
      bars.push({
        x: snap(r.left + (Math.random() - .5) * 36),
        y: snap(Math.min(r.bottom - G, Math.max(r.top, y + (Math.random() - .5) * r.height))),
        w: snap(r.width * (.25 + Math.random() * .75)),
        h: G * (1 + ((Math.random() * 2) | 0)),
        c: pick([COL.m, COL.m, COL.c, ink()]),
        life: 0, max: 90 + Math.random() * 190
      });
    }
  }

  // code: pixels fall like a dropped stack
  function rain(x, y) {
    for (let i = 0; i < 14; i++) {
      parts.push({ x: x + (Math.random() - .5) * 60, y, vx: 0, vy: .05 + Math.random() * .2, g: .0012,
                   life: 0, max: 420 + Math.random() * 260, c: pick([COL.c, ink()]), s: G });
    }
  }

  // empty space: a generated, mirrored 7×7 sprite that lingers and then crumbles
  function sprite(x, y) {
    const cells = [];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 4; c++) {
        if (Math.random() < .55) {
          cells.push([c, r]);
          if (c < 3) cells.push([6 - c, r]);
        }
      }
    }
    sprites.push({ x: snap(x) - G * 3.5, y: snap(y) - G * 3.5, cells,
                   c: pick([COL.m, COL.c, COL.y]), life: 0, max: 2600 });
    if (sprites.length > 14) sprites.shift();
    spray(x, y, 6, [ink()], .25);
  }

  function react(e) {
    if (!enabled) return;
    const hit = classify(e.target);
    const x = e.clientX, y = e.clientY;
    switch (hit.kind) {
      case 'hero':   break;                               // the hero handles its own clicks
      case 'row':    slices(hit.el, y); spray(x, y, 8, [COL.m, ink()], .3); break;
      case 'code':   rain(x, y); break;
      case 'button': plus(x, y); break;
      case 'link':   ring(x, y); break;
      case 'image':  spray(x, y, 18, [COL.m, COL.c, COL.y], .35); break;
      case 'text':   spray(x, y, 7, [ink()], .2); break;
      default:       sprite(x, y);
    }
    profiler.classList.add('hit');
    setTimeout(() => profiler.classList.remove('hit'), 160);
    kick();
  }

  /* ---------- mosaic wipe between pages ---------- */
  function startWipe(swap) {
    if (!enabled) { swap(); return; }
    const size = Math.max(48, snap(Math.max(W, H) / 14));
    const cells = [];
    for (let y = 0; y < H; y += size) for (let x = 0; x < W; x += size) {
      cells.push({ x, y, at: Math.random(), c: Math.random() < .14 ? pick([COL.m, COL.c, COL.y]) : null });
    }
    wipe = { cells, size, t: 0, swapped: false, swap, IN: 190, OUT: 230, base: bg() };
    kick();
  }

  /* ---------- frame loop (runs only while something is alive) ---------- */
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  function frame(now) {
    const dt = Math.min(40, now - last); last = now;
    ctx.clearRect(0, 0, W, H);

    for (const s of sprites) {
      s.life += dt;
      const left = s.max - s.life;
      ctx.fillStyle = s.c;
      s.cells.forEach(([c, r], i) => {
        if (s.life < 140 && i / s.cells.length > s.life / 140) return;        // build in
        if (left < 700 && ((i * 7919) % 100) / 100 > left / 700) return;      // crumble out
        ctx.fillRect(s.x + c * G, s.y + r * G, G, G);
      });
    }
    sprites = sprites.filter(s => s.life < s.max);

    for (const b of bars) {
      b.life += dt;
      ctx.fillStyle = b.c;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    bars = bars.filter(b => b.life < b.max);

    for (const p of parts) {
      p.life += dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.max - p.life < 120 && Math.random() < .35) continue;              // flicker out, no fades
      ctx.fillStyle = p.c;
      ctx.fillRect(snap(p.x), snap(p.y), p.s, p.s);
    }
    parts = parts.filter(p => p.life < p.max);

    if (wipe) {
      wipe.t += dt;
      const w = wipe;
      let cover = w.t < w.IN ? w.t / w.IN : 1 - (w.t - w.IN) / w.OUT;
      if (!w.swapped && w.t >= w.IN) { w.swapped = true; w.swap(); cover = 1; }
      for (const c of w.cells) {
        if (c.at < cover) {
          ctx.fillStyle = c.c || w.base;
          ctx.fillRect(c.x, c.y, w.size, w.size);
        }
      }
      if (w.t >= w.IN + w.OUT) wipe = null;
    }

    if (parts.length || bars.length || sprites.length || wipe) raf = requestAnimationFrame(frame);
    else { raf = 0; ctx.clearRect(0, 0, W, H); }
  }

  /* ---------- cursor readout ---------- */
  let px = 0, py = 0, ptarget = null, pqueued = false;

  function onMove(e) {
    px = Math.round(e.clientX); py = Math.round(e.clientY); ptarget = e.target;
    if (pqueued) return;
    pqueued = true;
    requestAnimationFrame(() => {
      pqueued = false;
      if (!enabled || !finePointer.matches) { profiler.classList.remove('on'); return; }
      profiler.textContent = `${px},${py}  ${classify(ptarget).label}`;
      const flip = px > W - 280;
      const tx = flip ? px - 14 - profiler.offsetWidth : px + 14;
      const ty = py > H - 60 ? py - 34 : py + 18;
      profiler.style.transform = `translate(${tx}px, ${ty}px)`;
      profiler.classList.add('on');
    });
  }

  /* ---------- "decrypt" text on hover ---------- */
  const GLYPHS = '#%&$@01<>/\\[]{}=+*';

  function scramble(el) {
    if (!enabled || el.dataset.busy) return;
    const text = el.textContent;
    el.dataset.busy = '1';
    let step = 0;
    const steps = 9;
    const timer = setInterval(() => {
      step++;
      const shown = Math.floor(text.length * step / steps);
      let out = text.slice(0, shown);
      for (let i = shown; i < text.length; i++) out += text[i] === ' ' ? ' ' : pick(GLYPHS);
      el.textContent = out;
      if (step >= steps) { clearInterval(timer); el.textContent = text; delete el.dataset.busy; }
    }, 32);
  }

  /* ---------- hero: a name made of pixels ---------- */
  function hero(canvas, word) {
    const c = canvas.getContext('2d');
    let cells = [], w = 0, h = 0, id = 0, mx = -9999, my = -9999, cell = 8, alive = true;

    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = w * dpr; canvas.height = h * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Draw the word tiny, then read it back: one source pixel = one cell.
      const off = document.createElement('canvas');
      const o = off.getContext('2d', { willReadFrequently: true });
      const fs = 20;
      const font = `${fs}px "Jersey 15", monospace`;
      o.font = font;
      const tw = Math.ceil(o.measureText(word).width) + 2;
      off.width = tw; off.height = fs + 6;
      o.font = font; o.textBaseline = 'top'; o.fillStyle = '#fff';
      o.fillText(word, 1, 2);
      const data = o.getImageData(0, 0, off.width, off.height).data;

      let minY = off.height, maxY = 0;
      const on = [];
      for (let y = 0; y < off.height; y++) for (let x = 0; x < off.width; x++) {
        if (data[(y * off.width + x) * 4 + 3] > 110) { on.push([x, y]); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      }
      const rows = maxY - minY + 1;
      cell = Math.max(3, Math.floor(Math.min(w / tw, h / (rows + 1))));
      const oy = Math.floor((h - rows * cell) / 2);
      const inkNow = ink();
      cells = on.map(([x, y]) => {
        const hx = x * cell, hy = oy + (y - minY) * cell;
        const r = Math.random();
        return { hx, hy, x: hx, y: hy, vx: 0, vy: 0,
                 c: r < .05 ? COL.m : r < .1 ? COL.c : r < .14 ? COL.y : inkNow };
      });
      draw();
    }

    function draw() {
      c.clearRect(0, 0, w, h);
      const s = cell - 1;                                   // 1px gap keeps the grid visible
      for (const p of cells) {
        c.fillStyle = p.c;
        c.fillRect(Math.round(p.x / cell) * cell, Math.round(p.y / cell) * cell, s, s);
      }
    }

    function tick() {
      id = 0;
      if (!alive || !canvas.isConnected) return;
      let moving = false;
      const R = Math.max(70, cell * 9);
      for (const p of cells) {
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 5;
          p.vx += dx / d * f; p.vy += dy / d * f;
        }
        p.vx += (p.hx - p.x) * .07; p.vy += (p.hy - p.y) * .07;
        p.vx *= .8; p.vy *= .8;
        p.x += p.vx; p.y += p.vy;
        if (Math.abs(p.vx) + Math.abs(p.vy) > .05 || Math.abs(p.x - p.hx) + Math.abs(p.y - p.hy) > .5) moving = true;
      }
      draw();
      if (moving) id = requestAnimationFrame(tick);
    }
    const wake = () => { if (enabled && !id) id = requestAnimationFrame(tick); };

    canvas.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top; wake();
    });
    canvas.addEventListener('pointerleave', () => { mx = my = -9999; wake(); });
    canvas.addEventListener('pointerdown', e => {
      if (!enabled) return;
      const r = canvas.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      for (const p of cells) {                               // blow the whole word apart from the click
        const dx = p.x - cx, dy = p.y - cy, d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = 2600 / (d + 60);
        p.vx += dx / d * f + (Math.random() - .5) * 8;
        p.vy += dy / d * f + (Math.random() - .5) * 8;
      }
      wake();
    });

    const ro = new ResizeObserver(build);
    ro.observe(canvas);
    (document.fonts && document.fonts.load ? document.fonts.load('20px "Jersey 15"') : Promise.resolve())
      .catch(() => {}).then(build);

    return { rebuild: build, destroy() { alive = false; ro.disconnect(); } };
  }

  /* ---------- wiring ---------- */
  function setEnabled(on) {
    enabled = on && !reduced.matches;
    document.documentElement.classList.toggle('fx-off', !enabled);
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (_) {}
    if (!enabled) { parts = []; bars = []; sprites = []; wipe = null; ctx.clearRect(0, 0, W, H); }
  }

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('pointerdown', react);
  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', () => profiler.classList.remove('on'));
  document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('a, summary');
    const t = el && el.querySelector('[data-scramble]');
    if (t && !el.contains(e.relatedTarget)) scramble(t);
  });
  document.documentElement.classList.toggle('fx-off', !enabled);

  return {
    get enabled() { return enabled; },
    get blockedByOS() { return reduced.matches; },
    setEnabled,
    wipe: startWipe,
    hero
  };
})();
