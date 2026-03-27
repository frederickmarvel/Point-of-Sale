import 'dotenv/config';
import app from './app';
import prisma from './utils/prisma.util';
import logger from './utils/logger.util';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    const server = app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
