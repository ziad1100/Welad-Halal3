import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { computeDiscountAmount, discountError } from '../../common/utils/discount';

interface ConfirmLine {
  productId: string;
  unitId?: string | null;
  qty: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  private async bustBarcodeCache(productIds: string[]) {
    for (const pid of productIds) {
      const p = await this.prisma.product.findUnique({ where: { id: pid }, include: { units: true } });
      if (!p) continue;
      if (p.barcode) await this.cache.del(`bc:${p.barcode}`).catch(() => undefined);
      for (const u of p.units) {
        if (u.barcode) await this.cache.del(`bc:${u.barcode}`).catch(() => undefined);
      }
    }
  }

  list(status?: string) {
    return this.prisma.order.findMany({
      where: status ? { status: status as any } : {},
      include: { items: true, customer: true, user: { select: { username: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  get(id: string) {
    return this.prisma.order.findUnique({ where: { id }, include: { items: true, customer: true } });
  }

  private async resolveBranch(): Promise<string> {
    const b = await this.prisma.branch.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    if (!b) throw new BadRequestException('No active branch');
    return b.id;
  }

  // F12 confirm — authoritative pricing, transactional
  async confirm(userId: string, dto: { lines: ConfirmLine[]; customerId?: string; type?: 'pickup' | 'delivery'; paymentMethod?: 'cash' | 'card' | 'mixed'; deliveryFee?: number; discountCode?: string; paid?: number; cashAmount?: number; cardAmount?: number }) {
    if (!dto.lines?.length) throw new BadRequestException('Empty cart');
    const branchId = await this.resolveBranch();

    // 1-5: validate + authoritative prices + discounts
    let subtotal = 0;
    const resolved: any[] = [];
    for (const l of dto.lines) {
      if (l.qty <= 0) throw new BadRequestException('Invalid qty');
      const product = await this.prisma.product.findUnique({ where: { id: l.productId }, include: { units: true } });
      if (!product || !product.isActive) throw new NotFoundException(`Product ${l.productId} not found`);
      let price = product.basePrice;
      let unitName: string | null = null;
      if (l.unitId) {
        const u = product.units.find((x) => x.id === l.unitId && x.isActive);
        if (!u) throw new NotFoundException('Unit not found');
        price = u.sellingPrice;
        unitName = u.unitName;
      }
      const lineTotal = price * l.qty;
      subtotal += lineTotal;
      resolved.push({ product, price, unitName, qty: l.qty, lineTotal });
    }

    let discountTotal = 0;
    let discountCodeId: string | undefined;
    if (dto.discountCode) {
      const dc = await this.prisma.discountCode.findUnique({ where: { code: dto.discountCode } });
      const err = discountError(dc);
      if (err) throw new BadRequestException(err);
      discountTotal = computeDiscountAmount(dc!.type, dc!.value, subtotal);
      discountCodeId = dc!.id;
    }

    const deliveryFee = dto.type === 'delivery' ? Number(dto.deliveryFee ?? 0) : 0;
    const total = Math.max(0, subtotal - discountTotal + deliveryFee);
    const method = dto.paymentMethod ?? 'cash';

    // payment validation (server-side, never trust frontend totals)
    let paidAmount: number | null = null;
    let changeAmount = 0;
    if (method === 'cash') {
      paidAmount = Number(dto.paid ?? total);
      if (Number.isNaN(paidAmount) || paidAmount < total)
        throw new BadRequestException('Payment amount is insufficient');
      changeAmount = paidAmount - total;
    } else if (method === 'mixed') {
      const cash = Number(dto.cashAmount ?? 0);
      const card = Number(dto.cardAmount ?? 0);
      if (Number.isNaN(cash) || Number.isNaN(card) || cash < 0 || card < 0)
        throw new BadRequestException('Invalid mixed payment amounts');
      if (Math.abs(cash + card - total) > 0.009)
        throw new BadRequestException('Cash + card must equal the order total');
      paidAmount = cash + card;
      changeAmount = 0;
    } else {
      // card: exact total, no change
      paidAmount = total;
      changeAmount = 0;
    }
    const reference = `WH-${Date.now().toString(36).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      // 6-10: inventory check + decrement + movements
      for (const r of resolved) {
        const inv = await tx.inventory.findUnique({ where: { productId_branchId: { productId: r.product.id, branchId } } });
        const avail = inv?.quantity ?? 0;
        if (avail < r.qty) throw new ConflictException(`Insufficient stock for ${r.product.name} (have ${avail}, need ${r.qty})`);
      }
      const order = await tx.order.create({
        data: {
          reference,
          type: dto.type ?? 'pickup',
          status: 'confirmed',
          paymentMethod: method,
          subtotal,
          discountTotal,
          deliveryFee,
          total,
          paidAmount,
          changeAmount,
          userId,
          branchId,
          customerId: dto.customerId ?? null,
          discountCodeId: discountCodeId ?? null,
          publicToken: randomUUID(),
        },
      });
      for (const r of resolved) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: r.product.id,
            unitId: (dto.lines.find((x) => x.productId === r.product.id)?.unitId as string) ?? null,
            productName: r.product.name,
            unitName: r.unitName,
            qty: r.qty,
            unitPrice: r.price,
            lineTotal: r.lineTotal,
          },
        });
        const inv = await tx.inventory.findUnique({ where: { productId_branchId: { productId: r.product.id, branchId } } });
        await tx.inventory.update({ where: { id: inv!.id }, data: { quantity: inv!.quantity - r.qty } });
        await tx.stockMovement.create({ data: { productId: r.product.id, branchId, type: 'sale', qtyDelta: -r.qty, refId: order.id } });
      }
      if (discountCodeId) await tx.discountCode.update({ where: { id: discountCodeId }, data: { usedCount: { increment: 1 } } });
      return tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
    }).then(async (order) => {
      await this.prisma.auditLog.create({ data: { userId, action: 'order.sale', entity: 'Order', entityId: order!.id, after: { total: order!.total } as any } });
      await this.bustBarcodeCache(resolved.map((r) => r.product.id));
      return order;
    });
  }

  // F9 hold — no stock movement
  async hold(userId: string, dto: { lines: ConfirmLine[]; customerId?: string; type?: 'pickup' | 'delivery' }) {
    if (!dto.lines?.length) throw new BadRequestException('Empty cart');
    const branchId = await this.resolveBranch();
    let subtotal = 0;
    const snap: any[] = [];
    for (const l of dto.lines) {
      const p = await this.prisma.product.findUnique({ where: { id: l.productId }, include: { units: true } });
      if (!p) throw new NotFoundException('Product not found');
      let price = p.basePrice;
      let unitName: string | null = null;
      if (l.unitId) {
        const u = p.units.find((x) => x.id === l.unitId);
        if (u) {
          price = u.sellingPrice;
          unitName = u.unitName;
        }
      }
      subtotal += price * l.qty;
      snap.push({ product: p, price, unitName, qty: l.qty });
    }
    const order = await this.prisma.order.create({
      data: {
        reference: `WH-HOLD-${Date.now().toString(36).toUpperCase()}`,
        type: (dto.type as any) ?? 'pickup',
        status: 'held',
        paymentMethod: 'cash',
        subtotal,
        total: subtotal,
        userId,
        branchId,
        customerId: dto.customerId ?? null,
        publicToken: randomUUID(),
        items: {
          create: snap.map((s) => ({
            productId: s.product.id,
            productName: s.product.name,
            unitName: s.unitName,
            qty: s.qty,
            unitPrice: s.price,
            lineTotal: s.price * s.qty,
          })),
        },
      },
      include: { items: true },
    });
    return order;
  }

  // Resume a held order: return its lines for the cart and void the hold (no stock touched)
  async resume(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'held') throw new BadRequestException('Only held orders can be resumed');
    await this.prisma.order.update({ where: { id }, data: { status: 'cancelled' } });
    await this.prisma.auditLog.create({ data: { userId, action: 'order.resume', entity: 'Order', entityId: id } });
    return order;
  }

  // Return: mark returned, restock, audit with reason
  async returnOrder(actorId: string, id: string, dto: { items?: { productId: string; qty: number }[]; reason?: string }) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'confirmed') throw new BadRequestException('Only confirmed orders can be returned');
    const toReturn = dto.items?.length
      ? dto.items
      : order.items.map((i) => ({ productId: i.productId, qty: i.qty }));
    let refund = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const r of toReturn) {
        const line = order.items.find((i) => i.productId === r.productId);
        if (!line || r.qty <= 0 || r.qty > line.qty) throw new BadRequestException('Invalid return quantity');
        refund += Number(line.unitPrice) * r.qty;
        const inv = await tx.inventory.findUnique({ where: { productId_branchId: { productId: r.productId, branchId: order.branchId } } });
        if (inv) await tx.inventory.update({ where: { id: inv.id }, data: { quantity: inv.quantity + r.qty } });
        await tx.stockMovement.create({ data: { productId: r.productId, branchId: order.branchId, type: 'return_in', qtyDelta: r.qty, refId: order.id, note: dto.reason ?? 'return' } });
      }
      await tx.order.update({ where: { id }, data: { status: 'returned' } });
    });
    await this.prisma.auditLog.create({ data: { userId: actorId, action: 'order.return', entity: 'Order', entityId: id, after: { refund, reason: dto.reason ?? null } as any } });
    await this.bustBarcodeCache(toReturn.map((r) => r.productId));
    return this.get(id);
  }

  async cancel(actorId: string, id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'cancelled') return order;
    // restock confirmed orders
    if (order.status === 'confirmed') {
      await this.prisma.$transaction(async (tx) => {
        for (const it of order.items) {
          const inv = await tx.inventory.findUnique({ where: { productId_branchId: { productId: it.productId, branchId: order.branchId } } });
          if (inv) await tx.inventory.update({ where: { id: inv.id }, data: { quantity: inv.quantity + it.qty } });
          await tx.stockMovement.create({ data: { productId: it.productId, branchId: order.branchId, type: 'return_in', qtyDelta: it.qty, refId: order.id } });
        }
        await tx.order.update({ where: { id }, data: { status: 'cancelled' } });
      });
      await this.prisma.auditLog.create({ data: { userId: actorId, action: 'order.cancel', entity: 'Order', entityId: id } });
      return this.get(id);
    }
    return this.prisma.order.update({ where: { id }, data: { status: 'cancelled' } });
  }
}
