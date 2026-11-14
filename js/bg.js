/* ============================================
   js/bg.js — Ambient background
   ─────────────────────────────────────────
   A dim layer behind the page content:
     • command fragments that type themselves out, hold, then erase
     • small generated pixel sprites that drift in grid steps
     • single pixels that flicker on and off

   The layer treats the page's text as solid:
     • fragments only type in empty space, and erase themselves
       when text scrolls over them
     • sprites bounce off text blocks; one that ends up behind text
       turns into a faint dotted ghost until it gets out
     • sprites run away from the cursor

   It follows the same rules as js/fx.js: off with the "Effects"
   button, off for reduced motion, paused while the tab is hidden.

   To change what gets typed, edit LINES below.
   To change what counts as "text", edit SOLID below.
   ============================================ */

(function () {
  'use strict';

  const cv = document.getElementById('bg');
  if (!cv || typeof FX === 'undefined') return;
  const ctx = cv.getContext('2d');

  const G = 6;
  const COLORS = ['#ff2a6d', '#05d9e8', '#f9f002'];
  const FRAME_MS = 50;                       // about 20 frames a second is plenty for this
  const PAD = 10;                            // breathing room kept around text

  // Page elements the background must stay clear of.
  const SOLID = '.hero-name, .hero-line, .hero-hint, .block, .strip, .page-title, .page-lede, .tools, ' +
                '.rows, .tech-cat, .back, .read-head, .prose, .empty, .foot';

  const LINES = [
    'nmap -sC -sV -p- 10.129.0.0',
    'grep "Failed password" auth.log',
    'strings -n 8 sample.bin',
    'sha256sum sample.bin',
    'getcap -r / 2>/dev/null',
    'sqlmap --batch --dbs',
    'index=main sourcetype=sysmon EventCode=1',
    'jq \'select(.EventID==22)\'',
    'last -f wtmp -F',
    'file suspicious && xxd -l 64 suspicious',
    'ffuf -u http://target/FUZZ -w common.txt',
    'tcpdump -r capture.pcap port 21',
    'john --wordlist=rockyou.txt hash.txt',
    'chmod 600 id_rsa && ssh -i id_rsa user@host',
    '0000: 7f 45 4c 46 02 01 01 00',
    '0040: 4d 5a 90 00 03 00 00 00',
    'T1136.001  create account: local',
    'T1110.001  brute force: password guessing',
    'uid=0(root) gid=0(root)',
    '[+] foothold  [+] privesc  [ ] report',
    'ls -la', 'whoami', 'id', 'sudo -l', 'cat flag.txt', 'nc -lvnp 4444', '0x7f454c46', 'chmod +x', 'base64 -d'
  ];

  let W = 0, H = 0, ink = '#fff';
  let snippets = [], sprites = [], dust = [], solid = [];
  let raf = 0, last = 0, mx = -9999, my = -9999;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const snap = v => Math.round(v / G) * G;
  const readInk = () => { ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#fff'; };

  /* ---------- where the text is ---------- */
  function measureSolid() {
    solid = [];
    const header = document.querySelector('.top');
    const top = header ? header.getBoundingClientRect().bottom : 0;
    solid.push({ l: 0, t: 0, r: W, b: top });                           // the header bar
    document.querySelectorAll(SOLID).forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height && r.bottom > 0 && r.top < H) {
        solid.push({ l: r.left - PAD, t: r.top - PAD, r: r.right + PAD, b: r.bottom + PAD });
      }
    });
  }
  function hit(x, y, w, h) {
    for (const s of solid) if (x < s.r && x + w > s.l && y < s.b && y + h > s.t) return true;
    return false;
  }

  /* ---------- typed command fragments ---------- */
  function newSnippet(delay) {
    const size = pick([18, 18, 22, 26]);
    ctx.font = `${size}px "Jersey 15", monospace`;
    for (let tries = 0; tries < 24; tries++) {                          // look for empty space; short lines fit more gaps
      const text = pick(LINES);
      const width = ctx.measureText(text).width + size * .5;
      if (width > W - 24) continue;
      const x = snap(rand(12, W - width - 12)), y = snap(rand(size + 4, H - 12));
      const clear = !hit(x - 6, y - size, width + 12, size + 8) &&
        !snippets.some(o => o && o.placed && Math.abs(o.y - y) < 36 && x < o.x + o.width + 20 && x + width + 20 > o.x);
      if (clear) {
        return { placed: true, text, size, width, x, y, shown: 0, phase: 'wait', t: -(delay || 0),
                 color: Math.random() < .3 ? pick(COLORS) : null };
      }
    }
    return { placed: false, phase: 'wait', t: -700 };                   // no room right now, look again shortly
  }

  function stepSnippet(s, dt) {
    s.t += dt;
    if (!s.placed) return s.t >= 0 ? newSnippet(0) : s;
    const covered = hit(s.x - 4, s.y - s.size, s.width + 8, s.size + 6);
    if (s.phase === 'wait') {
      if (s.t >= 0) { if (covered) return newSnippet(300); s.phase = 'type'; s.t = 0; }
    } else if (covered && s.phase !== 'erase') {                        // text scrolled over it: back off
      s.phase = 'erase'; s.fast = true; s.t = 0;
    } else if (s.phase === 'type') {
      while (s.t > 55 && s.shown < s.text.length) { s.shown++; s.t -= 55; }
      if (s.shown >= s.text.length) { s.phase = 'hold'; s.t = 0; }
    } else if (s.phase === 'hold' && s.t > 4200) { s.phase = 'erase'; s.t = 0; }
    if (s.phase === 'erase') {
      const per = s.fast ? 6 : 18;
      while (s.t > per && s.shown > 0) { s.shown--; s.t -= per; }
      if (s.shown <= 0) return newSnippet(rand(300, 2200));
    }
    return s;
  }

  function drawSnippet(s) {
    if (!s.placed || s.phase === 'wait') return;
    ctx.font = `${s.size}px "Jersey 15", monospace`;
    ctx.globalAlpha = s.color ? .45 : .3;
    ctx.fillStyle = s.color || ink;
    const text = s.text.slice(0, s.shown);
    ctx.fillText(text, s.x, s.y);
    if (s.phase !== 'hold' || ((s.t / 450) | 0) % 2 === 0) {            // block cursor, blinking while held
      const w = ctx.measureText(text).width;
      ctx.fillRect(s.x + w + 2, s.y - s.size * .62, s.size * .42, s.size * .72);
    }
  }

  /* ---------- drifting sprites ---------- */
  function newSprite() {
    const cells = [];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) {
      if (Math.random() < .55) { cells.push([c, r]); if (c < 3) cells.push([6 - c, r]); }
    }
    let dx = pick([-1, 0, 1]), dy = pick([-1, 0, 1]);
    if (!dx && !dy) dx = 1;
    const every = rand(140, 420);
    return { cells, x: snap(rand(0, W)), y: snap(rand(0, H)), dx, dy,
             every, base: every, scared: 0, acc: 0, color: pick(COLORS), scale: pick([1, 1, 2]) };
  }

  function stepSprite(p, dt) {
    const size = 7 * G * p.scale;

    // Run from the cursor.
    const cx = p.x + size / 2, cy = p.y + size / 2;
    if (Math.abs(cx - mx) < 110 && Math.abs(cy - my) < 110) {
      p.dx = cx >= mx ? 1 : -1;
      p.dy = cy >= my ? 1 : -1;
      p.every = 45; p.scared = 700;
    } else if (p.scared > 0) {
      p.scared -= dt;
      if (p.scared <= 0) p.every = p.base;
    }

    p.acc += dt;
    while (p.acc > p.every) {                                           // move one grid step at a time
      p.acc -= p.every;
      if (!hit(p.x, p.y, size, size)) {                                 // text is a wall: bounce off it
        if (p.dx && hit(p.x + p.dx * G, p.y, size, size)) p.dx = -p.dx;
        if (p.dy && hit(p.x, p.y + p.dy * G, size, size)) p.dy = -p.dy;
        if (hit(p.x + p.dx * G, p.y + p.dy * G, size, size)) continue;  // boxed in, wait a beat
      }
      p.x += p.dx * G; p.y += p.dy * G;
    }
    if (p.x > W) p.x = -size; else if (p.x < -size) p.x = snap(W);
    if (p.y > H) p.y = -size; else if (p.y < -size) p.y = snap(H);
  }

  function drawSprite(p) {
    const s = G * p.scale;
    const ghost = hit(p.x, p.y, 7 * s, 7 * s);                          // behind text: fade to a dotted ghost
    ctx.globalAlpha = ghost ? .09 : p.scared > 0 ? .6 : .4;
    ctx.fillStyle = p.color;
    for (const [c, r] of p.cells) {
      if (ghost && (c + r) % 2) continue;
      ctx.fillRect(p.x + c * s, p.y + r * s, s, s);
    }
  }

  /* ---------- flickering pixels ---------- */
  function stepDust(dt) {
    if (dust.length < 46 && Math.random() < .5) {
      const d = { x: snap(rand(0, W)), y: snap(rand(0, H)), life: rand(300, 1800),
                  color: Math.random() < .3 ? pick(COLORS) : null, s: pick([G, G, G * 2]) };
      if (!hit(d.x, d.y, d.s, d.s)) dust.push(d);
    }
    for (const d of dust) d.life -= dt;
    dust = dust.filter(d => d.life > 0);
  }

  /* ---------- loop ---------- */
  function seed() {
    const small = W < 700;
    measureSolid();
    snippets = [];
    const count = small ? 4 : W < 1300 ? 7 : 10;
    for (let i = 0; i < count; i++) snippets.push(newSnippet(i * 600));
    sprites = Array.from({ length: small ? 4 : 8 }, newSprite);
    dust = [];
  }

  function resize() {
    const widthChanged = window.innerWidth !== W;
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W; cv.height = H;                                        // 1:1 on purpose: chunkier and cheaper
    if (widthChanged) seed();                                           // phone address bars only change the height
  }

  function frame(now) {
    raf = 0;
    if (!FX.enabled || document.hidden) { ctx.clearRect(0, 0, W, H); return; }
    raf = requestAnimationFrame(frame);
    const dt = now - last;
    if (dt < FRAME_MS) return;
    last = now;
    const step = Math.min(dt, 120);

    measureSolid();
    ctx.clearRect(0, 0, W, H);
    stepDust(step);
    for (const d of dust) {
      if (hit(d.x, d.y, d.s, d.s)) continue;
      ctx.globalAlpha = d.color ? .4 : .2;
      ctx.fillStyle = d.color || ink;
      ctx.fillRect(d.x, d.y, d.s, d.s);
    }
    for (const p of sprites) { stepSprite(p, step); drawSprite(p); }
    for (let i = 0; i < snippets.length; i++) snippets[i] = stepSnippet(snippets[i], step);
    for (const s of snippets) drawSnippet(s);
    ctx.globalAlpha = 1;
  }

  function wake() { if (!raf && FX.enabled && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  readInk();
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', wake);
  document.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  document.addEventListener('pointerleave', () => { mx = my = -9999; });
  new MutationObserver(readInk).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  setInterval(wake, 600);                                               // picks up the Effects switch being turned back on
  (document.fonts && document.fonts.load ? document.fonts.load('20px "Jersey 15"') : Promise.resolve()).catch(() => {}).then(wake);
})();
