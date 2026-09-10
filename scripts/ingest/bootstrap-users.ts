/**
 * Create one login-able account per role.
 *
 * Registration deliberately forces every self-registered user to CITIZEN (a
 * requested `role` in the register payload is ignored, which is correct), so
 * without this there is no way to reach the OFFICER, ANALYST, REVIEWER, MP,
 * CONTRACTOR, FIELD_OFFICER, VIEWER or ADMIN surfaces at all.
 *
 * This creates accounts only. It writes no projects, no financials, no
 * reports, no anomalies and no audit entries — nothing that a reader could
 * mistake for civic data.
 *
 * The password is read from BOOTSTRAP_PASSWORD and is never defaulted, so a
 * credential cannot be baked into the repository or silently reused across
 * deployments.
 *
 * Idempotent: existing accounts are left alone, including their password.
 * Pass --reset-password to re-hash the password for accounts that exist.
 *
 * Run:  BOOTSTRAP_PASSWORD=... pnpm exec tsx scripts/ingest/bootstrap-users.ts
 */
import bcrypt from "bcryptjs";
import { getPrisma } from "./_shared.js";

const RESET_PASSWORD = process.argv.includes("--reset-password");

const ROLES = [
  "ADMIN",
  "OFFICER",
  "ANALYST",
  "REVIEWER",
  "MP",
  "CONTRACTOR",
  "CITIZEN",
  "FIELD_OFFICER",
  "VIEWER",
] as const;

function emailFor(role: string): string {
  return `${role.toLowerCase().replace(/_/g, ".")}@vojas.gov.in`;
}

function nameFor(role: string): string {
  const pretty = role
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
  return `${pretty} (VOJAS)`;
}

async function main() {
  const password = process.env.BOOTSTRAP_PASSWORD;
  if (!password) {
    console.error(`❌ BOOTSTRAP_PASSWORD is not set. Refusing to create accounts`);
    console.error(`   with a default or hard-coded password.`);
    process.exit(1);
  }
  if (password.length < 12) {
    console.error(`❌ BOOTSTRAP_PASSWORD must be at least 12 characters.`);
    process.exit(1);
  }

  console.log(`👤 Bootstrapping one account per role (${ROLES.length} roles)`);

  const prisma = await getPrisma();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? "10");
  const passwordHash = await bcrypt.hash(password, rounds);

  let created = 0;
  let existing = 0;
  let reset = 0;

  for (const role of ROLES) {
    const email = emailFor(role);
    const found = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    if (found) {
      existing++;
      if (RESET_PASSWORD) {
        await prisma.user.update({ where: { email }, data: { passwordHash, isActive: true } });
        reset++;
      }
      console.log(`   = ${role.padEnd(14)} ${email}${RESET_PASSWORD ? " (password reset)" : " (exists, untouched)"}`);
      continue;
    }

    await prisma.user.create({
      data: { email, name: nameFor(role), role, passwordHash, isActive: true },
    });
    created++;
    console.log(`   + ${role.padEnd(14)} ${email}`);
  }

  console.log(`\n✅ Done.  created: ${created}   already existed: ${existing}${RESET_PASSWORD ? `   password reset: ${reset}` : ""}`);
  console.log(`   Every account shares the BOOTSTRAP_PASSWORD value. Rotate or`);
  console.log(`   disable these before this deployment is treated as live.`);
}

main()
  .catch((e) => {
    console.error(`💥 Bootstrap failed:`, e);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = await getPrisma();
    await prisma.$disconnect();
  });
