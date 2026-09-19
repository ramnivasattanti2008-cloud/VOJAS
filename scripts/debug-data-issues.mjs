import { prisma } from "@vojas/db";

const future = await prisma.financialObservation.findMany({
  where: { paidOn: { gt: new Date() } },
  select: { id: true, paidOn: true, amount: true, status: true },
  take: 10,
});
console.log("Future financial observations:", JSON.stringify(future, null, 2));

const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
const validRoles = ["ADMIN", "OFFICER", "ANALYST", "REVIEWER", "MP", "CITIZEN", "CONTRACTOR", "FIELD_OFFICER", "VIEWER"];
const invalid = users.filter(u => !validRoles.includes(u.role));
console.log("Invalid role users:", JSON.stringify(invalid, null, 2));

await prisma.$disconnect();
