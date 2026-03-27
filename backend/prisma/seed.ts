import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default admin
  const hashedPassword = await bcrypt.hash('admin123', 12);
  await prisma.admin.upsert({
    where: { email: 'admin@cafe.com' },
    update: {},
    create: {
      email: 'admin@cafe.com',
      password: hashedPassword,
      name: 'Admin',
    },
  });

  // Create categories
  const categories = [
    { name: 'Food', description: 'Main dishes and snacks', sortOrder: 1 },
    { name: 'Beverages', description: 'Drinks and refreshments', sortOrder: 2 },
    { name: 'Desserts', description: 'Sweet treats', sortOrder: 3 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  const foodCat = await prisma.category.findUnique({ where: { name: 'Food' } });
  const bevCat = await prisma.category.findUnique({ where: { name: 'Beverages' } });
  const desCat = await prisma.category.findUnique({ where: { name: 'Desserts' } });

  if (!foodCat || !bevCat || !desCat) throw new Error('Categories not found');

  // Create menu items
  const menuItems = [
    { name: 'Nasi Goreng', description: 'Indonesian fried rice with egg', price: 35000, categoryId: foodCat.id },
    { name: 'Mie Goreng', description: 'Indonesian fried noodles', price: 32000, categoryId: foodCat.id },
    { name: 'Ayam Bakar', description: 'Grilled chicken with sambal', price: 45000, categoryId: foodCat.id },
    { name: 'Gado-Gado', description: 'Indonesian salad with peanut sauce', price: 28000, categoryId: foodCat.id },
    { name: 'Kopi Hitam', description: 'Black coffee', price: 15000, categoryId: bevCat.id },
    { name: 'Es Teh', description: 'Iced tea', price: 10000, categoryId: bevCat.id },
    { name: 'Jus Alpukat', description: 'Avocado juice', price: 22000, categoryId: bevCat.id },
    { name: 'Es Jeruk', description: 'Fresh orange juice', price: 18000, categoryId: bevCat.id },
    { name: 'Pisang Goreng', description: 'Fried banana', price: 20000, categoryId: desCat.id },
    { name: 'Es Krim', description: 'Ice cream', price: 25000, categoryId: desCat.id },
  ];

  for (const item of menuItems) {
    const existing = await prisma.menuItem.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.menuItem.create({ data: item });
    }
  }

  // Create tables
  const tables = [
    { number: 1, name: 'Table 1', capacity: 4 },
    { number: 2, name: 'Table 2', capacity: 4 },
    { number: 3, name: 'Table 3', capacity: 6 },
    { number: 4, name: 'Table 4', capacity: 2 },
    { number: 5, name: 'Table 5', capacity: 8 },
  ];

  for (const table of tables) {
    await prisma.table.upsert({
      where: { number: table.number },
      update: {},
      create: table,
    });
  }

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
