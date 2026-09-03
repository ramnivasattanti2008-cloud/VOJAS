import { z } from 'zod';

/** Pagination params */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

/** UUID identifier */
export const idSchema = z.object({
  id: z.string().uuid({ message: 'Invalid UUID format' }),
});
export type IdInput = z.infer<typeof idSchema>;

/** Geographic coordinates */
export const coordinateSchema = z.object({
  latitude: z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  longitude: z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
});
export type CoordinateInput = z.infer<typeof coordinateSchema>;

/** GeoJSON Point */
export const geoJSONPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]).refine(
    ([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90,
    { message: 'GeoJSON coordinates must be valid [longitude, latitude]' }
  ),
});
export type GeoJSONPoint = z.infer<typeof geoJSONPointSchema>;

/** GeoJSON Polygon — array of rings, each ring >= 4 positions, first == last */
const ringSchema = z
  .array(z.tuple([z.number(), z.number()]))
  .refine((ring) => ring.length >= 4, { message: 'Ring must have at least 4 positions' })
  .refine(
    (ring) =>
      ring.length >= 4 &&
      ring[0][0] === ring[ring.length - 1][0] &&
      ring[0][1] === ring[ring.length - 1][1],
    { message: 'Ring must be closed: first and last position must match' }
  );

export const geoJSONPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(ringSchema).min(1, 'At least one ring required'),
});
export type GeoJSONPolygon = z.infer<typeof geoJSONPolygonSchema>;

/** Date range with optional start/end, enforcing end > start when both provided */
export const dateRangeSchema = z
  .object({
    startDate: z.string().datetime({ offset: true }).or(z.string()).optional(),
    endDate: z.string().datetime({ offset: true }).or(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) < new Date(data.endDate);
      }
      return true;
    },
    { message: 'endDate must be after startDate', path: ['endDate'] }
  );
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
