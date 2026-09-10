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
  ConstituencyType,
  AnomalyCategory,
  AnomalySeverity,
  Confidence,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// High-resolution visual satellite imagery simulator tiles
// Realistic Copernicus/Sentinel-2 scene representations
const SATELLITE_IMG = {
  EMPTY_LAND: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80',
  GROUND_EXCAVATION: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=600&auto=format&fit=crop&q=80',
  FOUNDATION_PILLARS: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80',
  SUPERSTRUCTURE: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=600&auto=format&fit=crop&q=80',
  FINISHED_BUILDING: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
  FINISHED_ROAD: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=600&auto=format&fit=crop&q=80',
  BARREN_SCRUB: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&auto=format&fit=crop&q=80',
  SWAMP_RIVER: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80',
};

async function main() {
  console.log('🚀 Seeding 13 Curated Real Showcase Construction Projects...');

  // 1. Ensure Demo Users exist
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const demoUsers = [
    { email: 'citizen@vojas.gov', name: 'Dr. Ramesh Sharma (Citizen)', role: UserRole.CITIZEN },
    { email: 'mp@vojas.gov', name: 'Smt Aparajita Sarangi (MP)', role: UserRole.MP },
    { email: 'officer@vojas.gov', name: 'Vikram Malhotra (Vigilance Officer)', role: UserRole.OFFICER },
    { email: 'contractor@vojas.gov', name: 'Rajesh Buildcon Ltd (Contractor)', role: UserRole.CONTRACTOR },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name, passwordHash },
      create: { ...u, passwordHash, isActive: true },
    });
  }
  console.log('  ✓ Demo users verified');

  // 2. Real MPs
  const mpsData = [
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
      id: 'mp-abhishek-banerjee',
      name: 'Sh. Abhishek Banerjee',
      house: House.LOK_SABHA,
      party: 'AITC',
      state: 'West Bengal',
      constituency: 'Diamond Harbour',
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
      id: 'mp-pc-mohan',
      name: 'Sh. P. C. Mohan',
      house: House.LOK_SABHA,
      party: 'BJP',
      state: 'Karnataka',
      constituency: 'Bangalore Central',
      term: '17th Lok Sabha',
    },
    {
      id: 'mp-arvind-sawant',
      name: 'Sh. Arvind Sawant',
      house: House.LOK_SABHA,
      party: 'Shiv Sena (UBT)',
      state: 'Maharashtra',
      constituency: 'Mumbai South',
      term: '17th Lok Sabha',
    },
  ];

  for (const mp of mpsData) {
    await prisma.mP.upsert({
      where: { id: mp.id },
      update: mp,
      create: mp,
    });
  }
  console.log(`  ✓ ${mpsData.length} Real MPs registered`);

  // 3. Contractors
  const contractorsData = [
    { id: 'cont-kalinga', name: 'Kalinga Infrastructure Ltd', registrationNo: 'OD-CIVIL-2018-091', pan: 'AAACK1234F', rating: 4.8 },
    { id: 'cont-bengal', name: 'Bengal Buildcon Pvt Ltd', registrationNo: 'WB-ENG-2019-441', pan: 'AABCB5678G', rating: 4.6 },
    { id: 'cont-chola', name: 'Chola Roadways & Civil Corp', registrationNo: 'TN-HW-2017-882', pan: 'AACCC9012H', rating: 4.9 },
    { id: 'cont-utkal', name: 'Utkal Civil Works', registrationNo: 'OD-PW-2021-119', pan: 'AAACU3456I', rating: 4.2 },
    { id: 'cont-apex', name: 'Apex Infra Solutions', registrationNo: 'OD-APEX-2022-773', pan: 'AAACA7890J', rating: 2.1 }, // Fraud contractor
    { id: 'cont-eastern', name: 'Eastern Marine & Civil Works', registrationNo: 'WB-EMC-2020-552', pan: 'AABCE2345K', rating: 1.9 }, // Fraud contractor
    { id: 'cont-star', name: 'Star Engineering Contracts', registrationNo: 'TN-SEC-2021-664', pan: 'AAACS6789L', rating: 2.4 }, // Fraud contractor
  ];

  for (const c of contractorsData) {
    await prisma.contractor.upsert({
      where: { id: c.id },
      update: { name: c.name, nameNormalized: c.name.toLowerCase().trim() },
      create: { id: c.id, name: c.name, nameNormalized: c.name.toLowerCase().trim(), projectCount: 2 },
    });
  }
  console.log(`  ✓ ${contractorsData.length} Contractors registered`);

  // Define the 13 Curated Projects:
  // 5 Finished, 5 Ongoing, 3 Ghost/Stalled
  interface ShowcaseDef {
    id: string;
    showcaseType: 'FINISHED' | 'ONGOING' | 'STALLED';
    name: string;
    description: string;
    sector: ProjectSector;
    status: ProjectStatus;
    state: string;
    district: string;
    constituency: string;
    approvedAmount: number;
    spentAmount: number;
    mpId: string;
    contractorId: string;
    contractorName: string;
    latitude: number;
    longitude: number;
    startDate: Date;
    expectedEndDate: Date;
    completedAt?: Date;
    weeks: Array<{
      weekNum: number;
      date: Date;
      contractorPercentDone: number;
      contractorSpent: number;
      contractorNote: string;
      satImage: string;
      cloudCover: number;
      ndvi: number;
      ndbi: number;
      observedChangePercent: number;
      changeClassification: 'NO_OBSERVABLE_CHANGE' | 'LOW_OBSERVABLE_CHANGE' | 'MODERATE_OBSERVABLE_CHANGE' | 'HIGH_OBSERVABLE_CHANGE';
      anomalyNote?: string;
    }>;
  }

  const now = new Date();
  const weeksAgo = (w: number) => new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);

  const showcaseProjects: ShowcaseDef[] = [
    // ══════════════════════════════════════════════════════════════
    // 5 FINISHED WORKS (Verified by weekly satellite physical growth)
    // ══════════════════════════════════════════════════════════════
    {
      id: 'showcase-fin-1',
      showcaseType: 'FINISHED',
      name: 'Bhubaneswar High School Modern Science Lab & Library Block',
      description: 'Construction of a 2-storey science laboratory, computer room, and digital library at Unit-8 Government High School.',
      sector: ProjectSector.EDUCATION,
      status: ProjectStatus.COMPLETED,
      state: 'Odisha',
      district: 'Khordha',
      constituency: 'Bhubaneswar',
      approvedAmount: 4500000,
      spentAmount: 4500000,
      mpId: 'mp-aparajita-sarangi',
      contractorId: 'cont-kalinga',
      contractorName: 'Kalinga Infrastructure Ltd',
      latitude: 20.2724,
      longitude: 85.8338,
      startDate: weeksAgo(20),
      expectedEndDate: weeksAgo(2),
      completedAt: weeksAgo(2),
      weeks: [
        { weekNum: 1, date: weeksAgo(20), contractorPercentDone: 10, contractorSpent: 450000, contractorNote: 'Site boundary marking and earth excavation complete.', satImage: SATELLITE_IMG.EMPTY_LAND, cloudCover: 4, ndvi: 0.28, ndbi: -0.15, observedChangePercent: 5, changeClassification: 'LOW_OBSERVABLE_CHANGE' },
        { weekNum: 4, date: weeksAgo(16), contractorPercentDone: 35, contractorSpent: 1575000, contractorNote: 'Foundation columns cast and plinth beam complete.', satImage: SATELLITE_IMG.GROUND_EXCAVATION, cloudCover: 8, ndvi: 0.20, ndbi: 0.02, observedChangePercent: 30, changeClassification: 'MODERATE_OBSERVABLE_CHANGE' },
        { weekNum: 8, date: weeksAgo(12), contractorPercentDone: 65, contractorSpent: 2925000, contractorNote: 'Ground and first floor slab casting complete. Brick masonry underway.', satImage: SATELLITE_IMG.FOUNDATION_PILLARS, cloudCover: 2, ndvi: 0.12, ndbi: 0.18, observedChangePercent: 60, changeClassification: 'MODERATE_OBSERVABLE_CHANGE' },
        { weekNum: 14, date: weeksAgo(6), contractorPercentDone: 90, contractorSpent: 4050000, contractorNote: 'Roofing, interior plastering, electrical and lab work benches installed.', satImage: SATELLITE_IMG.SUPERSTRUCTURE, cloudCover: 5, ndvi: 0.08, ndbi: 0.32, observedChangePercent: 88, changeClassification: 'HIGH_OBSERVABLE_CHANGE' },
        { weekNum: 18, date: weeksAgo(2), contractorPercentDone: 100, contractorSpent: 4500000, contractorNote: 'Final painting, equipment installation, and handover completed.', satImage: SATELLITE_IMG.FINISHED_BUILDING, cloudCover: 3, ndvi: 0.05, ndbi: 0.38, observedChangePercent: 100, changeClassification: 'HIGH_OBSERVABLE_CHANGE' },
      ],
    },
    {
      id: 'showcase-fin-2',
      showcaseType: 'FINISHED',
      name: 'Diamond Harbour Primary Healthcare Centre Inpatient Wing Extension',
      description: 'Addition of a 30-bed maternity and emergency inpatient block with solar backup and sanitation facilities.',
      sector: ProjectSector.HEALTH,
      status: ProjectStatus.COMPLETED,
      state: 'West Bengal',
      district: 'South 24 Parganas',
      constituency: 'Diamond Harbour',
      approvedAmount: 5000000,
      spentAmount: 4980000,
      mpId: 'mp-abhishek-banerjee',
      contractorId: 'cont-bengal',
      contractorName: 'Bengal Buildcon Pvt Ltd',
      latitude: 22.1932,
      longitude: 88.1963,
      startDate: weeksAgo(24),
      expectedEndDate: weeksAgo(3),
      completedAt: weeksAgo(3),
      weeks: [
        { weekNum: 1, date: weeksAgo(24), contractorPercentDone: 10, contractorSpent: 500000, contractorNote: 'Site preparation and trenching.', satImage: SATELLITE_IMG.EMPTY_LAND, cloudCover: 12, ndvi: 0.35, ndbi: -0.22, observedChangePercent: 8, changeClassification: 'LOW_OBSERVABLE_CHANGE' },
        { weekNum: 8, date: weeksAgo(16), contractorPercentDone: 45, contractorSpent: 2250000, contractorNote: 'RCC framing and roof slab cast.', satImage: SATELLITE_IMG.GROUND_EXCAVATION, cloudCover: 6, ndvi: 0.18, ndbi: 0.12, observedChangePercent: 42, changeClassification: 'MODERATE_OBSERVABLE_CHANGE' },
        { weekNum: 16, date: weeksAgo(8), contractorPercentDone: 80, contractorSpent: 4000000, contractorNote: 'Brickwork, doors, hospital-grade flooring and plumbing.', satImage: SATELLITE_IMG.SUPERSTRUCTURE, cloudCover: 4, ndvi: 0.10, ndbi: 0.28, observedChangePercent: 78, changeClassification: 'HIGH_OBSERVABLE_CHANGE' },
        { weekNum: 21, date: weeksAgo(3), contractorPercentDone: 100, contractorSpent: 4980000, contractorNote: 'Medical gas pipeline, ward beds, power backup tested and commissioned.', satImage: SATELLITE_IMG.FINISHED_BUILDING, cloudCover: 5, ndvi: 0.06, ndbi: 0.35, observedChangePercent: 100, changeClassification: 'HIGH_OBSERVABLE_CHANGE' },
      ],
    },
    {
      id: 'showcase-fin-3',
      showcaseType: 'FINISHED',
      name: 'Krishnagiri Rural All-Weather Concrete Road & Culvert (Package 2)',
      description: 'Construction of 2.8 km heavy-duty rural concrete road connecting agricultural hamlets to the state highway.',
      sector: ProjectSector.TRANSPORT,
      status: ProjectStatus.COMPLETED,
      state: 'Tamil Nadu',
      district: 'Krishnagiri',
      constituency: 'Krishnagiri',
      approvedAmount: 3500000,
      spentAmount: 3490000,
      mpId: 'mp-chellakumar',
      contractorId: 'cont-chola',
      contractorName: 'Chola Roadways & Civil Corp',
      latitude: 12.5186,
      longitude: 78.2138,
      startDate: weeksAgo(16),
      expectedEndDate: weeksAgo(1),
      completedAt: weeksAgo(1),
      weeks: [
        { weekNum: 1, date: weeksAgo(16), contractorPercentDone: 15, contractorSpent: 525000, contractorNote: 'Grading and sub-base compaction along 2.8km alignment.', satImage: SATELLITE_IMG.BARREN_SCRUB, cloudCover: 5, ndvi: 0.25, ndbi: -0.10, observedChangePercent: 15, changeClassification: 'LOW_OBSERVABLE_CHANGE' },
        { weekNum: 6, date: weeksAgo(10), contractorPercentDone: 55, contractorSpent: 1920000, contractorNote: 'Wet mix macadam and cross-drainage culverts constructed.', satImage: SATELLITE_IMG.GROUND_EXCAVATION, cloudCover: 2, ndvi: 0.15, ndbi: 0.15, observedChangePercent: 52, changeClassification: 'MODERATE_OBSERVABLE_CHANGE' },
        { weekNum: 12, date: weeksAgo(4), contractorPercentDone: 90, contractorSpent: 3150000, contractorNote: 'Pavement quality concrete laid, curing completed.', satImage: SATELLITE_IMG.FINISHED_ROAD, cloudCover: 8, ndvi: 0.08, ndbi: 0.30, observedChangePercent: 90, changeClassification: 'HIGH_OBSERVABLE_CHANGE' },
        { weekNum: 15, date: weeksAgo(1), contractorPercentDone: 100, contractorSpent: 3490000, contractorNote: 'Shoulders dressed, road signs and solar blinkers installed.', satImage: SATELLITE_IMG.FINISHED_ROAD, cloudCover: 3, ndvi: 0.06, ndbi: 0.33, observedChangePercent: 100, changeClassification: 'HIGH_OBSERVABLE_CHANGE' },
      ],
    },
    {
      id: 'showcase-fin-4',
      showcaseType: 'FINISHED',
      name: 'Bangalore Central Digital Skill Center & Youth Innovation Hub',
      description: 'Establishment of vocational skill center with 60 computer workstations, seminar hall, and solar microgrid.',
      sector: ProjectSector.PUBLIC_INFRASTRUCTURE,
      status: ProjectStatus.COMPLETED,
      state: 'Karnataka',
      district: 'Bangalore Urban',
      constituency: 'Bangalore Central',
      approvedAmount: 6000000,
      spentAmount: 6000000,
      mpId: 'mp-pc-mohan',
      contractorId: 'cont-kalinga',
      contractorName: 'Kalinga Infrastructure Ltd',
      latitude: 12.9716,
      longitude: 77.5946,
      startDate: weeksAgo(26),
      expectedEndDate: weeksAgo(4),
      completedAt: weeksAgo(4),
      weeks: [
        { weekNum: 1, date: weeksAgo(26), contractorPercentDone: 10, contractorSpent: 600000, contractorNote: 'Site clearance and foundation drilling.', satImage: SATELLITE_IMG.EMPTY_LAND, cloudCover: 10, ndvi: 0.15, ndbi: -0.05, observedChangePercent: 10, changeClassification: 'LOW_OBSERVABLE_CHANGE' },
        { weekNum: 10, date: weeksAgo(16), contractorPercentDone: 50, contractorSpent: 3000000, contractorNote: 'Precast steel framing and concrete deck slabs complete.', satImage: SATELLITE_IMG.FOUNDATION_PILLARS, cloudCover: 4, ndvi: 0.08, ndbi: 0.22, observedChangePercent: 50, changeClassification: 'MODERATE_OBSERVABLE_CHANGE' },
        { weekNum: 22, date: weeksAgo(4), contractorPercentDone: 100, contractorSpent: 6000000, contractorNote: 'Rooftop solar panels, gigabit fiber connection, and inauguration ready.', satImage: SATELLITE_IMG.FINISHED_BUILDING, cloudCover: 2, ndvi: 0.02, ndbi: 0.42, observedChangePercent: 100, changeClassification: 'HIGH_OBSERVABLE_CHANGE' },
      ],
    },
    {
      id: 'showcase-fin-5',
      showcaseType: 'FINISHED',
      name: 'Mumbai South High-Capacity Reverse Osmosis Water Purification Center',
      description: 'Community reverse osmosis plant with 10,000 LPH filtration capacity, dispensing automated water ATMs.',
      sector: ProjectSector.WATER_SANITATION,
      status: ProjectStatus.COMPLETED,
      state: 'Maharashtra',
      district: 'Mumbai City',
      constituency: 'Mumbai South',
      approvedAmount: 3000000,
      spentAmount: 2975000,
      mpId: 'mp-arvind-sawant',
      contractorId: 'cont-bengal',
      contractorName: 'Bengal Buildcon Pvt Ltd',
      latitude: 18.9388,
      longitude: 72.8354,
      startDate: weeksAgo(18),
      expectedEndDate: weeksAgo(2),
      completedAt: weeksAgo(2),
      weeks: [
        { weekNum: 1, date: weeksAgo(18), contractorPercentDone: 20, contractorSpent: 600000, contractorNote: 'Underground sump excavation and pump chamber foundations.', satImage: SATELLITE_IMG.GROUND_EXCAVATION, cloudCover: 7, ndvi: 0.10, ndbi: 0.05, observedChangePercent: 20, changeClassification: 'LOW_OBSERVABLE_CHANGE' },
        { weekNum: 9, date: weeksAgo(9), contractorPercentDone: 65, contractorSpent: 1950000, contractorNote: 'RO membrane installation, high pressure pumps, and civil shed.', satImage: SATELLITE_IMG.SUPERSTRUCTURE, cloudCover: 3, ndvi: 0.05, ndbi: 0.25, observedChangePercent: 62, changeClassification: 'MODERATE_OBSERVABLE_CHANGE' },
        { weekNum: 16, date: weeksAgo(2), contractorPercentDone: 100, contractorSpent: 2975000, contractorNote: 'Water purity testing certified, automated tap distribution operational.', satImage: SATELLITE_IMG.FINISHED_BUILDING, cloudCover: 1, ndvi: 0.01, ndbi: 0.35, observedChangePercent: 100, changeClassification: 'HIGH_OBSERVABLE_CHANGE' },
      ],
    },

    // ══════════════════════════════════════════════════════════════
    // 5 ONGOING WORKS (Active, progress verified by weekly passes)
    // ══════════════════════════════════════════════════════════════
    {
      id: 'showcase-ong-1',
      showcaseType: 'ONGOING',
      name: 'Jatni Model Anganwadi & Early Child Nutrition Centre',
      description: 'Construction of child-friendly Anganwadi center with kitchen, indoor play area, and clean sanitation unit.',
      sector: ProjectSector.EDUCATION,
      status: ProjectStatus.IN_PROGRESS,
      state: 'Odisha',
      district: 'Khordha',
      constituency: 'Bhubaneswar',
      approvedAmount: 2500000,
      spentAmount: 1250000,
      mpId: 'mp-aparajita-sarangi',
      contractorId: 'cont-utkal',
      contractorName: 'Utkal Civil Works',
      latitude: 20.1611,
      longitude: 85.7067,
      startDate: weeksAgo(8),
      expectedEndDate: new Date(now.getTime() + 8 * 7 * 24 * 60 * 60 * 1000),
      weeks: [
        { weekNum: 1, date: weeksAgo(8), contractorPercentDone: 10, contractorSpent: 250000, contractorNote: 'Layout marked, site cleared.', satImage: SATELLITE_IMG.EMPTY_LAND, cloudCover: 5, ndvi: 0.32, ndbi: -0.18, observedChangePercent: 10, changeClassification: 'LOW_OBSERVABLE_CHANGE' },
        { weekNum: 3, date: weeksAgo(6), contractorPercentDone: 25, contractorSpent: 625000, contractorNote: 'Footing concrete poured, plinth beam reinforced.', satImage: SATELLITE_IMG.GROUND_EXCAVATION, cloudCover: 2, ndvi: 0.24, ndbi: -0.05, observedChangePercent: 24, changeClassification: 'LOW_OBSERVABLE_CHANGE' },
        { weekNum: 5, date: weeksAgo(4), contractorPercentDone: 40, contractorSpent: 1000000, contractorNote: 'Columns raised to lintel height.', satImage: SATELLITE_IMG.FOUNDATION_PILLARS, cloudCover: 6, ndvi: 0.18, ndbi: 0.10, observedChangePercent: 38, changeClassification: 'MODERATE_OBSERVABLE_CHANGE' },
        { weekNum: 8, date: weeksAgo(1), contractorPercentDone: 50, contractorSpent: 1250000, contractorNote: 'Roof shuttering in progress, concrete scheduled this week.', satImage: SATELLITE_IMG.FOUNDATION_PILLARS, cloudCover: 4, ndvi: 0.15, ndbi: 0.16, observedChangePercent: 50, changeClassification: 'MODERATE_OBSERVABLE_CHANGE' },
      ],
    },
    {
      id: 'showcase-ong-2',
      showcaseType: 'ONGOING',
      name: 'Diamond Harbour Multi-Purpose Cyclone Relief Shelter',
      description: 'Engineered two-tier concrete cyclone shelter with stilt ground floor, solar communications, and emergency food storage.',
      sector: ProjectSector.PUBLIC_INFRASTRUCTURE,
      status: ProjectStatus.IN_PROGRESS,
      state: 'West Bengal',
      district: 'South 24 Parganas',
      constituency: 'Diamond Harbour',
      approvedAmount: 7500000,
      spentAmount: 3000000,
      mpId: 'mp-abhishek-banerjee',
      contractorId: 'cont-bengal',
      contractorName: 'Bengal Buildcon Pvt Ltd',
      latitude: 22.1855,
      longitude: 88.2045,
      startDate: weeksAgo(10),
      expectedEndDate: new Date(now.getTime() + 14 * 7 * 24 * 60 * 60 * 1000),
      weeks: [
        { weekNum: 1, date: weeksAgo(10), contractorPercentDone: 10, contractorSpent: 750000, contractorNote: 'Soil piling and geotechnical test piles complete.', satImage: SATELLITE_IMG.GROUND_EXCAVATION, cloudCover: 11, ndvi: 0.28, ndbi: -0.12, observedChangePercent: 10, changeClassification: 'LOW_OBSERVABLE_CHANGE' },
        { weekNum: 5, date: weeksAgo(6), contractorPercentDone: 25, contractorSpent: 1875000, contractorNote: 'Stilt floor heavy RCC columns erected.', satImage: SATELLITE_IMG.FOUNDATION_PILLARS, cloudCover: 4, ndvi: 0.20, ndbi: 0.08, observedChangePercent: 26, changeClassification: 'LOW_OBSERVABLE_CHANGE' },
        { weekNum: 9, date: weeksAgo(1), contractorPercentDone: 40, contractorSpent: 3000000, contractorNote: 'First floor slab casting complete. Exterior staircase underway.', satImage: SATELLITE_IMG.SUPERSTRUCTURE, cloudCover: 5, ndvi: 0.14, ndbi: 0.20, observedChangePercent: 41, changeClassification: 'MODERATE_OBSERVABLE_CHANGE' },
      ],
    },
    {
      id: 'showcase-ong-3',
      showcaseType: 'ONGOING',
      name: 'Hosur Industrial Corridor Vocational Training Workshop',
      description: 'Modern workshop facility for electronics and automotive maintenance training for rural youth.',
      sector: ProjectSector.EDUCATION,
      status: ProjectStatus.IN_PROGRESS,
      state: 'Tamil Nadu',
      district: 'Krishnagiri',
      constituency: 'Krishnagiri',
      approvedAmount: 4000000,
      spentAmount: 2400000,
      mpId: 'mp-chellakumar',
      contractorId: 'cont-chola',
      contractorName: 'Chola Roadways & Civil Corp',
      latitude: 12.7409,
      longitude: 77.8253,
      startDate: weeksAgo(12),
      expectedEndDate: new Date(now.getTime() + 6 * 7 * 24 * 60 * 60 * 1000),
      weeks: [
        { weekNum: 1, date: weeksAgo(12), contractorPercentDone: 15, contractorSpent: 600000, contractorNote: 'Foundation trenches and anchor bolts fixed.', satImage: SATELLITE_IMG.GROUND_EXCAVATION, cloudCover: 6, ndvi: 0.22, ndbi: -0.05, observedChangePercent: 15, changeClassification: 'LOW_OBSERVABLE_CHANGE' },
        { weekNum: 6, date: weeksAgo(6), contractorPercentDone: 40, contractorSpent: 1600000, contractorNote: 'Pre-engineered building steel columns and trusses assembled.', satImage: SATELLITE_IMG.FOUNDATION_PILLARS, cloudCover: 3, ndvi: 0.12, ndbi: 0.18, observedChangePercent: 40, changeClassification: 'MODERATE_OBSERVABLE_CHANGE' },
        { weekNum: 11, date: weeksAgo(1), contractorPercentDone: 60, contractorSpent: 2400000, contractorNote: 'Insulated roofing sheets laid, industrial flooring poured.', satImage: SATELLITE_IMG.SUPERSTRUCTURE, cloudCover: 2, ndvi: 0.08, ndbi: 0.26, observedChangePercent: 62, changeClassification: 'MODERATE_OBSERVABLE_CHANGE' },
      ],
    },
    {
      id: 'showcase-ong-4',
      showcaseType: 'ONGOING',
      name: 'Shivajinagar Urban Primary Health Sub-Centre',
      description: 'Upgradation of existing urban clinic with maternity ward, diagnostic lab, and pharmacy section.',
      sector: ProjectSector.HEALTH,
      status: ProjectStatus.IN_PROGRESS,
      state: 'Karnataka',
      district: 'Bangalore Urban',
      constituency: 'Bangalore Central',
      approvedAmount: 4800000,
      spentAmount: 1680000,
      mpId: 'mp-pc-mohan',
      contractorId: 'cont-kalinga',
      contractorName: 'Kalinga Infrastructure Ltd',
      latitude: 12.9856,
      longitude: 77.6057,
      startDate: weeksAgo(6),
      expectedEndDate: new Date(now.getTime() + 10 * 7 * 24 * 60 * 60 * 1000),
      weeks: [
        { weekNum: 1, date: weeksAgo(6), contractorPercentDone: 10, contractorSpent: 480000, contractorNote: 'Demolition of old shed and foundation footings.', satImage: SATELLITE_IMG.GROUND_EXCAVATION, cloudCover: 8, ndvi: 0.12, ndbi: 0.02, observedChangePercent: 10, changeClassification: 'LOW_OBSERVABLE_CHANGE' },
        { weekNum: 5, date: weeksAgo(1), contractorPercentDone: 35, contractorSpent: 1680000, contractorNote: 'Plinth level reached, RCC pillars to roof level cast.', satImage: SATELLITE_IMG.FOUNDATION_PILLARS, cloudCover: 5, ndvi: 0.08, ndbi: 0.15, observedChangePercent: 34, changeClassification: 'MODERATE_OBSERVABLE_CHANGE' },
      ],
    },
    {
      id: 'showcase-ong-5',
      showcaseType: 'ONGOING',
      name: 'Byculla Public Dispensary & Diagnostic Centre Modernization',
      description: 'Comprehensive renovation and vertical expansion of municipal dispensary with digital X-ray and ultrasound room.',
      sector: ProjectSector.HEALTH,
      status: ProjectStatus.IN_PROGRESS,
      state: 'Maharashtra',
      district: 'Mumbai City',
      constituency: 'Mumbai South',
      approvedAmount: 5500000,
      spentAmount: 2475000,
      mpId: 'mp-arvind-sawant',
      contractorId: 'cont-bengal',
      contractorName: 'Bengal Buildcon Pvt Ltd',
      latitude: 18.9750,
      longitude: 72.8295,
      startDate: weeksAgo(8),
      expectedEndDate: new Date(now.getTime() + 8 * 7 * 24 * 60 * 60 * 1000),
      weeks: [
        { weekNum: 1, date: weeksAgo(8), contractorPercentDone: 15, contractorSpent: 825000, contractorNote: 'Retrofitting structural columns and foundation underpinning.', satImage: SATELLITE_IMG.GROUND_EXCAVATION, cloudCover: 9, ndvi: 0.08, ndbi: 0.10, observedChangePercent: 15, changeClassification: 'LOW_OBSERVABLE_CHANGE' },
        { weekNum: 7, date: weeksAgo(1), contractorPercentDone: 45, contractorSpent: 2475000, contractorNote: 'First floor concrete extension cast, internal partitions erected.', satImage: SATELLITE_IMG.SUPERSTRUCTURE, cloudCover: 4, ndvi: 0.04, ndbi: 0.24, observedChangePercent: 44, changeClassification: 'MODERATE_OBSERVABLE_CHANGE' },
      ],
    },

    // ══════════════════════════════════════════════════════════════
    // 3 GHOST / STALLED FRAUD WORKS (Contractor claims high progress,
    // but weekly satellite imagery shows ZERO physical change!)
    // ══════════════════════════════════════════════════════════════
    {
      id: 'showcase-fraud-1',
      showcaseType: 'STALLED',
      name: 'Bhubaneswar Integrated Community Hall & Senior Citizen Center (Sector 4)',
      description: 'Construction of a community multi-purpose hall with auditorium, stage, and public restrooms.',
      sector: ProjectSector.PUBLIC_INFRASTRUCTURE,
      status: ProjectStatus.IN_PROGRESS,
      state: 'Odisha',
      district: 'Khordha',
      constituency: 'Bhubaneswar',
      approvedAmount: 4500000,
      spentAmount: 3825000,
      mpId: 'mp-aparajita-sarangi',
      contractorId: 'cont-apex',
      contractorName: 'Apex Infra Solutions',
      latitude: 20.2961,
      longitude: 85.8245,
      startDate: weeksAgo(8),
      expectedEndDate: weeksAgo(1),
      weeks: [
        {
          weekNum: 1,
          date: weeksAgo(8),
          contractorPercentDone: 20,
          contractorSpent: 900000,
          contractorNote: 'Mobilization completed. Foundation excavation 100% done.',
          satImage: SATELLITE_IMG.BARREN_SCRUB,
          cloudCover: 3,
          ndvi: 0.35,
          ndbi: -0.18,
          observedChangePercent: 0,
          changeClassification: 'NO_OBSERVABLE_CHANGE',
          anomalyNote: 'Contractor claimed 20% progress (₹9 Lakhs) but satellite shows untouched scrubland.',
        },
        {
          weekNum: 3,
          date: weeksAgo(6),
          contractorPercentDone: 45,
          contractorSpent: 2025000,
          contractorNote: 'All 18 RCC columns cast and cured. Plinth beam concrete poured.',
          satImage: SATELLITE_IMG.BARREN_SCRUB,
          cloudCover: 2,
          ndvi: 0.34,
          ndbi: -0.18,
          observedChangePercent: 0,
          changeClassification: 'NO_OBSERVABLE_CHANGE',
          anomalyNote: 'Satellite pass confirms zero foundation excavation or columns. NDBI unchanged (-0.18).',
        },
        {
          weekNum: 6,
          date: weeksAgo(3),
          contractorPercentDone: 70,
          contractorSpent: 3150000,
          contractorNote: 'Roof slab casting completed. Brickwork on external walls 80% done.',
          satImage: SATELLITE_IMG.BARREN_SCRUB,
          cloudCover: 5,
          ndvi: 0.35,
          ndbi: -0.17,
          observedChangePercent: 0,
          changeClassification: 'NO_OBSERVABLE_CHANGE',
          anomalyNote: 'CRITICAL: Contractor billed for roof slab. Ground satellite imagery proves bare mud plot.',
        },
        {
          weekNum: 8,
          date: weeksAgo(1),
          contractorPercentDone: 85,
          contractorSpent: 3825000,
          contractorNote: 'Electrical wiring and plastering in final stages. Handover scheduled next week.',
          satImage: SATELLITE_IMG.BARREN_SCRUB,
          cloudCover: 1,
          ndvi: 0.34,
          ndbi: -0.18,
          observedChangePercent: 0,
          changeClassification: 'NO_OBSERVABLE_CHANGE',
          anomalyNote: 'AI DISCREPANCY DETECTED: 85% completion claimed & ₹38.25L spent, but site is 100% untouched!',
        },
      ],
    },
    {
      id: 'showcase-fraud-2',
      showcaseType: 'STALLED',
      name: 'Diamond Harbour Coastal Drainage Bund & Concrete Culvert Bridge',
      description: 'Construction of storm water drainage culvert and concrete embankment bridge to prevent tidal flooding.',
      sector: ProjectSector.PUBLIC_INFRASTRUCTURE,
      status: ProjectStatus.IN_PROGRESS,
      state: 'West Bengal',
      district: 'South 24 Parganas',
      constituency: 'Diamond Harbour',
      approvedAmount: 4000000,
      spentAmount: 3200000,
      mpId: 'mp-abhishek-banerjee',
      contractorId: 'cont-eastern',
      contractorName: 'Eastern Marine & Civil Works',
      latitude: 22.1702,
      longitude: 88.1812,
      startDate: weeksAgo(6),
      expectedEndDate: weeksAgo(1),
      weeks: [
        {
          weekNum: 1,
          date: weeksAgo(6),
          contractorPercentDone: 25,
          contractorSpent: 1000000,
          contractorNote: 'Diversion channel excavated. Steel sheet piling driven.',
          satImage: SATELLITE_IMG.SWAMP_RIVER,
          cloudCover: 8,
          ndvi: 0.45,
          ndbi: -0.28,
          observedChangePercent: 0,
          changeClassification: 'NO_OBSERVABLE_CHANGE',
        },
        {
          weekNum: 4,
          date: weeksAgo(3),
          contractorPercentDone: 60,
          contractorSpent: 2400000,
          contractorNote: 'Culvert abutment concrete poured, wing walls completed.',
          satImage: SATELLITE_IMG.SWAMP_RIVER,
          cloudCover: 4,
          ndvi: 0.44,
          ndbi: -0.28,
          observedChangePercent: 0,
          changeClassification: 'NO_OBSERVABLE_CHANGE',
          anomalyNote: 'Satellite multispectral analysis confirms natural mangrove creek without any civil work.',
        },
        {
          weekNum: 6,
          date: weeksAgo(1),
          contractorPercentDone: 80,
          contractorSpent: 3200000,
          contractorNote: 'Deck slab cured, safety railings installed, approach road compacted.',
          satImage: SATELLITE_IMG.SWAMP_RIVER,
          cloudCover: 3,
          ndvi: 0.45,
          ndbi: -0.27,
          observedChangePercent: 0,
          changeClassification: 'NO_OBSERVABLE_CHANGE',
          anomalyNote: 'GHOST INFRASTRUCTURE: ₹32,00,000 claimed withdrawn. Water body completely undisturbed.',
        },
      ],
    },
    {
      id: 'showcase-fraud-3',
      showcaseType: 'STALLED',
      name: 'Krishnagiri Elevated Overhead Water Reservoir Tower (1 Lakh Litres)',
      description: 'Construction of a 15-metre high concrete staging water tower with pump house to supply drinking water.',
      sector: ProjectSector.WATER_SANITATION,
      status: ProjectStatus.IN_PROGRESS,
      state: 'Tamil Nadu',
      district: 'Krishnagiri',
      constituency: 'Krishnagiri',
      approvedAmount: 5000000,
      spentAmount: 3750000,
      mpId: 'mp-chellakumar',
      contractorId: 'cont-star',
      contractorName: 'Star Engineering Contracts',
      latitude: 12.5284,
      longitude: 78.2251,
      startDate: weeksAgo(8),
      expectedEndDate: weeksAgo(1),
      weeks: [
        {
          weekNum: 1,
          date: weeksAgo(8),
          contractorPercentDone: 20,
          contractorSpent: 1000000,
          contractorNote: 'Raft foundation and ring beam concrete poured.',
          satImage: SATELLITE_IMG.BARREN_SCRUB,
          cloudCover: 4,
          ndvi: 0.30,
          ndbi: -0.15,
          observedChangePercent: 0,
          changeClassification: 'NO_OBSERVABLE_CHANGE',
        },
        {
          weekNum: 5,
          date: weeksAgo(4),
          contractorPercentDone: 50,
          contractorSpent: 2500000,
          contractorNote: 'Vertical cylindrical staging raised to 10 metres height.',
          satImage: SATELLITE_IMG.BARREN_SCRUB,
          cloudCover: 2,
          ndvi: 0.29,
          ndbi: -0.15,
          observedChangePercent: 0,
          changeClassification: 'NO_OBSERVABLE_CHANGE',
          anomalyNote: 'Shadow length analysis reveals 0.0m height. Contractor claims 10m concrete tower erected.',
        },
        {
          weekNum: 8,
          date: weeksAgo(1),
          contractorPercentDone: 75,
          contractorSpent: 3750000,
          contractorNote: 'Water tank container staging and conical roof shuttering in place.',
          satImage: SATELLITE_IMG.BARREN_SCRUB,
          cloudCover: 2,
          ndvi: 0.30,
          ndbi: -0.15,
          observedChangePercent: 0,
          changeClassification: 'NO_OBSERVABLE_CHANGE',
          anomalyNote: 'PHANTOM RESERVOIR: 75% funds consumed with zero ground structure detected.',
        },
      ],
    },
  ];

  // 4. Insert or Update all 13 Showcase Projects
  const creatorUser = (await prisma.user.findFirst({ where: { email: 'officer@vojas.gov' } }))!;

  for (const p of showcaseProjects) {
    console.log(`  Writing project: ${p.name} (${p.showcaseType})...`);

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
        createdById: creatorUser.id,
      },
    });

    // Clean prior child records for this project for clean idempotency
    await prisma.satelliteObservation.deleteMany({ where: { projectId: p.id } });
    await prisma.contractorUpdate.deleteMany({ where: { projectId: p.id } });
    await prisma.anomaly.deleteMany({ where: { projectId: p.id } });

    // Seed weekly satellite observations and contractor updates
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
          thumbnailUrl: w.satImage,
          tileUrl: w.satImage,
          centerLat: p.latitude,
          centerLng: p.longitude,
          quality: 'VERIFIED_SCENE',
          ndvi: w.ndvi,
          ndbi: w.ndbi,
          bsi: 0.15,
          builtUpArea: Math.max(0, Math.round(w.ndbi * 1200 + 400)),
          constructionScore: w.observedChangePercent,
          sourceName: 'Copernicus Data Space Ecosystem (CDSE)',
          sourceUrl: `https://browser.dataspace.copernicus.eu/?zoom=17&lat=${p.latitude}&lng=${p.longitude}&time=${w.date.toISOString().slice(0, 10)}`,
        },
      });

      const contractorUser = await prisma.user.findFirst({ where: { email: 'contractor@vojas.gov' } });
      await prisma.contractorUpdate.create({
        data: {
          id: `${p.id}-cu-w${w.weekNum}`,
          contractorId: p.contractorId,
          projectId: p.id,
          updateType: 'STATUS',
          title: `Week ${w.weekNum} Work Progress Report`,
          description: w.contractorNote,
          amount: w.contractorSpent,
          status: p.showcaseType === 'STALLED' ? 'REJECTED' : 'ACCEPTED',
          submittedById: contractorUser!.id,
          submittedAt: w.date,
          reviewNote: p.showcaseType === 'STALLED' ? 'DISCREPANCY FLAGGED: Ground satellite pass does not reflect claimed physical progress.' : 'Verified against Sentinel-2 spectral indices.',
        },
      });

      if (p.showcaseType === 'STALLED' && w.anomalyNote) {
        await prisma.anomaly.create({
          data: {
            id: `${p.id}-anomaly-w${w.weekNum}`,
            project: { connect: { id: p.id } },
            title: `Week ${w.weekNum} Ghost Construction Alert`,
            category: AnomalyCategory.PROGRESS_DISCREPANCY,
            severity: AnomalySeverity.CRITICAL,
            description: w.anomalyNote,
            status: 'OPEN',
            riskScore: 95,
            createdAt: w.date,
          },
        });
      }
    }
  }

  console.log('✅ Successfully seeded 13 Curated Real Showcase Projects (5 Finished, 5 Ongoing, 3 Fraud)!');
}

main()
  .catch((e) => {
    console.error('Error seeding showcase:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
