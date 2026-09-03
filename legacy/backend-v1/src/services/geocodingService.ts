/**
 * Geocoding service — resolves project district/state to lat/lng via LGD master.
 *
 * The LGD (Local Government Directory) is the official canonical reference
 * for Indian administrative geography, maintained by the Ministry of Panchayati
 * Raj. After `npm run ingest:lgd` populates the LGDLocation table, we can
 * look up canonical coordinates for any project by its (state, district) key.
 *
 * Why LGD over Nominatim/OpenStreetMap?
 *   - One row per district ⇒ O(1) in-memory LRU cache
 *   - Authoritative Indian geography, no rate limits
 *   - Already in our schema — zero new dependencies
 *   - Falls back gracefully when LGD hasn't been ingested yet
 *
 * Usage:
 *   const coords = await geocodingService.lookup("MAHARASHTRA", "Pune");
 *   // { latitude: 18.5204, longitude: 73.8567, source: "LGD" }
 */
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  /** Source of the coordinates — useful for audit and confidence scoring. */
  source: "LGD" | "STATE_CENTROID" | "NOT_FOUND";
  /** Canonical LGD name (when matched). */
  canonicalName?: string;
  /** Confidence 0-1 — LGD exact match = 1, state-level fallback = 0.5, none = 0. */
  confidence: number;
  /** Optional LGD code for cross-referencing. */
  lgdCode?: string;
}

// ─── In-memory LRU cache ────────────────────────────────────────────────────────

interface CacheEntry {
  key: string;
  value: GeocodedLocation | null;
}

class LRUCache {
  private map = new Map<string, CacheEntry>();

  constructor(private readonly capacity: number) {}

  get(key: string): GeocodedLocation | null | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    // Refresh recency — delete + reinsert moves to MRU position
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: GeocodedLocation | null): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.capacity) {
      // Evict LRU (first insertion in Map iteration order)
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
    this.map.set(key, { key, value });
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }
}

const cache = new LRUCache(2_000);

function cacheKey(state: string, district: string): string {
  return `${state.toUpperCase().trim()}::${district.toUpperCase().trim()}`;
}

// ─── District-name normalization ────────────────────────────────────────────────

/**
 * Mirrors the same canonicalization used in scripts/ingest/_shared.ts.
 * Lightweight, no external deps. Handles:
 *   - Case normalization
 *   - Trailing/leading whitespace
 *   - Common suffix variants (e.g. "Pune District" → "Pune")
 *   - "Dist." / "Dt." / "Zilla" / "Jilla" abbreviations
 */
function canonicalizeDistrict(name: string): string {
  return name
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b(DISTRICT|DIST\.?|DT\.?|ZILLA|JILLA)\b\.?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeState(name: string): string {
  return name
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b(STATE|UT|UNION TERRITORY)\b\.?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── State centroids (last-resort fallback) ──────────────────────────────────────

/**
 * Coarse state-level centroids for when LGD is missing. NOT for primary use —
 * these are political boundaries, not district points. Only kicks in if the
 * entire LGD table is empty.
 */
const STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "ANDHRA PRADESH": { lat: 15.9129, lng: 79.74 },
  "ARUNACHAL PRADESH": { lat: 28.218, lng: 94.7278 },
  ASSAM: { lat: 26.2006, lng: 92.9376 },
  BIHAR: { lat: 25.0961, lng: 85.3131 },
  CHHATTISGARH: { lat: 21.2787, lng: 81.8661 },
  GOA: { lat: 15.2993, lng: 74.124 },
  GUJARAT: { lat: 22.2587, lng: 71.1924 },
  HARYANA: { lat: 29.0588, lng: 76.0856 },
  HIMACHAL_PRADESH: { lat: 31.1048, lng: 77.1734 },
  JHARKHAND: { lat: 23.6102, lng: 85.2799 },
  KARNATAKA: { lat: 15.3173, lng: 75.7139 },
  KERALA: { lat: 10.8505, lng: 76.2711 },
  MADHYA_PRADESH: { lat: 22.9734, lng: 78.6569 },
  MAHARASHTRA: { lat: 19.7515, lng: 75.7139 },
  MANIPUR: { lat: 24.6637, lng: 93.9063 },
  MEGHALAYA: { lat: 25.467, lng: 91.3662 },
  MIZORAM: { lat: 23.1645, lng: 92.9376 },
  NAGALAND: { lat: 26.1584, lng: 94.5624 },
  ODISHA: { lat: 20.9517, lng: 85.0985 },
  PUNJAB: { lat: 31.1471, lng: 75.3412 },
  RAJASTHAN: { lat: 27.0238, lng: 74.2179 },
  SIKKIM: { lat: 27.533, lng: 88.5122 },
  "TAMIL NADU": { lat: 11.1271, lng: 78.6569 },
  TELANGANA: { lat: 18.1124, lng: 79.0193 },
  TRIPURA: { lat: 23.9408, lng: 91.9882 },
  "UTTAR PRADESH": { lat: 26.8467, lng: 80.9462 },
  UTTARAKHAND: { lat: 30.0668, lng: 79.0193 },
  "WEST BENGAL": { lat: 22.9868, lng: 87.855 },
  DELHI: { lat: 28.7041, lng: 77.1025 },
  CHANDIGARH: { lat: 30.7333, lng: 76.7794 },
  "JAMMU AND KASHMIR": { lat: 33.7782, lng: 76.5762 },
  LADAKH: { lat: 34.1526, lng: 77.5771 },
  CHANDEL: { lat: 24.32, lng: 93.99 },
};

// ─── Service ───────────────────────────────────────────────────────────────────

export const geocodingService = {
  /**
   * Resolve a (state, district) pair to coordinates.
   * Returns null when no match is found and no fallback is possible.
   */
  async lookup(state: string, district: string): Promise<GeocodedLocation | null> {
    if (!state || !district) return null;
    const key = cacheKey(state, district);
    const cached = cache.get(key);
    if (cached !== undefined) return cached; // hit (may be null = cached miss)

    const result = await this.lookupFresh(state, district);
    cache.set(key, result);
    return result;
  },

  /**
   * Bypass the cache — useful for backfill jobs and tests.
   */
  async lookupFresh(state: string, district: string): Promise<GeocodedLocation | null> {
    const canonicalState = canonicalizeState(state);
    const canonicalDistrict = canonicalizeDistrict(district);

    // 1. LGD match — exact canonical name + state filter
    try {
      const lgd = await prisma.lGDLocation.findFirst({
        where: {
          entityType: "DISTRICT",
          nameCanonical: { contains: canonicalDistrict },
          // State matching: SQLite is case-insensitive by default for text fields
          // but we use uppercase canonical names for reliability
          stateName: { contains: canonicalState },
        },
      });
      if (lgd?.latitude != null && lgd?.longitude != null) {
        return {
          latitude: lgd.latitude,
          longitude: lgd.longitude,
          source: "LGD",
          canonicalName: lgd.name,
          lgdCode: lgd.lgdCode,
          confidence: 1.0,
        };
      }
    } catch (err) {
      // LGD table may not exist yet (pre-migration) — fall through to state fallback
      logger.warn("[geocoding] LGD lookup failed (table may not be migrated):", err);
    }

    // 2. State centroid fallback — coarse but always works for IN states
    const fallback = STATE_CENTROIDS[canonicalState];
    if (fallback) {
      return {
        latitude: fallback.lat,
        longitude: fallback.lng,
        source: "STATE_CENTROID",
        confidence: 0.4,
      };
    }

    // 3. No match
    return null;
  },

  /**
   * Bulk-geocode all projects in a given scope. Used by ingest:normalize and
   * the geocoding backfill CLI.
   *
   * Returns counts of { hit, fallback, miss }.
   */
  async backfillProjects(opts: { dryRun?: boolean; limit?: number } = {}): Promise<{
    scanned: number;
    hit: number;
    fallback: number;
    miss: number;
  }> {
    const { dryRun = false, limit = 10_000 } = opts;

    const projects = await prisma.project.findMany({
      where: { state: { not: "" }, district: { not: "" } },
      take: limit,
      select: { id: true, state: true, district: true, locations: { where: { isPrimary: true } } },
    });

    const stats = { scanned: 0, hit: 0, fallback: 0, miss: 0 };
    const updates: { id: string; latitude: number; longitude: number }[] = [];

    for (const p of projects) {
      stats.scanned++;
      const hasPrimary = p.locations.some((l) => l.verified);
      if (hasPrimary) continue; // already geocoded & verified

      const coords = await this.lookupFresh(p.state, p.district);
      if (!coords) {
        stats.miss++;
        continue;
      }
      if (coords.source === "LGD") stats.hit++;
      else stats.fallback++;

      if (!dryRun) {
        // Create a primary location if none exists, or update existing
        const existing = p.locations[0];
        if (existing) {
          await prisma.location.update({
            where: { id: existing.id },
            data: { latitude: coords.latitude, longitude: coords.longitude },
          });
        } else {
          await prisma.location.create({
            data: {
              projectId: p.id,
              latitude: coords.latitude,
              longitude: coords.longitude,
              label: `${p.district}, ${p.state}`,
              isPrimary: true,
              verified: false, // requires officer review
            },
          });
        }
        updates.push({ id: p.id, latitude: coords.latitude, longitude: coords.longitude });
      }
    }

    logger.info(
      `[geocoding.backfill] scanned=${stats.scanned} hit=${stats.hit} ` +
        `fallback=${stats.fallback} miss=${stats.miss} dryRun=${dryRun}`,
    );
    return stats;
  },

  /**
   * Drop the in-memory cache. Useful in tests and when LGD data is re-ingested.
   */
  clearCache(): void {
    cache.clear();
  },

  /**
   * Diagnostics — exposed for the admin endpoint and tests.
   */
  cacheStats(): { size: number; capacity: number } {
    return { size: cache.size(), capacity: 2_000 };
  },
};
