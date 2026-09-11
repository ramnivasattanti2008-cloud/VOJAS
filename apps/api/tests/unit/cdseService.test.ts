/**
 * Unit tests for the pure, side-effect-free helpers in cdseService.ts:
 * coordinate/AOI math, satellite-id parsing, STAC geometry/asset extraction.
 * No live network access — real CDSE responses are captured as fixtures
 * below (trimmed) rather than hit at test time. See
 * scripts/smoke-cdse-catalog.ts for a manual, live-network check of the
 * same endpoints these fixtures are modeled on.
 */
import { describe, it, expect } from 'vitest';
import {
  parseSatelliteFromSceneId,
  buildBboxArray,
  parseBboxFromGeoJson,
  extractQuicklookHref,
  mapStacItemToScene,
} from '../../src/services/cdseService.js';

describe('parseSatelliteFromSceneId', () => {
  it('recognizes Sentinel-2A', () => {
    expect(parseSatelliteFromSceneId('S2A_MSIL2A_20260518T054251_N0512_R005_T43QBB_20260518T102824'))
      .toBe('SENTINEL-2A');
  });

  it('recognizes Sentinel-2B', () => {
    expect(parseSatelliteFromSceneId('S2B_MSIL2A_20260810T050649_N0512_R019_T43PGQ_20260810T085431'))
      .toBe('SENTINEL-2B');
  });

  it('recognizes Sentinel-2C — previously misclassified as 2A', () => {
    // The live CDSE catalogue returns S2C products constantly (verified
    // 2026-09-11); the union used to stop at 2B so every S2C scene was
    // silently recorded as SENTINEL-2A — a provenance error about which
    // satellite actually observed the site.
    expect(parseSatelliteFromSceneId('S2C_MSIL2A_20260226T050801_N0512_R019_T43PGQ_20260226T101013'))
      .toBe('SENTINEL-2C');
  });

  it('falls back to the generic constellation name for an unrecognized prefix', () => {
    // Naming the wrong specific satellite is worse than naming the
    // constellation, so an unrecognized id must not guess 2A/2B/2C.
    expect(parseSatelliteFromSceneId('UNKNOWN_PRODUCT_ID')).toBe('SENTINEL-2');
  });
});

describe('buildBboxArray', () => {
  it('returns [minLng, minLat, maxLng, maxLat] centered on the point', () => {
    const [minLng, minLat, maxLng, maxLat] = buildBboxArray(12.9716, 77.5946, 1000);
    expect(minLng).toBeLessThan(77.5946);
    expect(maxLng).toBeGreaterThan(77.5946);
    expect(minLat).toBeLessThan(12.9716);
    expect(maxLat).toBeGreaterThan(12.9716);
    // ~1000m at this latitude is roughly 0.009 degrees
    expect(maxLng - minLng).toBeGreaterThan(0.015);
    expect(maxLng - minLng).toBeLessThan(0.021);
  });

  it('scales with radiusMeters', () => {
    const small = buildBboxArray(0, 0, 500);
    const large = buildBboxArray(0, 0, 5000);
    const smallWidth = small[2] - small[0];
    const largeWidth = large[2] - large[0];
    expect(largeWidth).toBeGreaterThan(smallWidth * 5);
  });
});

describe('parseBboxFromGeoJson', () => {
  it('extracts sw/ne from a real Sentinel-2 tile Polygon', () => {
    // Trimmed real geometry from S2C_MSIL2A_20260226T050801 (verified live,
    // 2026-09-11) — a Sentinel-2 tile footprint, not a project AOI.
    const geometry = {
      type: 'Polygon',
      coordinates: [[
        [76.8405, 12.5604],
        [77.8619, 12.5604],
        [77.8619, 13.5610],
        [76.8405, 13.5610],
        [76.8405, 12.5604],
      ]],
    };
    const bbox = parseBboxFromGeoJson(geometry);
    expect(bbox).toEqual({ sw: [12.5604, 76.8405], ne: [13.5610, 77.8619] });
  });

  it('extracts from a MultiPolygon', () => {
    const geometry = {
      type: 'MultiPolygon',
      coordinates: [[[
        [10, 20],
        [11, 20],
        [11, 21],
        [10, 21],
        [10, 20],
      ]]],
    };
    const bbox = parseBboxFromGeoJson(geometry);
    expect(bbox).toEqual({ sw: [20, 10], ne: [21, 11] });
  });

  it('returns null for an unsupported geometry type', () => {
    expect(parseBboxFromGeoJson({ type: 'Point', coordinates: [10, 20] })).toBeNull();
  });

  it('returns null for missing/malformed geometry', () => {
    expect(parseBboxFromGeoJson(null)).toBeNull();
    expect(parseBboxFromGeoJson(undefined)).toBeNull();
    expect(parseBboxFromGeoJson({})).toBeNull();
  });
});

describe('extractQuicklookHref', () => {
  it('returns the thumbnail asset href when present (CDSE spelling)', () => {
    const assets = {
      thumbnail: { href: 'https://datahub.creodias.eu/odata/v1/Assets(abc)/$value' },
      B04_10m: { href: 's3://eodata/...' },
    };
    expect(extractQuicklookHref(assets)).toBe('https://datahub.creodias.eu/odata/v1/Assets(abc)/$value');
  });

  it('falls back through other common STAC preview spellings', () => {
    expect(extractQuicklookHref({ quicklook: { href: 'https://example.com/q.jpg' } }))
      .toBe('https://example.com/q.jpg');
    expect(extractQuicklookHref({ overview: { href: 'https://example.com/o.jpg' } }))
      .toBe('https://example.com/o.jpg');
  });

  it('rejects a non-https href — never returns an s3:// URL a browser cannot fetch', () => {
    expect(extractQuicklookHref({ thumbnail: { href: 's3://eodata/some/path.jpg' } })).toBeNull();
  });

  it('returns null when no preview asset exists', () => {
    expect(extractQuicklookHref({ B04_10m: { href: 's3://eodata/...' } })).toBeNull();
  });
});

describe('mapStacItemToScene', () => {
  const baseItem = {
    id: 'S2C_MSIL2A_20260226T050801_N0512_R019_T43PGQ_20260226T101013',
    properties: {
      datetime: '2026-02-26T05:08:01.024Z',
      'eo:cloud_cover': 28.29,
      created: '2026-02-26T10:10:13.000Z',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [76.8405, 12.5604], [77.8619, 12.5604], [77.8619, 13.5610], [76.8405, 13.5610], [76.8405, 12.5604],
      ]],
    },
    assets: {
      thumbnail: { href: 'https://datahub.creodias.eu/odata/v1/Assets(abc)/$value' },
    },
  };

  it('maps a well-formed real STAC item to a CDSEScene', () => {
    const scene = mapStacItemToScene(baseItem);
    expect(scene).not.toBeNull();
    expect(scene!.id).toBe(baseItem.id);
    expect(scene!.satellite).toBe('SENTINEL-2C');
    expect(scene!.cloudCover).toBe(28.29);
    expect(scene!.tileUrl).toBe('https://datahub.creodias.eu/odata/v1/Assets(abc)/$value');
    expect(scene!.thumbnailUrl).toBe(scene!.tileUrl);
    expect(scene!.dataset).toBe('S2_L2A');
    expect(scene!.sourceUrl).toContain(baseItem.id);
  });

  it('returns null (not a guessed scene) when eo:cloud_cover is missing', () => {
    // Cloud cover absent means genuinely unknown, not 0% or 100% — this used
    // to default to 100, fabricating a "definitely too cloudy" reading for an
    // item that was never actually measured.
    const item = { ...baseItem, properties: { datetime: baseItem.properties.datetime } };
    expect(mapStacItemToScene(item)).toBeNull();
  });

  it('returns null when eo:cloud_cover is not a number', () => {
    const item = { ...baseItem, properties: { ...baseItem.properties, 'eo:cloud_cover': 'unknown' } };
    expect(mapStacItemToScene(item)).toBeNull();
  });

  it('returns null when the item has no usable date', () => {
    const item = { ...baseItem, properties: { 'eo:cloud_cover': 10 } };
    expect(mapStacItemToScene(item)).toBeNull();
  });

  it('returns null when geometry cannot be parsed', () => {
    const item = { ...baseItem, geometry: { type: 'Point', coordinates: [0, 0] } };
    expect(mapStacItemToScene(item)).toBeNull();
  });

  it('returns null when the item has no id', () => {
    const item = { ...baseItem, id: '' };
    expect(mapStacItemToScene(item)).toBeNull();
  });

  it('sets tileUrl/thumbnailUrl to null (not a broken URL) when the item has no preview asset', () => {
    const item = { ...baseItem, assets: {} };
    const scene = mapStacItemToScene(item);
    expect(scene).not.toBeNull();
    expect(scene!.tileUrl).toBeNull();
    expect(scene!.thumbnailUrl).toBeNull();
  });

  it('never throws on malformed input — returns null instead', () => {
    expect(mapStacItemToScene(null)).toBeNull();
    expect(mapStacItemToScene(undefined)).toBeNull();
    expect(mapStacItemToScene('not an object')).toBeNull();
    expect(mapStacItemToScene(42)).toBeNull();
  });
});
