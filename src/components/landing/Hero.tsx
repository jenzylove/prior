"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────────────
   The hero plays the product, not a picture of it.
   1 scattered fragments  → 2 gathered into one file → 3 each fact locks as it
   is sealed → 4 two facts disagree and flare red → 5 a refusal letter turns a
   cluster into lessons → 6 the file holds, then the loop starts again.
   ───────────────────────────────────────────────────────────────────── */

export const PHASES = [
  { k: "scatter", t: 0, title: "Every form you ever filed is on record.", sub: "With the officer. Not with you." },
  { k: "gather", t: 3.2, title: "Prior gathers your history into one file.", sub: "Jobs, addresses, trips, past answers, in plain words." },
  { k: "seal", t: 6.6, title: "Each fact is sealed on Walrus.", sub: "Encrypted with Seal before it leaves the browser." },
  { k: "contradict", t: 10.6, title: "Two filings disagree.", sub: "Flagged in red, with the fix, before an officer sees it." },
  { k: "refusal", t: 14.6, title: "A refusal letter arrives.", sub: "Each reason becomes a lesson. The next pack changes." },
  { k: "hold", t: 19.6, title: "One file. Every application after it agrees with it.", sub: "The officer remembers your priors. Now you do too." },
] as const;
const LOOP = 22.6;

const N = 2600;
const WHITE = new THREE.Color(0.86, 0.87, 0.9);
const DIM = new THREE.Color(0.42, 0.44, 0.5);
const ICE = new THREE.Color(0.5, 0.89, 1.0);
const RED = new THREE.Color(1.0, 0.3, 0.24);

const VERT = `
attribute float aSize;
attribute vec3 aColor;
attribute float aAlpha;
varying vec3 vColor;
varying float vAlpha;
uniform float uScale;
void main(){
  vColor = aColor; vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  // points at the back fade, so the sphere reads as a volume
  float depth = clamp((position.z + 1.2) / 2.4, 0.0, 1.0);
  vAlpha *= 0.3 + 0.7 * depth;
  gl_PointSize = aSize * (uScale / -mv.z) * (0.75 + 0.25 * depth);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.28, d);
  gl_FragColor = vec4(vColor, a * vAlpha);
}`;

const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const phaseAt = (t: number) => { let p = 0; for (let i = 0; i < PHASES.length; i++) if (t >= PHASES[i].t) p = i; return p; };

export function HeroScene({ onPhase }: { onPhase?: (i: number) => void }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    camera.position.set(0, 0, 3.4);

    /* geometry */
    const home = new Float32Array(N * 3);
    const away = new Float32Array(N * 3);
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const size = new Float32Array(N);
    const alpha = new Float32Array(N);
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = phi * i;
      home[i * 3] = Math.cos(th) * r; home[i * 3 + 1] = y; home[i * 3 + 2] = Math.sin(th) * r;
      const u = Math.random(), v = Math.random(), w = Math.cbrt(Math.random()) * 2.6 + 0.4;
      const a = u * Math.PI * 2, b = Math.acos(2 * v - 1);
      away[i * 3] = Math.sin(b) * Math.cos(a) * w; away[i * 3 + 1] = Math.sin(b) * Math.sin(a) * w * 0.8; away[i * 3 + 2] = Math.cos(b) * w;
      pos[i * 3] = away[i * 3]; pos[i * 3 + 1] = away[i * 3 + 1]; pos[i * 3 + 2] = away[i * 3 + 2];
      col[i * 3] = DIM.r; col[i * 3 + 1] = DIM.g; col[i * 3 + 2] = DIM.b;
      size[i] = 2.2; alpha[i] = 0.75;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      uniforms: { uScale: { value: 300 } },
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    /* the red thread between two facts that disagree */
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const lineMat = new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0 });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);

    /* per run picks */
    let cA = -1, cB = -1;
    let lessons: number[] = [];
    const sealedAt = new Float32Array(N).fill(-1);
    const sealOrder = new Float32Array(N);
    for (let i = 0; i < N; i++) sealOrder[i] = (1 - home[i * 3 + 1]) / 2 + (Math.random() - 0.5) * 0.08; // top to bottom with jitter
    let lastPhase = -1;
    let lastLoop = -1;

    const rot = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const pickNearest = (target: THREE.Vector3, angle: number, exclude: Set<number>) => {
      let best = -1, bd = -Infinity;
      for (let i = 0; i < N; i++) {
        if (exclude.has(i)) continue;
        rotY(home, i, angle, rot);
        const d = rot.dot(target);
        if (d > bd) { bd = d; best = i; }
      }
      return best;
    };
    function rotY(src: Float32Array, i: number, a: number, out: THREE.Vector3) {
      const x = src[i * 3], y = src[i * 3 + 1], z = src[i * 3 + 2];
      out.set(x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a));
    }

    const sat = new THREE.Vector3(1.05, 0.55, 0.45);
    const satDir = new THREE.Vector3(0.62, -0.12, 0.77).normalize();

    /* sizing */
    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // keep the sphere framed on narrow screens
      camera.position.z = w < h ? 4.6 : 4.5;
      // sit the sphere to the right of the headline on wide screens, above the caption
      camera.position.x = w >= 1024 ? -0.45 : 0;
      camera.position.y = w >= 1024 ? -0.2 : w < h ? -0.7 : 0;
      // aSize is the point diameter in CSS px at the sphere's distance
      mat.uniforms.uScale.value = renderer.getPixelRatio() * camera.position.z * Math.max(0.7, h / 900);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    /* loop */
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let t0 = performance.now(); // wall clock keeps the story on time even when frames are slow
    let elapsed = reduced ? 9.4 : 0; // reduced motion: a still frame of the sealed sphere
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) { const n = performance.now(); last = n; t0 = n - elapsed * 1000; raf = requestAnimationFrame(tick); } }, { threshold: 0.05 });
    io.observe(el);

    function tick(now: number) {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) elapsed = (now - t0) / 1000;
      const t = elapsed % LOOP;
      const loopN = Math.floor(elapsed / LOOP);
      const ph = phaseAt(t);
      const angle = elapsed * 0.09;

      if (loopN !== lastLoop) { lastLoop = loopN; sealedAt.fill(-1); cA = cB = -1; lessons = []; }
      if (ph !== lastPhase) {
        lastPhase = ph;
        onPhase?.(ph);
        if (PHASES[ph].k === "contradict") {
          const ex = new Set<number>();
          cA = pickNearest(new THREE.Vector3(0.42, 0.38, 0.82).normalize(), angle, ex); ex.add(cA);
          cB = pickNearest(new THREE.Vector3(-0.5, -0.3, 0.8).normalize(), angle, ex);
        }
        if (PHASES[ph].k === "refusal") {
          const scored: { i: number; d: number }[] = [];
          for (let i = 0; i < N; i++) { rotY(home, i, angle, rot); scored.push({ i, d: rot.dot(satDir) }); }
          scored.sort((a, b) => b.d - a.d);
          lessons = scored.slice(0, 150).map((s) => s.i);
        }
      }
      const k = PHASES[ph].k;
      const pt = t - PHASES[ph].t;
      const lessonSet = k === "refusal" || k === "hold" ? new Set(lessons) : null;
      const gatherF = k === "scatter" ? 0 : k === "gather" ? smooth(pt / 3.0) : 1;
      const sealF = k === "seal" ? pt / 3.6 : k === "scatter" || k === "gather" ? -1 : 2;
      const lerp = 1 - Math.exp(-dt * (k === "gather" ? 2.4 : 4.5));
      const drift = elapsed * 0.35;

      for (let i = 0; i < N; i++) {
        rotY(home, i, angle, rot);
        // target
        if (gatherF < 1) {
          const ax = away[i * 3] + Math.sin(drift + i) * 0.06, ay = away[i * 3 + 1] + Math.cos(drift * 0.8 + i * 0.3) * 0.06, az = away[i * 3 + 2];
          tmp.set(ax + (rot.x - ax) * gatherF, ay + (rot.y - ay) * gatherF, az + (rot.z - az) * gatherF);
        } else if (k === "refusal" && lessonSet?.has(i)) {
          const f = smooth(pt / 1.6);
          tmp.set(rot.x + (sat.x + (rot.x - satDir.x) * 0.55 - rot.x) * f, rot.y + (sat.y + (rot.y - satDir.y) * 0.55 - rot.y) * f, rot.z + (sat.z + (rot.z - satDir.z) * 0.55 - rot.z) * f);
        } else tmp.copy(rot);
        pos[i * 3] += (tmp.x - pos[i * 3]) * lerp;
        pos[i * 3 + 1] += (tmp.y - pos[i * 3 + 1]) * lerp;
        pos[i * 3 + 2] += (tmp.z - pos[i * 3 + 2]) * lerp;

        // colour and size
        let c = DIM, s = 2.2, a = 0.7;
        if (gatherF >= 1 || k === "gather") { c = DIM; s = 2.1; a = 0.75; }
        if (sealF >= 0 && sealF <= 1.2) {
          const d = sealF - sealOrder[i];
          if (d > 0 && sealedAt[i] < 0) sealedAt[i] = elapsed;
        }
        if (sealedAt[i] >= 0 || sealF > 1.2) {
          const since = sealedAt[i] >= 0 ? elapsed - sealedAt[i] : 9;
          const flash = Math.max(0, 1 - since / 0.7);
          c = WHITE; s = 2.5 + flash * 5; a = 0.95;
          if (flash > 0) { col[i * 3] = WHITE.r + (ICE.r - WHITE.r) * flash; col[i * 3 + 1] = WHITE.g + (ICE.g - WHITE.g) * flash; col[i * 3 + 2] = WHITE.b + (ICE.b - WHITE.b) * flash; size[i] = s; alpha[i] = a; continue; }
        }
        if ((k === "contradict" || k === "refusal" || k === "hold") && (i === cA || i === cB)) {
          const pulse = 0.5 + 0.5 * Math.sin(elapsed * 6);
          c = RED; s = 7 + pulse * 5; a = 1;
        }
        if (lessonSet?.has(i)) {
          const f = k === "refusal" ? smooth((pt - 0.4) / 1.2) : 1;
          col[i * 3] = c.r + (ICE.r - c.r) * f; col[i * 3 + 1] = c.g + (ICE.g - c.g) * f; col[i * 3 + 2] = c.b + (ICE.b - c.b) * f;
          size[i] = s + 1.4 * f; alpha[i] = a; continue;
        }
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; size[i] = s; alpha[i] = a;
      }
      // whole sphere exhales at the hold
      if (k === "hold") { const b = 1 + 0.03 * Math.sin(pt * 1.4); points.scale.setScalar(b); } else points.scale.setScalar(1);

      // red thread
      if (cA >= 0 && cB >= 0 && (k === "contradict" || k === "refusal" || k === "hold")) {
        const lp = lineGeo.attributes.position.array as Float32Array;
        lp[0] = pos[cA * 3]; lp[1] = pos[cA * 3 + 1]; lp[2] = pos[cA * 3 + 2];
        lp[3] = pos[cB * 3]; lp[4] = pos[cB * 3 + 1]; lp[5] = pos[cB * 3 + 2];
        lineGeo.attributes.position.needsUpdate = true;
        const target = k === "contradict" ? smooth(pt / 0.8) * 0.9 : k === "refusal" ? 0.5 : 0.35;
        lineMat.opacity += (target - lineMat.opacity) * lerp;
      } else lineMat.opacity += (0 - lineMat.opacity) * lerp;
      line.scale.copy(points.scale);

      geo.attributes.position.needsUpdate = true;
      geo.attributes.aColor.needsUpdate = true;
      geo.attributes.aSize.needsUpdate = true;
      geo.attributes.aAlpha.needsUpdate = true;
      renderer.render(scene, camera);
      if (visible && !reduced) raf = requestAnimationFrame(tick);
      if (reduced && elapsed < 60) { elapsed += 0.5; raf = requestAnimationFrame(tick); } // settle the still frame
    }
    raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect();
      geo.dispose(); mat.dispose(); lineGeo.dispose(); lineMat.dispose(); renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [onPhase]);

  return <div ref={host} className="absolute inset-0 [&>canvas]:block [&>canvas]:w-full [&>canvas]:h-full" aria-hidden />;
}

export default function Hero() {
  const [phase, setPhase] = useState(0);
  const p = PHASES[phase];
  const red = p.k === "contradict";
  const ice = p.k === "seal" || p.k === "refusal";
  return (
    <section className="relative bg-[#050506] text-white min-h-[100svh] overflow-hidden" aria-label="Prior, a visa agent that remembers your history">
      {/* scene */}
      <div className="absolute inset-0 lg:left-[34%]">
        <HeroScene onPhase={setPhase} />
      </div>
      {/* soft vignette so type stays readable */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(60%_60%_at_20%_60%,rgba(5,5,6,0.85),transparent_70%)] lg:bg-[linear-gradient(90deg,#050506_0%,#050506_28%,rgba(5,5,6,0)_55%)]" />

      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-8 min-h-[100svh] flex flex-col justify-end lg:justify-center pb-10 pt-28 lg:pt-24">
        <div className="max-w-[640px]">
          <div className="label !text-white/50 mb-6 rise">Visa applications, written from your own record</div>
          <h1 className="display display-tight text-[46px] sm:text-[72px] lg:text-[84px] rise" style={{ animationDelay: ".08s" }}>
            The officer remembers your priors.
            <br />
            <span className="text-white/45">Now you do too.</span>
          </h1>
          <p className="mt-7 text-[18px] sm:text-[21px] leading-[1.4] text-white/70 max-w-[46ch] rise" style={{ animationDelay: ".18s" }}>
            Prior keeps every visa application you ever filed and writes the next one from it. Every answer cites your record,
            every contradiction is flagged in red, every refusal becomes a lesson.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4 rise" style={{ animationDelay: ".28s" }}>
            <Link href="/app" className="btn !bg-white !text-black !border-white">
              Start your file <span className="arrow" aria-hidden>→</span>
            </Link>
            <a href="#how" className="btn btn-ghost !text-white !border-white/30 hover:!border-white">
              What you will do
            </a>
          </div>
        </div>

        {/* story caption, synced to the scene */}
        <div className="mt-14 lg:mt-0 lg:absolute lg:right-8 lg:bottom-10 lg:max-w-[380px] w-full">
          <div className="flex gap-1.5 mb-4" aria-hidden>
            {PHASES.map((_, i) => (
              <span key={i} className="h-[2px] flex-1 rounded-full transition-colors duration-500" style={{ background: i <= phase ? (red && i === phase ? "#ff4d3d" : "#fff") : "rgba(255,255,255,.18)" }} />
            ))}
          </div>
          <div key={phase} className="fade-in" aria-live="polite">
            <div className="mono text-[11px] tracking-[0.14em] uppercase mb-2" style={{ color: red ? "#ff4d3d" : ice ? "#7fe3ff" : "rgba(255,255,255,.5)" }}>
              {String(phase + 1).padStart(2, "0")} / 06
            </div>
            <p className="text-[20px] sm:text-[22px] leading-[1.25] font-medium">{p.title}</p>
            <p className="mt-1.5 text-[15px] text-white/60">{p.sub}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
