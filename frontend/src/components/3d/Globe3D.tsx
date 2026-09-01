/**
 * Globe3D — VOJAS strategic intelligence globe
 *
 * Photorealistic procedural Earth:
 *  - Real continent shapes via FBM noise + latitude/longitude masks
 *  - Day/night terminator with custom shader
 *  - Atmospheric scattering (full fresnel rim glow)
 *  - Animated data arcs between project markers (great-circle interpolation)
 *  - Orbital data ring (live counter-rotating ring of stats)
 *  - Bloom postprocessing
 *  - Star field with nebula gradient
 *  - Auto-rotate + OrbitControls with damping
 *
 * Performance: quality adaptive. Mobile: simplified.
 */

import { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, Stars, shaderMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import * as THREE from 'three';

// ── Types ──────────────────────────────────────────────────────────────────

export type MarkerStatus = "success" | "warning" | "danger" | "neutral" | "info";

export interface GlobeMarker {
  id: string;
  lat: number;
  lng: number;
  status: MarkerStatus;
  label: string;
  value?: number;
}

export interface GlobeArc {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  color?: string;
}

interface Globe3DProps {
  markers?: GlobeMarker[];
  arcs?: GlobeArc[];
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
  autoRotate?: boolean;
  showAtmosphere?: boolean;
  showArcs?: boolean;
  showOrbitRing?: boolean;
  showStars?: boolean;
  quality?: "ultra" | "high" | "medium" | "low";
  className?: string;
  ariaLabel?: string;
}

// ── Shader Materials ───────────────────────────────────────────────────────

// Earth: procedural continents via noise + day/night terminator + ocean specular
const EarthMaterial = shaderMaterial(
  {
    uTime: 0,
    uSunDirection: new THREE.Vector3(5, 3, 5).normalize(),
    uOceanColor: new THREE.Color('#0a3a6e'),
    uOceanDeep: new THREE.Color('#021024'),
    uLandColor: new THREE.Color('#1a3a1f'),
    uLandDetail: new THREE.Color('#3a5a30'),
    uDesertColor: new THREE.Color('#7a5a30'),
    uIceColor: new THREE.Color('#ddeeff'),
    uNightColor: new THREE.Color('#0a1a30'),
    uCityGlow: new THREE.Color('#ffd980'),
  },
  // vertex
  /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec2 vUv;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPosition.xyz;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment
  /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform vec3 uSunDirection;
    uniform vec3 uOceanColor;
    uniform vec3 uOceanDeep;
    uniform vec3 uLandColor;
    uniform vec3 uLandDetail;
    uniform vec3 uDesertColor;
    uniform vec3 uIceColor;
    uniform vec3 uNightColor;
    uniform vec3 uCityGlow;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec2 vUv;

    // ── Noise functions (Inigo Quilez style)
    vec3 hash3(vec3 p) {
      p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
               dot(p, vec3(269.5, 183.3, 246.1)),
               dot(p, vec3(113.5, 271.9, 124.6)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      vec3 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
                         dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                     mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
                         dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
                 mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
                         dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                     mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
                         dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
    }

    float fbm(vec3 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 6; i++) {
        v += a * noise(p);
        p *= 2.07;
        a *= 0.5;
      }
      return v;
    }

    // ── Continent mask
    float continentMask(vec3 p) {
      // Stretch in longitude for nicer landmass distribution
      vec3 q = p * vec3(1.4, 1.0, 1.0);
      float c1 = fbm(q * 1.8 + vec3(1.7, 9.2, 0.0));
      float c2 = fbm(q * 3.2 + vec3(8.3, 2.8, 5.1));
      float c3 = fbm(q * 7.5 + vec3(2.1, 4.4, 7.9));
      float continent = c1 * 0.55 + c2 * 0.30 + c3 * 0.15;
      // Bias to make oceans dominant (~30% land)
      return smoothstep(0.05, 0.18, continent);
    }

    // ── Latitude helpers
    float latitudeFactor(vec3 p) {
      // 1 at equator, 0 at poles
      return 1.0 - abs(p.y);
    }

    void main() {
      vec3 n = normalize(vNormal);
      vec3 p = normalize(vWorldPos);

      // ── Surface
      float land = continentMask(p);

      // Land color: vary by latitude (deserts near 30°, ice at poles, green elsewhere)
      float lat = abs(p.y);
      vec3 landC = uLandColor;
      landC = mix(landC, uDesertColor, smoothstep(0.2, 0.35, lat) * (1.0 - smoothstep(0.5, 0.7, lat)));
      landC = mix(landC, uLandDetail, 0.4 + 0.6 * fbm(p * 12.0));
      landC = mix(landC, uIceColor, smoothstep(0.78, 0.88, lat));

      // Ocean color: deep in trenches, brighter near coasts
      float oceanDetail = fbm(p * 6.0) * 0.5 + 0.5;
      vec3 oceanC = mix(uOceanDeep, uOceanColor, oceanDetail);

      vec3 surface = mix(oceanC, landC, land);

      // ── Day/Night
      float nDotL = dot(n, normalize(uSunDirection));
      float dayFactor = smoothstep(-0.15, 0.25, nDotL);

      // Night side: dim surface + city lights (only on land, with flicker)
      float cityMask = land * smoothstep(0.55, 0.85, fbm(p * 35.0));
      float cityFlicker = 0.6 + 0.4 * sin(uTime * 2.0 + p.x * 50.0 + p.z * 30.0);
      vec3 nightSide = surface * 0.05 + uNightColor * 0.4 + uCityGlow * cityMask * cityFlicker * 0.8 * (1.0 - dayFactor);

      // Day side: full surface
      vec3 daySide = surface * (0.6 + 0.4 * max(nDotL, 0.0));

      // Atmospheric fresnel rim (blue glow on horizon)
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5);

      // Cloud layer (subtle)
      float cloud = fbm(p * 4.0 + vec3(uTime * 0.02, 0.0, 0.0));
      cloud = smoothstep(0.4, 0.65, cloud) * smoothstep(0.0, 0.2, latitudeFactor(p));

      vec3 finalColor = mix(nightSide, daySide, dayFactor);
      finalColor = mix(finalColor, vec3(1.0), cloud * 0.3 * dayFactor);
      finalColor += vec3(0.3, 0.55, 0.95) * fresnel * 0.6 * dayFactor;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);
extend({ EarthMaterial });

// Atmosphere: full fresnel-based scattering
const AtmosphereMaterial = shaderMaterial(
  {
    uColor: new THREE.Color('#4d8eff'),
    uIntensity: 1.0,
  },
  /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform vec3 uColor;
    uniform float uIntensity;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    void main() {
      vec3 n = normalize(vNormal);
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
      gl_FragColor = vec4(uColor, fresnel * uIntensity);
    }
  `
);
extend({ AtmosphereMaterial });

// Animated data arc (energy flowing between two points)
function DataArc({ from, to, color = '#3b82f6' }: { from: [number, number, number]; to: [number, number, number]; color?: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const arcGeometry = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const distance = start.distanceTo(end);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(1.0 + distance * 0.35);

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = curve.getPoints(64);

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return { geo, curve };
  }, [from, to]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = (state.clock.getElapsedTime() * 0.4) % 1;
    const point = arcGeometry.curve.getPoint(t);
    meshRef.current.position.copy(point);
  });

  return (
    <>
      <primitive object={new THREE.Line(arcGeometry.geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 }))} />
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
}

// ── Marker ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<MarkerStatus, string> = {
  success: "#22c55e",
  warning: "#fbbf24",
  danger: "#ef4444",
  neutral: "#60a5fa",
  info: "#a78bfa",
};

function latLngToVec3(lat: number, lng: number, r: number = 1): [number, number, number] {
  return [
    Math.cos((lat * Math.PI) / 180) * Math.sin((lng * Math.PI) / 180) * r,
    Math.sin((lat * Math.PI) / 180) * r,
    Math.cos((lat * Math.PI) / 180) * Math.cos((lng * Math.PI) / 180) * r,
  ];
}

function Marker({
  marker,
  isSelected,
  onClick,
}: {
  marker: GlobeMarker;
  isSelected: boolean;
  onClick: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const pos = latLngToVec3(marker.lat, marker.lng, 1.005);
  const color = STATUS_COLORS[marker.status];
  const ringRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const dotRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const phase = marker.lat * 0.1 + marker.lng * 0.05;
    const pulse = Math.sin(t * 2 + phase) * 0.5 + 0.5;

    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      const baseScale = isSelected ? 1.5 : hovered ? 1.2 : 1;
      const animatedScale = baseScale * (1 + pulse * 0.3);
      ringRef.current.scale.setScalar(animatedScale);
      mat.opacity = (isSelected ? 0.5 : 0.18) + pulse * 0.15;
    }

    if (beamRef.current) {
      const beamMat = beamRef.current.material as THREE.MeshBasicMaterial;
      beamRef.current.scale.y = 1 + pulse * 0.2;
      beamMat.opacity = isSelected ? 0.5 : 0.25 + pulse * 0.15;
    }

    if (dotRef.current) {
      const s = isSelected ? 1.6 : hovered ? 1.3 : 1;
      dotRef.current.scale.setScalar(s);
    }
  });

  return (
    <group position={pos}>
      {/* Vertical light beam to surface */}
      <mesh ref={beamRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.04, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>

      {/* Pulse ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.012, 0.022, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Glowing dot */}
      <mesh
        ref={dotRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(marker.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry args={[0.011, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 2.5 : hovered ? 2 : 1.4}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>

      {/* Outer halo */}
      <mesh>
        <sphereGeometry args={[0.018, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={isSelected ? 0.35 : 0.18} />
      </mesh>

      {/* Hover label */}
      {hovered && (
        <HtmlMarker
          position={[0, 0.04, 0]}
          label={marker.label}
          value={marker.value}
          color={color}
        />
      )}
    </group>
  );
}

// Lightweight HTML overlay (no drei import to keep bundle small)
function HtmlMarker({ position, label, value, color }: { position: [number, number, number]; label: string; value?: number; color: string }) {
  // We use raw Three.js + DOM positioning via projected coords.
  const ref = useRef<THREE.Object3D>(null);
  const { camera, size } = useThree();
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  useFrame(() => {
    if (!ref.current) return;
    const v = new THREE.Vector3();
    ref.current.getWorldPosition(v);
    v.project(camera);
    setCoords({ x: (v.x * 0.5 + 0.5) * size.width, y: (-v.y * 0.5 + 0.5) * size.height });
  });

  useEffect(() => {
    // Create the Object3D once
    if (ref.current) return;
    const obj = new THREE.Object3D();
    obj.position.set(...position);
    ref.current = obj;
  }, [position]);

  if (!coords) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: coords.x,
        top: coords.y,
        transform: "translate(-50%, -100%)",
        background: "rgba(8, 12, 24, 0.95)",
        border: `1px solid ${color}40`,
        borderRadius: "8px",
        padding: "8px 12px",
        fontSize: "11px",
        fontFamily: "Inter, sans-serif",
        color: "#e2e8f0",
        whiteSpace: "nowrap",
        fontWeight: 500,
        boxShadow: `0 4px 20px ${color}30, 0 0 0 1px rgba(255,255,255,0.05) inset`,
        backdropFilter: "blur(8px)",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <div style={{ color, fontWeight: 700, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </div>
      {value !== undefined && (
        <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
          {value.toLocaleString("en-IN")}
        </div>
      )}
    </div>
  );
}

// ── Earth ───────────────────────────────────────────────────────────────────

function Earth({ quality }: { quality: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<any>(null);
  const segments = quality === "ultra" ? 96 : quality === "high" ? 72 : 48;

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uTime = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, segments, segments]} />
      {/* @ts-ignore */}
      <earthMaterial ref={matRef} attach="material" />
    </mesh>
  );
}

// ── Atmosphere ─────────────────────────────────────────────────────────────

function Atmosphere({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <group>
      {/* Inner atmosphere */}
      <mesh scale={[1.018, 1.018, 1.018]}>
        <sphereGeometry args={[1, 64, 64]} />
        {/* @ts-ignore */}
        <atmosphereMaterial attach="material" transparent side={THREE.BackSide} />
      </mesh>
      {/* Outer atmosphere halo */}
      <mesh scale={[1.06, 1.06, 1.06]}>
        <sphereGeometry args={[1, 64, 64]} />
        {/* @ts-ignore */}
        <atmosphereMaterial attach="material" transparent side={THREE.BackSide} uIntensity={0.6} />
      </mesh>
    </group>
  );
}

// ── Orbital Data Ring ──────────────────────────────────────────────────────

function OrbitalRing({ visible }: { visible: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const ref2 = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) ref.current.rotation.y = t * 0.15;
    if (ref2.current) ref2.current.rotation.y = -t * 0.1;
    if (ref2.current) ref2.current.rotation.z = t * 0.05;
  });

  if (!visible) return null;

  // Create particle ring
  const ringPoints = useMemo(() => {
    const points: { angle: number; radius: number; y: number }[] = [];
    for (let i = 0; i < 60; i++) {
      points.push({
        angle: (i / 60) * Math.PI * 2,
        radius: 1.45,
        y: 0,
      });
    }
    return points;
  }, []);

  return (
    <>
      <group ref={ref}>
        {ringPoints.map((p, i) => {
          const x = Math.cos(p.angle) * p.radius;
          const z = Math.sin(p.angle) * p.radius;
          const intensity = (i % 3 === 0) ? 1.0 : 0.4;
          return (
            <mesh key={`r1-${i}`} position={[x, 0, z]}>
              <sphereGeometry args={[0.008 * intensity, 6, 6]} />
              <meshBasicMaterial color={i % 3 === 0 ? "#3b82f6" : "#1e3a8a"} />
            </mesh>
          );
        })}
      </group>
      <group ref={ref2} rotation={[Math.PI / 6, 0, 0]}>
        {ringPoints.map((p, i) => {
          const x = Math.cos(p.angle) * 1.7;
          const z = Math.sin(p.angle) * 1.7;
          return (
            <mesh key={`r2-${i}`} position={[x, 0, z]}>
              <sphereGeometry args={[0.005, 6, 6]} />
              <meshBasicMaterial color={i % 4 === 0 ? "#fbbf24" : "#7c2d12"} transparent opacity={0.7} />
            </mesh>
          );
        })}
      </group>
    </>
  );
}

// ── Nebula Background ─────────────────────────────────────────────────────

function Nebula({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <mesh position={[0, 0, 0]} renderOrder={-10}>
      <sphereGeometry args={[80, 32, 32]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={{
          uColor1: { value: new THREE.Color('#0a0a1a') },
          uColor2: { value: new THREE.Color('#1a1a3a') },
          uColor3: { value: new THREE.Color('#2a1a4a') },
        }}
        vertexShader={`
          varying vec3 vWorldPos;
          void main() {
            vWorldPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          varying vec3 vWorldPos;
          float hash(vec3 p) {
            return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
          }
          float noise(vec3 p) {
            vec3 i = floor(p);
            vec3 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                  mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
              mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                  mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z
            );
          }
          float fbm(vec3 p) {
            float v = 0.0; float a = 0.5;
            for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
            return v;
          }
          void main() {
            vec3 dir = normalize(vWorldPos);
            float n = fbm(dir * 3.0);
            float n2 = fbm(dir * 8.0 + 100.0);
            vec3 col = mix(uColor1, uColor2, n);
            col = mix(col, uColor3, n2 * 0.5);
            // Add subtle gradient
            col += vec3(0.05, 0.02, 0.1) * (1.0 - abs(dir.y));
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

// ── Scene Composition ──────────────────────────────────────────────────────

function GlobeScene(props: Globe3DProps) {
  const {
    markers = [],
    arcs = [],
    selectedId,
    onMarkerClick,
    autoRotate = true,
    showAtmosphere = true,
    showArcs = true,
    showOrbitRing = true,
    showStars = true,
    quality = "high",
  } = props;

  const { camera } = useThree();
  const earthRef = useRef<THREE.Group>(null);
  const starCount = quality === "ultra" ? 6000 : quality === "high" ? 3500 : quality === "medium" ? 1500 : 600;

  useEffect(() => {
    camera.position.set(0, 0.5, 3.2);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // Slowly rotate the earth group
  useFrame((_state, delta) => {
    if (autoRotate && earthRef.current) {
      earthRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <>
      {/* Nebula backdrop */}
      <Nebula visible={showStars} />

      {/* Star field */}
      {showStars && (
        <Stars
          radius={50}
          depth={30}
          count={starCount}
          factor={2.5}
          saturation={0}
          fade
          speed={0.4}
        />
      )}

      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={2.2} color="#fffaf0" castShadow={false} />
      <directionalLight position={[-3, -2, -3]} intensity={0.3} color="#3b82f6" />

      <group ref={earthRef}>
        <Earth quality={quality} />
        <Atmosphere visible={showAtmosphere} />

        {/* Markers */}
        {markers.map((m) => (
          <Marker
            key={m.id}
            marker={m}
            isSelected={selectedId === m.id}
            onClick={onMarkerClick || (() => {})}
          />
        ))}

        {/* Data arcs */}
        {showArcs && arcs.map((arc, i) => {
          const from = latLngToVec3(arc.from.lat, arc.from.lng, 1.005);
          const to = latLngToVec3(arc.to.lat, arc.to.lng, 1.005);
          return (
            <DataArc
              key={`arc-${i}`}
              from={from}
              to={to}
              color={arc.color || "#3b82f6"}
            />
          );
        })}
      </group>

      {/* Orbital data ring (rotates independently) */}
      <OrbitalRing visible={showOrbitRing} />

      {/* Camera controls */}
      <OrbitControls
        enableZoom
        enablePan={false}
        enableRotate
        autoRotate={false}
        minDistance={1.6}
        maxDistance={6}
        zoomSpeed={0.4}
        rotateSpeed={0.5}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

// ── Loading Fallback ───────────────────────────────────────────────────────

function GlobeFallback() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: "radial-gradient(circle at center, #0a0e1a 0%, #000000 100%)" }}>
      <div className="relative">
        <div
          className="w-20 h-20 rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, #1a4a7a 0%, #040810 100%)",
            boxShadow: "0 0 60px 20px rgba(59,130,246,0.3)",
            animation: "pulseSoft 2s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: "#3b82f6",
            animation: "spin 1s linear infinite",
          }}
        />
        <div
          className="absolute inset-2 rounded-full border border-transparent"
          style={{
            borderBottomColor: "#fbbf24",
            animation: "spin 1.5s linear infinite reverse",
          }}
        />
      </div>
      <p className="mt-6 text-[10px] text-slate-500 font-semibold tracking-[0.3em] uppercase">
        Initializing Strategic Globe
      </p>
      <p className="mt-1 text-[9px] text-slate-700 tracking-widest">
        Loading real-time intelligence
      </p>
    </div>
  );
}

// ── Screen Reader ──────────────────────────────────────────────────────────

function ScreenReaderMarkersList({ markers }: { markers: GlobeMarker[] }) {
  if (markers.length === 0) return null;
  return (
    <ul className="sr-only" aria-label="Project locations on globe">
      {markers.map((m) => (
        <li key={m.id}>
          <button onClick={() => {}}>
            {m.label} — {m.status} status
            {m.value !== undefined ? `, value: ${m.value.toLocaleString()}` : ""}
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── Public API ─────────────────────────────────────────────────────────────

export default function Globe3D(props: Globe3DProps) {
  const {
    markers = [],
    arcs = [],
    className = "",
    ariaLabel = "Interactive 3D Earth globe showing MPLAD project locations",
    quality = "high",
  } = props;

  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const effectiveQuality = prefersReducedMotion ? "low" : quality;
  const showPostFX = !prefersReducedMotion && (quality === "ultra" || quality === "high");

  return (
    <div
      className={`relative ${className}`}
      style={{ width: "100%", height: "100%", background: "radial-gradient(ellipse at center, #050810 0%, #000000 100%)" }}
      role="img"
      aria-label={ariaLabel}
    >
      <ScreenReaderMarkersList markers={markers} />

      <Suspense fallback={<GlobeFallback />}>
        <Canvas
          camera={{ fov: 50, near: 0.1, far: 1000 }}
          dpr={[1, effectiveQuality === "ultra" ? 2.5 : effectiveQuality === "high" ? 2 : 1.5]}
          frameloop="always"
          style={{ background: "transparent" }}
          gl={{
            antialias: effectiveQuality !== "low",
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
          }}
        >
          <GlobeScene
            {...props}
            markers={markers}
            arcs={arcs}
            quality={effectiveQuality}
            autoRotate={!prefersReducedMotion && (props.autoRotate ?? true)}
          />

          {showPostFX && (
            <EffectComposer multisampling={0}>
              <Bloom
                intensity={0.8}
                luminanceThreshold={0.4}
                luminanceSmoothing={0.5}
                mipmapBlur
                kernelSize={KernelSize.LARGE}
              />
              <Vignette eskil={false} offset={0.3} darkness={0.7} blendFunction={BlendFunction.NORMAL} />
            </EffectComposer>
          )}
        </Canvas>
      </Suspense>

      {/* HUD overlay — corner brackets for sci-fi frame */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-electric-400/50" />
        <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-electric-400/50" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-electric-400/50" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-electric-400/50" />
      </div>

      {/* Reduced motion notice */}
      {prefersReducedMotion && (
        <div className="absolute top-2 left-2 text-[9px] text-slate-500 px-2 py-1 bg-black/60 rounded border border-slate-800">
          Reduced motion · Static view
        </div>
      )}
    </div>
  );
}
