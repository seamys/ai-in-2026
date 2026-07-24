// storyA.js — Byte Surgeon
// Full-screen GPU hex stream · instanced sector array · diagnostic scan line ·
// repair transitions · entropy convergence · telemetry · narrative beats.
import * as THREE from 'three';
import { clamp, lerp, damp, mulberry32, formatGB } from './utils.js';

const HEX_ROWS = 16;           // characters per column (spec: columns of 16)
const REPAIR_TIME = 0.4;       // red→orange→green transition (s)

// ---------------------------------------------------------------- hex stream
const HEX_VERT = /* glsl */`
attribute float aX, aZ, aRow, aSpeed, aPhase, aTail, aSeed, aScale;
uniform float uTime, uConv, uMut, uMeanSpeed, uTop, uSpan, uCharW, uCharH;
varying vec2 vUv;
varying float vGlyph, vBright, vHead;
float hash(float n) { return fract(sin(n) * 43758.5453123); }
void main() {
  vUv = uv;
  float spd = mix(aSpeed, uMeanSpeed, uConv * 0.88);      // speed variance tightens
  float s = aPhase + uTime * spd;
  float y = uTop - mod(s, uSpan) + aRow * uCharH;          // head (row 0) lowest
  float fall = exp(-aRow / max(aTail, 1.0));               // tail falloff
  float mutRate = mix(uMut, 0.5, uConv);                   // entropy drop 4/s → 0.5/s
  float tick = floor(uTime * mutRate + hash(aSeed + aRow * 13.7) * 8.0);
  vGlyph = floor(hash(aSeed * 3.1 + aRow * 7.7 + tick * 5.13) * 16.0);
  float flick = 0.7 + 0.3 * hash(tick * 3.71 + aSeed * 1.7);
  vHead = 1.0 - smoothstep(0.0, 0.6, aRow);
  vBright = fall * flick;
  vec3 wp = vec3(aX + position.x * uCharW * aScale,
                 y + position.y * uCharH * aScale,
                 aZ);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(wp, 1.0);
}`;

const HEX_FRAG = /* glsl */`
precision highp float;
uniform vec3 uColor;
uniform float uTime;
varying vec2 vUv;
varying float vGlyph, vBright, vHead;

float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
int glyphBits(int g) {
  if (g == 0) return 63;  if (g == 1) return 6;   if (g == 2) return 91;
  if (g == 3) return 79;  if (g == 4) return 102; if (g == 5) return 109;
  if (g == 6) return 125; if (g == 7) return 7;   if (g == 8) return 127;
  if (g == 9) return 111; if (g == 10) return 119; if (g == 11) return 124;
  if (g == 12) return 88; if (g == 13) return 94;  if (g == 14) return 121;
  return 113;
}
void main() {
  int g = glyphBits(int(vGlyph + 0.5));
  vec2 p = vUv;
  float d = 1e3;
  if ((g & 1)  != 0) d = min(d, sdSeg(p, vec2(0.20, 0.92), vec2(0.80, 0.92)));
  if ((g & 2)  != 0) d = min(d, sdSeg(p, vec2(0.86, 0.56), vec2(0.86, 0.88)));
  if ((g & 4)  != 0) d = min(d, sdSeg(p, vec2(0.86, 0.16), vec2(0.86, 0.48)));
  if ((g & 8)  != 0) d = min(d, sdSeg(p, vec2(0.20, 0.08), vec2(0.80, 0.08)));
  if ((g & 16) != 0) d = min(d, sdSeg(p, vec2(0.14, 0.16), vec2(0.14, 0.48)));
  if ((g & 32) != 0) d = min(d, sdSeg(p, vec2(0.14, 0.56), vec2(0.14, 0.88)));
  if ((g & 64) != 0) d = min(d, sdSeg(p, vec2(0.18, 0.50), vec2(0.82, 0.50)));
  float aa = fwidth(d) * 1.4 + 1e-4;
  float mask = 1.0 - smoothstep(0.055 - aa, 0.055 + aa, d);
  float alpha = mask * (0.05 + 0.17 * vBright);
  float boost = 1.0 + vHead * 24.0;                       // column heads fire bloom
  vec3 col = uColor * (0.85 + 0.5 * vBright) * boost;
  gl_FragColor = vec4(col * alpha, alpha);                // premultiplied
}`;

// ---------------------------------------------------------------- sector grid
const CELL_VERT = /* glsl */`
attribute vec2 aCell;
attribute float aSeed, aRepair, aDamaged;
uniform vec2 uOrigin, uSpacing, uCell;
uniform float uTime;
varying vec2 vUv;
varying float vSeed, vRp, vDamaged, vWorldX, vBorder;
void main() {
  vUv = uv; vSeed = aSeed; vDamaged = aDamaged;
  float rp = aRepair < 0.0 ? -1.0 : clamp((uTime - aRepair) / ${REPAIR_TIME}, 0.0, 1.0);
  vRp = rp;
  float pop = (rp >= 0.0 && rp < 1.0) ? 1.0 + 0.08 * sin(rp * 3.14159) : 1.0;  // 1→1.08→1
  vec2 world = uOrigin + aCell * uSpacing;
  vWorldX = world.x;
  vec3 wp = vec3(world + position.xy * uCell * pop, 0.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(wp, 1.0);
}`;

const CELL_FRAG = /* glsl */`
precision highp float;
uniform float uTime, uScanX, uScanActive;
varying vec2 vUv;
varying float vSeed, vRp, vDamaged, vWorldX;

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
  vec2 p = vUv - 0.5;
  float d = sdRoundBox(p, vec2(0.5), 0.14);
  float aa = fwidth(d) * 1.5 + 1e-4;
  float mask = 1.0 - smoothstep(-aa, aa, d);
  float border = (1.0 - smoothstep(0.0, 0.028, abs(d))) * 0.6;

  // spec colors converted to working-space linear
  vec3 cNorm = vec3(0.336, 0.255, 0.112);   // rgba(156,138,95,0.16)
  vec3 cDam  = vec3(0.552, 0.058, 0.058);   // rgba(196,68,68,0.5)
  vec3 cOr   = vec3(0.873, 0.265, 0.031);
  vec3 cFix  = vec3(0.148, 0.353, 0.081);   // rgba(106,160,80,0.5)

  vec3 col; float alpha;
  float pulse = 0.72 + 0.28 * sin(6.28318 * uTime + vSeed * 6.2831);   // 1 Hz
  if (vDamaged > 0.5 && vRp < 0.0) {
    col = cDam * pulse * 1.6; alpha = 0.50;
  } else if (vRp >= 0.0 && vRp < 1.0) {
    vec3 c = vRp < 0.5 ? mix(cDam, cOr, vRp * 2.0) : mix(cOr, cFix, vRp * 2.0 - 1.0);
    float boost = 1.0 + sin(vRp * 3.14159) * 6.0;                      // bloom pulse
    col = c * boost; alpha = 0.50;
  } else if (vRp >= 1.0) {
    col = cFix * (1.9 + 0.45 * sin(3.0 * uTime + vSeed * 6.2831));     // steady glow
    alpha = 0.50;
  } else {
    col = cNorm; alpha = 0.16;
  }

  // light wash from the scan band
  float g = exp(-abs(vWorldX - uScanX) * 2.2) * uScanActive;
  col += vec3(1.0, 0.983, 0.900) * g * 1.2;
  alpha += g * 0.25;

  col += border * 0.30;
  alpha = clamp(alpha, 0.0, 1.0) * mask;
  gl_FragColor = vec4(col * alpha, alpha);
}`;

// ---------------------------------------------------------------- scan line
const SCAN_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const SCAN_FRAG = /* glsl */`
precision highp float;
uniform float uActive, uTime;
varying vec2 vUv;
void main() {
  float trail = pow(vUv.x, 2.8) * 0.32;                                  // 40 px gradient trail
  float edge = (1.0 - smoothstep(0.0, 0.030, abs(vUv.x - 0.982))) * 2.4; // crisp 2 px leading edge
  float ends = smoothstep(0.0, 0.05, vUv.y) * (1.0 - smoothstep(0.95, 1.0, vUv.y));
  vec3 porcelain = vec3(1.0, 0.983, 0.900);
  vec3 col = porcelain * (trail + edge);
  float alpha = clamp(trail + edge * 0.15, 0.0, 0.85) * ends * uActive;
  gl_FragColor = vec4(col * alpha, alpha);
}`;

// faint backing panel behind the sector array
const PANEL_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
  float d = sdRoundBox(vUv - 0.5, vec2(0.5), 0.06);
  float mask = 1.0 - smoothstep(-0.004, 0.004, d);
  float edge = 1.0 - smoothstep(0.0, 0.012, abs(d));
  vec3 col = vec3(0.336, 0.255, 0.112) * 0.9 + vec3(0.82) * edge * 0.4;
  float alpha = (0.055 + edge * 0.16) * mask;
  gl_FragColor = vec4(col * alpha, alpha);
}`;

const LOG_LINES = {
  idle: [
    ['$ ', 'mount /dev/mmcblk0  →  I/O error, dev mmcblk0, sector 2048'],
    ['$ ', 'fsck.exfat  →  filesystem cluster 196608: UNREADABLE'],
    ['! ', '4 recovery tools failed · partial clips: no audio, mid-stream glitches'],
  ],
  engage: [
    ['❯ ', 'claude> opening /dev/mmcblk0 — raw block device, 200 GB'],
    ['❯ ', 'claude> hexdump -C | full-disk binary analysis'],
  ],
  analysis: [
    ['❯ ', 'claude> binwalk → GoPro MP4 signatures (ftyp · moov · mdat)'],
    ['❯ ', 'claude> chaining ddrescue → scalpel → ffmpeg remux'],
  ],
  scan: [
    ['≈ ', 'ddrescue mapfile: carving clusters, skipping bad blocks'],
    ['≈ ', 'sector scan + targeted rewrite in progress…'],
  ],
  hold: [
    ['✓ ', 'all clips recovered intact — video AND audio'],
    ['✓ ', '187.4 GB verified · checksums match · 0 bad sectors remaining'],
  ],
};

const CAPTIONS = {
  idle: '<b>May Day 2026.</b> A 200 GB microSD pulled without safe eject — the card is dead.',
  engage: 'Every tool failed. Last resort: <b>Claude Code</b> pointed at the raw block device.',
  analysis: 'It hex-dumped the whole disk, then chained forensic CLIs the user had never heard of.',
  scan: 'Sector-by-sector diagnostic sweep — damaged cells repaired on contact.',
  hold: '<b>Every clip recovered intact</b> — video and audio. AI no longer answers; it acts.',
};

export class StoryA {
  constructor(app) {
    this.app = app;
    this.scene = new THREE.Scene();
    this.id = 'a';
    this.name = 'Byte Surgeon';

    this.time = 0;
    this.conv = 0;             // stream convergence 0..1
    this.convTarget = 0;
    this.scanX = -1e3;
    this.scanActive = false;
    this.beatIndex = 0;
    this.beatTime = 0;
    this.totalBytes = 200;

    this.layout = null;
    this.rng = mulberry32(20260501);

    this.beats = [
      { key: 'idle',     conv: 0.0,  enter: () => this._enterIdle() },
      { key: 'engage',   conv: 0.22, enter: () => this._enterBeat('engage') },
      { key: 'analysis', conv: 0.6,  enter: () => this._enterBeat('analysis') },
      { key: 'scan',     conv: 0.92, enter: () => this._enterScan() },
      { key: 'hold',     conv: 1.0,  enter: () => this._enterBeat('hold') },
    ];

    this._buildStream();
    this._buildCells();
    this._buildScanLine();
    this._buildPanel();

    // eased telemetry values
    this.tele = { analyzed: 0, fixed: 0, recovery: 0, stability: 0, bytes: 0 };
  }

  // ------------------------------------------------------------ construction
  _streamCounts() {
    const q = this.app.profile.particleBudget;
    const dens = this.app.params.streamDensity;
    const cols = Math.round(clamp((q / 5200) * 46, 30, 150) * dens);
    return { cols, rows: HEX_ROWS };
  }

  _buildStream() {
    if (this.streamMesh) {
      this.scene.remove(this.streamMesh);
      this.streamMesh.geometry.dispose(); this.streamMesh.material.dispose();
    }
    const { cols, rows } = this._streamCounts();
    const n = cols * rows;
    this.streamCount = n;

    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    geo.instanceCount = n;

    const aX = new Float32Array(n), aZ = new Float32Array(n), aRow = new Float32Array(n);
    const aSpeed = new Float32Array(n), aPhase = new Float32Array(n), aTail = new Float32Array(n);
    const aSeed = new Float32Array(n), aScale = new Float32Array(n);
    const rng = mulberry32(1337);
    let i = 0;
    for (let c = 0; c < cols; c++) {
      const x = (c / (cols - 1) - 0.5);
      const speed = 0.9 + rng() * 2.4;         // chars fall at independent speeds
      const phase = rng() * 100;
      const tail = 4 + rng() * 9;
      const seed = rng() * 1000;
      const z = -1.3 - rng() * 3.4;            // depth layers for parallax
      const scale = 0.75 + rng() * 0.55;
      for (let r = 0; r < rows; r++, i++) {
        aX[i] = x; aZ[i] = z; aRow[i] = r;
        aSpeed[i] = speed; aPhase[i] = phase; aTail[i] = tail;
        aSeed[i] = seed + r * 0.013; aScale[i] = scale;
      }
    }
    this._streamNormX = aX.slice(); // keep normalized copy for relayout
    geo.setAttribute('aX', new THREE.InstancedBufferAttribute(aX, 1));
    geo.setAttribute('aZ', new THREE.InstancedBufferAttribute(aZ, 1));
    geo.setAttribute('aRow', new THREE.InstancedBufferAttribute(aRow, 1));
    geo.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(aSpeed, 1));
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(aPhase, 1));
    geo.setAttribute('aTail', new THREE.InstancedBufferAttribute(aTail, 1));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
    geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(aScale, 1));

    this.streamUniforms = {
      uTime: { value: 0 }, uConv: { value: 0 }, uMut: { value: 4 },
      uMeanSpeed: { value: 1.9 }, uTop: { value: 7 }, uSpan: { value: 14 },
      uCharW: { value: 0.16 }, uCharH: { value: 0.24 },
      uColor: { value: new THREE.Color(0x8a5a00) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.streamUniforms,
      vertexShader: HEX_VERT, fragmentShader: HEX_FRAG,
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.streamMesh = new THREE.Mesh(geo, mat);
    this.streamMesh.frustumCulled = false;
    this.streamMesh.userData.isParticle = true;
    this.streamMesh.renderOrder = -2;
    this.scene.add(this.streamMesh);
  }

  _buildCells() {
    if (this.cellMesh) {
      this.scene.remove(this.cellMesh);
      this.cellMesh.geometry.dispose(); this.cellMesh.material.dispose();
    }
    const cols = this.layout ? this.layout.cols : 40;
    const rows = 3;
    const n = cols * rows;
    this.cellCount = n;
    this.cellCols = cols;

    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    geo.instanceCount = n;

    const aCell = new Float32Array(n * 2);
    const aSeed = new Float32Array(n);
    this.aRepair = new Float32Array(n).fill(-1);
    this.aDamaged = new Float32Array(n);
    const rng = mulberry32(999);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        aCell[i * 2] = c; aCell[i * 2 + 1] = 1 - r;  // row 1 on top
        aSeed[i] = rng();
      }
    }
    geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(aCell, 2));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
    this.repairAttr = new THREE.InstancedBufferAttribute(this.aRepair, 1);
    this.repairAttr.setUsage(THREE.DynamicDrawUsage);
    this.damagedAttr = new THREE.InstancedBufferAttribute(this.aDamaged, 1);
    this.damagedAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aRepair', this.repairAttr);
    geo.setAttribute('aDamaged', this.damagedAttr);

    this.cellUniforms = {
      uTime: { value: 0 },
      uOrigin: { value: new THREE.Vector2(0, 0) },
      uSpacing: { value: new THREE.Vector2(0.5, 0.4) },
      uCell: { value: new THREE.Vector2(0.42, 0.3) },
      uScanX: { value: -1000 },
      uScanActive: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.cellUniforms,
      vertexShader: CELL_VERT, fragmentShader: CELL_FRAG,
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.cellMesh = new THREE.Mesh(geo, mat);
    this.cellMesh.frustumCulled = false;
    this.cellMesh.userData.isParticle = false;
    this.scene.add(this.cellMesh);
    this._randomizeDamage();
  }

  _buildScanLine() {
    const geo = new THREE.PlaneGeometry(1, 1);
    this.scanUniforms = { uActive: { value: 0 }, uTime: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.scanUniforms,
      vertexShader: SCAN_VERT, fragmentShader: SCAN_FRAG,
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.scanMesh = new THREE.Mesh(geo, mat);
    this.scanMesh.frustumCulled = false;
    this.scanMesh.userData.isParticle = false;
    this.scene.add(this.scanMesh);
  }

  _buildPanel() {
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.ShaderMaterial({
      vertexShader: SCAN_VERT, fragmentShader: PANEL_FRAG,
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.panelMesh = new THREE.Mesh(geo, mat);
    this.panelMesh.frustumCulled = false;
    this.panelMesh.renderOrder = -1;
    this.scene.add(this.panelMesh);
  }

  // ------------------------------------------------------------ layout
  relayout(viewW, viewH) {
    const streamDens = this.app.params.streamDensity;
    const cols = clamp(Math.round((viewW * 0.74) / 0.34), 18, 96);
    const layout = {
      viewW, viewH,
      arrayW: viewW * 0.74,
      cols,
      rows: 3,
      cellGap: 1.18,
    };
    layout.cellW = (layout.arrayW / cols) / layout.cellGap * 0.86;
    layout.cellH = Math.min(layout.cellW * 0.66, viewH * 0.13);
    layout.spacingX = layout.arrayW / cols;
    layout.spacingY = layout.cellH * 1.5;
    layout.arrayH = layout.spacingY * 2 + layout.cellH;
    layout.originX = -layout.arrayW / 2 + layout.spacingX / 2;
    layout.originY = -layout.spacingY;
    layout.charW = 0.175 * (0.8 + 0.4 * streamDens);
    layout.charH = layout.charW * 1.55;

    const changed = !this.layout || this.layout.cols !== cols;
    this.layout = layout;

    // hex stream field metrics
    const u = this.streamUniforms;
    u.uCharW.value = layout.charW; u.uCharH.value = layout.charH;
    u.uTop.value = viewH * 0.72;
    u.uSpan.value = viewH * 1.44 + HEX_ROWS * layout.charH + 0.4;
    // spread columns a bit beyond the viewport width (bake into attribute,
    // so glyph proportions are untouched)
    const posAttr = this.streamMesh.geometry.getAttribute('aX');
    for (let i = 0; i < posAttr.count; i++) posAttr.array[i] = this._streamNormX[i] * viewW * 1.3;
    posAttr.needsUpdate = true;

    // cells
    const cu = this.cellUniforms;
    cu.uOrigin.value.set(layout.originX, layout.originY);
    cu.uSpacing.value.set(layout.spacingX, layout.spacingY);
    cu.uCell.value.set(layout.cellW, layout.cellH);

    if (changed) this._buildCells();

    // scan line
    this.scanTrail = Math.max(0.45, layout.arrayW * 0.055);
    this.scanMesh.scale.set(this.scanTrail, layout.arrayH + 0.9, 1);
    this.scanMesh.position.set(-layout.arrayW / 2, 0, 0.05);

    // backing panel
    this.panelMesh.scale.set(layout.arrayW + 0.7, layout.arrayH + 0.75, 1);
    this.panelMesh.position.set(0, 0, -0.08);

    this._computePresets();
  }

  _computePresets() {
    const { arrayW, viewH } = this.layout;
    this.presets = {
      closeup:  { pos: [arrayW * 0.14, 0.8, 4.4], tgt: [arrayW * 0.10, 0, 0] },
      wide:     { pos: [0, 1.3, 11.6], tgt: [0, 0, 0] },
      topdown:  { pos: [0, viewH * 0.92, 4.2], tgt: [0, -0.3, -0.3] },
      immersive:{ pos: [-arrayW * 0.52, -2.6, 2.4], tgt: [arrayW * 0.25, 0.8, -2.2] },
    };
  }

  getPreset(name) { return this.presets[name] || this.presets.wide; }
  get defaultPreset() { return 'wide'; }
  get presetNames() { return Object.keys(this.presets); }

  // ------------------------------------------------------------ narrative
  _beatDur(key) {
    const p = this.app.params;
    const map = { idle: p.beatIdle, engage: p.beatEngage, analysis: p.beatAnalysis, hold: p.beatHold };
    if (key === 'scan') return 4.2 / p.scanSpeed;   // single sweep ≈ 4.2 s at 1×
    return (map[key] || 2.5);
  }

  _randomizeDamage() {
    const rate = this.app.params.damageRate;
    const rng = mulberry32((Math.random() * 1e9) | 0);
    let damaged = 0;
    for (let i = 0; i < this.cellCount; i++) {
      const d = rng() < rate ? 1 : 0;
      this.aDamaged[i] = d;
      this.aRepair[i] = -1;
      damaged += d;
    }
    this.damagedTotal = damaged;
    this.damagedAttr.needsUpdate = true;
    this.repairAttr.needsUpdate = true;
    this._repairQueue = null;
  }

  _enterIdle() {
    this._randomizeDamage();
    this.scanActive = false;
    this.scanX = -1e3;
    this.app.audio.scanHum(false);
    this.app.hud.log('a', LOG_LINES.idle);
    this.app.hud.caption(CAPTIONS.idle);
  }
  _enterBeat(key) {
    if (key === 'hold') this.app.audio.scanHum(false);
    this.app.hud.log('a', LOG_LINES[key]);
    this.app.hud.caption(CAPTIONS[key]);
  }
  _enterScan() {
    this.scanActive = true;
    this.scanT = 0;
    this.app.audio.scanHum(true);
    this.app.hud.log('a', LOG_LINES.scan);
    this.app.hud.caption(CAPTIONS.scan);
    // pre-compute repair order: damaged cells sorted by world x
    const { originX, spacingX } = this.layout;
    const q = [];
    for (let i = 0; i < this.cellCount; i++) {
      if (this.aDamaged[i] > 0.5) {
        const c = i % this.cellCols;
        q.push({ i, x: originX + c * spacingX });
      }
    }
    q.sort((a, b) => a.x - b.x);
    this._repairQueue = q;
    this._repairCursor = 0;
    this._repairedCount = 0;
  }

  nextBeat() { this._setBeat((this.beatIndex + 1) % this.beats.length); }
  _setBeat(i) {
    this.beatIndex = i;
    this.beatTime = 0;
    const b = this.beats[i];
    this.convTarget = b.conv;
    b.enter();
    this.app.hud.setBeat('a', `${i + 1}/5 · ${b.key}`);
  }

  reset() { this._setBeat(0); }

  // ------------------------------------------------------------ frame update
  update(dt) {
    const p = this.app.params;
    this.time += dt;
    this.beatTime += dt;

    const beat = this.beats[this.beatIndex];
    const dur = this._beatDur(beat.key) / p.pacing;
    if (this.app.params.auto && this.beatTime >= dur) this.nextBeat();

    // entropy convergence eases toward beat target
    this.conv = damp(this.conv, this.convTarget, 1.8, dt);

    // scan sweep + repair triggering
    if (this.scanActive && this._repairQueue) {
      const scanDur = this._beatDur('scan') / p.pacing;
      // in the hold beat the sweep is complete: park the edge off the right side
      this.scanT = this.beatIndex >= 4 ? 1 : clamp(this.beatTime / scanDur, 0, 1);
      const left = -this.layout.arrayW / 2;
      this.scanX = left + this.scanT * this.layout.arrayW;
      this.scanMesh.position.x = this.scanX - this.scanTrail / 2;
      while (this._repairCursor < this._repairQueue.length &&
             this._repairQueue[this._repairCursor].x <= this.scanX) {
        const cell = this._repairQueue[this._repairCursor++];
        this.aRepair[cell.i] = this.time;
        this.repairAttr.needsUpdate = true;
        this.app.audio.repairDing();
      }
      // count completed repairs (transition finished)
      let done = 0;
      for (let k = 0; k < this._repairCursor; k++) {
        if (this.time - this.aRepair[this._repairQueue[k].i] >= REPAIR_TIME) done++;
      }
      this._repairedCount = done;
    }

    // uniforms
    this.streamUniforms.uTime.value = this.time;
    this.streamUniforms.uConv.value = this.conv;
    this.streamUniforms.uMut.value = p.hexMutation;
    this.cellUniforms.uTime.value = this.time;
    this.cellUniforms.uScanX.value = this.scanX;
    const sweeping = this.scanActive && this.scanT < 1;
    this.cellUniforms.uScanActive.value = sweeping ? 1 : 0;
    this.scanUniforms.uActive.value = sweeping ? 1 : 0;
    this.scanUniforms.uTime.value = this.time;

    this._updateTelemetry(dt);
  }

  _updateTelemetry(dt) {
    const total = this.cellCount;
    let analyzed = total;
    if (this.scanActive && this._repairQueue) {
      const c = clamp(this.scanT, 0, 1);
      analyzed = Math.round(total * (this.beatIndex >= 4 ? 1 : c));
    } else if (this.beatIndex < 3) analyzed = Math.round(total * [0.12, 0.3, 0.55][this.beatIndex]);
    const fixed = this.beatIndex >= 4 ? this.damagedTotal : (this._repairedCount || 0);
    const recovery = this.damagedTotal ? fixed / this.damagedTotal : 1;
    const stability = this.conv;
    const bytes = recovery * this.totalBytes;

    const t = this.tele, L = 6;
    t.analyzed = damp(t.analyzed, analyzed, L, dt);
    t.fixed = damp(t.fixed, fixed, L, dt);
    t.recovery = damp(t.recovery, recovery * 100, L, dt);
    t.stability = damp(t.stability, stability * 100, L, dt);
    t.bytes = damp(t.bytes, bytes, L, dt);

    this.app.hud.telemetryA({
      analyzed: Math.round(t.analyzed), total,
      damaged: this.damagedTotal,
      fixed: Math.round(t.fixed),
      recovery: t.recovery,
      stability: t.stability,
      bytes: `${formatGB(t.bytes)} / ${this.totalBytes} GB`,
    });
  }

  // ------------------------------------------------------------ debug / info
  get particleCount() { return this.streamCount; }
  setParticleViz(on) {
    this.cellMesh.visible = !on;
    this.scanMesh.visible = !on;
    this.panelMesh.visible = !on;
  }
  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}
