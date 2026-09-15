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
    if (actor.role === 'employee' || actor.permissionLevel < 50) throw new ForbiddenException('Forbidden');
    if (role === 'owner') {
      throw new BadRequestException('Cannot create owner accounts');
    }
    if (!['manager', 'employee'].includes(role)) throw new BadRequestException('invalid role');
    // managers CAN create other managers per confirmed rule — allowed
    const level = role === 'manager' ? 50 : 10;
    const hash = await bcrypt.hash(String(dto.password), 10);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName ?? username,
        username,
        passwordHash: hash,
        role,
        permissionLevel: dto.permissionLevel ?? level,
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
    // nobody edits/deletes the owner except themself
    if (target.role === 'owner' && actor.sub !== target.id) throw new ForbiddenException('Forbidden');
    // only Owner (or self) can edit/delete a Manager
    if (target.role === 'manager' && actor.role !== 'owner' && actor.sub !== target.id) {
      // allow via permissionLevel fallback for legacy tokens without role
      if (!(actor.permissionLevel >= 100)) throw new ForbiddenException('Forbidden');
    }
    if (target.isOwner && !actor.isOwner) throw new ForbiddenException('Only owner can edit owners');
    if (dto.role === 'owner' && !actor.isOwner) throw new ForbiddenException('Only owner can grant owner');
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
    if (target.role === 'owner' && actor.sub !== target.id && !actor.isOwner)
      throw new ForbiddenException('Only owner can reset owner password');
    if (target.isOwner && !actor.isOwner) throw new ForbiddenException('Only owner can reset owner password');
    const hash = await bcrypt.hash(String(newPassword), 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash: hash, forcePasswordChange: true } });
    await this.prisma.auditLog.create({ data: { userId: actor.sub, action: 'user.password_reset', entity: 'User', entityId: id } });
    return { ok: true };
  }

  async checkUsername(username: string) {
    const u = String(username ?? '').trim();
    if (!u) return { available: false };
    const existing = await this.prisma.user.findFirst({ where: { username: { equals: u, mode: 'insensitive' } } });
    return { available: !existing };
  }
}
