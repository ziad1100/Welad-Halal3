import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionLevelGuard } from '../../common/guards/permission-level.guard';
import { RequireLevel } from '../../common/decorators/require-level.decorator';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, PermissionLevelGuard)
@Controller('api/users')
export class UsersController {
  constructor(private users: UsersService) {}

  @RequireLevel(50)
  @Get('check-username')
  check(@Query('username') username: string) {
    return this.users.checkUsername(username);
  }

  @RequireLevel(50)
  @Get()
  list() {
    return this.users.list();
  }

  @RequireLevel(50)
  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.users.create(req.user, dto);
  }

  @RequireLevel(50)
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.users.update(req.user, id, dto);
  }

  @RequireLevel(50)
  @Post(':id/reset-password')
  reset(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.users.resetPassword(req.user, id, dto.newPassword);
  }
}
