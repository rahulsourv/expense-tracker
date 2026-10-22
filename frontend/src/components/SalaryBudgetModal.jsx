import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, ShieldCheck, Sliders, Layers, ArrowRight } from 'lucide-react';
import { formatINR } from '../utils/financeCalculators';
import { BUDGET_TOPICS, normalizeTopicBudgets } from '../utils/budgetTopics';

export const SalaryBudgetModal = ({
  isOpen,
  onClose,
  salaryData,
  onSaveSalaryData,
  investments = [],
  loans = [],
}) => {
  const [formData, setFormData] = useState({
    monthlySalary: 190000,
    investmentsAllocation: 40000,
    essentialBudget: 50000,
    plannedSavings: 100000,
    thresholds: {
      green: 75,
      yellow: 90,
      orange: 100,
    },
      categoryBudgets: {},
  });

  const [activeTab, setActiveTab] = useState('ALLOCATIONS'); // 'ALLOCATIONS' | 'CATEGORIES' | 'THRESHOLDS'
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (salaryData) {
      setFormData({
        // A zero backend value means "not set yet" in the form, not a required literal 0.
        monthlySalary: salaryData.monthlySalary || '',
        investmentsAllocation: salaryData.investmentsAllocation || '',
        essentialBudget: salaryData.essentialBudget || '',
        plannedSavings: salaryData.plannedSavings || '',
        thresholds: salaryData.thresholds || { green: 75, yellow: 90, orange: 100 },
        categoryBudgets: normalizeTopicBudgets(salaryData.categoryBudgets || {}),
      });
    }
  }, [salaryData, isOpen]);

  if (!isOpen) return null;

  // Compute live calculations
  const salary = Number(formData.monthlySalary) || 0;
  const invAlloc = Number(formData.investmentsAllocation) || 0;
  const essBudget = Number(formData.essentialBudget) || 0;
  const planSavings = Number(formData.plannedSavings) || 0;
  const loanCommitment = loans.filter((loan) => loan.status === 'Active').reduce((sum, loan) => sum + (Number(loan.emiAmount) || 0), 0);

  // Flexible Budget = Salary - Investments - Essential Budget - Planned Savings
  const computedFlexibleBudget = salary - invAlloc - essBudget - planSavings - loanCommitment;
  const totalAllocated = invAlloc + essBudget + planSavings + loanCommitment + Math.max(0, computedFlexibleBudget);
  const unallocatedAmount = salary - totalAllocated;
  const isOverAllocated = (invAlloc + essBudget + planSavings + loanCommitment) > salary;

  // Sum of current investment scheme planned contributions
  const investmentsPlannedSum = investments.reduce(
    (sum, inv) => sum + (Number(inv.monthlyContribution) || 0),
    0
  );

  const handleSyncInvestments = () => {
    setFormData((prev) => ({
      ...prev,
      investmentsAllocation: investmentsPlannedSum,
    }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.monthlySalary || Number(formData.monthlySalary) <= 0) {
      errs.monthlySalary = 'Monthly salary must be greater than 0';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSaveSalaryData({
      ...salaryData,
      monthlySalary: Number(formData.monthlySalary),
      investmentsAllocation: Number(formData.investmentsAllocation),
      essentialBudget: Number(formData.essentialBudget),
      plannedSavings: Number(formData.plannedSavings),
      thresholds: formData.thresholds,
      categoryBudgets: formData.categoryBudgets,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="brutal-card bg-neo-cream max-w-xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <span className="brutal-badge bg-neo-yellow text-black">BUDGET CONFIG</span>
            <h3 className="text-xl font-black uppercase">Salary & Allocations Engine</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black hover:text-white border-2 border-black transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex gap-1 mb-4 border-b-2 border-black pb-2 bg-neutral-100 p-1">
          {[
            { id: 'ALLOCATIONS', label: 'Core Allocations' },
            { id: 'CATEGORIES', label: 'Category Budgets' },
            { id: 'THRESHOLDS', label: 'Alert Thresholds' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs font-bold uppercase transition-all ${
                activeTab === tab.id
                  ? 'bg-black text-white shadow-brutal-sm'
                  : 'text-black hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'ALLOCATIONS' && (
            <>
              {/* 1. Monthly Salary */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">
                  1. Total Monthly Salary Received (INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono font-bold text-black/60">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={formData.monthlySalary}
                    onChange={(e) =>
                      setFormData({ ...formData, monthlySalary: e.target.value })
                    }
                    className={`brutal-input pl-8 font-mono text-base ${
                      errors.monthlySalary ? 'border-red-600 ring-2 ring-red-500' : ''
                    }`}
                  />
                </div>
                <p className="text-[11px] text-black/70 font-medium mt-1">
                  Your baseline net earnings for the month. (Example: ₹1,90,000)
                </p>
              </div>

              {/* 2. Monthly Investments */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono font-bold uppercase">
                    2. Monthly Investment Allocation (INR)
                  </label>
                  {investmentsPlannedSum > 0 && (
                    <button
                      type="button"
                      onClick={handleSyncInvestments}
                      className="text-[10px] font-mono font-bold text-purple-900 underline hover:text-purple-700"
                    >
                      Sync with Portfolio sum (₹{investmentsPlannedSum.toLocaleString('en-IN')})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono font-bold text-black/60">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={formData.investmentsAllocation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        investmentsAllocation: e.target.value,
                      })
                    }
                    className="brutal-input pl-8 font-mono"
                  />
                </div>
                <p className="text-[11px] text-black/70 font-medium mt-1">
                  Monthly amount committed to SIPs, Mutual Funds, Stocks, PPF. (Example: ₹40,000)
                </p>
              </div>

              {/* 3. Essential Expense Budget */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">
                  3. Recurring Expense Budget (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono font-bold text-black/60">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={formData.essentialBudget}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        essentialBudget: e.target.value,
                      })
                    }
                    className="brutal-input pl-8 font-mono"
                  />
                </div>
                <p className="text-[11px] text-black/70 font-medium mt-1">
                  Budget reserved for recurring/fixed costs such as Rent, Electricity, Water, Gas, and Broadband. (Example: ₹50,000)
                </p>
              </div>

              {/* 4. Planned Savings Account Allocation */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">
                  4. Minimum Savings Target (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono font-bold text-black/60">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={formData.plannedSavings}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plannedSavings: e.target.value,
                      })
                    }
                    className="brutal-input pl-8 font-mono"
                  />
                </div>
                <p className="text-[11px] text-black/70 font-medium mt-1">
                  Minimum amount protected for savings. Bill underspending adds to it; bill overspending uses it. (Example: ₹1,00,000).
                </p>
              </div>

              {/* Computed Flexible Budget Card */}
              <div
                className={`border-3 border-black p-4 shadow-brutal-sm ${
                  isOverAllocated
                    ? 'bg-red-100 text-red-950 border-red-900'
                    : computedFlexibleBudget === 0
                    ? 'bg-neo-yellow text-black'
                    : 'bg-emerald-100 text-emerald-950'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-xs font-black uppercase">
                    5. COMPUTED EXPENSE BUDGET
                  </div>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-black text-white">
                    FORMULA APPLIED
                  </span>
                </div>

                <div className="font-mono text-xs text-black/80 mb-2">
                    Salary ({formatINR(salary)}) - Investments ({formatINR(invAlloc)}) - Recurring Expenses ({formatINR(essBudget)}) - Savings ({formatINR(planSavings)}) - Loan EMIs ({formatINR(loanCommitment)})
                </div>

                <div className="text-2xl font-black font-mono">
                  {formatINR(computedFlexibleBudget)}
                </div>

                {isOverAllocated ? (
                  <div className="mt-2 text-xs font-bold text-red-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      WARNING: Total committed allocations including loan EMIs ({formatINR(invAlloc + essBudget + planSavings + loanCommitment)}) exceed your salary by {formatINR(invAlloc + essBudget + planSavings + loanCommitment - salary)}. Adjust your amounts!
                    </span>
                  </div>
                ) : computedFlexibleBudget === 0 ? (
                  <p className="mt-2 text-xs font-bold text-black/80">
                    The entire salary has been fully allocated into investments, recurring expenses, and savings. Additional expenses are ₹0 budgeted.
                  </p>
                ) : (
                  <p className="mt-2 text-xs font-bold text-emerald-900">
                    {formatINR(computedFlexibleBudget)} is safely available for additional expenses such as dining, travel, clothes, and shopping.
                  </p>
                )}
              </div>
            </>
          )}

          {activeTab === 'CATEGORIES' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-black/70">
                Set individual monthly spending limits for high-frequency categories to receive specific category overspending alerts:
              </p>

              {BUDGET_TOPICS.map((topic) => {
                const cat = topic.name;
                return (
                  <div key={cat} className="flex items-center justify-between gap-3 bg-white border border-black p-2">
                    <span className="text-xs font-mono font-bold">{cat}</span>
                    <div className="relative w-36">
                      <span className="absolute left-2 top-1.5 font-mono text-xs font-bold text-black/50">
                        ₹
                      </span>
                      <input
                        type="number"
                        placeholder="Limit"
                        value={formData.categoryBudgets[cat] || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            categoryBudgets: {
                              ...formData.categoryBudgets,
                              [cat]: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-neutral-50 border border-black pl-6 pr-2 py-1 text-xs font-mono font-bold focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'THRESHOLDS' && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-black/70">
                Customize the percentage triggers for budget health warnings:
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="border-2 border-black p-3 bg-emerald-100">
                  <div className="text-[10px] font-mono font-black uppercase text-emerald-900">
                    GREEN THRESHOLD
                  </div>
                  <div className="text-xs font-bold mt-1">Below {formData.thresholds.green}%</div>
                  <p className="text-[10px] text-emerald-800 mt-1">Safe spending pace</p>
                </div>

                <div className="border-2 border-black p-3 bg-yellow-100">
                  <div className="text-[10px] font-mono font-black uppercase text-yellow-900">
                    YELLOW THRESHOLD
                  </div>
                  <div className="text-xs font-bold mt-1">{formData.thresholds.green}% - {formData.thresholds.yellow}%</div>
                  <p className="text-[10px] text-yellow-800 mt-1">Caution / Moderate</p>
                </div>

                <div className="border-2 border-black p-3 bg-red-100">
                  <div className="text-[10px] font-mono font-black uppercase text-red-900">
                    RED THRESHOLD
                  </div>
                  <div className="text-xs font-bold mt-1">Above {formData.thresholds.orange}%</div>
                  <p className="text-[10px] text-red-800 mt-1">Critical / Overbudget</p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase mb-1">
                    Yellow Alert Trigger (% of budget)
                  </label>
                  <input
                    type="number"
                    value={formData.thresholds.green}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thresholds: {
                          ...formData.thresholds,
                          green: e.target.value,
                        },
                      })
                    }
                    className="brutal-input font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase mb-1">
                    Orange Warning Trigger (% of budget)
                  </label>
                  <input
                    type="number"
                    value={formData.thresholds.yellow}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thresholds: {
                          ...formData.thresholds,
                          yellow: e.target.value,
                        },
                      })
                    }
                    className="brutal-input font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

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
              Save Allocations
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
