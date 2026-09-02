import { prisma, disconnectDatabase } from '../../src/config/database.js';
import { verificationService } from '../../src/services/verificationService.js';

async function main() {
  const pilot = await prisma.project.findFirst({
    where: { pilotProject: true },
    include: { satelliteObservations: true, progressObservations: true }
  });

  if (!pilot) {
    console.log('No pilot project found');
    await disconnectDatabase();
    return;
  }

  console.log('Testing verification for:', pilot.name);
  console.log('Satellite observations:', pilot.satelliteObservations.length);
  console.log('Progress observations:', pilot.progressObservations.length);

  const result = await verificationService.runAndStore({ projectId: pilot.id });
  console.log('Verification result:', result.output.result);
  console.log('Confidence:', result.output.confidence);
  console.log('Score:', result.output.score.toFixed(2));
  console.log('Explanation:', result.output.explanation.slice(0, 200));

  await disconnectDatabase();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
