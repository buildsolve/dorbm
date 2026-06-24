import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Users
  await prisma.user.upsert({
    where: { email: 'admin@cakeerp.com' },
    update: {},
    create: { email: 'admin@cakeerp.com', name: 'Admin User', password: await bcrypt.hash('admin123', 10), role: 'ADMIN' },
  });
  await prisma.user.upsert({
    where: { email: 'production@cakeerp.com' },
    update: {},
    create: { email: 'production@cakeerp.com', name: 'Production Manager', password: await bcrypt.hash('prod123', 10), role: 'PRODUCTION' },
  });
  await prisma.user.upsert({
    where: { email: 'inventory@cakeerp.com' },
    update: {},
    create: { email: 'inventory@cakeerp.com', name: 'Inventory Manager', password: await bcrypt.hash('inv123', 10), role: 'INVENTORY' },
  });

  // Suppliers
  const s1 = await prisma.supplier.upsert({
    where: { code: 'SUP001' },
    update: {},
    create: { code: 'SUP001', name: 'Premium Flour Mills', contactName: 'John Baker', email: 'john@flourmills.com', phone: '+1-555-0101', address: '123 Mill Road' },
  });
  const s2 = await prisma.supplier.upsert({
    where: { code: 'SUP002' },
    update: {},
    create: { code: 'SUP002', name: 'Sweet Sugar Co', contactName: 'Jane Sweet', email: 'jane@sugarco.com', phone: '+1-555-0102', address: '456 Sugar Lane' },
  });
  const s3 = await prisma.supplier.upsert({
    where: { code: 'SUP003' },
    update: {},
    create: { code: 'SUP003', name: 'Dairy Fresh Ltd', contactName: 'Bob Dairy', email: 'bob@dairyfresh.com', phone: '+1-555-0103', address: '789 Dairy Ave' },
  });

  // Ingredients
  const ing1 = await prisma.ingredient.upsert({
    where: { code: 'ING001' },
    update: {},
    create: { code: 'ING001', name: 'All-Purpose Flour', unit: 'KG', unitCost: 1.20, reorderLevel: 50, currentStock: 200, supplierId: s1.id, storageLocation: 'Dry Store A1' },
  });
  const ing2 = await prisma.ingredient.upsert({
    where: { code: 'ING002' },
    update: {},
    create: { code: 'ING002', name: 'Granulated Sugar', unit: 'KG', unitCost: 0.95, reorderLevel: 30, currentStock: 150, supplierId: s2.id, storageLocation: 'Dry Store A2' },
  });
  const ing3 = await prisma.ingredient.upsert({
    where: { code: 'ING003' },
    update: {},
    create: { code: 'ING003', name: 'Butter (Unsalted)', unit: 'KG', unitCost: 7.50, reorderLevel: 20, currentStock: 80, supplierId: s3.id, storageLocation: 'Cold Store B1', allergenInfo: 'Dairy' },
  });
  const ing4 = await prisma.ingredient.upsert({
    where: { code: 'ING004' },
    update: {},
    create: { code: 'ING004', name: 'Fresh Eggs', unit: 'UNITS', unitCost: 0.25, reorderLevel: 100, currentStock: 500, supplierId: s3.id, storageLocation: 'Cold Store B2', allergenInfo: 'Eggs' },
  });
  const ing5 = await prisma.ingredient.upsert({
    where: { code: 'ING005' },
    update: {},
    create: { code: 'ING005', name: 'Whole Milk', unit: 'L', unitCost: 1.10, reorderLevel: 40, currentStock: 100, supplierId: s3.id, storageLocation: 'Cold Store B3', allergenInfo: 'Dairy' },
  });
  const ing6 = await prisma.ingredient.upsert({
    where: { code: 'ING006' },
    update: {},
    create: { code: 'ING006', name: 'Cocoa Powder', unit: 'KG', unitCost: 8.50, reorderLevel: 10, currentStock: 40, storageLocation: 'Dry Store A3' },
  });
  const ing7 = await prisma.ingredient.upsert({
    where: { code: 'ING007' },
    update: {},
    create: { code: 'ING007', name: 'Baking Powder', unit: 'KG', unitCost: 3.20, reorderLevel: 5, currentStock: 25, storageLocation: 'Dry Store A4' },
  });
  const ing8 = await prisma.ingredient.upsert({
    where: { code: 'ING008' },
    update: {},
    create: { code: 'ING008', name: 'Vanilla Extract', unit: 'ML', unitCost: 0.05, reorderLevel: 500, currentStock: 2000, storageLocation: 'Dry Store A5' },
  });
  const ing9 = await prisma.ingredient.upsert({
    where: { code: 'ING009' },
    update: {},
    create: { code: 'ING009', name: 'Cream Cheese', unit: 'KG', unitCost: 9.00, reorderLevel: 10, currentStock: 30, supplierId: s3.id, storageLocation: 'Cold Store B4', allergenInfo: 'Dairy' },
  });
  const ing10 = await prisma.ingredient.upsert({
    where: { code: 'ING010' },
    update: {},
    create: { code: 'ING010', name: 'Icing Sugar', unit: 'KG', unitCost: 1.50, reorderLevel: 20, currentStock: 60, supplierId: s2.id, storageLocation: 'Dry Store A6' },
  });

  // Stock transactions
  await prisma.stockTransaction.createMany({
    data: [
      { ingredientId: ing1.id, type: 'STOCK_IN', quantity: 200, unitCost: 1.20, batchNumber: 'BATCH-001', supplierId: s1.id },
      { ingredientId: ing2.id, type: 'STOCK_IN', quantity: 150, unitCost: 0.95, batchNumber: 'BATCH-002', supplierId: s2.id },
      { ingredientId: ing3.id, type: 'STOCK_IN', quantity: 80,  unitCost: 7.50, batchNumber: 'BATCH-003', supplierId: s3.id },
    ],
  });

  // Product categories
  const cat1 = await prisma.productCategory.upsert({ where: { name: 'Layer Cakes' }, update: {}, create: { name: 'Layer Cakes', description: 'Multi-layer celebration cakes' } });
  const cat2 = await prisma.productCategory.upsert({ where: { name: 'Cupcakes' }, update: {}, create: { name: 'Cupcakes', description: 'Individual cupcakes' } });
  const cat3 = await prisma.productCategory.upsert({ where: { name: 'Cheesecakes' }, update: {}, create: { name: 'Cheesecakes', description: 'Baked and no-bake cheesecakes' } });

  // Recipes
  const r1 = await prisma.recipe.upsert({
    where: { code: 'RCP001' },
    update: {},
    create: {
      code: 'RCP001', name: 'Classic Vanilla Cake', description: 'Light and fluffy vanilla sponge cake',
      yield: 1, yieldUnit: 'cake (8 inch)', laborCost: 5.00, overheadCost: 2.00,
      components: { create: [
        { ingredientId: ing1.id, quantity: 0.500 },
        { ingredientId: ing2.id, quantity: 0.300 },
        { ingredientId: ing3.id, quantity: 0.200 },
        { ingredientId: ing4.id, quantity: 4 },
        { ingredientId: ing5.id, quantity: 0.120 },
        { ingredientId: ing7.id, quantity: 0.010 },
        { ingredientId: ing8.id, quantity: 5 },
      ]},
    },
  });

  const r2 = await prisma.recipe.upsert({
    where: { code: 'RCP002' },
    update: {},
    create: {
      code: 'RCP002', name: 'Chocolate Fudge Cake', description: 'Rich chocolate cake with fudge frosting',
      yield: 1, yieldUnit: 'cake (8 inch)', laborCost: 6.00, overheadCost: 2.50,
      components: { create: [
        { ingredientId: ing1.id, quantity: 0.400 },
        { ingredientId: ing2.id, quantity: 0.350 },
        { ingredientId: ing3.id, quantity: 0.250 },
        { ingredientId: ing4.id, quantity: 3 },
        { ingredientId: ing5.id, quantity: 0.100 },
        { ingredientId: ing6.id, quantity: 0.080 },
        { ingredientId: ing7.id, quantity: 0.008 },
      ]},
    },
  });

  const r3 = await prisma.recipe.upsert({
    where: { code: 'RCP003' },
    update: {},
    create: {
      code: 'RCP003', name: 'Vanilla Cupcake', description: 'Classic vanilla cupcake (per dozen)',
      yield: 12, yieldUnit: 'cupcakes', laborCost: 2.00, overheadCost: 0.80,
      components: { create: [
        { ingredientId: ing1.id, quantity: 0.240 },
        { ingredientId: ing2.id, quantity: 0.200 },
        { ingredientId: ing3.id, quantity: 0.120 },
        { ingredientId: ing4.id, quantity: 2 },
        { ingredientId: ing5.id, quantity: 0.060 },
        { ingredientId: ing8.id, quantity: 3 },
      ]},
    },
  });

  const r4 = await prisma.recipe.upsert({
    where: { code: 'RCP004' },
    update: {},
    create: {
      code: 'RCP004', name: 'Classic Cheesecake', description: 'New York style baked cheesecake',
      yield: 1, yieldUnit: 'cheesecake (9 inch)', laborCost: 4.50, overheadCost: 1.50,
      components: { create: [
        { ingredientId: ing9.id,  quantity: 0.600 },
        { ingredientId: ing2.id,  quantity: 0.150 },
        { ingredientId: ing4.id,  quantity: 3 },
        { ingredientId: ing5.id,  quantity: 0.120 },
        { ingredientId: ing8.id,  quantity: 5 },
        { ingredientId: ing10.id, quantity: 0.050 },
      ]},
    },
  });

  // Products
  const p1 = await prisma.product.upsert({
    where: { code: 'PRD001' }, update: {},
    create: { code: 'PRD001', name: 'Classic Vanilla Cake (8")', description: 'Classic 8-inch vanilla layer cake', categoryId: cat1.id, recipeId: r1.id, sellingPrice: 28.00, laborCost: 5.00, overheadCost: 2.00, packagingCost: 1.50, allergenInfo: 'Gluten, Dairy, Eggs', shelfLifeDays: 5 },
  });
  const p2 = await prisma.product.upsert({
    where: { code: 'PRD002' }, update: {},
    create: { code: 'PRD002', name: 'Chocolate Fudge Cake (8")', description: 'Rich 8-inch chocolate fudge cake', categoryId: cat1.id, recipeId: r2.id, sellingPrice: 32.00, laborCost: 6.00, overheadCost: 2.50, packagingCost: 1.50, allergenInfo: 'Gluten, Dairy, Eggs', shelfLifeDays: 5 },
  });
  const p3 = await prisma.product.upsert({
    where: { code: 'PRD003' }, update: {},
    create: { code: 'PRD003', name: 'Vanilla Cupcakes (Dozen)', categoryId: cat2.id, recipeId: r3.id, sellingPrice: 18.00, laborCost: 2.00, overheadCost: 0.80, packagingCost: 0.80, allergenInfo: 'Gluten, Dairy, Eggs', shelfLifeDays: 3 },
  });
  const p4 = await prisma.product.upsert({
    where: { code: 'PRD004' }, update: {},
    create: { code: 'PRD004', name: 'New York Cheesecake (9")', categoryId: cat3.id, recipeId: r4.id, sellingPrice: 35.00, laborCost: 4.50, overheadCost: 1.50, packagingCost: 2.00, allergenInfo: 'Dairy, Eggs', shelfLifeDays: 7 },
  });

  // Storage Locations
  const loc1 = await prisma.storageLocation.upsert({ where: { code: 'LOC001' }, update: {}, create: { code: 'LOC001', name: 'Display Fridge 1', description: 'Front display refrigerator', capacity: 50 } });
  await prisma.storageLocation.upsert({ where: { code: 'LOC002' }, update: {}, create: { code: 'LOC002', name: 'Walk-in Cooler', description: 'Main walk-in cooler storage', capacity: 200 } });
  await prisma.storageLocation.upsert({ where: { code: 'LOC003' }, update: {}, create: { code: 'LOC003', name: 'Dispatch Area', description: 'Ready for delivery staging area', capacity: 100 } });

  // Production Plan
  await prisma.productionPlan.create({
    data: {
      planDate: new Date(), weekNumber: 24, status: 'DRAFT', notes: 'Regular weekly production',
      lines: { create: [
        { productId: p1.id, plannedQuantity: 10 },
        { productId: p2.id, plannedQuantity: 8 },
        { productId: p3.id, plannedQuantity: 20 },
        { productId: p4.id, plannedQuantity: 6 },
      ]},
    },
  });

  // Storage records
  await prisma.storageRecord.createMany({
    data: [
      { productId: p1.id, locationId: loc1.id, batchNumber: 'FG-001', quantity: 5, productionDate: new Date(), expiryDate: new Date(Date.now() + 5 * 86400000), unitCost: 15.50 },
      { productId: p2.id, locationId: loc1.id, batchNumber: 'FG-002', quantity: 4, productionDate: new Date(), expiryDate: new Date(Date.now() + 5 * 86400000), unitCost: 18.00 },
      { productId: p3.id, locationId: loc1.id, batchNumber: 'FG-003', quantity: 10, productionDate: new Date(), expiryDate: new Date(Date.now() + 3 * 86400000), unitCost: 8.20 },
    ],
  });

  console.log('Seed completed successfully!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
