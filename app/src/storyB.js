// storyB.js — Sixty Seconds
// Procedural USB topology · GPU particle current · diagnostic ring waves ·
// check cards · root-cause panel · DC-jack interaction · 60 s stopwatch.
import * as THREE from 'three';
import { clamp, lerp, damp, easeOutCubic, mulberry32, formatTimer, el } from './utils.js';

const DEVICES = [
  { key: 'keyboard',   name: 'KEYBOARD',   angle: 150, radius: 4.5, power: '96 mA',  latency: '1.2 ms', err: '0.00 %', failing: false },
  { key: 'mouse',      name: 'MOUSE',      angle: 100, radius: 4.2, power: '102 mA', latency: '1.0 ms', err: '0.00 %', failing: false },
  { key: 'headphones', name: 'HEADPHONES', angle: 50,  radius: 4.6, power: '238 mA', latency: '2.4 ms', err: '0.00 %', failing: false },
  { key: 'speaker',    name: 'SPEAKER',    angle: 0,   radius: 4.3, power: '382 mA', latency: '3.1 ms', err: '0.41 % (rec.)', failing: true },
  { key: 'mic',        name: 'MIC',        angle: -52, radius: 4.7, power: '310 mA', latency: '2.8 ms', err: '0.37 % (rec.)', failing: true },
];

const PHASES = [
  { key: 'Idle',        until: 6  },
  { key: 'Querying',    until: 13 },
  { key: 'Enumerating', until: 33 },
  { key: 'Analyzing',   until: 45 },
  { key: 'Concluded',   until: 60 },
];
const WAVE_TIMES = [14, 17.6, 21.2, 24.8, 28.4];   // one wave per device
const PANEL_T = 45.5, DC_T = 49.0, LOOP_T = 60;

const LOG = {
  Idle: [
    ['! ', 'full-tunnel VPN forced a dual-host rig · 2 PCs, 1 USB switch + hub'],
    ['! ', 'speaker + mic intermittently silent — everything else flawless'],
  ],
  Querying: [
    ['❯ ', 'opencode> hardware fault? writing PowerShell to enumerate USB…'],
    ['❯ ', 'Get-PnpDevice | Where-Object Class -in "USB","AudioEndpoint"'],
  ],
  Enumerating: [
    ['≈ ', 'sweeping topology — querying every device on the bus'],
  ],
  Analyzing: [
    ['≈ ', 'cross-checking power draw · latency · error counters'],
  ],
  Concluded: [
    ['✓ ', 'hardware healthy — likely insufficient USB power'],
    ['✓ ', 'user spotted the hub\'s unused DC jack · plugged in · fixed instantly'],
  ],
};
const CAPTIONS = {
  Idle: 'Weeks of blaming the hub and the switch. Speaker and mic keep dropping.',
  Querying: '<b>opencode</b> writes PowerShell to enumerate and check every USB device.',
  Enumerating: 'Diagnostic sweeps ripple out from the hub, checking each device in turn.',
  Analyzing: 'Every device enumerates cleanly. The hardware is fine.',
  Concluded: '<b>Insufficient USB power.</b> One DC jack later — the problem vanishes instantly.',
};

// ---------------------------------------------------------------- shaders
const PREMULT = {
  transparent: true, depthWrite: false,
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
};

const PART_VERT = /* glsl */`
attribute vec3 aP0, aP1, aP2, aP3;
attribute float aOffset, aSpeed, aSize, aSeed, aLink;
uniform float uTime, uFlow, uPointScale;
uniform float uFail[5], uFixed[5];
varying float vAlpha, vMix, vBoost, vFixed;
float hash(float n) { return fract(sin(n) * 43758.5453123); }
vec3 bez(vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
  float u = 1.0 - t;
  return u*u*u*p0 + 3.0*u*u*t*p1 + 3.0*u*t*t*p2 + t*t*t*p3;
}
void main() {
  int li = int(aLink + 0.5);
  float fail = uFail[li] * (1.0 - uFixed[li]);
  // stutter: failing links move in bursts, healthy ones flow steadily
  float gate = mix(1.0, smoothstep(0.22, 0.78, 0.5 + 0.5 * sin(uTime * 2.7 + aSeed * 17.0)), fail * 0.9);
  float t = fract(aOffset + uTime * aSpeed * uFlow * gate);
  vec3 pos = bez(aP0, aP1, aP2, aP3, t);
  pos.xy += vec2(sin(aSeed * 91.0 + uTime * 3.0), cos(aSeed * 57.0 + uTime * 2.3)) * 0.018 * (1.0 + fail * 2.5);
  // intermittent gaps + flicker + dropped frames on failing links
  float gap = step(0.30, hash(floor(t * 9.0) * 3.7 + floor(uTime * 1.8) * 11.0));
  float flick = 1.0 - 0.6 * step(0.45, hash(floor(uTime * 11.0) + aSeed * 7.0));
  vAlpha = 0.9 * mix(1.0, gap * flick, fail);
  vMix = uFail[li];        // static: this link is one of the failing pair
  vFixed = uFixed[li];     // heal ramp 0→1 after DC power
  // most carriers stay dark and readable; ~10 % run hot and fire the bloom
  float hot = step(0.90, hash(aSeed * 3.31));
  vBoost = mix(1.15 + 1.5 * hot, 1.6 + 0.9 * hash(aSeed + floor(uTime * 8.0)), fail);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = aSize * uPointScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const PART_FRAG = /* glsl */`
precision highp float;
uniform vec3 uColorOk, uColorFail, uColorHeal;
varying float vAlpha, vMix, vBoost, vFixed;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float mask = 1.0 - smoothstep(0.10, 0.5, d);
  // healthy links run gold; the failing pair eases red → green as DC power heals it
  vec3 failCol = mix(uColorFail, uColorHeal, vFixed);
  vec3 col = mix(uColorOk, failCol, vMix) * vBoost;
  float a = mask * vAlpha;
  gl_FragColor = vec4(col * a, a);
}`;

const TUBE_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const TUBE_FRAG = /* glsl */`
precision highp float;
uniform float uTime, uFail, uFixed, uFlow;
uniform vec3 uColorOk, uColorFail, uColorHeal;
varying vec2 vUv;
void main() {
  float fail = uFail * (1.0 - uFixed);
  float pulse = pow(0.5 + 0.5 * sin((vUv.x * 5.0 - uTime * 1.4 * uFlow) * 6.2831), 2.0);
  float drop = mix(1.0, step(0.35, fract(sin(floor(uTime * 2.2) * 12.9) * 43758.5)), fail * 0.8);
  float b = (0.30 + 0.60 * pulse) * drop;
  vec3 col = mix(uColorOk, mix(uColorFail, uColorHeal, uFixed), uFail) * (0.85 + 1.7 * b);
  float a = 0.40 * b + 0.13;
  gl_FragColor = vec4(col * a, a);
}`;

const HUB_RING_FRAG = /* glsl */`
precision highp float;
uniform float uTime, uCharge, uQuery;
uniform vec3 uBrass, uPorcelain;
varying vec2 vUv; varying vec2 vPos;
void main() {
  float ang = atan(vPos.y, vPos.x);
  float dash = 0.5 + 0.5 * sin(ang * 3.0 - uTime * 1.8);
  float queryPulse = uQuery * (0.5 + 0.5 * sin(uTime * 9.0));
  vec3 col = uBrass * (0.8 + 0.7 * dash) + uPorcelain * (uCharge * 1.5 + queryPulse * 1.2);
  float a = 0.72 + 0.2 * dash;
  gl_FragColor = vec4(col * a, a);
}`;

const HUB_DISC_FRAG = /* glsl */`
precision highp float;
uniform float uTime, uCharge;
uniform vec3 uBrass, uPorcelain;
varying vec2 vUv; varying vec2 vPos;
void main() {
  float r = length(vPos);
  float breathe = 0.5 + 0.5 * sin(uTime * 1.4);
  vec3 col = uBrass * 0.9 + uPorcelain * uCharge * 1.2;
  float a = (0.10 + 0.05 * breathe) * (1.0 - smoothstep(0.15, 1.0, r)) + uCharge * 0.35 * (1.0 - smoothstep(0.0, 1.0, r));
  gl_FragColor = vec4(col * a, a);
}`;

const NODE_RING_FRAG = /* glsl */`
precision highp float;
uniform float uTime, uPing;
uniform int uState; // 0 unknown · 1 ok · 2 failing
uniform vec3 uBrass;
varying vec2 vUv;
void main() {
  vec3 c; float a;
  if (uState == 2) {
    float p = 0.55 + 0.45 * sin(6.2831 * uTime);
    c = vec3(0.552, 0.058, 0.058) * (1.6 + p * 1.2); a = 0.60 + 0.32 * p;   // failing red pulse
  } else if (uState == 1) {
    c = vec3(0.148, 0.353, 0.081) * 3.1; a = 0.9;                            // healthy green + glow
  } else {
    c = uBrass; a = 0.55;
  }
  c += vec3(1.0, 0.983, 0.900) * uPing * 1.3;
  a = clamp(a + uPing * 0.25, 0.0, 1.0);
  gl_FragColor = vec4(c * a, a);
}`;

const NODE_DISC_FRAG = /* glsl */`
precision highp float;
uniform float uTime;
uniform int uState;
uniform vec3 uBrass;
varying vec2 vUv; varying vec2 vPos;
void main() {
  vec3 c = uState == 2 ? vec3(0.552, 0.058, 0.058) : (uState == 1 ? vec3(0.148, 0.353, 0.081) : uBrass);
  float r = length(vPos);
  float a = 0.09 * (1.0 - smoothstep(0.1, 1.0, r));
  gl_FragColor = vec4(c * a, a);
}`;

const WAVE_FRAG = /* glsl */`
precision highp float;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  vec3 col = vec3(1.0, 0.983, 0.900) * 1.5;
  float a = uAlpha;
  gl_FragColor = vec4(col * a, a);
}`;

const SIMPLE_VERT = /* glsl */`
varying vec2 vUv; varying vec2 vPos;
void main() { vUv = uv; vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const BRASS = new THREE.Color(0x8a5a00);
const PORCELAIN = new THREE.Color(1.0, 0.992, 0.957);
const COLOR_OK = new THREE.Color(0.40, 0.285, 0.06);  // dark warm gold — reads on porcelain
const COLOR_FAIL = new THREE.Color(0.62, 0.10, 0.075);
const COLOR_HEAL = new THREE.Color(0.148, 0.353, 0.081);

export class StoryB {
  constructor(app) {
    this.app = app;
    this.scene = new THREE.Scene();
    this.id = 'b';
    this.name = 'Sixty Seconds';

    this.time = 0;          // shader clock
    this.timeline = 0;      // narrative stopwatch 0→60
    this.phase = 'Idle';
    this.wavesFired = new Set();
    this.scanned = new Set();
    this.panelShown = false;
    this.dcState = 'hidden'; // hidden | sliding | docked
    this.dcT = 0;
    this.fixedRamp = 0;      // 0→1 failing links healed
    this.stability = 55;

    this._buildHub();
    this._buildDevices();
    this._buildLinks();
    this._buildParticles();
    this._buildWaves();
    this._buildDCJack();
    this._buildOverlay();
  }

  // ------------------------------------------------------------ hub
  _buildHub() {
    this.hub = new THREE.Group();
    this.hubUniforms = {
      uTime: { value: 0 }, uCharge: { value: 0 }, uQuery: { value: 0 },
      uBrass: { value: BRASS }, uPorcelain: { value: PORCELAIN },
    };
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.78, 0.98, 6),
      new THREE.ShaderMaterial({
        uniforms: this.hubUniforms, vertexShader: SIMPLE_VERT, fragmentShader: HUB_RING_FRAG, ...PREMULT,
      })
    );
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.74, 6),
      new THREE.ShaderMaterial({
        uniforms: this.hubUniforms, vertexShader: SIMPLE_VERT, fragmentShader: HUB_DISC_FRAG, ...PREMULT,
      })
    );
    disc.position.z = -0.01;
    this.hubSpin = new THREE.Mesh(
      new THREE.RingGeometry(1.10, 1.14, 64, 1, 0, Math.PI * 1.35),
      new THREE.MeshBasicMaterial({ color: 0x8a5a00, transparent: true, opacity: 0.4, depthWrite: false })
    );
    this.hub.add(ring, disc, this.hubSpin);
    this.hub.userData.isParticle = false;
    this.scene.add(this.hub);
  }

  // ------------------------------------------------------------ devices
  _buildDevices() {
    this.deviceGroups = [];
    this.nodeUniforms = [];
    for (const d of DEVICES) {
      const g = new THREE.Group();
      const rad = (d.angle * Math.PI) / 180;
      g.position.set(Math.cos(rad) * d.radius, Math.sin(rad) * d.radius, 0);
      const uniforms = {
        uTime: { value: 0 }, uPing: { value: 0 }, uState: { value: d.failing ? 2 : 0 },
        uBrass: { value: BRASS },
      };
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.42, 0.52, 48),
        new THREE.ShaderMaterial({ uniforms, vertexShader: SIMPLE_VERT, fragmentShader: NODE_RING_FRAG, ...PREMULT })
      );
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(0.42, 48),
        new THREE.ShaderMaterial({ uniforms, vertexShader: SIMPLE_VERT, fragmentShader: NODE_DISC_FRAG, ...PREMULT })
      );
      disc.position.z = -0.01;
      const icon = this._buildIcon(d.key);
      icon.position.z = 0.01;
      icon.scale.setScalar(0.58);
      g.add(ring, disc, icon);
      g.userData.device = d;
      g.userData.isParticle = false;
      this.scene.add(g);
      this.deviceGroups.push(g);
      this.nodeUniforms.push(uniforms);
      d.pos = g.position.clone();
    }
  }

  _buildIcon(key) {
    const g = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: 0x8a5a00, transparent: true, opacity: 0.95, depthWrite: false });
    const ptsMat = new THREE.PointsMaterial({ color: 0x8a5a00, size: 0.055, transparent: true, opacity: 0.95, depthWrite: false });
    const lines = [];
    const seg = (x1, y1, x2, y2) => lines.push(x1, y1, 0, x2, y2, 0);
    const poly = (cx, cy, r, n, a0 = 0, a1 = Math.PI * 2) => {
      const steps = Math.max(3, Math.round(n * Math.abs(a1 - a0) / (Math.PI * 2)));
      for (let i = 0; i < steps; i++) {
        const t0 = a0 + (a1 - a0) * (i / steps), t1 = a0 + (a1 - a0) * ((i + 1) / steps);
        seg(cx + Math.cos(t0) * r, cy + Math.sin(t0) * r, cx + Math.cos(t1) * r, cy + Math.sin(t1) * r);
      }
    };
    const dots = [];
    if (key === 'keyboard') {
      seg(-0.5, -0.28, 0.5, -0.28); seg(0.5, -0.28, 0.5, 0.28);
      seg(0.5, 0.28, -0.5, 0.28); seg(-0.5, 0.28, -0.5, -0.28);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) dots.push(-0.28 + c * 0.28, -0.13 + r * 0.26, 0);
    } else if (key === 'mouse') {
      poly(0, 0, 0.3, 28);
      seg(0, 0.3, 0, 0.08);
    } else if (key === 'headphones') {
      poly(0, -0.05, 0.36, 24, 0, Math.PI);
      seg(-0.36, -0.05, -0.36, -0.3); seg(-0.44, -0.3, -0.44, -0.02);
      seg(-0.44, -0.02, -0.36, -0.02); seg(-0.44, -0.3, -0.36, -0.3);
      seg(0.36, -0.05, 0.36, -0.3); seg(0.44, -0.3, 0.44, -0.02);
      seg(0.44, -0.02, 0.36, -0.02); seg(0.44, -0.3, 0.36, -0.3);
    } else if (key === 'speaker') {
      seg(-0.42, -0.14, -0.18, -0.14); seg(-0.18, -0.14, 0.06, -0.32);
      seg(0.06, -0.32, 0.06, 0.32); seg(0.06, 0.32, -0.18, 0.14);
      seg(-0.18, 0.14, -0.42, 0.14); seg(-0.42, 0.14, -0.42, -0.14);
      poly(0.06, 0, 0.24, 12, -0.8, 0.8); poly(0.06, 0, 0.40, 12, -0.7, 0.7);
    } else if (key === 'mic') {
      poly(0, 0.16, 0.16, 20); seg(-0.16, 0.16, -0.16, -0.02); seg(0.16, 0.16, 0.16, -0.02);
      poly(0, -0.02, 0.16, 12, Math.PI, Math.PI * 2);
      poly(0, -0.02, 0.3, 18, Math.PI * 1.15, Math.PI * 1.85);
      seg(0, -0.32, 0, -0.44); seg(-0.16, -0.44, 0.16, -0.44);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lines), 3));
    g.add(new THREE.LineSegments(lg, mat));
    if (dots.length) {
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(dots), 3));
      g.add(new THREE.Points(dg, ptsMat));
    }
    return g;
  }

  // ------------------------------------------------------------ links (bezier tubes)
  _buildLinks() {
    this.curves = [];
    this.linkUniforms = [];
    for (const d of DEVICES) {
      const dir = d.pos.clone().normalize();
      const perp = new THREE.Vector3(-dir.y, dir.x, 0);
      const p0 = dir.clone().multiplyScalar(1.0);
      const p3 = d.pos.clone().sub(dir.clone().multiplyScalar(0.62));
      const p1 = p0.clone().add(dir.clone().multiplyScalar(1.25)).add(perp.clone().multiplyScalar(0.55));
      const p2 = p3.clone().sub(dir.clone().multiplyScalar(1.25)).add(perp.clone().multiplyScalar(0.55));
      const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
      this.curves.push({ p0, p1, p2, p3, curve });

      const uniforms = {
        uTime: { value: 0 }, uFlow: { value: 1 },
        uFail: { value: d.failing ? 1 : 0 }, uFixed: { value: 0 },
        uColorOk: { value: COLOR_OK }, uColorFail: { value: COLOR_FAIL }, uColorHeal: { value: COLOR_HEAL },
      };
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 56, 0.024, 6, false),
        new THREE.ShaderMaterial({ uniforms, vertexShader: TUBE_VERT, fragmentShader: TUBE_FRAG, ...PREMULT })
      );
      tube.userData.isParticle = false;
      this.scene.add(tube);
      this.linkUniforms.push(uniforms);
    }
  }

  // ------------------------------------------------------------ GPU particle current
  _particleTotal() {
    const q = this.app.profile.particleBudget;
    return Math.round(q * 0.62 * this.app.params.particleDensity);
  }

  _buildParticles() {
    if (this.particlePoints) {
      this.scene.remove(this.particlePoints);
      this.particlePoints.geometry.dispose(); this.particlePoints.material.dispose();
    }
    const total = this._particleTotal();
    const perLink = Math.max(40, Math.floor(total / DEVICES.length));
    const n = perLink * DEVICES.length;
    this.particleCount = n;

    const aP0 = new Float32Array(n * 3), aP1 = new Float32Array(n * 3), aP2 = new Float32Array(n * 3), aP3 = new Float32Array(n * 3);
    const aOffset = new Float32Array(n), aSpeed = new Float32Array(n), aSize = new Float32Array(n);
    const aSeed = new Float32Array(n), aLink = new Float32Array(n);
    const rng = mulberry32(60422);
    let i = 0;
    for (let l = 0; l < DEVICES.length; l++) {
      const { p0, p1, p2, p3 } = this.curves[l];
      for (let k = 0; k < perLink; k++, i++) {
        aP0.set([p0.x, p0.y, p0.z], i * 3); aP1.set([p1.x, p1.y, p1.z], i * 3);
        aP2.set([p2.x, p2.y, p2.z], i * 3); aP3.set([p3.x, p3.y, p3.z], i * 3);
        aOffset[i] = rng();
        aSpeed[i] = 0.10 + rng() * 0.10;         // even spacing, stable speed
        aSize[i] = 0.045 + rng() * 0.05;
        aSeed[i] = rng() * 100;
        aLink[i] = l;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); // required by three
    geo.setAttribute('aP0', new THREE.BufferAttribute(aP0, 3));
    geo.setAttribute('aP1', new THREE.BufferAttribute(aP1, 3));
    geo.setAttribute('aP2', new THREE.BufferAttribute(aP2, 3));
    geo.setAttribute('aP3', new THREE.BufferAttribute(aP3, 3));
    geo.setAttribute('aOffset', new THREE.BufferAttribute(aOffset, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    geo.setAttribute('aLink', new THREE.BufferAttribute(aLink, 1));

    this.particleUniforms = {
      uTime: { value: 0 }, uFlow: { value: 1 }, uPointScale: { value: 800 },
      uFail: { value: DEVICES.map((d) => (d.failing ? 1 : 0)) },
      uFixed: { value: [0, 0, 0, 0, 0] },
      uColorOk: { value: COLOR_OK }, uColorFail: { value: COLOR_FAIL }, uColorHeal: { value: COLOR_HEAL },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.particleUniforms,
      vertexShader: PART_VERT, fragmentShader: PART_FRAG, ...PREMULT,
    });
    this.particlePoints = new THREE.Points(geo, mat);
    this.particlePoints.frustumCulled = false;
    this.particlePoints.userData.isParticle = true;
    this.scene.add(this.particlePoints);
  }

  rebuildParticles() { this._buildParticles(); }

  // ------------------------------------------------------------ diagnostic waves
  _buildWaves() {
    this.wavePool = [];
    const geo = new THREE.RingGeometry(0.94, 1.0, 128);
    for (let i = 0; i < 8; i++) {
      const uniforms = { uAlpha: { value: 0 } };
      const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
        uniforms, vertexShader: SIMPLE_VERT, fragmentShader: WAVE_FRAG, ...PREMULT,
      }));
      m.visible = false; m.userData.isParticle = false;
      this.scene.add(m);
      this.wavePool.push({ mesh: m, uniforms, active: false, t: 0, targetR: 0, deviceIdx: -1 });
    }
  }

  _fireWave(deviceIdx) {
    const w = this.wavePool.find((x) => !x.active);
    if (!w) return;
    w.active = true; w.t = 0;
    w.targetR = DEVICES[deviceIdx].radius + 0.4;
    w.deviceIdx = deviceIdx;
    w.mesh.visible = true;
  }

  // ------------------------------------------------------------ DC jack
  _buildDCJack() {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x6b4600, depthWrite: true });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 20), mat);
    body.rotation.z = Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.3, 16), mat);
    tip.rotation.z = Math.PI / 2; tip.position.x = -0.38;
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.032, 10, 26), mat);
    collar.rotation.y = Math.PI / 2; collar.position.x = 0.2;
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.32, 0, 0), new THREE.Vector3(1.0, 0.35, 0),
      new THREE.Vector3(1.9, 0.15, 0), new THREE.Vector3(2.7, 0.65, 0),
    ]);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 32, 0.05, 6), mat);
    g.add(body, tip, collar, cable);
    g.visible = false;
    g.userData.isParticle = false;
    this.dcJack = g;
    this.scene.add(g);
  }

  plugDC() {
    if (this.dcState !== 'hidden') return;
    this.dcState = 'sliding';
    this.dcT = 0;
    this.dcJack.visible = true;
  }

  // ------------------------------------------------------------ DOM overlay
  _buildOverlay() {
    const ov = this.app.overlay;
    this.labels = [];
    this.cards = [];
    for (const d of DEVICES) {
      const lab = el('div', 'dev-label', ov, d.name);
      lab.style.display = 'none';
      this.labels.push(lab);

      const card = el('div', 'check-card', ov);
      card.innerHTML = `
        <h4>${d.name}<span class="st">OK</span></h4>
        <div class="cc-row"><span class="k">Status</span><span class="v">enumerated</span></div>
        <div class="cc-row"><span class="k">Power draw</span><span class="v">${d.power}</span></div>
        <div class="cc-row"><span class="k">Latency</span><span class="v">${d.latency}</span></div>
        <div class="cc-row"><span class="k">Error rate</span><span class="v">${d.err}</span></div>`;
      card.style.display = 'none';
      this.cards.push(card);
    }

    const rc = el('div', '', ov);
    rc.id = 'rootcause';
    rc.innerHTML = `
      <h2>OPENCODE · ROOT CAUSE — 60 s</h2>
      <p><b>Hardware healthy.</b> All five devices enumerate cleanly; error counters are empty.</p>
      <p>Likely cause: <b>insufficient USB power</b> on the unpowered hub — the speaker and mic brown out together.</p>
      <div class="rc-action">Action: plug the audio devices straight into the motherboard to verify.</div>
      <button class="tbtn" id="rc-plug">⚡ Plug in the hub's DC power</button>`;
    rc.querySelector('#rc-plug').addEventListener('click', () => this.plugDC());
    this.rootPanel = rc;
  }

  // ------------------------------------------------------------ layout / presets
  relayout(viewW, viewH) {
    this.viewW = viewW; this.viewH = viewH;
    const sp = DEVICES[3].pos; // speaker
    const mid = this.curves[3].curve.getPoint(0.55);
    this.presets = {
      overview:    { pos: [0, 0.4, 11.6], tgt: [0, 0.1, 0] },
      devicefocus: { pos: [sp.x * 0.62, sp.y * 0.62, 4.8], tgt: [sp.x, sp.y, 0] },
      flowcloseup: { pos: [mid.x, mid.y + 0.4, 2.6], tgt: [mid.x, mid.y, 0] },
      diagpanel:   { pos: [0, 0, 7.4], tgt: [0, 0, 0] },
    };
  }

  getPreset(name) { return this.presets ? (this.presets[name] || this.presets.overview) : { pos: [0, 0.5, 10.6], tgt: [0, 0.2, 0] }; }
  get defaultPreset() { return 'overview'; }
  get presetNames() { return ['overview', 'devicefocus', 'flowcloseup', 'diagpanel']; }

  // ------------------------------------------------------------ narrative
  get phaseIndex() { return PHASES.findIndex((p) => p.key === this.phase); }

  _setPhase(key) {
    this.phase = key;
    this.app.hud.log('b', LOG[key] || []);
    this.app.hud.caption(CAPTIONS[key] || '');
    this.app.hud.setBeat('b', key);
  }

  nextBeat() {
    // jump to the start of the next phase
    const idx = this.phaseIndex;
    if (idx < PHASES.length - 1) {
      this.timeline = PHASES[idx].until + 0.01;
    } else {
      this.reset();
    }
  }

  reset() {
    this.timeline = 0;
    this.wavesFired.clear(); this.scanned.clear();
    this.panelShown = false;
    this.dcState = 'hidden'; this.dcJack.visible = false; this.dcT = 0;
    this.fixedRamp = 0;
    for (const w of this.wavePool) { w.active = false; w.mesh.visible = false; w.uniforms.uAlpha.value = 0; }
    DEVICES.forEach((d, i) => {
      this.nodeUniforms[i].uState.value = d.failing ? 2 : 0;
      this.nodeUniforms[i].uPing.value = 0;
      this.linkUniforms[i].uFixed.value = 0;
      this.particleUniforms.uFixed.value[i] = 0;
      this.cards[i].classList.remove('show'); this.cards[i].style.display = 'none';
    });
    this.rootPanel.classList.remove('show');
    this._setPhase('Idle');
  }

  // click on the hub: skip to conclusion / plug DC
  onPointer() {
    if (this.phaseIndex < 4) { this.timeline = PANEL_T - 0.4; return true; }
    if (this.dcState === 'hidden') { this.plugDC(); return true; }
    return false;
  }

  // ------------------------------------------------------------ frame update
  update(dt) {
    const p = this.app.params;
    this.time += dt;
    this.timeline += dt * p.pacing;   // higher pacing = faster narrative (consistent with Story A)
    if (this.timeline >= LOOP_T) this.reset();

    // phase machine
    const t = this.timeline;
    let ph = PHASES[0].key;
    for (const P of PHASES) if (t <= P.until) { ph = P.key; break; }
    if (ph !== this.phase) this._setPhase(ph);

    // fire one wave per device during Enumerating
    WAVE_TIMES.forEach((wt, i) => {
      if (t >= wt && !this.wavesFired.has(i)) { this.wavesFired.add(i); this._fireWave(i); }
    });

    // expand waves; pop check cards when the front passes the device
    for (const w of this.wavePool) {
      if (!w.active) continue;
      w.t += dt;
      const r = easeOutCubic(clamp(w.t / 1.35, 0, 1)) * w.targetR;
      w.mesh.scale.setScalar(Math.max(0.001, r));
      w.uniforms.uAlpha.value = 0.34 * (1 - w.t / 1.6);
      if (w.deviceIdx >= 0 && r >= DEVICES[w.deviceIdx].radius - 0.15 && !this.scanned.has(w.deviceIdx)) {
        const di = w.deviceIdx;
        this.scanned.add(di);
        this.nodeUniforms[di].uState.value = 1;         // scanned → healthy green
        this.nodeUniforms[di].uPing.value = 1;
        this.cards[di].style.display = 'block';
        requestAnimationFrame(() => this.cards[di].classList.add('show'));
        this.app.audio.cardPop();
      }
      if (w.t > 1.7) { w.active = false; w.mesh.visible = false; }
    }

    // root-cause panel
    if (t >= PANEL_T && !this.panelShown) {
      this.panelShown = true;
      this.rootPanel.classList.add('show');
    }
    // DC plug: automatic, or earlier via click / button
    if (t >= DC_T && this.dcState === 'hidden') this.plugDC();

    // DC slide-in → charge highlight → links heal red→green
    if (this.dcState === 'sliding') {
      this.dcT += dt;
      const k = easeOutCubic(clamp(this.dcT / 1.15, 0, 1));
      const startX = (this.viewW || 12) / 2 + 2.5;
      this.dcJack.position.set(lerp(startX, 0.0, k), 0, 0.15);
      this.dcJack.rotation.z = (1 - k) * 0.35;
      if (this.dcT >= 1.15) {
        this.dcState = 'docked';
        this.hubUniforms.uCharge.value = 1.2;           // charge highlight flash
        this.app.audio.dcChime();
        this.app.hud.caption('DC power connected — audio links stabilize instantly.');
      }
    }
    if (this.dcState === 'docked' && this.fixedRamp < 1) {
      this.fixedRamp = clamp(this.fixedRamp + dt / 0.8, 0, 1);
      DEVICES.forEach((d, i) => {
        if (d.failing) {
          this.linkUniforms[i].uFixed.value = this.fixedRamp;
          this.particleUniforms.uFixed.value[i] = this.fixedRamp;
        }
      });
    }
    this.hubUniforms.uCharge.value = Math.max(0, this.hubUniforms.uCharge.value - dt * 0.8);

    // uniforms
    this.hubUniforms.uTime.value = this.time;
    this.hubUniforms.uQuery.value = this.phase === 'Querying' ? 1 : 0;
    this.hubSpin.rotation.z = this.time * (this.phase === 'Analyzing' ? 2.6 : 0.5);
    for (const u of this.nodeUniforms) {
      u.uTime.value = this.time;
      u.uPing.value = Math.max(0, u.uPing.value - dt * 2.2);
    }
    this.linkUniforms.forEach((u) => { u.uTime.value = this.time; u.uFlow.value = p.flowSpeed; });
    this.particleUniforms.uTime.value = this.time;
    this.particleUniforms.uFlow.value = p.flowSpeed;

    this._updateTelemetry(dt);
    this._updateOverlay();
  }

  _updateTelemetry(dt) {
    // current-stability index: healthy ~97 %, failing links noisy until fixed
    let sum = 0;
    DEVICES.forEach((d, i) => {
      const fixed = this.particleUniforms.uFixed.value[i];
      sum += d.failing
        ? lerp(30 + 14 * Math.sin(this.time * 5 + i * 9), 98, fixed)
        : 96 + 2.5 * Math.sin(this.time * 0.9 + i);
    });
    this.stability = damp(this.stability, sum / DEVICES.length, 5, dt);

    const allGreen = this.scanned.size === DEVICES.length;
    const nominal = this.fixedRamp >= 1;
    this.app.hud.telemetryB({
      phase: this.phase,
      timer: formatTimer(Math.min(this.timeline, 60)),
      topology: nominal ? 'NOMINAL · all stable' : (allGreen ? 'HEALTHY · power suspect' : 'DEGRADED · 2 links down'),
      stability: this.stability,
      devices: DEVICES.map((d, i) => ({
        name: d.name,
        state: (d.failing && this.particleUniforms.uFixed.value[i] < 1)
          ? (this.scanned.has(i) ? 'ok' : 'fail')
          : 'ok',
        scanned: this.scanned.has(i),
      })),
    });
  }

  _updateOverlay() {
    const app = this.app;
    const w = app.width, h = app.height;
    const v = new THREE.Vector3();
    DEVICES.forEach((d, i) => {
      v.copy(d.pos); v.y += 0.62; v.project(app.camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      const lab = this.labels[i];
      lab.style.display = 'block';
      lab.style.left = `${x}px`; lab.style.top = `${y}px`;
      const card = this.cards[i];
      if (card.style.display !== 'none') {
        let cy = y - 66;
        if (cy < 150) cy = y + 165;                     // flip below the node near the top
        let cx = clamp(x, 96, w - 96);
        if (cy < 270) cx = clamp(x, 305, w - 100);      // keep clear of telemetry + topbar
        card.style.left = `${cx}px`;
        card.style.top = `${cy}px`;
      }
    });
  }

  setPointScale(heightPx, camera) {
    this.particleUniforms.uPointScale.value = heightPx * 0.5 * camera.projectionMatrix.elements[5];
  }

  setParticleViz(on) {
    this.hub.visible = !on;
    for (const g of this.deviceGroups) g.visible = !on;
    this.scene.traverse((o) => { if (o.geometry && o.geometry.type === 'TubeGeometry') o.visible = !on; });
    for (const w of this.wavePool) w.mesh.visible = on ? false : w.active;
    this.dcJack.visible = on ? false : this.dcState !== 'hidden';
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    for (const l of this.labels) l.remove();
    for (const c of this.cards) c.remove();
    this.rootPanel.remove();
  }
}
