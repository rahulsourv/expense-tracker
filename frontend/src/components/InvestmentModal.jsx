import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { INVESTMENT_TYPES } from '../data/defaultData';

export const InvestmentModal = ({
  isOpen,
  onClose,
  onSaveInvestment,
  initialData = null,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Index funds',
    quantity: '',
    mode: 'SIP',
    monthlyContribution: 5000,
    totalInvested: 50000,
    currentValue: 55000,
    startDate: new Date().toISOString().split('T')[0],
    expectedRoi: 12.0,
    tenureYears: 5,
    notes: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        type: initialData.type || 'Index funds',
        quantity: initialData.quantity || '',
        mode: initialData.monthlyContribution > 0 ? 'SIP' : 'ONE_TIME',
        monthlyContribution: initialData.monthlyContribution || '',
        totalInvested: initialData.totalInvested || '',
        currentValue: initialData.currentValue || '',
        startDate: initialData.startDate || new Date().toISOString().split('T')[0],
        expectedRoi: initialData.expectedRoi || 12.0,
        tenureYears: initialData.tenureYears || 5,
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        name: '',
        type: 'Index funds',
        quantity: '',
        mode: 'SIP',
        monthlyContribution: '',
        totalInvested: '',
        currentValue: '',
        startDate: new Date().toISOString().split('T')[0],
        expectedRoi: 12.0,
        tenureYears: 5,
        notes: '',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Investment name is required';
    if (formData.mode === 'SIP' && (formData.monthlyContribution === '' || Number(formData.monthlyContribution) <= 0)) {
      errs.monthlyContribution = 'Enter a monthly SIP amount';
    }
    if (formData.mode === 'ONE_TIME' && (formData.totalInvested === '' || Number(formData.totalInvested) <= 0)) {
      errs.totalInvested = 'Enter the amount you invested';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSaveInvestment({
      ...formData,
      quantity: Number(formData.quantity) || 0,
      monthlyContribution: formData.mode === 'SIP' ? Number(formData.monthlyContribution) || 0 : 0,
      totalInvested: Number(formData.totalInvested) || 0,
      currentValue: Number(formData.currentValue) || Number(formData.totalInvested) || 0,
      expectedRoi: Number(formData.expectedRoi) || 0,
      tenureYears: Number(formData.tenureYears) || 5,
      id: initialData ? initialData.id : `inv-${Date.now()}`,
      actualContributions: initialData
        ? initialData.actualContributions || {}
        : formData.mode === 'ONE_TIME'
        ? { [String(formData.startDate).substring(0, 7)]: Number(formData.totalInvested) || 0 }
        : {},
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="brutal-card bg-neo-cream max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <span className="brutal-badge bg-neo-purple text-white">
              {initialData ? 'EDIT ASSET' : 'NEW INVESTMENT'}
            </span>
            <h3 className="text-xl font-black uppercase">
              {initialData ? 'Update Investment Scheme' : 'Register Investment Asset'}
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
          <div className="border-2 border-black bg-purple-100 p-3">
            <div className="text-[10px] font-mono font-black uppercase mb-2">How are you investing?</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setFormData({ ...formData, mode: 'SIP' })} className={`border-2 border-black p-2 text-xs font-black uppercase ${formData.mode === 'SIP' ? 'bg-black text-white' : 'bg-white'}`}>Monthly SIP</button>
              <button type="button" onClick={() => setFormData({ ...formData, mode: 'ONE_TIME' })} className={`border-2 border-black p-2 text-xs font-black uppercase ${formData.mode === 'ONE_TIME' ? 'bg-black text-white' : 'bg-white'}`}>One-time purchase</button>
            </div>
            <p className="text-[11px] font-bold mt-2">Use one-time purchase for entries such as “Bought Google stock for ₹10,000”. It will not create a monthly SIP obligation.</p>
          </div>
          <div>
            <label className="block text-xs font-mono font-bold uppercase mb-1">
              Asset / Scheme Name *
            </label>
            <input
              type="text"
              placeholder="e.g. UTI Nifty 50 Index Fund, Sovereign Gold Bonds, PPF, Reliance Stock"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`brutal-input ${errors.name ? 'border-red-600 ring-2 ring-red-500' : ''}`}
            />
            {errors.name && (
              <p className="text-xs font-bold text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">
                Investment Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="brutal-input bg-white font-medium"
              >
                {INVESTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="brutal-input font-mono"
              />
            </div>
          </div>

          {formData.type === 'Stocks' && (
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">Quantity / Shares</label>
              <input type="number" min="0" step="0.0001" placeholder="e.g. 2" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="brutal-input font-mono" />
              <p className="text-[10px] font-bold text-black/60 mt-1">Enter the number of shares held. Fractional quantities are supported.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">
                {formData.mode === 'SIP' ? 'Monthly SIP (₹) *' : 'Amount invested (₹) *'}
              </label>
              <input
                type="number"
                placeholder={formData.mode === 'SIP' ? 'e.g. 5000' : 'e.g. 10000'}
                value={formData.mode === 'SIP' ? formData.monthlyContribution : formData.totalInvested}
                onChange={(e) =>
                  setFormData({ ...formData, [formData.mode === 'SIP' ? 'monthlyContribution' : 'totalInvested']: e.target.value })
                }
                className={`brutal-input font-mono ${
                  (formData.mode === 'SIP' ? errors.monthlyContribution : errors.totalInvested) ? 'border-red-600 ring-2 ring-red-500' : ''
                }`}
              />
              {errors.monthlyContribution && formData.mode === 'SIP' && (
                <p className="text-xs font-bold text-red-600 mt-1">
                  {errors.monthlyContribution}
                </p>
              )}
            </div>

            {formData.mode === 'SIP' && <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">
                {formData.mode === 'SIP' ? 'Total principal invested (₹)' : 'Purchase amount (₹)'}
              </label>
              <input
                type="number"
                placeholder="Total principal"
                value={formData.totalInvested}
                onChange={(e) =>
                  setFormData({ ...formData, totalInvested: e.target.value })
                }
                className="brutal-input font-mono"
              />
              {errors.totalInvested && formData.mode === 'ONE_TIME' && (
                <p className="text-xs font-bold text-red-600 mt-1">{errors.totalInvested}</p>
              )}
            </div>}

          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Auto-debit on 5th of every month, Tax benefit under 80C"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="brutal-input text-sm"
            />
          </div>

          <div className="border-2 border-black p-3 bg-purple-100 shadow-brutal-sm text-xs font-bold">
            Only the invested amount is used in your monthly cash-flow calculation. Market returns are intentionally not tracked here.
          </div>

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
              className="brutal-btn bg-neo-purple text-white hover:bg-purple-600 px-5 py-2 text-sm"
            >
              <Save className="w-4 h-4" />
              {initialData ? 'Save Changes' : 'Confirm Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
