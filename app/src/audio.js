// audio.js — Web Audio synthesis: ambient bed, scan hum, repair ding,
// particle bed, DC-plug chime. No audio assets; muted by default.
export class AudioEngine {
  constructor(cfg) {
    this.cfg = cfg;
    this.ctx = null;
    this.master = null;
    this.bedNodes = [];
    this.humNodes = [];
    this.story = 'a';
    this._lastDing = 0;
    const boot = () => { this._ensure(); window.removeEventListener('pointerdown', boot); window.removeEventListener('keydown', boot); };
    window.addEventListener('pointerdown', boot);
    window.addEventListener('keydown', boot);
  }

  _ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.cfg.muted ? 0 : this.cfg.volume;
    this.master.connect(this.ctx.destination);
    this._startBed(this.story);
  }

  setMuted(m) { this.cfg.muted = m; if (this.master) this.master.gain.linearRampToValueAtTime(m ? 0 : this.cfg.volume, this.ctx.currentTime + 0.15); }
  setVolume(v) { this.cfg.volume = v; if (this.master && !this.cfg.muted) this.master.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 0.1); }

  _noiseBuffer(seconds = 2) {
    const sr = this.ctx.sampleRate, buf = this.ctx.createBuffer(1, sr * seconds, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _startBed(story) {
    this._stopNodes(this.bedNodes); this.bedNodes = [];
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain(); g.gain.value = 0; g.connect(this.master);
    g.gain.linearRampToValueAtTime(0.05, t + 2.5);

    // two detuned warm sines
    const base = story === 'a' ? 82.4 : 98.0;
    for (const det of [0, 1.5]) {
      const o = this.ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = base; o.detune.value = det;
      const og = this.ctx.createGain(); og.gain.value = 0.5;
      o.connect(og); og.connect(g); o.start();
      this.bedNodes.push(o, og);
    }
    // slow-breathing filtered noise
    const n = this.ctx.createBufferSource(); n.buffer = this._noiseBuffer(); n.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = story === 'a' ? 320 : 480; f.Q.value = 0.4;
    const ng = this.ctx.createGain(); ng.gain.value = 0.35;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 0.18;
    lfo.connect(lfoG); lfoG.connect(ng.gain);
    n.connect(f); f.connect(ng); ng.connect(g); n.start(); lfo.start();
    this.bedNodes.push(n, f, ng, lfo, lfoG, g);
  }

  switchStory(story) { this.story = story; if (this.ctx) this._startBed(story); }
  _stopNodes(nodes) { for (const n of nodes) { try { n.stop ? n.stop() : n.disconnect(); } catch (_) {} } }

  // --- Story A: scan hum while the repair sweep runs ---
  scanHum(on) {
    if (!this.ctx) return;
    if (on && this.humNodes.length === 0) {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 118;
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 640; f.Q.value = 3.5;
      const g = this.ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.028, t + 0.4);
      const tr = this.ctx.createOscillator(); tr.frequency.value = 9;
      const trG = this.ctx.createGain(); trG.gain.value = 0.012; tr.connect(trG); trG.connect(g.gain);
      o.connect(f); f.connect(g); g.connect(this.master); o.start(); tr.start();
      this.humNodes = [o, f, g, tr, trG];
    } else if (!on && this.humNodes.length) {
      const g = this.humNodes[2];
      g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
      const nodes = this.humNodes; this.humNodes = [];
      setTimeout(() => this._stopNodes(nodes), 500);
    }
  }

  // repair ding — throttled sine blip
  repairDing() {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this._lastDing < 90) return;
    this._lastDing = now;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1240 + Math.random() * 320, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0004, t + 0.28);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.3);
  }

  // Story B: check-card pop
  cardPop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(660, t); o.frequency.exponentialRampToValueAtTime(990, t + 0.09);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.045, t); g.gain.exponentialRampToValueAtTime(0.0004, t + 0.22);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.25);
  }

  // DC-plug chime — two-note resolve
  dcChime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [[523.25, 0], [783.99, 0.14], [1046.5, 0.28]].forEach(([f, dt]) => {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.06, t + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0004, t + dt + 0.9);
      o.connect(g); g.connect(this.master); o.start(t + dt); o.stop(t + dt + 1);
    });
  }
}
