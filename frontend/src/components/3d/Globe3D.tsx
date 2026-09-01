/**
 * Globe3D — VOJAS interactive 3D Earth globe
 *
 * The strategic overview for the MPLAD command center.
 * Renders a photorealistic Earth with location markers,
 * atmospheric glow, star field, and smooth camera controls.
 *
 * Performance: uses frameloop="demand" after initial render.
 * Mobile: simplified mode (no atmosphere, fewer stars).
 */

import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';

// ── Types ──────────────────────────────────────────────────────────────────

export type MarkerStatus = "success" | "warning" | "danger" | "neutral";

export interface GlobeMarker {
  id: string;
  lat: number;
  lng: number;
  status: MarkerStatus;
  label: string;
  value?: number;
}

interface Globe3DProps {
  markers?: GlobeMarker[];
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
  autoRotate?: boolean;
  showAtmosphere?: boolean;
  showClouds?: boolean;
  showStars?: boolean;
  quality?: "high" | "medium" | "low";
  className?: string;
  ariaLabel?: string;
}

interface MarkerMeshProps {
  marker: GlobeMarker;
  isSelected: boolean;
  onClick: (id: string) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const EARTH_RADIUS = 1;
const MARKER_SIZE = 0.025;

const STATUS_COLORS: Record<MarkerStatus, string> = {
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  neutral: "#3b82f6",
};

// ── Marker Mesh ──────────────────────────────────────────────────────────────

function MarkerMesh({ marker, isSelected, onClick }: MarkerMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Convert lat/lng to 3D position on sphere
  const position: [number, number, number] = [
    Math.cos((marker.lat * Math.PI) / 180) * Math.sin((marker.lng * Math.PI) / 180) * EARTH_RADIUS,
    Math.sin((marker.lat * Math.PI) / 180) * EARTH_RADIUS,
    Math.cos((marker.lat * Math.PI) / 180) * Math.cos((marker.lng * Math.PI) / 180) * EARTH_RADIUS,
  ];

  const color = STATUS_COLORS[marker.status];
  const scale = isSelected ? 1.8 : hovered ? 1.4 : 1;

  // Pulse animation for idle markers
  useFrame((state) => {
    if (!ringRef.current) return;
    const t = state.clock.getElapsedTime();
    const pulse = Math.sin(t * 2 + marker.lat * 0.1) * 0.1 + 1;
    ringRef.current.scale.setScalar(isSelected ? 1.5 : pulse * (hovered ? 1.3 : 1));
    const mat = ringRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = isSelected ? 0.6 : hovered ? 0.4 : 0.2 + Math.sin(t * 2) * 0.1;
  });

  return (
    <group position={position}>
      {/* Pulse ring */}
      <mesh ref={ringRef} scale={1}>
        <ringGeometry args={[MARKER_SIZE * 1.2, MARKER_SIZE * 2, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Main marker dot */}
      <mesh
        ref={meshRef}
        scale={scale}
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
        <sphereGeometry args={[MARKER_SIZE, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 1.5 : 0.8}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Glow halo */}
      <mesh scale={scale * 1.5}>
        <sphereGeometry args={[MARKER_SIZE * 1.2, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={isSelected ? 0.3 : 0.15} />
      </mesh>

      {/* Hover label */}
      {hovered && (
        <Html center distanceFactor={4} style={{ pointerEvents: "none" }}>
          <div
            style={{
              background: "rgba(10, 14, 24, 0.95)",
              border: "1px solid rgba(46,54,82,0.8)",
              borderRadius: "6px",
              padding: "6px 10px",
              fontSize: "11px",
              fontFamily: "Inter, sans-serif",
              color: "#e2e8f0",
              whiteSpace: "nowrap",
              fontWeight: 500,
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ color: color, fontWeight: 600, marginBottom: 2 }}>{marker.label}</div>
            {marker.value !== undefined && (
              <div style={{ color: "#6c7595", fontSize: 10 }}>{marker.value.toLocaleString()}</div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Atmosphere ──────────────────────────────────────────────────────────────

function Atmosphere({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <mesh scale={[1.025, 1.025, 1.025]}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <shaderMaterial
        transparent
        side={THREE.FrontSide}
        depthWrite={false}
        uniforms={{
          glowColor: { value: new THREE.Color("#3b82f6") },
        }}
        vertexShader={`
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec3 vNormal;
          uniform vec3 glowColor;
          void main() {
            float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
            gl_FragColor = vec4(glowColor, intensity * 0.5);
          }
        `}
      />
    </mesh>
  );
}

// ── Earth Mesh ─────────────────────────────────────────────────────────────

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <group>
      {/* Earth sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color="#1a4a7a"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Simple grid overlay to suggest continents */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.001, 32, 32]} />
        <meshBasicMaterial
          color="#0a2540"
          transparent
          opacity={0.4}
          wireframe
        />
      </mesh>

      {/* Specular ocean highlights */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.002, 64, 64]} />
        <meshStandardMaterial
          color="#3b82f6"
          roughness={0.1}
          metalness={0.3}
          transparent
          opacity={0.08}
        />
      </mesh>
    </group>
  );
}

// ── Camera Controller ───────────────────────────────────────────────────────

function CameraController({ autoRotate }: { autoRotate: boolean }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Initial camera position
  useEffect(() => {
    camera.position.set(2.5, 1.2, 2.5);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom
      enablePan={false}
      enableRotate={true}
      autoRotate={autoRotate}
      autoRotateSpeed={0.3}
      minDistance={1.8}
      maxDistance={4.5}
      zoomSpeed={0.5}
      rotateSpeed={0.4}
      // Damping for smooth feel
      enableDamping
      dampingFactor={0.05}
    />
  );
}

// ── Main Globe3D ────────────────────────────────────────────────────────────

function GlobeScene(props: Globe3DProps) {
  const {
    markers = [],
    selectedId,
    onMarkerClick,
    autoRotate = true,
    showAtmosphere = true,
    showStars = true,
    quality = "medium",
  } = props;

  const starCount = quality === "high" ? 3000 : quality === "medium" ? 1500 : 500;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} color="#3a4361" />
      <directionalLight
        position={[5, 3, 5]}
        intensity={1.2}
        color="#fffaf0"
      />
      <directionalLight
        position={[-3, -1, -3]}
        intensity={0.2}
        color="#3b82f6"
      />

      {/* Stars background */}
      {showStars && (
        <Stars
          radius={100}
          depth={50}
          count={starCount}
          factor={1.5}
          saturation={0}
          fade
          speed={0.3}
        />
      )}

      {/* Earth */}
      <Earth />

      {/* Atmosphere glow */}
      <Atmosphere visible={showAtmosphere} />

      {/* Project markers */}
      {markers.map((marker) => (
        <MarkerMesh
          key={marker.id}
          marker={marker}
          isSelected={selectedId === marker.id}
          onClick={onMarkerClick || (() => {})}
        />
      ))}

      {/* Camera controls */}
      <CameraController autoRotate={autoRotate} />
    </>
  );
}

// ── Loading Fallback ───────────────────────────────────────────────────────

function GlobeFallback() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#04060a]">
      <div className="relative">
        <div
          className="w-16 h-16 rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, #1a4a7a 0%, #040810 100%)",
            boxShadow: "0 0 40px 10px rgba(59,130,246,0.15)",
            animation: "pulseSoft 2s ease-in-out infinite",
          }}
        />
        {/* Loading spinner ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: "#3b82f6",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
      <p className="mt-4 text-xs text-[#4a5374] font-medium tracking-widest uppercase">
        Initializing globe
      </p>
    </div>
  );
}

// ── Screen Reader List (accessibility) ─────────────────────────────────────

function ScreenReaderMarkersList({ markers }: { markers: GlobeMarker[] }) {
  if (markers.length === 0) return null;

  return (
    <ul className="sr-only" aria-label="Project locations on globe">
      {markers.map((m) => (
        <li key={m.id}>
          <button onClick={() => {}}>
            {m.label} — {m.status} status
            {m.value !== undefined ? `, value: ${m.value}` : ""}
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── Public API ──────────────────────────────────────────────────────────────

export default function Globe3D(props: Globe3DProps) {
  const {
    markers = [],
    className = "",
    ariaLabel = "Interactive 3D Earth globe showing MPLAD project locations",
    quality = "medium",
  } = props;

  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const effectiveQuality = prefersReducedMotion ? "low" : quality;

  return (
    <div
      className={`relative ${className}`}
      style={{ width: "100%", height: "100%" }}
      role="img"
      aria-label={ariaLabel}
    >
      {/* Screen reader accessible list of markers */}
      <ScreenReaderMarkersList markers={markers} />

      {/* 3D Canvas */}
      <Suspense fallback={<GlobeFallback />}>
        <Canvas
          camera={{ fov: 45, near: 0.1, far: 1000 }}
          dpr={[1, effectiveQuality === "high" ? 2 : 1.5]}
          frameloop="always"
          style={{ background: "transparent" }}
          gl={{
            antialias: effectiveQuality !== "low",
            alpha: true,
            powerPreference: "high-performance",
          }}
        >
          <GlobeScene {...props} quality={effectiveQuality} autoRotate={!prefersReducedMotion && (props.autoRotate ?? true)} />
        </Canvas>
      </Suspense>

      {/* Skip 3D toggle for accessibility */}
      <button
        onClick={() => {
          const el = document.querySelector('[data-globe-3d-fallback]');
          if (el) {
            el.classList.toggle("hidden");
          }
        }}
        className="absolute bottom-2 right-2 text-[10px] text-[#4a5374] hover:text-[#6c7595] transition-colors"
        aria-label="Toggle between 3D globe and list view"
      >
        {typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent)
          ? "Simplified"
          : "View list"}
      </button>

      {/* Reduced motion notice */}
      {prefersReducedMotion && (
        <div className="absolute top-2 left-2 text-[9px] text-[#4a5374] px-2 py-1 bg-[#0a0e18] rounded border border-[#252c44]">
          Reduced motion · Static view
        </div>
      )}
    </div>
  );
}
