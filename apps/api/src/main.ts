import { PrismaClient } from '@prisma/client';
import { loadConfig } from './config/env.js';
import { buildApp } from './app/build-app.js';

const config = loadConfig();
const prisma = new PrismaClient();
const app = buildApp(config, prisma);

const shutdown = async (): Promise<void> => {
  await app.close();
  await prisma.$disconnect();
};

process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
} catch (error) {
  app.log.fatal(error);
  await prisma.$disconnect();
  process.exit(1);
}
