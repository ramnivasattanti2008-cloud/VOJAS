import 'dotenv/config';
import app from './app';
import { connectDb, disconnectDb } from '@vojas/db';

const PORT = parseInt(process.env.PORT ?? '5000');

async function start() {
  await connectDb();
  console.log('Database connected');

  const server = app.listen(PORT, () => {
    console.log(`VOJAS API running on http://localhost:${PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDb();
      console.log('Database disconnected');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
