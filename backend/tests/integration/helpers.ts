import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Use a separate test database
process.env['DATABASE_URL'] = 'file:./test.db';
process.env['JWT_SECRET'] = 'test-jwt-secret-key-for-testing';
process.env['NODE_ENV'] = 'test';
process.env['XENDIT_SECRET_KEY'] = 'xnd_test_key';
process.env['DURIANPAY_SECRET_KEY'] = 'dp_test_key';
process.env['XENDIT_WEBHOOK_TOKEN'] = ''; // disabled in tests

export const testPrisma = new PrismaClient({
  datasources: { db: { url: 'file:./test.db' } },
});

export async function setupTestDb(): Promise<void> {
  // Clear all tables in dependency order
  await testPrisma.payment.deleteMany();
  await testPrisma.orderItem.deleteMany();
  await testPrisma.order.deleteMany();
  await testPrisma.menuItem.deleteMany();
  await testPrisma.category.deleteMany();
  await testPrisma.table.deleteMany();
  await testPrisma.admin.deleteMany();

  // Create test admin
  const hashedPw = await bcrypt.hash('testpass123', 4);
  await testPrisma.admin.create({
    data: { email: 'test@admin.com', password: hashedPw, name: 'Test Admin' },
  });
}

export async function teardownTestDb(): Promise<void> {
  await testPrisma.payment.deleteMany();
  await testPrisma.orderItem.deleteMany();
  await testPrisma.order.deleteMany();
  await testPrisma.menuItem.deleteMany();
  await testPrisma.category.deleteMany();
  await testPrisma.table.deleteMany();
  await testPrisma.admin.deleteMany();
  await testPrisma.$disconnect();
}
