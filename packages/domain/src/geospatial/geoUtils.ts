import * as turf from '@turf/turf';
import { geoJSONPolygonSchema } from '../validation/common.js';

export function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Calculate the Haversine distance between two points in kilometres.
 * Input: p1 = [lat, lng], p2 = [lat, lng].
 */
export function calculateDistance(
  p1: [number, number],
  p2: [number, number]
): number {
  // turf.js expects [lng, lat] (GeoJSON order); our API takes [lat, lng].
  const from = turf.point([p1[1], p1[0]]);
  const to = turf.point([p2[1], p2[0]]);
  return turf.distance(from, to, { units: 'kilometers' });
}

/**
 * Create a GeoJSON Point.  GeoJSON spec: coordinates are [longitude, latitude].
 */
export function createGeoJSONPoint(
  lat: number,
  lng: number
): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lng, lat],
    },
    properties: {},
  };
}

/**
 * Validate a GeoJSON Polygon structure.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateGeoJSONPolygon(
  geojson: unknown
): { valid: true; parsed: GeoJSON.Polygon } | { valid: false; error: string } {
  const result = geoJSONPolygonSchema.safeParse(geojson);
  if (result.success) {
    return { valid: true, parsed: result.data };
  }
  return {
    valid: false,
    error: result.error.errors.map((e) => e.message).join('; '),
  };
}

/**
 * Compute the bounding box for an array of [lat, lng] pairs.
 */
export function getBoundingBox(
  points: [number, number][]
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  if (points.length === 0) {
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
  }
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Find projects within a bounding box using PostGIS via Prisma.
 * Requires Prisma raw query with PostGIS ST_MakePoint and bounding box.
 */
export async function findProjectsWithinBoundingBox(
  latitude: number,
  longitude: number,
  deltaLat: number,
  deltaLng: number
): Promise<{ id: string; name: string; latitude: number; longitude: number }[]> {
  // Lazy import to avoid circular deps — this function is meant to be called
  // from a service that already has a PrismaClient instance.
  const { prisma } = await import('@vojas/db');

  const minLat = latitude - deltaLat;
  const maxLat = latitude + deltaLat;
  const minLng = longitude - deltaLng;
  const maxLng = longitude + deltaLng;

  // Prisma raw query using PostGIS functions
  const results = await prisma.$queryRaw<
    { id: string; name: string; latitude: number; longitude: number }[]
  >`
    SELECT id, name, latitude, longitude
    FROM "Project"
    WHERE latitude  BETWEEN ${minLat} AND ${maxLat}
      AND longitude BETWEEN ${minLng} AND ${maxLng}
      AND latitude  IS NOT NULL
      AND longitude IS NOT NULL
  `;

  return results;
}
