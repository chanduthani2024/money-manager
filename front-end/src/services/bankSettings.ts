import { apiClient } from './api';

export interface BankSettings {
  id: number;
  bankName: string;
  accountLastFour: string | null;
  pdfPassword: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankSettingsDto {
  bankName: string;
  accountLastFour?: string;
  pdfPassword?: string;
}

export interface UpdateBankSettingsDto {
  bankName?: string;
  accountLastFour?: string;
  pdfPassword?: string;
  isActive?: boolean;
}

export const bankSettingsService = {
  async getAll(): Promise<BankSettings[]> {
    return apiClient.get<BankSettings[]>('/bank-settings');
  },

  async create(data: CreateBankSettingsDto): Promise<BankSettings> {
    return apiClient.post<BankSettings>('/bank-settings', data);
  },

  async update(id: number, data: UpdateBankSettingsDto): Promise<BankSettings> {
    return apiClient.put<BankSettings>(`/bank-settings/${id}`, data);
  },

  async remove(id: number): Promise<void> {
    return apiClient.delete<void>(`/bank-settings/${id}`);
  },
};
