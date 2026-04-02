import React, { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../services/dashboard';
import { DashboardSummary } from '../types/dashboard';
import { toast } from 'react-hot-toast';
import { 
  IndianRupee, 
  CreditCard, 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  PieChart as PieChartIcon
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getSummary(selectedMonth, selectedYear);
      setDashboardData(data);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
      <div className="text-center py-12">
        <PieChartIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No budget data</h3>
        <p className="mt-1 text-sm text-gray-500">
          Create a monthly budget for {selectedMonth}/{selectedYear} to see your dashboard.
        </p>
        <div className="mt-6">
          <a
            href="/budget"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            Create Budget
          </a>
        </div>
      </div>
    );
  }

  const budgetUsedPercentage = dashboardData.totalSalary > 0 
    ? (dashboardData.totalSpent / dashboardData.totalSalary) * 100 
    : 0;

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <IndianRupee className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Salary</p>
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
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(category.categoryType)}`}>
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
          <h3 className="text-lg font-semibold mb-4">Top Spending Reason</h3>
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-primary-600">
              {formatCurrency(dashboardData.topSpendingReason.amount)}
            </p>
            <p className="text-lg text-gray-700 mt-2">
              {dashboardData.topSpendingReason.name}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Comparison */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Monthly Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Current Month</h4>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(dashboardData.monthlyComparison.currentMonth.totalSpent)}
            </p>
            <p className="text-sm text-gray-500">
              {dashboardData.monthlyComparison.currentMonth.month}/{dashboardData.monthlyComparison.currentMonth.year}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Previous Month</h4>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(dashboardData.monthlyComparison.previousMonth.totalSpent)}
            </p>
            <p className="text-sm text-gray-500">
              {dashboardData.monthlyComparison.previousMonth.month}/{dashboardData.monthlyComparison.previousMonth.year}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Change</span>
            <div className="flex items-center space-x-2">
              {dashboardData.monthlyComparison.changes.totalChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
              <span className={`text-sm font-medium ${
                dashboardData.monthlyComparison.changes.totalChange >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatCurrency(Math.abs(dashboardData.monthlyComparison.changes.totalChange))} 
                ({Math.abs(dashboardData.monthlyComparison.changes.totalChangePercentage).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
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
    </div>
  );
};