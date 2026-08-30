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

async function main() {
  logger.info("Seeding demo users...");

  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
    });
    if (existing) {
      logger.info(`✓ User exists: ${u.email}`);
      continue;
    }
    await userService.create(u);
    logger.info(`✓ Created: ${u.email} (${u.role})`);
  }

  logger.info("Seed complete. Demo accounts:");
  for (const u of DEMO_USERS) {
    logger.info(`  ${u.role.padEnd(10)} → ${u.email}  /  ${u.password}`);
  }
}

main()
  .then(() => disconnectDatabase())
  .catch((err) => {
    logger.error("Seed failed", { error: err });
    process.exit(1);
  });
