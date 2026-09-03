import * as turf from '@turf/turf';

/**
 * Calculate the area of a GeoJSON Polygon in square metres.
 */
export function calculateAreaSquareMeters(geojson: GeoJSON.Polygon): number {
  const feature = turf.polygon(geojson.coordinates);
  return turf.area(feature); // meters²
}

/**
 * Calculate the area of a GeoJSON Polygon in hectares.
 */
export function calculateAreaHectares(geojson: GeoJSON.Polygon): number {
  return calculateAreaSquareMeters(geojson) / 10000;
}

/**
 * Calculate the area of a GeoJSON Polygon in acres.
 */
export function calculateAreaAcres(geojson: GeoJSON.Polygon): number {
  return calculateAreaHectares(geojson) * 2.47105;
}

/**
 * Rough proxy for construction area from NDVI/NDBI and boundary area.
 * Construction area ≈ (1 - NDVI) × (ndbi_proxy) × boundaryArea
 *
 * where ndbi_proxy = NDBI if positive (built-up detected), else 0
 * This avoids double-counting vegetation.
 */
export function estimateConstructionArea(
  ndvi: number,
  ndbi: number,
  boundaryArea_sqm: number
): number {
  const nonVegetation = 1 - ndvi;
  const builtUpProxy = Math.max(0, ndbi);
  return nonVegetation * builtUpProxy * boundaryArea_sqm;
}
