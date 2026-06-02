import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/format';
import { dashboardService } from '../services/dashboard';
import { budgetService } from '../services/budget';
import { toast } from 'react-hot-toast';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  PieChart,
  BarChart3,
  Target,
  Activity
} from 'lucide-react';

interface MonthlySpending {
  month: string;
  amount: number;
  budget: number;
  percentage: number;
}

interface CategorySpending {
  categoryId: number;
  categoryName: string;
  categoryType: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
}

export const AnalyticsPage: React.FC = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlySpending[]>([]);
  const [categoryData, setCategoryData] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'6months' | '12months'>('6months');
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalBudget, setTotalBudget] = useState(0);
  const [avgMonthlySpending, setAvgMonthlySpending] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const currentYear = new Date().getFullYear();
        
        // Fetch yearly trend data and monthly budgets
        const [yearlyTrend, monthlyBudgets] = await Promise.all([
          dashboardService.getYearlyTrend(currentYear),
          budgetService.getAll()
        ]);
        
        const monthsToShow = selectedPeriod === '6months' ? 6 : 12;
        const recentMonths = yearlyTrend.slice(-monthsToShow);
        
        const transformedData: MonthlySpending[] = recentMonths.map(item => {
          const spent = parseFloat(item.totalSpent);
          const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
          ];
          
          // Find the corresponding budget for this month/year
          const monthBudget = monthlyBudgets.find(budget => 
            budget.month === item.month && budget.year === currentYear
          );
          
          const budgetAmount = monthBudget ? Number(monthBudget.salary) : 0;
          
          return {
            month: `${monthNames[item.month - 1]} ${currentYear}`,
            amount: spent,
            budget: budgetAmount,
            percentage: budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0
          };
        });
        
        setMonthlyData(transformedData);

        // Calculate totals
        const totalSpentAmount = transformedData.reduce((sum, month) => sum + month.amount, 0);
        const totalBudgetAmount = transformedData.reduce((sum, month) => sum + month.budget, 0);
        
        setTotalSpent(totalSpentAmount);
        setTotalBudget(totalBudgetAmount);
        setAvgMonthlySpending(totalSpentAmount / monthsToShow);

        // Fetch current month's category data
        const currentMonth = new Date().getMonth() + 1;
        const dashboardSummary = await dashboardService.getSummary(currentMonth, currentYear);

        // Use real category data from dashboard summary
        const categorySpending: CategorySpending[] = [];
        
        if (dashboardSummary.categorySpending && dashboardSummary.categorySpending.length > 0) {
          // Use actual category spending data from the database
          dashboardSummary.categorySpending.forEach((category, index) => {
            categorySpending.push({
              categoryId: index + 1,
              categoryName: category.categoryName,
              categoryType: category.categoryType,
              totalAmount: category.totalSpent,
              percentage: category.percentage,
              transactionCount: category.transactionCount
            });
          });
        }

        setCategoryData(categorySpending);

      } catch (error) {
        toast.error('Failed to fetch analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPeriod]);


  const getCategoryColor = (categoryType: string, index: number) => {
    const colors = {
      wants: ['bg-purple-500', 'bg-purple-400', 'bg-purple-300'],
      needs: ['bg-blue-500', 'bg-blue-400', 'bg-blue-300'],
      investments: ['bg-green-500', 'bg-green-400', 'bg-green-300'],
    };
    
    const typeColors = colors[categoryType.toLowerCase() as keyof typeof colors] || 
                      ['bg-gray-500', 'bg-gray-400', 'bg-gray-300'];
    
    return typeColors[index % typeColors.length] || 'bg-gray-500';
  };

  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const savingsRate = totalBudget > 0 ? ((totalBudget - totalSpent) / totalBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as '6months' | '12months')}
            className="form-input"
          >
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center">
                <IndianRupee className="h-8 w-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(totalSpent)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Budget</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(totalBudget)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Avg Monthly</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(avgMonthlySpending)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                {budgetUtilization <= 80 ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Budget Used</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {budgetUtilization.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Spending Trend */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Monthly Spending Trend
              </h2>
            </div>
            
            <div className="space-y-4">
              {monthlyData.map((month, index) => (
                <div key={month.month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{month.month}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-600">
                        {formatCurrency(month.amount)} / {formatCurrency(month.budget)}
                      </span>
                      <span className={`font-medium ${
                        month.percentage <= 80 ? 'text-green-600' : 
                        month.percentage <= 100 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {month.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        month.percentage <= 80 ? 'bg-green-500' : 
                        month.percentage <= 100 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(month.percentage, 100)}%` }}
                    />
                    {month.percentage > 100 && (
                      <div
                        className="h-3 bg-red-600 rounded-r-full -mt-3"
                        style={{ 
                          width: `${Math.min(month.percentage - 100, 50)}%`,
                          marginLeft: '100%'
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Spending Chart */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-6 flex items-center">
                <PieChart className="h-5 w-5 mr-2" />
                Category Breakdown (Current Month)
              </h2>
              
              <div className="space-y-4">
                {categoryData.map((category, index) => (
                  <div key={category.categoryId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <div
                          className={`w-3 h-3 rounded-full mr-2 ${getCategoryColor(category.categoryType, index)}`}
                        />
                        <span className="font-medium">{category.categoryName}</span>
                        <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {category.categoryType}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(category.totalAmount)}</div>
                        <div className="text-xs text-gray-500">
                          {category.percentage.toFixed(1)}% • {category.transactionCount} transactions
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getCategoryColor(category.categoryType, index)}`}
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                
                {categoryData.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <PieChart className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No spending data available for this month</p>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Health */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-6 flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Financial Health
              </h2>
              
              <div className="space-y-6">
                {/* Budget Utilization */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Budget Utilization</span>
                    <span className={`font-bold ${
                      budgetUtilization <= 80 ? 'text-green-600' : 
                      budgetUtilization <= 100 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {budgetUtilization.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        budgetUtilization <= 80 ? 'bg-green-500' : 
                        budgetUtilization <= 100 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    {budgetUtilization <= 80 ? 'Great! You\'re staying within budget.' :
                     budgetUtilization <= 100 ? 'You\'re close to your budget limit.' :
                     'You\'ve exceeded your budget this period.'}
                  </p>
                </div>

                {/* Savings Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Savings Rate</span>
                    <span className={`font-bold ${savingsRate >= 20 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {Math.max(savingsRate, 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${savingsRate >= 20 ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    {savingsRate >= 20 ? 'Excellent savings rate!' :
                     savingsRate >= 10 ? 'Good savings rate, try to increase it.' :
                     'Consider reducing expenses to save more.'}
                  </p>
                </div>

                {/* Monthly Comparison */}
                {monthlyData.length >= 2 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-sm mb-2">Month-over-Month</h3>
                    {(() => {
                      const current = monthlyData[monthlyData.length - 1];
                      const previous = monthlyData[monthlyData.length - 2];
                      const change = ((current.amount - previous.amount) / previous.amount) * 100;
                      const isIncrease = change > 0;
                      
                      return (
                        <div className="flex items-center">
                          {isIncrease ? (
                            <TrendingUp className="h-4 w-4 text-red-500 mr-2" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-green-500 mr-2" />
                          )}
                          <span className={`text-sm font-medium ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                            {Math.abs(change).toFixed(1)}% {isIncrease ? 'increase' : 'decrease'}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};