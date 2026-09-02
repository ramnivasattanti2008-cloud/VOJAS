import { generateProjectPDF } from '../src/services/pdfService.js';
import { prisma, disconnectDatabase } from '../src/config/database.js';

async function main() {
  const pilot = await prisma.project.findFirst({ where: { pilotProject: true } });
  if (!pilot) { console.log('No pilot'); await disconnectDatabase(); return; }
  try {
    const buffer = await generateProjectPDF(pilot.id);
    console.log('PDF generated successfully, size:', buffer.length, 'bytes');
    // Check PDF magic bytes
    const header = buffer.slice(0, 5).toString('ascii');
    console.log('Header:', header);
    if (header === '%PDF-') {
      console.log('Valid PDF header ✓');
    } else {
      console.error('Invalid PDF header!');
    }
  } catch (err: any) {
    console.error('PDF failed:', err?.message ?? err);
  }
  await disconnectDatabase();
}
main();
