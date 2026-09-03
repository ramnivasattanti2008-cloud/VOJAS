import { prisma, disconnectDatabase } from '../src/config/database.js';

async function main() {
  const users = await prisma.user.findMany({ select: { email: true, name: true } });
  console.log('Users in DB:', users.length);
  users.forEach(u => console.log(' -', u.email, '|', u.name));
  await disconnectDatabase();
}
main();
