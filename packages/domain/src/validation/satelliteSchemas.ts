import { z } from 'zod';
import { geoJSONPolygonSchema } from './common.js';

export const satelliteFiltersSchema = z
  .object({
    projectId: z.string().uuid({ message: 'Valid projectId is required' }),
    startDate: z.string().datetime({ offset: true }).or(z.string()).optional(),
    endDate: z.string().datetime({ offset: true }).or(z.string()).optional(),
    maxCloudCover: z.number().min(0).max(100).optional(),
    quality: z.enum(['RAW', 'PROCESSED', 'GOOD', 'MODERATE', 'POOR', 'REJECTED']).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    { message: 'endDate must be after startDate', path: ['endDate'] }
  );
export type SatelliteFiltersInput = z.infer<typeof satelliteFiltersSchema>;

export const createObservationSchema = z
  .object({
    projectId: z.string().uuid(),
    observationDate: z.string().datetime({ offset: true }).or(z.string()),
    provider: z.string().min(1),
    satellite: z.string().min(1),
    sensor: z.string().min(1),
    dataset: z.string().min(1),
    sceneId: z.string().optional(),
    cloudCover: z.number().min(0).max(100),
    resolution: z.number().positive(),
    bbox: z
      .object({
        sw: z.tuple([z.number(), z.number()]),
        ne: z.tuple([z.number(), z.number()]),
      })
      .optional(),
    centerLat: z.number().min(-90).max(90).optional(),
    centerLng: z.number().min(-180).max(180).optional(),
    tileUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
    sourceUrl: z.string().url().optional(),
    sourceName: z.string().optional(),
    quality: z.enum(['RAW', 'PROCESSED', 'GOOD', 'MODERATE', 'POOR', 'REJECTED']).default('RAW'),
    ndvi: z.number().optional(),
    ndbii: z.number().optional(),
    bsi: z.number().optional(),
    builtUpArea: z.number().nonnegative().optional(),
    vegetationArea: z.number().nonnegative().optional(),
    waterArea: z.number().nonnegative().optional(),
    constructionScore: z.number().min(0).max(100).optional(),
    projectCoverage: z.number().min(0).max(100).default(0),
  })
  .strict();
export type CreateObservationInput = z.infer<typeof createObservationSchema>;

export const sceneMetadataSchema = z
  .object({
    sceneId: z.string(),
    observationDate: z.string().datetime({ offset: true }).or(z.string()),
    satellite: z.string(),
    sensor: z.string(),
    dataset: z.string(),
    cloudCover: z.number().min(0).max(100),
    resolution: z.number().positive(),
    bbox: z.object({
      sw: z.tuple([z.number(), z.number()]),
      ne: z.tuple([z.number(), z.number()]),
    }),
    tileUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
    sourceUrl: z.string().url().optional(),
    sourceName: z.string().optional(),
    areaOfInterest: geoJSONPolygonSchema.optional(),
  })
  .strict();
export type SceneMetadataInput = z.infer<typeof sceneMetadataSchema>;
