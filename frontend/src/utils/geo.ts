/**
 * Geospatial utilities using Turf.js.
 *
 * These helpers run client-side. For bulk server-side spatial queries
 * (e.g. "all projects within 5km of a point"), consider PostGIS later.
 * @see docs/TOOLING-AUDIT.md — PostGIS section.
 */

import * as turf from "@turf/turf";

/** A GeoJSON Feature with a polygon geometry. */
export type DistrictFeature = GeoJSON.Feature<GeoJSON.Polygon>;
/** A GeoJSON FeatureCollection of district polygons. */
export type DistrictCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon>;

/**
 * Returns true if the given {lat, lng} point falls inside any district polygon
 * in the collection. Uses Turf's point-in-polygon (inclusive boundary).
 */
export function pointInAnyDistrict(
  lat: number,
  lng: number,
  districts: DistrictCollection
): DistrictFeature | null {
  const point = turf.point([lng, lat]); // Turf uses [lng, lat] (GeoJSON order)

  for (const feature of districts.features) {
    if (turf.booleanPointInPolygon(point, feature)) {
      return feature as DistrictFeature;
    }
  }
  return null;
}

/**
 * Returns the district feature containing the given point, or null.
 * Convenience wrapper around pointInAnyDistrict — use this directly.
 */
export function findDistrictForPoint(
  lat: number,
  lng: number,
  districts: DistrictCollection
): DistrictFeature | null {
  return pointInAnyDistrict(lat, lng, districts);
}

/**
 * Calculate the Haversine distance in kilometres between two points.
 * Uses the faster Turf.js implementation.
 */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const from = turf.point([lng1, lat1]);
  const to = turf.point([lng2, lat2]);
  return turf.distance(from, to, { units: "kilometers" });
}

/**
 * Calculate the area of a district polygon in square kilometres.
 */
export function districtAreaKm(feature: DistrictFeature): number {
  return turf.area(feature) / 1_000_000; // m² → km²
}

/**
 * Returns the centroid of a district polygon as [lng, lat].
 */
export function districtCentroid(
  feature: DistrictFeature
): [number, number] {
  const centroid = turf.centroid(feature);
  return centroid.geometry.coordinates as [number, number];
}

/**
 * Returns all district features whose centroid falls within a radius (km)
 * of the given point. Useful for "highlight districts near project X."
 */
export function districtsWithinRadius(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  districts: DistrictCollection
): DistrictFeature[] {
  const center = turf.point([centerLng, centerLat]);
  const circle = turf.circle(center, radiusKm, { units: "kilometers" });

  return districts.features.filter((feature) => {
    const centroid = turf.centroid(feature);
    return turf.booleanPointInPolygon(centroid, circle);
  }) as DistrictFeature[];
}
