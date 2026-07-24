// main.js — boot, renderer, camera presets, hotkeys, quality profiles,
// context-loss recovery, debug views, persistence, frame loop.
import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/OrbitControls.js';
import { loadConfig, saveConfig, QUALITY_PROFILES, DEFAULTS } from './config.js';
import { PostPipeline } from './post.js';
import { AudioEngine } from './audio.js';
import { HUD } from './hud.js';
import { StoryA } from './storyA.js';
import { StoryB } from './storyB.js';
import { clamp, easeInOutCubic } from './utils.js';

const bootT0 = performance.now();

const app = {
  params: null, profile: null,
  renderer: null, camera: null, controls: null, post: null,
  audio: null, hud: null,
  storyA: null, storyB: null, active: null,
  paused: false, width: innerWidth, height: innerHeight,
  overlay: document.getElementById('overlay'),
  debugMode: 0,
  _tween: null, _saveTimer: null, _rebuildTimer: null,
};
window.__hands = app; // screenshot automation hook

// ---------------------------------------------------------------- boot
function init() {
  const { cfg, urlView } = loadConfig();
  app.params = cfg;
  app.profile = QUALITY_PROFILES[cfg.quality];
  cfg._dofEnabled = app.profile.dof;
  app.urlView = urlView;

  const canvas = document.getElementById('gl');
  app.canvas = canvas;
  app.renderer = makeRenderer(canvas);
  app.renderer.info.autoReset = false;

  app.camera = new THREE.PerspectiveCamera(46, app.width / app.height, 0.1, 120);
  app.camera.position.set(0, 1.3, 11.6);

  app.controls = new OrbitControls(app.camera, canvas);
  app.controls.enableDamping = true;
  app.controls.dampingFactor = 0.07;
  app.controls.maxDistance = 30;
  app.controls.minDistance = 1.2;

  app.post = new PostPipeline(app.renderer, cfg);
  app.audio = new AudioEngine(cfg);
  app.hud = new HUD(app);

  app.storyA = new StoryA(app);
  app.storyB = new StoryB(app);

  applySize();

  // world-space viewport metrics at the reference camera distance
  const { viewW, viewH } = referenceView();
  app.storyA.relayout(viewW, viewH);
  app.storyB.relayout(viewW, viewH);

  switchStory(cfg.story, urlView || null, true);
  app.hud.syncTransport();
  if (cfg._hideHud) app.hud.hideUI(true);
  if (cfg._debug !== undefined) setDebugMode(parseInt(cfg._debug, 10) || 0);

  wireUI();
  wireHotkeys();
  wireContextLoss(canvas);
  addEventListener('resize', applySize);

  requestAnimationFrame(frame);
  console.info(`[hands] interactive in ${(performance.now() - bootT0).toFixed(0)} ms`);
}

function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: false,
    powerPreference: 'high-performance', stencil: false,
  });
  r.toneMapping = THREE.NoToneMapping;
  r.outputColorSpace = THREE.LinearSRGBColorSpace; // final pass does manual gamma
  r.setClearColor(0x000000, 0);
  return r;
}

function referenceView() {
  // world units visible at z=0 from the reference distance (Story A 'wide')
  const dist = 11.6;
  const viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(app.camera.fov / 2));
  return { viewW: viewH * app.camera.aspect, viewH };
}

// ---------------------------------------------------------------- sizing
function applySize() {
  app.width = innerWidth; app.height = innerHeight;
  const pr = Math.min(devicePixelRatio || 1, 2);           // Retina cap
  app.renderer.setPixelRatio(pr);
  app.renderer.setSize(app.width, app.height, false);
  app.camera.aspect = app.width / app.height;
  app.camera.updateProjectionMatrix();
  app.post.setSize(app.width * pr, app.height * pr, app.profile.resScale, app.profile.bloomLevels);
  const { viewW, viewH } = referenceView();
  if (app.storyA) app.storyA.relayout(viewW, viewH);
  if (app.storyB) app.storyB.relayout(viewW, viewH);
}

// ---------------------------------------------------------------- quality
function setQuality(q) {
  if (!QUALITY_PROFILES[q]) return;
  app.params.quality = q;
  app.profile = QUALITY_PROFILES[q];
  app.params._dofEnabled = app.profile.dof;
  app.storyA._buildStream();
  app.storyB.rebuildParticles();
  applySize();
  app.hud.syncTransport();
  app.hud.toast(`Quality: ${q} · ${(app.profile.particleBudget / 1000)}k particles`);
  saveConfig(app.params);
}

// ---------------------------------------------------------------- story switch
const VIEW_ALIASES = {
  'close-up': 'closeup', 'top-down': 'topdown', 'hex-immersive': 'immersive',
  'device-focus': 'devicefocus', 'flow-closeup': 'flowcloseup', 'diagnostic-panel': 'diagpanel',
};

function switchStory(id, viewName, immediate = false) {
  if (id !== 'a' && id !== 'b') return;
  app.params.story = id;
  app.active = id === 'a' ? app.storyA : app.storyB;
  app.overlay.style.display = id === 'b' ? 'block' : 'none';
  app.hud.showStory(id);
  app.audio.switchStory(id);
  app.active.reset();

  let view = viewName || app.active.defaultPreset;
  view = VIEW_ALIASES[view] || view;
  applyPreset(view, immediate);
  setDebugMode(app.debugMode, true); // re-apply per-scene debug state
  saveConfig(app.params);
}

function applyPreset(name, immediate = false) {
  const preset = app.active.getPreset(name);
  if (!preset) return;
  const toPos = new THREE.Vector3(...preset.pos);
  const toTgt = new THREE.Vector3(...preset.tgt);
  if (immediate) {
    app.camera.position.copy(toPos);
    app.controls.target.copy(toTgt);
    app.controls.update();
    app._tween = null;
    return;
  }
  app._tween = {
    t: 0, dur: 1.35,
    fromPos: app.camera.position.clone(),
    fromTgt: app.controls.target.clone(),
    toPos, toTgt,
  };
  app.hud.toast(`Camera: ${name}`);
}

// ---------------------------------------------------------------- debug views
const DEBUG_NAMES = ['off', 'wireframe', 'particle viz', 'bloom buffer', 'performance', 'verbose HUD'];
function setDebugMode(mode, silent = false) {
  app.debugMode = mode;
  const scene = app.active.scene;
  // reset all
  scene.overrideMaterial = null;
  app.active.setParticleViz(false);
  app.post.setDebugView(0);
  app.hud.setDebugVisible(false);
  app.hud.verbose = false;

  if (mode === 1) scene.overrideMaterial = app._wireMat || (app._wireMat = new THREE.MeshBasicMaterial({ wireframe: true, color: 0x8a5a00 }));
  else if (mode === 2) app.active.setParticleViz(true);
  else if (mode === 3) app.post.setDebugView(1);
  else if (mode === 4) app.hud.setDebugVisible(true);
  else if (mode === 5) { app.hud.verbose = true; app.hud.setDebugVisible(true); }
  else if (mode === 6) app.post.setDebugView(5); // temp: bloom mip0 probe
  if (!silent) app.hud.toast(`Debug: ${DEBUG_NAMES[mode] || 'off'}`);
}

// ---------------------------------------------------------------- params
app.onParamChange = function (key, value, rebuild) {
  app.params[key] = value;
  if (key === 'volume') app.audio.setVolume(value);
  if (rebuild) {
    clearTimeout(app._rebuildTimer);
    app._rebuildTimer = setTimeout(() => {
      if (rebuild === 'stream') { app.storyA._buildStream(); app.storyA.relayout(...Object.values(referenceView())); }
      if (rebuild === 'particles') app.storyB.rebuildParticles();
    }, 260);
  }
  persist();
};

app.restoreDefaults = function () {
  const keep = { story: app.params.story, quality: app.params.quality, muted: app.params.muted };
  Object.assign(app.params, { ...DEFAULTS }, keep);
  const body = document.getElementById('pp-body');
  body.innerHTML = '';
  app.hud._buildParams();
  app.storyA._buildStream(); applySize();
  app.storyB.rebuildParticles();
  app.hud.syncTransport();
  app.hud.toast('Parameters restored to defaults');
  persist();
};

function persist() {
  clearTimeout(app._saveTimer);
  app._saveTimer = setTimeout(() => saveConfig(app.params), 400);
}

// ---------------------------------------------------------------- UI wiring
function wireUI() {
  document.getElementById('tab-a').addEventListener('click', () => switchStory('a'));
  document.getElementById('tab-b').addEventListener('click', () => switchStory('b'));
  document.getElementById('btn-auto').addEventListener('click', toggleAuto);
  document.getElementById('btn-pause').addEventListener('click', togglePause);
  document.getElementById('btn-reset').addEventListener('click', () => { app.active.reset(); app.hud.toast('Story reset'); });
  document.getElementById('btn-next').addEventListener('click', () => app.active.nextBeat());
  document.getElementById('btn-hide').addEventListener('click', toggleHide);
  document.getElementById('btn-full').addEventListener('click', toggleFullscreen);
  document.getElementById('btn-mute').addEventListener('click', toggleMute);
  document.getElementById('btn-params').addEventListener('click', () => app.hud.toggleParams());
  document.getElementById('sel-quality').addEventListener('change', (e) => setQuality(e.target.value));

  // click (not drag) on the canvas during Story B advances the DC interaction
  let downPos = null;
  app.canvas.addEventListener('pointerdown', (e) => { downPos = [e.clientX, e.clientY]; });
  app.canvas.addEventListener('pointerup', (e) => {
    if (!downPos) return;
    const dx = e.clientX - downPos[0], dy = e.clientY - downPos[1];
    downPos = null;
    if (dx * dx + dy * dy < 36 && app.active === app.storyB) {
      if (app.storyB.onPointer()) app.hud.toast('USB hub selected');
    }
  });
}

function toggleAuto() {
  app.params.auto = !app.params.auto;
  app.hud.syncTransport();
  app.hud.toast(app.params.auto ? 'Auto-narrative' : 'Manual explore — N advances beats');
  persist();
}
function togglePause() {
  app.paused = !app.paused;
  app.hud.syncTransport();
  app.hud.toast(app.paused ? 'Paused' : 'Resumed');
}
function toggleHide() {
  const hidden = !document.getElementById('ui').classList.contains('hidden-ui');
  app.hud.hideUI(hidden);
}
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}
function toggleMute() {
  app.params.muted = !app.params.muted;
  app.audio.setMuted(app.params.muted);
  app.hud.syncTransport();
  app.hud.toast(app.params.muted ? 'Sound muted' : 'Sound on');
  persist();
}

function wireHotkeys() {
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (k === '1') switchStory('a');
    else if (k === '2') switchStory('b');
    else if (k === ' ') { e.preventDefault(); togglePause(); }
    else if (k === 'r') { app.active.reset(); app.hud.toast('Story reset'); }
    else if (k === 'n') app.active.nextBeat();
    else if (k === 'a') toggleAuto();
    else if (k === 'h') toggleHide();
    else if (k === 'f') toggleFullscreen();
    else if (k === 'm') toggleMute();
    else if (k === 'p') app.hud.toggleParams();
    else if (k >= '0' && k <= '9') {
      const m = parseInt(k, 10);
      if (m <= 5) setDebugMode(m);
      else app.hud.toast(`Debug view ${m}: reserved`);
    }
  });
}

// ---------------------------------------------------------------- context loss
function wireContextLoss(canvas) {
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    app._contextLost = true;
    app.hud.toast('WebGL context lost — rebuilding scene…', 4000);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    app.renderer.dispose();
    app.renderer = makeRenderer(canvas);
    app.renderer.info.autoReset = false;
    app.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    app.post = new PostPipeline(app.renderer, app.params);
    applySize();
    app._contextLost = false;
    app.hud.toast('WebGL context restored');
  });
}

// ---------------------------------------------------------------- frame loop
const clock = new THREE.Clock();
let fpsEMA = 60, perfTimer = 0;

function frame() {
  requestAnimationFrame(frame);
  if (app._contextLost) return;

  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  if (dt > 0) fpsEMA = fpsEMA * 0.95 + (1 / Math.max(dt, 1e-4)) * 0.05;

  // camera preset tween (cubic-eased)
  if (app._tween) {
    const tw = app._tween;
    tw.t += dt;
    const k = easeInOutCubic(clamp(tw.t / tw.dur, 0, 1));
    app.camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
    app.controls.target.lerpVectors(tw.fromTgt, tw.toTgt, k);
    if (tw.t >= tw.dur) app._tween = null;
  }
  app.controls.update();

  if (!app.paused) app.active.update(dt);

  if (app.active === app.storyB) app.storyB.setPointScale(app.post.height, app.camera);

  app.renderer.info.reset();
  app.post.render(app.active.scene, app.camera, t);

  // performance overlay
  perfTimer += dt;
  if (perfTimer > 0.25 && app.debugMode >= 4) {
    perfTimer = 0;
    const info = app.renderer.info;
    app.hud.updateDebug(
      `FPS        ${fpsEMA.toFixed(1)}\n` +
      `frame      ${(1000 / Math.max(fpsEMA, 1)).toFixed(1)} ms\n` +
      `draw calls ${info.render.calls}\n` +
      `triangles  ${info.render.triangles.toLocaleString()}\n` +
      `points     ${info.render.points.toLocaleString()}\n` +
      `particles  ${(app.active.particleCount || 0).toLocaleString()}\n` +
      `resolution ${app.post.width}×${app.post.height} @${app.profile.resScale}\n` +
      `quality    ${app.params.quality}\n` +
      `geometries ${info.memory.geometries} · textures ${info.memory.textures}`
    );
  }
}

init();
