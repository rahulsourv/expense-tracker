import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { formatINR } from '../utils/financeCalculators';

export const SummaryCards = ({ metrics, user }) => {
  const recurringOver = metrics.remainingEssentialBudget < 0;
  const expenseOver = metrics.remainingFlexibleBudget < 0;
  const config = {
    green: ['ON TRACK', 'bg-neo-green text-black', CheckCircle2],
    yellow: ['WATCH SPENDING', 'bg-neo-yellow text-black', AlertTriangle],
    orange: ['NEAR LIMIT', 'bg-orange-400 text-black', AlertCircle],
    red: ['OVER BUDGET', 'bg-neo-red text-white', ShieldAlert],
  }[metrics.status] || ['ON TRACK', 'bg-neo-green text-black', CheckCircle2];
  const StatusIcon = config[2];
  const quickStats = [
    ['CASH LEFT', metrics.remainingBankBalance, 'border-neo-green text-neo-green'],
    ['MONTHLY INCOME', metrics.totalIncome, 'border-cyan-300 text-cyan-300'],
    ['SAVINGS ACHIEVED', metrics.actualSavings, 'border-emerald-300 text-emerald-300'],
    ['INVESTED THIS MONTH', metrics.actualInvestments, 'border-purple-300 text-purple-300'],
  ];

  return <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
    <div className="border-4 border-black bg-black text-white shadow-brutal-xl p-4 md:p-5 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-28 h-28 bg-neo-green/20 -rotate-12 translate-x-8 -translate-y-8" />
      <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1"><span className="brutal-badge bg-neo-green text-black font-mono">PLAYER PROFILE</span><span className="text-[10px] font-mono font-bold text-white/60 uppercase">Finance HUD // {metrics.monthKey}</span></div>
          <div className="text-2xl md:text-3xl font-black uppercase tracking-tight text-neo-green">{user?.displayName || user?.email?.split('@')[0] || 'PLAYER'}</div>
          <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 border-2 border-black text-[10px] md:text-xs font-black uppercase ${config[1]}`}><StatusIcon className="w-4 h-4" /> STATUS: {config[0]}</div>
          <div className="text-[10px] font-mono font-bold text-white/70 uppercase mt-2">This month: expenses reset by month; income, savings and investments stay in their own ledgers.</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 w-full xl:w-auto">{quickStats.map(([label, value, color]) => <div key={label} className={`border-2 ${color} bg-neutral-950 px-3 py-2 min-w-0 sm:min-w-[130px]`}><div className="text-[9px] font-mono font-bold uppercase">{label}</div><div className="text-lg md:text-xl font-black font-mono text-white">{formatINR(value)}</div></div>)}</div>
      </div>

      <div className="relative border-t-2 border-white/30 mt-5 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`border-2 p-4 flex flex-col justify-between bg-neutral-950 text-white shadow-brutal-sm ${recurringOver ? 'border-red-400' : 'border-amber-300'}`}><div><div className="flex items-center justify-between mb-1.5"><span className="brutal-badge bg-amber-200 text-black">RECURRING EXPENSE</span><span className="font-mono text-[10px] font-bold text-amber-200">{metrics.essentialPercent}% USED</span></div><div className="text-[11px] font-mono font-bold text-white/70 uppercase">Recurring Expenses</div><div className="text-xl lg:text-2xl font-black mt-0.5 tracking-tight font-mono">{formatINR(metrics.essentialActual)}</div></div><div className="mt-3 pt-2 border-t-2 border-white/30 flex items-center justify-between text-[11px] font-bold"><span>Budget: {formatINR(metrics.essentialBudget)}</span><span className={`font-mono ${recurringOver ? 'text-red-300' : 'text-emerald-300'}`}>{recurringOver ? 'Over: ' : 'Rem: '}{formatINR(Math.abs(metrics.remainingEssentialBudget))}</span></div></div>
        <div className={`border-2 p-4 flex flex-col justify-between bg-neutral-950 text-white shadow-brutal-sm ${expenseOver ? 'border-red-400' : 'border-pink-300'}`}><div><div className="flex items-center justify-between mb-1.5"><span className="brutal-badge bg-pink-200 text-black">EXPENSE</span><span className="font-mono text-[10px] font-bold text-pink-200">{metrics.flexiblePercent}% USED</span></div><div className="text-[11px] font-mono font-bold text-white/70 uppercase">Monthly Expenses</div><div className="text-xl lg:text-2xl font-black mt-0.5 tracking-tight font-mono">{formatINR(metrics.flexibleActual)}</div></div><div className="mt-3 pt-2 border-t-2 border-white/30 flex items-center justify-between text-[11px] font-bold"><span>Budget: {formatINR(metrics.flexibleBudget)}</span><span className={`font-mono ${expenseOver ? 'text-red-300' : 'text-emerald-300'}`}>{expenseOver ? 'Over: ' : 'Rem: '}{formatINR(Math.abs(metrics.remainingFlexibleBudget))}</span></div></div>
        <div className="border-2 border-purple-300 bg-neutral-950 text-white shadow-brutal-sm p-4 flex flex-col justify-between"><div><div className="flex items-center justify-between mb-1.5"><span className="brutal-badge bg-purple-200 text-black">INVESTMENTS</span><span className="font-mono text-[10px] font-bold text-purple-200">{metrics.investmentsAllocation > 0 ? `${Math.round((metrics.actualInvestments / metrics.investmentsAllocation) * 100)}%` : 'N/A'}</span></div><div className="text-[11px] font-mono font-bold text-white/70 uppercase">Monthly Contributed</div><div className="text-xl lg:text-2xl font-black mt-0.5 tracking-tight font-mono text-white">{formatINR(metrics.actualInvestments)}</div></div><div className="mt-3 pt-2 border-t-2 border-white/30 flex items-center justify-between text-[11px] font-bold"><span>Plan: {formatINR(metrics.investmentsAllocation)}</span><span className="font-mono text-purple-200">{metrics.actualInvestments >= metrics.investmentsAllocation ? 'MET ✓' : 'PENDING'}</span></div></div>
      </div>
    </div>
  </div>;
};
