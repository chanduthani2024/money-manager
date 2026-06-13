import { apiClient } from './api';
import { Category, ExpenseReason } from '../types/budget';

export const categoryService = {
  async getAll(): Promise<Category[]> {
    return apiClient.get<Category[]>('/categories');
  },

  async getOne(id: number): Promise<Category> {
    return apiClient.get<Category>(`/categories/${id}`);
  },

  async create(data: Omit<Category, 'id' | 'expenseReasons'>): Promise<Category> {
    return apiClient.post<Category>('/categories', data);
  },

  async update(id: number, data: Partial<Omit<Category, 'id' | 'expenseReasons'>>): Promise<Category> {
    return apiClient.patch<Category>(`/categories/${id}`, data);
  },

  async initializeDefaults(): Promise<void> {
    return apiClient.post<void>('/categories/initialize');
  },
};

export const expenseReasonService = {
  async getAll(): Promise<ExpenseReason[]> {
    return apiClient.get<ExpenseReason[]>('/expense-reasons');
  },

  async getOne(id: number): Promise<ExpenseReason> {
    return apiClient.get<ExpenseReason>(`/expense-reasons/${id}`);
  },

  async getByCategory(categoryId: number): Promise<ExpenseReason[]> {
    return apiClient.get<ExpenseReason[]>(`/expense-reasons/category/${categoryId}`);
  },

  async create(data: Omit<ExpenseReason, 'id' | 'category'>): Promise<ExpenseReason> {
    return apiClient.post<ExpenseReason>('/expense-reasons', data);
  },

  async update(id: number, data: Partial<Omit<ExpenseReason, 'id' | 'category'>>): Promise<ExpenseReason> {
    return apiClient.put<ExpenseReason>(`/expense-reasons/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete<void>(`/expense-reasons/${id}`);
  },

  async initializeDefaults(): Promise<void> {
    return apiClient.post<void>('/expense-reasons/initialize');
  },
};