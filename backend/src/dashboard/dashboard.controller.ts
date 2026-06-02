import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getDashboardSummary(
    @Request() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const monthNum = month ? parseInt(month) : undefined;
    const yearNum = year ? parseInt(year) : undefined;
    return this.dashboardService.getDashboardSummary(req.user.id, monthNum, yearNum);
  }

  @Get('yearly-trend')
  getYearlySpendingTrend(@Request() req, @Query('year') year: string) {
    return this.dashboardService.getYearlySpendingTrend(req.user.id, parseInt(year));
  }

  @Get('category-yearly')
  getCategoryWiseYearlySpending(@Request() req, @Query('year') year: string) {
    return this.dashboardService.getCategoryWiseYearlySpending(req.user.id, parseInt(year));
  }

  @Get('spending-breakdown')
  getSpendingBreakdown(
    @Request() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    const monthNum = month ? parseInt(month) : now.getMonth() + 1;
    const yearNum = year ? parseInt(year) : now.getFullYear();
    return this.dashboardService.getSpendingBreakdown(req.user.id, monthNum, yearNum);
  }

  @Get('all-reasons')
  getAllSpendingReasons(
    @Request() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    const monthNum = month ? parseInt(month) : now.getMonth() + 1;
    const yearNum = year ? parseInt(year) : now.getFullYear();
    return this.dashboardService.getAllSpendingReasons(req.user.id, monthNum, yearNum);
  }
}