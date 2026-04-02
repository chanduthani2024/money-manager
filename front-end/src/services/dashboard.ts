import { apiClient } from './api';
import { DashboardSummary, MonthlySpending, YearlySpendingData } from '../types/dashboard';

export const dashboardService = {
  async getSummary(month?: number, year?: number): Promise<DashboardSummary> {
    const params: any = {};
    if (month) params.month = month;
    if (year) params.year = year;
    return apiClient.get<DashboardSummary>('/dashboard/summary', params);
  },

  async getYearlyTrend(year: number): Promise<MonthlySpending[]> {
    return apiClient.get<MonthlySpending[]>('/dashboard/yearly-trend', { year });
  },

  async getCategoryYearlySpending(year: number): Promise<YearlySpendingData[]> {
    return apiClient.get<YearlySpendingData[]>('/dashboard/category-yearly', { year });
  },
};