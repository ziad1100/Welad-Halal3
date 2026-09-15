import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  list(employeeId?: string, branchId?: string) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (branchId) where.branchId = branchId;
    return this.prisma.shift.findMany({ where, include: { employee: { include: { user: { select: { username: true, fullName: true } } } } }, orderBy: { openedAt: 'desc' }, take: 200 });
  }

  async current(userId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { userId } });
    if (!employee) return null;
    return this.prisma.shift.findFirst({ where: { employeeId: employee.id, status: 'open' }, orderBy: { openedAt: 'desc' } });
  }

  open(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({ where: { userId } });
      if (!employee) throw new BadRequestException('No employee record for user');
      const open = await tx.shift.findFirst({ where: { employeeId: employee.id, status: 'open' } });
      if (open) throw new BadRequestException('Shift already open');
      const branch = await tx.branch.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
      if (!branch) throw new BadRequestException('No active branch');
      return tx.shift.create({ data: { employeeId: employee.id, branchId: branch.id, openingCash: 0 } });
    });
  }

  async openWithCash(userId: string, openingCash: number) {
    const s: any = await this.open(userId);
    return this.prisma.shift.update({ where: { id: s.id }, data: { openingCash } });
  }

  async close(actorId: string, id: string, closingCash: number) {
    const s = await this.prisma.shift.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Shift not found');
    if (s.status === 'closed') throw new BadRequestException('Already closed');
    // expected = opening + gross cash sales (confirmed AND later-returned) - cash refunds.
    // Returned orders count on both sides so a fully-returned sale nets to zero,
    // matching the physical drawer (cash in, then cash out).
    const sales = await this.prisma.order.aggregate({
      where: { branchId: s.branchId, status: { in: ['confirmed', 'returned'] }, createdAt: { gte: s.openedAt }, paymentMethod: { in: ['cash', 'mixed'] } },
      _sum: { total: true },
    });
    const refunds = await this.prisma.order.aggregate({
      where: { branchId: s.branchId, status: 'returned', createdAt: { gte: s.openedAt }, paymentMethod: { in: ['cash', 'mixed'] } },
      _sum: { total: true },
    });
    const cashSales = sales._sum.total ?? 0;
    const cashRefunds = refunds._sum.total ?? 0;
    const expected = s.openingCash + cashSales - cashRefunds;
    const discrepancy = closingCash - expected;
    let updated: any;
    try {
      updated = await this.prisma.shift.update({
        where: { id },
        data: { status: 'closed', closingCash, expectedCash: expected, discrepancyAmount: discrepancy, closedAt: new Date() } as any,
      });
    } catch {
      // fallback if discrepancyAmount column not yet migrated
      updated = await this.prisma.shift.update({
        where: { id },
        data: { status: 'closed', closingCash, expectedCash: expected, closedAt: new Date() },
      });
      updated.discrepancyAmount = discrepancy;
    }
    const threshold = Number((await this.prisma.systemSetting.findUnique({ where: { key: 'cash_discrepancy_threshold' } }))?.value ?? 20);
    const diff = Math.abs(discrepancy);
    await this.prisma.auditLog.create({ data: { userId: actorId, action: diff > threshold ? 'shift.discrepancy' : 'shift.close', entity: 'Shift', entityId: id, after: { closingCash, expectedCash: expected, diff } as any } });
    return { ...updated, discrepancy, alert: diff > threshold };
  }
}
