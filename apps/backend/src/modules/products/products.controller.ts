import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionLevelGuard } from '../../common/guards/permission-level.guard';
import { RequireLevel } from '../../common/decorators/require-level.decorator';
import { ProductsService } from './products.service';

@UseGuards(JwtAuthGuard, PermissionLevelGuard)
@Controller('api/products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Get()
  list(@Query('search') search?: string, @Query('categoryId') categoryId?: string) {
    return this.products.list(search, categoryId);
  }

  @Get('barcode/:code')
  byBarcode(@Param('code') code: string) {
    return this.products.byBarcode(code);
  }

  @RequireLevel(50)
  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.products.create(req.user.sub, dto);
  }

  @RequireLevel(50)
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.products.update(req.user.sub, id, dto);
  }
}
