import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  Plus,
  Receipt,
  CheckCheck,
  Edit2,
  Trash2,
  X,
  Save,
} from 'lucide-react';
import { formatINR } from '../utils/financeCalculators';
import { calculateNextDueDate } from '../utils/billDates';
import { DEFAULT_ESSENTIAL_CATEGORIES, BILL_FREQUENCIES, RECURRING_BILL_NAMES } from '../data/defaultData';

export const MonthlyBills = ({
  bills,
  expenses,
  onToggleBillStatus,
  onSaveBill,
  onDeleteBill,
  onMarkAllBillsPaid,
  selectedMonthKey,
  currentDate = null,
  accounts = [],
}) => {
  const effectiveCurrentDate = useMemo(() => currentDate ? new Date(currentDate) : new Date(), [currentDate]);
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'PENDING' | 'OVERDUE' | 'PAID'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [customCategory, setCustomCategory] = useState('');
  const [billForm, setBillForm] = useState({
    name: '',
    expectedAmount: '',
    category: 'Electricity',
    dueDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    renewDate: new Date().toISOString().split('T')[0],
    frequency: 'Monthly',
    amountType: 'fixed',
    paymentAccount: '',
    reminderDays: 3,
    endDate: '',
    notes: '',
  });
  const isPaidForMonth = (bill) => Boolean(bill.paidMonths?.[selectedMonthKey] ?? bill.isPaid);
  const visibleBills = bills.filter((bill) => !bill.archived);

  useEffect(() => {
    if (!isModalOpen || billForm.frequency === 'Custom' || !billForm.startDate) return;
    const dueDate = calculateNextDueDate(billForm.startDate, billForm.frequency);
    setBillForm((previous) => previous.dueDate === dueDate && previous.renewDate === dueDate
      ? previous
      : { ...previous, dueDate, renewDate: dueDate });
  }, [isModalOpen, billForm.startDate, billForm.frequency]);

  // Calculate stats
  const totalExpectedBills = visibleBills.reduce((sum, b) => sum + (Number(b.expectedAmount) || 0), 0);
  const paidBillsList = visibleBills.filter(isPaidForMonth);
  const totalPaidActual = paidBillsList.reduce(
    (sum, b) => sum + (Number(b.actualAmountPaid) || Number(b.expectedAmount) || 0),
    0
  );
  const unpaidBillsList = visibleBills.filter((b) => !isPaidForMonth(b));
  const outstandingAmount = unpaidBillsList.reduce(
    (sum, b) => sum + (Number(b.expectedAmount) || 0),
    0
  );

  // Check overdue bills
  const overdueBillsList = unpaidBillsList.filter((b) => {
    if (!b.dueDate) return false;
    const due = new Date(b.dueDate);
    return due < effectiveCurrentDate;
  });
  const overdueCount = overdueBillsList.length;

  const filteredBills = visibleBills.filter((b) => {
    if (filterStatus === 'PAID') return isPaidForMonth(b);
    if (filterStatus === 'PENDING') return !isPaidForMonth(b);
    if (filterStatus === 'OVERDUE') {
      return !isPaidForMonth(b) && b.dueDate && new Date(b.dueDate) < effectiveCurrentDate;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingBill(null);
    setBillForm({
      name: '',
      expectedAmount: '',
      category: 'Electricity',
      dueDate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      renewDate: new Date().toISOString().split('T')[0],
      frequency: 'Monthly',
      amountType: 'fixed',
      paymentAccount: accounts[0]?.name || '',
      reminderDays: 3,
      endDate: '',
      notes: '',
    });
    setCustomCategory('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bill) => {
    setEditingBill(bill);
    setBillForm({
      name: bill.name || '',
      expectedAmount: bill.expectedAmount || '',
      category: DEFAULT_ESSENTIAL_CATEGORIES.includes(bill.category) ? bill.category : 'Custom',
      dueDate: bill.dueDate || new Date().toISOString().split('T')[0],
      startDate: bill.startDate || bill.dueDate || new Date().toISOString().split('T')[0],
      renewDate: bill.renewDate || bill.dueDate || new Date().toISOString().split('T')[0],
      frequency: bill.frequency || 'Monthly',
      amountType: bill.amountType || 'fixed',
      paymentAccount: bill.paymentAccount || '',
      reminderDays: bill.reminderDays ?? 3,
      endDate: bill.endDate || '',
      notes: bill.notes || '',
    });
    setCustomCategory(DEFAULT_ESSENTIAL_CATEGORIES.includes(bill.category) ? '' : bill.category || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!billForm.name.trim() || Number(billForm.expectedAmount) <= 0 || (billForm.category === 'Custom' && !customCategory.trim())) return;

    onSaveBill({
      ...billForm,
      category: billForm.category === 'Custom' ? customCategory.trim() : billForm.category,
      expectedAmount: Number(billForm.expectedAmount),
      id: editingBill ? editingBill.id : `bill-${Date.now()}`,
      isPaid: editingBill ? editingBill.isPaid : false,
      actualAmountPaid: editingBill ? editingBill.actualAmountPaid : 0,
      paymentDate: editingBill ? editingBill.paymentDate : null,
      linkedExpenseId: editingBill ? editingBill.linkedExpenseId : null,
      startDate: billForm.startDate,
      renewDate: billForm.renewDate,
      paidMonths: editingBill ? editingBill.paidMonths || {} : {},
      archived: false,
      amountType: billForm.amountType,
      paymentAccount: billForm.paymentAccount,
      reminderDays: Number(billForm.reminderDays) || 0,
      endDate: billForm.endDate || null,
    });

    setIsModalOpen(false);
  };

  return (
    <div className="brutal-card p-4 md:p-6 bg-white mb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b-2 border-black">
        <div>
          <div className="flex items-center gap-2">
            <span className="brutal-badge bg-neo-cyan text-black">
              RECURRING OBLIGATIONS
            </span>
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">
              RECURRING EXPENSES
            </h3>
          </div>
          <p className="text-xs font-bold text-black/70 mt-0.5">
            Track utilities, rent, and recurring obligations without duplicate transaction entries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unpaidBillsList.length > 0 && (
            <button
              onClick={onMarkAllBillsPaid}
              className="brutal-btn bg-emerald-300 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold"
              title="Mark all pending bills as settled"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Paid</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="brutal-btn bg-neo-yellow hover:bg-yellow-400 px-3.5 py-1.5 text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>Add Recurring Bill</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="border-2 border-black p-3 bg-neutral-100 shadow-brutal-sm">
          <div className="text-[10px] font-mono font-bold uppercase text-black/60">
            Total Expected Bills
          </div>
          <div className="text-xl font-black font-mono">
            {formatINR(totalExpectedBills)}
          </div>
          <div className="text-[11px] font-bold text-black/70">
            {bills.length} Monthly Commitments
          </div>
        </div>

        <div className="border-2 border-black p-3 bg-emerald-100 shadow-brutal-sm">
          <div className="text-[10px] font-mono font-bold uppercase text-emerald-800">
            Paid & Settled
          </div>
          <div className="text-xl font-black font-mono text-emerald-950">
            {formatINR(totalPaidActual)}
          </div>
          <div className="text-[11px] font-bold text-emerald-800">
            {paidBillsList.length} of {bills.length} bills settled
          </div>
        </div>

        <div className="border-2 border-black p-3 bg-amber-100 shadow-brutal-sm">
          <div className="text-[10px] font-mono font-bold uppercase text-amber-900">
            Outstanding Bills
          </div>
          <div className="text-xl font-black font-mono text-amber-950">
            {formatINR(outstandingAmount)}
          </div>
          <div className="text-[11px] font-bold text-amber-800">
            {unpaidBillsList.length} bills awaiting settlement
          </div>
        </div>

        <div
          className={`border-2 border-black p-3 shadow-brutal-sm ${
            overdueCount > 0 ? 'bg-red-200' : 'bg-neutral-100'
          }`}
        >
          <div className="text-[10px] font-mono font-bold uppercase text-red-900">
            Overdue Bills
          </div>
          <div className={`text-xl font-black font-mono ${overdueCount > 0 ? 'text-red-950' : 'text-black'}`}>
            {overdueCount} OVERDUE
          </div>
          <div className="text-[11px] font-bold text-red-800">
            {overdueCount > 0 ? 'Action required immediately!' : 'No overdue bills'}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 bg-neutral-100 p-1 border-2 border-black w-fit">
        {[
          { id: 'ALL', label: `All (${bills.length})` },
          { id: 'PENDING', label: `Pending (${unpaidBillsList.length})` },
          { id: 'OVERDUE', label: `Overdue (${overdueCount})` },
          { id: 'PAID', label: `Paid (${paidBillsList.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-3 py-1 text-xs font-bold uppercase transition-all ${
              filterStatus === tab.id
                ? 'bg-black text-white shadow-brutal-sm'
                : 'text-black hover:bg-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bills Grid */}
      {filteredBills.length === 0 ? (
        <div className="border-2 border-dashed border-black/40 p-6 text-center bg-neutral-50">
          <Receipt className="w-8 h-8 mx-auto text-black/30 mb-2" />
          <div className="font-bold text-sm">No bills match this filter</div>
          <p className="text-xs text-black/60 mt-0.5">
            You can add recurring monthly utility bills using the button above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBills.map((bill) => {
            const billIsPaid = isPaidForMonth(bill);
            const isOverdue = !billIsPaid && bill.dueDate && new Date(bill.dueDate) < effectiveCurrentDate;

            return (
              <div
                key={bill.id}
                className={`border-2 border-black p-3.5 transition-all flex flex-col justify-between ${
                  billIsPaid
                    ? 'bg-white shadow-brutal-sm'
                    : isOverdue
                    ? 'bg-red-50 border-red-800 ring-2 ring-red-500 shadow-brutal'
                    : 'bg-amber-50 border-amber-900 shadow-brutal-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`brutal-badge text-[10px] ${
                        billIsPaid
                          ? 'bg-emerald-300 text-black'
                          : isOverdue
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-amber-300 text-black'
                      }`}
                    >
                      {billIsPaid ? 'PAID / SETTLED' : isOverdue ? 'OVERDUE' : 'DUE / PENDING'}
                    </span>
                    <span className="font-mono text-xs font-bold text-black/60">
                      {bill.frequency || 'Monthly'}
                    </span>
                  </div>

                  <div className="font-black text-base leading-tight">{bill.name}</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-black font-mono">
                      {formatINR(billIsPaid ? bill.actualAmountPaid || bill.expectedAmount : bill.expectedAmount)}
                    </span>
                    {billIsPaid && bill.actualAmountPaid !== bill.expectedAmount && (
                      <span className="text-[11px] font-mono text-black/60 line-through">
                        {formatINR(bill.expectedAmount)}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] font-mono text-black/70 mt-1">
                    Category: {bill.category}
                  </div>
                  <div className="text-[11px] font-mono text-black/70 mt-1">
                    {bill.amountType === 'variable' ? 'Variable estimate' : 'Fixed amount'}{bill.paymentAccount ? ` · ${bill.paymentAccount}` : ''}
                  </div>

                  {bill.notes && (
                    <p className="text-xs text-black/70 italic mt-1 font-medium truncate" title={bill.notes}>
                      "{bill.notes}"
                    </p>
                  )}
                </div>

                {/* Actions & Due Date */}
                <div className="mt-3 pt-2.5 border-t border-black/20 flex items-center justify-between">
                  <div className="text-[11px] font-mono font-bold text-black/70 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {billIsPaid && bill.paymentDate
                      ? `Paid on: ${bill.paymentDate}`
                      : bill.dueDate
                      ? `Due: ${bill.dueDate}`
                      : 'No due date'}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(bill)}
                      className="p-1.5 border border-black bg-white hover:bg-neutral-100"
                      title="Edit bill details"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeleteBill(bill.id)}
                      className="p-1.5 border border-black bg-white hover:bg-red-300"
                      title="Delete bill"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onToggleBillStatus(bill)}
                      className={`brutal-btn-sm ${
                        billIsPaid
                          ? 'bg-neutral-100 text-black hover:bg-neutral-200'
                          : 'bg-black text-white hover:bg-neutral-800'
                      }`}
                      title={billIsPaid ? 'Mark as Unpaid' : 'Mark as Paid (safely records expense)'}
                    >
                      {billIsPaid ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Settled
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-neo-yellow" /> Mark Paid
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bill Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="brutal-card bg-neo-cream max-w-md w-full p-6 relative">
            <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-black">
              <h4 className="font-black text-lg uppercase">
                {editingBill ? 'Edit Recurring Bill' : 'Register Recurring Bill'}
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-black hover:text-white border-2 border-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">
                  Bill Name *
                </label>
                <select
                  value={RECURRING_BILL_NAMES.includes(billForm.name) ? billForm.name : 'Custom'}
                  onChange={(e) => setBillForm({ ...billForm, name: e.target.value === 'Custom' ? '' : e.target.value })}
                  className="brutal-input text-sm bg-white"
                >
                  {RECURRING_BILL_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
                  <option value="Custom">Custom bill name</option>
                </select>
                {!RECURRING_BILL_NAMES.includes(billForm.name) && (
                  <input type="text" placeholder="Enter custom bill name" value={billForm.name} onChange={(e) => setBillForm({ ...billForm, name: e.target.value })} className="brutal-input text-sm mt-2" required />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase mb-1">
                    Expected Amount (₹) *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 2500"
                    value={billForm.expectedAmount}
                    onChange={(e) =>
                      setBillForm({ ...billForm, expectedAmount: e.target.value })
                    }
                    className="brutal-input text-sm font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase mb-1">
                    Calculated Due Date
                  </label>
                  <input
                    type="date"
                    value={billForm.dueDate}
                    readOnly={billForm.frequency !== 'Custom'}
                    onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })}
                    className="brutal-input text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase mb-1">Start Date</label>
                  <input type="date" value={billForm.startDate} onChange={(e) => setBillForm({ ...billForm, startDate: e.target.value })} className="brutal-input text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase mb-1">Next Renewal Date</label>
                  <input type="date" value={billForm.renewDate} onChange={(e) => setBillForm({ ...billForm, renewDate: e.target.value, dueDate: e.target.value })} className="brutal-input text-sm font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={billForm.category}
                    onChange={(e) => setBillForm({ ...billForm, category: e.target.value })}
                    className="brutal-input text-sm bg-white"
                  >
                    {DEFAULT_ESSENTIAL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="Custom">Custom category</option>
                  </select>
                  {billForm.category === 'Custom' && (
                    <input type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Enter your category" className="brutal-input text-sm mt-2" required />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase mb-1">
                    Frequency
                  </label>
                  <select
                    value={billForm.frequency}
                    onChange={(e) => setBillForm({ ...billForm, frequency: e.target.value })}
                    className="brutal-input text-sm bg-white"
                  >
                    {BILL_FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-mono font-bold uppercase mb-1">Amount type</label><select value={billForm.amountType} onChange={(e) => setBillForm({ ...billForm, amountType: e.target.value })} className="brutal-input text-sm bg-white"><option value="fixed">Fixed amount</option><option value="variable">Variable estimate</option></select></div>
                <div><label className="block text-xs font-mono font-bold uppercase mb-1">Payment account</label><select value={billForm.paymentAccount} onChange={(e) => setBillForm({ ...billForm, paymentAccount: e.target.value })} className="brutal-input text-sm bg-white"><option value="">Select account</option>{accounts.filter((account) => account.isActive !== false).map((account) => <option key={account.id} value={account.name}>{account.name}</option>)}</select></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-mono font-bold uppercase mb-1">Reminder days before due</label><input type="number" min="0" max="60" value={billForm.reminderDays} onChange={(e) => setBillForm({ ...billForm, reminderDays: e.target.value })} className="brutal-input text-sm font-mono" /></div>
                <div><label className="block text-xs font-mono font-bold uppercase mb-1">End date (optional)</label><input type="date" value={billForm.endDate} onChange={(e) => setBillForm({ ...billForm, endDate: e.target.value })} className="brutal-input text-sm font-mono" /></div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Consumer account number or payment link"
                  value={billForm.notes}
                  onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
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
                  className="brutal-btn bg-neo-yellow hover:bg-yellow-400 px-4 py-1.5 text-xs font-bold"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingBill ? 'Save Changes' : 'Confirm Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
