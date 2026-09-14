import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { computeDiscountAmount, discountError } from '../../common/utils/discount';

interface ConfirmLine {
  productId: string;
  unitId?: string | null;
  qty: number;
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private auth: AuthService) {}

  list(status?: string) {
    return this.prisma.order.findMany({
      where: status ? { status: status as any } : {},
      include: { items: true, customer: true, user: { select: { username: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  get(id: string) {
    return this.prisma.order.findUnique({ where: { id }, include: { items: true, customer: true, payments: true } });
  }

  private async resolveBranch(): Promise<string> {
    const b = await this.prisma.branch.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    if (!b) throw new BadRequestException('No active branch');
    return b.id;
  }

  // F12 confirm — authoritative pricing, transactional
  async confirm(userId: string, dto: { lines: ConfirmLine[]; customerId?: string; type?: 'pickup' | 'delivery'; paymentMethod?: 'cash' | 'card' | 'mixed'; deliveryFee?: number; discountCode?: string; amountPaid?: number; approvalToken?: string }) {
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
    // Large discounts need a fresh manager approval (token bound to 5 minutes).
    if (discountTotal > 0) {
      const discRaw = await this.prisma.systemSetting.findUnique({ where: { key: 'discount_approval_threshold' } });
      const discThreshold = Number(discRaw?.value ?? 200);
      if (discountTotal > discThreshold) {
        if (!dto.approvalToken) throw new ForbiddenException(`Manager approval required for discounts above ${discThreshold}`);
        const approver = await this.auth.verifyApproval(dto.approvalToken);
        await this.prisma.auditLog.create({ data: { userId, action: 'discount.approved', entity: 'DiscountCode', entityId: discountCodeId ?? undefined, after: { discountTotal, approver: approver.username } as any } });
      }
    }
    // Cash tendered is validated server-side; change is computed, never trusted.
    let amountPaid: number | null = null;
    if (dto.amountPaid !== undefined && dto.amountPaid !== null) {
      amountPaid = Number(dto.amountPaid);
      if (!Number.isFinite(amountPaid) || amountPaid < 0) throw new BadRequestException('Invalid amount paid');
      if (amountPaid < total) throw new BadRequestException(`Paid ${amountPaid.toFixed(2)} is less than total ${total.toFixed(2)}`);
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
          paymentMethod: dto.paymentMethod ?? 'cash',
          subtotal,
          discountTotal,
          deliveryFee,
          total,
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
      if (amountPaid !== null) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            method: (dto.paymentMethod ?? 'cash') as any,
            amount: amountPaid,
            change: Math.max(0, amountPaid - total),
            createdById: userId,
          },
        });
      }
      const saved = await tx.order.findUnique({ where: { id: order.id }, include: { items: true, payments: true } });
      await tx.auditLog.create({ data: { userId, action: 'order.confirm', entity: 'Order', entityId: order.id, after: { reference, total, amountPaid } as any } });
      return saved;
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
    await this.prisma.auditLog.create({ data: { userId, action: 'order.hold', entity: 'Order', entityId: order.id, after: { reference: order.reference, total: order.total } as any } });
    return order;
  }

  async cancel(actor: any, id: string, approvalToken?: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'cancelled') return order;
    // Held orders move no money/stock: any authenticated user may clear them
    // (this is also the resume flow). Everything is audited.
    if (order.status !== 'confirmed') {
      await this.prisma.order.update({ where: { id }, data: { status: 'cancelled' } });
      await this.prisma.auditLog.create({ data: { userId: actor?.sub, action: 'order.cancel', entity: 'Order', entityId: id, after: { status: order.status } as any } });
      return this.get(id);
    }
    // Confirmed orders move money: manager+ required, plus a fresh manager
    // approval above the return_approval_threshold setting.
    if ((actor?.permissionLevel ?? 0) < 50) throw new ForbiddenException('Manager required');
    const thresholdRaw = await this.prisma.systemSetting.findUnique({ where: { key: 'return_approval_threshold' } });
    const threshold = Number(thresholdRaw?.value ?? 500);
    let approver: any = null;
    if (order.total > threshold) {
      if (!approvalToken) throw new ForbiddenException(`Manager approval required above ${threshold}`);
      approver = await this.auth.verifyApproval(approvalToken);
    }
    // restock confirmed orders
    await this.prisma.$transaction(async (tx) => {
      for (const it of order.items) {
        const inv = await tx.inventory.findUnique({ where: { productId_branchId: { productId: it.productId, branchId: order.branchId } } });
        if (inv) await tx.inventory.update({ where: { id: inv.id }, data: { quantity: inv.quantity + it.qty } });
        await tx.stockMovement.create({ data: { productId: it.productId, branchId: order.branchId, type: 'return_in', qtyDelta: it.qty, refId: order.id } });
      }
      await tx.order.update({ where: { id }, data: { status: 'cancelled' } });
      await tx.payment.create({
        data: { orderId: id, method: order.paymentMethod as any, amount: -order.total, change: 0, createdById: actor?.sub ?? null },
      });
    });
    await this.prisma.auditLog.create({ data: { userId: actor?.sub, action: 'order.cancel', entity: 'Order', entityId: id, after: { total: order.total, approver: approver?.username ?? null } as any } });
    return this.get(id);
  }
}
