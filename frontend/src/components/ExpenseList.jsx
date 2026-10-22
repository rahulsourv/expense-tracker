import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  Receipt,
  Tag,
  ArrowUpDown,
  Calendar,
  Download,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { formatINR, exportExpensesToCSV, getSignedExpenseAmount } from '../utils/financeCalculators';

export const ExpenseList = ({
  expenses,
  selectedMonthKey,
  onOpenAddModal,
  onEditExpense,
  onDeleteExpense,
  onDeleteAllExpenses,
}) => {
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'ESSENTIAL' | 'FLEXIBLE' | 'RECURRING'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('DATE_DESC'); // 'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'
  const [scopeAllMonths, setScopeAllMonths] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Extract categories present
  const availableCategories = useMemo(() => {
    const cats = new Set(expenses.map((e) => e.category).filter(Boolean));
    return ['ALL', ...Array.from(cats).sort()];
  }, [expenses]);

  // Filter and sort logic
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((item) => {
        // Month filter
        if (!scopeAllMonths && item.date && !item.date.startsWith(selectedMonthKey)) {
          return false;
        }

        // Type filter
        if (filterType === 'ESSENTIAL' && item.type !== 'Essential' && !item.isRecurring) return false;
        if (filterType === 'FLEXIBLE' && item.type !== 'Flexible') return false;
        if (filterType === 'RECURRING' && !item.isRecurring) return false;

        // Category filter
        if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = item.name?.toLowerCase().includes(q);
          const matchCategory = item.category?.toLowerCase().includes(q);
          const matchNotes = item.notes?.toLowerCase().includes(q);
          const matchMerchant = item.merchant?.toLowerCase().includes(q);
          const matchTags = (item.tags || []).some((tag) => String(tag).toLowerCase().includes(q));
          if (!matchName && !matchCategory && !matchNotes && !matchMerchant && !matchTags) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'DATE_DESC') {
          return new Date(b.date) - new Date(a.date);
        }
        if (sortBy === 'DATE_ASC') {
          return new Date(a.date) - new Date(b.date);
        }
        if (sortBy === 'AMOUNT_DESC') {
          return b.amount - a.amount;
        }
        if (sortBy === 'AMOUNT_ASC') {
          return a.amount - b.amount;
        }
        return 0;
      });
  }, [expenses, selectedMonthKey, scopeAllMonths, filterType, selectedCategory, searchQuery, sortBy]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + getSignedExpenseAmount(item), 0);
  }, [filteredExpenses]);

  const handleExportCSV = () => {
    const csv = exportExpensesToCSV(filteredExpenses);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${scopeAllMonths ? 'all' : selectedMonthKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmDelete = (id) => {
    onDeleteExpense(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="brutal-card p-4 md:p-6 bg-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b-2 border-black">
        <div>
          <div className="flex items-center gap-2">
            <span className="brutal-badge bg-neo-pink text-black">
              TRANSACTION LEDGER
            </span>
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">
              EXPENSE MANAGEMENT
            </h3>
          </div>
          <p className="text-xs font-bold text-black/70 mt-0.5">
            {scopeAllMonths
              ? 'Showing all historical transactions across all months.'
              : `Scoped to ${selectedMonthKey}. Transactions outside this month are isolated.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="border-2 border-black bg-neo-yellow px-3 py-1 font-mono font-black text-xs md:text-sm shadow-brutal-sm">
            SUBTOTAL: {formatINR(filteredTotal)} ({filteredExpenses.length})
          </div>

          <button
            onClick={handleExportCSV}
            className="brutal-btn bg-white hover:bg-neutral-100 px-3 py-1.5 text-xs font-bold"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={onDeleteAllExpenses}
            disabled={expenses.length === 0}
            className="brutal-btn bg-red-200 hover:bg-red-300 text-red-950 px-3 py-1.5 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            title="Delete all expense records only"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete All</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="brutal-btn bg-black text-white hover:bg-neutral-800 px-3.5 py-1.5 text-xs md:text-sm"
          >
            <Plus className="w-4 h-4 text-neo-yellow" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 mb-5">
        {/* Type Filter Buttons */}
        <div className="flex flex-wrap gap-1 bg-neutral-100 p-1 border-2 border-black">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'ESSENTIAL', label: 'Recurring Expense' },
            { id: 'FLEXIBLE', label: 'Expense' },
            { id: 'RECURRING', label: 'Recurring' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1 text-xs font-bold uppercase transition-all ${
                filterType === tab.id
                  ? 'bg-black text-white shadow-brutal-sm'
                  : 'text-black hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-black/50" />
          <input
            type="text"
            placeholder="Search by title, category, or note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border-2 border-black pl-9 pr-3 py-1.5 text-xs md:text-sm font-bold focus:outline-none shadow-brutal-sm"
          />
        </div>

        {/* Category & Sort controls */}
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border-2 border-black px-2.5 py-1.5 text-xs font-bold shadow-brutal-sm focus:outline-none"
          >
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border-2 border-black px-2.5 py-1.5 text-xs font-bold shadow-brutal-sm focus:outline-none"
          >
            <option value="DATE_DESC">Date (Latest first)</option>
            <option value="DATE_ASC">Date (Oldest first)</option>
            <option value="AMOUNT_DESC">Amount (High to Low)</option>
            <option value="AMOUNT_ASC">Amount (Low to High)</option>
          </select>

          <button
            onClick={() => setScopeAllMonths(!scopeAllMonths)}
            className={`px-2.5 py-1 border-2 border-black text-xs font-bold font-mono transition-all ${
              scopeAllMonths
                ? 'bg-purple-300 text-black shadow-brutal-sm'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
            title="Toggle between current month only or all historical transactions"
          >
            {scopeAllMonths ? 'All Months (ON)' : 'This Month Only'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Delete */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="brutal-card bg-white p-5 max-w-sm w-full border-3 border-black">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-black text-sm uppercase">Confirm Deletion</h4>
            </div>
            <p className="text-xs font-bold text-black/80 mb-4">
              Are you sure you want to delete this expense record? This will immediately recalculate your dashboard budget metrics.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="brutal-btn bg-white hover:bg-neutral-100 px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDelete(confirmDeleteId)}
                className="brutal-btn bg-red-500 text-white hover:bg-red-600 px-3 py-1.5 text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense List Items */}
      {filteredExpenses.length === 0 ? (
        <div className="border-2 border-dashed border-black/40 p-8 text-center bg-neo-bg">
          <Receipt className="w-10 h-10 mx-auto text-black/40 mb-2" />
          <div className="font-black text-lg uppercase">No expenses found</div>
          <p className="text-xs font-bold text-black/60 max-w-sm mx-auto mt-1 mb-4">
            No transactions match the selected criteria for this period. Log a new expense using the button above.
          </p>
          <button
            onClick={onOpenAddModal}
            className="brutal-btn bg-neo-yellow px-4 py-2 text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Log Expense
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredExpenses.map((item) => (
            <div
              key={item.id}
              className={`border-2 border-black p-3 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-brutal-sm hover:translate-x-0.5 hover:shadow-brutal ${
                item.type === 'Essential' ? 'bg-amber-50/70' : 'bg-white'
              }`}
            >
              {/* Left Details */}
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 border-2 border-black shrink-0 ${
                    item.type === 'Essential' ? 'bg-neo-yellow' : 'bg-neo-pink'
                  }`}
                >
                  <Tag className="w-4 h-4 stroke-[2.5]" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-sm md:text-base leading-tight">
                      {item.name}
                    </span>

                    {/* Classification badge */}
                    <span
                      className={`brutal-badge text-[10px] ${
                        item.type === 'Essential'
                          ? 'bg-black text-neo-yellow'
                          : 'bg-neutral-200 text-black'
                      }`}
                    >
                      {item.type === 'Essential' ? 'RECURRING EXPENSE' : 'EXPENSE'}
                    </span>

                    {/* Recurring badge */}
                    {item.isRecurring && (
                      <span className="brutal-badge bg-cyan-200 text-black text-[10px]">
                        RECURRING
                      </span>
                    )}

                    {/* Category */}
                    <span className="font-mono text-[11px] font-bold text-black/60">
                      [{item.category}]
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono font-bold text-black/70 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {item.date}
                    </span>
                    {item.merchant && <span>Merchant: {item.merchant}</span>}
                    {item.tags?.length > 0 && <span>#{item.tags.join(' #')}</span>}
                    {item.paymentMethod && <span>• {item.paymentMethod}</span>}
                    {item.accountName && <span>• {item.accountName}</span>}
                    {item.receiptReference && <button type="button" onClick={() => window.open(item.receiptReference, '_blank', 'noopener,noreferrer')} className="underline text-blue-800" title="Open receipt">• Receipt</button>}
                    {item.notes && (
                      <span className="italic font-normal text-black/80">
                        "{item.notes}"
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side Amount & Actions */}
              <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-black/20">
                <div className="text-right">
                  <div className="text-base md:text-lg font-black font-mono">
                    {formatINR(item.amount)}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-black/50 uppercase">
                    {item.type === 'Essential' ? 'Recurring Expense' : 'Expense'}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onEditExpense(item)}
                    className="p-1.5 border border-black bg-white hover:bg-neutral-100 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                    title="Edit entry"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(item.id)}
                    className="p-1.5 border border-black bg-white hover:bg-red-400 hover:text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
