import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import {
  PrismaClient,
  UserRole,
  ProjectStatus,
  ProjectSector,
  House,
  AnomalyCategory,
  AnomalySeverity,
  RiskFindingStatus,
  RiskLevel,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const LOCAL_SATELLITE_IMG = {
  BUILDING_BEFORE: '/satellite/building-before.jpg',
  BUILDING_EXCAVATION: '/satellite/building-excavation.jpg',
  BUILDING_FRAMING: '/satellite/building-framing.jpg',
  BUILDING_SUPERSTRUCTURE: '/satellite/building-superstructure.jpg',
  BUILDING_AFTER: '/satellite/building-after.jpg',

  ROAD_BEFORE: '/satellite/road-before.jpg',
  ROAD_GRADING: '/satellite/road-grading.jpg',
  ROAD_AFTER: '/satellite/road-after.jpg',

  FRAUD_STALLED: '/satellite/fraud-stalled.jpg',
  FRAUD_CREEK: '/satellite/fraud-creek.jpg',
};

async function main() {
  console.log('🚀 Seeding Exactly 5 Curated Real Showcase Projects (2 Finished, 1 Ongoing, 2 Fraud)...');

  // 1. Ensure Standard Users exist
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const users = [
    { email: 'admin@vojas.gov', name: 'Admin User', role: UserRole.ADMIN },
    { email: 'officer@vojas.gov', name: 'Vikram Malhotra (Vigilance Officer)', role: UserRole.OFFICER },
    { email: 'mp@vojas.gov', name: 'Smt Aparajita Sarangi (MP)', role: UserRole.MP },
    { email: 'contractor@vojas.gov', name: 'Rajesh Buildcon Ltd (Contractor)', role: UserRole.CONTRACTOR },
    { email: 'citizen@vojas.gov', name: 'Dr. Ramesh Sharma (Citizen)', role: UserRole.CITIZEN },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name, passwordHash, isActive: true },
      create: { ...u, passwordHash, isActive: true },
    });
  }
  console.log('  ✓ 5 Standard accounts verified with password Admin123!');

  const officerUser = (await prisma.user.findFirst({ where: { email: 'officer@vojas.gov' } }))!;
  const contractorUser = (await prisma.user.findFirst({ where: { email: 'contractor@vojas.gov' } }))!;

  // 2. Real MPs
  const mps = [
    {
      id: 'mp-aparajita-sarangi',
      name: 'Smt Aparajita Sarangi',
      house: House.LOK_SABHA,
      party: 'BJP',
      state: 'Odisha',
      constituency: 'Bhubaneswar',
      term: '17th Lok Sabha',
    },
    {
      id: 'mp-chellakumar',
      name: 'Dr. A. Chellakumar',
      house: House.LOK_SABHA,
      party: 'INC',
      state: 'Tamil Nadu',
      constituency: 'Krishnagiri',
      term: '17th Lok Sabha',
    },
    {
      id: 'mp-abhishek-banerjee',
      name: 'Sh. Abhishek Banerjee',
      house: House.LOK_SABHA,
      party: 'AITC',
      state: 'West Bengal',
      constituency: 'Diamond Harbour',
      term: '17th Lok Sabha',
    },
  ];

  for (const mp of mps) {
    await prisma.mP.upsert({
      where: { id: mp.id },
      update: mp,
      create: mp,
    });
  }
  console.log('  ✓ MPs verified');

  // 3. Registered Contractors
  const contractors = [
    { id: 'cont-kalinga', name: 'Kalinga Infrastructure Ltd', registrationNo: 'OD-CIVIL-2018-091', pan: 'AAACK1234F' },
    { id: 'cont-chola', name: 'Chola Roadways & Civil Corp', registrationNo: 'TN-HW-2017-882', pan: 'AACCC9012H' },
    { id: 'cont-utkal', name: 'Utkal Civil Works', registrationNo: 'OD-PW-2021-119', pan: 'AAACU3456I' },
    { id: 'cont-apex', name: 'Apex Infra Solutions', registrationNo: 'OD-APEX-2022-773', pan: 'AAACA7890J' },
    { id: 'cont-eastern', name: 'Eastern Marine & Civil Works', registrationNo: 'WB-EMC-2020-552', pan: 'AABCE2345K' },
  ];

  for (const c of contractors) {
    await prisma.contractor.upsert({
      where: { id: c.id },
      update: { name: c.name, nameNormalized: c.name.toLowerCase().trim() },
      create: { id: c.id, name: c.name, nameNormalized: c.name.toLowerCase().trim(), projectCount: 2 },
    });
  }
  console.log('  ✓ Contractors verified');

  // 4. Curated 5 Real Projects Specification
  const KEEP_PROJECT_IDS = [
    'showcase-fin-1',
    'showcase-fin-3',
    'showcase-ong-1',
    'showcase-fraud-1',
    'showcase-fraud-2',
  ];

  // Prune all other projects
  const allProjects = await prisma.project.findMany({ select: { id: true } });
  const toDelete = allProjects.filter((p) => !KEEP_PROJECT_IDS.includes(p.id)).map((p) => p.id);

  if (toDelete.length > 0) {
    console.log(`  Pruning ${toDelete.length} legacy projects to enforce exactly 5 active projects...`);
    for (const pid of toDelete) {
      await prisma.referral.deleteMany({ where: { projectId: pid } });
      await prisma.verificationCase.deleteMany({ where: { projectId: pid } });
      await prisma.fieldVerification.deleteMany({ where: { projectId: pid } });
      await prisma.document.deleteMany({ where: { projectId: pid } });
      await prisma.anomaly.deleteMany({ where: { projectId: pid } });
      await prisma.riskFinding.deleteMany({ where: { projectId: pid } });
      await prisma.projectRisk.deleteMany({ where: { projectId: pid } });
      await prisma.changeAnalysis.deleteMany({ where: { projectId: pid } });
      await prisma.satelliteAnalysis.deleteMany({ where: { projectId: pid } });
      await prisma.satelliteWeeklyCheckpoint.deleteMany({ where: { projectId: pid } });
      await prisma.satelliteObservation.deleteMany({ where: { projectId: pid } });
      await prisma.contractorUpdate.deleteMany({ where: { projectId: pid } });
      await prisma.progressObservation.deleteMany({ where: { projectId: pid } });
      await prisma.financialObservation.deleteMany({ where: { projectId: pid } });
      await prisma.projectEvent.deleteMany({ where: { projectId: pid } });
      await prisma.projectLocation.deleteMany({ where: { projectId: pid } });
      await prisma.report.deleteMany({ where: { projectId: pid } });
      
      await prisma.project.delete({ where: { id: pid } }).catch(() => {});
    }
  }

  const now = new Date();
  const weeksAgo = (w: number) => new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);

  // Definition of the 5 projects
  const projectDefs = [
    // ══════════════════════════════════════════════════════════════
    // PROJECT 1: Bhubaneswar High School Science Lab (CLEAN / FINISHED)
    // ══════════════════════════════════════════════════════════════
    {
      id: 'showcase-fin-1',
      name: 'Bhubaneswar High School Modern Science Lab & Library Block',
      description: 'Construction of a 2-storey science laboratory, computer room, and digital library at Unit-8 Government High School.',
      sector: ProjectSector.EDUCATION,
      status: ProjectStatus.COMPLETED,
      state: 'Odisha',
      district: 'Khordha',
      constituency: 'Bhubaneswar',
      approvedAmount: 4500000,
      spentAmount: 4500000,
      progressPercent: 100,
      mpId: 'mp-aparajita-sarangi',
      contractorId: 'cont-kalinga',
      contractorName: 'Kalinga Infrastructure Ltd',
      latitude: 20.2724,
      longitude: 85.8338,
      startDate: weeksAgo(20),
      expectedEndDate: weeksAgo(2),
      completedAt: weeksAgo(2),
      riskScore: 6,
      riskLevel: RiskLevel.LOW,
      primaryDriver: 'Fully verified by Sentinel-2: Continuous spectral progression from ground excavation to complete 2-storey roof slab.',
      isFraud: false,
      weeks: [
        { weekNum: 1, date: weeksAgo(20), contractorPercent: 10, contractorSpent: 450000, note: 'Site boundary marking and earth excavation complete.', image: LOCAL_SATELLITE_IMG.BUILDING_BEFORE, cloudCover: 4, ndvi: 0.28, ndbi: -0.15, observedPercent: 5 },
        { weekNum: 4, date: weeksAgo(16), contractorPercent: 35, contractorSpent: 1575000, note: 'Foundation columns cast and plinth beam complete.', image: LOCAL_SATELLITE_IMG.BUILDING_EXCAVATION, cloudCover: 6, ndvi: 0.20, ndbi: 0.02, observedPercent: 30 },
        { weekNum: 8, date: weeksAgo(12), contractorPercent: 65, contractorSpent: 2925000, note: 'Ground and first floor slab casting complete.', image: LOCAL_SATELLITE_IMG.BUILDING_FRAMING, cloudCover: 2, ndvi: 0.12, ndbi: 0.18, observedPercent: 60 },
        { weekNum: 14, date: weeksAgo(6), contractorPercent: 90, contractorSpent: 4050000, note: 'Roofing, interior plastering, electrical and lab work benches installed.', image: LOCAL_SATELLITE_IMG.BUILDING_SUPERSTRUCTURE, cloudCover: 5, ndvi: 0.08, ndbi: 0.32, observedPercent: 88 },
        { weekNum: 18, date: weeksAgo(2), contractorPercent: 100, contractorSpent: 4500000, note: 'Final painting, equipment installation, and handover completed.', image: LOCAL_SATELLITE_IMG.BUILDING_AFTER, cloudCover: 3, ndvi: 0.05, ndbi: 0.38, observedPercent: 100 },
      ],
      changeClassification: 'HIGH_OBSERVABLE_CHANGE',
      changePercent: 100.0,
      changeArea: 856.0,
      narrative: 'Sentinel-2 Level-2A multi-spectral change detection confirms complete construction of the 2-storey science laboratory. Built-up index (NDBI) grew from -0.15 to +0.38 (+0.53 net built footprint). Ground observation matches 100% reported progress.',
    },

    // ══════════════════════════════════════════════════════════════
    // PROJECT 2: Krishnagiri Concrete Road (CLEAN / FINISHED)
    // ══════════════════════════════════════════════════════════════
    {
      id: 'showcase-fin-3',
      name: 'Krishnagiri Rural All-Weather Concrete Road & Culvert (Package 2)',
      description: 'Construction of 2.8 km heavy-duty rural concrete road connecting agricultural hamlets to the state highway.',
      sector: ProjectSector.TRANSPORT,
      status: ProjectStatus.COMPLETED,
      state: 'Tamil Nadu',
      district: 'Krishnagiri',
      constituency: 'Krishnagiri',
      approvedAmount: 3500000,
      spentAmount: 3490000,
      progressPercent: 100,
      mpId: 'mp-chellakumar',
      contractorId: 'cont-chola',
      contractorName: 'Chola Roadways & Civil Corp',
      latitude: 12.5186,
      longitude: 78.2138,
      startDate: weeksAgo(16),
      expectedEndDate: weeksAgo(1),
      completedAt: weeksAgo(1),
      riskScore: 8,
      riskLevel: RiskLevel.LOW,
      primaryDriver: 'Linear road corridor fully paved: Multi-spectral Sentinel-2 reflectance confirms finished concrete surface.',
      isFraud: false,
      weeks: [
        { weekNum: 1, date: weeksAgo(16), contractorPercent: 15, contractorSpent: 525000, note: 'Grading and sub-base compaction along 2.8km alignment.', image: LOCAL_SATELLITE_IMG.ROAD_BEFORE, cloudCover: 5, ndvi: 0.25, ndbi: -0.10, observedPercent: 15 },
        { weekNum: 6, date: weeksAgo(10), contractorPercent: 55, contractorSpent: 1920000, note: 'Wet mix macadam and cross-drainage culverts constructed.', image: LOCAL_SATELLITE_IMG.ROAD_GRADING, cloudCover: 3, ndvi: 0.15, ndbi: 0.15, observedPercent: 52 },
        { weekNum: 15, date: weeksAgo(1), contractorPercent: 100, contractorSpent: 3490000, note: 'Pavement quality concrete laid, lane markings and culverts commissioned.', image: LOCAL_SATELLITE_IMG.ROAD_AFTER, cloudCover: 4, ndvi: 0.06, ndbi: 0.33, observedPercent: 100 },
      ],
      changeClassification: 'HIGH_OBSERVABLE_CHANGE',
      changePercent: 100.0,
      changeArea: 1420.0,
      narrative: 'Satellite pass confirms linear corridor transition from raw dirt track to high-reflectance engineered concrete pavement along full 2.8 km corridor. Cross-drainage culverts clearly identifiable.',
    },

    // ══════════════════════════════════════════════════════════════
    // PROJECT 3: Jatni Anganwadi Centre (CLEAN / ONGOING 50%)
    // ══════════════════════════════════════════════════════════════
    {
      id: 'showcase-ong-1',
      name: 'Jatni Model Anganwadi & Early Child Nutrition Centre',
      description: 'Construction of child-friendly Anganwadi center with kitchen, indoor play area, and clean sanitation unit.',
      sector: ProjectSector.EDUCATION,
      status: ProjectStatus.IN_PROGRESS,
      state: 'Odisha',
      district: 'Khordha',
      constituency: 'Bhubaneswar',
      approvedAmount: 2500000,
      spentAmount: 1250000,
      progressPercent: 50,
      mpId: 'mp-aparajita-sarangi',
      contractorId: 'cont-utkal',
      contractorName: 'Utkal Civil Works',
      latitude: 20.1611,
      longitude: 85.7067,
      startDate: weeksAgo(8),
      expectedEndDate: new Date(now.getTime() + 8 * 7 * 24 * 60 * 60 * 1000),
      riskScore: 14,
      riskLevel: RiskLevel.LOW,
      primaryDriver: 'Pacing consistent: 50% fund utilization matches physical slab and structural frame on site.',
      isFraud: false,
      weeks: [
        { weekNum: 1, date: weeksAgo(8), contractorPercent: 10, contractorSpent: 250000, note: 'Layout marked, site cleared.', image: LOCAL_SATELLITE_IMG.BUILDING_BEFORE, cloudCover: 5, ndvi: 0.32, ndbi: -0.18, observedPercent: 10 },
        { weekNum: 3, date: weeksAgo(6), contractorPercent: 25, contractorSpent: 625000, note: 'Footing concrete poured, plinth beam reinforced.', image: LOCAL_SATELLITE_IMG.BUILDING_EXCAVATION, cloudCover: 2, ndvi: 0.24, ndbi: -0.05, observedPercent: 25 },
        { weekNum: 8, date: weeksAgo(1), contractorPercent: 50, contractorSpent: 1250000, note: 'Columns raised, plinth slab cast. Roof shuttering scheduled.', image: LOCAL_SATELLITE_IMG.BUILDING_FRAMING, cloudCover: 4, ndvi: 0.15, ndbi: 0.16, observedPercent: 50 },
      ],
      changeClassification: 'MODERATE_OBSERVABLE_CHANGE',
      changePercent: 50.0,
      changeArea: 380.0,
      narrative: 'Mid-term Sentinel-2 analysis shows active civil construction. Foundation columns and plinth slab are visible, exactly matching reported 50% milestone and ₹12.5L expenditure.',
    },

    // ══════════════════════════════════════════════════════════════
    // PROJECT 4: Bhubaneswar Community Hall (CRITICAL FRAUD / GHOST)
    // ══════════════════════════════════════════════════════════════
    {
      id: 'showcase-fraud-1',
      name: 'Bhubaneswar Integrated Community Hall & Senior Citizen Center (Sector 4)',
      description: 'Construction of a community multi-purpose hall with auditorium, stage, and public restrooms.',
      sector: ProjectSector.PUBLIC_INFRASTRUCTURE,
      status: ProjectStatus.IN_PROGRESS,
      state: 'Odisha',
      district: 'Khordha',
      constituency: 'Bhubaneswar',
      approvedAmount: 4500000,
      spentAmount: 3825000, // 85% spent!
      progressPercent: 85,
      mpId: 'mp-aparajita-sarangi',
      contractorId: 'cont-apex',
      contractorName: 'Apex Infra Solutions',
      latitude: 20.2961,
      longitude: 85.8245,
      startDate: weeksAgo(8),
      expectedEndDate: weeksAgo(1),
      riskScore: 95,
      riskLevel: RiskLevel.CRITICAL,
      primaryDriver: 'CRITICAL DISPARITY: 85% expenditure drawn (₹38.25L) with 0% ground physical construction (Disparity: -85%).',
      isFraud: true,
      referralRef: 'ACB-OD-2026-BBSR-00892',
      referralAuthority: 'ANTI_CORRUPTION_BUREAU',
      referralAuthorityDisplay: 'Anti-Corruption Bureau (ACB) Odisha Regional Directorate & State Vigilance Police',
      weeks: [
        { weekNum: 1, date: weeksAgo(8), contractorPercent: 20, contractorSpent: 900000, note: 'Mobilization completed. Foundation excavation 100% done.', image: LOCAL_SATELLITE_IMG.FRAUD_STALLED, cloudCover: 3, ndvi: 0.35, ndbi: -0.18, observedPercent: 0, anomaly: 'Contractor claimed 20% progress (₹9 Lakhs) but satellite shows untouched scrubland.' },
        { weekNum: 3, date: weeksAgo(6), contractorPercent: 45, contractorSpent: 2025000, note: 'All 18 RCC columns cast and cured. Plinth beam concrete poured.', image: LOCAL_SATELLITE_IMG.FRAUD_STALLED, cloudCover: 2, ndvi: 0.34, ndbi: -0.18, observedPercent: 0, anomaly: 'Satellite pass confirms zero foundation excavation or columns. NDBI unchanged (-0.18).' },
        { weekNum: 6, date: weeksAgo(3), contractorPercent: 70, contractorSpent: 3150000, note: 'Roof slab casting completed. Brickwork on external walls 80% done.', image: LOCAL_SATELLITE_IMG.FRAUD_STALLED, cloudCover: 5, ndvi: 0.35, ndbi: -0.17, observedPercent: 0, anomaly: 'CRITICAL: Contractor billed for roof slab. Ground satellite imagery proves bare mud plot.' },
        { weekNum: 8, date: weeksAgo(1), contractorPercent: 85, contractorSpent: 3825000, note: 'Electrical wiring and plastering in final stages. Handover scheduled next week.', image: LOCAL_SATELLITE_IMG.FRAUD_STALLED, cloudCover: 1, ndvi: 0.34, ndbi: -0.18, observedPercent: 0, anomaly: 'AI DISCREPANCY DETECTED: 85% completion claimed & ₹38.25L spent, but site is 100% untouched!' },
      ],
      changeClassification: 'NO_OBSERVABLE_CHANGE',
      changePercent: 0.0,
      changeArea: 0.0,
      narrative: 'CRITICAL GHOST ASSET DETECTED: Apex Infra Solutions billed ₹38,25,000 (85% of budget) claiming RCC columns, brick masonry, and roof slab complete. Four consecutive Sentinel-2 passes over 8 weeks confirm the location remains 100% undisturbed vacant mud land. Disparity: -85%. Formal referral dispatched to Anti-Corruption Bureau (ACB) and State Vigilance Police.',
    },

    // ══════════════════════════════════════════════════════════════
    // PROJECT 5: Diamond Harbour Drainage Bund (CRITICAL FRAUD / GHOST)
    // ══════════════════════════════════════════════════════════════
    {
      id: 'showcase-fraud-2',
      name: 'Diamond Harbour Coastal Drainage Bund & Concrete Culvert Bridge',
      description: 'Construction of storm water drainage culvert and concrete embankment bridge to prevent tidal flooding.',
      sector: ProjectSector.PUBLIC_INFRASTRUCTURE,
      status: ProjectStatus.IN_PROGRESS,
      state: 'West Bengal',
      district: 'South 24 Parganas',
      constituency: 'Diamond Harbour',
      approvedAmount: 4000000,
      spentAmount: 3200000, // 80% spent!
      progressPercent: 80,
      mpId: 'mp-abhishek-banerjee',
      contractorId: 'cont-eastern',
      contractorName: 'Eastern Marine & Civil Works',
      latitude: 22.1702,
      longitude: 88.1812,
      startDate: weeksAgo(6),
      expectedEndDate: weeksAgo(1),
      riskScore: 92,
      riskLevel: RiskLevel.CRITICAL,
      primaryDriver: 'GHOST INFRASTRUCTURE: ₹32,00,000 public funds withdrawn with 0% civil work on undisturbed mangrove creek (Disparity: -80%).',
      isFraud: true,
      referralRef: 'ACB-WB-2026-DH-00441',
      referralAuthority: 'ANTI_CORRUPTION_BUREAU',
      referralAuthorityDisplay: 'Anti-Corruption Bureau (ACB) Kolkata Regional Directorate & State Vigilance Police',
      weeks: [
        { weekNum: 1, date: weeksAgo(6), contractorPercent: 25, contractorSpent: 1000000, note: 'Diversion channel excavated. Steel sheet piling driven.', image: LOCAL_SATELLITE_IMG.FRAUD_CREEK, cloudCover: 7, ndvi: 0.45, ndbi: -0.28, observedPercent: 0, anomaly: 'Zero channel excavation detected by Sentinel-2 MSI bands.' },
        { weekNum: 4, date: weeksAgo(3), contractorPercent: 60, contractorSpent: 2400000, note: 'Culvert abutment concrete poured, wing walls completed.', image: LOCAL_SATELLITE_IMG.FRAUD_CREEK, cloudCover: 4, ndvi: 0.44, ndbi: -0.28, observedPercent: 0, anomaly: 'Natural mangrove creek completely undisturbed. Zero concrete or earthworks present.' },
        { weekNum: 6, date: weeksAgo(1), contractorPercent: 80, contractorSpent: 3200000, note: 'Deck slab cured, safety railings installed, approach road compacted.', image: LOCAL_SATELLITE_IMG.FRAUD_CREEK, cloudCover: 3, ndvi: 0.45, ndbi: -0.27, observedPercent: 0, anomaly: 'GHOST INFRASTRUCTURE: ₹32,00,000 claimed withdrawn. Water body completely undisturbed.' },
      ],
      changeClassification: 'NO_OBSERVABLE_CHANGE',
      changePercent: 0.0,
      changeArea: 0.0,
      narrative: 'PHANTOM CULVERT FRAUD: Contractor Eastern Marine & Civil Works billed ₹32,00,000 for concrete bridge deck and tidal bund. High-confidence Sentinel-2 multispectral surface water analysis confirms the tidal creek has zero concrete or civil infrastructure. Disparity: -80%. Law enforcement complaint registered with ACB Kolkata Directorate.',
    },
  ];

  for (const p of projectDefs) {
    console.log(`  Writing Project: ${p.name}...`);

    // 1. Project master
    await prisma.project.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        description: p.description,
        sector: p.sector,
        status: p.status,
        state: p.state,
        district: p.district,
        constituency: p.constituency,
        approvedAmount: p.approvedAmount,
        spentAmount: p.spentAmount,
        
        mpId: p.mpId,
        contractor: p.contractorName,
        latitude: p.latitude,
        longitude: p.longitude,
        startDate: p.startDate,
        expectedEndDate: p.expectedEndDate,
        completedAt: p.completedAt ?? null,
        source: 'SHOWCASE_CURATED',
        sourceWorkId: `MPLAD-${p.id.toUpperCase()}`,
      },
      create: {
        id: p.id,
        name: p.name,
        description: p.description,
        sector: p.sector,
        status: p.status,
        state: p.state,
        district: p.district,
        constituency: p.constituency,
        approvedAmount: p.approvedAmount,
        spentAmount: p.spentAmount,
        
        mpId: p.mpId,
        contractor: p.contractorName,
        latitude: p.latitude,
        longitude: p.longitude,
        startDate: p.startDate,
        expectedEndDate: p.expectedEndDate,
        completedAt: p.completedAt ?? null,
        source: 'SHOWCASE_CURATED',
        sourceWorkId: `MPLAD-${p.id.toUpperCase()}`,
        createdById: officerUser.id,
      },
    });

    // Clean existing children for idempotency
    await prisma.referral.deleteMany({ where: { projectId: p.id } });
    await prisma.verificationCase.deleteMany({ where: { projectId: p.id } });
    await prisma.riskFinding.deleteMany({ where: { projectId: p.id } });
    await prisma.projectRisk.deleteMany({ where: { projectId: p.id } });
    await prisma.changeAnalysis.deleteMany({ where: { projectId: p.id } });
    await prisma.satelliteAnalysis.deleteMany({ where: { projectId: p.id } });
    await prisma.satelliteWeeklyCheckpoint.deleteMany({ where: { projectId: p.id } });
    await prisma.satelliteObservation.deleteMany({ where: { projectId: p.id } });
    await prisma.contractorUpdate.deleteMany({ where: { projectId: p.id } });
    await prisma.anomaly.deleteMany({ where: { projectId: p.id } });

    // 2. Observations and Checkpoints
    const createdObs: Array<{ id: string; date: Date }> = [];

    for (const w of p.weeks) {
      const obsId = `${p.id}-sat-w${w.weekNum}`;
      await prisma.satelliteObservation.create({
        data: {
          id: obsId,
          projectId: p.id,
          observationDate: w.date,
          targetDate: w.date,
          targetDifference: 0,
          provider: 'Copernicus-ESA',
          satellite: 'Sentinel-2B',
          sensor: 'MSI',
          dataset: 'S2MSI2A',
          cloudCover: w.cloudCover,
          resolution: 10,
          thumbnailUrl: w.image,
          tileUrl: w.image,
          centerLat: p.latitude,
          centerLng: p.longitude,
          quality: 'USABLE',
          ndvi: w.ndvi,
          ndbi: w.ndbi,
          bsi: 0.15,
          builtUpArea: Math.max(0, Math.round(w.ndbi * 1200 + 400)),
          constructionScore: w.observedPercent,
          sourceName: 'Copernicus Data Space Ecosystem (CDSE)',
          sourceUrl: `https://browser.dataspace.copernicus.eu/?zoom=17&lat=${p.latitude}&lng=${p.longitude}&time=${w.date.toISOString().slice(0, 10)}`,
        },
      });

      createdObs.push({ id: obsId, date: w.date });

      // Weekly Checkpoint
      await prisma.satelliteWeeklyCheckpoint.create({
        data: {
          id: `${p.id}-cp-w${w.weekNum}`,
          projectId: p.id,
          targetDate: w.date,
          observationId: obsId,
          windowStart: new Date(w.date.getTime() - 3 * 24 * 60 * 60 * 1000),
          windowEnd: new Date(w.date.getTime() + 3 * 24 * 60 * 60 * 1000),
          availability: 'AVAILABLE',
          targetDifference: 0,
          methodology: 'Sentinel-2 10m L2A MSI Surface Reflectance Tile',
        },
      });

      // Contractor update
      await prisma.contractorUpdate.create({
        data: {
          id: `${p.id}-cu-w${w.weekNum}`,
          contractorId: p.contractorId,
          projectId: p.id,
          updateType: 'STATUS',
          title: `Week ${w.weekNum} Milestone Claim`,
          description: w.note,
          amount: w.contractorSpent,
          status: p.isFraud ? 'REJECTED' : 'ACCEPTED',
          submittedById: contractorUser.id,
          submittedAt: w.date,
          reviewNote: p.isFraud
            ? 'DISCREPANCY FLAGGED: Sentinel-2 pass shows zero ground progress against claimed milestone.'
            : 'Verified against Sentinel-2 spectral indices.',
        },
      });

      // Anomaly
      if (p.isFraud) {
        await prisma.anomaly.create({
          data: {
            id: `${p.id}-anomaly-w${w.weekNum}`,
            projectId: p.id,
            title: `Week ${w.weekNum} Ghost Construction Alert`,
            category: AnomalyCategory.PROGRESS_DISCREPANCY,
            severity: AnomalySeverity.CRITICAL,
            description: w.anomaly || 'Progress mismatch between contractor invoice and earth observation.',
            status: 'ESCALATED',
            riskScore: p.riskScore,
            lawEscalation: true,
            lawAuthority: p.referralAuthorityDisplay,
            lawReferenceNo: p.referralRef,
            lawEscalatedAt: w.date,
            lawEscalatedById: officerUser.id,
            lawNotes: `Automated law referral dispatched to ${p.referralAuthorityDisplay}: Reference #${p.referralRef}`,
            aiExplanation: `Deterministic cross-signal AI fraud model flagged claimed ${w.contractorPercent}% progress vs 0% physical development. Risk Score: ${p.riskScore}/100.`,
            aiConfidence: 98,
            createdAt: w.date,
          },
        });
      }
    }

    // 3. Pairwise Satellite Analyses (CRITICAL FOR DISPARITY CALCULATION & BEFORE/AFTER)
    const baselineObs = createdObs[0];
    const latestObs = createdObs[createdObs.length - 1];

    // Primary: BASELINE_VS_LATEST (Used by /projects/:id/satellite/comparison and Explore detail)
    await prisma.satelliteAnalysis.create({
      data: {
        id: `${p.id}-analysis-baseline-latest`,
        projectId: p.id,
        observationBeforeId: baselineObs.id,
        observationAfterId: latestObs.id,
        analysisType: 'BASELINE_VS_LATEST',
        analysisDate: now,
        baselineDate: baselineObs.date,
        comparisonDate: latestObs.date,
        changeClassification: p.changeClassification,
        changeArea: p.changeArea,
        changePercent: p.changePercent,
        confidence: 'HIGH',
        methodology: 'Sentinel-2 Level-2A Multi-Temporal Optical Difference Analysis (10m Resolution MSI)',
        evidence: {
          baselineDate: baselineObs.date.toISOString(),
          latestDate: latestObs.date.toISOString(),
          observedGrowthPercent: p.changePercent,
          claimedProgressPercent: p.progressPercent,
          disparityPercent: p.changePercent - p.progressPercent,
          narrative: p.narrative,
          source: 'Copernicus Sentinel-2 Constellation',
        },
        limitations: 'Satellite measures optical surface changes at 10m GSD. Underground and internal works not visible.',
      },
    });

    // Secondary: WEEK_OVER_WEEK for multi-temporal tracking
    for (let i = 1; i < createdObs.length; i++) {
      const prev = createdObs[i - 1];
      const curr = createdObs[i];
      await prisma.satelliteAnalysis.create({
        data: {
          id: `${p.id}-analysis-wow-${i}`,
          projectId: p.id,
          observationBeforeId: prev.id,
          observationAfterId: curr.id,
          analysisType: 'WEEK_OVER_WEEK',
          analysisDate: curr.date,
          baselineDate: prev.date,
          comparisonDate: curr.date,
          changeClassification: p.changeClassification,
          changeArea: p.changeArea,
          changePercent: p.changePercent,
          confidence: 'HIGH',
          methodology: 'Sentinel-2 Weekly Delta Analysis',
          evidence: {
            step: `${i} to ${i + 1}`,
            classification: p.changeClassification,
          },
        },
      });
    }

    // 4. ChangeAnalysis (for domain ProjectIntelligenceService)
    await prisma.changeAnalysis.create({
      data: {
        id: `${p.id}-change-analysis`,
        projectId: p.id,
        observationBeforeId: baselineObs.id,
        observationAfterId: latestObs.id,
        analysisType: 'BASELINE_VS_LATEST',
        primarySignal: 'BUILT_SURFACE_CHANGE',
        geometryType: 'POINT_BUFFER',
        analysisBufferM: 250,
        changeClassification: p.changeClassification === 'NO_OBSERVABLE_CHANGE' ? 'NO_DETECTABLE_CHANGE' : 'HIGH_CHANGE',
        confidence: 'HIGH',
        changePercent: p.changePercent,
        reportedProgressComparison: p.isFraud ? 'POSSIBLY_INCONSISTENT' : 'CONSISTENT',
        changeStory: p.narrative,
        methodology: 'Copernicus Sentinel-2 L2A Normalized Difference Built-up Index (NDBI) Differencing',
        processingStatus: 'COMPLETED',
        analysisDate: now,
        baselineDate: baselineObs.date,
        comparisonDate: latestObs.date,
      },
    });

    // 5. ProjectRisk
    await prisma.projectRisk.create({
      data: {
        id: `${p.id}-risk`,
        projectId: p.id,
        riskScore: p.riskScore,
        riskLevel: p.riskLevel,
        confidence: 'HIGH',
        primaryDriver: p.primaryDriver,
        financialScore: p.isFraud ? 96 : 4,
        satelliteScore: p.isFraud ? 98 : 5,
        progressScore: p.isFraud ? 92 : 5,
        citizenScore: p.isFraud ? 85 : 0,
        contractorScore: p.isFraud ? 90 : 2,
        computedAt: now,
      },
    });

    // 6. RiskFinding, VerificationCase, and Referral for Fraud Projects
    if (p.isFraud) {
      const finding = await prisma.riskFinding.create({
        data: {
          id: `${p.id}-finding-ghost`,
          projectId: p.id,
          type: 'GHOST_CONSTRUCTION',
          title: `Critical Ghost Construction Discrepancy: ${p.progressPercent}% Claimed vs 0% Observable`,
          description: p.narrative,
          severity: AnomalySeverity.CRITICAL,
          riskScore: p.riskScore,
          confidence: 'HIGH',
          status: RiskFindingStatus.ESCALATED,
          recommendedAction: `Immediate formal referral to ${p.referralAuthorityDisplay} for investigation and FIR registration.`,
          lawEscalation: true,
          lawAuthority: p.referralAuthorityDisplay,
          detectedAt: weeksAgo(2),
        },
      });

      const verificationCase = await prisma.verificationCase.create({
        data: {
          id: `${p.id}-case-vigilance`,
          projectId: p.id,
          findingId: finding.id,
          type: 'GHOST_CONSTRUCTION',
          status: 'UNDER_REVIEW',
          priority: 'CRITICAL',
          assignedToId: officerUser.id,
          notes: `Automated AI Escalation: Disparity of -${p.progressPercent}% verified between claimed expenditure and Sentinel-2 ground reality. Multi-temporal satellite passes archived. Case escalated for criminal investigation.`,
        },
      });

      // Formal Law Enforcement Referral
      await prisma.referral.create({
        data: {
          id: `${p.id}-referral-acb`,
          caseId: verificationCase.id,
          projectId: p.id,
          findingId: finding.id,
          destinationAuthority: p.referralAuthority!,
          referenceNo: p.referralRef!,
          reason: `Prima facie fraud and misrepresentation of public MPLADS funds: ₹${(p.spentAmount / 100000).toFixed(2)} Lakhs withdrawn with zero physical ground structure.`,
          status: 'REFERRED',
          notes: `Formal dossier transmitted to ${p.referralAuthorityDisplay}. Case file contains georeferenced satellite imagery, payment voucher ledger, and contractor declarations.`,
          dossier: {
            referenceNo: p.referralRef,
            authority: p.referralAuthorityDisplay,
            projectName: p.name,
            sanctionedAmount: p.approvedAmount,
            disbursedAmount: p.spentAmount,
            claimedProgress: `${p.progressPercent}%`,
            observedProgress: '0% (Untouched natural ground)',
            disparity: `-${p.progressPercent}%`,
            contractor: p.contractorName,
            mp: p.mpId,
            coordinates: `${p.latitude}, ${p.longitude}`,
            evidenceType: 'Copernicus Sentinel-2 MSI Multi-Spectral Ground Verification',
            dispatchTimestamp: weeksAgo(1).toISOString(),
            status: 'FIR_INITIATION_REQUESTED',
          },
          preparedById: officerUser.id,
          approvedById: officerUser.id,
          approvedAt: weeksAgo(1),
          referredAt: weeksAgo(1),
        },
      });

      console.log(`    🚨 Fraud Referral registered: #${p.referralRef} -> ${p.referralAuthorityDisplay}`);
    }
  }

  console.log('✅ Successfully seeded Exactly 5 Curated Real Showcase Projects with full satellite analyses and fraud referrals!');
}

main()
  .catch((e) => {
    console.error('Error seeding curated 5:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
