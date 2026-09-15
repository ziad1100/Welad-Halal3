import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async list(search?: string, categoryId?: string) {
    const where: any = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { equals: search } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    const products = await this.prisma.product.findMany({
      where,
      include: { category: true, units: { where: { isActive: true } }, inventory: true },
      orderBy: { name: 'asc' },
      take: 200,
    });
    return products.map((p) => ({
      ...p,
      categoryName: p.category?.name ?? null,
      stockQty: p.inventory.reduce((s, i) => s + i.quantity, 0),
    }));
  }

  async byBarcode(code: string) {
    const c = code.trim();
    // Redis cache first (external fallback stays non-blocking in frontend)
    const cached = await this.cache.get(`bc:${c}`);
    if (cached) return JSON.parse(cached);
    // exact match: Product.barcode first, then ProductUnit.barcode
    const product = await this.prisma.product.findFirst({
      where: { barcode: c, isActive: true },
      include: { category: true, units: { where: { isActive: true } }, inventory: true },
    });
    if (product) {
      const res = { product, unit: null };
      await this.cache.set(`bc:${c}`, JSON.stringify(res));
      return res;
    }
    const unit = await this.prisma.productUnit.findFirst({
      where: { barcode: c, isActive: true },
      include: { product: { include: { category: true, units: { where: { isActive: true } }, inventory: true } } },
    });
    if (unit) {
      const res = { product: unit.product, unit: { ...unit, product: undefined } };
      await this.cache.set(`bc:${c}`, JSON.stringify(res));
      return res;
    }
    throw new NotFoundException('Barcode not found');
  }

  async create(dto: any) {
    const { units, initialQuantity, ...rest } = dto;
    const name = String(rest.name ?? '').trim();
    if (!name) throw new BadRequestException('name required');
    const price = Number(rest.basePrice ?? rest.retailPrice ?? 0);
    if (Number.isNaN(price) || price < 0) throw new BadRequestException('price must be >= 0');
    if (rest.barcode) {
      const dup = await this.prisma.product.findFirst({ where: { barcode: String(rest.barcode).trim() } });
      if (dup) throw new BadRequestException('barcode already exists');
    }
    // map spec fields: categoryId/unit/retailPrice/description -> schema fields
    const data: any = { ...rest, name, basePrice: price };
    if (dto.retailPrice !== undefined && dto.basePrice === undefined) data.basePrice = Number(dto.retailPrice);
    if (dto.unit && !units) {
      // single default unit from spec unit string
    }
    const p = await this.prisma.product.create({
      data: {
        ...data,
        barcode: data.barcode ? String(data.barcode).trim() || null : data.barcode ?? null,
        units: units
          ? { create: units }
          : data.unit || dto.retailPrice !== undefined
            ? { create: [{ unitName: dto.unit ?? 'قطعة', sellingPrice: price, conversionFactor: 1 }] }
            : undefined,
      },
      include: { units: true },
    });
    // initial stock: Inventory (branch-main default) + StockMovement adjustment
    const qty = Number(initialQuantity ?? 0);
    if (qty > 0) {
      const branch = (await this.prisma.branch.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })) as any;
      const branchId = dto.branchId ?? branch?.id ?? 'branch-main';
      await this.prisma.inventory.upsert({
        where: { productId_branchId: { productId: p.id, branchId } },
        update: { quantity: { increment: qty } },
        create: { productId: p.id, branchId, quantity: qty, avgCost: price },
      });
      await this.prisma.stockMovement.create({
        data: { productId: p.id, branchId, type: 'adjustment', qtyDelta: qty, costAtTime: price, note: 'Initial stock on product creation' },
      });
    }
    if (p.barcode) await this.cache.del(`bc:${p.barcode}`);
    return p;
  }

  async update(id: string, dto: any) {
    const { units: _u, ...rest } = dto;
    const p = await this.prisma.product.update({ where: { id }, data: rest });
    if (p.barcode) await this.cache.del(`bc:${p.barcode}`);
    return p;
  }
}
