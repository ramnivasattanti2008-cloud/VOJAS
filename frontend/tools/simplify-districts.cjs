// Douglas-Peucker polygon simplifier for india-districts.geojson
// Run: node tools/simplify-districts.cjs
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'src', 'data', 'india-districts.geojson');
const OUTPUT = path.join(__dirname, '..', 'src', 'data', 'india-districts.simplified.geojson');

// Tolerance in degrees (~0.01° ≈ 1.1 km at equator — fine for country-level viz)
const TOLERANCE = 0.01;

// Perpendicular distance from point to line (in 2D lon/lat)
function distSq(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) {
    const ex = p[0] - a[0];
    const ey = p[1] - a[1];
    return ex * ex + ey * ey;
  }
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  const px = a[0] + t * dx;
  const py = a[1] + t * dy;
  const ex = p[0] - px;
  const ey = p[1] - py;
  return ex * ex + ey * ey;
}

// Douglas-Peucker for an open polyline
function dp(points, tol) {
  if (points.length < 3) return points;
  const tolSq = tol * tol;
  let maxD = 0;
  let idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = distSq(points[i], points[0], points[points.length - 1]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > tolSq) {
    const left = dp(points.slice(0, idx + 1), tol);
    const right = dp(points.slice(idx), tol);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}

// Simplify a closed ring (Polygon outer/inner, or first ring of MultiPolygon)
function simplifyRing(ring, tol) {
  // Don't simplify rings that are already small
  if (ring.length < 8) return ring;
  const simplified = dp(ring, tol);
  // Ensure ring is still closed
  if (simplified[0][0] !== simplified[simplified.length - 1][0] ||
      simplified[0][1] !== simplified[simplified.length - 1][1]) {
    simplified.push([simplified[0][0], simplified[0][1]]);
  }
  return simplified;
}

function simplifyCoords(geom, tol) {
  if (geom.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geom.coordinates.map(ring => simplifyRing(ring, tol)),
    };
  } else if (geom.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geom.coordinates.map(poly => poly.map(ring => simplifyRing(ring, tol))),
    };
  }
  return geom;
}

console.log(`Reading ${INPUT}...`);
const raw = fs.readFileSync(INPUT, 'utf8');
const geo = JSON.parse(raw);
console.log(`Input: ${geo.features.length} features, ${(raw.length / 1024 / 1024).toFixed(1)} MB`);

let totalBefore = 0;
let totalAfter = 0;
for (const f of geo.features) {
  const flat = JSON.stringify(f.geometry);
  totalBefore += flat.length;
  f.geometry = simplifyCoords(f.geometry, TOLERANCE);
  totalAfter += JSON.stringify(f.geometry).length;
}

const out = JSON.stringify(geo);
fs.writeFileSync(OUTPUT, out);
console.log(`Output: ${(out.length / 1024 / 1024).toFixed(1)} MB`);
console.log(`Reduction: ${(totalAfter / totalBefore * 100).toFixed(1)}% of original geometry`);
console.log(`Saved to ${OUTPUT}`);
