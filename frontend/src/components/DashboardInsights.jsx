import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, CalendarClock, Lightbulb, Trophy, TrendingUp } from 'lucide-react';
import { formatINR, getSignedExpenseAmount } from '../utils/financeCalculators';
import { topicForExpense } from '../utils/budgetTopics';

const shiftMonth = (key, amount) => {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const DailyExpenseChart = ({ dailyTotals, dailyDetails, daysInMonth, total, monthKey }) => {
  const [hoveredDay, setHoveredDay] = useState(null);
  const width = 720;
  const height = 260;
  const left = 46;
  const right = 16;
  const top = 18;
  const bottom = 38;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxValue = Math.max(...dailyTotals, 1);
  const points = dailyTotals.map((value, index) => ({
    x: left + (index / Math.max(daysInMonth - 1, 1)) * chartWidth,
    y: top + chartHeight - (value / maxValue) * chartHeight,
    value,
    day: index + 1,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${left},${top + chartHeight} ${line} ${left + chartWidth},${top + chartHeight}`;
  const average = total / Math.max(daysInMonth, 1);

  return <div className="border border-slate-200 rounded-xl bg-slate-50/70 p-4 md:p-5">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
      <div><div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /><h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Daily expense trend</h3></div><p className="text-xs text-slate-500 mt-1">Your spending by day for the selected month.</p></div>
      <div className="text-left sm:text-right"><div className="text-lg font-black text-slate-900">{formatINR(total)}</div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{formatINR(average)} average / day</div></div>
    </div>
    <div className="w-full overflow-x-auto">
      <div className="relative min-w-[560px]">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px]" role="img" aria-label="Daily expenses line chart">
        {[0, 1, 2, 3].map((step) => { const y = top + (chartHeight / 3) * step; const value = maxValue - (maxValue / 3) * step; return <g key={step}><line x1={left} x2={left + chartWidth} y1={y} y2={y} stroke="#dbe3ef" strokeDasharray="4 5" /><text x={left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">{formatINR(value)}</text></g>; })}
        <polygon points={area} fill="#2563eb" fillOpacity="0.10" />
        <polyline points={line} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => <g key={point.day} onMouseEnter={() => setHoveredDay(point.day)} onMouseLeave={() => setHoveredDay(null)} onFocus={() => setHoveredDay(point.day)} tabIndex="0" className="cursor-pointer"><title>Day {point.day}: {formatINR(point.value)}</title><circle cx={point.x} cy={point.y} r={hoveredDay === point.day ? 6 : point.value > 0 ? 4 : 2.5} fill={hoveredDay === point.day ? '#0f172a' : point.value > 0 ? '#2563eb' : '#cbd5e1'} stroke="#fff" strokeWidth="2" /></g>)}
        {points.filter((point) => (point.day === 1 || point.day % 5 === 0 || point.day === daysInMonth) && !(daysInMonth === 31 && point.day === 30)).map((point) => <text key={`label-${point.day}`} x={point.x} y={height - 12} textAnchor="middle" fontSize="10" fontWeight="600" fill="#475569">{String(point.day).padStart(2, '0')} {new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)) - 1, point.day).toLocaleDateString('en-IN', { month: 'short' })}</text>)}
      </svg>
      {hoveredDay && <div className="pointer-events-none absolute z-10 w-48 rounded-lg bg-slate-900 text-white p-3 shadow-xl" style={{ left: `${(points[hoveredDay - 1].x / width) * 100}%`, top: `${Math.max(3, (points[hoveredDay - 1].y / height) * 100 - 5)}%`, transform: 'translate(-50%, -100%)' }}><div className="text-[10px] font-bold uppercase tracking-wide text-blue-300 mb-1">{String(hoveredDay).padStart(2, '0')} {new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)) - 1, hoveredDay).toLocaleDateString('en-IN', { month: 'long' })}</div>{dailyDetails[hoveredDay - 1]?.length ? <div className="space-y-1">{dailyDetails[hoveredDay - 1].slice(0, 4).map((expense) => <div key={expense.id || `${expense.name}-${expense.amount}`} className="flex items-start justify-between gap-2 text-[11px]"><span className="truncate text-slate-200">{expense.name || 'Expense'}</span><span className="font-mono font-bold text-white whitespace-nowrap">{formatINR(expense.amount)}</span></div>)}{dailyDetails[hoveredDay - 1].length > 4 && <div className="text-[10px] text-slate-400">+{dailyDetails[hoveredDay - 1].length - 4} more expenses</div>}</div> : <div className="text-[11px] text-slate-300">No expense recorded</div>}<div className="border-t border-white/20 mt-2 pt-2 text-[11px] font-black">Day total: {formatINR(dailyTotals[hoveredDay - 1])}</div></div>}
      </div>
    </div>
    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1"><span>01 {new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)) - 1, 1).toLocaleDateString('en-IN', { month: 'short' })}</span><span>Hover a dot for expenses</span><span>{String(daysInMonth).padStart(2, '0')} {new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)) - 1, daysInMonth).toLocaleDateString('en-IN', { month: 'short' })}</span></div>
  </div>;
};

export const DashboardInsights = ({ expenses = [], bills = [], metrics, selectedMonthKey }) => {
  const insights = useMemo(() => {
    const monthExpenses = expenses.filter((expense) => expense.date?.startsWith(selectedMonthKey));
    const [year, month] = selectedMonthKey.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyTotals = Array.from({ length: daysInMonth }, () => 0);
    const dailyDetails = Array.from({ length: daysInMonth }, () => []);
    monthExpenses.forEach((expense) => { const day = Number(String(expense.date).slice(8, 10)); if (day >= 1 && day <= daysInMonth) { dailyTotals[day - 1] += Math.max(0, getSignedExpenseAmount(expense)); dailyDetails[day - 1].push({ ...expense, amount: Math.max(0, getSignedExpenseAmount(expense)) }); } });
    const previousMonthKey = shiftMonth(selectedMonthKey, -1);
    const previousTotal = expenses.filter((expense) => expense.date?.startsWith(previousMonthKey)).reduce((sum, expense) => sum + getSignedExpenseAmount(expense), 0);
    const currentTotal = monthExpenses.reduce((sum, expense) => sum + getSignedExpenseAmount(expense), 0);
    const byTopic = monthExpenses.reduce((result, expense) => { const topic = topicForExpense(expense); result[topic] = (result[topic] || 0) + getSignedExpenseAmount(expense); return result; }, {});
    const highestCategory = Object.entries(byTopic).sort(([, a], [, b]) => b - a)[0];
    const largestExpense = [...monthExpenses].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
    const upcomingBills = bills.filter((bill) => !bill.archived && !bill.paidMonths?.[selectedMonthKey] && bill.dueDate).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate))).slice(0, 3);
    return { currentTotal, previousTotal, highestCategory, largestExpense, upcomingBills, dailyTotals, dailyDetails, daysInMonth };
  }, [bills, expenses, selectedMonthKey]);

  const change = insights.currentTotal - insights.previousTotal;
  const changeLabel = insights.previousTotal === 0 ? 'No prior-month baseline' : `${change >= 0 ? '+' : '-'}${formatINR(Math.abs(change))} vs ${shiftMonth(selectedMonthKey, -1)}`;

  return <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 mb-6">
    <div className="flex items-center justify-between gap-3 mb-4"><div className="flex items-center gap-2"><div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Lightbulb className="w-4 h-4" /></div><div><h3 className="text-base font-black uppercase tracking-wide text-slate-900">Monthly insights</h3><p className="text-xs text-slate-500">Recorded activity for {selectedMonthKey}.</p></div></div><span className="hidden sm:block text-[10px] font-bold uppercase tracking-wide text-slate-400">Daily view</span></div>
    <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5 items-start">
      <DailyExpenseChart dailyTotals={insights.dailyTotals} dailyDetails={insights.dailyDetails} daysInMonth={insights.daysInMonth} total={insights.currentTotal} monthKey={selectedMonthKey} />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-800"><Trophy className="w-3.5 h-3.5" /> Highest topic</div><div className="font-black text-sm mt-2 truncate text-slate-900">{insights.highestCategory?.[0] || 'No expenses yet'}</div><div className="font-mono text-sm font-bold text-slate-700">{formatINR(insights.highestCategory?.[1] || 0)}</div></div>
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3"><div className="flex items-center gap-1 text-[9px] font-black uppercase text-cyan-800"><ArrowUpRight className="w-3.5 h-3.5" /> Largest expense</div><div className="font-black text-sm mt-2 truncate text-slate-900">{insights.largestExpense?.name || 'No expenses yet'}</div><div className="font-mono text-sm font-bold text-slate-700">{formatINR(insights.largestExpense?.amount || 0)}</div></div>
        <div className={`rounded-xl border p-3 ${change > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}><div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-700"><AlertTriangle className="w-3.5 h-3.5" /> Month comparison</div><div className="font-black text-sm mt-2 truncate text-slate-900">{change > 0 ? 'Spending increased' : change < 0 ? 'Spending decreased' : 'Spending unchanged'}</div><div className="font-mono text-[10px] font-bold truncate text-slate-600">{changeLabel}</div></div>
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3"><div className="flex items-center gap-1 text-[9px] font-black uppercase text-purple-800"><CalendarClock className="w-3.5 h-3.5" /> Upcoming bills</div><div className="font-black text-sm mt-2 text-slate-900">{insights.upcomingBills.length} pending</div><div className="font-mono text-sm font-bold text-slate-700">{formatINR(insights.upcomingBills.reduce((sum, bill) => sum + (Number(bill.expectedAmount) || 0), 0))}</div></div>
      </div>
    </div>
    <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] font-mono font-bold text-slate-500">Savings {Number(metrics?.savingsRate || 0).toFixed(1)}% · Expenses {Number(metrics?.expenseRatio || 0).toFixed(1)}% · Investments {Number(metrics?.investmentAllocationRate || 0).toFixed(1)}%</div>
  </section>;
};
