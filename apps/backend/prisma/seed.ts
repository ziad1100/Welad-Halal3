import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// SEED_DEMO=true → reference-screenshot demo rows (DEV DATABASES ONLY).
// Never run with SEED_DEMO=true against production: it inserts demo products,
// inventory and orders 143-152 transcribed from the reference screenshots.
// Normal seed (owner/branch/settings/categories) always runs and is untouched.
// ---------------------------------------------------------------------------
const DEMO_PRODUCTS: { name: string; category: string; basePrice: number; barcode?: string }[] = [
  { name: 'بخيره لبن حليب 1 لتر', category: 'منتجات الألبان', basePrice: 42 },
  { name: 'شيكاتينا استريس حار 1 كجم', category: 'لحوم ودواجن', basePrice: 109 },
  { name: 'جبنه رودس 1/8', category: 'منتجات الألبان', basePrice: 14 },
  { name: 'جبنة المراعي 1/2 فيتا', category: 'منتجات الألبان', basePrice: 55 },
  { name: 'مرقة دجاج كنور 48 مكعب', category: 'معلبات', basePrice: 42 },
  { name: 'حدوتة كيده عصافيري برازيلي', category: 'لحوم ودواجن', basePrice: 78.5 },
  { name: 'كفتة حلال عائلي 1 كجم', category: 'لحوم ودواجن', basePrice: 75 },
  { name: 'قشطة لامدي 100جم', category: 'منتجات الألبان', basePrice: 15.5 },
  { name: 'موزريلا الحمد 1 ك', category: 'منتجات الألبان', basePrice: 140, barcode: '6225000321137' },
  { name: 'حدوتة كيده شرائح برازيلي 500 جم', category: 'لحوم ودواجن', basePrice: 157 },
];

interface DemoLine { qty: number; unitPrice: number }
interface DemoOrder {
  reference: string;
  createdAt: string;
  product: string;
  lines: DemoLine[];
}
// Totals/prices transcribed from screenshots 2/5/6. Multi-line rows split the
// SAME preview product across lines so #items/qty/total/glimpse all match
// without inventing extra products. Row 142 skipped (name truncated in shot).
const DEMO_ORDERS: DemoOrder[] = [
  { reference: '143', createdAt: '2026-09-01T15:04:00', product: 'بخيره لبن حليب 1 لتر', lines: [{ qty: 2, unitPrice: 42 }] },
  { reference: '144', createdAt: '2026-09-01T15:04:00', product: 'شيكاتينا استريس حار 1 كجم', lines: [{ qty: 1, unitPrice: 109 }] },
  { reference: '145', createdAt: '2026-09-01T15:04:00', product: 'جبنه رودس 1/8', lines: [{ qty: 1, unitPrice: 14 }, { qty: 1, unitPrice: 14 }] },
  { reference: '146', createdAt: '2026-09-01T15:05:00', product: 'جبنة المراعي 1/2 فيتا', lines: [{ qty: 1, unitPrice: 55 }, { qty: 1, unitPrice: 55 }] },
  { reference: '147', createdAt: '2026-09-01T15:07:00', product: 'مرقة دجاج كنور 48 مكعب', lines: [{ qty: 1, unitPrice: 42 }] },
  { reference: '148', createdAt: '2026-09-01T15:07:00', product: 'حدوتة كيده عصافيري برازيلي', lines: [{ qty: 1, unitPrice: 78.5 }] },
  { reference: '149', createdAt: '2026-09-01T15:10:00', product: 'كفتة حلال عائلي 1 كجم', lines: [{ qty: 1, unitPrice: 75 }] },
  { reference: '150', createdAt: '2026-09-01T15:12:00', product: 'قشطة لامدي 100جم', lines: [{ qty: 1, unitPrice: 15.5 }, { qty: 1, unitPrice: 15.5 }] },
  { reference: '151', createdAt: '2026-09-01T15:14:00', product: 'موزريلا الحمد 1 ك', lines: [{ qty: 1, unitPrice: 68 }, { qty: 1, unitPrice: 68 }, { qty: 1, unitPrice: 68 }] },
  { reference: '152', createdAt: '2026-09-01T15:16:00', product: 'حدوتة كيده شرائح برازيلي 500 جم', lines: [{ qty: 0.5, unitPrice: 157 }, { qty: 0.5, unitPrice: 157 }] },
];

async function seedDemo() {
  // Display-only attribution author. Inactive + random password: cannot log in.
  const clerk = await prisma.user.upsert({
    where: { username: 'محمد المراكبي' },
    update: {},
    create: {
      fullName: 'محمد المراكبي',
      username: 'محمد المراكبي',
      passwordHash: await bcrypt.hash(randomUUID(), 10),
      role: 'employee',
      permissionLevel: 10,
      isOwner: false,
      isActive: false,
      forcePasswordChange: false,
    },
  });

  await prisma.category.upsert({ where: { name: 'منتجات الألبان' }, update: {}, create: { name: 'منتجات الألبان' } });

  const productIds = new Map<string, { id: string; categoryId: string | null }>();
  for (const p of DEMO_PRODUCTS) {
    const cat = await prisma.category.findUnique({ where: { name: p.category } });
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    const product = existing
      ? await prisma.product.update({ where: { id: existing.id }, data: { basePrice: p.basePrice, categoryId: cat?.id ?? null, ...(p.barcode ? { barcode: p.barcode } : {}) } })
      : await prisma.product.create({
          data: { name: p.name, type: 'stock', basePrice: p.basePrice, categoryId: cat?.id ?? null, ...(p.barcode ? { barcode: p.barcode } : {}) },
        });
    productIds.set(p.name, { id: product.id, categoryId: product.categoryId });
    await prisma.inventory.upsert({
      where: { productId_branchId: { productId: product.id, branchId: 'branch-main' } },
      update: {},
      create: { productId: product.id, branchId: 'branch-main', quantity: 100 },
    });
  }

  // Idempotent: wipe previous demo rows (items cascade), then recreate.
  await prisma.stockMovement.deleteMany({ where: { note: 'SEED_DEMO' } });
  await prisma.order.deleteMany({ where: { reference: { in: DEMO_ORDERS.map((o) => o.reference) } } });

  for (const o of DEMO_ORDERS) {
    const prod = productIds.get(o.product);
    if (!prod) continue;
    const total = o.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
    const created = await prisma.order.create({
      data: {
        reference: o.reference,
        type: 'pickup',
        status: 'confirmed',
        paymentMethod: 'cash',
        subtotal: total,
        discountTotal: 0,
        deliveryFee: 0,
        total,
        userId: clerk.id,
        branchId: 'branch-main',
        customerId: null,
        createdAt: new Date(o.createdAt),
        updatedAt: new Date(o.createdAt),
        items: {
          create: o.lines.map((l) => ({
            productId: prod.id,
            productName: o.product,
            unitName: 'قطاعي',
            qty: l.qty,
            unitPrice: l.unitPrice,
            lineTotal: l.qty * l.unitPrice,
          })),
        },
      },
    });
    for (const l of o.lines) {
      await prisma.stockMovement.create({
        data: { productId: prod.id, branchId: 'branch-main', type: 'sale', qtyDelta: -l.qty, refId: created.id, note: 'SEED_DEMO' },
      });
    }
    await prisma.inventory.updateMany({
      where: { productId: prod.id, branchId: 'branch-main' },
      data: { quantity: { decrement: o.lines.reduce((a, l) => a + l.qty, 0) } },
    });
  }
  console.log(`Seed demo: ${DEMO_ORDERS.length} orders (143-152) + ${DEMO_PRODUCTS.length} products.`);
}

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
    'خضروات وفاكهة',
    'مياه ومشروبات',
    'مخبوزات',
    'معلبات',
    'منظفات',
    'وجبات خفيفة',
    'بقوليات',
    'أخرى',
  ];
  for (const name of cats) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('Seed complete.');
  console.log('Owner: Ahmed Elseyad / weladhalal');

  if (process.env.SEED_DEMO === 'true') {
    await seedDemo();
  } else {
    console.log('Demo rows skipped (set SEED_DEMO=true for reference-shot data, dev DB only).');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
