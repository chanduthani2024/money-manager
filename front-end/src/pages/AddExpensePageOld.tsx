import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { transactionService } from '../services/transactions';
import { categoryService, expenseReasonService } from '../services/categories';
import { budgetService } from '../services/budget';
import { Category, ExpenseReason, CreateTransaction } from '../types/budget';
import { toast } from 'react-hot-toast';
import { Plus, IndianRupee, Calendar, FileText, Tag } from 'lucide-react';

interface ExpenseForm {
  amount: number;
  notes: string;
  transactionDate: string;
  expenseReasonId: number;
}

export const AddExpensePage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseReasons, setExpenseReasons] = useState<ExpenseReason[]>([]);
  const [filteredReasons, setFilteredReasons] = useState<ExpenseReason[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExpenseForm>({
    defaultValues: {
      amount: 0,
      notes: '',
      transactionDate: new Date().toISOString().split('T')[0],
      expenseReasonId: 0,
    },
  });

  const watchedExpenseReasonId = watch('expenseReasonId');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      const filtered = expenseReasons.filter(reason => reason.categoryId === selectedCategory);
      setFilteredReasons(filtered);
      // Reset expense reason selection when category changes
      setValue('expenseReasonId', 0);
      setValue('amount', 0); // Reset amount when category changes
    } else {
      setFilteredReasons(expenseReasons);
    }
  }, [selectedCategory, expenseReasons, setValue]);

  // Auto-populate amount when expense reason is selected
  useEffect(() => {
    const fetchAllocatedAmount = async () => {
      if (watchedExpenseReasonId && watchedExpenseReasonId !== 0) {
        try {
          // Get current month's budget
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          const monthlyBudgets = await budgetService.getAll();
          
          // Find budget for current month
          const currentBudget = monthlyBudgets.find(budget => 
            budget.month === currentMonth && budget.year === currentYear
          );
          
          if (currentBudget) {
            // Find allocation for the selected expense reason
            const allocation = currentBudget.budgetAllocations.find(
              allocation => allocation.expenseReasonId === watchedExpenseReasonId
            );
            
            if (allocation && allocation.allocatedAmount > 0) {
              // Set the allocated amount as default
              setValue('amount', allocation.allocatedAmount);
            }
          }
        } catch (error) {
          // If can't fetch budget, keep current amount or set to 0
          console.log('Could not fetch allocated amount:', error);
        }
      } else {
        // Reset amount when no expense reason is selected
        setValue('amount', 0);
      }
    };

    fetchAllocatedAmount();
  }, [watchedExpenseReasonId, setValue]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [categoriesData, expenseReasonsData] = await Promise.all([
        categoryService.getAll(),
        expenseReasonService.getAll(),
      ]);
      
      setCategories(categoriesData);
      setExpenseReasons(expenseReasonsData);
      setFilteredReasons(expenseReasonsData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ExpenseForm) => {
    setSubmitting(true);
    try {
      const transactionData: CreateTransaction = {
        amount: Number(data.amount),
        notes: data.notes || undefined,
        transactionDate: data.transactionDate,
        expenseReasonId: Number(data.expenseReasonId),
      };

      await transactionService.create(transactionData);
      
      // Auto-reset form after successful submission (Change Request 2)
      reset({
        amount: 0,
        notes: '',
        transactionDate: new Date().toISOString().split('T')[0],
        expenseReasonId: 0,
      });
      setSelectedCategory(null);
      
      // Show success toast with action buttons
      toast.success(
        <div className="flex flex-col space-y-2">
          <div className="font-medium">Expense added successfully!</div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                toast.dismiss();
                // Form is already reset, no need to reset again
              }}
              className="px-3 py-1 bg-white text-primary-600 text-sm rounded border border-primary-200 hover:bg-primary-50"
            >
              Add Another
            </button>
            <button
              onClick={() => {
                toast.dismiss();
                navigate('/transactions');
              }}
              className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
            >
              View All
            </button>
          </div>
        </div>,
        {
          duration: 6000,
          style: {
            maxWidth: '400px',
          },
        }
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedExpenseReason = () => {
    return expenseReasons.find(reason => reason.id === watchedExpenseReasonId);
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Plus className="h-7 w-7 mr-2" />
          Add Expense
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Amount Section */}
        {/* Category & Expense Reason - MOVED TO FIRST POSITION */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Tag className="h-5 w-5 mr-2" />
            Category & Reason
          </h2>

          <div className="space-y-4">
            {/* Category Filter */}
            <div>
              <label className="form-label">Filter by Category (Optional)</label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                className="form-input"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Expense Reason */}
            <div>
              <label htmlFor="expenseReasonId" className="form-label">
                Expense Reason
              </label>
              <select
                id="expenseReasonId"
                className="form-input"
                {...register('expenseReasonId', {
                  required: 'Please select an expense reason',
                  min: { value: 1, message: 'Please select a valid expense reason' },
                  valueAsNumber: true,
                })}
              >
                <option value={0}>Select expense reason</option>
                {filteredReasons.map((reason) => (
                  <option key={reason.id} value={reason.id}>
                    {reason.name} - {getCategoryName(reason.categoryId)}
                    {reason.isRecurring && reason.recurringAmount && 
                      ` (Usually ${formatCurrency(reason.recurringAmount)})`
                    }
                  </option>
                ))}
              </select>
              {errors.expenseReasonId && (
                <p className="mt-1 text-sm text-red-600">{errors.expenseReasonId.message}</p>
              )}
            </div>

            {/* Selected Reason Info */}
            {getSelectedExpenseReason() && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900">Selected: {getSelectedExpenseReason()?.name}</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Category: {getCategoryName(getSelectedExpenseReason()!.categoryId)}
                </p>
                {getSelectedExpenseReason()?.description && (
                  <p className="text-sm text-blue-600 mt-1">
                    {getSelectedExpenseReason()?.description}
                  </p>
                )}
                {getSelectedExpenseReason()?.isRecurring && (
                  <p className="text-xs text-blue-600 mt-1">
                    💡 This is a recurring expense - Amount auto-filled from budget allocation
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expense Amount - NOW SECOND */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <IndianRupee className="h-5 w-5 mr-2" />
            Expense Amount
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="amount" className="form-label">
                Amount (₹)
                {watchedExpenseReasonId !== 0 && (
                  <span className="text-xs text-green-600 ml-2">
                    ✓ Auto-filled from budget allocation
                  </span>
                )}
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  className="form-input pl-10 text-lg"
                  placeholder="Enter amount"
                  {...register('amount', {
                    required: 'Amount is required',
                    min: { value: 0.01, message: 'Amount must be greater than 0' },
                    valueAsNumber: true,
                  })}
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            {/* Quick Amount Buttons */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Quick amounts:</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setValue('amount', amount)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Date & Notes */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Date & Details
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="transactionDate" className="form-label">
                Transaction Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="transactionDate"
                  type="date"
                  className="form-input pl-10"
                  {...register('transactionDate', {
                    required: 'Transaction date is required',
                  })}
                />
              </div>
              {errors.transactionDate && (
                <p className="mt-1 text-sm text-red-600">{errors.transactionDate.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="notes" className="form-label">
                Notes (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea
                  id="notes"
                  rows={3}
                  className="form-input pl-10"
                  placeholder="Add any additional notes about this expense..."
                  {...register('notes')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Date Options */}
        <div className="card">
          <h3 className="font-medium mb-3">Quick Date Options</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setValue('transactionDate', new Date().toISOString().split('T')[0])}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                setValue('transactionDate', yesterday.toISOString().split('T')[0]);
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                setValue('transactionDate', weekAgo.toISOString().split('T')[0]);
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50"
            >
              1 Week Ago
            </button>
            <button
              type="button"
              onClick={() => {
                const monthStart = new Date();
                monthStart.setDate(1);
                setValue('transactionDate', monthStart.toISOString().split('T')[0]);
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50"
            >
              Month Start
            </button>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 btn btn-primary py-3 text-lg"
          >
            {submitting ? 'Adding Expense...' : 'Add Expense'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/transactions')}
            className="flex-1 btn btn-secondary py-3 text-lg"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};