import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Layers,
  Percent,
} from 'lucide-react';
import { formatINR, getSignedExpenseAmount } from '../utils/financeCalculators';

export const AnalyticsView = ({
  metrics,
  expenses = [],
  investments = [],
  savingsTransfers = [],
  selectedMonthKey,
}) => {
  // Extract month-scoped expenses
  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => e.date && e.date.startsWith(selectedMonthKey));
  }, [expenses, selectedMonthKey]);

  // Category breakdown for current month
  const categoryBreakdown = useMemo(() => {
    const map = {};
    monthExpenses.forEach((e) => {
      const cat = e.category || 'Other';
      map[cat] = (map[cat] || 0) + getSignedExpenseAmount(e);
    });

    return Object.entries(map)
      .map(([cat, total]) => ({
        category: cat,
        total,
        percentage: metrics.totalExpenses > 0 ? Math.round((total / metrics.totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [monthExpenses, metrics.totalExpenses]);

  // Month-over-month comparison across all available months
  const monthlyComparison = useMemo(() => {
    const monthsMap = {};
    expenses.forEach((e) => {
      if (!e.date || !e.date.includes('-')) return;
      const mKey = e.date.substring(0, 7);
      if (!monthsMap[mKey]) {
        monthsMap[mKey] = { essential: 0, flexible: 0, total: 0 };
      }
      const amt = getSignedExpenseAmount(e);
      if (e.type === 'Essential') {
        monthsMap[mKey].essential += amt;
      } else {
        monthsMap[mKey].flexible += amt;
      }
      monthsMap[mKey].total += amt;
    });

    return Object.entries(monthsMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mKey, data]) => ({
        month: mKey,
        ...data,
      }));
  }, [expenses]);

  // User's custom allocation evaluation
  const customPlanEvaluation = useMemo(() => {
    const salary = metrics.salary || 1;
    const essPlanPercent = Math.round((metrics.essentialBudget / salary) * 100);
    const essActualPercent = Math.round((metrics.essentialActual / salary) * 100);

    const flexPlanPercent = Math.round((Math.max(0, metrics.flexibleBudget) / salary) * 100);
    const flexActualPercent = Math.round((metrics.flexibleActual / salary) * 100);

    const invPlanPercent = Math.round((metrics.investmentsAllocation / salary) * 100);
    const invActualPercent = Math.round((metrics.actualInvestments / salary) * 100);

    const savPlanPercent = Math.round((metrics.plannedSavings / salary) * 100);
    const savActualPercent = Math.round((metrics.actualSavings / salary) * 100);

    return [
      {
        name: 'Recurring Expenses',
        planned: metrics.essentialBudget,
        actual: metrics.essentialActual,
        planPercent: essPlanPercent,
        actualPercent: essActualPercent,
        status: metrics.essentialActual <= metrics.essentialBudget ? 'OK' : 'EXCEEDED',
        color: 'bg-neo-yellow',
      },
      {
        name: 'Expenses',
        planned: metrics.flexibleBudget,
        actual: metrics.flexibleActual,
        planPercent: flexPlanPercent,
        actualPercent: flexActualPercent,
        status: metrics.flexibleActual <= metrics.flexibleBudget ? 'OK' : 'EXCEEDED',
        color: 'bg-neo-pink',
      },
      {
        name: 'Investments',
        planned: metrics.investmentsAllocation,
        actual: metrics.actualInvestments,
        planPercent: invPlanPercent,
        actualPercent: invActualPercent,
        status: metrics.actualInvestments >= metrics.investmentsAllocation ? 'MET' : 'PENDING',
        color: 'bg-neo-purple',
      },
      {
        name: 'Planned Savings',
        planned: metrics.plannedSavings,
        actual: metrics.actualSavings,
        planPercent: savPlanPercent,
        actualPercent: savActualPercent,
        status: metrics.actualSavings >= metrics.plannedSavings ? 'MET' : 'SHORTFALL',
        color: 'bg-neo-green',
      },
    ];
  }, [metrics]);

  return (
    <div className="brutal-card p-4 md:p-6 bg-white mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b-2 border-black">
        <div>
          <div className="flex items-center gap-2">
            <span className="brutal-badge bg-neo-yellow text-black">
              FINANCIAL INTELLIGENCE
            </span>
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">
              PORTFOLIO & SPEND ANALYTICS ({selectedMonthKey})
            </h3>
          </div>
          <p className="text-xs font-bold text-black/70 mt-0.5">
            Audit actual spending and savings against your user-defined monthly financial allocation plan.
          </p>
        </div>
      </div>

      {/* Primary: User's Custom Allocation Evaluation */}
      <div className="border-3 border-black p-4 md:p-5 bg-neutral-50 shadow-brutal mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="brutal-badge bg-black text-white">PRIMARY BENCHMARK</span>
            <h4 className="font-black text-base uppercase">
              CUSTOM ALLOCATION PLAN PERFORMANCE
            </h4>
          </div>
          <span className="font-mono text-xs font-bold text-black/60">
            Income Base: {formatINR(metrics.salary)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {customPlanEvaluation.map((item) => (
            <div
              key={item.name}
              className="border-2 border-black p-3 bg-white shadow-brutal-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-xs font-black uppercase">
                    {item.name}
                  </span>
                  <span
                    className={`brutal-badge text-[10px] ${
                      item.status === 'OK' || item.status === 'MET'
                        ? 'bg-emerald-300 text-black'
                        : 'bg-red-400 text-black'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="text-xl font-black font-mono mt-1">
                  {formatINR(item.actual)}
                </div>
                <div className="text-[11px] font-mono text-black/70">
                  Target: {formatINR(item.planned)} ({item.planPercent}% of salary)
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 pt-2 border-t border-black/20">
                <div className="flex justify-between text-[10px] font-mono font-bold mb-1">
                  <span>Actual Share</span>
                  <span>{item.actualPercent}% of Income</span>
                </div>
                <div className="w-full h-2.5 bg-neutral-200 border border-black overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, item.actualPercent)}%` }}
                    className={`h-full ${item.color} transition-all duration-300`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Category Breakdown */}
        <div className="border-2 border-black p-4 bg-white shadow-brutal-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-black">
            <h4 className="font-black text-sm uppercase flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Category Spend Distribution
            </h4>
            <span className="font-mono text-xs font-bold text-black/60">
              Total: {formatINR(metrics.totalExpenses)}
            </span>
          </div>

          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-black/50 italic py-4 text-center">
              No expenses recorded for this month yet.
            </p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((item, idx) => {
                const colors = [
                  'bg-neo-yellow',
                  'bg-neo-pink',
                  'bg-neo-cyan',
                  'bg-neo-purple',
                  'bg-amber-300',
                  'bg-emerald-300',
                  'bg-fuchsia-300',
                  'bg-blue-300',
                ];
                const color = colors[idx % colors.length];

                return (
                  <div key={item.category}>
                    <div className="flex justify-between items-center text-xs font-mono font-bold mb-1">
                      <span className="truncate max-w-[200px]">{item.category}</span>
                      <span>
                        {formatINR(item.total)} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-neutral-100 border border-black overflow-hidden">
                      <div
                        style={{ width: `${item.percentage}%` }}
                        className={`h-full ${color} transition-all duration-300 border-r border-black`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Month-over-Month Spending Comparison */}
        <div className="border-2 border-black p-4 bg-white shadow-brutal-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-black">
            <h4 className="font-black text-sm uppercase flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Month-Over-Month Comparison
            </h4>
            <span className="font-mono text-xs font-bold text-black/60">
              Historical Ledger
            </span>
          </div>

          {monthlyComparison.length === 0 ? (
            <p className="text-xs text-black/50 italic py-4 text-center">
              No historical data available.
            </p>
          ) : (
            <div className="space-y-3">
              {monthlyComparison.map((m) => (
                <div key={m.month} className="border border-black p-2.5 bg-neutral-50">
                  <div className="flex justify-between items-center font-mono text-xs font-bold mb-1">
                    <span className="font-black">{m.month}</span>
                    <span>Total Spends: {formatINR(m.total)}</span>
                  </div>
                  <div className="flex gap-4 text-[11px] font-mono text-black/75">
                    <span>Recurring: {formatINR(m.essential)}</span>
                    <span>Expenses: {formatINR(m.flexible)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Optional Reference: 50/30/20 Rule Benchmark */}
      <div className="border-2 border-black p-4 bg-neo-cream shadow-brutal-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="brutal-badge bg-neutral-300 text-black">REFERENCE ONLY</span>
            <h4 className="font-black text-sm uppercase flex items-center gap-2">
              <Percent className="w-4 h-4" /> Traditional 50 / 30 / 20 Framework
            </h4>
          </div>
          <span className="text-[10px] font-mono text-black/60">
            Secondary comparison guideline
          </span>
        </div>

        <p className="text-xs text-black/75 font-medium mb-3">
          The 50/30/20 guideline recommends 50% for Needs, 30% for Wants, and 20% for Savings & Investments. Your custom plan takes precedence over this theoretical guideline.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border border-black p-2.5 bg-white text-xs font-mono">
            <div className="font-bold">Recurring Expenses</div>
            <div className="text-lg font-black">{formatINR(metrics.essentialActual)}</div>
            <div className="text-[10px] text-black/60">
              {metrics.salary > 0 ? Math.round((metrics.essentialActual / metrics.salary) * 100) : 0}% of salary (Guideline: ≤50%)
            </div>
          </div>

          <div className="border border-black p-2.5 bg-white text-xs font-mono">
            <div className="font-bold">Expenses</div>
            <div className="text-lg font-black">{formatINR(metrics.flexibleActual)}</div>
            <div className="text-[10px] text-black/60">
              {metrics.salary > 0 ? Math.round((metrics.flexibleActual / metrics.salary) * 100) : 0}% of salary (Guideline: ≤30%)
            </div>
          </div>

          <div className="border border-black p-2.5 bg-white text-xs font-mono">
            <div className="font-bold">Savings & Investments</div>
            <div className="text-lg font-black">
              {formatINR(metrics.actualInvestments + metrics.actualSavingsTransfers)}
            </div>
            <div className="text-[10px] text-black/60">
              {metrics.salary > 0 ? Math.round(((metrics.actualInvestments + metrics.actualSavingsTransfers) / metrics.salary) * 100) : 0}% of salary (Guideline: ≥20%)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
