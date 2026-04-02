import { apiClient } from './api';
import { MonthlyBudget, CreateMonthlyBudget } from '../types/budget';

export const budgetService = {
  async getAll(): Promise<MonthlyBudget[]> {
    return apiClient.get<MonthlyBudget[]>('/monthly-budgets');
  },

  async getOne(id: number): Promise<MonthlyBudget> {
    return apiClient.get<MonthlyBudget>(`/monthly-budgets/${id}`);
  },

  async getCurrentMonth(): Promise<MonthlyBudget> {
    return apiClient.get<MonthlyBudget>('/monthly-budgets/current');
  },

  async getByMonthYear(month: number, year: number): Promise<MonthlyBudget> {
    return apiClient.get<MonthlyBudget>(`/monthly-budgets/${month}/${year}`);
  },

  async create(data: CreateMonthlyBudget): Promise<MonthlyBudget> {
    return apiClient.post<MonthlyBudget>('/monthly-budgets', data);
  },

  async update(id: number, data: CreateMonthlyBudget): Promise<MonthlyBudget> {
    return apiClient.put<MonthlyBudget>(`/monthly-budgets/${id}`, data);
  },
};