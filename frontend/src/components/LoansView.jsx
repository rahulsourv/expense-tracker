import React, { useMemo, useState } from 'react';
import { Banknote, CheckCircle2, Circle, Plus, Trash2, X } from 'lucide-react';
import { formatINR } from '../utils/financeCalculators';

const EMPTY_FORM = {
  name: '', loanType: 'Normal Loan', principalAmount: '', outstandingPrincipal: '',
  interestRate: '', tenureMonths: '', emiAmount: '', dueDay: 5, startDate: '', notes: '',
};

export const LoansView = ({ loans, selectedMonthKey, onSaveLoan, onDeleteLoan, onTogglePaid }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [paymentPrompt, setPaymentPrompt] = useState(null);
  const activeLoans = loans.filter((loan) => loan.status === 'Active');
  const totalEMI = activeLoans.reduce((sum, loan) => sum + Number(loan.emiAmount || 0), 0);
  const paidEMI = loans.reduce((sum, loan) => { const record = loan.paidMonths?.[selectedMonthKey]; return sum + (record ? (typeof record === 'object' ? Number(record.amount || record.emiAmount || loan.emiAmount || 0) : Number(loan.emiAmount || 0)) : 0); }, 0);
  const outstanding = activeLoans.reduce((sum, loan) => sum + Number(loan.outstandingPrincipal || 0), 0);
  const monthLabel = useMemo(() => new Date(`${selectedMonthKey}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), [selectedMonthKey]);

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || Number(form.emiAmount) <= 0 || Number(form.outstandingPrincipal) <= 0) return;
    onSaveLoan({
      ...form,
      id: `loan-${Date.now()}`,
      principalAmount: Number(form.principalAmount) || 0,
      outstandingPrincipal: Number(form.outstandingPrincipal) || 0,
      interestRate: form.loanType === 'Money Borrowed' ? 0 : Number(form.interestRate) || 0,
      tenureMonths: Number(form.tenureMonths) || 0,
      emiAmount: Number(form.emiAmount),
      dueDay: Number(form.dueDay) || 5,
      status: 'Active',
      paidMonths: {},
    });
    setForm(EMPTY_FORM);
    setIsAdding(false);
  };

  return (
    <section className="brutal-card bg-white p-4 md:p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b-4 border-black pb-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="p-2 border-2 border-black bg-neo-orange"><Banknote className="w-6 h-6" /></div>
          <div>
            <h2 className="text-xl font-black uppercase">Loans & Monthly EMIs</h2>
            <p className="text-xs font-mono font-bold text-black/60">Track bank loans, personal loans, and interest-free money borrowed for repayment.</p>
          </div>
        </div>
        <button onClick={() => setIsAdding((value) => !value)} className="brutal-btn bg-neo-orange px-4 py-2 text-xs font-black uppercase">
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {isAdding ? 'Close' : 'Add Loan'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="border-2 border-black bg-orange-100 p-3"><div className="text-[10px] font-mono font-black uppercase">Monthly EMI Commitment</div><div className="text-xl font-black font-mono">{formatINR(totalEMI)}</div></div>
        <div className="border-2 border-black bg-emerald-100 p-3"><div className="text-[10px] font-mono font-black uppercase">Paid in {monthLabel}</div><div className="text-xl font-black font-mono">{formatINR(paidEMI)}</div></div>
        <div className="border-2 border-black bg-red-100 p-3"><div className="text-[10px] font-mono font-black uppercase">Outstanding Principal</div><div className="text-xl font-black font-mono">{formatINR(outstanding)}</div></div>
      </div>

      {isAdding && (
        <form onSubmit={submit} className="border-2 border-black bg-orange-50 p-4 mb-5">
          <div className="text-xs font-black uppercase mb-3">New loan details</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="brutal-input" placeholder="Loan name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <select className="brutal-input" value={form.loanType} onChange={(e) => setForm({ ...form, loanType: e.target.value, interestRate: e.target.value === 'Money Borrowed' ? '0' : form.interestRate })}><option>Normal Loan</option><option>Personal Loan</option><option>Money Borrowed</option></select>
            <input className="brutal-input" type="number" min="1" placeholder={form.loanType === 'Money Borrowed' ? 'Monthly repayment' : 'Monthly EMI'} value={form.emiAmount} onChange={(e) => setForm({ ...form, emiAmount: e.target.value })} required />
            {form.loanType === 'Normal Loan' && <input className="brutal-input" type="number" min="0" placeholder="Original principal" value={form.principalAmount} onChange={(e) => setForm({ ...form, principalAmount: e.target.value })} />}
            <input className="brutal-input" type="number" min="0" placeholder="Outstanding principal" value={form.outstandingPrincipal} onChange={(e) => setForm({ ...form, outstandingPrincipal: e.target.value })} />
            <input className="brutal-input" type="number" min="1" max="31" placeholder="Due day (e.g. 5)" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} />
            {form.loanType === 'Money Borrowed' ? <div className="rounded-lg border-2 border-emerald-700 bg-emerald-50 p-2 text-[11px] font-bold text-emerald-900">Interest-free borrowing. The borrowed amount is not recorded as income or expense. Only repayments affect the expense ledger.</div> : <input className="brutal-input" type="number" min="0" step="0.01" placeholder="Interest rate %" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />}
            {form.loanType === 'Normal Loan' && <input className="brutal-input" type="number" min="0" placeholder="Tenure (months)" value={form.tenureMonths} onChange={(e) => setForm({ ...form, tenureMonths: e.target.value })} />}
            <input className="brutal-input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <textarea className="brutal-input w-full mt-3" rows="2" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="brutal-btn bg-black text-white px-4 py-2 mt-3 text-xs font-black uppercase" type="submit">Save Loan</button>
        </form>
      )}

      {loans.length === 0 ? <div className="border-2 border-dashed border-black p-8 text-center text-sm font-bold">No loans added yet. Add a bank loan or personal loan to start tracking EMIs.</div> : (
        <div className="space-y-3">
          {loans.map((loan) => {
            const isPaid = Boolean(loan.paidMonths?.[selectedMonthKey]);
            const isPaidOff = loan.status === 'Paid Off' || Number(loan.outstandingPrincipal || 0) <= 0;
            return <div key={loan.id} className={`border-2 border-black p-3 ${loan.status === 'Active' ? 'bg-white' : 'bg-neutral-100 opacity-70'}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><span className="font-black uppercase">{loan.name}</span><span className="brutal-badge bg-black text-white text-[10px]">{loan.loanType}</span>{loan.status !== 'Active' && <span className="brutal-badge bg-neutral-300 text-black text-[10px]">{loan.status}</span>}</div>
                  <div className="text-xs font-mono font-bold mt-1">{loan.loanType === 'Money Borrowed' ? 'Repayment' : 'EMI'} {formatINR(loan.emiAmount)} · {loan.loanType === 'Money Borrowed' ? 'Interest-free' : `Interest ${Number(loan.interestRate || 0)}%`} · Due on {loan.dueDay}th · Balance {formatINR(loan.outstandingPrincipal)}</div>
                  {isPaid && typeof loan.paidMonths?.[selectedMonthKey] === 'object' && <div className="text-[11px] font-bold text-black/60 mt-1">This month: principal {formatINR(loan.paidMonths[selectedMonthKey].principalPaid)} · interest {formatINR(loan.paidMonths[selectedMonthKey].interestPaid)}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {isPaidOff ? <span className="brutal-badge bg-emerald-200 text-emerald-900 border border-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> PAID OFF</span> : <button disabled={loan.status !== 'Active' && !isPaid} onClick={() => isPaid ? onTogglePaid(loan) : setPaymentPrompt({ loan, amount: String(loan.emiAmount || ''), mode: 'scheduled' })} className={`brutal-btn px-3 py-2 text-xs font-black uppercase ${isPaid ? 'bg-neo-green' : 'bg-neo-yellow'}`}>
                    {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />} {isPaid ? 'EMI Paid' : 'Mark EMI Paid'}
                  </button>}
                  <button onClick={() => onDeleteLoan(loan.id)} className="brutal-btn bg-red-200 px-2 py-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>;
          })}
        </div>
      )}
      {paymentPrompt && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="brutal-card bg-white max-w-md w-full p-5"><div className="flex items-start justify-between border-b-2 border-black pb-3"><div><h3 className="text-xl font-black uppercase">Confirm EMI payment</h3><p className="text-xs font-bold text-black/60 mt-1">{paymentPrompt.loan.name} · {monthLabel}</p></div><button type="button" onClick={() => setPaymentPrompt(null)} className="p-1 border-2 border-black"><X className="w-5 h-5" /></button></div><p className="text-sm font-bold mt-4">Did you pay the scheduled amount or a different amount this month?</p><div className="grid grid-cols-2 gap-2 mt-4"><button type="button" onClick={() => setPaymentPrompt((current) => ({ ...current, mode: 'scheduled', amount: String(current.loan.emiAmount) }))} className={`border-2 border-black p-3 text-left ${paymentPrompt.mode === 'scheduled' ? 'bg-black text-white' : 'bg-white'}`}><span className="block text-[10px] font-black uppercase">Scheduled EMI</span><span className="font-mono font-black">{formatINR(paymentPrompt.loan.emiAmount)}</span></button><button type="button" onClick={() => setPaymentPrompt((current) => ({ ...current, mode: 'custom' }))} className={`border-2 border-black p-3 text-left ${paymentPrompt.mode === 'custom' ? 'bg-black text-white' : 'bg-white'}`}><span className="block text-[10px] font-black uppercase">Different amount</span><span className="text-xs font-bold">I paid something else</span></button></div><label className="block text-xs font-black uppercase mt-4">Amount paid<input type="number" min="0.01" step="0.01" value={paymentPrompt.amount} onChange={(event) => setPaymentPrompt((current) => ({ ...current, amount: event.target.value, mode: 'custom' }))} className="brutal-input mt-1" /></label><div className="flex justify-end gap-2 mt-5"><button type="button" onClick={() => setPaymentPrompt(null)} className="brutal-btn bg-white px-4 py-2 text-xs font-black">Cancel</button><button type="button" onClick={() => { const amount = Number(paymentPrompt.amount); if (amount > 0) { onTogglePaid(paymentPrompt.loan, amount); setPaymentPrompt(null); } }} className="brutal-btn bg-neo-green px-4 py-2 text-xs font-black">Confirm Payment</button></div></div></div>}
    </section>
  );
};
