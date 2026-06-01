import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Eye, EyeOff, Pencil, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { bankSettingsService, BankSettings, CreateBankSettingsDto } from '../services/bankSettings';

const SUPPORTED_BANKS = ['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'Other'];

export const SettingsPage: React.FC = () => {
  const [bankSettings, setBankSettings] = useState<BankSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});
  const [form, setForm] = useState<CreateBankSettingsDto>({
    bankName: '',
    accountLastFour: '',
    pdfPassword: '',
  });
  const [editForm, setEditForm] = useState<Partial<CreateBankSettingsDto & { isActive: boolean }>>({});

  useEffect(() => {
    fetchBankSettings();
  }, []);

  const fetchBankSettings = async () => {
    try {
      setLoading(true);
      const data = await bankSettingsService.getAll();
      setBankSettings(data);
    } catch {
      toast.error('Failed to load bank settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.bankName.trim()) {
      toast.error('Bank name is required');
      return;
    }
    try {
      const payload: CreateBankSettingsDto = {
        bankName: form.bankName,
        ...(form.accountLastFour ? { accountLastFour: form.accountLastFour } : {}),
        ...(form.pdfPassword ? { pdfPassword: form.pdfPassword } : {}),
      };
      await bankSettingsService.create(payload);
      toast.success('Bank added successfully');
      setForm({ bankName: '', accountLastFour: '', pdfPassword: '' });
      setShowAddForm(false);
      fetchBankSettings();
    } catch {
      toast.error('Failed to add bank');
    }
  };

  const handleEdit = (setting: BankSettings) => {
    setEditingId(setting.id);
    setEditForm({
      bankName: setting.bankName,
      accountLastFour: setting.accountLastFour ?? '',
      pdfPassword: setting.pdfPassword ?? '',
      isActive: setting.isActive,
    });
  };

  const handleSaveEdit = async (id: number) => {
    try {
      await bankSettingsService.update(id, {
        bankName: editForm.bankName,
        accountLastFour: editForm.accountLastFour || undefined,
        pdfPassword: editForm.pdfPassword || undefined,
        isActive: editForm.isActive,
      });
      toast.success('Bank updated');
      setEditingId(null);
      fetchBankSettings();
    } catch {
      toast.error('Failed to update bank');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remove this bank configuration?')) return;
    try {
      await bankSettingsService.remove(id);
      toast.success('Bank removed');
      fetchBankSettings();
    } catch {
      toast.error('Failed to remove bank');
    }
  };

  const toggleShowPassword = (id: number) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your bank configurations for PDF statement imports</p>
      </div>

      {/* Bank Settings Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-800">Bank Accounts</h2>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Bank
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Add Form */}
          {showAddForm && (
            <div className="border border-primary-200 bg-primary-50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-gray-700 text-sm">New Bank Configuration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Bank Name</label>
                  <select
                    value={form.bankName}
                    onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  >
                    <option value="">Select bank</option>
                    {SUPPORTED_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Last 4 digits of account (optional)</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 8799"
                    value={form.accountLastFour}
                    onChange={e => setForm(f => ({ ...f, accountLastFour: e.target.value.replace(/\D/g, '') }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">PDF Password (optional)</label>
                  <input
                    type="password"
                    placeholder="Statement password"
                    value={form.pdfPassword}
                    onChange={e => setForm(f => ({ ...f, pdfPassword: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Bank List */}
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
          ) : bankSettings.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No banks configured. Add a bank to enable PDF statement imports.
            </div>
          ) : (
            <div className="space-y-2">
              {bankSettings.map(setting => (
                <div
                  key={setting.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    setting.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                  }`}
                >
                  {editingId === setting.id ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 mr-4">
                      <select
                        value={editForm.bankName}
                        onChange={e => setEditForm(f => ({ ...f, bankName: e.target.value }))}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                      >
                        {SUPPORTED_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="Last 4 digits"
                        value={editForm.accountLastFour ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, accountLastFour: e.target.value.replace(/\D/g, '') }))}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                      />
                      <input
                        type="password"
                        placeholder="PDF password"
                        value={editForm.pdfPassword ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, pdfPassword: e.target.value }))}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{setting.bankName} Bank</p>
                        <p className="text-xs text-gray-400">
                          {setting.accountLastFour ? `Account ending ••••${setting.accountLastFour}` : 'All accounts'}
                          {setting.pdfPassword && (
                            <span className="ml-2 inline-flex items-center gap-1">
                              · PDF password saved
                              <button
                                onClick={() => toggleShowPassword(setting.id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {showPassword[setting.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                              {showPassword[setting.id] && (
                                <span className="font-mono text-gray-600">{setting.pdfPassword}</span>
                              )}
                            </span>
                          )}
                        </p>
                      </div>
                      {!setting.isActive && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {editingId === setting.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(setting.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(setting)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(setting.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
