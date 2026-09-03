import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __vojasPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__vojasPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__vojasPrisma = prisma;
}

export async function connectDb(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Verify PostGIS extension is available on the database.
 * Throws if not.
 */
export async function verifyPostGIS(): Promise<boolean> {
  const result = await prisma.$queryRaw<Array<{ extname: string }>>`
    SELECT extname FROM pg_extension WHERE extname = 'postgis'
  `;
  return result.length > 0;
}

/**
 * Find projects within a radius of a point using PostGIS.
 * Returns projects ordered by distance (meters).
 */
export async function findProjectsNear(
  latitude: number,
  longitude: number,
  radiusMeters: number
) {
  return prisma.$queryRaw<
    Array<{ id: string; name: string; distance: number }>
  >`
    SELECT id, name,
      ST_Distance(
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      ) AS distance
    FROM "projects"
    WHERE latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        ${radiusMeters}
      )
    ORDER BY distance
    LIMIT 100
  `;
}
