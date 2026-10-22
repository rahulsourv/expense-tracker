import React, { useMemo } from 'react';
import { CalendarDays, Plus, Wallet } from 'lucide-react';
import { formatINR, getSignedExpenseAmount } from '../utils/financeCalculators';
import { BUDGET_TOPICS, topicForExpense } from '../utils/budgetTopics';

const monthLabel = (key) => {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: '2-digit',
  });
};

export const MonthlyBudgetView = ({
  selectedMonthKey,
  setSelectedMonthKey,
  availableMonthKeys,
  expenses,
  salaryData,
  metrics,
  onOpenAddModal,
}) => {
  const monthExpenses = useMemo(
    () => expenses.filter((expense) => expense.date?.substring(0, 7) === selectedMonthKey),
    [expenses, selectedMonthKey]
  );

  const rows = useMemo(() => BUDGET_TOPICS.map((topic, index) => {
    const used = monthExpenses
      .filter((expense) => topicForExpense(expense) === topic.name)
      .reduce((sum, expense) => sum + getSignedExpenseAmount(expense), 0);
    const budget = Object.entries(salaryData?.categoryBudgets || {})
      .filter(([category]) => BUDGET_TOPICS.find((item) => item.name === topic.name)?.match.some((term) => category.toLowerCase().includes(term)))
      .reduce((sum, [, value]) => sum + Number(value || 0), 0);
    return { number: index + 1, name: topic.name, budget, used, left: budget - used };
  }), [monthExpenses, salaryData]);

  const totalBudget = rows.reduce((sum, row) => sum + row.budget, 0);
  const totalUsed = rows.reduce((sum, row) => sum + row.used, 0);
  const salary = Number(salaryData?.monthlySalary || 0);

  return (
    <section className="border-3 border-black bg-white shadow-brutal p-4 md:p-5 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-5 h-5" />
            <h2 className="text-lg md:text-xl font-black uppercase">Monthly Budget</h2>
          </div>
            <p className="text-xs font-mono font-bold text-black/60">Topics group your categories so you can see where the monthly budget went.</p>
        </div>
        <button onClick={onOpenAddModal} className="brutal-btn bg-neo-yellow px-3 py-2 text-xs font-black uppercase">
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      <div className="border-2 border-black bg-cyan-50 p-3 mb-4 text-[11px] font-bold">
        <span className="font-black uppercase">How to read this table:</span>
        <span className="ml-2">Topic = grouped categories · Budget = limit you set · Used = recorded expenses this month · Left = Budget minus Used.</span>
        <span className="ml-2 text-black/60">Rows with ₹0 have no category limit yet; they are shown only so every topic remains available.</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 border-b-2 border-black" role="tablist" aria-label="Monthly budget tabs">
        {availableMonthKeys.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={selectedMonthKey === key}
            onClick={() => setSelectedMonthKey(key)}
            className={`shrink-0 border-2 border-black px-3 py-1.5 text-xs font-black uppercase ${selectedMonthKey === key ? 'bg-black text-white shadow-brutal-sm' : 'bg-neutral-100 hover:bg-neo-cyan'}`}
          >
            {monthLabel(key)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="border-2 border-black bg-cyan-100 p-3">
          <div className="text-[10px] font-mono font-black uppercase">Income</div>
          <div className="text-xl font-black font-mono">{formatINR(salary)}</div>
        </div>
        <div className="border-2 border-black bg-amber-100 p-3">
          <div className="text-[10px] font-mono font-black uppercase">Category Budgets</div>
          <div className="text-xl font-black font-mono">{formatINR(totalBudget)}</div>
          <div className="text-[10px] font-bold mt-1">Optional limits set in Edit Allocations</div>
        </div>
        <div className={`border-2 border-black p-3 ${salary - totalUsed < 0 ? 'bg-red-200' : 'bg-emerald-100'}`}>
          <div className="text-[10px] font-mono font-black uppercase">Income After Expenses</div>
          <div className="text-xl font-black font-mono">{formatINR(salary - totalUsed)}</div>
          <div className="text-[10px] font-bold mt-1">Does not include investments or savings transfers</div>
        </div>
      </div>

      <div className={`border-2 border-black p-3 mb-5 ${metrics?.savingsAdjustment >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono font-black uppercase">How this month changed your savings</div>
            <div className="text-sm font-black mt-1">
              {metrics?.savingsAdjustment >= 0
                ? `You have ${formatINR(metrics.savingsAdjustment)} extra savings because spending was below the plan.`
                : `You used ${formatINR(Math.abs(metrics?.savingsAdjustment || 0))} from planned savings because spending was above the plan.`}
            </div>
          </div>
          <div className="border-2 border-black bg-white px-3 py-2 text-center shrink-0">
            <div className="text-[10px] font-mono font-black uppercase">Savings adjustment</div>
            <div className={`text-xl font-black font-mono ${metrics?.savingsAdjustment < 0 ? 'text-red-700' : 'text-emerald-800'}`}>
              {formatINR(metrics?.savingsAdjustment || 0)}
            </div>
          </div>
        </div>
        {metrics?.categoryBudgetDetails?.length > 0 && (
          <div className="mt-3 pt-2 border-t-2 border-black/30 text-[11px] font-mono font-bold">
            {rows.filter((item) => item.budget > 0 || item.used > 0).slice(0, 6).map((item) => (
              <span key={item.name} className="inline-block mr-3 mb-1">
                {item.name}: {formatINR(item.used)} / {formatINR(item.budget)}
                <span className={item.left < 0 ? 'text-red-700' : 'text-emerald-800'}>
                  {' '}({item.left < 0 ? `${formatINR(Math.abs(item.left))} from savings` : `${formatINR(item.left)} added to savings`})
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[680px]">
          <thead>
            <tr className="bg-black text-white uppercase font-black">
              <th className="text-left p-2">#</th>
              <th className="text-left p-2">Topic</th>
              <th className="text-right p-2">Budget</th>
              <th className="text-right p-2">Budget Used</th>
              <th className="text-right p-2">Budget Left</th>
              <th className="text-right p-2">Left %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-black/20">
                <td className="p-2 font-mono">{row.number}</td>
                <td className="p-2 font-bold">{row.name}</td>
                <td className="p-2 text-right font-mono">{formatINR(row.budget)}</td>
                <td className="p-2 text-right font-mono">{formatINR(row.used)}</td>
                <td className={`p-2 text-right font-mono font-bold ${row.left < 0 ? 'text-red-700' : ''}`}>{formatINR(row.left)}</td>
                <td className={`p-2 text-right font-mono ${row.budget > 0 && row.left < 0 ? 'text-red-700 font-bold' : ''}`}>
                  {row.budget > 0 ? `${((row.left / row.budget) * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
            <tr className="bg-neutral-100 font-black border-t-2 border-black">
              <td className="p-2" colSpan="2">Total Budgeted</td>
              <td className="p-2 text-right font-mono">{formatINR(totalBudget)}</td>
              <td className="p-2 text-right font-mono">{formatINR(totalUsed)}</td>
              <td className="p-2 text-right font-mono">{formatINR(totalBudget - totalUsed)}</td>
              <td className="p-2 text-right font-mono">{totalBudget > 0 ? `${(((totalBudget - totalUsed) / totalBudget) * 100).toFixed(1)}%` : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 mt-4 text-[11px] font-mono font-bold text-black/60">
        <Wallet className="w-3.5 h-3.5" /> {monthExpenses.length} expense entries in {monthLabel(selectedMonthKey)}. Recurring expenses and optional expenses are shown separately above.
      </div>
    </section>
  );
};
