(function () {
  const TAG = "story1-fix";
  const canvas = document.querySelector('canvas[data-anim="' + TAG + '"]');
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const C = {
    brass: "138,90,0",
    porcelain: "255,253,244",
    damaged: "196,68,68",
    fixed: "106,160,80",
    ok: "156,138,95",
  };

  let w = 1, h = 1, dpr = 1;
  let cols = [], sectors = [];
  let scanX = 0, scanMin = 0, scanMax = 0;
  let phase = "scan", phaseT = 0;
  let running = false, rafId = null, lastT = 0;

  function fit() {
    const cssW = canvas.clientWidth || canvas.getBoundingClientRect().width || 960;
    const cssH = canvas.clientHeight || canvas.getBoundingClientRect().height || 700;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(cssW));
    h = Math.max(1, Math.round(cssH));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildCols();
    buildSectors();
  }

  function hx() { return (Math.random() * 16 | 0).toString(16); }

  function buildCols() {
    const cw = 15, lh = 14;
    const n = Math.max(1, Math.floor(w / cw));
    const len = Math.ceil(h / lh) + 2;
    cols = [];
    for (let i = 0; i < n; i++) {
      const ch = [];
      for (let j = 0; j < len; j++) ch.push(hx());
      cols.push({
        x: i * cw + cw / 2,
        y: Math.random() * h,
        sp: 12 + Math.random() * 35,
        lh: lh,
        ch: ch,
        len: len,
      });
    }
  }

  function buildSectors() {
    const gw = Math.min(w * 0.74, 820);
    const gh = Math.min(h * 0.2, 150);
    const rows = 3;
    const gap = 3;
    const colsN = Math.max(12, Math.floor(gw / 26));
    const cw = (gw - gap * (colsN - 1)) / colsN;
    const ch = (gh - gap * (rows - 1)) / rows;
    const sx = (w - gw) / 2;
    const sy = h - gh - Math.max(28, h * 0.06);
    sectors = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < colsN; c++) {
        sectors.push({
          x: sx + c * (cw + gap),
          y: sy + r * (ch + gap),
          w: cw,
          h: ch,
          st: Math.random() < 0.38 ? "damaged" : "ok",
          ft: 0,
        });
      }
    }
    scanMin = sx - 12;
    scanMax = sx + gw + 12;
    scanX = scanMin;
    phase = "scan";
    phaseT = 0;
  }

  function resetSec() {
    for (const s of sectors) {
      s.st = Math.random() < 0.38 ? "damaged" : "ok";
      s.ft = 0;
    }
    scanX = scanMin;
    phase = "scan";
    phaseT = 0;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function rr(x, y, rw, rh, r) {
    r = Math.min(r, rw / 2, rh / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + rw, y, x + rw, y + rh, r);
    ctx.arcTo(x + rw, y + rh, x, y + rh, r);
    ctx.arcTo(x, y + rh, x, y, r);
    ctx.arcTo(x, y, x + rw, y, r);
    ctx.closePath();
  }

  function update(dt) {
    for (const c of cols) {
      c.y += c.sp * dt;
      if (c.y - c.len * c.lh > h) {
        c.y = -Math.random() * h * 0.5;
        for (let j = 0; j < c.len; j++) c.ch[j] = hx();
      }
      if (Math.random() < dt * 4) c.ch[Math.random() * c.len | 0] = hx();
    }
    if (phase === "scan") {
      scanX += (scanMax - scanMin) / 4.2 * dt;
      for (const s of sectors) {
        if (s.st === "damaged" && s.x + s.w * 0.5 < scanX) {
          s.st = "fixing";
          s.ft = 0;
        }
      }
      if (scanX >= scanMax) { phase = "hold"; phaseT = 0; }
    } else if (phase === "hold") {
      phaseT += dt;
      if (phaseT > 3.2) resetSec();
    }
    for (const s of sectors) {
      if (s.st === "fixing") {
        s.ft += dt * 2.6;
        if (s.ft >= 1) { s.st = "fixed"; s.ft = 1; }
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    ctx.font = "12px ui-monospace, Menlo, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const c of cols) {
      for (let j = 0; j < c.len; j++) {
        const y = c.y - j * c.lh;
        if (y < -10 || y > h + 10) continue;
        const a = 0.05 + (1 - j / c.len) * 0.17;
        ctx.fillStyle = "rgba(" + C.brass + "," + a + ")";
        ctx.fillText(c.ch[j], c.x, y);
      }
    }

    for (const s of sectors) {
      let fill, glow = 0, gc = null;
      if (s.st === "damaged") {
        fill = "rgba(" + C.damaged + ",0.5)";
      } else if (s.st === "fixing") {
        const t = s.ft;
        const r = lerp(196, 106, t) | 0;
        const g = lerp(68, 160, t) | 0;
        const b = lerp(68, 80, t) | 0;
        fill = "rgba(" + r + "," + g + "," + b + "," + (0.5 + 0.35 * Math.sin(t * Math.PI)) + ")";
        glow = 10;
        gc = "rgba(" + r + "," + g + "," + b + ",0.7)";
      } else if (s.st === "fixed") {
        const p = phase === "hold" ? 0.45 + 0.18 * Math.sin(phaseT * 2.2) : 0.5;
        fill = "rgba(" + C.fixed + "," + p + ")";
        if (phase === "hold") { glow = 5; gc = "rgba(" + C.fixed + ",0.45)"; }
      } else {
        fill = "rgba(" + C.ok + ",0.16)";
      }
      if (glow > 0) { ctx.shadowColor = gc; ctx.shadowBlur = glow; }
      ctx.fillStyle = fill;
      rr(s.x, s.y, s.w, s.h, 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (phase === "scan") {
      const top = sectors[0].y - 8;
      const last = sectors[sectors.length - 1];
      const bot = last.y + last.h + 8;
      const g = ctx.createLinearGradient(scanX - 40, 0, scanX + 6, 0);
      g.addColorStop(0, "rgba(" + C.porcelain + ",0)");
      g.addColorStop(1, "rgba(" + C.porcelain + ",0.85)");
      ctx.fillStyle = g;
      ctx.fillRect(scanX - 40, top, 46, bot - top);
      ctx.fillStyle = "rgba(" + C.porcelain + ",0.9)";
      ctx.fillRect(scanX, top, 2, bot - top);
    }
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    fit();
    running = true;
    lastT = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  window.__storyAnims = window.__storyAnims || {};
  window.__storyAnims[TAG] = {
    start: start,
    stop: stop,
    refresh: function () { if (running) fit(); },
  };
})();
