# HANDS — Two Diagnostic Stories from AI-native 2026

A full-screen interactive Three.js website pairing two real AI-agent repair stories
with living procedural visualizations. Every glyph, sector, particle, topology node,
glow and material is generated at runtime by code and GLSL — no image, model, font,
video, or audio assets are used or downloaded.

## Run

No build step. Serve the folder statically and open it:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Any static server works (`npx serve`, nginx, …). Opening `index.html` over HTTP is
required because the app uses ES modules; the Three.js runtime is vendored locally in
`vendor/three/`, so the site works fully offline.

## The two stories

| Tab | Story | Visualization |
| --- | ----- | ------------- |
| `1` | **Byte Surgeon** — Claude Code forensically rebuilds a 200 GB microSD pulled without safe eject | GPU hex data stream (instanced 7-segment SDF glyphs) + instanced 3×N sector array + diagnostic scan line; damaged sectors pulse red at 1 Hz and repair red→orange→green as the sweep passes, with bloom pulses and a 1→1.08→1 scale pop |
| `2` | **Sixty Seconds** — opencode enumerates a dual-host USB rig and clears "broken" hardware in one minute | Procedural USB topology: hexagonal hub, 5 radial device nodes (keyboard / mouse / headphones / speaker / mic, all procedural line icons), Bézier links, GPU particle current, concentric diagnostic ring waves, pop-up check cards, root-cause panel, DC-jack plug-in interaction, monospaced 0:00→1:00 stopwatch |

Both scenes share one post pipeline: HDR bloom (threshold 0.85 — it fires on hex
column heads, the scan-line leading edge, repair glows, hot particles, diagnostic
waves and the DC charge flash), manual ACES filmic tonemap (exposure ≈ 0.8), radial
vignette, time-varying film grain, edge chromatic aberration, and optional depth of
field on the Cinematic profile.

## Hotkeys

| Key | Action | Key | Action |
| --- | ------ | --- | ------ |
| `1` / `2` | switch story | `H` | hide / show HUD |
| `Space` | pause / resume narrative | `F` | fullscreen |
| `N` | next beat / phase | `M` | mute / unmute (starts muted) |
| `R` | reset story | `A` | auto-narrative ↔ manual explore |
| `P` | parameter panel | `0`–`5` | debug: off · wireframe · particle viz · bloom buffer · performance · verbose HUD |

Mouse / touch: drag to orbit, wheel or pinch to zoom (OrbitControls, damping 0.07).
During Story B, clicking the scene jumps to the conclusion / plugs in the DC jack.

## URL parameters

- `?story=a` / `?story=b` — start story
- `?quality=standard|high|cinematic` — particle budget 5k / 15k / 40k, bloom levels,
  resolution scale 0.85 / 1.0 / 1.25; Cinematic enables DOF
- `?autostart=1|0` — auto-narrative on/off
- `?view=…` — camera preset: Story A `closeup | wide | topdown | immersive`,
  Story B `overview | devicefocus | flowcloseup | diagpanel`
- `?debug=0..6` `?hud=0` `?mute=0|1`

Example: `http://localhost:8000/?story=b&quality=cinematic&view=flow-closeup`

## Parameter HUD

The ⚙ panel exposes 17 live controls, all applied instantly: bloom strength /
threshold, tonemap exposure, vignette, grain, chromatic aberration, DOF focus,
scan speed, damage rate, hex mutation rate, stream density, the four Story-A beat
durations, particle flow speed, particle density, narrative pacing, and volume.
Quality, volume, mute, last-opened story, and all parameters persist to
`localStorage` across sessions.

## Engineering notes

- Retina displays capped at 2×; render scale set per quality profile.
- WebGL context-loss is intercepted: the renderer, post pipeline and scenes rebuild
  automatically on restore.
- FPS / draw-call / triangle / particle overlay lives on debug view `4`.
- Audio is synthesized WebAudio (ambient bed, scan hum, repair ding, card pop,
  DC chime) — muted by default, resumes after the first user gesture.
