/**
 * Satellite EO Analysis Service — VOJAS 2.0 M5
 *
 * Implements the weekly checkpoint system, baseline detection,
 * change classification, and reported progress comparison.
 *
 * Anti-fabrication contract:
 * - Every date, score, and status comes from a real observation or a
 *   documented "no usable observation" reason.
 * - We NEVER fabricate a satellite capture to fill a week.
 */

import { PrismaClient } from '@vojas/db';
import { cdseService, type CDSENearestResult } from './cdseService.js';
import { logger } from '../utils/logger.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_CLOUD_THRESHOLD = parseInt(process.env.SATELLITE_CLOUD_THRESHOLD ?? '60');
const DEFAULT_SEARCH_WINDOW_DAYS = parseInt(process.env.SATELLITE_SEARCH_WINDOW_DAYS ?? '14');

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChangeClassification =
  | 'NO_OBSERVABLE_CHANGE'
  | 'LOW_OBSERVABLE_CHANGE'
  | 'MODERATE_OBSERVABLE_CHANGE'
  | 'HIGH_OBSERVABLE_CHANGE';

export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type CheckpointAvailability =
  | 'AVAILABLE'
  | 'NO_USABLE_OBSERVATION'
  | 'UNKNOWN';

export interface ProgressComparisonResult {
  status: 'CONSISTENT' | 'POSSIBLY_INCONSISTENT' | 'INCONCLUSIVE' | 'INSUFFICIENT_DATA';
  reportedProgress: number;
  changeClassification: ChangeClassification;
  confidence: Confidence;
  evidence: string;
  limitations: string;
  observationDates: { baseline?: string; latest?: string };
}

export interface TimelineEntry {
  targetDate: string; // ISO
  observationId: string | null;
  observationDate: string | null;
  availability: CheckpointAvailability;
  reason: string | null;
  cloudCover: number | null;
  provider: string | null;
  satellite: string | null;
  sourceUrl: string | null;
  developmentScore: number | null;
  selectionReason: string | null;
  targetDifference: number | null;
  methodology: string;
}

// ── Weekly checkpoint generation ───────────────────────────────────────────────

/**
 * Generate all Monday target dates between project start and today (inclusive).
 */
function generateWeeklyTargets(startDate: Date): Date[] {
  const targets: Date[] = [];
  // Find the Monday on or before startDate
  const d = new Date(startDate);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  while (d <= today) {
    targets.push(new Date(d));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return targets;
}

/**
 * For a single checkpoint (target date), find the nearest usable observation
 * from CDSE and upsert it + the checkpoint record.
 */
async function processCheckpoint(
  prisma: PrismaClient,
  projectId: string,
  lat: number,
  lng: number,
  targetDate: Date,
  searchWindowDays: number
): Promise<{ observationId: string | null; availability: CheckpointAvailability; reason: string | null }> {
  const windowStart = new Date(targetDate);
  windowStart.setUTCDate(windowStart.getUTCDate() - searchWindowDays);
  const windowEnd = new Date(targetDate);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + searchWindowDays);

  const result: CDSENearestResult = await cdseService.getNearestScene({
    lat, lng,
    targetDate,
    radiusMeters: 1000,
    maxCloudCover: DEFAULT_CLOUD_THRESHOLD,
  });

  if (result.status === 'NOT_CONFIGURED' || result.status === 'ERROR') {
    await upsertCheckpoint(prisma, projectId, targetDate, null, windowStart, windowEnd, 'NO_USABLE_OBSERVATION', result.reason ?? 'AUTHENTICATION_REQUIRED');
    return { observationId: null, availability: 'NO_USABLE_OBSERVATION', reason: result.reason ?? 'AUTHENTICATION_REQUIRED' };
  }

  if (result.status === 'NO_USABLE_OBSERVATION') {
    const reason: string | null = result.scene ? null : (result.reason ?? 'NO_SCENE_AVAILABLE');
    await upsertCheckpoint(prisma, projectId, targetDate, null, windowStart, windowEnd, 'NO_USABLE_OBSERVATION', reason);
    return { observationId: null, availability: 'NO_USABLE_OBSERVATION', reason };
  }

  const scene = result.scene!;

  // Upsert the observation
  const upserted = await upsertObservation(prisma, projectId, scene, targetDate, 'NEAREST_TARGET');
  let observationId: string | null = null;

  if (upserted) {
    // Find the just-created observation's ID
    const obs = await prisma.satelliteObservation.findFirst({
      where: { projectId, sceneId: scene.id },
      select: { id: true },
    });
    observationId = obs?.id ?? null;
  } else {
    const obs = await prisma.satelliteObservation.findFirst({
      where: { projectId, sceneId: scene.id },
      select: { id: true },
    });
    observationId = obs?.id ?? null;
  }

  const targetDifference = Math.round((scene.observationDate.getTime() - targetDate.getTime()) / (24 * 60 * 60 * 1000));
  await upsertCheckpoint(prisma, projectId, targetDate, observationId, windowStart, windowEnd, 'AVAILABLE', null, targetDifference);
  return { observationId, availability: 'AVAILABLE', reason: null };
}

async function upsertObservation(
  prisma: PrismaClient,
  projectId: string,
  scene: import('./cdseService.js').CDSEScene,
  targetDate: Date,
  selectionReason: string
): Promise<boolean> {
  const existing = await prisma.satelliteObservation.findUnique({
    where: { sceneId_observationDate: { sceneId: scene.id, observationDate: scene.observationDate } },
  });
  if (existing) return false;

  try {
    await prisma.satelliteObservation.create({
      data: {
        projectId,
        sceneId: scene.id,
        observationDate: scene.observationDate,
        targetDate,
        provider: scene.provider,
        satellite: scene.satellite,
        sensor: scene.sensor,
        dataset: scene.dataset,
        cloudCover: scene.cloudCover,
        resolution: scene.resolution,
        bbox: scene.bbox as unknown as import('@vojas/db').Prisma.InputJsonValue,
        tileUrl: scene.tileUrl,
        thumbnailUrl: scene.thumbnailUrl,
        centerLat: (scene.bbox.sw[0] + scene.bbox.ne[0]) / 2,
        centerLng: (scene.bbox.sw[1] + scene.bbox.ne[1]) / 2,
        processingDate: scene.processingDate ?? undefined,
        processingLevel: 'L2A',
        sourceUrl: scene.sourceUrl,
        sourceName: 'Copernicus Data Space Ecosystem',
        retrievalDate: new Date(),
        quality: 'USABLE',
        selectionReason,
      },
    });
    return true;
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === 'P2002') return false; // unique constraint — already exists
    logger.error(`[satellite-eo] Failed to upsert observation ${scene.id}`, { error: String(err) });
    return false;
  }
}

async function upsertCheckpoint(
  prisma: PrismaClient,
  projectId: string,
  targetDate: Date,
  observationId: string | null,
  windowStart: Date,
  windowEnd: Date,
  availability: CheckpointAvailability,
  reason: string | null,
  targetDifference?: number
): Promise<void> {
  await prisma.satelliteWeeklyCheckpoint.upsert({
    where: { projectId_targetDate: { projectId, targetDate } },
    update: { observationId, availability, reason, windowStart, windowEnd, targetDifference },
    create: {
      projectId,
      targetDate,
      observationId,
      windowStart,
      windowEnd,
      availability,
      reason,
      targetDifference: targetDifference ?? null,
      methodology: `Nearest usable Sentinel-2 L2A scene within ±${DEFAULT_SEARCH_WINDOW_DAYS} day window, cloud cover ≤ ${DEFAULT_CLOUD_THRESHOLD}%`,
    },
  });
}

// ── Baseline detection ────────────────────────────────────────────────────────

async function selectBaseline(prisma: PrismaClient, projectId: string, lat: number, lng: number): Promise<void> {
  // Find the best observation near project start
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { startDate: true },
  });

  if (!project?.startDate) {
    logger.info(`[satellite-eo] No start date for project ${projectId} — baseline will be inferred from earliest observation`);
    return;
  }

  // Search ±90 days around startDate
  const from = new Date(project.startDate);
  from.setUTCDate(from.getUTCDate() - 90);
  const to = new Date(project.startDate);
  to.setUTCDate(to.getUTCDate() + 90);

  const result: CDSENearestResult = await cdseService.getNearestScene({
    lat, lng,
    targetDate: project.startDate,
    radiusMeters: 1000,
    maxCloudCover: DEFAULT_CLOUD_THRESHOLD,
  });

  if (result.status !== 'FOUND' || !result.scene) {
    logger.info(`[satellite-eo] No baseline observation for project ${projectId}`);
    return;
  }

  const scene = result.scene;
  await upsertObservation(prisma, projectId, scene, project.startDate, 'BASELINE');

  const obs = await prisma.satelliteObservation.findFirst({
    where: { projectId, sceneId: scene.id },
  });
  if (!obs) return;

  // Mark as baseline selection reason
  await prisma.satelliteObservation.update({
    where: { id: obs.id },
    data: { selectionReason: 'BASELINE' },
  });
}

// ── Change analysis ─────────────────────────────────────────────────────────

function classifyChange(ndviBefore: number | null, ndviAfter: number | null, ndbiiBefore: number | null, ndbiiAfter: number | null): ChangeClassification {
  const ndviChange = ndviAfter != null && ndviBefore != null
    ? Math.abs(ndviAfter - ndviBefore)
    : 0;
  const ndbiiChange = ndbiiAfter != null && ndbiiBefore != null
    ? Math.abs(ndbiiAfter - ndbiiBefore)
    : 0;

  // Scale NDVI/NDBI change (range -1 to 1) to a 0-50 score each
  const ndviScore = ndviChange * 50;
  const ndbiiScore = ndbiiChange * 50;
  const totalScore = ndviScore + ndbiiScore;

  if (totalScore < 5) return 'NO_OBSERVABLE_CHANGE';
  if (totalScore < 20) return 'LOW_OBSERVABLE_CHANGE';
  if (totalScore < 45) return 'MODERATE_OBSERVABLE_CHANGE';
  return 'HIGH_OBSERVABLE_CHANGE';
}

function computeConfidence(cloudCoverBefore: number, cloudCoverAfter: number, projectCoverage: number): Confidence {
  const avgCloud = (cloudCoverBefore + cloudCoverAfter) / 2;
  if (avgCloud < 30 && projectCoverage > 0.8) return 'HIGH';
  if (avgCloud < 60) return 'MEDIUM';
  return 'LOW';
}

async function computePairwiseAnalysis(
  prisma: PrismaClient,
  obsBefore: import('@vojas/db').SatelliteObservation,
  obsAfter: import('@vojas/db').SatelliteObservation
): Promise<void> {
  const classification = classifyChange(
    obsBefore.ndvi ?? null, obsAfter.ndvi ?? null,
    obsBefore.ndbi ?? null, obsAfter.ndbi ?? null
  );

  const ndviDelta = obsAfter.ndvi != null && obsBefore.ndvi != null
    ? obsAfter.ndvi - obsBefore.ndvi
    : null;
  const ndbiiDelta = obsAfter.ndbi != null && obsBefore.ndbi != null
    ? obsAfter.ndbi - obsBefore.ndbi
    : null;

  const confidence = computeConfidence(obsBefore.cloudCover, obsAfter.cloudCover, obsBefore.projectCoverage);

  await prisma.satelliteAnalysis.upsert({
    where: {
      id: `pair-${obsBefore.id}-${obsAfter.id}`,
    },
    update: {},
    create: {
      id: `pair-${obsBefore.id}-${obsAfter.id}`,
      projectId: obsBefore.projectId,
      observationBeforeId: obsBefore.id,
      observationAfterId: obsAfter.id,
      analysisType: 'WEEK_OVER_WEEK',
      analysisDate: new Date(),
      baselineDate: obsBefore.observationDate,
      comparisonDate: obsAfter.observationDate,
      changeClassification: classification,
      changePercent: ndviDelta != null && ndbiiDelta != null
        ? Math.round((Math.abs(ndviDelta) + Math.abs(ndbiiDelta)) * 50)
        : null,
      confidence,
      methodology: 'Pairwise spectral change: NDVI delta + NDBI delta scaled to 0–100. Classification thresholds: NO<5, LOW<20, MOD<45, HIGH≥45. Sentinel-2 L2A, 10m resolution.',
      evidence: {
        ndviBefore: obsBefore.ndvi,
        ndviAfter: obsAfter.ndvi,
        ndviDelta,
        ndbiiBefore: obsBefore.ndbi,
        ndbiiAfter: obsAfter.ndbi,
        ndbiiDelta,
        sceneBefore: obsBefore.sceneId,
        sceneAfter: obsAfter.sceneId,
        cloudCoverBefore: obsBefore.cloudCover,
        cloudCoverAfter: obsAfter.cloudCover,
      },
      limitations: `Resolution: 10m — sub-meter features not visible. Cloud cover: ${obsBefore.cloudCover}% / ${obsAfter.cloudCover}%. NDVI/NDBI are proxies for vegetation and built-up change, not direct construction progress measurement.`,
      metadata: {
        algorithm: 'spectral-change-v1',
        version: '1.0.0',
        provider: 'CDSE',
        dataset: 'S2_L2A',
      },
    },
  });
}

// ── Reported progress comparison ───────────────────────────────────────────────

export function compareProgress(
  reportedProgress: number,
  classification: ChangeClassification,
  confidence: Confidence
): ProgressComparisonResult {
  const observableChange = classification !== 'NO_OBSERVABLE_CHANGE';

  let status: ProgressComparisonResult['status'];
  let evidence: string;
  let limitations = 'Comparison based on satellite-observable change only. Sub-10m features, underground work, and interior work are not visible. Cloud cover may have affected the observation.';

  if (confidence === 'LOW') {
    status = 'INSUFFICIENT_DATA';
    evidence = `Satellite confidence is LOW (cloud cover high or project coverage insufficient) — cannot make a reliable comparison.`;
  } else if (!observableChange && reportedProgress <= 20) {
    status = 'CONSISTENT';
    evidence = `No satellite-observable change detected, and reported progress is low (${reportedProgress}%) — consistent with early-stage work.`;
  } else if (!observableChange && reportedProgress > 60) {
    status = 'POSSIBLY_INCONSISTENT';
    evidence = `Reported progress is high (${reportedProgress}%) but satellite shows no observable change — requires field verification.`;
  } else if (observableChange && reportedProgress < 20) {
    status = 'POSSIBLY_INCONSISTENT';
    evidence = `Satellite shows physical change but reported progress is low (${reportedProgress}%) — possible under-reporting or site activity.`;
  } else if (observableChange) {
    status = 'CONSISTENT';
    evidence = `Satellite-observable change detected, consistent with reported progress of ${reportedProgress}%.`;
  } else {
    status = 'INCONCLUSIVE';
    evidence = `No observable satellite change and reported progress is mid-range (${reportedProgress}%) — cannot determine consistency.`;
  }

  return { status, reportedProgress, changeClassification: classification, confidence, evidence, limitations, observationDates: {} };
}

// ── Timeline builder ─────────────────────────────────────────────────────────

export function computeDevelopmentScore(ndvi: number | null, ndbii: number | null): number {
  if (ndvi == null && ndbii == null) return 0;
  const n = (ndvi ?? 0 + 1) / 2; // 0→1
  const b = (ndbii ?? 0 + 1) / 2; // 0→1
  return Math.round((b * 100)); // NDBI gives built-up score
}

export async function buildTimeline(prisma: PrismaClient, projectId: string): Promise<TimelineEntry[]> {
  const checkpoints = await prisma.satelliteWeeklyCheckpoint.findMany({
    where: { projectId },
    orderBy: { targetDate: 'asc' },
    include: { observation: true },
  });

  return checkpoints.map((cp) => ({
    targetDate: cp.targetDate.toISOString(),
    observationId: cp.observationId,
    observationDate: cp.observation?.observationDate.toISOString() ?? null,
    availability: cp.availability as CheckpointAvailability,
    reason: cp.reason,
    cloudCover: cp.observation?.cloudCover ?? null,
    provider: cp.observation?.provider ?? null,
    satellite: cp.observation?.satellite ?? null,
    sourceUrl: cp.observation?.sourceUrl ?? null,
    developmentScore: cp.observation
      ? computeDevelopmentScore(cp.observation.ndvi ?? null, cp.observation.ndbi ?? null)
      : null,
    selectionReason: cp.observation?.selectionReason ?? null,
    targetDifference: cp.targetDifference ?? null,
    methodology: cp.methodology,
  }));
}

// ── Main sync orchestrator ───────────────────────────────────────────────────

export interface SyncResult {
  status: 'STARTED' | 'COMPLETED' | 'ALREADY_RUNNING' | 'NO_COORDINATES' | 'NOT_CONFIGURED';
  jobId?: string;
  checkpointsGenerated?: number;
  observationsCreated?: number;
  analysesCreated?: number;
}

export async function syncProjectSatellite(
  prisma: PrismaClient,
  projectId: string
): Promise<SyncResult> {
  // 1. Get project coordinates
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { latitude: true, longitude: true, startDate: true },
  });

  if (!project?.latitude || !project?.longitude) {
    return { status: 'NO_COORDINATES' };
  }

  if (!cdseService.isConfigured()) {
    return { status: 'NOT_CONFIGURED' };
  }

  const jobId = `sync-${projectId}-${Date.now()}`;
  logger.info(`[satellite-eo] Sync started: jobId=${jobId} projectId=${projectId}`);

  const lat = project.latitude;
  const lng = project.longitude;
  const searchWindowDays = DEFAULT_SEARCH_WINDOW_DAYS;

  // 2. Generate weekly targets
  const startDate = project.startDate ? new Date(project.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const targets = generateWeeklyTargets(startDate);

  let checkpointsGenerated = 0;
  let observationsCreated = 0;

  // 3. Process each checkpoint
  for (const targetDate of targets) {
    const result = await processCheckpoint(prisma, projectId, lat, lng, targetDate, searchWindowDays);
    checkpointsGenerated++;
    if (result.observationId) observationsCreated++;
  }

  // 4. Select baseline if not already done
  const existingBaseline = await prisma.satelliteObservation.findFirst({
    where: { projectId, selectionReason: 'BASELINE' },
  });
  if (!existingBaseline) {
    await selectBaseline(prisma, projectId, lat, lng);
  }

  // 5. Compute pairwise change analyses (last 12 consecutive observations)
  const observations = await prisma.satelliteObservation.findMany({
    where: { projectId },
    orderBy: { observationDate: 'asc' },
    take: 13, // keep last 12 for pairwise analysis
  });

  let analysesCreated = 0;
  for (let i = 1; i < observations.length; i++) {
    const existing = await prisma.satelliteAnalysis.findUnique({
      where: { id: `pair-${observations[i - 1].id}-${observations[i].id}` },
    });
    if (!existing) {
      await computePairwiseAnalysis(prisma, observations[i - 1], observations[i]);
      analysesCreated++;
    }
  }

  // 6. Baseline vs latest analysis
  if (observations.length >= 2) {
    const first = observations[0];
    const last = observations[observations.length - 1];
    const baselineKey = `pair-baseline-${last.id}`;

    const existing = await prisma.satelliteAnalysis.findUnique({ where: { id: baselineKey } });
    if (!existing) {
      await prisma.satelliteAnalysis.upsert({
        where: { id: baselineKey },
        update: {},
        create: {
          id: baselineKey,
          projectId,
          observationBeforeId: first.id,
          observationAfterId: last.id,
          analysisType: 'BASELINE_VS_LATEST',
          analysisDate: new Date(),
          baselineDate: first.observationDate,
          comparisonDate: last.observationDate,
          changeClassification: classifyChange(
            first.ndvi ?? null, last.ndvi ?? null,
            first.ndbi ?? null, last.ndbi ?? null
          ),
          confidence: computeConfidence(first.cloudCover, last.cloudCover, first.projectCoverage),
          methodology: 'Baseline vs latest comparison. Compares earliest available observation to most recent. Sentinel-2 L2A, 10m resolution.',
          evidence: {
            sceneBaseline: first.sceneId,
            sceneLatest: last.sceneId,
            cloudCoverBaseline: first.cloudCover,
            cloudCoverLatest: last.cloudCover,
          },
          limitations: '10m resolution — sub-meter features not visible. Vegetation recovery after site clearance can affect NDVI. Weather variations affect spectral signatures. Compare only with documented methodology.',
        },
      });
      analysesCreated++;
    }
  }

  logger.info(`[satellite-eo] Sync complete: jobId=${jobId} checkpoints=${checkpointsGenerated} obs=${observationsCreated} analyses=${analysesCreated}`);

  return {
    status: 'COMPLETED',
    jobId,
    checkpointsGenerated,
    observationsCreated,
    analysesCreated,
  };
}
