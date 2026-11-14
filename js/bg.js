/* ============================================
   js/bg.js — Ambient background
   ─────────────────────────────────────────
   A dim layer behind the page content:
     • command fragments that type themselves out, hold, then erase
     • small generated pixel sprites that drift in grid steps
     • single pixels that flicker on and off

   It follows the same rules as js/fx.js: off with the "Effects"
   button, off for reduced motion, paused while the tab is hidden.
   On write-up pages it stays out of the text column, so long text stays readable.

   To change what gets typed, edit LINES below.
   ============================================ */

(function () {
  'use strict';

  const cv = document.getElementById('bg');
  if (!cv || typeof FX === 'undefined') return;
  const ctx = cv.getContext('2d');

  const G = 6;
  const COLORS = ['#ff2a6d', '#05d9e8', '#f9f002'];
  const FRAME_MS = 50;                       // about 20 frames a second is plenty for this

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
    '[+] foothold  [+] privesc  [ ] report'
  ];

  let W = 0, H = 0, ink = '#fff';
  let snippets = [], sprites = [], dust = [];
  let raf = 0, last = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const snap = v => Math.round(v / G) * G;
  const readInk = () => { ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#fff'; };

  // On write-up pages nothing is drawn behind the text column, only in the margins.
  let keepOut = null;
  function measureKeepOut() {
    const prose = location.hash.startsWith('#/read') && document.getElementById('prose');
    if (!prose) { keepOut = null; return; }
    const r = prose.getBoundingClientRect();
    keepOut = { left: r.left - 16, right: r.right + 16 };
  }
  const hidden = (x, w) => keepOut && x < keepOut.right && x + w > keepOut.left;

  /* ---------- typed command fragments ---------- */
  function newSnippet(delay) {
    const size = pick([18, 18, 22, 26]);
    const text = pick(LINES);
    ctx.font = `${size}px "Jersey 15", monospace`;
    const width = ctx.measureText(text).width;
    let x = 0, y = 0;
    for (let tries = 0; tries < 8; tries++) {                           // avoid typing over another fragment
      x = snap(rand(12, Math.max(13, W - width - 12)));
      y = snap(rand(80, Math.max(81, H - 30)));
      if (!snippets.some(o => o && Math.abs(o.y - y) < 36 && x < o.x + (o.width || 0) + 20 && x + width + 20 > o.x)) break;
    }
    return { text, size, width, x, y, shown: 0, phase: 'wait', t: -(delay || 0),
             color: Math.random() < .25 ? pick(COLORS) : null };
  }

  function stepSnippet(s, dt) {
    s.t += dt;
    if (s.phase === 'wait' && s.t >= 0) { s.phase = 'type'; s.t = 0; }
    else if (s.phase === 'type') {
      while (s.t > 55 && s.shown < s.text.length) { s.shown++; s.t -= 55; }
      if (s.shown >= s.text.length) { s.phase = 'hold'; s.t = 0; }
    } else if (s.phase === 'hold' && s.t > 4200) { s.phase = 'erase'; s.t = 0; }
    else if (s.phase === 'erase') {
      while (s.t > 18 && s.shown > 0) { s.shown--; s.t -= 18; }
      if (s.shown <= 0) return newSnippet(rand(400, 2600));
    }
    return s;
  }

  function drawSnippet(s, k) {
    if (s.phase === 'wait') return;
    ctx.font = `${s.size}px "Jersey 15", monospace`;
    if (hidden(s.x, ctx.measureText(s.text).width)) return;
    ctx.globalAlpha = (s.color ? .34 : .2) * k;
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
    return { cells, x: snap(rand(0, W)), y: snap(rand(0, H)), dx, dy,
             every: rand(140, 420), acc: 0, color: pick(COLORS), scale: pick([1, 1, 2]) };
  }

  function stepSprite(p, dt) {
    p.acc += dt;
    while (p.acc > p.every) {                                           // move one grid step at a time
      p.acc -= p.every;
      p.x += p.dx * G; p.y += p.dy * G;
    }
    const size = 7 * G * p.scale;
    if (p.x > W) p.x = -size; else if (p.x < -size) p.x = snap(W);
    if (p.y > H) p.y = -size; else if (p.y < -size) p.y = snap(H);
  }

  function drawSprite(p, k) {
    const s = G * p.scale;
    if (hidden(p.x, 7 * s)) return;
    ctx.globalAlpha = .26 * k;
    ctx.fillStyle = p.color;
    for (const [c, r] of p.cells) ctx.fillRect(p.x + c * s, p.y + r * s, s, s);
  }

  /* ---------- flickering pixels ---------- */
  function stepDust(dt) {
    if (dust.length < 46 && Math.random() < .5) {
      dust.push({ x: snap(rand(0, W)), y: snap(rand(0, H)), life: rand(300, 1800),
                  color: Math.random() < .3 ? pick(COLORS) : null, s: pick([G, G, G * 2]) });
    }
    for (const d of dust) d.life -= dt;
    dust = dust.filter(d => d.life > 0);
  }

  /* ---------- loop ---------- */
  function seed() {
    const small = W < 700;
    snippets = [];
    const count = small ? 3 : W < 1300 ? 6 : 9;
    for (let i = 0; i < count; i++) snippets.push(newSnippet(i * 700));
    sprites = Array.from({ length: small ? 3 : 7 }, newSprite);
    dust = [];
  }

  function resize() {
    const widthChanged = window.innerWidth !== W;
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W; cv.height = H;                                        // 1:1 on purpose: chunkier and cheaper
    ctx.textBaseline = 'alphabetic';
    if (widthChanged) seed();                                           // phone address bars only change the height
  }

  function frame(now) {
    raf = 0;
    if (!FX.enabled || document.hidden) { ctx.clearRect(0, 0, W, H); return; }
    raf = requestAnimationFrame(frame);
    const dt = now - last;
    if (dt < FRAME_MS) return;
    last = now;
    const step = Math.min(dt, 120), k = 1;
    measureKeepOut();

    ctx.clearRect(0, 0, W, H);
    stepDust(step);
    for (const d of dust) {
      if (hidden(d.x, d.s)) continue;
      ctx.globalAlpha = (d.color ? .3 : .14) * k;
      ctx.fillStyle = d.color || ink;
      ctx.fillRect(d.x, d.y, d.s, d.s);
    }
    for (const p of sprites) { stepSprite(p, step); drawSprite(p, k); }
    snippets = snippets.map(s => stepSnippet(s, step));
    for (const s of snippets) drawSnippet(s, k);
    ctx.globalAlpha = 1;
  }

  function wake() { if (!raf && FX.enabled && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  readInk();
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', wake);
  new MutationObserver(readInk).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  setInterval(wake, 600);                                               // picks up the Effects switch being turned back on
  (document.fonts && document.fonts.load ? document.fonts.load('20px "Jersey 15"') : Promise.resolve()).catch(() => {}).then(wake);
})();
