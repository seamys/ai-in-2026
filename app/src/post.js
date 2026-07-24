// post.js — shared post pipeline
// HDR bloom (threshold 0.85) · manual ACES filmic (exposure ~0.8) · radial vignette
// time-varying film grain · edge chromatic aberration · optional DOF (Cinematic)
import * as THREE from 'three';
import { makeFSGeometry } from './utils.js';

const VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

class FSQuad {
  constructor() {
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.mesh = new THREE.Mesh(makeFSGeometry(), null);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }
  render(renderer, material, target) {
    this.mesh.material = material;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.cam);
  }
}

function makeRT(w, h, depth = false) {
  const rt = new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: depth,
    stencilBuffer: false,
  });
  if (depth) {
    rt.depthTexture = new THREE.DepthTexture(w, h, THREE.UnsignedInt248Type);
  }
  return rt;
}

export class PostPipeline {
  constructor(renderer, params) {
    this.renderer = renderer;
    this.params = params;
    this.quad = new FSQuad();
    this.levels = 5;
    this.rts = null;
    this._buildMaterials();
  }

  _buildMaterials() {
    this.brightMat = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uThreshold: { value: 0.85 } },
      vertexShader: VERT,
      fragmentShader: /* glsl */`
        uniform sampler2D tSrc; uniform float uThreshold; varying vec2 vUv;
        void main() {
          vec4 c = texture2D(tSrc, vUv);
          float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
          float knee = uThreshold * 0.5 + 1e-4;
          float soft = clamp(lum - uThreshold + knee, 0.0, 2.0 * knee);
          soft = soft * soft / (4.0 * knee);
          float w = max(soft, lum - uThreshold) / max(lum, 1e-4);
          gl_FragColor = vec4(c.rgb * w, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });

    this.blurMat = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uTexel: { value: new THREE.Vector2() } },
      vertexShader: VERT,
      fragmentShader: /* glsl */`
        uniform sampler2D tSrc; uniform vec2 uDir; uniform vec2 uTexel; varying vec2 vUv;
        void main() {
          float w[5]; w[0]=0.227027; w[1]=0.1945946; w[2]=0.1216216; w[3]=0.054054; w[4]=0.016216;
          vec3 acc = texture2D(tSrc, vUv).rgb * w[0];
          for (int i = 1; i < 5; i++) {
            vec2 off = uDir * uTexel * float(i) * 1.6;
            acc += texture2D(tSrc, vUv + off).rgb * w[i];
            acc += texture2D(tSrc, vUv - off).rgb * w[i];
          }
          gl_FragColor = vec4(acc, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });

    this.copyMat = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null } },
      vertexShader: VERT,
      fragmentShader: `uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tSrc, vUv); }`,
      depthTest: false, depthWrite: false,
    });

    this.accumMat = new THREE.ShaderMaterial({
      uniforms: {
        tM0: { value: null }, tM1: { value: null }, tM2: { value: null },
        tM3: { value: null }, tM4: { value: null },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */`
        uniform sampler2D tM0, tM1, tM2, tM3, tM4;
        varying vec2 vUv;
        void main() {
          vec3 acc = texture2D(tM0, vUv).rgb * 0.42
                   + texture2D(tM1, vUv).rgb * 0.32
                   + texture2D(tM2, vUv).rgb * 0.26
                   + texture2D(tM3, vUv).rgb * 0.22
                   + texture2D(tM4, vUv).rgb * 0.18;
          gl_FragColor = vec4(acc, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });

    this.dofMat = new THREE.ShaderMaterial({
      uniforms: {
        tSrc: { value: null }, tDepth: { value: null },
        uNear: { value: 0.1 }, uFar: { value: 100 },
        uFocus: { value: 9.0 }, uRange: { value: 3.0 }, uMaxBlur: { value: 0.012 },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */`
        uniform sampler2D tSrc; uniform sampler2D tDepth;
        uniform float uNear, uFar, uFocus, uRange, uMaxBlur;
        varying vec2 vUv;
        float viewZ(vec2 uv) {
          float d = texture2D(tDepth, uv).x;
          return (uNear * uFar) / ((uFar - uNear) * d - uFar); // perspectiveDepthToViewZ
        }
        void main() {
          float vz = -viewZ(vUv);
          float coc = clamp(abs(vz - uFocus) / uRange, 0.0, 1.0);
          vec4 sharp = texture2D(tSrc, vUv);
          coc *= smoothstep(0.0, 0.04, sharp.a); // only blur where geometry exists
          vec4 acc = sharp; float tot = 1.0;
          for (int i = 0; i < 12; i++) {
            float a = float(i) * 0.5235988;
            vec2 off = vec2(cos(a), sin(a)) * uMaxBlur * coc * (0.4 + 0.6 * fract(float(i) * 0.618));
            acc += texture2D(tSrc, vUv + off); tot += 1.0;
          }
          gl_FragColor = acc / tot;
        }`,
      depthTest: false, depthWrite: false,
    });

    this.finalMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null }, tBloom: { value: null }, tMip0: { value: null },
        uBloomStrength: { value: 1.0 },
        uExposure: { value: 0.8 },
        uVignette: { value: 0.35 },
        uGrain: { value: 0.04 },
        uAberration: { value: 0.002 },
        uAspect: { value: 1.78 },
        uTime: { value: 0 },
        uBloomGain: { value: 0.75 },
        uBgCenter: { value: new THREE.Vector3(1.0, 0.992, 0.957) },   // #fffdf4
        uBgEdge: { value: new THREE.Vector3(0.973, 0.918, 0.816) },   // #f8ead0
        uDebug: { value: 0 }, // 0 normal · 1 bloom buffer · 2 raw scene
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */`
        uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tMip0;
        uniform float uBloomStrength, uBloomGain, uExposure, uVignette, uGrain, uAberration, uAspect, uTime;
        uniform vec3 uBgCenter, uBgEdge;
        uniform int uDebug;
        varying vec2 vUv;

        vec3 aces(vec3 x) {
          return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
        }
        vec3 toDisplay(vec3 lin, float exposure) { return pow(aces(lin * exposure), vec3(1.0 / 2.2)); }
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

        void main() {
          vec2 uv = vUv;
          vec2 centered = (uv - 0.5) * vec2(uAspect, 1.0);
          float r2 = dot(centered, centered);

          // chromatic aberration, grows toward edges
          vec2 caOff = centered * uAberration * r2 * 8.0;
          vec4 sR = texture2D(tScene, uv + caOff);
          vec4 sG = texture2D(tScene, uv);
          vec4 sB = texture2D(tScene, uv - caOff);
          vec4 scene = vec4(sR.r, sG.g, sB.b, sG.a);

          // procedural radial background, palette-exact: #fffdf4 → #f8ead0
          float bgT = smoothstep(0.05, 0.85, length(centered * vec2(1.0, 1.15)));
          vec3 bg = mix(uBgCenter, uBgEdge, bgT);

          if (uDebug == 1) { gl_FragColor = vec4(pow(texture2D(tBloom, uv).rgb, vec3(0.4545)), 1.0); return; }
          if (uDebug == 5) { gl_FragColor = vec4(pow(texture2D(tMip0, uv).rgb, vec3(0.4545)), 1.0); return; }
          if (uDebug == 2) { gl_FragColor = vec4(toDisplay(scene.rgb / max(scene.a, 1e-3), uExposure) * scene.a + bg * (1.0 - scene.a), 1.0); return; }

          // manual ACES filmic tonemap: un-premultiply first so translucent
          // surfaces composite at their intended alpha over the palette-exact
          // background; bloom added in display space to read on the light theme
          vec3 un = scene.rgb / max(scene.a, 1e-3);
          vec3 sceneDisp = toDisplay(un, uExposure) * scene.a;
          vec3 bloomDisp = toDisplay(texture2D(tBloom, uv).rgb * uBloomStrength, uExposure) * uBloomGain;
          vec3 col = sceneDisp + bg * (1.0 - scene.a) + bloomDisp;

          // soft-knee: compress only the over-1.0 range so glows stay creamy
          vec3 over = max(col - 1.0, 0.0);
          col = min(col, 1.0) + over / (1.0 + over * 2.5);

          // radial vignette + time-varying film grain (display space)
          float vig = 1.0 - uVignette * smoothstep(0.28, 1.15, length(centered));
          col *= vig;
          float g = hash(uv * vec2(1920.0, 1080.0) + fract(uTime) * 431.0) - 0.5;
          col += g * uGrain;

          gl_FragColor = vec4(col, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
  }

  setSize(width, height, resScale, levels) {
    this.dispose();
    this.levels = levels;
    const w = Math.max(2, Math.floor(width * resScale));
    const h = Math.max(2, Math.floor(height * resScale));
    this.width = w; this.height = h;

    const rtScene = makeRT(w, h, true);
    const rtDof = makeRT(w, h, false);
    const mips = [];
    const tmp = [];
    let mw = w >> 1, mh = h >> 1;
    for (let i = 0; i < levels; i++) {
      mips.push(makeRT(mw, mh)); tmp.push(makeRT(mw, mh));
      mw = Math.max(1, mw >> 1); mh = Math.max(1, mh >> 1);
    }
    const accum = makeRT(w >> 1, h >> 1);
    this.rts = { scene: rtScene, dof: rtDof, mips, tmp, accum };
    this.finalMat.uniforms.uAspect.value = width / height;
  }

  render(scene, camera, time) {
    const r = this.renderer, R = this.rts, p = this.params;

    // 1) scene → HDR target
    r.setClearColor(0x000000, 0);
    r.setRenderTarget(R.scene);
    r.clear(true, true, false);
    r.render(scene, camera);

    // 2) bright pass into mip 0
    this.brightMat.uniforms.tSrc.value = R.scene.texture;
    this.brightMat.uniforms.uThreshold.value = p.bloomThreshold;
    this.quad.render(r, this.brightMat, R.mips[0]);

    // 3) downsample chain + separable gaussian blur per level
    for (let i = 1; i < this.levels; i++) {
      this.copyMat.uniforms.tSrc.value = R.mips[i - 1].texture;
      this.quad.render(r, this.copyMat, R.mips[i]);
    }
    for (let i = 0; i < this.levels; i++) {
      const rt = R.mips[i];
      this.blurMat.uniforms.uTexel.value.set(1 / rt.width, 1 / rt.height);
      this.blurMat.uniforms.tSrc.value = rt.texture;
      this.blurMat.uniforms.uDir.value.set(1, 0);
      this.quad.render(r, this.blurMat, R.tmp[i]);
      this.blurMat.uniforms.tSrc.value = R.tmp[i].texture;
      this.blurMat.uniforms.uDir.value.set(0, 1);
      this.quad.render(r, this.blurMat, rt);
    }

    // 4) combine mip pyramid in a single pass (wider mips weighted up for a fat halo)
    const au = this.accumMat.uniforms;
    au.tM0.value = R.mips[0].texture;
    au.tM1.value = R.mips[1] ? R.mips[1].texture : R.mips[0].texture;
    au.tM2.value = R.mips[2] ? R.mips[2].texture : R.mips[0].texture;
    au.tM3.value = R.mips[3] ? R.mips[3].texture : R.mips[0].texture;
    au.tM4.value = R.mips[4] ? R.mips[4].texture : R.mips[0].texture;
    this.quad.render(r, this.accumMat, R.accum);

    // 5) optional depth of field (Cinematic profile)
    let sceneTex = R.scene.texture;
    if (p._dofEnabled) {
      this.dofMat.uniforms.tSrc.value = R.scene.texture;
      this.dofMat.uniforms.tDepth.value = R.scene.depthTexture;
      this.dofMat.uniforms.uNear.value = camera.near;
      this.dofMat.uniforms.uFar.value = camera.far;
      this.dofMat.uniforms.uFocus.value = p.dofFocus;
      this.quad.render(r, this.dofMat, R.dof);
      sceneTex = R.dof.texture;
    }

    // 6) final composite to screen
    const u = this.finalMat.uniforms;
    u.tScene.value = sceneTex;
    u.tBloom.value = R.accum.texture;
    u.tMip0.value = R.mips[0].texture;
    u.uBloomStrength.value = p.bloomStrength;
    u.uExposure.value = p.exposure;
    u.uVignette.value = p.vignette;
    u.uGrain.value = p.grain;
    u.uAberration.value = p.aberration;
    u.uTime.value = time;
    this.quad.render(r, this.finalMat, null);
  }

  setDebugView(mode) { this.finalMat.uniforms.uDebug.value = mode; }

  dispose() {
    if (!this.rts) return;
    this.rts.scene.dispose(); this.rts.dof.dispose(); this.rts.accum.dispose();
    for (const rt of this.rts.mips) rt.dispose();
    for (const rt of this.rts.tmp) rt.dispose();
    this.rts = null;
  }
}
