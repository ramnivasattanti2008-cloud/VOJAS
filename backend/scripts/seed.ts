import { prisma, disconnectDatabase } from "../src/config/database.js";
import { userService } from "../src/services/userService.js";
import { logger } from "../src/utils/logger.js";

const DEMO_USERS = [
  {
    name: "Anitha Krishnan",
    email: "admin@vojas.gov",
    password: "vojas-demo-2026",
    role: "ADMIN" as const,
  },
  {
    name: "Ravi Shankar",
    email: "officer@vojas.gov",
    password: "vojas-demo-2026",
    role: "OFFICER" as const,
  },
  {
    name: "Priya Menon",
    email: "analyst@vojas.gov",
    password: "vojas-demo-2026",
    role: "ANALYST" as const,
  },
  {
    name: "Demo Reviewer",
    email: "reviewer@vojas.gov",
    password: "vojas-demo-2026",
    role: "REVIEWER" as const,
  },
];

// Realistic MPLAD demo projects across 5 states and 6 sectors
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
  },
];

async function main() {
  // ── Seed Users ───────────────────────────────────────────────────────────
  logger.info("Seeding demo users...");

  const createdUsers: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
    });
    if (existing) {
      createdUsers[u.role] = existing.id;
      logger.info(`✓ User exists: ${u.email}`);
      continue;
    }
    const user = await userService.create(u);
    createdUsers[u.role] = user.id;
    logger.info(`✓ Created: ${u.email} (${u.role})`);
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

  // ── Summary ─────────────────────────────────────────────────────────────
  logger.info("\n✅ Seed complete.");
  logger.info("\nDemo accounts:");
  for (const u of DEMO_USERS) {
    logger.info(`  ${(u.role as string).padEnd(10)} → ${u.email}  /  ${u.password}`);
  }
  logger.info(`\nDemo projects: ${DEMO_PROJECTS.length} MPLAD projects across 5 states`);
}

main()
  .then(() => disconnectDatabase())
  .catch((err) => {
    logger.error("Seed failed", { error: err });
    process.exit(1);
  });
