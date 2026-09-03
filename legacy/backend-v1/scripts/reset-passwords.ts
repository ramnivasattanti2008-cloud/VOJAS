/**
 * Reset all demo user passwords to VojasDemo2026
 * Run with: cd backend && npx tsx scripts/reset-passwords.ts
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_USERS = [
  "admin@vojas.gov",
  "officer@vojas.gov",
  "analyst@vojas.gov",
  "reviewer@vojas.gov",
  "mp@vojas.gov",
];

async function main() {
  const password = "VojasDemo2026";
  const hash = await bcrypt.hash(password, 10);

  for (const email of DEMO_USERS) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hash },
      });
      console.log(`✓ Reset password for ${email} (${user.role})`);
    } else {
      console.log(`✗ User not found: ${email}`);
    }
  }
  console.log("\nAll demo passwords are now: VojasDemo2026");
}

main()
  .then(() => prisma.$disconnect())
  .catch(console.error);
