import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { transactionService } from '../services/transactions';
import { categoryService, expenseReasonService } from '../services/categories';
import { Transaction, Category, ExpenseReason } from '../types/budget';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Calendar,
  IndianRupee,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

interface TransactionFilters {
  month?: number;
  year?: number;
  categoryId?: number;
  expenseReasonId?: number;
  search?: string;
}

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseReasons, setExpenseReasons] = useState<ExpenseReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilters>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await transactionService.getAll(filters);
        setTransactions(data);
      } catch (error) {
        toast.error('Failed to fetch transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const [categoriesData, expenseReasonsData] = await Promise.all([
        categoryService.getAll(),
        expenseReasonService.getAll(),
      ]);
      
      setCategories(categoriesData);
      setExpenseReasons(expenseReasonsData);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getAll(filters);
      setTransactions(data);
    } catch (error) {
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      await transactionService.delete(transactionId);
      toast.success('Transaction deleted successfully');
      fetchTransactions();
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const clearFilters = () => {
    setFilters({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryColor = (categoryType: string) => {
    switch (categoryType.toLowerCase()) {
      case 'wants': return 'bg-purple-100 text-purple-800';
      case 'needs': return 'bg-blue-100 text-blue-800';
      case 'investments': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTotalAmount = () => {
    return transactions.reduce((sum, transaction) => {
      const amount = typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  };

  const getAverageAmount = () => {
    const total = getTotalAmount();
    return transactions.length > 0 ? total / transactions.length : 0;
  };

  const groupedTransactions = transactions.reduce((acc, transaction) => {
    const date = transaction.transactionDate.split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);

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

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <h3 className="font-semibold mb-4">Filter Transactions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Month</label>
              <select
                value={filters.month || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  month: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
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
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  year: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
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
                  expenseReasonId: undefined // Reset expense reason when category changes
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
                {transactions.length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Average per Transaction</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(getAverageAmount())}
              </p>
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
                        return sum + (isNaN(amount) ? 0 : amount);
                      }, 0))}
                    </span>
                  </h3>
                  
                  <div className="space-y-2">
                    {dayTransactions.map((transaction) => (
                      <div key={transaction.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-medium text-gray-900">
                                {transaction.expenseReason.name}
                              </h4>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(transaction.category.type)}`}>
                                {transaction.category.name}
                              </span>
                            </div>
                            
                            {transaction.notes && (
                              <p className="text-sm text-gray-600 mb-2">{transaction.notes}</p>
                            )}
                            
                            <p className="text-xs text-gray-500">
                              {format(new Date(transaction.transactionDate), 'h:mm a')} • 
                              {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">
                                {formatCurrency(transaction.amount)}
                              </p>
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
                                onClick={() => handleDeleteTransaction(transaction.id)}
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
    </div>
  );
};