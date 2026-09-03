import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
} from '../src/validation/authSchemas.js';
import {
  createProjectSchema,
  projectFiltersSchema,
  addLocationSchema,
} from '../src/validation/projectSchemas.js';
import {
  satelliteFiltersSchema,
  createObservationSchema,
  sceneMetadataSchema,
} from '../src/validation/satelliteSchemas.js';
import { recordExpenditureSchema } from '../src/validation/financialSchemas.js';
import { documentMetadataSchema } from '../src/validation/documentSchemas.js';
import {
  paginationSchema,
  idSchema,
  coordinateSchema,
  geoJSONPointSchema,
  geoJSONPolygonSchema,
  dateRangeSchema,
} from '../src/validation/common.js';
import { ProjectSector, ProjectStatus } from '@vojas/shared';

describe('auth schemas', () => {
  it('loginSchema accepts valid input', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret',
    });
    expect(result.success).toBe(true);
  });

  it('loginSchema rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(result.success).toBe(false);
  });

  it('loginSchema rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('registerSchema accepts valid input', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      password: 'Abcdef123!',
      name: 'Alice',
    });
    expect(result.success).toBe(true);
  });

  it('registerSchema rejects short password', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      password: 'short',
      name: 'Alice',
    });
    expect(result.success).toBe(false);
  });

  it('registerSchema rejects password without uppercase', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      password: 'abcdefg123',
      name: 'Alice',
    });
    expect(result.success).toBe(false);
  });

  it('registerSchema rejects password without digit', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      password: 'Abcdefghij',
      name: 'Alice',
    });
    expect(result.success).toBe(false);
  });

  it('refreshTokenSchema requires refreshToken', () => {
    expect(refreshTokenSchema.safeParse({ refreshToken: 'abc' }).success).toBe(true);
    expect(refreshTokenSchema.safeParse({}).success).toBe(false);
  });
});

describe('project schemas', () => {
  const validProject = {
    name: 'Road construction',
    description: 'Build 5 km of road',
    status: ProjectStatus.IN_PROGRESS,
    sector: ProjectSector.TRANSPORT,
    district: 'Mumbai',
    state: 'Maharashtra',
    constituency: 'Mumbai North',
    approvedAmount: 1000000,
    spentAmount: 250000,
    contractor: 'ABC Constructions',
    latitude: 19.076,
    longitude: 72.8777,
    source: 'MPLADS_PORTAL',
  };

  it('createProjectSchema accepts valid project', () => {
    const result = createProjectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it('createProjectSchema rejects empty name', () => {
    const result = createProjectSchema.safeParse({ ...validProject, name: '' });
    expect(result.success).toBe(false);
  });

  it('createProjectSchema rejects name shorter than 3 chars', () => {
    const result = createProjectSchema.safeParse({ ...validProject, name: 'ab' });
    expect(result.success).toBe(false);
  });

  it('createProjectSchema rejects latitude > 90', () => {
    const result = createProjectSchema.safeParse({ ...validProject, latitude: 91 });
    expect(result.success).toBe(false);
  });

  it('createProjectSchema rejects longitude < -180', () => {
    const result = createProjectSchema.safeParse({ ...validProject, longitude: -181 });
    expect(result.success).toBe(false);
  });

  it('createProjectSchema rejects negative approved amount', () => {
    const result = createProjectSchema.safeParse({ ...validProject, approvedAmount: -1 });
    expect(result.success).toBe(false);
  });

  it('createProjectSchema rejects zero approved amount', () => {
    const result = createProjectSchema.safeParse({ ...validProject, approvedAmount: 0 });
    expect(result.success).toBe(false);
  });

  it('projectFiltersSchema accepts empty filters', () => {
    const result = projectFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('projectFiltersSchema limits page size to 100', () => {
    const result = projectFiltersSchema.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });

  it('addLocationSchema requires projectId', () => {
    const result = addLocationSchema.safeParse({
      projectId: 'not-a-uuid',
      latitude: 0,
      longitude: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('satellite schemas', () => {
  it('satelliteFiltersSchema requires projectId', () => {
    const result = satelliteFiltersSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('satelliteFiltersSchema accepts valid filters', () => {
    const result = satelliteFiltersSchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      maxCloudCover: 20,
    });
    expect(result.success).toBe(true);
  });

  it('satelliteFiltersSchema rejects cloudCover > 100', () => {
    const result = satelliteFiltersSchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      maxCloudCover: 150,
    });
    expect(result.success).toBe(false);
  });

  it('createObservationSchema accepts valid observation', () => {
    const result = createObservationSchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      observationDate: '2024-01-15T00:00:00Z',
      provider: 'CDSE',
      satellite: 'SENTINEL-2A',
      sensor: 'MSI',
      dataset: 'S2_L2A',
      cloudCover: 10,
      resolution: 10,
    });
    expect(result.success).toBe(true);
  });

  it('sceneMetadataSchema validates bbox', () => {
    const result = sceneMetadataSchema.safeParse({
      sceneId: 'S2A_MSIL2A_20240115',
      observationDate: '2024-01-15T00:00:00Z',
      satellite: 'SENTINEL-2A',
      sensor: 'MSI',
      dataset: 'S2_L2A',
      cloudCover: 5,
      resolution: 10,
      bbox: { sw: [10, 20], ne: [30, 40] },
    });
    expect(result.success).toBe(true);
  });
});

describe('financial schemas', () => {
  it('recordExpenditureSchema accepts valid data', () => {
    const result = recordExpenditureSchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2024-01-15',
      amount: 50000,
      description: 'Materials purchase',
    });
    expect(result.success).toBe(true);
  });

  it('recordExpenditureSchema rejects negative amount', () => {
    const result = recordExpenditureSchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2024-01-15',
      amount: -100,
      description: 'Bad',
    });
    expect(result.success).toBe(false);
  });

  it('recordExpenditureSchema rejects zero amount', () => {
    const result = recordExpenditureSchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2024-01-15',
      amount: 0,
      description: 'No amount',
    });
    expect(result.success).toBe(false);
  });
});

describe('document schemas', () => {
  it('documentMetadataSchema accepts valid metadata', () => {
    const result = documentMetadataSchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'INVOICE',
      title: 'Invoice #123',
      filename: 'invoice-123.pdf',
      originalName: 'Invoice 123.pdf',
      mimeType: 'application/pdf',
      size: 102400,
      url: 'https://example.com/invoice-123.pdf',
    });
    expect(result.success).toBe(true);
  });

  it('documentMetadataSchema rejects invalid URL', () => {
    const result = documentMetadataSchema.safeParse({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'INVOICE',
      title: 'Invoice',
      filename: 'x.pdf',
      originalName: 'X.pdf',
      mimeType: 'application/pdf',
      size: 100,
      url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('common schemas', () => {
  it('paginationSchema applies defaults', () => {
    const result = paginationSchema.safeParse({});
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('idSchema requires UUID', () => {
    expect(idSchema.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(true);
    expect(idSchema.safeParse({ id: 'not-uuid' }).success).toBe(false);
  });

  it('coordinateSchema accepts valid coordinates', () => {
    expect(coordinateSchema.safeParse({ latitude: 45, longitude: 90 }).success).toBe(true);
  });

  it('coordinateSchema rejects out of range', () => {
    expect(coordinateSchema.safeParse({ latitude: 91, longitude: 0 }).success).toBe(false);
    expect(coordinateSchema.safeParse({ latitude: 0, longitude: 181 }).success).toBe(false);
  });

  it('geoJSONPointSchema accepts valid point', () => {
    const result = geoJSONPointSchema.safeParse({
      type: 'Point',
      coordinates: [77.209, 28.6139],
    });
    expect(result.success).toBe(true);
  });

  it('geoJSONPointSchema rejects wrong type', () => {
    const result = geoJSONPointSchema.safeParse({
      type: 'Polygon',
      coordinates: [77.209, 28.6139],
    });
    expect(result.success).toBe(false);
  });

  it('geoJSONPolygonSchema accepts closed ring', () => {
    const result = geoJSONPolygonSchema.safeParse({
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    });
    expect(result.success).toBe(true);
  });

  it('dateRangeSchema accepts only one bound', () => {
    expect(dateRangeSchema.safeParse({ startDate: '2024-01-01' }).success).toBe(true);
  });

  it('dateRangeSchema rejects endDate < startDate', () => {
    const result = dateRangeSchema.safeParse({
      startDate: '2024-12-01',
      endDate: '2024-01-01',
    });
    expect(result.success).toBe(false);
  });
});
