import {
  PrismaClient,
  UserRole,
  ProjectStatus,
  ProjectSector,
  ConstituencyType,
  House,
  ProjectEventType,
  DataSourceStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// =============================================================
// TEST FIXTURES ONLY — DO NOT USE IN PRODUCTION
// This file creates labeled test data for development and testing.
// Production data comes from ingestion scripts (scripts/ingest/*).
// =============================================================

async function main() {
  console.log('Seeding TEST FIXTURE data (development only)...');

  // 1. Users (admin, analyst, officer, citizen, mp, contractor)
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const users = [
    { email: 'admin@vojas.gov',     name: 'Admin User',     role: UserRole.ADMIN },
    { email: 'analyst@vojas.gov',   name: 'Analyst User',   role: UserRole.ANALYST },
    { email: 'officer@vojas.gov',   name: 'Officer User',   role: UserRole.OFFICER },
    { email: 'citizen@vojas.gov',   name: 'Citizen User',   role: UserRole.CITIZEN },
    { email: 'mp@vojas.gov',        name: 'MP Test User',   role: UserRole.MP },
    { email: 'contractor@vojas.gov', name: 'Contractor Test', role: UserRole.CONTRACTOR },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash, isActive: true },
    });
  }
  console.log(`  ${users.length} users created`);

  // 2. States (test fixtures)
  const states = [
    { name: 'Karnataka',  code: 'KA', region: 'South' },
    { name: 'Maharashtra', code: 'MH', region: 'West' },
    { name: 'Tamil Nadu', code: 'TN', region: 'South' },
  ];
  const stateRecords = await Promise.all(
    states.map(s =>
      prisma.state.upsert({
        where: { code: s.code },
        update: {},
        create: s,
      })
    )
  );
  console.log(`  ${stateRecords.length} states created`);

  // 3. Districts
  const districts = [
    { name: 'Bangalore Urban', stateCode: 'KA', lgdCode: 'KA-DIST-001' },
    { name: 'Mumbai City',     stateCode: 'MH', lgdCode: 'MH-DIST-001' },
    { name: 'Chennai',          stateCode: 'TN', lgdCode: 'TN-DIST-001' },
  ];
  const districtRecords = await Promise.all(
    districts.map(async d => {
      const state = stateRecords.find(s => s.code === d.stateCode)!;
      return prisma.district.upsert({
        where: { lgdCode: d.lgdCode },
        update: {},
        create: { name: d.name, lgdCode: d.lgdCode, stateId: state.id },
      });
    })
  );
  console.log(`  ${districtRecords.length} districts created`);

  // 4. Constituencies
  const constituencies = [
    { name: 'Bangalore Central', districtLgd: 'KA-DIST-001', type: ConstituencyType.LOK_SABHA, house: House.LOK_SABHA },
    { name: 'Mumbai South',      districtLgd: 'MH-DIST-001', type: ConstituencyType.LOK_SABHA, house: House.LOK_SABHA },
    { name: 'Chennai Central',   districtLgd: 'TN-DIST-001', type: ConstituencyType.LOK_SABHA, house: House.LOK_SABHA },
  ];
  const constituencyRecords = await Promise.all(
    constituencies.map(async c => {
      const district = districtRecords.find(d => d.lgdCode === c.districtLgd)!;
      return prisma.constituency.upsert({
        where: { id: `test-const-${c.name.toLowerCase().replace(/\s+/g, '-')}` },
        update: {},
        create: {
          id: `test-const-${c.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: c.name,
          type: c.type,
          house: c.house,
          districtId: district.id,
        },
      });
    })
  );
  console.log(`  ${constituencyRecords.length} constituencies created`);

  // 5. DataSources (test fixture labels)
  const dataSources = [
    {
      sourceName: 'MPLADS_PORTAL',
      datasetName: '17th Lok Sabha',
      department: 'Ministry of Statistics',
      officialUrl: 'https://mplads.gov.in',
      format: 'CSV',
      apiAvailable: false,
      downloadAvailable: true,
      status: DataSourceStatus.ACTIVE,
    },
    {
      sourceName: 'VONTER',
      datasetName: 'MPLAD Open Data',
      department: 'Vonter',
      officialUrl: 'https://vonter.in',
      format: 'JSON',
      apiAvailable: true,
      downloadAvailable: true,
      status: DataSourceStatus.ACTIVE,
    },
    {
      sourceName: 'SENTINEL2',
      datasetName: 'S2_L2A',
      department: 'Copernicus',
      officialUrl: 'https://dataspace.copernicus.eu',
      format: 'API',
      apiAvailable: true,
      downloadAvailable: false,
      status: DataSourceStatus.ACTIVE,
    },
  ];
  for (const ds of dataSources) {
    await prisma.dataSource.upsert({
      where: { sourceName_datasetName: { sourceName: ds.sourceName, datasetName: ds.datasetName } },
      update: {},
      create: ds,
    });
  }
  console.log(`  ${dataSources.length} data sources created`);

  // 6. Test projects (labeled with [TEST] prefix)
  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@vojas.gov' } });
  const mpladsDataSource = await prisma.dataSource.findUniqueOrThrow({
    where: { sourceName_datasetName: { sourceName: 'MPLADS_PORTAL', datasetName: '17th Lok Sabha' } },
  });

  const projects = [
    {
      name: '[TEST] Bangalore Road Repair',
      sector: ProjectSector.TRANSPORT,
      stateCode: 'KA',
      districtLgd: 'KA-DIST-001',
      lat: 12.9716,
      lng: 77.5946,
      amount: 5000000,
    },
    {
      name: '[TEST] Bangalore School Build',
      sector: ProjectSector.EDUCATION,
      stateCode: 'KA',
      districtLgd: 'KA-DIST-001',
      lat: 12.9854,
      lng: 77.6057,
      amount: 8000000,
    },
    {
      name: '[TEST] Mumbai Water Pipeline',
      sector: ProjectSector.WATER_SANITATION,
      stateCode: 'MH',
      districtLgd: 'MH-DIST-001',
      lat: 19.076,
      lng: 72.8777,
      amount: 12000000,
    },
    {
      name: '[TEST] Mumbai Health Center',
      sector: ProjectSector.HEALTH,
      stateCode: 'MH',
      districtLgd: 'MH-DIST-001',
      lat: 19.0596,
      lng: 72.8295,
      amount: 6500000,
    },
    {
      name: '[TEST] Chennai Drainage Upgrade',
      sector: ProjectSector.PUBLIC_INFRASTRUCTURE,
      stateCode: 'TN',
      districtLgd: 'TN-DIST-001',
      lat: 13.0827,
      lng: 80.2707,
      amount: 9500000,
    },
  ];

  for (const p of projects) {
    const state = stateRecords.find(s => s.code === p.stateCode)!;
    const district = districtRecords.find(d => d.lgdCode === p.districtLgd)!;
    const sourceWorkId = `test-${p.name.toLowerCase().replace(/\s+/g, '-')}`;

    const project = await prisma.project.upsert({
      where: { source_sourceWorkId: { source: 'MPLADS_PORTAL', sourceWorkId } },
      update: {},
      create: {
        name: p.name,
        description: `[TEST FIXTURE] — ${p.name}. Labeled for development/test only.`,
        status: ProjectStatus.IN_PROGRESS,
        sector: p.sector,
        district: district.name,
        state: state.name,
        approvedAmount: p.amount,
        spentAmount: p.amount * 0.4,
        startDate: new Date('2026-01-01'),
        expectedEndDate: new Date('2026-12-31'),
        createdById: adminUser.id,
        stateId: state.id,
        districtId: district.id,
        latitude: p.lat,
        longitude: p.lng,
        locationSource: 'TEST_FIXTURE',
        source: 'MPLADS_PORTAL',
        sourceWorkId,
        sourceDataSourceId: mpladsDataSource.id,
      },
    });

    // Add a proposal event for each project
    await prisma.projectEvent.create({
      data: {
        projectId: project.id,
        eventType: ProjectEventType.PROPOSAL,
        eventDate: new Date('2025-12-01'),
        source: 'MPLADS_PORTAL',
        description: `[TEST] Project proposed: ${p.name}`,
        confidence: 'HIGH',
      },
    });
  }
  console.log(`  ${projects.length} test projects created`);

  console.log('Seed complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
