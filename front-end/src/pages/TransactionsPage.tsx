import React, { useState, useEffect } from 'react';
import { useGlobalFilter } from '../contexts/GlobalFilterContext';
import { formatCurrency } from '../utils/format';
import { Link } from 'react-router-dom';
import { transactionService } from '../services/transactions';
import { categoryService, expenseReasonService } from '../services/categories';
import { budgetService } from '../services/budget';
import { Transaction, Category, ExpenseReason, GmailTransaction } from '../types/budget';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  IndianRupee,
  FileText,
  X,
  Zap,
  Target,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { DateRangePicker } from '../components/common/DateRangePicker';

interface TransactionFilters {
  month?: number;
  year?: number;
  categoryId?: number;
  expenseReasonId?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const TransactionsPage: React.FC = () => {
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useGlobalFilter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingGmailTransactions, setPendingGmailTransactions] = useState<GmailTransaction[]>([]);
  const [pendingSelection, setPendingSelection] = useState<Record<number, number>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseReasons, setExpenseReasons] = useState<ExpenseReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilters>({
    month: selectedMonth,
    year: selectedYear,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showReasonSelector, setShowReasonSelector] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState<number>(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedReasonForNotes, setSelectedReasonForNotes] = useState<ExpenseReason | null>(null);
  const [transactionNotes, setTransactionNotes] = useState('');
  const [classifyMode, setClassifyMode] = useState<'gmail' | 'assign'>('gmail');
  const [uncategorizedTransactions, setUncategorizedTransactions] = useState<Transaction[]>([]);
  const UNCATEGORIZED_PAGE_SIZE = 5;
  const [uncategorizedPage, setUncategorizedPage] = useState(1);
  const [uncategorizedMonthFilter, setUncategorizedMonthFilter] = useState<number | undefined>(new Date().getMonth() + 1);
  const [uncategorizedYearFilter, setUncategorizedYearFilter] = useState<number | undefined>(new Date().getFullYear());
  const [monthlyBudgetSalary, setMonthlyBudgetSalary] = useState<number | null>(null);
  const [deleteModalTransaction, setDeleteModalTransaction] = useState<Transaction | null>(null);

  const fetchPendingGmailTransactions = async () => {
    try {
      const data = await transactionService.getPendingGmailTransactions();
      setPendingGmailTransactions(data);
    } catch (error) {
      toast.error('Failed to load pending Gmail transactions');
    }
  };

  const fetchUncategorizedTransactions = async () => {
    try {
      const data = await transactionService.getUncategorized();
      setUncategorizedTransactions(data);
      setUncategorizedPage(1);
    } catch (error) {
      console.error('Failed to load uncategorized transactions', error);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [categoriesData, expenseReasonsData] = await Promise.all([
        categoryService.getAll(),
        expenseReasonService.getAll(),
      ]);
      
      setCategories(categoriesData);
      setExpenseReasons(expenseReasonsData);
      await fetchPendingGmailTransactions();
      await fetchUncategorizedTransactions();
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Strip search from API params — it's applied client-side
        const { search: _search, ...apiFilters } = filters;
        const [data] = await Promise.all([
          transactionService.getAll(apiFilters),
          // Fetch monthly budget salary for opening balance when a specific month/year is selected
          (filters.month && filters.year
            ? budgetService.getByMonthYear(filters.month, filters.year)
                .then(b => { setMonthlyBudgetSalary(Number(b.salary)); })
                .catch(() => { setMonthlyBudgetSalary(null); })
            : Promise.resolve(setMonthlyBudgetSalary(null))),
        ]);
        setTransactions(data);
      } catch (error) {
        toast.error('Failed to fetch transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { search: _search, ...apiFilters } = filters;
      const data = await transactionService.getAll(apiFilters);
      setTransactions(data);
    } catch (error) {
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    try {
      await transactionService.delete(transactionId);
      toast.success('Transaction deleted successfully');
      setDeleteModalTransaction(null);
      fetchTransactions();
      fetchUncategorizedTransactions();
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const handleRemoveExpenseReason = async (transactionId: number) => {
    try {
      await transactionService.removeExpenseReason(transactionId);
      toast.success('Expense reason removed successfully');
      setDeleteModalTransaction(null);
      fetchTransactions();
      fetchUncategorizedTransactions();
    } catch (error) {
      toast.error('Failed to remove expense reason');
    }
  };

  const handleClassifyGmailTransaction = async (transactionId: number, expenseReasonId: number) => {
    try {
      await transactionService.classifyGmailTransaction(transactionId, expenseReasonId);
      toast.success('Email transaction classified successfully');
      fetchPendingGmailTransactions();
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to classify email transaction');
    }
  };

  const handleRejectGmailTransaction = async (transactionId: number) => {
    try {
      await transactionService.rejectGmailTransaction(transactionId);
      toast.success('Email transaction rejected successfully');
      fetchPendingGmailTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject email transaction');
    }
  };

  const clearFilters = () => {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    setSelectedMonth(m);
    setSelectedYear(y);
    setFilters({ month: m, year: y });
  };


  // Open reason selector modal for Gmail transaction classification
  const openReasonSelector = (transactionId: number) => {
    setCurrentTransactionId(transactionId);
    setClassifyMode('gmail');
    setShowReasonSelector(true);
    setSearchTerm('');
  };

  // Open reason selector modal for assigning reason to uncategorized transaction
  const openReasonSelectorForAssign = (transactionId: number) => {
    setCurrentTransactionId(transactionId);
    setClassifyMode('assign');
    setShowReasonSelector(true);
    setSearchTerm('');
  };

  // Close reason selector modal
  const closeReasonSelector = () => {
    setShowReasonSelector(false);
    setCurrentTransactionId(-1);
    setSearchTerm('');
  };

  // Close notes modal
  const closeNotesModal = () => {
    setShowNotesModal(false);
    setSelectedReasonForNotes(null);
    setTransactionNotes('');
  };

  // Handle final classification with notes
  const handleClassifyWithNotes = async () => {
    if (!selectedReasonForNotes || currentTransactionId < 0) return;

    try {
      if (classifyMode === 'gmail') {
        await transactionService.classifyGmailTransaction(
          currentTransactionId,
          selectedReasonForNotes.id,
          transactionNotes.trim() || undefined
        );
        toast.success('Email transaction classified successfully');
        fetchPendingGmailTransactions();
      } else {
        await transactionService.assignExpenseReason(
          currentTransactionId,
          selectedReasonForNotes.id,
          transactionNotes.trim() || undefined
        );
        toast.success('Expense reason assigned successfully');
        fetchUncategorizedTransactions();
      }
      closeNotesModal();
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to classify transaction');
    }
  };

  // Handle reason selection
  const handleReasonSelect = (reason: ExpenseReason) => {
    setSelectedReasonForNotes(reason);
    setTransactionNotes('');
    setShowReasonSelector(false);
    setShowNotesModal(true);
  };

  // Get icon for reason
  const getReasonIcon = (reasonName: string): React.ReactNode => {
    const iconClass = "h-5 w-5 text-gray-600";
    
    switch (reasonName.toLowerCase()) {
      case 'restaurant':
      case 'dining':
        return <span className={iconClass}>🍽️</span>;
      case 'grocery':
        return <span className={iconClass}>🛒</span>;
      case 'fuel':
      case 'petrol':
        return <span className={iconClass}>⛽</span>;
      case 'uber':
      case 'taxi':
        return <span className={iconClass}>🚕</span>;
      case 'movie':
        return <span className={iconClass}>🎬</span>;
      case 'clothes':
        return <span className={iconClass}>👕</span>;
      case 'electricity':
        return <span className={iconClass}>💡</span>;
      case 'internet':
        return <span className={iconClass}>🌐</span>;
      default:
        return <span className={iconClass}>💳</span>;
    }
  };

  // Filter reasons by search term for selector
  const selectorFilteredReasons = expenseReasons.filter(reason => {
    if (searchTerm.length === 0) return true;
    return reason.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           reason.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get suggested reasons (for demo purposes, using first few reasons)
  const suggestedReasons = expenseReasons.slice(0, 3);
  const otherReasons = selectorFilteredReasons.filter(reason => 
    !suggestedReasons.some(suggested => suggested.id === reason.id)
  );

  const groupedReasons = categories.reduce((acc, category) => {
    acc[category.name] = expenseReasons.filter(reason => reason.categoryId === category.id);
    return acc;
  }, {} as Record<string, ExpenseReason[]>);

  const getCategoryColor = (categoryType: string) => {
    switch (categoryType.toLowerCase()) {
      case 'wants': return 'bg-purple-100 text-purple-800';
      case 'needs': return 'bg-blue-100 text-blue-800';
      case 'investments': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTotalAmount = () => {
    return Math.abs(visibleTransactions.reduce((sum, transaction) => {
      const amount = typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount;
      const signed = transaction.transactionType === 'credit' ? -amount : amount;
      return sum + (isNaN(signed) ? 0 : signed);
    }, 0));
  };

const searchLower = (filters.search || '').toLowerCase();
  const visibleTransactions = transactions.filter(t => {
    if (searchLower && !(t.expenseReason?.name.toLowerCase().includes(searchLower) ||
        t.category?.name.toLowerCase().includes(searchLower) ||
        t.notes?.toLowerCase().includes(searchLower))) return false;
    if (filters.dateFrom && t.transactionDate.split('T')[0] < filters.dateFrom) return false;
    if (filters.dateTo && t.transactionDate.split('T')[0] > filters.dateTo) return false;
    return true;
  });

  // Compute running closing balance — sort oldest→newest, apply each transaction, then reverse for display
  type TransactionWithBalance = Transaction & { closingBalance: number };
  const transactionsWithBalance: TransactionWithBalance[] = (() => {
    if (!visibleTransactions.length) return [];
    const sorted = [...visibleTransactions].sort((a, b) => {
      const dateA = new Date(a.transactionDate.split('T')[0] + 'T00:00:00').getTime();
      const dateB = new Date(b.transactionDate.split('T')[0] + 'T00:00:00').getTime();
      if (dateA !== dateB) return dateA - dateB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    let balance = monthlyBudgetSalary ?? 0;
    return sorted.map(tx => {
      const amt = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
      balance = tx.transactionType === 'credit' ? balance + amt : balance - amt;
      return { ...tx, closingBalance: balance };
    });
  })();

  const groupedTransactions = transactionsWithBalance.reduce((acc, transaction) => {
    const date = transaction.transactionDate.split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(transaction);
    return acc;
  }, {} as Record<string, TransactionWithBalance[]>);

  const filteredReasons = filters.categoryId 
    ? expenseReasons.filter(reason => reason.categoryId === filters.categoryId)
    : expenseReasons;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary flex items-center"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
          <Link to="/add-expense" className="btn btn-primary flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Link>
        </div>
      </div>

      {/* Pending Bank Email Transactions */}
      {pendingGmailTransactions.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pending Bank Email Transactions</h2>
              <p className="text-sm text-gray-500">Classify or reject email transactions before they affect spending.</p>
            </div>
          </div>
          <div className="space-y-4">
            {pendingGmailTransactions.map((item) => {
              // Parse rawDate and convert to IST (handles both +0000 UTC and +0530 IST formats)
              const formattedDate = item.rawDate
                ? (() => {
                    const d = new Date(item.rawDate);
                    if (isNaN(d.getTime())) return item.rawDate;
                    return d.toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    });
                  })()
                : item.transactionDate
                  ? new Date(item.transactionDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' })
                  : 'No date';
              
              // Format from address to remove email part
              const formattedFrom = item.fromAddress 
                ? item.fromAddress.replace(/\s*<[^>]*>$/, '').trim()
                : 'Unknown sender';
              
              // Format amount with transaction type
              const formatAmount = (amount: number | null | undefined, type: string) => {
                if (!amount && amount !== 0) return 'Amount unavailable';
                const formattedAmount = formatCurrency(amount);
                
                const typeLabel = type === 'debited' ? 'Debited' : 
                                 type === 'credited' ? 'Credited' : 'Unknown';
                const typeColor = type === 'debited' ? 'text-red-600' : 
                                 type === 'credited' ? 'text-green-600' : 'text-gray-600';
                
                return (
                  <div className="flex flex-col items-end">
                    <span className={`text-xs font-medium ${typeColor} uppercase tracking-wide`}>
                      {typeLabel}
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {formattedAmount}
                    </span>
                  </div>
                );
              };

              return (
                <div key={item.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-1">{item.subject || 'Bank transaction email'}</p>
                      <p className="text-xs text-gray-500 mb-1">{formattedFrom}</p>
                      <p className="text-xs text-gray-500">{formattedDate}</p>
                    </div>
                    {formatAmount(item.amount, item.transactionType || 'unknown')}
                  </div>
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">{item.snippet || 'No content available'}</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
                  <div>
                    <label className="form-label">Select expense reason</label>
                    <button
                      type="button"
                      onClick={() => openReasonSelector(item.id)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-left hover:border-primary-300 hover:bg-primary-50 transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <div className="flex items-center space-x-3">
                        {pendingSelection[item.id] ? (
                          <>
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                              {getReasonIcon(expenseReasons.find(r => r.id === pendingSelection[item.id])?.name || '')}
                            </div>
                            <span className="text-gray-900">{expenseReasons.find(r => r.id === pendingSelection[item.id])?.name}</span>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Target className="h-4 w-4 text-gray-400" />
                            </div>
                            <span className="text-gray-500">Select expense reason</span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      const reasonId = pendingSelection[item.id];
                      if (reasonId) {
                        const reason = expenseReasons.find(r => r.id === reasonId);
                        if (reason) {
                          setCurrentTransactionId(item.id);
                          setSelectedReasonForNotes(reason);
                          setTransactionNotes('');
                          setShowNotesModal(true);
                        }
                      }
                    }}
                    disabled={!pendingSelection[item.id]}
                    className="btn btn-primary"
                  >
                    Classify
                  </button>
                  <button
                    onClick={() => handleRejectGmailTransaction(item.id)}
                    className="btn btn-secondary"
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}

      {/* Uncategorized Transactions — auto-imported from Gmail, needs expense reason */}
      {uncategorizedTransactions.length > 0 && (() => {
        const filteredUncategorized = uncategorizedTransactions.filter(tx => {
          if (!tx.transactionDate) return true;
          const d = new Date(tx.transactionDate + 'T00:00:00');
          if (uncategorizedMonthFilter && d.getMonth() + 1 !== uncategorizedMonthFilter) return false;
          if (uncategorizedYearFilter && d.getFullYear() !== uncategorizedYearFilter) return false;
          return true;
        });
        const totalPages = Math.ceil(filteredUncategorized.length / UNCATEGORIZED_PAGE_SIZE);
        const pageItems = filteredUncategorized.slice((uncategorizedPage - 1) * UNCATEGORIZED_PAGE_SIZE, uncategorizedPage * UNCATEGORIZED_PAGE_SIZE);
        return (
        <div className="card border-l-4 border-l-orange-400">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">🏷️ Needs Categorization</h2>
            </div>
            {/* Month / Year filter */}
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={uncategorizedMonthFilter ?? ''}
                onChange={(e) => { setUncategorizedMonthFilter(e.target.value ? parseInt(e.target.value) : undefined); setUncategorizedPage(1); }}
                className="form-input py-1.5 text-sm"
              >
                <option value="">All Months</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString('default', { month: 'short' })}
                  </option>
                ))}
              </select>
              <select
                value={uncategorizedYearFilter ?? ''}
                onChange={(e) => { setUncategorizedYearFilter(e.target.value ? parseInt(e.target.value) : undefined); setUncategorizedPage(1); }}
                className="form-input py-1.5 text-sm"
              >
                <option value="">All Years</option>
                {Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - 2 + i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
          </div>

          {filteredUncategorized.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No transactions for the selected period.</p>
          ) : (
          <div className="space-y-3">
            {pageItems.map((tx) => {
              const istDate = new Date(new Date(tx.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
              const formattedDate = tx.transactionDate
                ? new Date(tx.transactionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
                : 'No date';
              const formattedTime = format(istDate, 'h:mm a');
              const formattedCreatedDate = format(istDate, 'MMM d, yyyy');
              const amountFormatted = formatCurrency(tx.amount);
              return (
                <div key={tx.id} className="border border-orange-200 bg-orange-50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 font-medium">{formattedDate}</p>
                    <p className="text-xs text-gray-500">{formattedTime} • {formattedCreatedDate}</p>
                    {tx.notes && <p className="text-sm text-gray-600 mt-1">{tx.notes}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-bold ${tx.transactionType === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.transactionType === 'credit' ? '+' : '-'}{amountFormatted}
                    </span>
                    <button
                      onClick={() => openReasonSelectorForAssign(tx.id)}
                      className="btn btn-primary btn-sm whitespace-nowrap"
                    >
                      Assign Category
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* Pagination */}
          {filteredUncategorized.length > UNCATEGORIZED_PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-orange-200">
              <p className="text-sm text-gray-500">
                Showing {Math.min((uncategorizedPage - 1) * UNCATEGORIZED_PAGE_SIZE + 1, filteredUncategorized.length)}–{Math.min(uncategorizedPage * UNCATEGORIZED_PAGE_SIZE, filteredUncategorized.length)} of {filteredUncategorized.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUncategorizedPage(p => Math.max(1, p - 1))}
                  disabled={uncategorizedPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="text-sm text-gray-700 font-medium">
                  {uncategorizedPage} / {totalPages}
                </span>
                <button
                  onClick={() => setUncategorizedPage(p => Math.min(totalPages, p + 1))}
                  disabled={uncategorizedPage >= totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <h3 className="font-semibold mb-4">Filter Transactions</h3>

          {/* Date Range picker */}
          <div className="mb-4">
            <label className="form-label">Date Range</label>
            <DateRangePicker
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              onChange={(from, to) => setFilters(prev => ({
                ...prev,
                dateFrom: from,
                dateTo: to,
                // clear month/year when using date range
                month: from ? undefined : prev.month,
                year: from ? undefined : prev.year,
              }))}
              placeholder="Pick a date range"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">or filter by month / year</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Month</label>
              <select
                value={filters.month || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : undefined;
                  if (val) setSelectedMonth(val);
                  setFilters(prev => ({
                    ...prev,
                    month: val,
                    dateFrom: val ? undefined : prev.dateFrom,
                    dateTo: val ? undefined : prev.dateTo,
                  }));
                }}
                className="form-input"
              >
                <option value="">All Months</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Year</label>
              <select
                value={filters.year || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : undefined;
                  if (val) setSelectedYear(val);
                  setFilters(prev => ({
                    ...prev,
                    year: val,
                    dateFrom: val ? undefined : prev.dateFrom,
                    dateTo: val ? undefined : prev.dateTo,
                  }));
                }}
                className="form-input"
              >
                <option value="">All Years</option>
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

            <div>
              <label className="form-label">Category</label>
              <select
                value={filters.categoryId || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  categoryId: e.target.value ? parseInt(e.target.value) : undefined,
                  expenseReasonId: undefined
                }))}
                className="form-input"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Expense Reason</label>
              <select
                value={filters.expenseReasonId || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  expenseReasonId: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
                className="form-input"
                disabled={!filters.categoryId}
              >
                <option value="">All Reasons</option>
                {filteredReasons.map((reason) => (
                  <option key={reason.id} value={reason.id}>
                    {reason.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear all filters
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="btn btn-secondary btn-sm"
            >
              Hide Filters
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center">
            <IndianRupee className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(getTotalAmount())}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {visibleTransactions.length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-6 w-6 text-red-500" />
                <div>
                  <p className="text-xs text-gray-500">Debits</p>
                  <p className="text-xl font-bold text-gray-900">
                    {visibleTransactions.filter(t => t.transactionType === 'debit').length}
                  </p>
                </div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-green-500" />
                <div>
                  <p className="text-xs text-gray-500">Credits</p>
                  <p className="text-xl font-bold text-gray-900">
                    {visibleTransactions.filter(t => t.transactionType === 'credit').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Transaction History</h2>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              className="form-input pl-10"
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {Object.keys(filters).some(key => filters[key as keyof TransactionFilters]) 
                ? 'Try adjusting your filters or' 
                : 'Get started by creating your first transaction.'
              }
            </p>
            <div className="mt-6">
              <Link to="/add-expense" className="btn btn-primary">
                Add Your First Expense
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTransactions)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, dayTransactions]) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                    <span className="ml-auto text-xs text-gray-500">
                      {dayTransactions.length} transaction{dayTransactions.length !== 1 ? 's' : ''} • 
                      {formatCurrency(dayTransactions.reduce((sum, t) => {
                        const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
                        const signed = t.transactionType === 'credit' ? -amount : amount;
                        return sum + (isNaN(signed) ? 0 : signed);
                      }, 0))}
                    </span>
                  </h3>
                  
                  <div className="space-y-2">
                    {[...dayTransactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((transaction) => (
                      <div key={transaction.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-medium text-gray-900">
                                {transaction.expenseReason?.name || 'Uncategorized'}
                              </h4>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(transaction.category?.type || 'needs')}`}>
                                {transaction.category?.name || '—'}
                              </span>
                            </div>
                            
                            {transaction.notes && (
                              <p className="text-sm text-gray-600 mb-2">{transaction.notes}</p>
                            )}
                            
                            <p className="text-xs text-gray-500">
                              {format(new Date(new Date(transaction.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })), 'h:mm a')} • 
                              {format(new Date(new Date(transaction.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })), 'MMM d, yyyy')}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              {transaction.transactionType === 'credit' ? (
                                <p className="text-lg font-bold text-green-600">
                                  +{formatCurrency(transaction.amount)}
                                </p>
                              ) : (
                                <p className="text-lg font-bold text-gray-900">
                                  -{formatCurrency(transaction.amount)}
                                </p>
                              )}
                              {/* <p className={`text-xs mt-0.5 font-medium ${
                                monthlyBudgetSalary !== null
                                  ? (transaction.closingBalance < 0 ? 'text-red-500' : 'text-gray-400')
                                  : 'text-gray-300'
                              }`}>
                                Bal: {formatCurrency(transaction.closingBalance)}
                                {monthlyBudgetSalary === null && ' (est.)'}
                              </p> */}
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {/* Temporarily hidden edit button */}
                              {/* <button
                                onClick={() => console.log('Edit transaction:', transaction.id)}
                                className="p-2 text-gray-400 hover:text-blue-600"
                                title="Edit transaction"
                              >
                                <Edit className="h-4 w-4" />
                              </button> */}
                              <button
                                onClick={() => setDeleteModalTransaction(transaction)}
                                className="p-2 text-gray-400 hover:text-red-600"
                                title="Delete transaction"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Enhanced Reason Selector Modal */}
      {showReasonSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Select Expense Type</h3>
              <button
                onClick={closeReasonSelector}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search expense types..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  autoFocus
                />
              </div>

              <div className="max-h-[50vh] overflow-y-auto">
                {/* Quick Select Section */}
                {suggestedReasons.length > 0 && searchTerm.length === 0 && (
                  <div className="mb-6">
                    <div className="flex items-center mb-4">
                      <Zap className="h-4 w-4 text-yellow-500 mr-2" />
                      <h4 className="text-sm font-medium text-gray-700">Quick Select</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {suggestedReasons.map((reason) => (
                        <button
                          key={`suggested-${reason.id}`}
                          onClick={() => handleReasonSelect(reason)}
                          className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg hover:border-yellow-300 hover:bg-yellow-100 transition-all text-left"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                              {getReasonIcon(reason.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-gray-900 truncate">{reason.name}</h5>
                              {reason.isRecurring && reason.recurringAmount && (
                                <p className="text-sm text-green-600 font-medium">
                                  Recurring: {formatCurrency(reason.recurringAmount)}
                                </p>
                              )}
                              {reason.description && (
                                <p className="text-xs text-gray-500 truncate">{reason.description}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Categories */}
                <div>
                  {searchTerm.length === 0 && suggestedReasons.length > 0 && (
                    <h4 className="text-sm font-medium text-gray-700 mb-4">All Options by Category</h4>
                  )}
                  
                  {Object.entries(groupedReasons).map(([categoryName, reasons]) => {
                    const categoryReasons = searchTerm.length > 0 
                      ? reasons.filter(reason => 
                          !suggestedReasons.some(suggested => suggested.id === reason.id) &&
                          (reason.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           reason.description?.toLowerCase().includes(searchTerm.toLowerCase()))
                        )
                      : reasons.filter(reason => 
                          !suggestedReasons.some(suggested => suggested.id === reason.id)
                        );

                    if (categoryReasons.length === 0) return null;

                    return (
                      <div key={categoryName} className="mb-6">
                        <div className="flex items-center mb-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            categoryName === 'Wants' ? 'bg-purple-100 text-purple-800' :
                            categoryName === 'Needs' ? 'bg-blue-100 text-blue-800' :
                            categoryName === 'Investments' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {categoryName}
                          </span>
                          <div className="flex-1 ml-3 h-px bg-gray-200"></div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {categoryReasons.map((reason) => (
                            <button
                              key={reason.id}
                              onClick={() => handleReasonSelect(reason)}
                              className="p-4 border border-gray-200 bg-white rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all text-left group"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-100 group-hover:bg-primary-100 rounded-lg flex items-center justify-center transition-colors">
                                  {getReasonIcon(reason.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-gray-900 truncate">{reason.name}</h5>
                                  {reason.isRecurring && reason.recurringAmount && (
                                    <p className="text-sm text-green-600 font-medium">
                                      Recurring: {formatCurrency(reason.recurringAmount)}
                                    </p>
                                  )}
                                  {reason.description && (
                                    <p className="text-xs text-gray-500 truncate">{reason.description}</p>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* No Results */}
                {selectorFilteredReasons.length === 0 && searchTerm.length > 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No expense types found for "{searchTerm}"</p>
                    <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && selectedReasonForNotes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Transaction Note</h3>
              <button
                onClick={closeNotesModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      {getReasonIcon(selectedReasonForNotes.name)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{selectedReasonForNotes.name}</h4>
                      <p className="text-sm text-gray-500">Selected expense reason</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {(() => {
                        const amount = classifyMode === 'gmail'
                          ? pendingGmailTransactions.find(t => t.id === currentTransactionId)?.amount
                          : uncategorizedTransactions.find(t => t.id === currentTransactionId)?.amount;
                        return amount ? formatCurrency(Number(amount)) : 'Amount unavailable';
                      })()}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      {(() => {
                        const txType = classifyMode === 'gmail'
                          ? pendingGmailTransactions.find(t => t.id === currentTransactionId)?.transactionType
                          : uncategorizedTransactions.find(t => t.id === currentTransactionId)?.transactionType;
                        if (classifyMode === 'gmail') {
                          return txType === 'debited' ? 'Debited' : txType === 'credited' ? 'Credited' : 'Unknown';
                        }
                        return txType === 'credit' ? 'Credit' : 'Debit';
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  value={transactionNotes}
                  onChange={(e) => setTransactionNotes(e.target.value)}
                  placeholder="Add any additional notes about this transaction..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {transactionNotes.length}/500 characters
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={closeNotesModal}
                  className="flex-1 btn btn-secondary"
                >
                  Skip Note
                </button>
                <button
                  onClick={handleClassifyWithNotes}
                  className="flex-1 btn btn-primary"
                >
                  Classify Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete / Remove Reason Modal */}
      {deleteModalTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Transaction</h3>
              </div>
              <button
                onClick={() => setDeleteModalTransaction(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                What would you like to do with this transaction of{' '}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(deleteModalTransaction.amount)}
                </span>
                {deleteModalTransaction.expenseReason && (
                  <> tagged as <span className="font-semibold text-gray-900">{deleteModalTransaction.expenseReason.name}</span></>
                )}
                ?
              </p>

              <div className="space-y-3">
                {deleteModalTransaction.expenseReasonId && (
                  <button
                    onClick={() => handleRemoveExpenseReason(deleteModalTransaction.id)}
                    className="w-full flex items-start gap-3 p-4 border-2 border-orange-200 bg-orange-50 rounded-lg hover:border-orange-300 hover:bg-orange-100 transition-all text-left"
                  >
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Remove expense reason only</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Keeps the transaction but clears the category tag. Budget allocation is reversed.
                      </p>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => handleDeleteTransaction(deleteModalTransaction.id)}
                  className="w-full flex items-start gap-3 p-4 border-2 border-red-200 bg-red-50 rounded-lg hover:border-red-300 hover:bg-red-100 transition-all text-left"
                >
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Delete transaction permanently</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Removes the transaction and reverses all budget impacts. This cannot be undone.
                    </p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setDeleteModalTransaction(null)}
                className="w-full btn btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};