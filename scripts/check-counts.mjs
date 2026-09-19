import { prisma } from "@vojas/db";

const counts = {
  projects: await prisma.project.count(),
  mps: await prisma.mP.count(),
  vendors: await prisma.vendor.count(),
};
console.log(JSON.stringify(counts));
await prisma.$disconnect();