import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { dashboardService } from '../services/dashboard';
import { TopSpendingReason, SpendingReasonTransaction } from '../types/dashboard';
import { formatCurrency } from '../utils/format';

const RANK_COLORS = [
  'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-400', 'bg-indigo-400',
  'bg-purple-400', 'bg-pink-400', 'bg-teal-400', 'bg-green-400', 'bg-gray-400',
];

export const TransactionReasonsPage: React.FC = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [reasons, setReasons] = useState<TopSpendingReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReason, setExpandedReason] = useState<string | null>(null);

  const fetchReasons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getAllSpendingReasons(selectedMonth, selectedYear);
      setReasons(data);
    } catch {
      setReasons([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchReasons();
  }, [fetchReasons]);

  const maxAmount = reasons.length > 0 ? reasons[0].totalAmount : 0;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const yearOptions = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Reasons</h1>
          <p className="text-sm text-gray-400 mt-0.5">All spending reasons ranked by amount</p>
        </div>
      </div>

      {/* Month / Year selectors */}
      <div className="flex gap-3">
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(Number(e.target.value))}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
        >
          {monthNames.map((name, i) => (
            <option key={i + 1} value={i + 1}>{name}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
        >
          {yearOptions.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="card">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : reasons.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No tagged expenses for this month</p>
        ) : (
          <div className="space-y-2">
            {reasons.map((reason, index) => {
              const isExpanded = expandedReason === reason.name;
              const barWidth = maxAmount > 0 ? (reason.totalAmount / maxAmount) * 100 : 0;
              const barColor = RANK_COLORS[index] ?? 'bg-gray-300';

              return (
                <div key={reason.name} className="rounded-lg border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setExpandedReason(isExpanded ? null : reason.name)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">#{index + 1}</span>
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
                            className={`h-1.5 rounded-full ${barColor} transition-all duration-300`}
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
  );
};
