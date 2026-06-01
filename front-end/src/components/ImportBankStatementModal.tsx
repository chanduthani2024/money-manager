import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { bankSettingsService, BankSettings } from '../services/bankSettings';
import { bankStatementImportService, ImportResult } from '../services/bankStatementImport';

interface Props {
  onClose: () => void;
  onImported: () => void;
}

type Step = 'select' | 'uploading' | 'done' | 'error';

export const ImportBankStatementModal: React.FC<Props> = ({ onClose, onImported }) => {
  const [bankSettingsList, setBankSettingsList] = useState<BankSettings[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bankSettingsService.getAll().then(data => {
      setBankSettingsList(data.filter(b => b.isActive));
      if (data.length === 1) setSelectedBankId(data[0].id);
    }).finally(() => setLoadingBanks(false));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type === 'application/pdf') setFile(f);
  };

  const handleImport = async () => {
    if (!file || !selectedBankId) return;
    setStep('uploading');
    try {
      const res = await bankStatementImportService.importPdf(file, selectedBankId);
      setResult(res);
      setStep(res.status === 'completed' ? 'done' : 'error');
      if (res.status === 'completed' && res.importedCount > 0) {
        onImported();
      }
    } catch (err: any) {
      setResult({
        importId: 0,
        bankName: '',
        totalRows: 0,
        importedCount: 0,
        skippedCount: 0,
        status: 'failed',
        errorMessage: err.response?.data?.message ?? err.message ?? 'Upload failed',
      });
      setStep('error');
    }
  };

  const selectedBank = bankSettingsList.find(b => b.id === selectedBankId);
  const canImport = !!file && !!selectedBankId && step === 'select';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Import Bank Statement</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {step === 'uploading' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="h-12 w-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
              <p className="text-gray-600 text-sm">Parsing your statement and importing transactions...</p>
            </div>
          )}

          {step === 'done' && result && (
            <div className="flex flex-col items-center py-6 gap-4 text-center">
              <CheckCircle className="h-14 w-14 text-green-500" />
              <div>
                <p className="text-lg font-semibold text-gray-800">Import Complete</p>
                <p className="text-sm text-gray-500 mt-1">{result.bankName} Bank Statement</p>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full mt-2">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-800">{result.totalRows}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Total rows</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{result.importedCount}</p>
                  <p className="text-xs text-green-400 mt-0.5">Imported</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{result.skippedCount}</p>
                  <p className="text-xs text-amber-400 mt-0.5">Skipped</p>
                </div>
              </div>
              {result.skippedCount > 0 && (
                <p className="text-xs text-gray-400">Skipped rows are duplicates already in your account.</p>
              )}
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors mt-2"
              >
                Done
              </button>
            </div>
          )}

          {step === 'error' && result && (
            <div className="flex flex-col items-center py-6 gap-4 text-center">
              <AlertCircle className="h-14 w-14 text-red-400" />
              <div>
                <p className="text-lg font-semibold text-gray-800">Import Failed</p>
                {result.errorMessage && (
                  <p className="text-sm text-red-500 mt-1 max-w-xs">{result.errorMessage}</p>
                )}
              </div>
              <button
                onClick={() => setStep('select')}
                className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {step === 'select' && (
            <>
              {/* Bank selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account</label>
                {loadingBanks ? (
                  <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ) : bankSettingsList.length === 0 ? (
                  <div className="text-sm text-gray-400 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    No bank accounts configured. Go to <span className="font-medium text-amber-600">Settings → Bank Accounts</span> to add one.
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedBankId ?? ''}
                      onChange={e => setSelectedBankId(Number(e.target.value))}
                      className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                    >
                      {bankSettingsList.length > 1 && <option value="">Select bank</option>}
                      {bankSettingsList.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} Bank{b.accountLastFour ? ` (••••${b.accountLastFour})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* File drop zone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statement PDF</label>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    file
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-green-500" />
                      <p className="text-sm font-medium text-green-700">{file.name}</p>
                      <p className="text-xs text-green-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-gray-300" />
                      <p className="text-sm text-gray-500">Drag & drop or click to select PDF</p>
                      <p className="text-xs text-gray-400">Password-protected statements are supported</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedBank?.pdfPassword && (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                  PDF password configured for {selectedBank.bankName} Bank
                </p>
              )}

              <button
                disabled={!canImport}
                onClick={handleImport}
                className="w-full py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Import Statement
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
