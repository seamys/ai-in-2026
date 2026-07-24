// config.js — defaults, URL parameters, localStorage persistence

export const DEFAULTS = {
  // narrative / transport
  story: 'a',            // 'a' | 'b'
  auto: true,            // auto-narrative vs manual explore
  quality: 'high',       // 'standard' | 'high' | 'cinematic'
  muted: true,
  volume: 0.7,

  // story A
  scanSpeed: 1.0,        // scan-line speed multiplier (1.0 ≈ 4.2 s sweep)
  damageRate: 0.38,      // fraction of sectors starting damaged
  hexMutation: 4.0,      // hex-stream base character mutations per second
  streamDensity: 1.0,    // hex column density multiplier
  beatIdle: 2.6,         // seconds
  beatEngage: 2.0,
  beatAnalysis: 3.4,
  beatHold: 3.2,

  // story B
  flowSpeed: 1.0,        // particle current speed multiplier
  particleDensity: 1.0,  // particle count multiplier

  // narrative pacing (global beat-duration multiplier)
  pacing: 1.0,

  // post pipeline
  bloomStrength: 1.0,
  bloomThreshold: 0.85,
  exposure: 0.8,
  vignette: 0.35,
  grain: 0.04,
  aberration: 0.002,
  dofFocus: 9.0,         // cinematic profile only
};

export const QUALITY_PROFILES = {
  standard:  { particleBudget: 5000,  bloomLevels: 4, resScale: 0.85, dof: false },
  high:      { particleBudget: 15000, bloomLevels: 5, resScale: 1.0,  dof: false },
  cinematic: { particleBudget: 40000, bloomLevels: 5, resScale: 1.25, dof: true  },
};

const STORAGE_KEY = 'hands.config.v1';
const PERSISTED_PARAMS = [
  'scanSpeed', 'damageRate', 'hexMutation', 'streamDensity',
  'beatIdle', 'beatEngage', 'beatAnalysis', 'beatHold',
  'flowSpeed', 'particleDensity', 'pacing',
  'bloomStrength', 'bloomThreshold', 'exposure', 'vignette', 'grain', 'aberration', 'dofFocus',
];

export function loadConfig() {
  const cfg = { ...DEFAULTS };

  // 1) localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.story === 'a' || saved.story === 'b') cfg.story = saved.story;
      if (QUALITY_PROFILES[saved.quality]) cfg.quality = saved.quality;
      if (typeof saved.muted === 'boolean') cfg.muted = saved.muted;
      if (typeof saved.volume === 'number') cfg.volume = Math.min(1, Math.max(0, saved.volume));
      if (saved.params) {
        for (const k of PERSISTED_PARAMS) {
          if (typeof saved.params[k] === 'number' && Number.isFinite(saved.params[k])) cfg[k] = saved.params[k];
        }
      }
    }
  } catch (_) { /* storage unavailable — continue with defaults */ }

  // 2) URL parameters override everything (?story=a|b&quality=cinematic&autostart=1&view=wide)
  const q = new URLSearchParams(location.search);
  const urlView = q.get('view') || null;
  if (q.get('story') === 'a' || q.get('story') === 'b') cfg.story = q.get('story');
  if (QUALITY_PROFILES[q.get('quality')]) cfg.quality = q.get('quality');
  if (q.has('autostart')) cfg.auto = q.get('autostart') !== '0';
  if (q.get('mute') === '1') cfg.muted = true;
  if (q.get('mute') === '0') cfg.muted = false;
  if (q.has('hud') && q.get('hud') === '0') cfg._hideHud = true;
  if (q.has('debug')) cfg._debug = q.get('debug');

  return { cfg, urlView };
}

export function saveConfig(cfg) {
  try {
    const params = {};
    for (const k of PERSISTED_PARAMS) params[k] = cfg[k];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      story: cfg.story, quality: cfg.quality, muted: cfg.muted, volume: cfg.volume, params,
    }));
  } catch (_) { /* ignore */ }
}
