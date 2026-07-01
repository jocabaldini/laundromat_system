import { execSync } from 'child_process';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Load test environment variables before anything else
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

/**
 * Global setup — runs once before all e2e test suites.
 * Resets the test database and seeds required test data.
 */
export default async function globalSetup() {
  // Apply all pending migrations to the test database
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
    stdio: 'inherit',
  });

  // Seed admin and regular user for e2e tests
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  try {
    // Wipe all data (order matters due to FK constraints)
    await prisma.user.deleteMany();

    const SALT_ROUNDS = 10;

    // Create test OPERATOR
    await prisma.user.create({
      data: {
        email: 'admin@test.com',
        name: 'Admin Test',
        passwordHash: await bcrypt.hash('Admin@123', SALT_ROUNDS),
        role: 'OPERATOR',
      },
    });

    // Create test USER
    await prisma.user.create({
      data: {
        email: 'user@test.com',
        name: 'User Test',
        passwordHash: await bcrypt.hash('User@123', SALT_ROUNDS),
        role: 'USER',
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
