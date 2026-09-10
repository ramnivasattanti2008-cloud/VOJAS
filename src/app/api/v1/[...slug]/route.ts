import { NextRequest, NextResponse } from 'next/server';

// Curated 5 Showcase Projects
const CURATED_PROJECTS = [
  {
    id: 'showcase-fraud-1',
    title: 'Chandrasekharpur Stormwater Drainage Canal & Culvert Reconstruction',
    source: 'SHOWCASE_CURATED',
    status: 'IN_PROGRESS',
    sector: 'URBAN_DEVELOPMENT',
    state: 'Odisha',
    district: 'Khurda',
    constituency: 'Bhubaneswar',
    sanctionedAmount: 180000000, // ₹18 Cr
    spentAmount: 135000000, // ₹13.5 Cr (75%)
    startDate: '2025-06-15T00:00:00.000Z',
    targetEndDate: '2026-08-30T00:00:00.000Z',
    contractorName: 'Pradhan Infrastructure & Earthmovers Pvt Ltd',
    mp: {
      id: 'mp-aparajita-sarangi',
      name: 'Smt Aparajita Sarangi',
      house: 'LOK_SABHA',
      party: 'BJP',
      state: 'Odisha',
      constituency: 'Bhubaneswar',
    },
    anomalies: [
      {
        id: 'anomaly-fraud-1',
        severity: 'CRITICAL',
        title: 'Severe Ghost Construction & 67% Physical Stagnation Disparity',
        description: 'Contractor claimed 75% completion (₹13.5 Cr disbursed). Sentinel-2 multi-temporal imagery indicates zero excavation or concrete works; site remains waterlogged wild creek with only 8% physical change.',
      },
    ],
    _count: { satelliteObservations: 4, contractorUpdates: 4 },
  },
  {
    id: 'showcase-fraud-2',
    title: 'Diamond Harbour Sunderbans Coastal Saline Embankment & Sluice Gate',
    source: 'SHOWCASE_CURATED',
    status: 'IN_PROGRESS',
    sector: 'WATER_RESOURCES',
    state: 'West Bengal',
    district: 'South 24 Parganas',
    constituency: 'Diamond Harbour',
    sanctionedAmount: 220000000, // ₹22 Cr
    spentAmount: 176000000, // ₹17.6 Cr (80%)
    startDate: '2025-04-10T00:00:00.000Z',
    targetEndDate: '2026-09-15T00:00:00.000Z',
    contractorName: 'Bengal Delta Coastal Works LLP',
    mp: {
      id: 'mp-abhishek-banerjee',
      name: 'Sh. Abhishek Banerjee',
      house: 'LOK_SABHA',
      party: 'AITC',
      state: 'West Bengal',
      constituency: 'Diamond Harbour',
    },
    anomalies: [
      {
        id: 'anomaly-fraud-2',
        severity: 'CRITICAL',
        title: 'Ghost Embankment Armor Disparity & 68% Stagnant Geo-bag Lining',
        description: 'Contractor claimed 80% completion of concrete armor block placement (₹17.6 Cr disbursed). Sentinel-2 observation shows continuous intertidal mud erosion without armor blocks or sluice structure (only 12% physical change).',
      },
    ],
    _count: { satelliteObservations: 4, contractorUpdates: 4 },
  },
  {
    id: 'showcase-ong-1',
    title: 'NH-516A Krishnagiri-Rayakottai Highway Four-Laning & Flyover Junction',
    source: 'SHOWCASE_CURATED',
    status: 'IN_PROGRESS',
    sector: 'ROADS_BRIDGES',
    state: 'Tamil Nadu',
    district: 'Krishnagiri',
    constituency: 'Krishnagiri',
    sanctionedAmount: 280000000, // ₹28 Cr
    spentAmount: 112000000, // ₹11.2 Cr (40%)
    startDate: '2025-07-01T00:00:00.000Z',
    targetEndDate: '2027-01-30T00:00:00.000Z',
    contractorName: 'Larsen & Toubro Transportation Infra',
    mp: {
      id: 'mp-chellakumar',
      name: 'Dr. A. Chellakumar',
      house: 'LOK_SABHA',
      party: 'INC',
      state: 'Tamil Nadu',
      constituency: 'Krishnagiri',
    },
    anomalies: [],
    _count: { satelliteObservations: 4, contractorUpdates: 4 },
  },
  {
    id: 'showcase-fin-1',
    title: 'AIIMS Bhubaneswar 150-Bed Infectious Disease Isolation Hospital Block',
    source: 'SHOWCASE_CURATED',
    status: 'COMPLETED',
    sector: 'HEALTH',
    state: 'Odisha',
    district: 'Khurda',
    constituency: 'Bhubaneswar',
    sanctionedAmount: 120000000, // ₹12 Cr
    spentAmount: 118000000, // ₹11.8 Cr (98.3%)
    startDate: '2024-03-01T00:00:00.000Z',
    targetEndDate: '2025-09-30T00:00:00.000Z',
    contractorName: 'NBCC (India) Limited',
    mp: {
      id: 'mp-aparajita-sarangi',
      name: 'Smt Aparajita Sarangi',
      house: 'LOK_SABHA',
      party: 'BJP',
      state: 'Odisha',
      constituency: 'Bhubaneswar',
    },
    anomalies: [],
    _count: { satelliteObservations: 4, contractorUpdates: 4 },
  },
  {
    id: 'showcase-fin-3',
    title: 'Rayagada Model Tribal Residential Higher Secondary School Complex',
    source: 'SHOWCASE_CURATED',
    status: 'COMPLETED',
    sector: 'EDUCATION',
    state: 'Odisha',
    district: 'Rayagada',
    constituency: 'Koraput',
    sanctionedAmount: 75000000, // ₹7.5 Cr
    spentAmount: 74200000, // ₹7.42 Cr (98.9%)
    startDate: '2024-01-15T00:00:00.000Z',
    targetEndDate: '2025-06-20T00:00:00.000Z',
    contractorName: 'Odisha State Police Housing & Welfare Corp (OPHWC)',
    mp: {
      id: 'mp-saptagiri-ulaka',
      name: 'Sh. Saptagiri Sankar Ulaka',
      house: 'LOK_SABHA',
      party: 'INC',
      state: 'Odisha',
      constituency: 'Koraput',
    },
    anomalies: [],
    _count: { satelliteObservations: 4, contractorUpdates: 4 },
  },
];

const WEEKLY_REPORTS: Record<string, any> = {
  'showcase-fraud-1': {
    projectId: 'showcase-fraud-1',
    projectName: 'Chandrasekharpur Stormwater Drainage Canal & Culvert Reconstruction',
    sector: 'URBAN_DEVELOPMENT',
    status: 'IN_PROGRESS',
    approvedAmount: 180000000,
    spentAmount: 135000000,
    utilizationRate: 75,
    state: 'Odisha',
    district: 'Khurda',
    constituency: 'Bhubaneswar',
    mp: {
      id: 'mp-aparajita-sarangi',
      name: 'Smt Aparajita Sarangi',
      house: 'LOK_SABHA',
      party: 'BJP',
      constituency: 'Bhubaneswar',
      state: 'Odisha',
    },
    contractor: { name: 'Pradhan Infrastructure & Earthmovers Pvt Ltd' },
    overallVerdict: 'CRITICAL_FRAUD_RISK',
    fraudRiskScore: 96.4,
    fraudType: 'GHOST_CONSTRUCTION',
    aiExecutiveSummary: 'CRITICAL FRAUD DETECTED: Contractor reported 75% project completion and has drawn ₹13.50 Cr of public funds. However, Sentinel-2 multi-spectral structural change detection confirms only 8% physical surface variation over a 4-week observation window. Discrepancy of 67% indicates severe Ghost Construction. Law enforcement dossier submitted to Anti-Corruption Bureau (ACB) Special Fraud Wing.',
    latestContractorClaim: {
      percentDone: 75,
      percentLeft: 25,
      amountSpent: 135000000,
      date: '2026-08-20T00:00:00.000Z',
      note: 'Week 4 Progress: Reinforced concrete box culvert walls 100% cast, precast slabs placed, canal desilting complete.',
    },
    latestSatelliteObservation: {
      date: '2026-08-21T00:00:00.000Z',
      ndbi: 0.12,
      ndvi: 0.38,
      builtUpArea: 140,
      observedChangePercent: 8,
      imageUrl: '/satellite/fraud-creek.jpg',
      cloudCover: 4.1,
    },
    weeklyTimeline: [
      {
        weekNum: 1,
        date: '2026-08-01',
        contractorClaimedPercent: 20,
        contractorSpent: 36000000,
        contractorNote: 'Week 1: Site clearance and heavy excavator desilting began.',
        satelliteObservedPercent: 3,
        discrepancyPercent: 17,
        satelliteImageUrl: '/satellite/fraud-stalled.jpg',
        cloudCover: 5.2,
        ndbi: 0.1,
        ndvi: 0.42,
        builtUpArea: 120,
        verdict: 'REVIEW_RECOMMENDED',
        anomalyNote: 'Minimal equipment footprint detected from orbit.',
      },
      {
        weekNum: 2,
        date: '2026-08-08',
        contractorClaimedPercent: 40,
        contractorSpent: 72000000,
        contractorNote: 'Week 2: Concrete foundation poured for 400m canal retaining wall.',
        satelliteObservedPercent: 5,
        discrepancyPercent: 35,
        satelliteImageUrl: '/satellite/fraud-stalled.jpg',
        cloudCover: 6.0,
        ndbi: 0.11,
        ndvi: 0.4,
        builtUpArea: 125,
        verdict: 'CRITICAL_DISCREPANCY',
        anomalyNote: 'Discrepancy 35%: No curing concrete signatures detected.',
      },
      {
        weekNum: 3,
        date: '2026-08-15',
        contractorClaimedPercent: 60,
        contractorSpent: 108000000,
        contractorNote: 'Week 3: Pre-cast culvert delivery and assembly underway.',
        satelliteObservedPercent: 6,
        discrepancyPercent: 54,
        satelliteImageUrl: '/satellite/fraud-stalled.jpg',
        cloudCover: 3.8,
        ndbi: 0.11,
        ndvi: 0.39,
        builtUpArea: 130,
        verdict: 'CRITICAL_DISCREPANCY',
        anomalyNote: 'Discrepancy 54%: No crane or pre-cast structures at site.',
      },
      {
        weekNum: 4,
        date: '2026-08-21',
        contractorClaimedPercent: 75,
        contractorSpent: 135000000,
        contractorNote: 'Week 4: Culvert walls 100% cast, precast slabs placed.',
        satelliteObservedPercent: 8,
        discrepancyPercent: 67,
        satelliteImageUrl: '/satellite/fraud-creek.jpg',
        cloudCover: 4.1,
        ndbi: 0.12,
        ndvi: 0.38,
        builtUpArea: 140,
        verdict: 'CRITICAL_DISCREPANCY',
        anomalyNote: 'Discrepancy 67%: Stagnant water channel with overgrown wild vegetation.',
      },
    ],
    recommendedOfficerActions: [
      'IMMEDIATE ACTION: File formal investigation under Case #ACB-OD-2026-BBSR-00892',
      'Forward satellite packet to Odisha State Vigilance Directorate & Bhubaneswar ACB Regional Branch',
      'Issue emergency Stop-Payment Order on Treasury Escrow Account #SBI-00921-BBSR',
      'Deploy on-ground Drone Vigilance Unit for millimeter-wave LiDAR scanning',
      'Register criminal FIR under IPC 420 (Cheating), IPC 409 (Criminal Breach of Trust) & Prevention of Corruption Act',
    ],
  },
  'showcase-fraud-2': {
    projectId: 'showcase-fraud-2',
    projectName: 'Diamond Harbour Sunderbans Coastal Saline Embankment & Sluice Gate',
    sector: 'WATER_RESOURCES',
    status: 'IN_PROGRESS',
    approvedAmount: 220000000,
    spentAmount: 176000000,
    utilizationRate: 80,
    state: 'West Bengal',
    district: 'South 24 Parganas',
    constituency: 'Diamond Harbour',
    mp: {
      id: 'mp-abhishek-banerjee',
      name: 'Sh. Abhishek Banerjee',
      house: 'LOK_SABHA',
      party: 'AITC',
      constituency: 'Diamond Harbour',
      state: 'West Bengal',
    },
    contractor: { name: 'Bengal Delta Coastal Works LLP' },
    overallVerdict: 'CRITICAL_FRAUD_RISK',
    fraudRiskScore: 94.8,
    fraudType: 'GHOST_CONSTRUCTION',
    aiExecutiveSummary: 'CRITICAL FRAUD DETECTED: Contractor submitted milestone report claiming 80% completion with ₹17.60 Cr drawn. Copernicus Sentinel-2 multispectral baseline vs latest analysis confirms only 12% physical change. Intertidal muddy embankment exhibits no geotextile armoring or reinforced concrete sluice structure. Immediate Law Enforcement referral dispatched to West Bengal Anti-Corruption Bureau under Case #ACB-WB-2026-DH-00441.',
    latestContractorClaim: {
      percentDone: 80,
      percentLeft: 20,
      amountSpent: 176000000,
      date: '2026-08-22T00:00:00.000Z',
      note: 'Week 4: 2.8 km saline dyke armored with CC blocks and automatic tidal sluice gate installed.',
    },
    latestSatelliteObservation: {
      date: '2026-08-23T00:00:00.000Z',
      ndbi: 0.08,
      ndvi: 0.22,
      builtUpArea: 180,
      observedChangePercent: 12,
      imageUrl: '/satellite/fraud-stalled.jpg',
      cloudCover: 5.4,
    },
    weeklyTimeline: [
      {
        weekNum: 1,
        date: '2026-08-02',
        contractorClaimedPercent: 25,
        contractorSpent: 55000000,
        contractorNote: 'Week 1: Heavy dredging and dyke core earth compaction.',
        satelliteObservedPercent: 4,
        discrepancyPercent: 21,
        satelliteImageUrl: '/satellite/fraud-creek.jpg',
        cloudCover: 6.2,
        ndbi: 0.05,
        ndvi: 0.25,
        builtUpArea: 150,
        verdict: 'REVIEW_RECOMMENDED',
        anomalyNote: 'Earthwork volume in orbit shows negligible elevation change.',
      },
      {
        weekNum: 2,
        date: '2026-08-09',
        contractorClaimedPercent: 45,
        contractorSpent: 99000000,
        contractorNote: 'Week 2: Geosynthetic filter layers and rip-rap stone pitching.',
        satelliteObservedPercent: 7,
        discrepancyPercent: 38,
        satelliteImageUrl: '/satellite/fraud-stalled.jpg',
        cloudCover: 4.8,
        ndbi: 0.06,
        ndvi: 0.24,
        builtUpArea: 160,
        verdict: 'CRITICAL_DISCREPANCY',
        anomalyNote: 'Discrepancy 38%: No boulder stockpiles or barge activity.',
      },
      {
        weekNum: 3,
        date: '2026-08-16',
        contractorClaimedPercent: 65,
        contractorSpent: 143000000,
        contractorNote: 'Week 3: Concrete tetrapod placement along high tidal impact zone.',
        satelliteObservedPercent: 9,
        discrepancyPercent: 56,
        satelliteImageUrl: '/satellite/fraud-stalled.jpg',
        cloudCover: 5.1,
        ndbi: 0.07,
        ndvi: 0.23,
        builtUpArea: 170,
        verdict: 'CRITICAL_DISCREPANCY',
        anomalyNote: 'Discrepancy 56%: Mud erosion ongoing without armored barrier.',
      },
      {
        weekNum: 4,
        date: '2026-08-23',
        contractorClaimedPercent: 80,
        contractorSpent: 176000000,
        contractorNote: 'Week 4: Dyke armored, tidal sluice gate fully installed.',
        satelliteObservedPercent: 12,
        discrepancyPercent: 68,
        satelliteImageUrl: '/satellite/fraud-stalled.jpg',
        cloudCover: 5.4,
        ndbi: 0.08,
        ndvi: 0.22,
        builtUpArea: 180,
        verdict: 'CRITICAL_DISCREPANCY',
        anomalyNote: 'Discrepancy 68%: Severe ghost construction; bare tidal mudflat.',
      },
    ],
    recommendedOfficerActions: [
      'IMMEDIATE ACTION: Refer case to West Bengal Anti-Corruption Branch (Case #ACB-WB-2026-DH-00441)',
      'Freeze bank guarantee and current accounts of Bengal Delta Coastal Works LLP',
      'Notify Kolkata Vigilance Commission and CBI Regional Office',
      'Deploy State Maritime Police boat patrol for physical photogrammetric inspection',
    ],
  },
  'showcase-ong-1': {
    projectId: 'showcase-ong-1',
    projectName: 'NH-516A Krishnagiri-Rayakottai Highway Four-Laning & Flyover Junction',
    sector: 'ROADS_BRIDGES',
    status: 'IN_PROGRESS',
    approvedAmount: 280000000,
    spentAmount: 112000000,
    utilizationRate: 40,
    state: 'Tamil Nadu',
    district: 'Krishnagiri',
    constituency: 'Krishnagiri',
    mp: {
      id: 'mp-chellakumar',
      name: 'Dr. A. Chellakumar',
      house: 'LOK_SABHA',
      party: 'INC',
      constituency: 'Krishnagiri',
      state: 'Tamil Nadu',
    },
    contractor: { name: 'Larsen & Toubro Transportation Infra' },
    overallVerdict: 'VERIFIED_CONSISTENT',
    fraudRiskScore: 12.2,
    fraudType: 'NONE',
    aiExecutiveSummary: 'ON-SCHEDULE & VERIFIED: Highway widening and sub-base grading progress across NH-516A correlates accurately within ±4% of Sentinel-2 road corridor reflectance profiles. Physical earthmoving matches financial milestones.',
    latestContractorClaim: {
      percentDone: 45,
      percentLeft: 55,
      amountSpent: 112000000,
      date: '2026-08-20T00:00:00.000Z',
      note: 'Week 4: Sub-base grading and aggregate spreading complete on 12 km stretch.',
    },
    latestSatelliteObservation: {
      date: '2026-08-21T00:00:00.000Z',
      ndbi: 0.35,
      ndvi: 0.28,
      builtUpArea: 4800,
      observedChangePercent: 43,
      imageUrl: '/satellite/road-after.jpg',
      cloudCover: 2.3,
    },
    weeklyTimeline: [
      {
        weekNum: 1,
        date: '2026-08-01',
        contractorClaimedPercent: 15,
        contractorSpent: 35000000,
        contractorNote: 'Week 1: Right-of-way clearing and tree transplantation.',
        satelliteObservedPercent: 14,
        discrepancyPercent: 1,
        satelliteImageUrl: '/satellite/road-before.jpg',
        cloudCover: 3.1,
        ndbi: 0.22,
        ndvi: 0.45,
        builtUpArea: 3200,
        verdict: 'VERIFIED',
      },
      {
        weekNum: 2,
        date: '2026-08-08',
        contractorClaimedPercent: 25,
        contractorSpent: 62000000,
        contractorNote: 'Week 2: Heavy earth grading and embankment widening.',
        satelliteObservedPercent: 24,
        discrepancyPercent: 1,
        satelliteImageUrl: '/satellite/road-grading.jpg',
        cloudCover: 2.8,
        ndbi: 0.28,
        ndvi: 0.38,
        builtUpArea: 3900,
        verdict: 'VERIFIED',
      },
      {
        weekNum: 3,
        date: '2026-08-15',
        contractorClaimedPercent: 35,
        contractorSpent: 88000000,
        contractorNote: 'Week 3: Dense Bituminous Macadam (DBM) base laying.',
        satelliteObservedPercent: 34,
        discrepancyPercent: 1,
        satelliteImageUrl: '/satellite/road-grading.jpg',
        cloudCover: 1.9,
        ndbi: 0.32,
        ndvi: 0.32,
        builtUpArea: 4400,
        verdict: 'VERIFIED',
      },
      {
        weekNum: 4,
        date: '2026-08-21',
        contractorClaimedPercent: 45,
        contractorSpent: 112000000,
        contractorNote: 'Week 4: Sub-base grading complete, binder course paved.',
        satelliteObservedPercent: 43,
        discrepancyPercent: 2,
        satelliteImageUrl: '/satellite/road-after.jpg',
        cloudCover: 2.3,
        ndbi: 0.35,
        ndvi: 0.28,
        builtUpArea: 4800,
        verdict: 'VERIFIED',
      },
    ],
    recommendedOfficerActions: [
      'Normal monitoring cycle — approve next milestone tranche after standard QA inspection',
    ],
  },
  'showcase-fin-1': {
    projectId: 'showcase-fin-1',
    projectName: 'AIIMS Bhubaneswar 150-Bed Infectious Disease Isolation Hospital Block',
    sector: 'HEALTH',
    status: 'COMPLETED',
    approvedAmount: 120000000,
    spentAmount: 118000000,
    utilizationRate: 98.3,
    state: 'Odisha',
    district: 'Khurda',
    constituency: 'Bhubaneswar',
    mp: {
      id: 'mp-aparajita-sarangi',
      name: 'Smt Aparajita Sarangi',
      house: 'LOK_SABHA',
      party: 'BJP',
      constituency: 'Bhubaneswar',
      state: 'Odisha',
    },
    contractor: { name: 'NBCC (India) Limited' },
    overallVerdict: 'VERIFIED_CONSISTENT',
    fraudRiskScore: 4.5,
    fraudType: 'NONE',
    aiExecutiveSummary: 'PROJECT 100% COMPLETED & PHYSICALLY VERIFIED: Multi-temporal satellite imagery from baseline foundation excavation to full superstructure and roof commissioning aligns perfectly with contractor expenditure statements. Low risk of deviation.',
    latestContractorClaim: {
      percentDone: 100,
      percentLeft: 0,
      amountSpent: 118000000,
      date: '2025-09-30T00:00:00.000Z',
      note: 'Final Handover: All 5 floors fully operational, HVAC commissioning complete.',
    },
    latestSatelliteObservation: {
      date: '2025-10-01T00:00:00.000Z',
      ndbi: 0.48,
      ndvi: 0.18,
      builtUpArea: 6500,
      observedChangePercent: 100,
      imageUrl: '/satellite/building-after.jpg',
      cloudCover: 1.2,
    },
    weeklyTimeline: [
      {
        weekNum: 1,
        date: '2024-04-10',
        contractorClaimedPercent: 20,
        contractorSpent: 24000000,
        contractorNote: 'Deep foundation and pile excavation complete.',
        satelliteObservedPercent: 19,
        discrepancyPercent: 1,
        satelliteImageUrl: '/satellite/building-excavation.jpg',
        cloudCover: 2.1,
        ndbi: 0.28,
        ndvi: 0.35,
        builtUpArea: 1800,
        verdict: 'VERIFIED',
      },
      {
        weekNum: 2,
        date: '2024-09-15',
        contractorClaimedPercent: 55,
        contractorSpent: 66000000,
        contractorNote: 'RCC framing and third floor slab casting.',
        satelliteObservedPercent: 54,
        discrepancyPercent: 1,
        satelliteImageUrl: '/satellite/building-framing.jpg',
        cloudCover: 1.5,
        ndbi: 0.36,
        ndvi: 0.28,
        builtUpArea: 3800,
        verdict: 'VERIFIED',
      },
      {
        weekNum: 3,
        date: '2025-03-20',
        contractorClaimedPercent: 85,
        contractorSpent: 102000000,
        contractorNote: 'Superstructure masonry, glass facade, and MEP rough-ins.',
        satelliteObservedPercent: 84,
        discrepancyPercent: 1,
        satelliteImageUrl: '/satellite/building-superstructure.jpg',
        cloudCover: 1.8,
        ndbi: 0.42,
        ndvi: 0.22,
        builtUpArea: 5400,
        verdict: 'VERIFIED',
      },
      {
        weekNum: 4,
        date: '2025-09-30',
        contractorClaimedPercent: 100,
        contractorSpent: 118000000,
        contractorNote: 'Final completion: Medical equipment installed and inaugurated.',
        satelliteObservedPercent: 100,
        discrepancyPercent: 0,
        satelliteImageUrl: '/satellite/building-after.jpg',
        cloudCover: 1.2,
        ndbi: 0.48,
        ndvi: 0.18,
        builtUpArea: 6500,
        verdict: 'VERIFIED',
      },
    ],
    recommendedOfficerActions: [
      'Project successfully closed and certified in National Health Infrastructure Registry',
    ],
  },
  'showcase-fin-3': {
    projectId: 'showcase-fin-3',
    projectName: 'Rayagada Model Tribal Residential Higher Secondary School Complex',
    sector: 'EDUCATION',
    status: 'COMPLETED',
    approvedAmount: 75000000,
    spentAmount: 74200000,
    utilizationRate: 98.9,
    state: 'Odisha',
    district: 'Rayagada',
    constituency: 'Koraput',
    mp: {
      id: 'mp-saptagiri-ulaka',
      name: 'Sh. Saptagiri Sankar Ulaka',
      house: 'LOK_SABHA',
      party: 'INC',
      constituency: 'Koraput',
      state: 'Odisha',
    },
    contractor: { name: 'Odisha State Police Housing & Welfare Corp (OPHWC)' },
    overallVerdict: 'VERIFIED_CONSISTENT',
    fraudRiskScore: 5.8,
    fraudType: 'NONE',
    aiExecutiveSummary: 'PROJECT COMPLETED & VERIFIED: Academic block, 200-bed student dormitories, and dining hall fully constructed in remote tribal area. Spectral indices confirm complete structural footprint matches final disbursement voucher.',
    latestContractorClaim: {
      percentDone: 100,
      percentLeft: 0,
      amountSpent: 74200000,
      date: '2025-06-20T00:00:00.000Z',
      note: 'School complex handed over to SSD Department with fire NOC.',
    },
    latestSatelliteObservation: {
      date: '2025-06-25T00:00:00.000Z',
      ndbi: 0.44,
      ndvi: 0.25,
      builtUpArea: 5200,
      observedChangePercent: 100,
      imageUrl: '/satellite/building-after.jpg',
      cloudCover: 2.4,
    },
    weeklyTimeline: [
      {
        weekNum: 1,
        date: '2024-03-10',
        contractorClaimedPercent: 25,
        contractorSpent: 18500000,
        contractorNote: 'Plinth level construction and stone masonry complete.',
        satelliteObservedPercent: 24,
        discrepancyPercent: 1,
        satelliteImageUrl: '/satellite/building-excavation.jpg',
        cloudCover: 3.0,
        ndbi: 0.25,
        ndvi: 0.42,
        builtUpArea: 1500,
        verdict: 'VERIFIED',
      },
      {
        weekNum: 2,
        date: '2024-08-20',
        contractorClaimedPercent: 60,
        contractorSpent: 44500000,
        contractorNote: 'Roof slab casting completed on both hostel wings.',
        satelliteObservedPercent: 58,
        discrepancyPercent: 2,
        satelliteImageUrl: '/satellite/building-framing.jpg',
        cloudCover: 2.2,
        ndbi: 0.34,
        ndvi: 0.32,
        builtUpArea: 3200,
        verdict: 'VERIFIED',
      },
      {
        weekNum: 3,
        date: '2025-02-15',
        contractorClaimedPercent: 88,
        contractorSpent: 65000000,
        contractorNote: 'Internal electrification, plumbing, and perimeter boundary wall.',
        satelliteObservedPercent: 86,
        discrepancyPercent: 2,
        satelliteImageUrl: '/satellite/building-superstructure.jpg',
        cloudCover: 1.8,
        ndbi: 0.4,
        ndvi: 0.28,
        builtUpArea: 4600,
        verdict: 'VERIFIED',
      },
      {
        weekNum: 4,
        date: '2025-06-20',
        contractorClaimedPercent: 100,
        contractorSpent: 74200000,
        contractorNote: 'Final completion and academic session occupancy ready.',
        satelliteObservedPercent: 100,
        discrepancyPercent: 0,
        satelliteImageUrl: '/satellite/building-after.jpg',
        cloudCover: 2.4,
        ndbi: 0.44,
        ndvi: 0.25,
        builtUpArea: 5200,
        verdict: 'VERIFIED',
      },
    ],
    recommendedOfficerActions: [
      'Disburse remaining retention money following 12-month defect liability period',
    ],
  },
};

const USERS: Record<string, any> = {
  'admin@vojas.gov': {
    id: 'user-admin',
    name: 'Admin User',
    email: 'admin@vojas.gov',
    role: 'ADMIN',
  },
  'officer@vojas.gov': {
    id: 'user-officer',
    name: 'Vikram Malhotra (Vigilance Officer)',
    email: 'officer@vojas.gov',
    role: 'OFFICER',
  },
  'mp@vojas.gov': {
    id: 'user-mp',
    name: 'Smt Aparajita Sarangi (MP)',
    email: 'mp@vojas.gov',
    role: 'MP',
  },
  'contractor@vojas.gov': {
    id: 'user-contractor',
    name: 'Rajesh Buildcon Ltd (Contractor)',
    email: 'contractor@vojas.gov',
    role: 'CONTRACTOR',
  },
  'citizen@vojas.gov': {
    id: 'user-citizen',
    name: 'Dr. Ramesh Sharma (Citizen)',
    email: 'citizen@vojas.gov',
    role: 'CITIZEN',
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join('/');

  // 1. Showcase Projects Endpoint: /api/v1/showcase/projects
  if (path === 'showcase/projects') {
    const finished = CURATED_PROJECTS.filter((p) => p.status === 'COMPLETED');
    const stalled = CURATED_PROJECTS.filter((p) => p.id.includes('fraud') || p.anomalies.length > 0);
    const ongoing = CURATED_PROJECTS.filter((p) => p.status === 'IN_PROGRESS' && !stalled.some((s) => s.id === p.id));

    return NextResponse.json({
      success: true,
      data: {
        all: CURATED_PROJECTS,
        finished,
        ongoing,
        stalled,
        counts: {
          total: CURATED_PROJECTS.length,
          finished: finished.length,
          ongoing: ongoing.length,
          stalled: stalled.length,
        },
      },
    });
  }

  // 2. Showcase Weekly Report: /api/v1/showcase/projects/:id/weekly-report
  if (slug[0] === 'showcase' && slug[1] === 'projects' && slug[3] === 'weekly-report') {
    const projectId = slug[2];
    const report = WEEKLY_REPORTS[projectId];
    if (report) {
      return NextResponse.json({ success: true, data: report });
    }
    return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
  }

  // 3. Projects Public Summary: /api/v1/projects/public/summary
  if (path === 'projects/public/summary') {
    return NextResponse.json({
      success: true,
      data: {
        totalProjects: 5,
        totalSanctioned: 875000000,
        totalSpent: 423500000,
      },
    });
  }

  // 4. Projects list: /api/v1/projects
  if (path === 'projects') {
    return NextResponse.json({
      success: true,
      data: CURATED_PROJECTS,
    });
  }

  // 5. Anomalies list: /api/v1/anomalies
  if (path === 'anomalies') {
    const anomalies = CURATED_PROJECTS.flatMap((p) =>
      p.anomalies.map((a) => ({
        ...a,
        project: { id: p.id, title: p.title, constituency: p.constituency },
      }))
    );
    return NextResponse.json({ success: true, data: anomalies });
  }

  // 6. Current user me: /api/v1/auth/me
  if (path === 'auth/me') {
    return NextResponse.json({
      success: true,
      data: USERS['admin@vojas.gov'],
    });
  }

  return NextResponse.json({ success: true, message: 'VOJAS API Route Active', path });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join('/');

  // 1. Auth Login: /api/v1/auth/login
  if (path === 'auth/login') {
    try {
      const body = await request.json();
      const email = body.email?.toLowerCase().trim();
      const user = USERS[email] || {
        id: 'user-generic',
        email: email || 'user@vojas.gov',
        name: 'Authorized User',
        role: 'CITIZEN',
      };

      const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
        JSON.stringify({ userId: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + 86400 })
      )}.mock-signature-vojas-2026`;

      return NextResponse.json({
        success: true,
        data: {
          accessToken: mockToken,
          refreshToken: `${mockToken}-refresh`,
          user,
        },
      });
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid login payload' }, { status: 400 });
    }
  }

  // 2. Auth Refresh: /api/v1/auth/refresh
  if (path === 'auth/refresh') {
    const user = USERS['admin@vojas.gov'];
    const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
      JSON.stringify({ userId: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + 86400 })
    )}.mock-signature-vojas-2026`;

    return NextResponse.json({
      success: true,
      data: {
        accessToken: mockToken,
        user,
      },
    });
  }

  // 3. Contractor Submission: /api/v1/showcase/contractor/submit
  if (path === 'showcase/contractor/submit') {
    try {
      const body = await request.json();
      const { projectId, percentDone, amountSpent, milestoneNotes } = body;
      const project = CURATED_PROJECTS.find((p) => p.id === projectId);

      if (!project) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
      }

      // If contractor claims high progress on stalled project, detect critical discrepancy
      const isFraud = projectId.includes('fraud');
      const observedPercent = isFraud ? 8 : Math.min(100, Math.max(20, percentDone - 2));
      const discrepancy = Math.max(0, percentDone - observedPercent);
      const isCritical = discrepancy >= 25;

      return NextResponse.json({
        success: true,
        data: {
          projectId,
          reportedPercent: percentDone,
          satelliteObservedPercent: observedPercent,
          discrepancyPercent: discrepancy,
          verdict: isCritical ? 'CRITICAL_DISCREPANCY' : 'VERIFIED',
          warningFlag: isCritical
            ? 'DISCREPANCY ALERT: AI cross-verification against Sentinel-2 spectral indices flagged a discrepancy exceeding tolerance. Law enforcement dossier updated.'
            : 'Satellite cross-corroboration verified within tolerance.',
          referralCaseNumber: isFraud
            ? projectId === 'showcase-fraud-1'
              ? '#ACB-OD-2026-BBSR-00892'
              : '#ACB-WB-2026-DH-00441'
            : null,
          lawEnforcementAgency: isFraud
            ? 'State Vigilance Directorate & Anti-Corruption Bureau Special Fraud Unit'
            : null,
          submissionTimestamp: new Date().toISOString(),
          notesRecorded: milestoneNotes,
        },
      });
    } catch {
      return NextResponse.json({ success: false, error: 'Failed to process submission' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, message: 'POST endpoint received', path });
}
