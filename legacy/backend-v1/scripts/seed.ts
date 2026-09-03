import { prisma, disconnectDatabase } from "../src/config/database.js";
import { userService } from "../src/services/userService.js";
import { seedRules } from "../src/services/anomalyService.js";
import { aiService } from "../src/services/aiService.js";
import { riskService } from "../src/services/riskService.js";
import { logger } from "../src/utils/logger.js";
import type { ReportCategory, ReportSeverity, ReportStatus, ExpenditureCategory, PaymentStatus } from "@prisma/client";

// Demo password: meets policy (10+ chars, mixed case, digit, no special req)
// In Docker/production this is overridden by the DEMO_PASSWORD env var
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "VojasDemo2026";

const DEMO_USERS = [
  {
    name: "Anitha Krishnan",
    email: "admin@vojas.gov",
    password: DEMO_PASSWORD,
    role: "ADMIN" as const,
  },
  {
    name: "Ravi Shankar",
    email: "officer@vojas.gov",
    password: DEMO_PASSWORD,
    role: "OFFICER" as const,
  },
  {
    name: "Priya Menon",
    email: "analyst@vojas.gov",
    password: DEMO_PASSWORD,
    role: "ANALYST" as const,
  },
  {
    name: "Demo Reviewer",
    email: "reviewer@vojas.gov",
    password: DEMO_PASSWORD,
    role: "REVIEWER" as const,
  },
];

// Realistic citizen reports
const DEMO_REPORTS = [
  {
    title: "Road quality deteriorating within 3 months of completion",
    description: "The road constructed near Vellanad junction has developed multiple potholes and cracks within just 3 months of completion. The surface layer appears to be substandard and not as per the approved specification. Residents have been complaining about vehicle damage and safety hazards, especially during monsoon season.",
    category: "QUALITY" as ReportCategory,
    severity: "HIGH" as ReportSeverity,
    status: "UNDER_REVIEW" as ReportStatus,
    reporterName: "Rajesh Kumar",
    reporterEmail: "rajesh.kumar@email.com",
    reporterPhone: "+91 98765 43210",
    isAnonymous: false,
    locationDesc: "Vellanad Junction, NH-66 approach road, Thiruvananthapuram district, Kerala",
    projectId: undefined as string | undefined,
  },
  {
    title: "Project delayed by 14 months with no explanation",
    description: "The anganwadi renovation in Ward 7 was supposed to be completed by May 2025. It is now 14 months overdue and still not complete. Children have been without proper school facilities. We have written to the district office twice but received no response.",
    category: "DELAY" as ReportCategory,
    severity: "MEDIUM" as ReportSeverity,
    status: "ACKNOWLEDGED" as ReportStatus,
    reporterName: "Lakshmi Devi",
    reporterEmail: "lakshmi.devi@email.com",
    isAnonymous: false,
    locationDesc: "Ward 7, Devanahalli Gram Panchayat, Bangalore Rural, Karnataka",
    projectId: undefined as string | undefined,
  },
  {
    title: "Contractor using substandard cement bags",
    description: "I have observed that the contractor for the drainage work in Ward 12 is using cement bags with a local brand that is not ISI certified. The bags are being stored in the open without proper protection from moisture. The ongoing RCC work appears to have a very low cement ratio.",
    category: "QUALITY" as ReportCategory,
    severity: "CRITICAL" as ReportSeverity,
    status: "SUBMITTED" as ReportStatus,
    reporterName: "Anonymous",
    reporterEmail: null,
    isAnonymous: true,
    locationDesc: "Ward 12 low-lying area, Bankipur, Patna, Bihar",
    projectId: undefined as string | undefined,
  },
  {
    title: "Budget discrepancy — approved vs actual spent",
    description: "The water tank project shows ₹31.8L spent but the completed work appears to be worth no more than ₹20L. The contract amount appears to have been inflated. I have attached photographs showing the scale of work completed.",
    category: "FINANCIAL" as ReportCategory,
    severity: "HIGH" as ReportSeverity,
    status: "UNDER_REVIEW" as ReportStatus,
    reporterName: "Vijay Singh",
    reporterEmail: "vijay.singh@email.com",
    reporterPhone: "+91 87654 32109",
    isAnonymous: false,
    locationDesc: "Block B, Madhur Gram Panchayat, Varanasi, Uttar Pradesh",
    projectId: undefined as string | undefined,
  },
  {
    title: "Solar panels not functional for 6 weeks",
    description: "Of the 45 solar street lights installed on Main Market Road, at least 18 are not working. The project was inaugurated with great fanfare but within 2 months, most panels have stopped working. No maintenance team has visited despite repeated complaints to the contractor.",
    category: "OTHER" as ReportCategory,
    severity: "MEDIUM" as ReportSeverity,
    status: "ACKNOWLEDGED" as ReportStatus,
    reporterName: "Mohammed Ismail",
    reporterEmail: "mohd.ismail@email.com",
    isAnonymous: false,
    locationDesc: "Main Market Road, Block HQ, Ramtek constituency, Nagpur, Maharashtra",
    projectId: undefined as string | undefined,
  },
  {
    title: "Duplicate project claim in neighbouring village",
    description: "A similar pond desilting project was sanctioned for our village last year. Now another project with the same description has been approved for the neighbouring village (within 3km). This appears to be a duplicate claim to inflate project costs.",
    category: "DOCUMENTATION" as ReportCategory,
    severity: "HIGH" as ReportSeverity,
    status: "SUBMITTED" as ReportStatus,
    reporterName: "Suresh Pawar",
    reporterEmail: "suresh.pawar1980@email.com",
    isAnonymous: false,
    locationDesc: "Chandrapur village, Yavatmal district, Maharashtra",
    projectId: undefined as string | undefined,
  },
  {
    title: "Medical equipment delivered but not installed",
    description: "The PHC received delivery of equipment worth approximately ₹8L three months ago. The equipment is still lying in boxes, uninstalled and unused. No technician has been appointed to install the equipment. Patients continue to travel 40km to the district hospital.",
    category: "DELAY" as ReportCategory,
    severity: "HIGH" as ReportSeverity,
    status: "RESOLVED" as ReportStatus,
    reporterName: "Dr. Anita Rao",
    reporterEmail: "anita.rao@phc.gov.in",
    isAnonymous: false,
    locationDesc: "Primary Health Centre, Koraput, Odisha",
    resolution: "Equipment installation completed by MedEquip Solutions on 15-Aug-2026. Staff training scheduled for next week.",
    projectId: undefined as string | undefined,
  },
  {
    title: "Unauthorised construction within project site",
    description: "During the construction of the solid waste management centre, I noticed that a private shed has been built within the project boundary without any sanction. Materials belonging to a private individual are being stored on the MPLAD project site. This appears to be encroachment of government land.",
    category: "OTHER" as ReportCategory,
    severity: "LOW" as ReportSeverity,
    status: "SUBMITTED" as ReportStatus,
    reporterName: null,
    reporterEmail: null,
    isAnonymous: true,
    locationDesc: "Near Panchayat Office, Kinathukadavu, Coimbatore, Tamil Nadu",
    projectId: undefined as string | undefined,
  },
];
const DEMO_PROJECTS = [
  {
    name: "Rural Road Construction — Vellanad GP",
    description: "Construction of 2.5 km BT road connecting Vellanad to NH-66 via Keezhattingal village, including a minor bridge over Kalleli river.",
    status: "IN_PROGRESS" as const,
    sector: "TRANSPORT" as const,
    district: "Thiruvananthapuram",
    constituency: "Vellanad",
    state: "Kerala",
    approvedAmount: 48_00_000,  // ₹48L
    spentAmount: 22_50_000,
    contractor: "Highway Tech Constructions Pvt Ltd",
    startDate: new Date("2025-09-15"),
    expectedEndDate: new Date("2026-06-30"),
    latitude: 8.5241,
    longitude: 76.9366,
  },
  {
    name: "Anganwadi Renovation Programme — Ward 7",
    description: "Comprehensive renovation of 3 anganwadi centres in Ward 7 including new flooring, painting, toilet construction, and procurement of teaching aids.",
    status: "COMPLETED" as const,
    sector: "EDUCATION" as const,
    district: "Bangalore Rural",
    constituency: "Devanahalli",
    state: "Karnataka",
    approvedAmount: 15_00_000,  // ₹15L
    spentAmount: 14_72_500,
    contractor: "Shree Vinayaka Infrastructure",
    startDate: new Date("2025-01-10"),
    expectedEndDate: new Date("2025-05-31"),
    completedAt: new Date("2025-05-28"),
    latitude: 13.2516,
    longitude: 77.7081,
  },
  {
    name: "Community Water Tank — Block B",
    description: "Construction of 50,000 litre overhead water tank with filtration system serving 120 households in Block B of Madhur Gram Panchayat.",
    status: "VERIFIED" as const,
    sector: "WATER_SANITATION" as const,
    district: "Varanasi",
    constituency: "Pindra",
    state: "Uttar Pradesh",
    approvedAmount: 32_00_000,  // ₹32L
    spentAmount: 31_80_000,
    contractor: "AquaBuild Engineering",
    startDate: new Date("2024-11-01"),
    expectedEndDate: new Date("2025-04-30"),
    completedAt: new Date("2025-05-02"),
    latitude: 25.3176,
    longitude: 82.9739,
  },
  {
    name: "Solar Street Lighting — Main Market Road",
    description: "Installation of 45 solar LED street lights along 3 km of Main Market Road and adjacent lanes in block headquarters town.",
    status: "APPROVED" as const,
    sector: "ENERGY" as const,
    district: "Nagpur",
    constituency: "Ramtek",
    state: "Maharashtra",
    approvedAmount: 22_50_000,  // ₹22.5L
    spentAmount: 0,
    contractor: null,
    startDate: null,
    expectedEndDate: null,
    latitude: 21.1458,
    longitude: 79.0882,
  },
  {
    name: "PHC Equipment Upgrade — Primary Health Centre",
    description: "Procurement and installation of medical equipment for PHC including oximeters, ICU beds, generator set, and pharmacy shelving units.",
    status: "IN_PROGRESS" as const,
    sector: "HEALTH" as const,
    district: "Koraput",
    constituency: "Koraput",
    state: "Odisha",
    approvedAmount: 28_00_000,  // ₹28L
    spentAmount: 14_00_000,
    contractor: "MedEquip Solutions",
    startDate: new Date("2025-07-01"),
    expectedEndDate: new Date("2026-01-31"),
    latitude: 18.8120,
    longitude: 82.7100,
  },
  {
    name: "Village Pond Desilting — Chandrapur Tank",
    description: "Desilting and restoration of Chandrapur village pond with capacity enhancement, bund strengthening, and inlet/outlet repair.",
    status: "COMPLETED" as const,
    sector: "AGRICULTURE" as const,
    district: "Yavatmal",
    constituency: "Chandrapur (Maharashtra)",
    state: "Maharashtra",
    approvedAmount: 8_50_000,  // ₹8.5L
    spentAmount: 8_10_000,
    contractor: "Rural Water Works",
    startDate: new Date("2024-10-15"),
    expectedEndDate: new Date("2025-01-31"),
    completedAt: new Date("2025-01-25"),
    latitude: 20.3888,
    longitude: 78.1304,
  },
  {
    name: "Flood Relief Drainage Work — Ward 12",
    description: "Construction of 600m underground drainage line with RCC chambers to address recurring waterlogging in Ward 12 low-lying area.",
    status: "IN_PROGRESS" as const,
    sector: "PUBLIC_INFRASTRUCTURE" as const,
    district: "Patna",
    constituency: "Bankipur",
    state: "Bihar",
    approvedAmount: 65_00_000,  // ₹65L
    spentAmount: 18_00_000,
    contractor: "Bihar Infrastructure Ltd",
    startDate: new Date("2025-06-20"),
    expectedEndDate: new Date("2026-03-31"),
    latitude: 25.5941,
    longitude: 85.1376,
  },
  {
    name: "Solid Waste Management Centre",
    description: "Setting up of a community-level solid waste segregation and composting centre with dry wet segregation unit and organic compost pit.",
    status: "PROPOSED" as const,
    sector: "ENVIRONMENT" as const,
    district: "Coimbatore",
    constituency: "Kinathukadavu",
    state: "Tamil Nadu",
    approvedAmount: 18_00_000,  // ₹18L
    spentAmount: 0,
    contractor: null,
    startDate: null,
    expectedEndDate: null,
    latitude: 11.0168,
    longitude: 76.9558,
  },
];

// Realistic expenditure entries per project
type DemoExpenditure = {
  projectIndex: number;   // index into DEMO_PROJECTS
  amount: number;
  category: ExpenditureCategory;
  description: string;
  vendor?: string;
  invoiceNo?: string;
  paidOn?: Date;
  status: PaymentStatus;
  notes?: string;
};

const DEMO_EXPENDITURES: DemoExpenditure[] = [
  // Project 0: Rural Road Construction — Vellanad (₹48L approved, ₹22.5L spent)
  { projectIndex: 0, amount: 4_50_000, category: "MATERIAL",     description: "Granular sub-base material supply (Grade A)", vendor: "StoneTech Aggregates",  invoiceNo: "INV-2025-0341", paidOn: new Date("2025-10-12"), status: "PAID", notes: "Delivered to site, quality verified" },
  { projectIndex: 0, amount: 6_00_000, category: "MATERIAL",     description: "BT mix (Bituminous Macadam) — 280 MT",       vendor: "Kerala Bitumen Corp",  invoiceNo: "INV-2025-0398", paidOn: new Date("2025-12-08"), status: "PAID" },
  { projectIndex: 0, amount: 8_00_000, category: "LABOR",        description: "Site labour — earthwork & sub-base laying",   vendor: "Vellanad Workers Co-op", invoiceNo: "BILL-2025-1122", paidOn: new Date("2025-11-25"), status: "PAID" },
  { projectIndex: 0, amount: 2_50_000, category: "EQUIPMENT",    description: "JCB & road roller hire (2 months)",          vendor: "Heavy Equipment Rentals", invoiceNo: "HIRE-25-441", paidOn: new Date("2025-12-20"), status: "PAID" },
  { projectIndex: 0, amount: 1_50_000, category: "CONSULTANCY",  description: "Site engineer supervision charges (Q3)",     vendor: "GeoConsult Engineering", invoiceNo: "CONS-25-77", paidOn: new Date("2026-01-15"), status: "PAID" },
  { projectIndex: 0, amount: 3_00_000, category: "MATERIAL",     description: "BT wearing course material — pending delivery", vendor: "Kerala Bitumen Corp", status: "AUTHORIZED", notes: "PO approved, delivery expected mid-Sep 2026" },

  // Project 1: Anganwadi Renovation (₹15L approved, ₹14.72L spent) — completed
  { projectIndex: 1, amount: 4_80_000, category: "MATERIAL",     description: "Cement, tiles, paint, plumbing fixtures",   vendor: "Shree Vinayaka Infrastructure", invoiceNo: "INV-W7-001", paidOn: new Date("2025-02-05"), status: "PAID" },
  { projectIndex: 1, amount: 5_50_000, category: "LABOR",        description: "Mason + helper wages across 3 centres",    vendor: "Shree Vinayaka Infrastructure", invoiceNo: "INV-W7-002", paidOn: new Date("2025-04-10"), status: "PAID" },
  { projectIndex: 1, amount: 2_40_000, category: "EQUIPMENT",    description: "Mixer, scaffolding, tools rental",         vendor: "BuildPro Equipment",      invoiceNo: "EQ-25-189", paidOn: new Date("2025-03-22"), status: "PAID" },
  { projectIndex: 1, amount: 1_50_000, category: "ADMINISTRATIVE", description: "Documentation, signage, inauguration",   vendor: "—",                       invoiceNo: "ADMIN-25-13", paidOn: new Date("2025-05-25"), status: "PAID" },
  { projectIndex: 1, amount: 52_500,   category: "CONTINGENCY",  description: "Additional toilet door replacement",       vendor: "Shree Vinayaka Infrastructure", paidOn: new Date("2025-05-15"), status: "PAID" },

  // Project 2: Community Water Tank (₹32L approved, ₹31.8L spent) — verified
  { projectIndex: 2, amount: 12_00_000, category: "MATERIAL",     description: "RCC tank construction — steel & cement",  vendor: "AquaBuild Engineering",  invoiceNo: "AB-2024-501", paidOn: new Date("2024-12-15"), status: "PAID" },
  { projectIndex: 2, amount: 9_50_000,  category: "LABOR",        description: "Skilled + unskilled labour (4 months)",   vendor: "AquaBuild Engineering",  invoiceNo: "AB-2025-021", paidOn: new Date("2025-02-28"), status: "PAID" },
  { projectIndex: 2, amount: 6_30_000,  category: "EQUIPMENT",    description: "Pump set, filtration unit, piping",        vendor: "HydroFlow Systems",      invoiceNo: "HF-2025-08", paidOn: new Date("2025-03-25"), status: "PAID" },
  { projectIndex: 2, amount: 2_50_000,  category: "CONSULTANCY",  description: "Structural design + site supervision",    vendor: "AquaBuild Engineering",  invoiceNo: "AB-2024-110", paidOn: new Date("2025-04-15"), status: "PAID" },
  { projectIndex: 2, amount: 1_50_000,  category: "ADMINISTRATIVE", description: "Water testing + commission certification", vendor: "State Testing Lab",   invoiceNo: "STL-2025-44", paidOn: new Date("2025-05-02"), status: "PAID" },

  // Project 3: Solar Street Lighting (₹22.5L approved, ₹0 spent) — approved, not started
  { projectIndex: 3, amount: 1_20_000, category: "CONSULTANCY",  description: "Site survey + DPR preparation",           vendor: "SunRise Solar Consultants", invoiceNo: "SS-2025-91", paidOn: new Date("2026-02-20"), status: "PAID" },
  { projectIndex: 3, amount: 18_00_000, category: "EQUIPMENT",   description: "45 solar LED street lights + poles",      vendor: "SunRise Solar Consultants", status: "AUTHORIZED", notes: "Order placed, delivery 30 days" },

  // Project 4: PHC Equipment (₹28L approved, ₹14L spent) — in progress
  { projectIndex: 4, amount: 8_00_000, category: "EQUIPMENT",    description: "Oximeters, ICU beds, pharmacy shelving", vendor: "MedEquip Solutions",     invoiceNo: "ME-2025-789", paidOn: new Date("2025-08-10"), status: "PAID" },
  { projectIndex: 4, amount: 4_00_000, category: "EQUIPMENT",    description: "Generator set (62.5 KVA)",               vendor: "PowerGen India",         invoiceNo: "PG-2025-441", paidOn: new Date("2025-09-15"), status: "PAID" },
  { projectIndex: 4, amount: 2_00_000, category: "ADMINISTRATIVE", description: "Equipment installation, calibration",  vendor: "MedEquip Solutions",     invoiceNo: "ME-2025-810", paidOn: new Date("2025-10-20"), status: "PAID" },

  // Project 5: Village Pond Desilting (₹8.5L approved, ₹8.1L spent) — completed
  { projectIndex: 5, amount: 3_60_000, category: "EQUIPMENT",    description: "JCB + desilting pump hire",               vendor: "Rural Water Works",      invoiceNo: "RW-2024-12", paidOn: new Date("2024-11-10"), status: "PAID" },
  { projectIndex: 5, amount: 2_80_000, category: "LABOR",        description: "Local labour for bund strengthening",    vendor: "Chandrapur Labour Group", invoiceNo: "CLG-2024-04", paidOn: new Date("2024-12-20"), status: "PAID" },
  { projectIndex: 5, amount: 1_70_000, category: "MATERIAL",     description: "Cement, sand, boulder for inlet/outlet", vendor: "Rural Water Works",      invoiceNo: "RW-2025-01", paidOn: new Date("2025-01-12"), status: "PAID" },

  // Project 6: Flood Relief Drainage (₹65L approved, ₹18L spent) — in progress
  { projectIndex: 6, amount: 7_50_000, category: "MATERIAL",     description: "RCC pipes (600mm dia, 200m)",             vendor: "Bihar Infrastructure Ltd", invoiceNo: "BIL-2025-201", paidOn: new Date("2025-07-25"), status: "PAID" },
  { projectIndex: 6, amount: 6_00_000, category: "LABOR",        description: "Trench excavation + pipe laying crew",     vendor: "Bihar Infrastructure Ltd", invoiceNo: "BIL-2025-220", paidOn: new Date("2025-09-30"), status: "PAID" },
  { projectIndex: 6, amount: 4_50_000, category: "MATERIAL",     description: "RCC chambers + manhole covers",           vendor: "Bihar Infrastructure Ltd", invoiceNo: "BIL-2025-241", paidOn: new Date("2025-11-12"), status: "PAID" },
  { projectIndex: 6, amount: 12_00_000, category: "MATERIAL",    description: "Additional drainage line — pending tender", vendor: "TBD", status: "PENDING", notes: "Tender floated, bids under evaluation" },
];

async function main() {
  // ── Seed Users (upsert — promotes legacy VIEWER accounts to correct roles) ──
  logger.info("Ensuring demo users...");

  const createdUsers: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email.toLowerCase() },
    });
    if (existing) {
      createdUsers[u.role] = existing.id;
      if (existing.role !== u.role) {
        await prisma.user.update({ where: { id: existing.id }, data: { role: u.role, name: u.name } });
        logger.info(`↺ Updated ${u.email}: ${existing.role} → ${u.role}`);
      } else {
        logger.info(`↺ ${u.email} already correct (${u.role})`);
      }
    } else {
      const user = await userService.create(u);
      createdUsers[u.role] = user.id;
      logger.info(`✓ Created: ${u.email} (${u.role})`);
    }
  }

  // ── Seed Projects ────────────────────────────────────────────────────────
  logger.info("\nSeeding demo MPLAD projects...");

  for (const p of DEMO_PROJECTS) {
    const existing = await prisma.project.findFirst({
      where: { name: p.name, district: p.district },
    });
    if (existing) {
      logger.info(`✓ Project exists: ${p.name}`);
      continue;
    }

    await prisma.project.create({
      data: {
        ...p,
        createdById: createdUsers["OFFICER"] ?? null,
      },
    });
    logger.info(`✓ Created: ${p.name} [${p.status}]`);
  }

  // ── Seed Expenditures ──────────────────────────────────────────────────────
  logger.info("\nSeeding expenditures...");

  const projectsForExp = await prisma.project.findMany({ select: { id: true } });
  for (const exp of DEMO_EXPENDITURES) {
    const projectId = projectsForExp[exp.projectIndex]?.id;
    if (!projectId) { logger.warn(`Skipping expenditure: project ${exp.projectIndex} not found`); continue; }

    const existing = await prisma.expenditure.findFirst({
      where: { projectId, amount: exp.amount, description: exp.description },
    });
    if (existing) {
      logger.info(`✓ Expenditure exists: ${exp.description.slice(0, 50)}...`);
      continue;
    }

    await prisma.expenditure.create({
      data: {
        projectId,
        amount: exp.amount,
        category: exp.category,
        description: exp.description,
        vendor: exp.vendor ?? null,
        invoiceNo: exp.invoiceNo ?? null,
        paidOn: exp.paidOn ?? null,
        status: exp.status,
        notes: exp.notes ?? null,
        createdById: createdUsers["OFFICER"] ?? null,
      },
    });
    logger.info(`✓ Created: ${exp.description.slice(0, 50)}... [${exp.status}]`);
  }

  // ── Seed Reports ──────────────────────────────────────────────────────────
  logger.info("\nSeeding citizen reports...");

  for (const r of DEMO_REPORTS) {
    const existing = await prisma.report.findFirst({
      where: { title: r.title },
    });
    if (existing) {
      logger.info(`✓ Report exists: "${r.title.slice(0, 60)}..."`);
      continue;
    }

    // Try to link to a project by state
    let projectId: string | undefined;
    if (r.locationDesc.includes("Thiruvananthapuram") || r.locationDesc.includes("Kerala")) {
      const proj = await prisma.project.findFirst({ where: { district: "Thiruvananthapuram" } });
      projectId = proj?.id;
    } else if (r.locationDesc.includes("Bangalore") || r.locationDesc.includes("Karnataka")) {
      const proj = await prisma.project.findFirst({ where: { district: "Bangalore Rural" } });
      projectId = proj?.id;
    } else if (r.locationDesc.includes("Patna") || r.locationDesc.includes("Bihar")) {
      const proj = await prisma.project.findFirst({ where: { district: "Patna" } });
      projectId = proj?.id;
    } else if (r.locationDesc.includes("Varanasi") || r.locationDesc.includes("Uttar Pradesh")) {
      const proj = await prisma.project.findFirst({ where: { district: "Varanasi" } });
      projectId = proj?.id;
    } else if (r.locationDesc.includes("Nagpur") || r.locationDesc.includes("Maharashtra")) {
      const proj = await prisma.project.findFirst({ where: { district: "Nagpur" } });
      projectId = proj?.id;
    } else if (r.locationDesc.includes("Koraput") || r.locationDesc.includes("Odisha")) {
      const proj = await prisma.project.findFirst({ where: { district: "Koraput" } });
      projectId = proj?.id;
    } else if (r.locationDesc.includes("Yavatmal")) {
      const proj = await prisma.project.findFirst({ where: { district: "Yavatmal" } });
      projectId = proj?.id;
    }

    await prisma.report.create({
      data: {
        title: r.title,
        description: r.description,
        category: r.category,
        severity: r.severity,
        status: r.status,
        reporterName: r.reporterName,
        reporterEmail: r.reporterEmail,
        reporterPhone: r.reporterPhone,
        isAnonymous: r.isAnonymous,
        locationDesc: r.locationDesc,
        projectId,
        assignedToId: ["UNDER_REVIEW", "RESOLVED"].includes(r.status)
          ? (createdUsers["OFFICER"] ?? null)
          : null,
        resolution: (r as any).resolution ?? null,
        resolvedAt: r.status === "RESOLVED" ? new Date() : null,
        source: "WEB",
      },
    });
    logger.info(`✓ Created: "${r.title.slice(0, 60)}..." [${r.status}]`);
  }

  // ── Seed Anomalies ───────────────────────────────────────────────────────
  logger.info("\nSeeding anomalies...");

  // Build a project-id map by name
  const allProjects = await prisma.project.findMany({ select: { id: true, name: true, district: true } });
  const projectByName: Record<string, string> = {};
  for (const p of allProjects) projectByName[p.name] = p.id;

  // Only run if there are no anomalies yet
  const existingAnomalies = await prisma.anomaly.count();
  if (existingAnomalies === 0) {
    await seedAnomalies(projectByName);
  } else {
    logger.info(`✓ Anomalies already exist (${existingAnomalies} found) — skipping`);
  }

  // ── Seed AI explanations on all anomalies (for demo-ready verdict panels) ─
  logger.info("\nPre-generating AI explanations for anomalies...");
  const allAnomalies = await prisma.anomaly.findMany({
    include: { project: { select: { name: true } } },
  });
  for (const a of allAnomalies) {
    if (a.aiExplanation) continue; // already explained
    const explanation = aiService.explainAnomaly({
      title: a.title,
      description: a.description,
      category: a.category,
      severity: a.severity,
      riskScore: a.riskScore,
      ruleCode: a.ruleCode ?? undefined,
      evidence: a.evidence ?? undefined,
      projectName: a.project?.name,
    });
    await prisma.anomaly.update({
      where: { id: a.id },
      data: {
        aiExplanation: JSON.stringify(explanation),
        aiConfidence: explanation.confidence,
      },
    });
  }
  logger.info(`✓ ${allAnomalies.length} anomalies now have AI explanations`);

  // ── Seed AI analysis on all reports (for demo-ready report pages) ─────────
  logger.info("\nPre-generating AI analysis for reports...");
  const allReports = await prisma.report.findMany({ select: { id: true, title: true, description: true } });
  let analyzedCount = 0;
  for (const r of allReports) {
    if (!r.description) continue;
    const analysis = aiService.analyzeReport(r.title, r.description);
    await prisma.report.update({
      where: { id: r.id },
      data: {
        aiAnalysis: JSON.stringify(analysis),
        aiAnalyzedAt: new Date(),
      },
    });
    analyzedCount++;
  }
  logger.info(`✓ ${analyzedCount} reports now have AI analysis`);

  // ── Pre-calculate risk scores (for demo-ready Risk dashboard) ─────────────
  logger.info("\nPre-calculating risk scores for all projects...");
  try {
    const riskResult = await riskService.recalculateAll();
    logger.info(`✓ Risk scores calculated for ${riskResult.length} projects`);
  } catch (err) {
    logger.warn(`Risk recalc failed (non-fatal): ${(err as Error).message}`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  logger.info("\n✅ Seed complete.");
  logger.info("\nDemo accounts:");
  for (const u of DEMO_USERS) {
    logger.info(`  ${(u.role as string).padEnd(10)} → ${u.email}  /  ${DEMO_PASSWORD}`);
  }
  logger.info(`\nDemo projects: ${DEMO_PROJECTS.length} MPLAD projects across 5 states`);
  logger.info(`Demo reports: ${DEMO_REPORTS.length} citizen reports across various statuses`);
  logger.info(`Demo anomalies: rule engine seeded with 6 detection rules`);
}

async function seedAnomalies(createdProjects: { [key: string]: string }) {
  // Seed detection rules first
  await seedRules();

  const DEMO_ANOMALIES = [
    {
      title: "Budget overrun: Pothole Repairs — Vellanad Panchayat",
      description: "Spent amount ₹32,50,000 exceeds sanctioned budget ₹28,00,000 by ₹4,50,000 (16%).",
      category: "BUDGET_OVERRUN" as const,
      severity: "CRITICAL" as const,
      riskScore: 76,
      ruleCode: "BUDGET_OVERRUN",
      evidence: JSON.stringify({
        approvedAmount: 28_00_000,
        spentAmount: 32_50_000,
        overrunAmount: 4_50_000,
        overrunPercent: 16,
      }),
    },
    {
      title: "Potential duplicate: Solar Street Lighting — Main Market Road",
      description: "Project 'Solar Street Lighting — Main Market Road' in Nagpur appears similar to an existing project 'Solar LED Installation — Ramtek Market' in the same district registered 45 days apart.",
      category: "DUPLICATE" as const,
      severity: "HIGH" as const,
      riskScore: 75,
      ruleCode: "DUPLICATE_PROJECT",
      evidence: JSON.stringify({
        duplicateDistrict: "Nagpur",
        daysBetweenCreation: 45,
        similarity: "High (same sector, similar name pattern)",
      }),
    },
    {
      title: "Cost outlier: Advanced Computing Lab",
      description: "Sanctioned amount ₹1,20,00,000 is more than 3× the sector median (₹40,00,000) for EDUCATION in Karnataka.",
      category: "COST_OUTLIER" as const,
      severity: "MEDIUM" as const,
      riskScore: 65,
      ruleCode: "COST_OUTLIER",
      evidence: JSON.stringify({
        sectorMedian: 40_00_000,
        sectorCount: 5,
        deviationRatio: 3.0,
      }),
    },
    {
      title: "Stalled project: PHC Equipment Upgrade",
      description: "Project in IN_PROGRESS status for approximately 4.2 years without reaching COMPLETED or VERIFIED.",
      category: "STALLED" as const,
      severity: "MEDIUM" as const,
      riskScore: 82,
      ruleCode: "STALLED_PROJECT",
      evidence: JSON.stringify({
        status: "IN_PROGRESS",
        yearsStalled: 4.2,
        startDate: "2021-03-15",
      }),
    },
    {
      title: "Unverified location: Rural Connectivity Road",
      description: "High-budget project (₹95,00,000) has no verified primary geographic location registered.",
      category: "GEOGRAPHIC" as const,
      severity: "LOW" as const,
      riskScore: 30,
      ruleCode: "UNVERIFIED_LOCATION",
      evidence: JSON.stringify({
        approvedAmount: 95_00_000,
        hasLocation: true,
        isVerified: false,
      }),
    },
    {
      title: "Timeline anomaly: Village Pond Desilting",
      description: "Expected end date 2025-02-28 is on or before project creation date 2025-02-15.",
      category: "TIMELINE" as const,
      severity: "HIGH" as const,
      riskScore: 90,
      ruleCode: "TIMELINE_ANOMALY",
      evidence: JSON.stringify({
        createdAt: "2025-02-15",
        expectedEndDate: "2025-02-28",
        anomaly: "End date before creation date",
      }),
    },
  ];

  for (const a of DEMO_ANOMALIES) {
    // Pick a random project for demo
    const projectIds = Object.values(createdProjects);
    const projectId = projectIds[Math.floor(Math.random() * projectIds.length)];

    const analyst = await prisma.user.findFirst({ where: { role: "ANALYST" } });
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

    await prisma.anomaly.create({
      data: {
        ...a,
        status: Math.random() > 0.5 ? "OPEN" : "ACKNOWLEDGED",
        projectId,
        acknowledgedById: Math.random() > 0.5 ? analyst?.id : null,
        acknowledgedAt: Math.random() > 0.5 ? new Date() : null,
        resolvedById: a.category === "GEOGRAPHIC" ? admin?.id : null,
        resolvedAt: a.category === "GEOGRAPHIC" ? new Date() : null,
        resolution: a.category === "GEOGRAPHIC"
          ? "Location verified by field officer. No issue found."
          : null,
      },
    });
    logger.info(`✓ Anomaly: "${a.title.slice(0, 60)}..."`);
  }
  logger.info(`✓ Created ${DEMO_ANOMALIES.length} demo anomalies`);
}

main()
  .then(() => disconnectDatabase())
  .catch((err) => {
    logger.error("Seed failed", { error: err });
    process.exit(1);
  });
