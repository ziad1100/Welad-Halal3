import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';

@UseGuards(JwtAuthGuard)
@Controller('api/orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.orders.list(status);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.orders.get(id);
  }

  @Post('confirm')
  confirm(@Req() req: any, @Body() dto: any) {
    return this.orders.confirm(req.user.sub, dto);
  }

  @Post('hold')
  hold(@Req() req: any, @Body() dto: any) {
    return this.orders.hold(req.user.sub, dto);
  }

  @Post(':id/resume')
  resume(@Req() req: any, @Param('id') id: string) {
    return this.orders.resume(req.user.sub, id);
  }

  @Post(':id/return')
  returnOrder(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.orders.returnOrder(req.user.sub, id, dto ?? {});
  }

  @Post(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.orders.cancel(req.user.sub, id);
  }
}
