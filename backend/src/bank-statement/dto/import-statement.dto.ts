export class ImportStatementDto {
  bankSettingsId: number;
}

export interface ImportResult {
  importId: number;
  bankName: string;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  status: 'completed' | 'failed';
  errorMessage?: string;
}
