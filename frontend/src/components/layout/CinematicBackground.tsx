/**
 * CinematicBackground — animated dark space background for the Login page.
 * Pure CSS + inline SVG. No new packages required.
 */
export default function CinematicBackground() {
  return (
    <div className="cosmic-bg" aria-hidden="true">
      {/* SVG filter definitions */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-sm" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="blur-soft">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <linearGradient id="orb1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#2563eb" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="orb2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#0891b2" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.1" />
          </linearGradient>
          <radialGradient id="orb-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glow-amber" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#f59e0b" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {/* Pulsing orbs */}
      <div className="orb-1" />
      <div className="orb-2" />
      <div className="orb-3" />

      {/* Center glow spot */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
          animation: "pulseGlow 4s ease-in-out infinite",
        }}
      />

      {/* Floating geometric shapes */}
      <div className="shape shape-1">
        <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon
            points="30,4 56,18 56,42 30,56 4,42 4,18"
            stroke="rgba(59,130,246,0.18)"
            strokeWidth="1"
            fill="none"
          />
          <polygon
            points="30,12 48,22 48,38 30,48 12,38 12,22"
            stroke="rgba(59,130,246,0.08)"
            strokeWidth="0.5"
            fill="none"
          />
        </svg>
      </div>

      <div className="shape shape-2">
        <svg viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle
            cx="25" cy="25" r="22"
            stroke="rgba(124,58,237,0.15)"
            strokeWidth="1"
            fill="none"
          />
          <circle
            cx="25" cy="25" r="12"
            stroke="rgba(59,130,246,0.12)"
            strokeWidth="0.75"
            fill="none"
          />
          <circle cx="25" cy="25" r="3" fill="rgba(139,92,246,0.2)" />
        </svg>
      </div>

      <div className="shape shape-3">
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon
            points="20,2 38,30 2,30"
            stroke="rgba(6,182,212,0.15)"
            strokeWidth="1"
            fill="none"
          />
          <polygon
            points="20,10 30,26 10,26"
            stroke="rgba(6,182,212,0.08)"
            strokeWidth="0.5"
            fill="none"
          />
        </svg>
      </div>

      <div className="shape shape-4">
        <svg viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect
            x="5" y="5" width="60" height="60"
            stroke="rgba(59,130,246,0.1)"
            strokeWidth="1"
            fill="none"
            transform="rotate(45,35,35)"
          />
          <rect
            x="15" y="15" width="40" height="40"
            stroke="rgba(59,130,246,0.05)"
            strokeWidth="0.5"
            fill="none"
            transform="rotate(45,35,35)"
          />
        </svg>
      </div>

      <div className="shape shape-5">
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="35" stroke="rgba(124,58,237,0.07)" strokeWidth="1" fill="none" />
          <circle cx="40" cy="40" r="24" stroke="rgba(59,130,246,0.05)" strokeWidth="0.5" fill="none" />
          <line x1="40" y1="5"  x2="40" y2="75" stroke="rgba(59,130,246,0.05)" strokeWidth="0.5" />
          <line x1="5"  y1="40" x2="75" y2="40" stroke="rgba(59,130,246,0.05)" strokeWidth="0.5" />
          <line x1="15" y1="15" x2="65" y2="65" stroke="rgba(59,130,246,0.03)" strokeWidth="0.5" />
          <line x1="65" y1="15" x2="15" y2="65" stroke="rgba(59,130,246,0.03)" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Additional shape — horizontal lines */}
      <div
        style={{
          position: "absolute",
          top: "35%",
          left: "5%",
          width: "120px",
          height: "120px",
          pointerEvents: "none",
          animation: "float 14s ease-in-out infinite reverse",
        }}
      >
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
          {[...Array(5)].map((_, i) => (
            <line
              key={i}
              x1="5" y1={6 + i * 7} x2="35" y2={6 + i * 7}
              stroke="rgba(59,130,246,0.06)"
              strokeWidth="0.5"
            />
          ))}
        </svg>
      </div>

      {/* Dot grid */}
      <div className="dot-grid" />

      {/* Scanlines */}
      <div className="scanlines" />

      {/* Corner accents */}
      <div className="corner-tl" />
      <div className="corner-br" />
    </div>
  );
}
