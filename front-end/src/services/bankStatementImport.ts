import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

export interface ImportResult {
  importId: number;
  bankName: string;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  status: 'completed' | 'failed';
  errorMessage?: string;
}

export interface ImportHistoryItem {
  id: number;
  bankName: string;
  accountLastFour: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export const bankStatementImportService = {
  async importPdf(file: File, bankSettingsId: number): Promise<ImportResult> {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bankSettingsId', bankSettingsId.toString());

    const response = await axios.post<ImportResult>(`${BASE_URL}/bank-statements/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getHistory(): Promise<ImportHistoryItem[]> {
    const token = localStorage.getItem('token');
    const response = await axios.get<ImportHistoryItem[]>(`${BASE_URL}/bank-statements/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};
