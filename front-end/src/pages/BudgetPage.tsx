import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { budgetService } from '../services/budget';
import { categoryService, expenseReasonService } from '../services/categories';
import { Category, ExpenseReason, CreateMonthlyBudget, MonthlyBudget } from '../types/budget';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, IndianRupee, Calendar, Target, Search, X, Check, Star, Clock, Zap } from 'lucide-react';

interface BudgetForm {
  salary: number;
  month: number;
  year: number;
  budgetAllocations: {
    expenseReasonId: number;
    allocatedAmount: number;
  }[];
}

export const BudgetPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseReasons, setExpenseReasons] = useState<ExpenseReason[]>([]);
  const [currentBudget, setCurrentBudget] = useState<MonthlyBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastFetchedMonthYear, setLastFetchedMonthYear] = useState<string | null>(null);
  const [showReasonSelector, setShowReasonSelector] = useState(false);
  const [currentAllocationIndex, setCurrentAllocationIndex] = useState<number>(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentReasons, setRecentReasons] = useState<ExpenseReason[]>([]);
  const [frequentReasons, setFrequentReasons] = useState<ExpenseReason[]>([]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BudgetForm>({
    defaultValues: {
      salary: 0,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      budgetAllocations: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'budgetAllocations',
  });

  const watchedAllocations = watch('budgetAllocations');
  const watchedSalary = watch('salary');

  const populateFormWithBudget = useCallback((budget: MonthlyBudget) => {
    setValue('salary', budget.salary);
    setValue('month', budget.month);
    setValue('year', budget.year);
    setValue('budgetAllocations', budget.budgetAllocations.map(allocation => ({
      expenseReasonId: allocation.expenseReasonId,
      allocatedAmount: allocation.allocatedAmount,
    })));
  }, [setValue]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [categoriesData, expenseReasonsData] = await Promise.all([
          categoryService.getAll(),
          expenseReasonService.getAll(),
        ]);
        
        setCategories(categoriesData);
        setExpenseReasons(expenseReasonsData);

        // Try to get current month's budget
        try {
          const currentBudgetData = await budgetService.getCurrentMonth();
          setCurrentBudget(currentBudgetData);
          populateFormWithBudget(currentBudgetData);
        } catch (error) {
          // No current budget exists
          setCurrentBudget(null);
        }
      } catch (error) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [populateFormWithBudget]);

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'month' || name === 'year') {
        const month = value.month;
        const year = value.year;
        const monthYearKey = `${month}-${year}`;
        
        if (month && year && monthYearKey !== lastFetchedMonthYear) {
          setLastFetchedMonthYear(monthYearKey);
          
          const fetchBudget = async () => {
            try {
              const budget = await budgetService.getByMonthYear(month, year);
              setCurrentBudget(budget);
              // Directly set form values instead of using populateFormWithBudget
              setValue('salary', budget.salary);
              setValue('month', budget.month);
              setValue('year', budget.year);
              setValue('budgetAllocations', budget.budgetAllocations.map(allocation => ({
                expenseReasonId: allocation.expenseReasonId,
                allocatedAmount: allocation.allocatedAmount,
              })));
            } catch (error: any) {
              // Only clear current budget, don't modify form values when no budget exists
              setCurrentBudget(null);
              // Only clear allocations, preserve all other user input
              setValue('budgetAllocations', []);
              
              // Don't show error for 404 (no budget found) as it's expected behavior
              if (error.response?.status !== 404) {
                console.error('Error fetching budget:', error);
              }
            }
          };
          fetchBudget();
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, lastFetchedMonthYear]);





  const onSubmit = async (data: BudgetForm) => {
    // Double-check budget validation before submission
    const totalAllocated = data.budgetAllocations.reduce((sum, allocation) => sum + (allocation.allocatedAmount || 0), 0);
    if (totalAllocated > data.salary) {
      toast.error(`Total allocations (₹${totalAllocated.toLocaleString()}) exceed salary (₹${data.salary.toLocaleString()}). Please adjust your allocations.`);
      return;
    }

    setSubmitting(true);
    try {
      if (currentBudget) {
        // Update existing budget
        const updatedBudget = await budgetService.update(currentBudget.id, data);
        setCurrentBudget(updatedBudget);
        toast.success('Budget updated successfully!');
      } else {
        // Create new budget
        const newBudget = await budgetService.create(data);
        setCurrentBudget(newBudget);
        toast.success('Budget created successfully!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${currentBudget ? 'update' : 'create'} budget`);
    } finally {
      setSubmitting(false);
    }
  };

  const addAllocation = () => {
    const currentTotal = getTotalAllocated();
    const remaining = watchedSalary - currentTotal;
    
    if (remaining <= 0) {
      toast.error('No budget remaining. Cannot add more allocations.');
      return;
    }
    
    append({ expenseReasonId: 0, allocatedAmount: 0 });
  };

  const addQuickAllocation = (expenseReason: ExpenseReason) => {
    const existingIndex = fields.findIndex(
      field => field.expenseReasonId === expenseReason.id
    );

    if (existingIndex >= 0) {
      toast.error('This expense reason is already added');
      return;
    }

    const suggestedAmount = expenseReason.recurringAmount || 0;
    const currentTotal = getTotalAllocated();
    const remaining = watchedSalary - currentTotal;

    if (suggestedAmount > remaining) {
      toast.error(`Cannot allocate ₹${suggestedAmount.toLocaleString()}. Only ₹${remaining.toLocaleString()} remaining in budget.`);
      return;
    }

    append({
      expenseReasonId: expenseReason.id,
      allocatedAmount: suggestedAmount,
    });
  };

  // Open reason selector modal
  const openReasonSelector = (index: number) => {
    setCurrentAllocationIndex(index);
    setShowReasonSelector(true);
    setSearchTerm('');
  };

  // Close reason selector modal
  const closeReasonSelector = () => {
    setShowReasonSelector(false);
    setCurrentAllocationIndex(-1);
    setSearchTerm('');
  };

  // Handle reason selection
  const handleReasonSelect = (reason: ExpenseReason) => {
    if (currentAllocationIndex >= 0) {
      setValue(`budgetAllocations.${currentAllocationIndex}.expenseReasonId`, reason.id);
      // Auto-populate recurring amount if available
      if (reason.recurringAmount && reason.recurringAmount > 0) {
        setValue(`budgetAllocations.${currentAllocationIndex}.allocatedAmount`, reason.recurringAmount);
      }
    }
    closeReasonSelector();
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

  // Get selected reason name
  const getSelectedReasonName = (expenseReasonId: number): string => {
    const reason = expenseReasons.find(r => r.id === expenseReasonId);
    return reason?.name || 'Select expense reason';
  };

  // Filter reasons by search term
  const filteredReasons = expenseReasons.filter(reason => {
    if (searchTerm.length === 0) return true;
    return reason.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           reason.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get suggested reasons (for demo purposes, using first few reasons)
  const suggestedReasons = expenseReasons.slice(0, 3);
  const otherReasons = filteredReasons.filter(reason => 
    !suggestedReasons.some(suggested => suggested.id === reason.id)
  );

  const getTotalAllocated = () => {
    return watchedAllocations.reduce((sum, allocation) => sum + (allocation.allocatedAmount || 0), 0);
  };

  const validateAllocation = (value: number, index: number) => {
    const otherAllocations = watchedAllocations
      .filter((_, i) => i !== index)
      .reduce((sum, allocation) => sum + (allocation.allocatedAmount || 0), 0);
    
    const totalWithThisAllocation = otherAllocations + (value || 0);
    const remaining = watchedSalary - totalWithThisAllocation;
    
    if (remaining < 0) {
      return `Exceeds budget by ₹${Math.abs(remaining).toLocaleString()}`;
    }
    return true;
  };

  const getRemainingBudget = () => {
    return watchedSalary - getTotalAllocated();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const groupedReasons = categories.reduce((acc, category) => {
    acc[category.name] = expenseReasons.filter(reason => reason.categoryId === category.id);
    return acc;
  }, {} as Record<string, ExpenseReason[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Monthly Budget</h1>
        {currentBudget && (
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
            Budget exists for {currentBudget.month}/{currentBudget.year}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Budget Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="salary" className="form-label">
                Monthly Salary
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="salary"
                  type="number"
                  className="form-input pl-10"
                  placeholder="Enter your monthly salary"
                  {...register('salary', {
                    required: 'Salary is required',
                    min: { value: 1, message: 'Salary must be greater than 0' },
                    valueAsNumber: true,
                  })}
                />
              </div>
              {errors.salary && (
                <p className="mt-1 text-sm text-red-600">{errors.salary.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="month" className="form-label">
                Month
              </label>
              <select
                id="month"
                className="form-input"
                {...register('month', { 
                  required: 'Month is required',
                  valueAsNumber: true,
                })}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="year" className="form-label">
                Year
              </label>
              <select
                id="year"
                className="form-input"
                {...register('year', { 
                  required: 'Year is required',
                  valueAsNumber: true,
                })}
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
        </div>

        {/* Budget Summary */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Budget Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Balance</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(watchedSalary || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Allocated</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(getTotalAllocated())}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Remaining</p>
              <p className={`text-2xl font-bold ${
                getRemainingBudget() < 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatCurrency(getRemainingBudget())}
              </p>
            </div>
          </div>
        </div>

        {/* Budget Allocations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Budget Allocations</h2>
            <button
              type="button"
              onClick={addAllocation}
              className="btn btn-primary btn-sm flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Allocation
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end space-x-4 p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <label className="form-label">Expense Reason</label>
                  <button
                    type="button"
                    onClick={() => openReasonSelector(index)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-left hover:border-primary-300 hover:bg-primary-50 transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <div className="flex items-center space-x-3">
                      {watchedAllocations[index]?.expenseReasonId > 0 ? (
                        <>
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            {getReasonIcon(getSelectedReasonName(watchedAllocations[index].expenseReasonId))}
                          </div>
                          <span className="text-gray-900">{getSelectedReasonName(watchedAllocations[index].expenseReasonId)}</span>
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
                  {errors.budgetAllocations?.[index]?.expenseReasonId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.budgetAllocations[index]?.expenseReasonId?.message}
                    </p>
                  )}
                  {/* Hidden input for form validation */}
                  <input
                    type="hidden"
                    {...register(`budgetAllocations.${index}.expenseReasonId` as const, {
                      required: 'Please select an expense reason',
                      valueAsNumber: true,
                    })}
                  />
                </div>
                
                <div className="flex-1">
                  <label className="form-label">Allocated Amount</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Enter amount"
                    {...register(`budgetAllocations.${index}.allocatedAmount` as const, {
                      required: 'Amount is required',
                      min: { value: 0, message: 'Amount must be positive' },
                      valueAsNumber: true,
                      validate: (value) => validateAllocation(value, index)
                    })}
                  />
                </div>

                <div className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="btn btn-danger btn-sm p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {fields.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No allocations added yet. Click "Add Allocation" to get started.
              </div>
            )}
          </div>
        </div>

        {/* Quick Add Suggestions */}
        {/* <div className="card">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <Plus className="h-5 w-5 mr-2 text-primary-500" />
            Quick Add Suggestions
          </h3>
          
          <div className="space-y-6">
            {Object.entries(groupedReasons).map(([categoryName, reasons]) => (
              <div key={categoryName}>
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
                
                <div className="flex flex-wrap gap-2">
                  {reasons.slice(0, 8).map((reason) => (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => addQuickAllocation(reason)}
                      className="group relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <span className="truncate max-w-[120px]">{reason.name}</span>
                      {reason.isRecurring && reason.recurringAmount && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 group-hover:bg-primary-100 group-hover:text-primary-700">
                          ₹{(reason.recurringAmount / 1000).toFixed(0)}k
                        </span>
                      )}
                    </button>
                  ))}
                  
                  {reasons.length > 8 && (
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      +{reasons.length - 8} more
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {Object.keys(groupedReasons).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Target className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p className="text-sm">No expense reasons available</p>
                <p className="text-xs text-gray-400 mt-1">Add categories and expense reasons first</p>
              </div>
            )}
          </div>
        </div> */}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || getRemainingBudget() < 0}
            className="btn btn-primary px-8 py-3"
          >
            {submitting ? 
              (currentBudget ? 'Updating Budget...' : 'Creating Budget...') : 
              (currentBudget ? 'Update Budget' : 'Create Budget')
            }
          </button>
        </div>

        {getRemainingBudget() < 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">
              ⚠️ Your total allocations exceed your salary by {formatCurrency(Math.abs(getRemainingBudget()))}. 
              Please adjust your allocations before creating the budget.
            </p>
          </div>
        )}
      </form>

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
                {filteredReasons.length === 0 && searchTerm.length > 0 && (
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
    </div>
  );
};