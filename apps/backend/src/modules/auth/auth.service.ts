import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { normalizeUsername } from '../../common/utils/username';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const normalized = normalizeUsername(dto.username);
    const user = await this.prisma.user.findFirst({
      where: {
        username: { equals: normalized, mode: 'insensitive' },
        isActive: true,
      },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      permissionLevel: user.permissionLevel,
      isOwner: user.isOwner,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        permissionLevel: user.permissionLevel,
        isOwner: user.isOwner,
        forcePasswordChange: user.forcePasswordChange,
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Unauthorized');
    const { passwordHash: _h, ...safe } = user;
    return safe;
  }

  /**
   * Manager approval: re-verifies a manager/owner's credentials against the
   * real auth system and returns a short-lived approval token bound to one
   * action+order. No session is issued. Every attempt is audited.
   */
  async approve(username: string, password: string) {
    const normalized = normalizeUsername(username);
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: normalized, mode: 'insensitive' }, isActive: true },
    });
    const valid = user ? await bcrypt.compare(String(password ?? ''), user.passwordHash) : false;
    if (!user || !valid || user.permissionLevel < 50) {
      await this.prisma.auditLog.create({ data: { action: 'auth.approve_failed', entity: 'User', entityId: user?.id, after: { username: normalized } as any } });
      throw new UnauthorizedException('Manager approval failed');
    }
    await this.prisma.auditLog.create({ data: { userId: user.id, action: 'auth.approve', entity: 'User', entityId: user.id } });
    const approvalToken = await this.jwtService.signAsync(
      { purpose: 'approval', sub: user.id, username: user.username, permissionLevel: user.permissionLevel },
      { expiresIn: '5m' },
    );
    return { approvalToken, manager: { id: user.id, username: user.username, permissionLevel: user.permissionLevel } };
  }

  /** Verify a single-action approval token; throws when invalid/expired. */
  async verifyApproval(token: string) {
    try {
      const p: any = await this.jwtService.verifyAsync(token);
      if (p?.purpose !== 'approval' || !p?.sub || (p?.permissionLevel ?? 0) < 50) throw new Error('bad approval');
      const mgr = await this.prisma.user.findUnique({ where: { id: p.sub } });
      if (!mgr || !mgr.isActive || mgr.permissionLevel < 50) throw new Error('approver invalid');
      return { managerId: mgr.id, username: mgr.username, permissionLevel: mgr.permissionLevel };
    } catch {
      throw new ForbiddenException('Manager approval required');
    }
  }
}
