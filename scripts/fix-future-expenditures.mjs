// Fix future-dated expenditures that are marked as PAID
// These should be AUTHORIZED or PENDING since the payment hasn't happened yet
import { prisma } from "../backend/dist/config/database.js";

const futureDate = new Date();

const result = await prisma.expenditure.updateMany({
  where: {
    paidOn: { gt: futureDate },
    status: "PAID",
  },
  data: {
    status: "AUTHORIZED",
  },
});

console.log(`Fixed ${result.count} future-dated PAID expenditures → AUTHORIZED`);

await prisma.$disconnect();
