import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Clock,
  TrendingDown,
  Info,
  Calendar,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { formatINR } from '../utils/financeCalculators';
import { motion, AnimatePresence } from 'framer-motion';

export const BudgetAlertBanner = ({ metrics, onOpenSalaryModal, compact = false }) => {
  const isRed = metrics.status === 'red';
  const isOrange = metrics.status === 'orange';
  const isYellow = metrics.status === 'yellow';
  const isGreen = metrics.status === 'green';

  // Card background styling based on status tier
  const bgClass = isRed
    ? 'bg-neo-red text-white shadow-brutal-xl'
    : isOrange
    ? 'bg-amber-400 text-black shadow-brutal-lg'
    : isYellow
    ? 'bg-neo-yellow text-black shadow-brutal-lg'
    : 'bg-neo-green text-black shadow-brutal-lg';

  const badgeBg = isRed
    ? 'bg-black text-white'
    : isOrange
    ? 'bg-black text-amber-300'
    : isYellow
    ? 'bg-black text-neo-yellow'
    : 'bg-black text-neo-green';

  const topCategories = Object.entries(metrics.categorySpendMap || {})
    .filter(([, amount]) => Number(amount) > 0)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 3);

  const reasonItems = (metrics.alerts || []).filter((alert) =>
    ['alloc-exceeded', 'essential-exceeded', 'flexible-unbudgeted', 'flexible-exceeded'].includes(alert.id)
  );

  if (metrics.salary === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        <div className="border-4 border-black p-5 md:p-6 bg-neo-yellow text-black shadow-brutal-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 border-2 border-black bg-black text-neo-yellow shadow-brutal-sm shrink-0">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="brutal-badge bg-black text-neo-yellow font-mono text-xs">
                    FRESH ACCOUNT INITIALIZED
                  </span>
                  <span className="brutal-badge bg-white text-black font-mono text-xs">
                    0 TRANSACTIONS
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">
                  WELCOME! SET UP YOUR MONTHLY SALARY TO BEGIN
                </h2>
                <p className="text-xs md:text-sm font-bold text-black/80 mt-1">
                  Your tracker is ready with a clean slate. Configure your monthly income, essential bills budget, investments, and savings goals.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenSalaryModal}
              className="brutal-btn bg-black text-white hover:bg-neutral-800 px-5 py-3 text-sm shrink-0"
            >
              👉 Set Up Salary & Budget
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-4">
        <div className={`border-2 border-black px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-bold ${bgClass}`}>
          <div className="flex items-center gap-2">
            <span className={`brutal-badge font-mono text-[10px] ${badgeBg}`}>BUDGET STATUS</span>
            <span>{isRed ? 'Budget limit exceeded.' : isOrange ? 'Budget is near its limit.' : isYellow ? 'Spending needs attention.' : 'Your plan is on track.'}</span>
          </div>
          <button onClick={onOpenSalaryModal} className="underline font-black uppercase text-[10px] whitespace-nowrap">Edit allocations</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={metrics.status + metrics.monthKey}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className={`border-4 border-black p-4 md:p-6 transition-all ${bgClass}`}
        >
          {/* Main Status Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 border-2 border-black shadow-brutal-sm ${
                  isRed
                    ? 'bg-black text-neo-red'
                    : isOrange
                    ? 'bg-black text-amber-400'
                    : isYellow
                    ? 'bg-black text-neo-yellow'
                    : 'bg-black text-neo-green'
                }`}
              >
                {isRed ? (
                  <ShieldAlert className="w-8 h-8 stroke-[2.5] animate-pulse" />
                ) : isOrange ? (
                  <AlertCircle className="w-8 h-8 stroke-[2.5]" />
                ) : isYellow ? (
                  <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
                ) : (
                  <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`brutal-badge font-mono text-xs ${badgeBg}`}>
                    STATUS: {isRed ? 'CRITICAL OVERBUDGET' : isOrange ? 'ORANGE WARNING (90%-100%)' : isYellow ? 'YELLOW THRESHOLD (75%-90%)' : 'GREEN OPTIMAL (< 75%)'}
                  </span>

                  {metrics.unallocatedIncome > 0 && (
                    <span className="brutal-badge bg-white text-black font-mono text-xs">
                      UNALLOCATED SURPLUS: {formatINR(metrics.unallocatedIncome)}
                    </span>
                  )}

                  {metrics.unallocatedIncome < 0 && (
                    <span className="brutal-badge bg-black text-white font-mono text-xs">
                      DEFICIT: {formatINR(Math.abs(metrics.unallocatedIncome))}
                    </span>
                  )}

                  <span className="brutal-badge bg-white text-black font-mono text-xs">
                    MONTH: {metrics.monthKey}
                  </span>
                </div>

                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">
                  {isRed
                    ? 'ATTENTION: FINANCIAL BUDGET LIMIT EXCEEDED'
                    : isOrange
                    ? 'APPROACHING MAXIMUM BUDGET CAP'
                    : isYellow
                    ? 'BUDGET CAUTION: MODERATE CONSUMPTION'
                    : 'FINANCIAL PLAN ON TRACK // HEALTHY ALLOCATION'}
                </h2>

                <p className={`text-xs md:text-sm font-bold mt-1 ${isRed ? 'text-white/95' : 'text-black/85'}`}>
                  {isRed
                    ? 'One or more budget limits or committed allocations have been breached. Review active alerts below to prevent cash deficits.'
                    : isOrange
                    ? 'Expenses have crossed 90% of your designated caps. Only essential non-deferrable spending recommended.'
                    : isYellow
                    ? 'Spending is between 75% and 90% of your budget allocations. Pace yourself for the remaining days of the month.'
                    : `Your expenses and investments are fully within plan. Total monthly commitments are ${metrics.allocationPercent}% of salary.`}
                </p>
              </div>
            </div>

            {/* Right Summary Box & Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div
                className={`border-2 border-black p-3 text-center min-w-[140px] ${
                  isRed ? 'bg-black text-white' : 'bg-white text-black'
                }`}
              >
                <div className="text-[10px] uppercase font-mono font-bold tracking-wider">
                  TOTAL SPENT & INVESTED
                </div>
                <div className="text-xl font-black font-mono">
                  {formatINR(metrics.totalCashOutflow)}
                </div>
                <div className="text-[10px] font-bold opacity-80">
                  {metrics.totalOutflowPercent}% of salary
                </div>
              </div>

              <button
                onClick={onOpenSalaryModal}
                className={`brutal-btn px-4 py-2.5 text-xs md:text-sm ${
                  isRed ? 'bg-white text-black hover:bg-neutral-100' : 'bg-black text-white hover:bg-neutral-800'
                }`}
              >
                Edit Allocations
              </button>
            </div>
          </div>

          {/* Plain-language explanation of the budget rule */}
          <div className="mt-4 pt-3 border-t-2 border-black">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="border-2 border-black bg-white text-black p-3">
                <div className="text-[10px] font-mono font-black uppercase mb-2">How your budget is calculated</div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono font-bold">
                  <span className="bg-cyan-100 border border-black px-1.5 py-1">Salary {formatINR(metrics.salary)}</span>
                  <span>−</span>
                  <span className="bg-purple-100 border border-black px-1.5 py-1">Investments {formatINR(metrics.investmentsAllocation)}</span>
                  <span>−</span>
                  <span className="bg-amber-100 border border-black px-1.5 py-1">Recurring {formatINR(metrics.essentialBudget)}</span>
                  <span>−</span>
                  <span className="bg-green-100 border border-black px-1.5 py-1">Savings {formatINR(metrics.plannedSavings)}</span>
                  <span>−</span>
                  <span className="bg-orange-100 border border-black px-1.5 py-1">Loan EMIs {formatINR(metrics.loanCommitment)}</span>
                  <span>=</span>
                  <span className={`border border-black px-1.5 py-1 font-black ${metrics.flexibleBudget <= 0 ? 'bg-red-200 text-red-900' : 'bg-pink-100'}`}>
                    Expenses {formatINR(metrics.flexibleBudget)}
                  </span>
                </div>
                <p className="text-[11px] font-bold mt-2 text-black/70">
                  This is the maximum available for non-essential spending after your planned commitments.
                </p>
              </div>

              <div className="border-2 border-black bg-black text-white p-3">
                <div className="text-[10px] font-mono font-black uppercase mb-2 text-neo-yellow">Why the status changed</div>
                {reasonItems.length > 0 ? (
                  <div className="space-y-1.5">
                    {reasonItems.map((alert) => (
                      <div key={alert.id} className="flex items-start gap-2 text-xs font-bold">
                        <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-neo-yellow" />
                        <span>{alert.message}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs font-bold">No budget limit has been crossed. Your current spending is within the plan.</div>
                )}
                {topCategories.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/40 text-[11px] font-mono font-bold">
                    Biggest expense categories: {topCategories.map(([category, amount], index) => (
                      <span key={category}>{index > 0 ? ' · ' : ''}{category} {formatINR(amount)}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actionable Alerts List */}
          {metrics.alerts && metrics.alerts.length > 0 && (
            <div className="mt-4 pt-3 border-t-2 border-black space-y-2">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>Actionable Financial Alerts ({metrics.alerts.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {metrics.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`border-2 border-black p-2.5 text-xs font-bold flex items-start gap-2 shadow-brutal-sm ${
                      alert.type === 'red'
                        ? 'bg-red-100 text-red-950 border-red-900'
                        : alert.type === 'orange'
                        ? 'bg-amber-100 text-amber-950 border-amber-900'
                        : 'bg-yellow-100 text-yellow-950 border-yellow-900'
                    }`}
                  >
                    <span className="font-mono text-sm leading-none shrink-0">
                      {alert.type === 'red' ? '🛑' : alert.type === 'orange' ? '⚠️' : '⚡'}
                    </span>
                    <div>
                      <div className="font-mono font-black uppercase text-[11px]">
                        {alert.title}
                      </div>
                      <div className="text-[11px] font-medium mt-0.5 leading-snug">
                        {alert.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Segmented Allocation Gauge */}
          <div className="mt-4 pt-3 border-t-2 border-black">
            <div className="flex justify-between items-center text-xs font-mono font-bold mb-1.5 uppercase">
              <span>Monthly Salary Allocation & Spend Gauge</span>
              <span>
                Income: {formatINR(metrics.salary)} | Outflow: {formatINR(metrics.totalCashOutflow)} ({metrics.totalOutflowPercent}%)
              </span>
            </div>

            <div className="w-full h-5 bg-white border-2 border-black p-0.5 overflow-hidden flex">
              {/* Essential actual segment */}
              <div
                style={{
                  width: `${Math.min(100, (metrics.essentialActual / (metrics.salary || 1)) * 100)}%`,
                }}
                className="h-full bg-neo-yellow border-r-2 border-black transition-all duration-300"
                title={`Recurring Expense Actual: ${formatINR(metrics.essentialActual)}`}
              />

              {/* Flexible actual segment */}
              <div
                style={{
                  width: `${Math.min(100, (metrics.flexibleActual / (metrics.salary || 1)) * 100)}%`,
                }}
                className="h-full bg-neo-pink border-r-2 border-black transition-all duration-300"
                title={`Expense Actual: ${formatINR(metrics.flexibleActual)}`}
              />

              {/* Actual Investments segment */}
              <div
                style={{
                  width: `${Math.min(100, (metrics.actualInvestments / (metrics.salary || 1)) * 100)}%`,
                }}
                className="h-full bg-neo-purple border-r-2 border-black transition-all duration-300"
                title={`Actual Investments: ${formatINR(metrics.actualInvestments)}`}
              />

              {/* Actual Savings Transfers segment */}
              <div
                style={{
                  width: `${Math.min(100, (metrics.actualSavingsTransfers / (metrics.salary || 1)) * 100)}%`,
                }}
                className="h-full bg-neo-green border-r-2 border-black transition-all duration-300"
                title={`Savings Transferred: ${formatINR(metrics.actualSavingsTransfers)}`}
              />

              {/* Liquid Bank Balance / Remaining or Deficit */}
              {metrics.remainingBankBalance > 0 ? (
                <div
                  style={{
                    width: `${Math.min(100, (metrics.remainingBankBalance / (metrics.salary || 1)) * 100)}%`,
                  }}
                  className="h-full bg-cyan-200 transition-all duration-300"
                  title={`Liquid Bank Balance: ${formatINR(metrics.remainingBankBalance)}`}
                />
              ) : metrics.remainingBankBalance < 0 ? (
                <div className="h-full flex-1 bg-red-600 animate-pulse" title="Cash Deficit!" />
              ) : null}
            </div>

            {/* Gauge Legend */}
            <div className="flex flex-wrap gap-3 mt-2 text-[11px] font-mono font-bold uppercase">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-neo-yellow border border-black inline-block" />
                  Recurring: {formatINR(metrics.essentialActual)} / {formatINR(metrics.essentialBudget)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-neo-pink border border-black inline-block" />
                Expenses: {formatINR(metrics.flexibleActual)} / {formatINR(metrics.flexibleBudget)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-neo-purple border border-black inline-block" />
                Investments: {formatINR(metrics.actualInvestments)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-neo-green border border-black inline-block" />
                Transferred to Savings: {formatINR(metrics.actualSavingsTransfers)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-cyan-200 border border-black inline-block" />
                Bank Residual: {formatINR(metrics.remainingBankBalance)}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
