import type { PrismaService } from '../../../src/prisma/prisma.service.js';

const TABLES = [
  'User',
  'ApiKey',
  'Notification',
  'WebhookSubscription',
  'WebhookDelivery',
  'outbox_events',
];

/** Limpa todas as tabelas mantendo o schema criado pelas migrations. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const identifiers = TABLES.map((table) => `"${table}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${identifiers} RESTART IDENTITY CASCADE;`,
  );
}
