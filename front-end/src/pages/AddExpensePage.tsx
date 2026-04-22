import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, IndianRupee, Search, Star, Clock, Zap } from 'lucide-react';
import { categoryService, expenseReasonService } from '../services/categories';
import { transactionService } from '../services/transactions';
import { budgetService } from '../services/budget';
import { Category, ExpenseReason } from '../types/budget';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface TransactionForm {
  amount: number;
  transactionType: 'debit' | 'credit';
  transactionDate: string;
  notes?: string;
  expenseReasonId: number;
}

export const AddExpensePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<TransactionForm>({
    defaultValues: {
      transactionDate: new Date().toISOString().split('T')[0],
      transactionType: 'debit',
    }
  });

  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [reasons, setReasons] = useState<ExpenseReason[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedReason, setSelectedReason] = useState<ExpenseReason | null>(null);
  const [allocatedAmounts, setAllocatedAmounts] = useState<{[reasonId: number]: number}>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentReasons, setRecentReasons] = useState<ExpenseReason[]>([]);
  const [frequentReasons, setFrequentReasons] = useState<ExpenseReason[]>([]);

  // Watch amount and transactionType for dynamic display
  const watchedAmount = watch('amount');
  const watchedTransactionType = watch('transactionType');
  const suggestedAmount = selectedReason ? (allocatedAmounts[selectedReason.id] || 0) : 0;

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [categoriesData, reasonsData, budgetData, transactionsData] = await Promise.all([
          categoryService.getAll(),
          expenseReasonService.getAll(),
          budgetService.getCurrentMonth(),
          transactionService.getAll()
        ]);

        setCategories(categoriesData);
        setReasons(reasonsData);

        // Map allocated amounts by reason ID
        const allocations: {[reasonId: number]: number} = {};
        if (budgetData?.budgetAllocations) {
          budgetData.budgetAllocations.forEach((allocation) => {
            allocations[allocation.expenseReasonId] = allocation.allocatedAmount;
          });
        }
        setAllocatedAmounts(allocations);

        // Get recent transactions to determine frequent reasons
        const reasonUsage: {[reasonId: number]: number} = {};
        const recentReasonIds = new Set<number>();
        
        // Count usage and get recent ones (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        transactionsData.forEach(transaction => {
          reasonUsage[transaction.expenseReasonId] = (reasonUsage[transaction.expenseReasonId] || 0) + 1;
          
          const transactionDate = new Date(transaction.transactionDate);
          if (transactionDate >= thirtyDaysAgo) {
            recentReasonIds.add(transaction.expenseReasonId);
          }
        });

        // Sort reasons by usage frequency
        const sortedByFrequency = reasonsData
          .filter(reason => reasonUsage[reason.id] > 0)
          .sort((a, b) => (reasonUsage[b.id] || 0) - (reasonUsage[a.id] || 0))
          .slice(0, 5);

        // Get recent reasons
        const recentReasonsList = reasonsData
          .filter(reason => recentReasonIds.has(reason.id))
          .slice(0, 5);

        setFrequentReasons(sortedByFrequency);
        setRecentReasons(recentReasonsList);
      } catch (error) {
        console.error('Error fetching data:', error);
        // Fallback - just get categories and reasons
        try {
          const [categoriesData, reasonsData] = await Promise.all([
            categoryService.getAll(),
            expenseReasonService.getAll()
          ]);
          setCategories(categoriesData);
          setReasons(reasonsData);
        } catch (fallbackError) {
          console.error('Fallback fetch also failed:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle category selection
  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedReason(null);
  };

  // Handle reason selection with auto-populate amount
  const handleReasonSelect = (reason: ExpenseReason) => {
    setSelectedReason(reason);
    setValue('expenseReasonId', reason.id);

    // Auto-populate amount if budget is allocated
    const allocatedAmount = allocatedAmounts[reason.id];
    if (allocatedAmount > 0) {
      setValue('amount', allocatedAmount);
    }
  };

  // Form submission
  const onSubmit = async (data: TransactionForm) => {
    try {
      setSubmitting(true);
      await transactionService.create({
        ...data,
        expenseReasonId: selectedReason!.id,
        transactionType: data.transactionType || 'debit',
      });
      reset();
      navigate('/transactions');
    } catch (error) {
      console.error('Error creating transaction:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Get icon for category
  const getCategoryIcon = (categoryName: string): React.ReactNode => {
    const iconClass = "h-6 w-6 text-gray-600";
    
    switch (categoryName.toLowerCase()) {
      case 'food':
        return <span className={iconClass}>🍽️</span>;
      case 'transport':
        return <span className={iconClass}>🚗</span>;
      case 'entertainment':
        return <span className={iconClass}>🎬</span>;
      case 'shopping':
        return <span className={iconClass}>🛍️</span>;
      case 'bills':
        return <span className={iconClass}>📋</span>;
      case 'health':
        return <span className={iconClass}>⚕️</span>;
      default:
        return <span className={iconClass}>💰</span>;
    }
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

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString()}`;
  };

  // Quick amount suggestions
  const quickAmounts = [100, 500, 1000];

  // Filter reasons by selected category and search term
  const filteredReasons = selectedCategory
    ? reasons.filter(reason => {
        const matchesCategory = reason.categoryId === selectedCategory.id;
        const matchesSearch = searchTerm.length === 0 || 
          reason.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reason.description?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
      })
    : [];

  // Get suggested reasons (frequent + recent, filtered by category and search)
  const getSuggestedReasons = () => {
    if (!selectedCategory) return [];
    
    const suggested = new Set<ExpenseReason>();
    
    // Add frequent reasons from this category
    frequentReasons
      .filter(r => r.categoryId === selectedCategory.id)
      .forEach(r => suggested.add(r));
    
    // Add recent reasons from this category
    recentReasons
      .filter(r => r.categoryId === selectedCategory.id)
      .forEach(r => suggested.add(r));
    
    // Filter by search term if provided
    const result = Array.from(suggested).filter(reason => {
      if (searchTerm.length === 0) return true;
      return reason.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             reason.description?.toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    return result.slice(0, 3); // Show max 3 suggested
  };

  const suggestedReasons = getSuggestedReasons();
  const otherReasons = filteredReasons.filter(reason => 
    !suggestedReasons.some(suggested => suggested.id === reason.id)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Expense</h1>
            <p className="text-gray-600">Record your spending</p>
          </div>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Categories */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Category</h2>
              <div className="space-y-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category)}
                    className={`w-full p-4 rounded-xl border transition-all text-left ${
                      selectedCategory?.id === category.id
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        {getCategoryIcon(category.name)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{category.name}</h3>
                        {category.description && (
                          <p className="text-sm text-gray-500">{category.description}</p>
                        )}
                      </div>
                      {selectedCategory?.id === category.id && (
                        <Check className="h-5 w-5 text-primary-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Expense Reasons */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Expense Type</h2>
              {!selectedCategory ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <ArrowLeft className="h-6 w-6 text-gray-400 rotate-180" />
                  </div>
                  <p className="text-gray-500">Select a category first</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search expense types..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Suggested Reasons */}
                  {suggestedReasons.length > 0 && (
                    <div>
                      <div className="flex items-center mb-3">
                        <Zap className="h-4 w-4 text-yellow-500 mr-2" />
                        <h3 className="text-sm font-medium text-gray-700">Quick Select</h3>
                      </div>
                      <div className="space-y-2">
                        {suggestedReasons.map((reason) => (
                          <button
                            key={`suggested-${reason.id}`}
                            onClick={() => handleReasonSelect(reason)}
                            className={`w-full p-3 rounded-lg border transition-all text-left ${
                              selectedReason?.id === reason.id
                                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                                : 'border-yellow-200 bg-yellow-50 hover:border-yellow-300 hover:bg-yellow-100'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                                {getReasonIcon(reason.name)}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 text-sm">{reason.name}</h4>
                                {allocatedAmounts[reason.id] && (
                                  <p className="text-xs text-green-600 font-medium">
                                    Budget: {formatCurrency(allocatedAmounts[reason.id])}
                                  </p>
                                )}
                              </div>
                              {frequentReasons.some(fr => fr.id === reason.id) && (
                                <Star className="h-3 w-3 text-yellow-500" />
                              )}
                              {recentReasons.some(rr => rr.id === reason.id) && !frequentReasons.some(fr => fr.id === reason.id) && (
                                <Clock className="h-3 w-3 text-blue-500" />
                              )}
                              {selectedReason?.id === reason.id && (
                                <Check className="h-4 w-4 text-primary-600" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Reasons */}
                  <div>
                    {suggestedReasons.length > 0 && (
                      <h3 className="text-sm font-medium text-gray-700 mb-3">All Options</h3>
                    )}
                    <div className="space-y-2">
                      {otherReasons.map((reason) => (
                        <button
                          key={reason.id}
                          onClick={() => handleReasonSelect(reason)}
                          className={`w-full p-4 rounded-xl border transition-all text-left ${
                            selectedReason?.id === reason.id
                              ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              {getReasonIcon(reason.name)}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{reason.name}</h3>
                              {reason.description && (
                                <p className="text-sm text-gray-500">{reason.description}</p>
                              )}
                              {allocatedAmounts[reason.id] && (
                                <p className="text-sm text-green-600 font-medium">
                                  Budget: {formatCurrency(allocatedAmounts[reason.id])}
                                </p>
                              )}
                            </div>
                            {selectedReason?.id === reason.id && (
                              <Check className="h-5 w-5 text-primary-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* No results message */}
                  {filteredReasons.length === 0 && searchTerm.length > 0 && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Search className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500">No expense types found for "{searchTerm}"</p>
                      <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Amount & Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Enter Amount & Details</h2>
              
              {!selectedReason ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <IndianRupee className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500">Choose expense type first</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Transaction Type Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setValue('transactionType', 'debit')}
                        className={`py-2.5 px-4 rounded-lg border-2 font-semibold text-sm transition-all ${
                          watchedTransactionType !== 'credit'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        💸 Debit
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue('transactionType', 'credit')}
                        className={`py-2.5 px-4 rounded-lg border-2 font-semibold text-sm transition-all ${
                          watchedTransactionType === 'credit'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        💰 Credit
                      </button>
                    </div>
                    <input type="hidden" {...register('transactionType')} />
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (₹)
                    </label>
                    {suggestedAmount > 0 && (
                      <p className="text-sm text-green-600 mb-2">
                        💡 Budget allocated: {formatCurrency(suggestedAmount)}
                      </p>
                    )}
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg font-semibold text-center"
                        placeholder="0"
                        {...register('amount', {
                          required: 'Amount is required',
                          min: { value: 1, message: 'Amount must be greater than 0' },
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
                    )}
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="grid grid-cols-3 gap-3">
                    {quickAmounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setValue('amount', amount)}
                        className="p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all text-center font-medium"
                      >
                        ₹{amount.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      {...register('transactionDate', { required: 'Date is required' })}
                    />
                    {errors.transactionDate && (
                      <p className="text-sm text-red-600 mt-1">{errors.transactionDate.message}</p>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                      rows={3}
                      placeholder="Add a note..."
                      {...register('notes')}
                    />
                  </div>

                  {/* Summary Card */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">Summary</h4>
                    <div className="space-y-1 text-sm text-green-800">
                      <p><span className="font-medium">Category:</span> {selectedCategory?.name}</p>
                      <p><span className="font-medium">Type:</span> {selectedReason.name}</p>
                      <p><span className="font-medium">Amount:</span> ₹{watchedAmount?.toLocaleString() || 0}</p>
                      <p><span className="font-medium">Transaction:</span>{' '}
                        <span className={watchedTransactionType === 'credit' ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                          {watchedTransactionType === 'credit' ? '+ Credit' : '- Debit'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting || !watchedAmount || watchedAmount <= 0}
                    className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold py-4 px-6 rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg disabled:hover:scale-100"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Adding...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Check className="h-5 w-5 mr-2" />
                        Add ₹{watchedAmount?.toLocaleString() || 0} Expense
                      </div>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};