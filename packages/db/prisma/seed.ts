import {
  PrismaClient,
  UserRole,
  ProjectStatus,
  ProjectSector,
  ConstituencyType,
  House,
  ProjectEventType,
  DataSourceStatus,
  ReportCategory,
  ReportSeverity,
  ReportStatus,
  ReportPrivacyLevel,
  SignalType,
  AnomalySeverity,
  RiskFindingStatus,
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

  // `status` and `spentRatio` vary per row so the dashboards, filters and
  // sector rollups have more than one value to render. Every figure here is an
  // invented fixture number, which is why each row is labelled [TEST].
  const projects = [
    {
      name: '[TEST] Bangalore Road Repair',
      sector: ProjectSector.TRANSPORT,
      stateCode: 'KA',
      districtLgd: 'KA-DIST-001',
      lat: 12.9716,
      lng: 77.5946,
      amount: 5000000,
      status: ProjectStatus.IN_PROGRESS,
      spentRatio: 0.42,
    },
    {
      name: '[TEST] Bangalore School Build',
      sector: ProjectSector.EDUCATION,
      stateCode: 'KA',
      districtLgd: 'KA-DIST-001',
      lat: 12.9854,
      lng: 77.6057,
      amount: 8000000,
      status: ProjectStatus.COMPLETED,
      spentRatio: 0.97,
    },
    {
      name: '[TEST] Mumbai Water Pipeline',
      sector: ProjectSector.WATER_SANITATION,
      stateCode: 'MH',
      districtLgd: 'MH-DIST-001',
      lat: 19.076,
      lng: 72.8777,
      amount: 12000000,
      status: ProjectStatus.IN_PROGRESS,
      spentRatio: 0.71,
      // Deliberately past its expected end date so the delay rule has
      // something real to evaluate. Lateness is derived, not a status.
      overdue: true,
    },
    {
      name: '[TEST] Mumbai Health Center',
      sector: ProjectSector.HEALTH,
      stateCode: 'MH',
      districtLgd: 'MH-DIST-001',
      lat: 19.0596,
      lng: 72.8295,
      amount: 6500000,
      status: ProjectStatus.SANCTIONED,
      spentRatio: 0.05,
    },
    {
      name: '[TEST] Chennai Drainage Upgrade',
      sector: ProjectSector.PUBLIC_INFRASTRUCTURE,
      stateCode: 'TN',
      districtLgd: 'TN-DIST-001',
      lat: 13.0827,
      lng: 80.2707,
      amount: 9500000,
      status: ProjectStatus.APPROVED,
      spentRatio: 0,
    },
  ];

  const projectRecords: Array<{ id: string; name: string; amount: number; spent: number }> = [];

  for (const p of projects) {
    const state = stateRecords.find(s => s.code === p.stateCode)!;
    const district = districtRecords.find(d => d.lgdCode === p.districtLgd)!;
    const sourceWorkId = `test-${p.name.toLowerCase().replace(/\s+/g, '-')}`;
    const spentAmount = Math.round(p.amount * p.spentRatio);
    const expectedEndDate = p.overdue ? new Date('2026-03-31') : new Date('2026-12-31');

    const project = await prisma.project.upsert({
      where: { source_sourceWorkId: { source: 'MPLADS_PORTAL', sourceWorkId } },
      // Re-running the seed must converge on the values above rather than
      // leaving whatever an older run wrote.
      update: { status: p.status, spentAmount, expectedEndDate },
      create: {
        name: p.name,
        description: `[TEST FIXTURE] — ${p.name}. Labeled for development/test only.`,
        status: p.status,
        sector: p.sector,
        district: district.name,
        state: state.name,
        approvedAmount: p.amount,
        spentAmount,
        startDate: new Date('2026-01-01'),
        expectedEndDate,
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

    projectRecords.push({ id: project.id, name: p.name, amount: p.amount, spent: spentAmount });

    // Timeline. Deterministic ids keep re-seeding idempotent — the previous
    // version used create(), so every run appended another copy of each event.
    const timeline: Array<{ key: string; type: ProjectEventType; date: string; desc: string }> = [
      { key: 'proposal', type: ProjectEventType.PROPOSAL, date: '2025-12-01', desc: `Project proposed: ${p.name}` },
      { key: 'sanction', type: ProjectEventType.SANCTION, date: '2025-12-20', desc: `Sanction recorded for ${p.name}` },
    ];
    if (p.status !== ProjectStatus.APPROVED && p.status !== ProjectStatus.SANCTIONED) {
      timeline.push({ key: 'work-start', type: ProjectEventType.WORK_START, date: '2026-01-15', desc: `Work started on ${p.name}` });
      timeline.push({ key: 'progress', type: ProjectEventType.PROGRESS_REPORT, date: '2026-04-10', desc: `Progress report filed for ${p.name}` });
    }
    if (p.status === ProjectStatus.COMPLETED) {
      timeline.push({ key: 'completion', type: ProjectEventType.COMPLETION, date: '2026-08-20', desc: `Completion reported for ${p.name}` });
    }

    for (const ev of timeline) {
      const id = `test-evt-${sourceWorkId}-${ev.key}`;
      await prisma.projectEvent.upsert({
        where: { id },
        update: {},
        create: {
          id,
          projectId: project.id,
          eventType: ev.type,
          eventDate: new Date(ev.date),
          source: 'TEST_FIXTURE',
          description: `[TEST] ${ev.desc}`,
          confidence: 'HIGH',
        },
      });
    }
  }
  console.log(`  ${projects.length} test projects created (with timelines)`);

  // =============================================================
  // DEMO WORKFLOW ROWS — TEST FIXTURES, NOT REAL CIVIC DATA
  //
  // Every amount, report, signal and finding below is invented so the
  // dashboards, citizen-report queue and investigation/referral screens have
  // something to render locally. They are all labelled [TEST] so no reader can
  // mistake them for real MPLADS records. Two deliberate omissions:
  //
  //  - No satellite metrics are synthesised. ProgressObservation carries the
  //    reported figure only; observedChange/verificationResult stay null with
  //    dataQuality NO_USABLE_OBSERVATION, because inventing an NDVI-derived
  //    number and feeding it into the confidence pipeline is exactly what
  //    cdsePixelProvider.ts is written to refuse.
  //  - No referral is pre-approved. The referral below sits at DRAFT with
  //    approvedById null; writing an approval would manufacture an audit trail
  //    about who authorised an escalation to an external authority.
  // =============================================================

  const officerUser = await prisma.user.findUniqueOrThrow({ where: { email: 'officer@vojas.gov' } });
  const byName = (fragment: string) => projectRecords.find(r => r.name.includes(fragment))!;
  const overdueProject = byName('Mumbai Water Pipeline');
  const roadProject = byName('Bangalore Road Repair');

  // 7. Financial observations — the sanction, plus an expenditure wherever the
  //    project has recorded spend. Amounts mirror the project rows above.
  let financialCount = 0;
  for (const rec of projectRecords) {
    const rows: Array<{
      key: string;
      type: string;
      amount: number;
      date: Date;
      status: string;
      description: string;
    }> = [
      {
        key: 'sanction',
        type: 'SANCTION',
        amount: rec.amount,
        date: new Date('2025-12-20'),
        status: 'AUTHORIZED',
        description: `[TEST] Sanctioned amount recorded for ${rec.name}`,
      },
    ];
    if (rec.spent > 0) {
      rows.push({
        key: 'expenditure',
        type: 'EXPENDITURE',
        amount: rec.spent,
        date: new Date('2026-05-15'),
        status: 'PAID',
        description: `[TEST] Cumulative expenditure recorded for ${rec.name}`,
      });
    }
    for (const row of rows) {
      const id = `test-fin-${rec.id}-${row.key}`;
      await prisma.financialObservation.upsert({
        where: { id },
        update: {},
        create: {
          id,
          projectId: rec.id,
          date: row.date,
          type: row.type,
          amount: row.amount,
          description: row.description,
          status: row.status,
          source: 'TEST_FIXTURE',
        },
      });
      financialCount++;
    }
  }
  console.log(`  ${financialCount} financial observations created`);

  // 8. Progress observations — reported progress only. See the note above on
  //    why the satellite-derived columns are left unset.
  let progressCount = 0;
  for (const rec of projectRecords) {
    if (rec.spent === 0) continue;
    const id = `test-prog-${rec.id}`;
    await prisma.progressObservation.upsert({
      where: { id },
      update: {},
      create: {
        id,
        projectId: rec.id,
        reportDate: new Date('2026-04-10'),
        reportedProgress: Math.round((rec.spent / rec.amount) * 100),
        reportSource: 'TEST_FIXTURE',
        dataQuality: 'NO_USABLE_OBSERVATION',
        explanation:
          '[TEST] Reported progress fixture. No satellite observation is attached, so no observed change is recorded.',
      },
    });
    progressCount++;
  }
  console.log(`  ${progressCount} progress observations created`);

  // 9. Citizen reports — one public, one anonymous, so the public feed and the
  //    officer queue both have content.
  const reports = [
    {
      reference: 'VOJAS-TEST-0001',
      projectId: roadProject.id,
      title: '[TEST] Road surface breaking up after resurfacing',
      description:
        '[TEST FIXTURE] Sample citizen report used for local development. Surface reportedly degrading within weeks of resurfacing.',
      category: ReportCategory.CONSTRUCTION_QUALITY,
      severity: ReportSeverity.MEDIUM,
      status: ReportStatus.RECEIVED,
      privacyLevel: ReportPrivacyLevel.PUBLIC,
      isAnonymous: false,
      reporterName: 'Test Reporter' as string | null,
      reporterEmail: 'citizen@vojas.gov' as string | null,
      lat: 12.9718,
      lng: 77.5949,
    },
    {
      reference: 'VOJAS-TEST-0002',
      projectId: overdueProject.id,
      title: '[TEST] Pipeline work appears stalled',
      description:
        '[TEST FIXTURE] Sample anonymous report used for local development. No visible activity at the site for several weeks.',
      category: ReportCategory.DELAYED_WORK,
      severity: ReportSeverity.HIGH,
      status: ReportStatus.ASSIGNED,
      privacyLevel: ReportPrivacyLevel.ANONYMOUS,
      isAnonymous: true,
      reporterName: null as string | null,
      reporterEmail: null as string | null,
      lat: 19.0762,
      lng: 72.878,
    },
  ];
  for (const r of reports) {
    await prisma.report.upsert({
      where: { reportReference: r.reference },
      update: {},
      create: {
        reportReference: r.reference,
        title: r.title,
        description: r.description,
        category: r.category,
        severity: r.severity,
        status: r.status,
        privacyLevel: r.privacyLevel,
        isAnonymous: r.isAnonymous,
        reporterName: r.reporterName,
        reporterEmail: r.reporterEmail,
        latitude: r.lat,
        longitude: r.lng,
        locationDesc: '[TEST] Fixture location',
        projectId: r.projectId,
        assignedToId: r.status === ReportStatus.ASSIGNED ? officerUser.id : null,
        source: 'TEST_FIXTURE',
      },
    });
  }
  console.log(`  ${reports.length} citizen reports created`);

  // 10. Risk signals plus one finding on the overdue project. algorithmVersion
  //     is TEST_FIXTURE rather than a real rule-engine version, so these rows
  //     are never mistaken for genuine engine output.
  const signals = [
    {
      key: 'delay',
      signalType: SignalType.PROJECT_DELAY,
      severity: 'HIGH',
      confidence: 'HIGH',
      value: 71,
      expectedValue: 100,
      explanation:
        '[TEST] Expected end date has passed while reported progress remains below completion.',
    },
    {
      key: 'mismatch',
      signalType: SignalType.PROGRESS_FINANCIAL_MISMATCH,
      severity: 'MEDIUM',
      confidence: 'MEDIUM',
      value: 71,
      expectedValue: 71,
      explanation:
        '[TEST] Financial utilisation and reported physical progress are compared here for demonstration.',
    },
  ];
  const signalIds: string[] = [];
  for (const sig of signals) {
    const id = `test-signal-${overdueProject.id}-${sig.key}`;
    await prisma.riskSignal.upsert({
      where: { id },
      update: {},
      create: {
        id,
        projectId: overdueProject.id,
        signalType: sig.signalType,
        sourceType: 'TEST_FIXTURE',
        detectedAt: new Date('2026-06-01'),
        severity: sig.severity,
        confidence: sig.confidence,
        value: sig.value,
        expectedValue: sig.expectedValue,
        explanation: sig.explanation,
        algorithmVersion: 'TEST_FIXTURE',
      },
    });
    signalIds.push(id);
  }
  console.log(`  ${signals.length} risk signals created`);

  const findingId = `test-finding-${overdueProject.id}`;
  await prisma.riskFinding.upsert({
    where: { id: findingId },
    update: {},
    create: {
      id: findingId,
      projectId: overdueProject.id,
      type: 'PROJECT_DELAY',
      title: '[TEST] Overdue project with incomplete reported progress',
      description:
        '[TEST FIXTURE] Sample finding used for local development of the findings queue and investigation screens.',
      severity: AnomalySeverity.HIGH,
      riskScore: 68,
      confidence: 'MEDIUM',
      status: RiskFindingStatus.UNDER_REVIEW,
      recommendedAction: '[TEST] Route to field verification before any escalation.',
      limitations:
        '[TEST] Fixture row. A risk score is evidence for human verification, never proof of wrongdoing.',
      signalIds,
      algorithmVersion: 'TEST_FIXTURE',
      firstObservedAt: new Date('2026-06-01'),
      lastObservedAt: new Date('2026-06-01'),
      assignedToId: officerUser.id,
    },
  });
  console.log('  1 risk finding created');

  // 11. Investigation and referral workflow, left at its earliest honest state.
  const caseId = `test-case-${overdueProject.id}`;
  await prisma.verificationCase.upsert({
    where: { id: caseId },
    update: {},
    create: {
      id: caseId,
      projectId: overdueProject.id,
      findingId,
      type: 'FIELD_VERIFICATION',
      status: 'ASSIGNED',
      priority: 'HIGH',
      assignedToId: officerUser.id,
      notes: '[TEST FIXTURE] Sample verification case for local development.',
    },
  });

  const referralId = `test-referral-${overdueProject.id}`;
  await prisma.referral.upsert({
    where: { id: referralId },
    update: {},
    create: {
      id: referralId,
      caseId,
      projectId: overdueProject.id,
      findingId,
      destinationAuthority: 'VIGILANCE',
      referenceNo: 'VOJAS-TEST-REF-0001',
      reason:
        '[TEST FIXTURE] Sample referral draft for local development of the referral screen.',
      status: 'DRAFT',
      dossier: {
        fixture: true,
        note:
          '[TEST FIXTURE] Placeholder dossier. A real dossier is generated by referralService at DRAFT time from the linked finding and case.',
      },
      notes: '[TEST] Draft only, deliberately not approved.',
      preparedById: officerUser.id,
    },
  });
  console.log('  1 verification case + 1 draft referral created');


  // Real risk-engine rule configuration (not test fixture data) — these
  // rows describe the deterministic rule handlers already implemented in
  // packages/domain/src/services/riskEngine/ruleEngine.ts. Without them,
  // RiskRuleEngine.loadRules() returns an empty set and rule evaluation is
  // a silent no-op (signal generation still runs independently via
  // SignalGenerator, which does not depend on this table).
  const riskRules = [
    {
      id: 'rule-progress-satellite-mismatch',
      name: 'Progress / Satellite Mismatch',
      category: 'RULE_PROGRESS_SATELLITE_MISMATCH',
      severityModifier: '15',
      confidenceModifier: 'MEDIUM',
      explanationTemplate:
        'Reported progress ({{reportedProgressPercent}}%) does not match observable satellite change ({{satelliteChangePercent}}%).',
      conditions: { requiredSignals: ['SATELLITE_CHANGE'] },
    },
    {
      id: 'rule-financial-physical-mismatch',
      name: 'Financial / Physical Mismatch',
      category: 'RULE_FINANCIAL_PHYSICAL_MISMATCH',
      severityModifier: '15',
      confidenceModifier: 'MEDIUM',
      explanationTemplate:
        'Financial utilization ({{utilizationPercent}}%) suggests higher progress than reported ({{reportedProgress}}%).',
      conditions: { requiredSignals: ['PROGRESS_FINANCIAL_MISMATCH'] },
    },
    {
      id: 'rule-project-delay',
      name: 'Project Delay',
      category: 'RULE_PROJECT_DELAY',
      severityModifier: '10',
      confidenceModifier: 'MEDIUM',
      explanationTemplate: 'Project deadline passed with only {{currentProgress}}% progress recorded.',
      conditions: { requiredSignals: ['PROJECT_DELAY'] },
    },
  ];
  for (const rule of riskRules) {
    await prisma.riskRule.upsert({
      where: { id: rule.id },
      update: {},
      create: { ...rule, version: 'v1.0', status: 'ENABLED', enabled: true },
    });
  }
  console.log(`  ${riskRules.length} risk rules registered`);

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
