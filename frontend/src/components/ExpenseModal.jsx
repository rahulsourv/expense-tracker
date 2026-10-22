import React, { useState, useEffect } from 'react';
import { X, Save, Plus } from 'lucide-react';
import {
  DEFAULT_ESSENTIAL_CATEGORIES,
  PAYMENT_METHODS,
  ACCOUNT_OPTIONS,
} from '../data/defaultData';
import { CATEGORY_GROUPS, getCategoryMeta } from '../data/categoryRegistry';

export const ExpenseModal = ({
  isOpen,
  onClose,
  onSaveExpense,
  initialData = null,
  customCategories = [],
  onAddCustomCategory,
  onAddCard,
  cards = [],
  accounts = [],
  currencySymbol = '₹',
}) => {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'Rent',
    type: 'Essential', // 'Essential' | 'Flexible' | 'Custom'
    transactionKind: 'expense',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'UPI',
    accountName: 'Bank Account',
    receiptReference: '',
    merchant: '',
    tags: '',
    currency: currencySymbol,
    notes: '',
    isRecurring: false,
    cardId: '',
  });

  const [newCatName, setNewCatName] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [errors, setErrors] = useState({});
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ name: '', bankName: '', cardNumber: '', expiryDate: '', cvv: '' });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        amount: initialData.amount || '',
        category: initialData.category || 'Rent',
        type: initialData.type || (DEFAULT_ESSENTIAL_CATEGORIES.includes(initialData.category) ? 'Essential' : 'Flexible'),
        transactionKind: initialData.transactionKind || 'expense',
        date: initialData.date || new Date().toISOString().split('T')[0],
        paymentMethod: initialData.paymentMethod || 'UPI',
        accountName: initialData.accountName || accounts[0]?.name || 'Bank Account',
        receiptReference: initialData.receiptReference || '',
        merchant: initialData.merchant || '',
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : (initialData.tags || ''),
        currency: initialData.currency || currencySymbol,
        notes: initialData.notes || '',
        isRecurring: initialData.isRecurring ?? false,
        cardId: initialData.cardId || '',
      });
    } else {
      setFormData({
        name: '',
        amount: '',
        category: 'Rent',
        type: 'Essential',
        transactionKind: 'expense',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'UPI',
        accountName: accounts[0]?.name || 'Bank Account',
        receiptReference: '',
        merchant: '',
        tags: '',
        currency: currencySymbol,
        notes: '',
        isRecurring: false,
        cardId: '',
      });
    }
    setErrors({});
    setShowAddCat(false);
    setShowMoreDetails(false);
    setNewCatName('');
    setShowAddCard(false);
    setNewCard({ name: '', bankName: '', cardNumber: '', expiryDate: '', cvv: '' });
  }, [initialData, isOpen, accounts, currencySymbol]);

  if (!isOpen) return null;

  const accountOptions = accounts.filter((account) => account.isActive !== false).map((account) => account.name);
  const availableAccounts = accountOptions.length ? accountOptions : ACCOUNT_OPTIONS;

  const handleCategorySelect = (cat) => {
    // Auto-detect type if default
    let derivedType = formData.type;
    const categoryMeta = getCategoryMeta(cat);
    if (categoryMeta) derivedType = categoryMeta.type;
    setFormData((prev) => ({
      ...prev,
      category: cat,
      type: derivedType,
    }));
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    if (onAddCustomCategory) {
      onAddCustomCategory(newCatName.trim());
    }
    setFormData((prev) => ({
      ...prev,
      category: newCatName.trim(),
    }));
    setNewCatName('');
    setShowAddCat(false);
  };

  const handleReceiptChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setErrors((prev) => ({ ...prev, receipt: 'Receipt must be JPG, PNG, WEBP, or PDF.' }));
      return;
    }
    if (file.size > 1024 * 1024) {
      setErrors((prev) => ({ ...prev, receipt: 'Receipt must be smaller than 1 MB.' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, receiptReference: String(reader.result || '') }));
      setErrors((prev) => ({ ...prev, receipt: '' }));
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Expense title/name is required';
    const numAmt = Number(formData.amount);
    if (!formData.amount || isNaN(numAmt) || numAmt <= 0) {
      errs.amount = 'Amount must be greater than zero (₹0)';
    }
    if (!formData.date || isNaN(new Date(formData.date).getTime())) {
      errs.date = 'Please provide a valid transaction date';
    }
    if (['Debit card', 'Credit card'].includes(formData.paymentMethod) && !cards.some((card) => card.id === formData.cardId)) {
      errs.card = 'Select a saved card from Cards, or add one here.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSaveExpense({
      ...formData,
      amount: Number(formData.amount),
      tags: String(formData.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      id: initialData ? initialData.id : `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="brutal-card bg-neo-cream max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <span className="brutal-badge bg-neo-yellow text-black">
              {initialData ? 'EDIT' : 'NEW EXPENSE'}
            </span>
            <h3 className="text-xl font-black uppercase">
              {initialData ? 'Update Expense' : 'Log Expense Transaction'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black hover:text-white border-2 border-black transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-mono font-bold uppercase mb-1">
              Expense Name / Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Electricity bill, Grocery staples, Bike petrol, Dinner"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`brutal-input ${errors.name ? 'border-red-600 ring-2 ring-red-500' : ''}`}
            />
            {errors.name && (
              <p className="text-xs font-bold text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">
                Amount in INR (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-mono font-bold text-black/60">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 2500"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className={`brutal-input pl-8 font-mono ${
                    errors.amount ? 'border-red-600 ring-2 ring-red-500' : ''
                  }`}
                />
              </div>
              {errors.amount && (
                <p className="text-xs font-bold text-red-600 mt-1">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">
                Transaction Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={`brutal-input font-mono ${
                  errors.date ? 'border-red-600 ring-2 ring-red-500' : ''
                }`}
              />
              {errors.date && (
                <p className="text-xs font-bold text-red-600 mt-1">{errors.date}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase mb-1">Record type</label>
            <select value={formData.transactionKind} onChange={(e) => setFormData({ ...formData, transactionKind: e.target.value })} className="brutal-input bg-white">
              <option value="expense">Expense — counts toward spending</option>
              <option value="refund">Refund / reversal — reduces spending</option>
            </select>
            <p className="text-[11px] text-black/60 mt-1">Refunds stay in history but are deducted from category and cash-flow totals.</p>
          </div>

          {/* Expense Type: Recurring Expense vs Expense vs Custom */}
          <div>
            <label className="block text-xs font-mono font-bold uppercase mb-1.5">
              Expense Classification
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Essential', label: 'Recurring Expense', desc: 'Rent, Bills, Fixed costs' },
                { id: 'Flexible', label: 'Expense', desc: 'Dining, Outings, Clothes' },
                { id: 'Custom', label: 'Custom', desc: 'User-defined' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: t.id })}
                  className={`border-2 border-black p-2 text-left transition-all ${
                    formData.type === t.id
                      ? 'bg-black text-white shadow-brutal-sm'
                      : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  <div className="text-xs font-mono font-black">{t.label}</div>
                  <div className="text-[10px] opacity-75">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Category Selector with Custom Category Button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-mono font-bold uppercase">
                Category
              </label>
              <button
                type="button"
                onClick={() => setShowAddCat(!showAddCat)}
                className="text-[11px] font-mono font-bold text-blue-900 underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                {showAddCat ? 'Cancel custom' : 'Create new category'}
              </button>
            </div>

            {showAddCat && (
              <div className="flex gap-2 mb-2 p-2 bg-neutral-100 border border-black">
                <input
                  type="text"
                  placeholder="Custom category name..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 bg-white border border-black px-2 py-1 text-xs font-bold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="bg-black text-white px-3 py-1 text-xs font-bold hover:bg-neutral-800"
                >
                  Add
                </button>
              </div>
            )}

            <select
              value={formData.category}
              onChange={(e) => handleCategorySelect(e.target.value)}
              className="brutal-input bg-white font-medium"
            >
              {CATEGORY_GROUPS.map((group) => (
                <optgroup key={group.parent} label={group.parent}>
                  {group.categories.map((category) => <option key={category.name} value={category.name}>{category.name}</option>)}
                </optgroup>
              ))}
              {customCategories.length > 0 && (
                <optgroup label="Custom Categories">
                  {customCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <button type="button" onClick={() => setShowMoreDetails((open) => !open)} className="w-full border-2 border-black bg-white hover:bg-neutral-100 px-3 py-2 text-xs font-black uppercase text-left">
            {showMoreDetails ? '− Hide more details' : '+ More details (optional)'}
          </button>

          {/* Payment method, account, and recurring setting are separate fields. */}
          {showMoreDetails && <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">Payment Method</label>
              <select value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })} className="brutal-input bg-white font-medium">
                {PAYMENT_METHODS.map((pm) => <option key={pm}>{pm}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">Account / Payment Source</label>
              <select value={formData.accountName} onChange={(e) => setFormData({ ...formData, accountName: e.target.value })} className="brutal-input bg-white font-medium">
                {availableAccounts.map((account) => <option key={account}>{account}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isRecurringCheck"
                checked={formData.isRecurring}
                onChange={(e) =>
                  setFormData({ ...formData, isRecurring: e.target.checked })
                }
                className="w-4 h-4 border-2 border-black accent-black cursor-pointer"
              />
              <label
                htmlFor="isRecurringCheck"
                className="text-xs font-bold cursor-pointer uppercase font-mono"
              >
                Recurring Monthly Expense
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1"><label className="block text-xs font-mono font-bold uppercase">Linked Card</label><button type="button" onClick={() => setShowAddCard((open) => !open)} className="text-[10px] font-black uppercase underline"><Plus className="w-3 h-3 inline" /> Add card</button></div>
            <select value={formData.cardId} onChange={(e) => setFormData({ ...formData, cardId: e.target.value })} className="brutal-input bg-white font-medium"><option value="">No card / cash / other</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name} •••• {card.lastFour}</option>)}</select>
            {errors.card && <p className="text-xs font-bold text-red-600 mt-1">{errors.card}</p>}
          </div>

          {showAddCard && <div className="border-2 border-black bg-white p-3 space-y-2"><p className="text-xs font-black uppercase">Add card for this expense</p><div className="grid grid-cols-2 gap-2">{[['name','Card name','text'],['bankName','Bank','text'],['cardNumber','Card number','text'],['expiryDate','Expiry','month'],['cvv','CVV','password']].map(([key, label, type]) => <label key={key} className="text-[10px] font-black uppercase">{label}<input type={type} className="brutal-input mt-1" value={newCard[key]} onChange={(e) => setNewCard({ ...newCard, [key]: e.target.value })} required={key === 'name' || key === 'cardNumber'} /></label>)}</div><button type="button" onClick={async () => { const number = String(newCard.cardNumber).replace(/\D/g, ''); if (!newCard.name.trim() || number.length < 4) return; const saved = await onAddCard({ ...newCard, cardNumber: number, lastFour: number.slice(-4), id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, cardType: 'Credit', color: 'yellow' }); setFormData((prev) => ({ ...prev, cardId: saved?.id || '' })); setShowAddCard(false); }} className="brutal-btn bg-neo-yellow px-3 py-2 text-[10px] font-black uppercase">Save and use this card</button></div>}

          <div>
            <label className="block text-xs font-mono font-bold uppercase mb-1">Receipt attachment (optional)</label>
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleReceiptChange} className="block w-full text-xs font-bold" />
            {formData.receiptReference && <div className="text-xs font-bold text-emerald-800 mt-1">Receipt attached and will be stored with this expense.</div>}
            {errors.receipt && <div className="text-xs font-bold text-red-700 mt-1">{errors.receipt}</div>}
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">Merchant / Payee (Optional)</label>
              <input type="text" placeholder="e.g. Amazon, Reliance Fresh" value={formData.merchant} onChange={(e) => setFormData({ ...formData, merchant: e.target.value })} className="brutal-input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">Tags (Optional)</label>
              <input type="text" placeholder="e.g. family, reimbursable" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="brutal-input text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase mb-1">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Paid online via UPI, shared flat expense"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="brutal-input text-sm"
            />
          </div>

          </>}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-black">
            <button
              type="button"
              onClick={onClose}
              className="brutal-btn bg-white hover:bg-neutral-100 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="brutal-btn bg-neo-yellow hover:bg-yellow-400 px-5 py-2 text-sm"
            >
              <Save className="w-4 h-4" />
              {initialData ? 'Save Changes' : 'Confirm Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
