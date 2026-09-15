import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // OWNER — hardcoded, no env var override (SALT_ROUNDS=10)
  const hash = await bcrypt.hash('weladhalal', 10);
  await prisma.user.upsert({
    where: { username: 'Ahmed Elseyad' },
    update: {
      passwordHash: hash,
      role: 'owner',
      permissionLevel: 100,
      isOwner: true,
      isActive: true,
      forcePasswordChange: false,
    },
    create: {
      fullName: 'Ahmed Elseyad',
      username: 'Ahmed Elseyad',
      passwordHash: hash,
      role: 'owner',
      permissionLevel: 100,
      isOwner: true,
      isActive: true,
      forcePasswordChange: false,
    },
  });

  // DEFAULT BRANCH
  await prisma.branch.upsert({
    where: { id: 'branch-main' },
    update: {},
    create: { id: 'branch-main', name: 'ولاد حلال - الفرع الرئيسي', isActive: true },
  });

  // SYSTEM SETTINGS
  const settings = [
    { key: 'store_name', value: 'ولاد حلال' },
    { key: 'store_phone', value: '' },
    { key: 'store_accepting_orders', value: 'true' },
    { key: 'cash_discrepancy_threshold', value: '20' },
    { key: 'loyalty_points_rate', value: '1' },
    { key: 'return_approval_threshold', value: '500' },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }

  // DEFAULT CATEGORIES (structural only — no products invented)
  const cats = [
    'ألبان وأجبان',
    'لحوم ودواجن',
    'لحوم ومصنعات لحوم',
    'خضروات وفاكهة',
    'مياه ومشروبات',
    'مخبوزات',
    'معلبات',
    'بقوليات',
    'بقوليات وحبوب',
    'منظفات',
    'وجبات خفيفة',
    'أخرى',
  ];
  for (const name of cats) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // EGYPTIAN MARKET PRODUCTS (Part 9) — idempotent via barcode upsert
  const products = [
    { name: 'جهينة لبن كامل الدسم 1 لتر', category: 'ألبان وأجبان', barcode: '6221011234567', price: 42, unit: 'قطعة' },
    { name: 'جهينة زبادي طبيعي', category: 'ألبان وأجبان', barcode: '6221011234574', price: 12, unit: 'قطعة' },
    { name: 'دومتي جبنة قريش', category: 'ألبان وأجبان', barcode: '6221011234581', price: 25, unit: 'قطعة' },
    { name: 'الجمل جبنة مثلثات', category: 'ألبان وأجبان', barcode: '6221011234598', price: 38, unit: 'علبة' },
    { name: 'بيوني لبن كامل الدسم', category: 'ألبان وأجبان', barcode: '6221011234604', price: 40, unit: 'قطعة' },
    { name: 'دايجو زبادي يوناني', category: 'ألبان وأجبان', barcode: '6221011234611', price: 18, unit: 'قطعة' },
    { name: 'كنور مرقة دجاج 48 مكعب', category: 'لحوم ومصنعات لحوم', barcode: '6221022234567', price: 42, unit: 'علبة' },
    { name: 'إدفكو كفتة مجمدة 1 كجم', category: 'لحوم ومصنعات لحوم', barcode: '6221022234574', price: 180, unit: 'كجم' },
    { name: 'أمريكانا برجر لحم', category: 'لحوم ومصنعات لحوم', barcode: '6221022234581', price: 95, unit: 'علبة' },
    { name: 'سيوفي ناجت دجاج', category: 'لحوم ومصنعات لحوم', barcode: '6221022234598', price: 110, unit: 'علبة' },
    { name: 'توست حلواني', category: 'مخبوزات', barcode: '6221033234567', price: 22, unit: 'قطعة' },
    { name: 'بسكويت لؤلؤة', category: 'مخبوزات', barcode: '6221033234574', price: 8, unit: 'قطعة' },
    { name: 'بيبو كيك', category: 'مخبوزات', barcode: '6221033234581', price: 6, unit: 'قطعة' },
    { name: 'كوكاكولا 1.5 لتر', category: 'مياه ومشروبات', barcode: '6221044234567', price: 30, unit: 'قطعة' },
    { name: 'سبيرو سباتي مياه معدنية 1.5 لتر', category: 'مياه ومشروبات', barcode: '6221044234574', price: 10, unit: 'قطعة' },
    { name: 'بيتي مياه 600 مل', category: 'مياه ومشروبات', barcode: '6221044234581', price: 5, unit: 'قطعة' },
    { name: 'شويبس 1.5 لتر', category: 'مياه ومشروبات', barcode: '6221044234598', price: 28, unit: 'قطعة' },
    { name: 'ريفريش عصير', category: 'مياه ومشروبات', barcode: '6221044234604', price: 15, unit: 'قطعة' },
    { name: 'فينوس فول مدمس', category: 'معلبات', barcode: '6221055234567', price: 14, unit: 'علبة' },
    { name: 'هاينز كاتشب', category: 'معلبات', barcode: '6221055234574', price: 35, unit: 'قطعة' },
    { name: 'تروللي عدس أصفر 1 كجم', category: 'بقوليات وحبوب', barcode: '6221055234581', price: 45, unit: 'كجم' },
    { name: 'أبو عوف بهارات مشكلة', category: 'بقوليات وحبوب', barcode: '6221055234598', price: 20, unit: 'قطعة' },
    { name: 'بريل صابون غسيل', category: 'منظفات', barcode: '6221066234567', price: 55, unit: 'علبة' },
    { name: 'فيري سائل جلي', category: 'منظفات', barcode: '6221066234574', price: 38, unit: 'قطعة' },
    { name: 'كلوركس مبيض', category: 'منظفات', barcode: '6221066234581', price: 25, unit: 'قطعة' },
    { name: 'چيبو شيبسي', category: 'وجبات خفيفة', barcode: '6221077234567', price: 10, unit: 'قطعة' },
    { name: 'توينكيز', category: 'وجبات خفيفة', barcode: '6221077234574', price: 8, unit: 'قطعة' },
    { name: 'كورن فليكس سنو', category: 'وجبات خفيفة', barcode: '6221077234581', price: 65, unit: 'علبة' },
  ];

  const branch = await prisma.branch.findFirst({ where: { id: 'branch-main' } });
  for (const p of products) {
    const category = await prisma.category.findUnique({ where: { name: p.category } });
    const prod = await prisma.product.upsert({
      where: { barcode: p.barcode },
      update: {},
      create: {
        name: p.name,
        barcode: p.barcode,
        categoryId: category?.id,
        type: 'stock',
        basePrice: p.price,
      },
    });
    await prisma.productUnit.upsert({
      where: { id: `${prod.id}-retail` },
      update: {},
      create: {
        id: `${prod.id}-retail`,
        productId: prod.id,
        unitName: p.unit,
        sellingPrice: p.price,
        conversionFactor: 1,
      },
    }).catch(async () => {
      const existing = await prisma.productUnit.findFirst({ where: { productId: prod.id } });
      if (!existing) {
        await prisma.productUnit.create({
          data: { productId: prod.id, unitName: p.unit, sellingPrice: p.price, conversionFactor: 1 },
        });
      }
    });
    if (branch) {
      const qty = 50 + Math.floor(Math.random() * 51);
      await prisma.inventory.upsert({
        where: { productId_branchId: { productId: prod.id, branchId: branch.id } },
        update: {},
        create: { productId: prod.id, branchId: branch.id, quantity: qty, avgCost: p.price },
      });
    }
  }

  console.log('Seed complete.');
  console.log('Owner: Ahmed Elseyad / weladhalal');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
