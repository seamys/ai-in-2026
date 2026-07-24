// hud.js — top bar, telemetry panels, collapsible parameter HUD,
// ops log, captions, stopwatch, debug/performance overlay, toasts.
import { el, clamp } from './utils.js';

export class HUD {
  constructor(app) {
    this.app = app;
    this.verbose = false;
    this._toastTimer = null;
    this._logTimers = [];

    this.teleA = document.getElementById('telemetry-a');
    this.teleB = document.getElementById('telemetry-b');
    this.timerEl = document.getElementById('timer');
    this.timerValue = document.getElementById('timer-value');
    this.opsEl = document.getElementById('opslog');
    this.captionEl = document.getElementById('caption');
    this.debugEl = document.getElementById('debug');
    this.toastEl = document.getElementById('toast');
    this.uiEl = document.getElementById('ui');

    this._buildTelemetryA();
    this._buildTelemetryB();
    this._buildParams();
  }

  // ---------------------------------------------------------- telemetry A
  _buildTelemetryA() {
    this.teleA.innerHTML = '<h3>BYTE SURGEON · /dev/mmcblk0</h3>';
    this.aRows = {};
    const mk = (key, label) => {
      const row = el('div', 'trow', this.teleA);
      el('span', 'k', row, label);
      this.aRows[key] = el('span', 'v', row, '—');
    };
    mk('sectors', 'Sectors analyzed');
    mk('damaged', 'Damaged');
    mk('fixed', 'Fixed');
    mk('recovery', 'Recovery');
    const bar = el('div', 'tbar', this.teleA); this.aBar = el('i', '', bar);
    mk('stability', 'Stream stability');
    mk('bytes', 'Bytes recovered');
    this.aBeatRow = el('div', 'trow', this.teleA);
    el('span', 'k', this.aBeatRow, 'Beat');
    this.aBeat = el('span', 'v', this.aBeatRow, '—');
    this.aVerbose = el('div', 'verbose-block hidden', this.teleA);
  }

  telemetryA(d) {
    this.aRows.sectors.textContent = `${d.analyzed.toLocaleString()} / ${d.total.toLocaleString()}`;
    this.aRows.damaged.textContent = String(d.damaged);
    this.aRows.damaged.className = 'v' + (d.damaged > d.fixed ? ' bad' : '');
    this.aRows.fixed.textContent = String(d.fixed);
    this.aRows.fixed.className = 'v' + (d.fixed >= d.damaged ? ' good' : '');
    this.aRows.recovery.textContent = `${d.recovery.toFixed(1)} %`;
    this.aBar.style.width = `${clamp(d.recovery, 0, 100)}%`;
    this.aRows.stability.textContent = `${d.stability.toFixed(0)} %`;
    this.aRows.bytes.textContent = d.bytes;
    if (this.verbose) {
      this.aVerbose.classList.remove('hidden');
      const s = this.app.storyA;
      this.aVerbose.textContent =
        `beat ${s.beats[s.beatIndex].key}  t=${s.beatTime.toFixed(2)}s\n` +
        `conv ${s.conv.toFixed(3)} → ${s.convTarget}\n` +
        `scanX ${s.scanX.toFixed(2)}  active=${s.scanActive}\n` +
        `hex instances ${s.particleCount.toLocaleString()}`;
    } else this.aVerbose.classList.add('hidden');
  }

  // ---------------------------------------------------------- telemetry B
  _buildTelemetryB() {
    this.teleB.innerHTML = '<h3>SIXTY SECONDS · USB TOPOLOGY</h3>';
    this.bRows = {};
    const mk = (key, label) => {
      const row = el('div', 'trow', this.teleB);
      el('span', 'k', row, label);
      this.bRows[key] = el('span', 'v', row, '—');
    };
    mk('topology', 'Topology status');
    mk('stability', 'Current stability');
    mk('phase', 'Diagnostic phase');
    const bar = el('div', 'tbar', this.teleB); this.bBar = el('i', '', bar);
    this.bChips = el('div', 'chips', this.teleB);
    this.bVerbose = el('div', 'verbose-block hidden', this.teleB);
  }

  telemetryB(d) {
    this.timerValue.textContent = d.timer;
    this.bRows.topology.textContent = d.topology;
    this.bRows.topology.className = 'v' + (d.topology.startsWith('NOMINAL') ? ' good' : (d.topology.startsWith('DEGRADED') ? ' bad' : ''));
    this.bRows.stability.textContent = `${d.stability.toFixed(0)} %`;
    this.bRows.phase.textContent = d.phase;
    this.bBar.style.width = `${clamp(d.stability, 0, 100)}%`;
    if (!this._chipsBuilt) {
      this._chipsBuilt = true;
      this.bChips.innerHTML = '';
      this._chipEls = d.devices.map((dev) => el('span', 'chip', this.bChips, dev.name));
    }
    d.devices.forEach((dev, i) => {
      const c = this._chipEls[i];
      c.textContent = `${dev.name}${dev.scanned ? ' ✓' : ''}`;
      c.className = 'chip' + (dev.state === 'ok' ? ' ok' : ' fail');
    });
    if (this.verbose) {
      this.bVerbose.classList.remove('hidden');
      const s = this.app.storyB;
      this.bVerbose.textContent =
        `timeline ${s.timeline.toFixed(2)}s  scanned ${s.scanned.size}/5\n` +
        `dc ${s.dcState}  fixedRamp ${s.fixedRamp.toFixed(2)}\n` +
        `flow particles ${s.particleCount.toLocaleString()}`;
    } else this.bVerbose.classList.add('hidden');
  }

  setBeat(story, text) {
    if (story === 'a') this.aBeat.textContent = text;
    else this.bRows.phase.textContent = text;
  }

  // ---------------------------------------------------------- log + caption
  log(story, lines) {
    for (const t of this._logTimers) clearTimeout(t);
    this._logTimers = [];
    this.opsEl.innerHTML = '';
    lines.forEach(([prefix, text], i) => {
      const line = el('div', 'line' + (prefix.trim() === '✓' ? ' ok' : ''), this.opsEl);
      el('span', 'p', line, prefix);
      line.appendChild(document.createTextNode(text));
      this._logTimers.push(setTimeout(() => line.classList.add('show'), 180 + i * 520));
    });
  }

  caption(html) {
    this.captionEl.innerHTML = html;
    this.captionEl.classList.add('show');
    clearTimeout(this._capTimer);
    this._capTimer = setTimeout(() => this.captionEl.classList.remove('show'), 5200);
  }

  toast(msg, ms = 1900) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  // ---------------------------------------------------------- story switch
  showStory(id) {
    this.teleA.classList.toggle('hidden', id !== 'a');
    this.teleB.classList.toggle('hidden', id !== 'b');
    this.timerEl.classList.toggle('hidden', id !== 'b');
    document.getElementById('tab-a').classList.toggle('active', id === 'a');
    document.getElementById('tab-b').classList.toggle('active', id === 'b');
    this.opsEl.innerHTML = '';
  }

  hideUI(hide) { this.uiEl.classList.toggle('hidden-ui', hide); }

  // ---------------------------------------------------------- debug overlay
  setDebugVisible(v) { this.debugEl.classList.toggle('hidden', !v); }
  updateDebug(text) { this.debugEl.textContent = text; }

  // ---------------------------------------------------------- parameter panel
  _buildParams() {
    const body = document.getElementById('pp-body');
    const p = this.app.params;
    const onInput = (key, v, rebuild) => this.app.onParamChange(key, v, rebuild);

    const slider = (group, key, label, min, max, step, fmt = (v) => v.toFixed(2), rebuild = null) => {
      const wrap = el('div', 'pctl', body);
      const lab = el('label', '', wrap);
      el('span', '', lab, label);
      const val = el('span', 'val', lab, fmt(p[key]));
      const input = el('input', '', wrap);
      input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = p[key];
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        val.textContent = fmt(v);
        onInput(key, v, rebuild);
      });
    };
    const group = (name) => el('div', 'pgroup', body, name);

    group('POST PIPELINE');
    slider(0, 'bloomStrength', 'Bloom strength', 0, 2, 0.01);
    slider(0, 'bloomThreshold', 'Bloom threshold', 0.4, 1.2, 0.005, (v) => v.toFixed(3));
    slider(0, 'exposure', 'Tonemap exposure', 0.3, 1.6, 0.01);
    slider(0, 'vignette', 'Vignette', 0, 0.8, 0.01);
    slider(0, 'grain', 'Film grain', 0, 0.15, 0.002, (v) => v.toFixed(3));
    slider(0, 'aberration', 'Chromatic aberration', 0, 0.008, 0.0002, (v) => v.toFixed(4));
    slider(0, 'dofFocus', 'DOF focus distance', 4, 16, 0.1, (v) => v.toFixed(1) + ' m');

    group('STORY A — BYTE SURGEON');
    slider(0, 'scanSpeed', 'Scan speed', 0.4, 2.5, 0.05, (v) => v.toFixed(2) + '×');
    slider(0, 'damageRate', 'Damage rate', 0.05, 0.8, 0.01, (v) => (v * 100).toFixed(0) + ' %');
    slider(0, 'hexMutation', 'Hex mutation rate', 0.5, 8, 0.1, (v) => v.toFixed(1) + '/s');
    slider(0, 'streamDensity', 'Stream density', 0.4, 1.6, 0.05, (v) => v.toFixed(2) + '×', 'stream');
    slider(0, 'beatIdle', 'Beat · idle', 0.5, 8, 0.1, (v) => v.toFixed(1) + ' s');
    slider(0, 'beatEngage', 'Beat · AI engage', 0.5, 8, 0.1, (v) => v.toFixed(1) + ' s');
    slider(0, 'beatAnalysis', 'Beat · hex analysis', 0.5, 8, 0.1, (v) => v.toFixed(1) + ' s');
    slider(0, 'beatHold', 'Beat · all-green hold', 0.5, 8, 0.1, (v) => v.toFixed(1) + ' s');

    group('STORY B — SIXTY SECONDS');
    slider(0, 'flowSpeed', 'Particle flow speed', 0.2, 3, 0.05, (v) => v.toFixed(2) + '×');
    slider(0, 'particleDensity', 'Particle density', 0.25, 2, 0.05, (v) => v.toFixed(2) + '×', 'particles');

    group('NARRATIVE / AUDIO');
    slider(0, 'pacing', 'Narrative pacing', 0.5, 2, 0.05, (v) => v.toFixed(2) + '×');
    slider(0, 'volume', 'Volume', 0, 1, 0.01, (v) => (v * 100).toFixed(0) + ' %');

    document.getElementById('pp-close').addEventListener('click', () => this.toggleParams(false));
    document.getElementById('pp-defaults').addEventListener('click', () => this.app.restoreDefaults());
  }

  toggleParams(show) {
    const panel = document.getElementById('parampanel');
    const want = show !== undefined ? show : panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !want);
    document.getElementById('btn-params').classList.toggle('on', want);
  }

  syncTransport() {
    const p = this.app.params;
    document.getElementById('btn-auto').classList.toggle('on', p.auto);
    document.getElementById('btn-pause').textContent = this.app.paused ? '▶' : '⏸';
    document.getElementById('btn-mute').textContent = p.muted ? '🔇' : '🔊';
    document.getElementById('sel-quality').value = p.quality;
  }
}
