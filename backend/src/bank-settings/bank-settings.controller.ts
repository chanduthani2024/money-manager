import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BankSettingsService } from './bank-settings.service';
import { CreateBankSettingsDto, UpdateBankSettingsDto } from './dto/bank-settings.dto';

@Controller('bank-settings')
@UseGuards(JwtAuthGuard)
export class BankSettingsController {
  constructor(private readonly bankSettingsService: BankSettingsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.bankSettingsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.bankSettingsService.findOne(req.user.id, +id);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateBankSettingsDto) {
    return this.bankSettingsService.create(req.user.id, dto);
  }

  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateBankSettingsDto) {
    return this.bankSettingsService.update(req.user.id, +id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.bankSettingsService.remove(req.user.id, +id);
  }
}
