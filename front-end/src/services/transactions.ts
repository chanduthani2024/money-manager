import { apiClient } from './api';
import { Transaction, CreateTransaction, UpdateTransaction, GmailSyncResponse } from '../types/budget';

interface TransactionFilters {
  month?: number;
  year?: number;
  categoryId?: number;
  expenseReasonId?: number;
}

export const transactionService = {
  async getAll(filters?: TransactionFilters): Promise<Transaction[]> {
    return apiClient.get<Transaction[]>('/transactions', filters);
  },

  async getOne(id: number): Promise<Transaction> {
    return apiClient.get<Transaction>(`/transactions/${id}`);
  },

  async create(data: CreateTransaction): Promise<Transaction> {
    return apiClient.post<Transaction>('/transactions', data);
  },

  async update(id: number, data: UpdateTransaction): Promise<Transaction> {
    return apiClient.put<Transaction>(`/transactions/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete<void>(`/transactions/${id}`);
  },

  async getMonthlySpending(year: number): Promise<any[]> {
    return apiClient.get<any[]>(`/transactions/monthly-spending/${year}`);
  },

  async getCategorySpending(month: number, year: number): Promise<any[]> {
    return apiClient.get<any[]>(`/transactions/category-spending/${month}/${year}`);
  },

  async syncEmails(startDate: string, endDate: string): Promise<GmailSyncResponse> {
    return apiClient.post<GmailSyncResponse>('/transactions/sync-emails', { startDate, endDate });
  },
};