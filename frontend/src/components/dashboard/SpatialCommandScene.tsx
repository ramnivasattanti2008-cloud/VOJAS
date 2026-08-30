/**
 * SpatialCommandScene — WebGL2 3D project node visualization for the Dashboard.
 *
 * Architecture:
 *   - Vanilla WebGL2RenderingContext (no three.js, no new packages)
 *   - Inline GLSL ES 3.0 shaders
 *   - One draw call per frame, GL_POINTS primitives
 *   - HTML overlay for labels + tooltips (projected from 3D each frame)
 *   - Mouse-drag orbit camera
 *   - Graceful fallback if WebGL2 unavailable
 *
 * Node model:
 *   - Each project = one glowing sphere (GL_POINT with radial-soft shader)
 *   - Size = budget / 5_000_000, clamped [8, 60] gl_PointSize
 *   - Color = utilization-derived risk (red >95%, amber 75-95%, blue 50-75%, green <50%)
 *   - Position = spread on a 3D sphere via golden angle
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Project } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SceneNode {
  id: string;
  name: string;
  district: string;
  state: string;
  sector: string;
  amount: number;        // approvedAmount (INR)
  utilization: number;   // spentAmount / approvedAmount (0-2+)
  riskScore: number;   // 0-100, derived from utilization
  // 3D position on sphere
  x: number;
  y: number;
  z: number;
  // color (RGB 0-1)
  r: number;
  g: number;
  b: number;
}

interface Tooltip {
  x: number;
  y: number;
  name: string;
  state: string;
  amount: number;
  riskLabel: string;
  color: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Golden angle sphere distribution — avoids clustering at poles */
function goldenAngle(i: number, total: number): [number, number] {
  const theta = 2 * Math.PI * i * 0.618033988749895; // golden ratio conjugate
  const phi   = Math.acos(1 - (2 * i + 1) / total);
  return [theta, phi];
}

/** Map utilization to risk color (normalized 0-1 RGB) */
function utilizationColor(u: number): [number, number, number] {
  if (u >= 1.0) return [239 / 255, 68 / 255, 68 / 255];   // red — over budget
  if (u >= 0.90) return [249 / 255, 115 / 255, 22 / 255]; // orange
  if (u >= 0.75) return [245 / 255, 158 / 255, 11 / 255]; // amber
  if (u >= 0.50) return [59 / 255, 130 / 255, 246 / 255]; // blue
  return [34 / 255, 197 / 255, 94 / 255];                 // green
}

function riskLabel(u: number): string {
  if (u >= 1.0) return "Over Budget";
  if (u >= 0.90) return "Critical Risk";
  if (u >= 0.75) return "High Risk";
  if (u >= 0.50) return "Medium Risk";
  return "Low Risk";
}

function riskColor(u: number): string {
  if (u >= 1.0) return "#ef4444";
  if (u >= 0.90) return "#f97316";
  if (u >= 0.75) return "#f59e0b";
  if (u >= 0.50) return "#3b82f6";
  return "#22c55e";
}

function fmtINR(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(1)} L`;
  if (v >= 1_000)        return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

// ── Shaders ──────────────────────────────────────────────────────────────────

const VERT = /* glsl */ `#version 300 es
precision highp float;

in vec3  a_position;  // [x, y, z] model-space
in float a_size;      // gl_PointSize
in vec3  a_color;     // [r, g, b] 0-1

uniform mat4 u_proj;
uniform mat4 u_view;

out vec3 v_color;

void main() {
  gl_Position = u_proj * u_view * vec4(a_position, 1.0);
  gl_PointSize = a_size;
  v_color = a_color;
}
`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;

in  vec3  v_color;
out vec4  fragColor;

void main() {
  vec2  coord = gl_PointCoord - vec2(0.5);
  float dist  = length(coord);

  // Core sphere with smooth edge
  float core  = 1.0 - smoothstep(0.25, 0.5, dist);
  // Soft outer glow
  float glow  = exp(-dist * 7.0) * 0.9;

  float alpha = clamp(core + glow * 0.6, 0.0, 1.0);
  vec3  color = v_color + glow * 0.25;

  if (alpha < 0.01) discard;
  fragColor = vec4(color, alpha);
}
`;

// ── Matrix helpers ────────────────────────────────────────────────────────────

/** Column-major 4×4 lookAt view matrix (out param for perf) */
function lookAt(
  out: Float32Array,
  ex: number, ey: number, ez: number,
  cx: number, cy: number, cz: number,
  ux: number, uy: number, uz: number
) {
  let fx = cx - ex, fy = cy - ey, fz = cz - ez;
  let fl = Math.sqrt(fx*fx + fy*fy + fz*fz);
  fx /= fl; fy /= fl; fz /= fl;

  let sx = fy*uz - fz*uy, sy = fz*ux - fx*uz, sz = fx*uy - fy*ux;
  let sl = Math.sqrt(sx*sx + sy*sy + sz*sz);
  sx /= sl; sy /= sl; sz /= sl;

  const ux2 = sy*fz - sz*fy, uy2 = sz*fx - sx*fz, uz2 = sx*fy - sy*fx;

  out[0] = sx;  out[1] = ux2; out[2] = -fx; out[3] = 0;
  out[4] = sy;  out[5] = uy2; out[6] = -fy; out[7] = 0;
  out[8] = sz;  out[9] = uz2; out[10]= -fz; out[11]= 0;
  out[12]= -(sx*ex + sy*ey + sz*ez);
  out[13]= -(ux2*ex + uy2*ey + uz2*ez);
  out[14]= (fx*ex + fy*ey + fz*ez);
  out[15]= 1;
}

/** Column-major perspective projection matrix */
function perspective(out: Float32Array, fovY: number, aspect: number, near: number, far: number) {
  const f  = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  out[0] = f / aspect; out[1] = 0;  out[2] = 0;                       out[3] = 0;
  out[4] = 0;          out[5] = f;  out[6] = 0;                       out[7] = 0;
  out[8] = 0;          out[9] = 0;  out[10]= (far + near) * nf;       out[11]= -1;
  out[12]= 0;          out[13]= 0;  out[14]= 2 * far * near * nf;     out[15]= 0;
}

// Project 3D world position → CSS pixel on screen
function project3D(
  wx: number, wy: number, wz: number,
  vm: Float32Array,
  pm: Float32Array,
  w: number, h: number
): [number, number] | null {
  // World → view space
  const vx = vm[0]*wx + vm[4]*wy + vm[8]*wz  + vm[12];
  const vy = vm[1]*wx + vm[5]*wy + vm[9]*wz  + vm[13];
  const vz = vm[2]*wx + vm[6]*wy + vm[10]*wz + vm[14];
  const vw = vm[3]*wx + vm[7]*wy + vm[11]*wz + vm[15];
  // View → clip space
  let cx = pm[0]*vx + pm[4]*vy + pm[8]*vz  + pm[12]*vw;
  let cy = pm[1]*vx + pm[5]*vy + pm[9]*vz  + pm[13]*vw;
  const cw = pm[3]*vx + pm[7]*vy + pm[11]*vz + pm[15]*vw;

  if (Math.abs(cw) < 1e-6) return null;
  cx /= cw; cy /= cw;

  // NDC → pixels
  return [(cx + 1) * 0.5 * w, (1 - cy) * 0.5 * h];
}

// ── Shader compilation ────────────────────────────────────────────────────────

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${log}`);
  }
  return shader;
}

function linkProgram(
  gl: WebGL2RenderingContext,
  vert: WebGLShader,
  frag: WebGLShader
): WebGLProgram {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`Program link error: ${log}`);
  }
  return prog;
}

// ── Scene builder ────────────────────────────────────────────────────────────

function buildNodes(projects: Project[]): SceneNode[] {
  const n = projects.length;
  if (n === 0) return [];

  const SPREAD_R = 2.4; // orbit radius

  return projects.map((p, i) => {
    const u = p.approvedAmount > 0
      ? Math.min(p.spentAmount / p.approvedAmount, 1.5)
      : 0;
    const riskScore = Math.round(Math.min(u, 1.5) * 100);
    const [r, g, b] = utilizationColor(u);
    const [theta, phi] = goldenAngle(i, Math.max(n, 1));

    return {
      id:        p.id,
      name:      p.name,
      district:  p.district,
      state:     p.state,
      sector:    p.sector.replace(/_/g, " "),
      amount:    p.approvedAmount,
      utilization: u,
      riskScore,
      x: SPREAD_R * Math.sin(phi) * Math.cos(theta),
      y: SPREAD_R * Math.cos(phi) * 0.45, // compress Y slightly
      z: SPREAD_R * Math.sin(phi) * Math.sin(theta),
      r, g, b,
    };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  projects: Project[];
}

export default function SpatialCommandScene({ projects }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate    = useNavigate();

  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [webgl2, setWebgl2]  = useState<WebGL2RenderingContext | null>(null);
  const [labels, setLabels]   = useState<Array<Tooltip & { id: string }>>([]);

  // Camera state
  const angleRef   = useRef(0.4);        // horizontal orbit angle (radians)
  const heightRef  = useRef(0.6);        // camera Y
  const draggingRef = useRef(false);
  const lastXRef   = useRef(0);
  const lastYRef   = useRef(0);
  const rafRef     = useRef<number>(0);

  // WebGL state refs (avoid stale closures)
  const progRef   = useRef<WebGLProgram | null>(null);
  const nodesRef  = useRef<SceneNode[]>([]);
  const projMat   = useRef(new Float32Array(16));
  const viewMat   = useRef(new Float32Array(16));
  const projLoc   = useRef<WebGLUniformLocation | null>(null);
  const viewLoc   = useRef<WebGLUniformLocation | null>(null);

  // ── Init WebGL2 ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx: WebGL2RenderingContext | null = null;
    try {
      ctx = canvas.getContext("webgl2", {
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }) as WebGL2RenderingContext | null;
    } catch {
      ctx = null;
    }

    if (!ctx) {
      setWebgl2(null);
      return;
    }

    // Compile shaders + link program
    try {
      const v = compileShader(ctx, ctx.VERTEX_SHADER,   VERT);
      const f = compileShader(ctx, ctx.FRAGMENT_SHADER, FRAG);
      const p = linkProgram(ctx, v, f);
      progRef.current = p;

      // Cache uniform locations
      projLoc.current = ctx.getUniformLocation(p, "u_proj");
      viewLoc.current = ctx.getUniformLocation(p, "u_view");

      // Bind VAO (required in WebGL2)
      ctx.bindVertexArray(null);
    } catch (err) {
      console.error("[SpatialCommandScene] WebGL init failed:", err);
      setWebgl2(null);
      return;
    }

    setWebgl2(ctx);
    return () => {
      ctx?.deleteProgram(progRef.current!);
      setWebgl2(null);
    };
  }, []);

  // ── Build node data when projects change ──────────────────────────────────
  useEffect(() => {
    nodesRef.current = buildNodes(projects);
  }, [projects]);

  // ── Resize canvas to container ───────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const cont   = containerRef.current;
    if (!canvas || !cont) return;

    const ro = new ResizeObserver(() => {
      const c = canvasRef.current;
      const ct = containerRef.current;
      if (!c || !ct) return;
      const { width, height } = ct.getBoundingClientRect();
      c.width  = Math.round(width  * devicePixelRatio);
      c.height = Math.round(height * devicePixelRatio);
    });
    ro.observe(cont);
    // Initial size
    const { width, height } = cont.getBoundingClientRect();
    canvas.width  = Math.round(width  * devicePixelRatio);
    canvas.height = Math.round(height * devicePixelRatio);

    return () => ro.disconnect();
  }, []);

  // ── Render loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !webgl2 || !progRef.current) return;

    const ctx = webgl2;
    const prog = progRef.current;

    // Attribute locations (must be looked up after program is linked)
    const posLoc  = ctx.getAttribLocation(prog, "a_position");
    const sizeLoc = ctx.getAttribLocation(prog, "a_size");
    const colLoc  = ctx.getAttribLocation(prog, "a_color");

    // Allocate typed arrays once
    const posBuf  = ctx.createBuffer();
    const sizeBuf = ctx.createBuffer();
    const colBuf  = ctx.createBuffer();

    function draw(ts: number) {
      const c = canvasRef.current;
      if (!c) return;
      const W = c.width;
      const H = c.height;
      const nodes = nodesRef.current;

      // Auto-rotate unless user is dragging
      if (!draggingRef.current) {
        angleRef.current += 0.004;
      }

      const R    = 5.5;
      const eyeX = Math.sin(angleRef.current) * R;
      const eyeY = heightRef.current * 2;
      const eyeZ = Math.cos(angleRef.current) * R;

      // Build matrices
      perspective(projMat.current, Math.PI / 4, W / H, 0.1, 100);
      lookAt(viewMat.current, eyeX, eyeY, eyeZ, 0, 0, 0, 0, 1, 0);

      // ── WebGL draw ──────────────────────────────────────────────────────
      ctx.viewport(0, 0, W, H);
      ctx.clearColor(0.03, 0.05, 0.08, 1.0);
      ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
      ctx.enable(ctx.BLEND);
      ctx.blendFunc(ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA);
      // In WebGL2, gl_PointSize is always writable in vertex shader — no enable needed

      ctx.useProgram(prog);
      ctx.uniformMatrix4fv(projLoc.current, false, projMat.current);
      ctx.uniformMatrix4fv(viewLoc.current, false, viewMat.current);

      if (nodes.length > 0) {
        const positions = new Float32Array(nodes.length * 3);
        const sizes    = new Float32Array(nodes.length);
        const colors   = new Float32Array(nodes.length * 3);

        for (let i = 0; i < nodes.length; i++) {
          const nd = nodes[i];
          // Gentle vertical float based on time + index
          const floatY = Math.sin(ts * 0.001 + i * 0.8) * 0.06;
          positions[i*3]   = nd.x;
          positions[i*3+1] = nd.y + floatY;
          positions[i*3+2] = nd.z;
          sizes[i] = Math.min(Math.max(nd.amount / 5_000_000, 8), 60) * (H / 400);
          colors[i*3]   = nd.r;
          colors[i*3+1] = nd.g;
          colors[i*3+2] = nd.b;
        }

        // Position buffer
        ctx.bindBuffer(ctx.ARRAY_BUFFER, posBuf);
        ctx.bufferData(ctx.ARRAY_BUFFER, positions, ctx.DYNAMIC_DRAW);
        ctx.enableVertexAttribArray(posLoc);
        ctx.vertexAttribPointer(posLoc, 3, ctx.FLOAT, false, 0, 0);

        // Size buffer
        ctx.bindBuffer(ctx.ARRAY_BUFFER, sizeBuf);
        ctx.bufferData(ctx.ARRAY_BUFFER, sizes, ctx.DYNAMIC_DRAW);
        ctx.enableVertexAttribArray(sizeLoc);
        ctx.vertexAttribPointer(sizeLoc, 1, ctx.FLOAT, false, 0, 0);

        // Color buffer
        ctx.bindBuffer(ctx.ARRAY_BUFFER, colBuf);
        ctx.bufferData(ctx.ARRAY_BUFFER, colors, ctx.DYNAMIC_DRAW);
        ctx.enableVertexAttribArray(colLoc);
        ctx.vertexAttribPointer(colLoc, 3, ctx.FLOAT, false, 0, 0);

        ctx.drawArrays(ctx.POINTS, 0, nodes.length);
      }

      // ── Project labels to screen space ──────────────────────────────────
      if (nodes.length > 0) {
        const lbls: Array<Tooltip & { id: string }> = [];
        for (let i = 0; i < nodes.length; i++) {
          const nd = nodes[i];
          const floatY = Math.sin(ts * 0.001 + i * 0.8) * 0.06;
          const pt = project3D(nd.x, nd.y + floatY, nd.z, viewMat.current, projMat.current, W, H);
          if (!pt) continue;
          const [px, py] = pt;
          if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;
          lbls.push({
            id:       nd.id,
            x:        px / devicePixelRatio,
            y:        py / devicePixelRatio,
            name:     nd.name,
            state:    nd.state,
            amount:   nd.amount,
            riskLabel: riskLabel(nd.utilization),
            color:    riskColor(nd.utilization),
          });
        }
        setLabels(lbls);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [webgl2]);

  // ── Mouse / touch orbit ──────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastXRef.current;
    const dy = e.clientY - lastYRef.current;
    angleRef.current  -= dx * 0.008;
    heightRef.current  = Math.max(-0.8, Math.min(1.6, heightRef.current - dy * 0.006));
    lastXRef.current  = e.clientX;
    lastYRef.current  = e.clientY;
  }, []);

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const onMouseLeave = useCallback(() => {
    draggingRef.current = false;
  }, []);

  // ── Hover detection ──────────────────────────────────────────────────────
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Hit-test against projected labels (larger hitbox)
    const HIT = 32;
    let found: typeof labels[0] | null = null;
    for (const l of labels) {
      if (Math.abs(l.x - mx) < HIT && Math.abs(l.y - my) < HIT) {
        found = l;
        break;
      }
    }
    setTooltip(found ? { x: found.x, y: found.y, name: found.name, state: found.state, amount: found.amount, riskLabel: found.riskLabel, color: found.color } : null);
  }, [labels]);

  const onMouseLeaveCanvas = useCallback(() => setTooltip(null), []);

  // ── Click navigation ──────────────────────────────────────────────────────
  const onClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !tooltip) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const HIT = 32;
    for (const l of labels) {
      if (Math.abs(l.x - mx) < HIT && Math.abs(l.y - my) < HIT) {
        navigate(`/projects/${l.id}`);
        return;
      }
    }
  }, [labels, tooltip, navigate]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!webgl2 || !progRef.current) {
    return (
      <div
        className="glass rounded-xl overflow-hidden flex flex-col items-center justify-center gap-3"
        style={{ height: 280 }}
      >
        {/* Ambient orbs behind fallback */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 30% 40%, rgba(37,99,235,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(124,58,237,0.08) 0%, transparent 60%)",
          }}
        />
        {/* Central icon */}
        <div className="relative w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-electric-400">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-300">Spatial Intelligence</p>
          <p className="text-xs text-slate-600 mt-0.5">
            {projects.length} projects · WebGL2 unavailable
          </p>
        </div>
        {/* Project list as fallback */}
        {projects.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-1 px-4">
            {projects.slice(0, 6).map(p => (
              <span
                key={p.id}
                className="text-[10px] px-2 py-1 rounded-full border border-white/10 text-slate-500 cursor-pointer hover:border-electric-500/30 hover:text-electric-400 transition-colors"
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                {p.state}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden select-none"
      style={{ height: 280 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeaveCanvas}
      onClick={onClick}
      title="Drag to orbit · hover for details · click to open project"
    >
      {/* WebGL canvas — z-index 0 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onMouseLeave}
      />

      {/* HTML label overlay — z-index 10 */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {labels.map(l => {
          const isHovered = tooltip?.x === l.x && tooltip?.y === l.y;
          return (
            <div
              key={l.id}
              className="absolute transform -translate-x-1/2 transition-all duration-100 pointer-events-none"
              style={{
                left: l.x,
                top:  l.y - 28,
                opacity: isHovered ? 1 : 0.55,
              }}
            >
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-full border"
                style={{
                  borderColor: `${l.color}40`,
                  backgroundColor: `${l.color}18`,
                  backdropFilter: "blur(8px)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: l.color }}
                />
                <span
                  className="text-[10px] font-medium whitespace-nowrap max-w-[120px] truncate"
                  style={{ color: l.color }}
                >
                  {l.state}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip — z-index 20 */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top:  tooltip.y - 80,
            transform: "translateX(-50%)",
          }}
        >
          <div
            className="rounded-xl border px-3 py-2.5 min-w-[160px] max-w-[220px]"
            style={{
              background: "rgba(17,25,43,0.92)",
              borderColor: `${tooltip.color}40`,
              backdropFilter: "blur(16px)",
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 12px ${tooltip.color}20`,
            }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: tooltip.color }}
              />
              <span
                className="text-[11px] font-semibold text-white leading-tight truncate"
              >
                {tooltip.name}
              </span>
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between gap-4">
                <span className="text-[10px] text-slate-500">Location</span>
                <span className="text-[10px] text-slate-300 font-medium">{tooltip.state}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[10px] text-slate-500">Budget</span>
                <span className="text-[10px] text-slate-300 font-mono">{fmtINR(tooltip.amount)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[10px] text-slate-500">Risk</span>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: tooltip.color }}
                >
                  {tooltip.riskLabel}
                </span>
              </div>
            </div>
            <div
              className="mt-2 pt-1.5 border-t text-[9px] text-slate-600 text-center"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              Click to open project
            </div>
          </div>
          {/* Tooltip arrow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45"
            style={{
              background: "rgba(17,25,43,0.92)",
              borderRight: `1px solid ${tooltip.color}40`,
              borderBottom: `1px solid ${tooltip.color}40`,
            }}
          />
        </div>
      )}

      {/* Top-left badge */}
      <div
        className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10"
        style={{
          background: "rgba(8,11,16,0.6)",
          backdropFilter: "blur(8px)",
        }}
      >
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
            style={{ backgroundColor: "#3b82f6" }}
          />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-electric-400" />
        </span>
        <span className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">
          Spatial Intelligence
        </span>
        <span className="text-[10px] text-slate-600 font-mono">{projects.length} nodes</span>
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-3 right-3 z-30 text-[9px] text-slate-700 font-mono">
        drag to orbit · hover to inspect
      </div>
    </div>
  );
}
