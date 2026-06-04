import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalFilter } from '../contexts/GlobalFilterContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardService } from '../services/dashboard';
import { transactionService } from '../services/transactions';
import { DashboardSummary, TopSpendingReason, SpendingReasonTransaction, SpendingBreakdownRow } from '../types/dashboard';
import { formatCurrency } from '../utils/format';
import { GmailMessage } from '../types/budget';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ImportBankStatementModal } from '../components/ImportBankStatementModal';
import {
  IndianRupee,
  CreditCard,
  Wallet,
  TrendingUp,
  AlertTriangle,
  PieChart as PieChartIcon,
  ChevronDown,
  ChevronUp,
  FileUp,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useGlobalFilter();
  const [syncFromDate, setSyncFromDate] = useState<string>('');
  const [syncToDate, setSyncToDate] = useState<string>('');
  const [syncMode, setSyncMode] = useState<'today' | '7days' | '30days' | 'custom'>('7days');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncedEmails, setSyncedEmails] = useState<GmailMessage[]>([]);
  const [syncResultAvailable, setSyncResultAvailable] = useState(false);
  const [expandedReason, setExpandedReason] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [breakdownRows, setBreakdownRows] = useState<SpendingBreakdownRow[]>([]);
  const [disabledReasons, setDisabledReasons] = useState<Set<number>>(new Set());

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [data, breakdown] = await Promise.all([
        dashboardService.getSummary(selectedMonth, selectedYear),
        dashboardService.getSpendingBreakdown(selectedMonth, selectedYear),
      ]);
      setDashboardData(data);
      setBreakdownRows(breakdown);
      setDisabledReasons(new Set());
    } catch (error: any) {
      if (error.response?.status === 404 || error.message?.includes('No budget found')) {
        // No budget found for this month - show empty state
        setDashboardData(null);
      } else {
        toast.error('Failed to fetch dashboard data');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSyncEmails = async () => {
    let startDate: string;
    let endDate: string;

    if (syncMode === 'today') {
      const today = new Date();
      startDate = today.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    } else if (syncMode === '7days') {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      startDate = sevenDaysAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    } else if (syncMode === '30days') {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    } else {
      if (!syncFromDate || !syncToDate) {
        toast.error('Please select both start and end dates for sync');
        return;
      }
      startDate = syncFromDate;
      endDate = syncToDate;
    }

    setSyncLoading(true);
    setSyncedEmails([]);
    setSyncResultAvailable(false);

    try {
      const response = await transactionService.syncEmails(startDate, endDate);
      setSyncedEmails(response.emails);
      setSyncResultAvailable(true);
      toast.success(`Synced ${response.messageCount} emails successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Email sync failed');
    } finally {
      setSyncLoading(false);
    }
    fetchDashboardData();
  };


  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getCategoryColor = (categoryType: string) => {
    switch (categoryType.toLowerCase()) {
      case 'wants': return 'bg-purple-100 text-purple-800';
      case 'needs': return 'bg-blue-100 text-blue-800';
      case 'investments': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="form-input py-1 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="form-input py-1 text-sm"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Sync Bank Emails - always visible */}
        <div className="card">
          {/* Card header: title + Import PDF */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import Transactions</h2>
              <p className="text-sm text-gray-500">Sync from Gmail or upload a bank statement PDF</p>
            </div>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <FileUp className="h-4 w-4" />
              Import PDF
            </button>
          </div>

          {/* Gmail sync controls row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <label className={`flex items-center px-3 py-1.5 rounded-md cursor-pointer text-sm font-medium transition-colors ${
                syncMode === 'today' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}>
                <input type="radio" name="syncMode" value="today" checked={syncMode === 'today'} onChange={(e) => setSyncMode(e.target.value as 'today')} className="sr-only" />
                Today
              </label>
              <label className={`flex items-center px-3 py-1.5 rounded-md cursor-pointer text-sm font-medium transition-colors ${
                syncMode === '7days' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}>
                <input type="radio" name="syncMode" value="7days" checked={syncMode === '7days'} onChange={(e) => setSyncMode(e.target.value as '7days')} className="sr-only" />
                7 days
              </label>
              <label className={`flex items-center px-3 py-1.5 rounded-md cursor-pointer text-sm font-medium transition-colors ${
                syncMode === '30days' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}>
                <input type="radio" name="syncMode" value="30days" checked={syncMode === '30days'} onChange={(e) => setSyncMode(e.target.value as '30days')} className="sr-only" />
                30 days
              </label>
              <label className={`flex items-center px-3 py-1.5 rounded-md cursor-pointer text-sm font-medium transition-colors ${
                syncMode === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}>
                <input type="radio" name="syncMode" value="custom" checked={syncMode === 'custom'} onChange={(e) => setSyncMode(e.target.value as 'custom')} className="sr-only" />
                Custom
              </label>
            </div>
            {syncMode === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={syncFromDate} onChange={(e) => { setSyncFromDate(e.target.value); setSyncResultAvailable(false); }} className="form-input text-sm py-1.5 px-2 w-32" />
                <span className="text-gray-400 text-sm">to</span>
                <input type="date" value={syncToDate} onChange={(e) => { setSyncToDate(e.target.value); setSyncResultAvailable(false); }} className="form-input text-sm py-1.5 px-2 w-32" />
              </div>
            )}
            <button onClick={handleSyncEmails} disabled={syncLoading} className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {syncLoading ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Syncing...</>
              ) : (
                <><CreditCard className="h-4 w-4 mr-2" />Sync Gmail</>
              )}
            </button>
          </div>
          {syncedEmails.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  <span>Synced Emails ({syncedEmails.length})</span>
                  <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div className="mt-3 space-y-2">
                  {syncedEmails.map((email, index) => (
                    <div key={email.messageId || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <CreditCard className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{email.subject || 'No subject'}</p>
                          <p className="text-xs text-gray-600 truncate">From: {email.from}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">{new Date(email.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
          {syncResultAvailable && syncedEmails.length === 0 && !syncLoading && (
            <div className="mt-4 text-center py-4">
              <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No bank emails found for this period</p>
            </div>
          )}
        </div>

        {/* No budget empty state */}
        <div className="text-center py-12">
          <PieChartIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No budget data</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create a monthly budget for {selectedMonth}/{selectedYear} to see your dashboard.
          </p>
          <div className="mt-6">
            <a href="/budget" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
              Create Budget
            </a>
          </div>
        </div>

        {showImportModal && (
          <ImportBankStatementModal
            onClose={() => setShowImportModal(false)}
            onImported={fetchDashboardData}
          />
        )}
      </div>
    );
  }

  const budgetUsedPercentage = dashboardData.totalSalary > 0
    ? (dashboardData.totalSpent / dashboardData.totalSalary) * 100
    : 0;

  const topSpendingReasons = dashboardData.topSpendingReasons ?? [];
  const maxReasonAmount = topSpendingReasons.length > 0 ? topSpendingReasons[0].totalAmount : 1;

  const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; text: string }> = {
    needs:       { label: 'Needs',       color: '#3B82F6', bg: 'bg-blue-100',   text: 'text-blue-700' },
    wants:       { label: 'Wants',       color: '#8B5CF6', bg: 'bg-purple-100', text: 'text-purple-700' },
    investments: { label: 'Investments', color: '#10B981', bg: 'bg-green-100',  text: 'text-green-700' },
  };

  const toggleReason = (id: number) => {
    setDisabledReasons(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const activeRows = breakdownRows.filter(r => !disabledReasons.has(r.reasonId));

  const spendingByType = activeRows.reduce<Record<string, number>>((acc, r) => {
    const key = r.categoryType || 'uncategorized';
    acc[key] = (acc[key] ?? 0) + r.totalAmount;
    return acc;
  }, {});

  const totalTypeSpent = Object.values(spendingByType).reduce((s: number, v: number) => s + v, 0);

  const donutData: { type: string; label: string; color: string; amount: number; percentage: number }[] =
    (Object.entries(spendingByType) as [string, number][])
      .filter(([, amount]) => amount > 0)
      .map(([type, amount]) => ({
        type,
        label: TYPE_CONFIG[type]?.label ?? type,
        color: TYPE_CONFIG[type]?.color ?? '#9CA3AF',
        amount,
        percentage: totalTypeSpent > 0 ? (amount / totalTypeSpent) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="form-input py-1 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="form-input py-1 text-sm"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="card">
        {/* Card header: title + Import PDF */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Import Transactions</h2>
            <p className="text-sm text-gray-500">Sync from Gmail or upload a bank statement PDF</p>
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <FileUp className="h-4 w-4" />
            Import PDF
          </button>
        </div>

        {/* Gmail sync controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <label className={`flex items-center px-3 py-1.5 rounded-md cursor-pointer text-sm font-medium transition-colors ${
              syncMode === 'today' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
              <input type="radio" name="syncMode" value="today" checked={syncMode === 'today'} onChange={(e) => setSyncMode(e.target.value as 'today')} className="sr-only" />
              Today
            </label>
            <label className={`flex items-center px-3 py-1.5 rounded-md cursor-pointer text-sm font-medium transition-colors ${
              syncMode === '7days' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
              <input type="radio" name="syncMode" value="7days" checked={syncMode === '7days'} onChange={(e) => setSyncMode(e.target.value as '7days')} className="sr-only" />
              7 days
            </label>
            <label className={`flex items-center px-3 py-1.5 rounded-md cursor-pointer text-sm font-medium transition-colors ${
              syncMode === '30days' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
              <input type="radio" name="syncMode" value="30days" checked={syncMode === '30days'} onChange={(e) => setSyncMode(e.target.value as '30days')} className="sr-only" />
              30 days
            </label>
            <label className={`flex items-center px-3 py-1.5 rounded-md cursor-pointer text-sm font-medium transition-colors ${
              syncMode === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
              <input type="radio" name="syncMode" value="custom" checked={syncMode === 'custom'} onChange={(e) => setSyncMode(e.target.value as 'custom')} className="sr-only" />
              Custom
            </label>
          </div>
          {syncMode === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={syncFromDate} onChange={(e) => { setSyncFromDate(e.target.value); setSyncResultAvailable(false); }} className="form-input text-sm py-1.5 px-2 w-32" />
              <span className="text-gray-400 text-sm">to</span>
              <input type="date" value={syncToDate} onChange={(e) => { setSyncToDate(e.target.value); setSyncResultAvailable(false); }} className="form-input text-sm py-1.5 px-2 w-32" />
            </div>
          )}
          <button onClick={handleSyncEmails} disabled={syncLoading} className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {syncLoading ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Syncing...</>
            ) : (
              <><CreditCard className="h-4 w-4 mr-2" />Sync Gmail</>
            )}
          </button>
        </div>

        {syncedEmails.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                <span>Synced Emails ({syncedEmails.length})</span>
                <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-3 space-y-2">
                {syncedEmails.map((email, index) => (
                  <div key={email.messageId || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CreditCard className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{email.subject || 'No subject'}</p>
                        <p className="text-xs text-gray-600 truncate">From: {email.from}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {new Date(email.date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {syncResultAvailable && syncedEmails.length === 0 && !syncLoading && (
          <div className="mt-4 text-center py-4">
            <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No bank emails found for this period</p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <IndianRupee className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Credited</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardData.totalSalary)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <CreditCard className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardData.totalSpent)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <Wallet className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Remaining</p>
              <p className={`text-2xl font-bold ${
                dashboardData.totalRemaining < 0 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatCurrency(dashboardData.totalRemaining)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Budget Used</p>
              <p className={`text-2xl font-bold ${getPercentageColor(budgetUsedPercentage)}`}>
                {budgetUsedPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Spending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Category Spending</h3>
          <div className="space-y-4">
            {dashboardData.categorySpending.map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(category.categoryType || '')}`}>
                    {category.categoryName}
                  </span>
                  <span className="text-sm text-gray-600">
                    {category.percentage.toFixed(1)}%
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(category.totalSpent)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Top Transaction Reasons</h3>
            <button
              onClick={() => navigate(`/transaction-reasons`)}
              className="text-xs font-medium text-primary-500 hover:text-primary-600 hover:underline transition-colors"
            >
              View More
            </button>
          </div>
          {topSpendingReasons.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No expenses recorded this month</p>
          ) : (
            <div className="space-y-2">
              {topSpendingReasons.map((reason: TopSpendingReason, index: number) => {
                const isExpanded = expandedReason === reason.name;
                const barWidth = maxReasonAmount > 0 ? (reason.totalAmount / maxReasonAmount) * 100 : 0;
                const rankColors = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-400', 'bg-gray-300'];
                return (
                  <div key={reason.name} className="rounded-lg border border-gray-100 overflow-hidden">
                    {/* Row header — click to expand */}
                    <button
                      onClick={() => setExpandedReason(isExpanded ? null : reason.name)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">#{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-gray-800 truncate">{reason.name}</span>
                          <span className="text-sm font-semibold text-gray-900 ml-2 flex-shrink-0">
                            {formatCurrency(reason.totalAmount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${rankColors[index] ?? 'bg-gray-300'} transition-all duration-300`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {reason.transactionCount} txn{reason.transactionCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                    </button>

                    {/* Expanded transaction list */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
                        {reason.transactions.map((tx: SpendingReasonTransaction, txIndex: number) => (
                          <div key={txIndex} className="flex items-center justify-between px-4 py-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tx.transactionType === 'credit' ? 'bg-green-500' : 'bg-red-400'}`} />
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                {format(new Date(tx.transactionDate), 'dd MMM')}
                              </span>
                              {tx.notes && (
                                <span className="text-xs text-gray-400 truncate">{tx.notes}</span>
                              )}
                            </div>
                            <span className={`text-xs font-medium flex-shrink-0 ml-2 ${tx.transactionType === 'credit' ? 'text-green-600' : 'text-gray-800'}`}>
                              {tx.transactionType === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Spending Breakdown by Type */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Spending Breakdown</h3>
          {disabledReasons.size > 0 && (
            <button
              onClick={() => setDisabledReasons(new Set())}
              className="text-xs text-primary-500 hover:text-primary-600 font-medium"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Reason filter chips */}
        {breakdownRows.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {breakdownRows.map(r => {
              const active = !disabledReasons.has(r.reasonId);
              return (
                <button
                  key={r.reasonId}
                  onClick={() => toggleReason(r.reasonId)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                    active
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-400 border-gray-200 line-through'
                  }`}
                >
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70 flex-shrink-0" />}
                  {r.reasonName}
                </button>
              );
            })}
          </div>
        )}

        {donutData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            {breakdownRows.length === 0 ? 'No categorized spending this month' : 'All reasons filtered out'}
          </p>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Donut chart */}
            <div className="w-full md:w-48 h-48 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="80%"
                    paddingAngle={3}
                    dataKey="amount"
                    strokeWidth={0}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.type} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), '']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    itemStyle={{ padding: 0 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend + stats */}
            <div className="flex-1 w-full space-y-3">
              {donutData.map((entry) => {
                const cfg = TYPE_CONFIG[entry.type];
                return (
                  <div key={entry.type}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm font-medium text-gray-700">{entry.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg?.bg ?? 'bg-gray-100'} ${cfg?.text ?? 'text-gray-600'}`}>
                          {entry.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(entry.amount)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${entry.percentage}%`, backgroundColor: entry.color }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Total */}
              <div className="pt-3 mt-1 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">Total categorized</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(totalTypeSpent)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Budget Status */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Budget Status</h3>
        <div className="space-y-4">
          {/* Sort: Not spent/Partially spent first (by remaining amount DESC), then overspent */}
          {dashboardData.budgetStatus
            .sort((a, b) => {
              // Overspent items go to bottom
              if (a.isOverspent && !b.isOverspent) return 1;
              if (!a.isOverspent && b.isOverspent) return -1;
              
              // Both overspent or both not overspent - sort by remaining (descending)
              // This puts items with more budget left at the top
              return b.remainingAmount - a.remainingAmount;
            })
            .map((item, index) => (
              <div 
                key={index} 
                className={`border rounded-lg p-4 transition-all ${
                  item.remainingAmount > 0 && !item.isOverspent
                    ? 'border-blue-200 bg-blue-50'
                    : item.isOverspent
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.expenseReasonName}</h4>
                    <p className="text-sm text-gray-500">{item.categoryName}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.isOverspent ? (
                      <>
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <span className="text-xs font-medium bg-red-100 text-red-800 px-2 py-1 rounded">
                          Overspent
                        </span>
                      </>
                    ) : item.remainingAmount > 0 ? (
                      <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {((item.remainingAmount / item.allocatedAmount) * 100).toFixed(0)}% Remaining
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        Fully Used
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Allocated</p>
                    <p className="font-medium">{formatCurrency(item.allocatedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Spent</p>
                    <p className={`font-medium ${item.isOverspent ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(item.spentAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Remaining</p>
                    <p className={`font-medium ${item.remainingAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(item.remainingAmount)}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        item.percentageUsed > 100 ? 'bg-red-500' : 
                        item.percentageUsed > 75 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(item.percentageUsed, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.percentageUsed.toFixed(1)}% used
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {showImportModal && (
        <ImportBankStatementModal
          onClose={() => setShowImportModal(false)}
          onImported={fetchDashboardData}
        />
      )}
    </div>
  );
};