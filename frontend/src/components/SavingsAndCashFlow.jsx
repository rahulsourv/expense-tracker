import React, { useEffect, useState } from 'react';
import {
  PiggyBank,
  ArrowRightLeft,
  Plus,
  Trash2,
  Calendar,
  Wallet,
  ShieldAlert,
  Info,
  CheckCircle,
  Building,
  Coins,
  X,
} from 'lucide-react';
import { formatINR } from '../utils/financeCalculators';

export const SavingsAndCashFlow = ({
  metrics,
  savingsTransfers = [],
  selectedMonthKey,
  onAddSavingsTransfer,
  onDeleteSavingsTransfer,
  openingCashBalance = 0,
  onSaveOpeningBalance,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    sourceAccount: 'Salary Checking Account (HDFC)',
    destinationAccount: 'High-Yield Emergency Savings (ICICI)',
    notes: '',
  });
  const [openingForm, setOpeningForm] = useState(openingCashBalance);
  useEffect(() => setOpeningForm(openingCashBalance), [openingCashBalance, selectedMonthKey]);

  // Filter transfers for selected month
  const monthTransfers = savingsTransfers.filter(
    (t) => t.date && t.date.startsWith(selectedMonthKey)
  );

  const totalTransferred = monthTransfers.reduce(
    (sum, t) => sum + (Number(t.amount) || 0),
    0
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!transferForm.amount || Number(transferForm.amount) <= 0) return;

    onAddSavingsTransfer({
      ...transferForm,
      amount: Number(transferForm.amount),
      id: `trans-${Date.now()}`,
    });

    setTransferForm({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      sourceAccount: 'Salary Checking Account (HDFC)',
      destinationAccount: 'High-Yield Emergency Savings (ICICI)',
      notes: '',
    });
    setIsModalOpen(false);
  };

  return (
    <div className="brutal-card p-4 md:p-6 bg-white mb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b-2 border-black">
        <div>
          <div className="flex items-center gap-2">
            <span className="brutal-badge bg-neo-green text-black">
              CASH FLOW LEDGER
            </span>
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">
              ACTUAL SAVINGS & LIQUIDITY FLOW
            </h3>
          </div>
          <p className="text-xs font-bold text-black/70 mt-0.5">
            Transparent breakdown of money intentionally parked in savings versus liquid checking cash.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="brutal-btn bg-emerald-300 hover:bg-emerald-400 px-4 py-2 text-xs md:text-sm font-bold"
        >
          <Plus className="w-4 h-4" />
          <span>Record Savings Transfer</span>
        </button>
      </div>

      <div className="border-2 border-black bg-cyan-50 p-4 mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div><div className="text-xs font-black uppercase">Opening cash balance · {selectedMonthKey}</div><p className="text-xs font-bold text-black/60 mt-1">Closing cash from the previous month can be entered here. Closing balance is calculated from this opening amount plus actual inflows minus outflows.</p></div>
        <form onSubmit={(event) => { event.preventDefault(); onSaveOpeningBalance?.(selectedMonthKey, openingForm); }} className="flex gap-2"><input type="number" min="0" value={openingForm} onChange={(event) => setOpeningForm(event.target.value)} className="brutal-input w-44" /><button className="brutal-btn bg-neo-green px-3 py-2 text-xs font-black">Save Opening</button></form>
      </div>

      {/* Transparent Cash Flow Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Planned Savings Allocation */}
        <div className="border-2 border-black p-4 bg-emerald-50 shadow-brutal-sm">
          <div className="text-[10px] font-mono font-bold uppercase text-emerald-900">
            A. Planned Savings Allocation
          </div>
          <div className="text-2xl font-black font-mono text-emerald-950 mt-1">
            {formatINR(metrics.plannedSavings)}
          </div>
          <p className="text-xs text-black/70 mt-1 font-medium">
            Monthly target reserved intentionally for savings deposits.
          </p>
        </div>

        {/* Actual Transfers into Savings */}
        <div className="border-2 border-black p-4 bg-emerald-200 shadow-brutal-sm">
          <div className="text-[10px] font-mono font-bold uppercase text-emerald-950">
            B. Actual Transferred ({selectedMonthKey})
          </div>
          <div className="text-2xl font-black font-mono text-emerald-950 mt-1">
            {formatINR(totalTransferred)}
          </div>
          <p className="text-xs text-black/80 mt-1 font-medium">
            {totalTransferred >= metrics.plannedSavings
              ? 'Target savings transfer fulfilled ✓'
              : `Pending transfer: ${formatINR(metrics.plannedSavings - totalTransferred)}`}
          </p>
        </div>

        {/* Money Remaining in Checking Bank Account */}
        <div className={`border-2 border-black p-4 shadow-brutal-sm ${
          metrics.remainingBankBalance >= 0 ? 'bg-cyan-100' : 'bg-red-200'
        }`}>
          <div className="text-[10px] font-mono font-bold uppercase text-black/80">
            C. Residual Checking Account Cash
          </div>
          <div className="text-2xl font-black font-mono mt-1">
            {formatINR(metrics.remainingBankBalance)}
          </div>
          <p className="text-xs text-black/70 mt-1 font-medium">
            Salary minus (Expenses + Investments + Savings Transfers).
          </p>
        </div>

        {/* Money Available for Additional Expenses */}
        <div className="border-2 border-black p-4 bg-rose-100 shadow-brutal-sm">
          <div className="text-[10px] font-mono font-bold uppercase text-rose-950">
            D. Remaining Expense Budget
          </div>
          <div className="text-2xl font-black font-mono text-rose-950 mt-1">
            {formatINR(metrics.remainingFlexibleBudget)}
          </div>
          <p className="text-xs text-black/70 mt-1 font-medium">
            {metrics.flexibleBudget > 0
              ? `${formatINR(metrics.flexibleActual)} spent of ${formatINR(metrics.flexibleBudget)} flexible allowance`
              : 'Additional expense allowance is ₹0 (100% of salary allocated elsewhere)'}
          </p>
        </div>

        {/* Actual Monthly Investments */}
        <div className="border-2 border-black p-4 bg-purple-100 shadow-brutal-sm">
          <div className="text-[10px] font-mono font-bold uppercase text-purple-950">
            E. Actual Investment Contributions
          </div>
          <div className="text-2xl font-black font-mono text-purple-950 mt-1">
            {formatINR(metrics.actualInvestments)}
          </div>
          <p className="text-xs text-black/70 mt-1 font-medium">
            Capital transferred into wealth instruments this month.
          </p>
        </div>

        {/* Total Unallocated Salary */}
        <div className="border-2 border-black p-4 bg-neutral-100 shadow-brutal-sm">
          <div className="text-[10px] font-mono font-bold uppercase text-black/80">
            F. Unallocated Monthly Income
          </div>
          <div className="text-2xl font-black font-mono mt-1">
            {formatINR(metrics.unallocatedIncome)}
          </div>
          <p className="text-xs text-black/70 mt-1 font-medium">
            {metrics.unallocatedIncome === 0
              ? 'Zero-based budget: Every rupee has an assigned purpose.'
              : metrics.unallocatedIncome > 0
              ? 'Surplus funds waiting to be assigned to savings or investments.'
              : 'Over-allocated: Allocations exceed total monthly salary!'}
          </p>
        </div>
      </div>

      {/* Explanatory Notice */}
      <div className="border-2 border-black p-3 bg-amber-50 mb-6 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-amber-900 shrink-0 mt-0.5" />
        <div className="text-xs font-medium text-black/85 leading-relaxed">
          <strong>Important Cash Flow Principle:</strong> Your minimum savings target is protected by the budget. If a bill costs more than its budget, the difference reduces savings. If it costs less, the difference increases savings. Transfers between your own accounts are tracked here and are <strong>not double-counted as an expense</strong>.
        </div>
      </div>

      {/* Manual Savings Transfers Ledger */}
      <div>
        <div className="text-xs font-mono font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Recorded Savings Transfers ({monthTransfers.length})</span>
          <span className="text-black/60 font-normal">Month: {selectedMonthKey}</span>
        </div>

        {monthTransfers.length === 0 ? (
          <div className="border-2 border-dashed border-black/40 p-6 text-center bg-neutral-50">
            <ArrowRightLeft className="w-8 h-8 mx-auto text-black/30 mb-2" />
            <div className="font-bold text-sm">No savings transfers logged for {selectedMonthKey}</div>
            <p className="text-xs text-black/60 mt-0.5">
              Record a transfer when you move money from your salary checking account into your savings account.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {monthTransfers.map((item) => (
              <div
                key={item.id}
                className="border-2 border-black p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-brutal-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm">{formatINR(item.amount)}</span>
                    <span className="brutal-badge bg-emerald-200 text-black text-[10px]">
                      INTERNAL TRANSFER
                    </span>
                  </div>
                  <div className="text-xs font-mono text-black/75 mt-0.5 flex flex-wrap items-center gap-2">
                    <span>From: <strong>{item.sourceAccount}</strong></span>
                    <span>➔</span>
                    <span>To: <strong>{item.destinationAccount}</strong></span>
                  </div>
                  {item.notes && (
                    <div className="text-xs text-black/60 italic mt-0.5">"{item.notes}"</div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/10">
                  <div className="text-xs font-mono font-bold text-black/60 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {item.date}
                  </div>
                  <button
                    onClick={() => onDeleteSavingsTransfer(item.id)}
                    className="p-1.5 border border-black hover:bg-red-200"
                    title="Delete transfer record"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transfer Logging Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="brutal-card bg-neo-cream max-w-md w-full p-6 relative">
            <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-black">
              <h4 className="font-black text-lg uppercase">Record Savings Deposit</h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-black hover:text-white border-2 border-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">
                  Transfer Date *
                </label>
                <input
                  type="date"
                  value={transferForm.date}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, date: e.target.value })
                  }
                  className="brutal-input text-sm font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">
                  Amount Transferred (₹) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 100000"
                  value={transferForm.amount}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, amount: e.target.value })
                  }
                  className="brutal-input text-sm font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">
                  Source Account (Outgoing)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Salary Checking Account (HDFC)"
                  value={transferForm.sourceAccount}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, sourceAccount: e.target.value })
                  }
                  className="brutal-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">
                  Destination Account (Savings)
                </label>
                <input
                  type="text"
                  placeholder="e.g. High-Yield Emergency Savings (ICICI)"
                  value={transferForm.destinationAccount}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, destinationAccount: e.target.value })
                  }
                  className="brutal-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly planned savings transfer"
                  value={transferForm.notes}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, notes: e.target.value })
                  }
                  className="brutal-input text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="brutal-btn bg-white hover:bg-neutral-100 px-3 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="brutal-btn bg-neo-green hover:bg-emerald-400 px-4 py-1.5 text-xs font-bold"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
