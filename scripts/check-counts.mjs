import { prisma } from "../backend/src/config/database.js";

const counts = {
  projects: await prisma.project.count(),
  mps: await prisma.mP.count(),
  vendors: await prisma.vendor.count(),
};
console.log(JSON.stringify(counts));
await prisma.$disconnect();