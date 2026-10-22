import React, { useState } from 'react';
import {
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  PiggyBank,
  Calculator,
  ShieldCheck,
  Percent,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { formatINR, calculateSipFutureValue } from '../utils/financeCalculators';

export const InvestmentEngine = ({
  investments = [],
  selectedMonthKey = '2026-10',
  onAddInvestment,
  onDeleteInvestment,
  onEditInvestment,
  onToggleMonthContribution,
}) => {
  // Defensive check for investments array
  const safeInvestments = Array.isArray(investments) ? investments.filter(Boolean) : [];
  const showReturnCalculator = false;

  // Simulator state
  const [simSip, setSimSip] = useState(15000);
  const [simRate, setSimRate] = useState(12);
  const [simYears, setSimYears] = useState(10);

  const simResult = calculateSipFutureValue(simSip || 0, simRate || 0, simYears || 1);

  // Totals calculation
  const totalPlannedMonthlySip = safeInvestments.reduce(
    (sum, i) => sum + (Number(i?.monthlyContribution) || 0),
    0
  );

  const totalActualContributedThisMonth = safeInvestments.reduce(
    (sum, i) =>
      sum +
      (i?.actualContributions && i.actualContributions[selectedMonthKey] !== undefined
        ? Number(i.actualContributions[selectedMonthKey]) || 0
        : 0),
    0
  );

  const totalInvestedPrincipal = safeInvestments.reduce(
    (sum, i) => sum + (Number(i?.totalInvested) || 0),
    0
  );

  return (
    <div className="brutal-card p-4 md:p-6 bg-white mb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b-2 border-black">
        <div>
          <div className="flex items-center gap-2">
            <span className="brutal-badge bg-neo-purple text-white">
              PORTFOLIO COMMAND
            </span>
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">
              INVESTMENTS & MONTHLY SIP ASSETS
            </h3>
          </div>
          <p className="text-xs font-bold text-black/70 mt-0.5">
            Manually tracked portfolio assets, quantities, one-time purchases, and monthly contributions.
          </p>
        </div>

        <button
          onClick={onAddInvestment}
          className="brutal-btn bg-neo-purple text-white hover:bg-purple-600 px-4 py-2 text-xs md:text-sm"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Add Investment Asset</span>
        </button>
      </div>

      {/* 5 Portfolio Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {/* Planned Monthly SIP */}
        <div className="border-2 border-black p-3 bg-purple-100 shadow-brutal-sm">
          <div className="text-[10px] font-mono font-bold uppercase text-purple-900">
            1. Planned Monthly SIPs
          </div>
          <div className="text-xl md:text-2xl font-black font-mono text-purple-950 mt-0.5">
            {formatINR(totalPlannedMonthlySip)}
          </div>
          <div className="text-[11px] font-bold text-purple-800">
            Monthly target budget
          </div>
        </div>

        {/* Actual Contributed this Month */}
        <div className="border-2 border-black p-3 bg-purple-200 shadow-brutal-sm">
          <div className="text-[10px] font-mono font-bold uppercase text-purple-950">
            2. Contributed ({selectedMonthKey})
          </div>
          <div className="text-xl md:text-2xl font-black font-mono text-purple-950 mt-0.5">
            {formatINR(totalActualContributedThisMonth)}
          </div>
          <div className="text-[11px] font-bold text-purple-900">
            {totalActualContributedThisMonth >= totalPlannedMonthlySip && totalPlannedMonthlySip > 0
              ? 'Monthly SIP target met ✓'
              : totalPlannedMonthlySip === 0
              ? 'No active SIP target'
              : 'Pending transfer'}
          </div>
        </div>

        {/* Total Principal Invested */}
        <div className="border-2 border-black p-3 bg-blue-100 shadow-brutal-sm">
          <div className="text-[10px] font-mono font-bold uppercase text-blue-900">
            3. Total Principal Invested
          </div>
          <div className="text-xl md:text-2xl font-black font-mono text-blue-950 mt-0.5">
            {formatINR(totalInvestedPrincipal)}
          </div>
          <div className="text-[11px] font-bold text-blue-800">
            Accumulated capital to date
          </div>
        </div>

        {/* One-time purchase count */}
        <div className="border-2 border-black p-3 bg-cyan-100 shadow-brutal-sm">
          <div className="text-[10px] font-mono font-bold uppercase text-cyan-900">
            4. One-time Purchases
          </div>
          <div className="text-xl md:text-2xl font-black font-mono text-cyan-950 mt-0.5">
            {safeInvestments.filter((investment) => Number(investment.monthlyContribution || 0) === 0).length}
          </div>
          <div className="text-[11px] font-bold text-cyan-800">
            Recorded assets
          </div>
        </div>

        {/* Cash-flow scope */}
        <div
          className="border-2 border-black p-3 bg-emerald-100 shadow-brutal-sm"
        >
          <div className="text-[10px] font-mono font-bold uppercase text-black/70">
            5. Monthly Budget Scope
          </div>
          <div className="text-xl md:text-2xl font-black font-mono text-emerald-950 mt-0.5">INVESTED CASH</div>
          <div className="text-[11px] font-bold font-mono">Returns excluded</div>
        </div>
      </div>

      {/* Notice on Realism & No automated scraping */}
      <div className="border-2 border-black p-2.5 bg-neutral-100 text-xs font-medium text-black/80 mb-5 flex items-center gap-2">
        <Info className="w-4 h-4 text-black shrink-0" />
        <span>
          <strong>Budget Notice:</strong> Only actual invested cash is used in monthly budgeting. Market value, gains, and returns are excluded from expense calculations.
        </span>
      </div>

      {/* Investments Table */}
      <div className="mb-8">
        <div className="text-xs font-mono font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Active Investment Schemes ({safeInvestments.length})</span>
          <span className="text-black/60 font-normal">Month: {selectedMonthKey}</span>
        </div>

        {safeInvestments.length === 0 ? (
          <div className="border-3 border-dashed border-black/50 p-8 text-center bg-neo-bg">
            <PiggyBank className="w-12 h-12 mx-auto text-black/40 mb-2" />
            <div className="font-black text-lg uppercase">No investment assets registered</div>
            <p className="text-xs font-bold text-black/70 max-w-md mx-auto mt-1 mb-4">
              Your portfolio is currently empty. Start adding your Index Funds, Mutual Funds, Stocks, Gold, PPF, or Fixed Deposits.
            </p>
            <button
              onClick={onAddInvestment}
              className="brutal-btn bg-neo-purple text-white px-5 py-2.5 text-xs md:text-sm font-bold shadow-brutal hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" /> Add Your First Investment Asset
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border-2 border-black">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-900 text-white font-mono text-xs uppercase border-b-2 border-black">
                  <th className="p-3">Stock / Asset</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Invested Amount</th>
                  <th className="p-3">Monthly Tracking ({selectedMonthKey})</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black text-xs md:text-sm font-medium bg-white">
                {safeInvestments.map((inv) => {
                  const actualContributed =
                    inv?.actualContributions && inv.actualContributions[selectedMonthKey] !== undefined
                      ? Number(inv.actualContributions[selectedMonthKey]) || 0
                      : 0;
                  const isContributed =
                    actualContributed >= (inv?.monthlyContribution || 0) &&
                    (inv?.monthlyContribution || 0) > 0;
                  const isOneTime = (Number(inv?.monthlyContribution) || 0) === 0;

                  return (
                    <tr key={inv?.id || Math.random()} className="hover:bg-purple-50/60 transition-colors">
                      <td className="p-3">
                        <div className="font-black text-sm">{inv?.name || 'Unnamed Asset'}</div>
                        <span className="brutal-badge bg-neutral-200 text-black text-[10px] mt-1 inline-block">
                          {inv?.type || 'Investment'}
                        </span>
                        <div className="text-[11px] font-mono text-black/60">
                          Started: {inv?.startDate || 'N/A'} {inv?.notes ? `• ${inv.notes}` : ''}
                        </div>
                      </td>
                      <td className="p-3 font-mono font-black">
                        {inv?.type === 'Stocks' ? `${Number(inv?.quantity || 0)} shares` : '—'}
                      </td>
                      <td className="p-3 font-mono font-bold">
                        {formatINR(inv?.totalInvested || 0)}
                      </td>
                      <td className="p-3">
                        {isOneTime ? (
                          <span className="brutal-badge bg-cyan-200 text-black text-[10px]">One-time recorded</span>
                        ) : <button
                          onClick={() => onToggleMonthContribution && onToggleMonthContribution(inv.id, selectedMonthKey)}
                          className={`brutal-btn-sm ${
                            isContributed
                              ? 'bg-emerald-300 text-black hover:bg-emerald-400'
                              : 'bg-neutral-100 text-black hover:bg-neutral-200'
                          }`}
                          title="Click to toggle whether this month's SIP was transferred"
                        >
                          {isContributed ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-800" /> Contributed
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" /> Pending (Click to log)
                            </>
                          )}
                        </button>}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditInvestment && onEditInvestment(inv)}
                            className="p-1.5 border border-black bg-white hover:bg-neutral-100 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                            title="Edit investment"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteInvestment && onDeleteInvestment(inv.id)}
                            className="p-1.5 border border-black bg-white hover:bg-red-500 hover:text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                            title="Delete investment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showReturnCalculator && <>{/* Optional return calculator intentionally disabled */}
      <div className="border-3 border-black p-4 md:p-5 bg-neo-yellow shadow-brutal">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-black text-neo-yellow p-1.5 border-2 border-black">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-base uppercase">
              SIP COMPOUND GROWTH ESTIMATOR (THEORETICAL)
            </h4>
            <p className="text-xs font-bold text-black/75">
              Calculated using the standard compounding formula: FV = P × [((1 + i)ⁿ - 1) / i] × (1 + i). (Not guaranteed returns).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Monthly Contribution Slider */}
          <div className="bg-white border-2 border-black p-3 shadow-brutal-sm">
            <div className="flex justify-between items-center text-xs font-mono font-bold mb-1">
              <span>MONTHLY SIP CONTRIBUTION</span>
              <span className="font-black text-sm">{formatINR(simSip)}</span>
            </div>
            <input
              type="range"
              min="1000"
              max="100000"
              step="1000"
              value={simSip}
              onChange={(e) => setSimSip(Number(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-black/60 mt-1">
              <span>₹1,000</span>
              <span>₹1,00,000</span>
            </div>
          </div>

          {/* Expected ROI % Slider */}
          <div className="bg-white border-2 border-black p-3 shadow-brutal-sm">
            <div className="flex justify-between items-center text-xs font-mono font-bold mb-1">
              <span>EXPECTED RETURN RATE (% P.A.)</span>
              <span className="font-black text-sm">{simRate}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              step="0.5"
              value={simRate}
              onChange={(e) => setSimRate(Number(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-black/60 mt-1">
              <span>1% (Debt/FD)</span>
              <span>12% (Index)</span>
              <span>25% (Equity Aggressive)</span>
            </div>
          </div>

          {/* Time Horizon Slider */}
          <div className="bg-white border-2 border-black p-3 shadow-brutal-sm">
            <div className="flex justify-between items-center text-xs font-mono font-bold mb-1">
              <span>INVESTMENT HORIZON</span>
              <span className="font-black text-sm">{simYears} Years</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={simYears}
              onChange={(e) => setSimYears(Number(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-black/60 mt-1">
              <span>1 Year</span>
              <span>15 Years</span>
              <span>30 Years</span>
            </div>
          </div>
        </div>

        {/* Projection Results */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white border-2 border-black p-3.5 shadow-brutal-sm">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase text-black/60">
              Total Deposited Principal
            </div>
            <div className="text-lg md:text-xl font-black font-mono">
              {formatINR(simResult.totalDeposited)}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono font-bold uppercase text-emerald-700">
              Estimated Compounded Gains
            </div>
            <div className="text-lg md:text-xl font-black font-mono text-emerald-800">
              +{formatINR(simResult.returnsGain)}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono font-bold uppercase text-purple-900">
              Projected Maturity Corpus
            </div>
            <div className="text-lg md:text-xl font-black font-mono text-purple-900">
              {formatINR(simResult.futureValue)}
            </div>
          </div>
        </div>
      </div></>}
    </div>
  );
};
