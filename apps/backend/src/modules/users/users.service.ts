import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, fullName: true, username: true, role: true, permissionLevel: true, isOwner: true, isActive: true, forcePasswordChange: true, createdAt: true },
    });
  }

  async create(actor: any, dto: any) {
    const username = String(dto.username ?? '').trim().replace(/\s+/g, ' ');
    if (!username) throw new BadRequestException('username required');
    if (!dto.password || String(dto.password).length < 4) throw new BadRequestException('password too short');
    const role = dto.role ?? 'employee';
    const level = role === 'owner' ? 100 : role === 'manager' ? 50 : 10;
    if (actor.permissionLevel < 50) throw new ForbiddenException('Forbidden');
    if (role === 'owner' && !actor.isOwner) throw new ForbiddenException('Only owner can create owners');
    const hash = await bcrypt.hash(String(dto.password), 10);
    // permissionLevel always derives from role unless the actor is the owner.
    // This closes the escalation hole where a manager could create an
    // employee row carrying permissionLevel 100.
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName ?? username,
        username,
        passwordHash: hash,
        role,
        permissionLevel: actor.isOwner && dto.permissionLevel !== undefined ? dto.permissionLevel : level,
        isActive: dto.isActive ?? true,
        forcePasswordChange: dto.forcePasswordChange ?? false,
        createdByUserId: actor.sub,
      },
    });
    await this.prisma.auditLog.create({ data: { userId: actor.sub, action: 'user.create', entity: 'User', entityId: user.id, after: { username } as any } });
    const { passwordHash: _h, ...safe } = user;
    return safe;
  }

  async update(actor: any, id: string, dto: any) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    if (target.isOwner && !actor.isOwner) throw new ForbiddenException('Only owner can edit owners');
    if (dto.role === 'owner' && !actor.isOwner) throw new ForbiddenException('Only owner can grant owner');
    // Role and level changes are owner-only: managers may edit names, active
    // flags and force-password flags, but can never escalate anyone (or self).
    if ((dto.role !== undefined || dto.permissionLevel !== undefined) && !actor.isOwner) {
      throw new ForbiddenException('Only owner can change roles');
    }
    const before = { ...target, passwordHash: undefined };
    const data: any = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.role !== undefined) {
      data.role = dto.role;
      data.permissionLevel = dto.role === 'owner' ? 100 : dto.role === 'manager' ? 50 : 10;
    }
    if (dto.permissionLevel !== undefined) data.permissionLevel = dto.permissionLevel;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.forcePasswordChange !== undefined) data.forcePasswordChange = dto.forcePasswordChange;
    const user = await this.prisma.user.update({ where: { id }, data });
    await this.prisma.auditLog.create({ data: { userId: actor.sub, action: 'user.update', entity: 'User', entityId: id, before: before as any, after: data as any } });
    const { passwordHash: _h, ...safe } = user;
    return safe;
  }

  async resetPassword(actor: any, id: string, newPassword: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    if (target.isOwner && !actor.isOwner) throw new ForbiddenException('Only owner can reset owner password');
    const hash = await bcrypt.hash(String(newPassword), 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash: hash, forcePasswordChange: true } });
    await this.prisma.auditLog.create({ data: { userId: actor.sub, action: 'user.password_reset', entity: 'User', entityId: id } });
    return { ok: true };
  }
}
