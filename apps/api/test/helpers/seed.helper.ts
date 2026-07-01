import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Returns a PrismaClient connected to the test database.
 * Each test suite should disconnect after use.
 */
export function getTestPrisma(): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });
}

/**
 * Resets refresh tokens for all users — useful for token rotation tests
 * that need a clean state without wiping the entire DB.
 */
export async function clearRefreshTokens(prisma: PrismaClient): Promise<void> {
  await prisma.user.updateMany({ data: { refreshTokenHash: null } });
}

/**
 * Fully resets test users (delete + recreate) to guarantee a clean state.
 * Use in suites where stale DB state could affect token-related logic.
 */
export async function resetTestUsers(prisma: PrismaClient): Promise<void> {
  const SALT_ROUNDS = 10;

  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      {
        email: 'admin@test.com',
        name: 'Admin Test',
        passwordHash: await bcrypt.hash('Admin@123', SALT_ROUNDS),
        role: 'OPERATOR',
      },
      {
        email: 'user@test.com',
        name: 'User Test',
        passwordHash: await bcrypt.hash('User@123', SALT_ROUNDS),
        role: 'USER',
      },
    ],
  });
}
