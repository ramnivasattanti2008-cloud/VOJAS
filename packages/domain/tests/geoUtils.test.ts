import { describe, it, expect } from 'vitest';
import {
  validateCoordinates,
  calculateDistance,
  createGeoJSONPoint,
  validateGeoJSONPolygon,
  getBoundingBox,
} from '../src/geospatial/geoUtils.js';
import {
  calculateAreaSquareMeters,
  calculateAreaHectares,
  calculateAreaAcres,
  estimateConstructionArea,
} from '../src/geospatial/areaCalculations.js';

describe('validateCoordinates', () => {
  it('accepts valid lat/lng', () => {
    expect(validateCoordinates(0, 0)).toBe(true);
    expect(validateCoordinates(45, 90)).toBe(true);
    expect(validateCoordinates(-90, -180)).toBe(true);
    expect(validateCoordinates(28.6139, 77.2090)).toBe(true); // Delhi
  });

  it('rejects invalid lat (91)', () => {
    expect(validateCoordinates(91, 0)).toBe(false);
  });

  it('rejects invalid lat (-91)', () => {
    expect(validateCoordinates(-91, 0)).toBe(false);
  });

  it('rejects invalid lng (181)', () => {
    expect(validateCoordinates(0, 181)).toBe(false);
  });

  it('rejects invalid lng (-181)', () => {
    expect(validateCoordinates(0, -181)).toBe(false);
  });
});

describe('calculateDistance', () => {
  it('Bangalore to Mumbai is approximately 840 km (±50 km)', () => {
    // Bangalore: 12.9716, 77.5946
    // Mumbai:    19.0760, 72.8777
    const dist = calculateDistance([12.9716, 77.5946], [19.0760, 72.8777]);
    expect(dist).toBeGreaterThan(790);
    expect(dist).toBeLessThan(890);
  });

  it('returns 0 for identical points', () => {
    expect(calculateDistance([0, 0], [0, 0])).toBeCloseTo(0, 5);
  });

  it('handles long distances', () => {
    // New York to London
    const dist = calculateDistance([40.7128, -74.006], [51.5074, -0.1278]);
    expect(dist).toBeGreaterThan(5500);
    expect(dist).toBeLessThan(6000);
  });
});

describe('createGeoJSONPoint', () => {
  it('returns coordinates in [lng, lat] order', () => {
    const pt = createGeoJSONPoint(28.6139, 77.2090); // Delhi: lat, lng
    expect(pt.type).toBe('Feature');
    expect(pt.geometry.type).toBe('Point');
    expect(pt.geometry.coordinates).toEqual([77.2090, 28.6139]); // lng, lat!
  });

  it('handles negative coordinates', () => {
    const pt = createGeoJSONPoint(-33.8688, 151.2093); // Sydney
    expect(pt.geometry.coordinates).toEqual([151.2093, -33.8688]);
  });
});

describe('validateGeoJSONPolygon', () => {
  it('accepts a valid 4-vertex polygon', () => {
    const valid = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    };
    const result = validateGeoJSONPolygon(valid);
    expect(result.valid).toBe(true);
  });

  it('rejects a polygon with only 2 vertices (incomplete ring)', () => {
    const invalid = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [0, 0],
          [1, 1],
        ],
      ],
    };
    const result = validateGeoJSONPolygon(invalid);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects an unclosed ring (first != last)', () => {
    const invalid = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1], // missing closing [0,0]
        ],
      ],
    };
    const result = validateGeoJSONPolygon(invalid);
    expect(result.valid).toBe(false);
  });
});

describe('getBoundingBox', () => {
  it('computes bbox for multiple points', () => {
    const bbox = getBoundingBox([
      [10, 20], // lat=10, lng=20
      [30, 40],
      [15, 25],
    ]);
    expect(bbox).toEqual({ minLat: 10, maxLat: 30, minLng: 20, maxLng: 40 });
  });

  it('returns zero bbox for empty array', () => {
    const bbox = getBoundingBox([]);
    expect(bbox).toEqual({ minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 });
  });

  it('handles single point', () => {
    const bbox = getBoundingBox([[5, 7]]);
    expect(bbox).toEqual({ minLat: 5, maxLat: 5, minLng: 7, maxLng: 7 });
  });
});

describe('area calculations', () => {
  const unitSquare: GeoJSON.Polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [0.001, 0],
        [0.001, 0.001],
        [0, 0.001],
        [0, 0],
      ],
    ],
  };

  it('calculateAreaSquareMeters returns positive value', () => {
    const area = calculateAreaSquareMeters(unitSquare);
    expect(area).toBeGreaterThan(0);
  });

  it('calculateAreaHectares = sqm / 10000', () => {
    const sqm = calculateAreaSquareMeters(unitSquare);
    const ha = calculateAreaHectares(unitSquare);
    expect(ha).toBeCloseTo(sqm / 10000, 5);
  });

  it('calculateAreaAcres = hectares * 2.47105', () => {
    const ha = calculateAreaHectares(unitSquare);
    const ac = calculateAreaAcres(unitSquare);
    expect(ac).toBeCloseTo(ha * 2.47105, 5);
  });

  it('estimateConstructionArea is zero when NDVI = 1 (pure vegetation)', () => {
    const result = estimateConstructionArea(1.0, 0.2, 1000);
    expect(result).toBe(0);
  });

  it('estimateConstructionArea uses built-up proxy from NDBI', () => {
    const result = estimateConstructionArea(0.5, 0.3, 1000);
    expect(result).toBeCloseTo(0.5 * 0.3 * 1000);
  });
});
