import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  INITIAL_SALARY_DATA,
  INITIAL_EXPENSES,
  INITIAL_BILLS,
  INITIAL_INVESTMENTS,
  INITIAL_SAVINGS_TRANSFERS,
  DEMO_SALARY_DATA,
  DEMO_EXPENSES,
  DEMO_BILLS,
  DEMO_INVESTMENTS,
  DEMO_SAVINGS_TRANSFERS,
  FRESH_ACCOUNT_SALARY_DATA,
} from './data/defaultData';
import {
  calculateComprehensiveMetrics,
  markBillAsPaidSafe,
  markBillAsUnpaidSafe,
  formatINR,
  getSignedExpenseAmount,
  calculateRolloverOpeningBalance,
  setDefaultCurrency,
  calculateLoanPaymentBreakdown,
} from './utils/financeCalculators';
import { calculateNextDueDate } from './utils/billDates';
import {
  authAPI,
  dataAPI,
  salaryAPI,
  expensesAPI,
  incomeAPI,
  billsAPI,
  investmentsAPI,
  savingsTransfersAPI,
  savingsGoalsAPI,
  accountsAPI,
  cashBalancesAPI,
  settingsAPI,
  loansAPI,
  cardsAPI,
  customCategoriesAPI,
  getToken,
  setToken,
  removeToken,
  getStoredUser,
  setStoredUser,
} from './utils/api';
import { Header } from './components/Header';
import { BudgetAlertBanner } from './components/BudgetAlertBanner';
import { DashboardInsights } from './components/DashboardInsights';
import { CategoriesView } from './components/CategoriesView';
import { IncomeView } from './components/IncomeView';
import { SummaryCards } from './components/SummaryCards';
import { QuickDefaultExpenses } from './components/QuickDefaultExpenses';
import { ExpenseList } from './components/ExpenseList';
import { MonthlyBills } from './components/MonthlyBills';
import { InvestmentEngine } from './components/InvestmentEngine';
import { InvestmentModal } from './components/InvestmentModal';
import { SavingsAndCashFlow } from './components/SavingsAndCashFlow';
import { SavingsGoalsView } from './components/SavingsGoalsView';
import { LoansView } from './components/LoansView';
import { AnalyticsView } from './components/AnalyticsView';
import { ExpenseHistoryView } from './components/ExpenseHistoryView';
import { CardsView } from './components/CardsView';
import { AccountsView } from './components/AccountsView';
import { SettingsView } from './components/SettingsView';
import { MonthlyBudgetView } from './components/MonthlyBudgetView';
import { ExpenseModal } from './components/ExpenseModal';
import { SalaryBudgetModal } from './components/SalaryBudgetModal';
import { DataBackupModal } from './components/DataBackupModal';
import { NotificationToast } from './components/NotificationToast';
import { AuthPage } from './components/AuthPage';
import {
  Receipt,
  Layers,
  TrendingUp,
  BarChart3,
  History,
  PiggyBank,
  Banknote,
  CreditCard,
  Sparkles,
  LogOut,
  X,
} from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-12 p-6 border-4 border-black bg-red-100 shadow-brutal-lg text-center">
          <div className="font-mono text-xs font-bold uppercase bg-black text-white px-2 py-0.5 inline-block mb-3">
            RECOVERY ENGINE
          </div>
          <h3 className="text-xl font-black uppercase text-red-950 mb-2">
            Section Error Recovered
          </h3>
          <p className="text-xs text-red-900 font-mono mb-4 break-words">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="brutal-btn bg-black text-white hover:bg-neutral-800 px-4 py-2 text-xs font-bold"
          >
            Reload Section
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // ─── Auth State ──────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
  const [user, setUser] = useState(getStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  // ─── Data State ──────────────────────────────────────────────────────
  const [salaryData, setSalaryData] = useState(INITIAL_SALARY_DATA);
  const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [bills, setBills] = useState(INITIAL_BILLS);
  const [investments, setInvestments] = useState(INITIAL_INVESTMENTS);
  const [savingsTransfers, setSavingsTransfers] = useState(INITIAL_SAVINGS_TRANSFERS);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loans, setLoans] = useState([]);
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cashBalances, setCashBalances] = useState([]);
  const [settings, setSettings] = useState({ currency: '₹', dateFormat: 'YYYY-MM-DD', monthStartDay: 1, budgetWarningThreshold: 80, notificationsEnabled: true, theme: 'neo-brutalist' });
  const [customCategories, setCustomCategories] = useState([]);
  const [customCategoryDetails, setCustomCategoryDetails] = useState([]);

  // Current selected monthKey (e.g. '2026-10')
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  // Modals state
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [billActionPrompt, setBillActionPrompt] = useState(null);

  // Notification Toasts
  const [notifications, setNotifications] = useState([]);
  const remindedBillsRef = useRef('');

  const addNotification = useCallback((title, message, type = 'info', action = null) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, title, message, type, action }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4500);
  }, []);

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // ─── Auth Handler ────────────────────────────────────────────────────
  const handleAuth = async (isLogin, email, password, displayName) => {
    if (isLogin) {
      const data = await authAPI.login(email, password);
      setToken(data.token);
      setStoredUser(data.user);
      setUser(data.user);
      setIsAuthenticated(true);
    } else {
      const data = await authAPI.signup(email, password, displayName);
      setToken(data.token);
      setStoredUser(data.user);
      setUser(data.user);
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    removeToken();
    setIsAuthenticated(false);
    setUser(null);
    setSalaryData(INITIAL_SALARY_DATA);
    setExpenses(INITIAL_EXPENSES);
    setIncomeEntries([]);
    setSavingsGoals([]);
    setBills(INITIAL_BILLS);
    setInvestments(INITIAL_INVESTMENTS);
    setSavingsTransfers(INITIAL_SAVINGS_TRANSFERS);
    setLoans([]);
    setCards([]);
    setAccounts([]);
    setCashBalances([]);
    setCustomCategories([]);
    addNotification('LOGGED OUT', 'Session ended. See you soon!', 'info');
  };

  // Listen for forced logout (401 from API)
  useEffect(() => {
    const handleForcedLogout = () => {
      setIsAuthenticated(false);
      setUser(null);
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  // ─── Load All Data from Backend ──────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await dataAPI.getAll();

        setSalaryData(data.salaryData || INITIAL_SALARY_DATA);
        setExpenses(data.expenses || []);
        setIncomeEntries(data.incomeEntries || []);
        setBills(data.bills || []);
        setInvestments(data.investments || []);
        setSavingsTransfers(data.savingsTransfers || []);
        setSavingsGoals(data.savingsGoals || []);
        setLoans(data.loans || []);
        setCards(data.cards || []);
        setAccounts(data.accounts || []);
        setCashBalances(data.cashBalances || []);
        const persistedSettings = await settingsAPI.get();
        setSettings(persistedSettings);
        setDefaultCurrency(persistedSettings.currency);
        setCustomCategories(data.customCategories || []);
        try {
          setCustomCategoryDetails(Array.isArray(data.customCategoryDetails) ? data.customCategoryDetails : await customCategoriesAPI.getDetails());
        } catch (categoryError) { console.error('Failed to load category metadata:', categoryError); }
      } catch (error) {
        console.error('Failed to load data:', error);
        addNotification('LOAD ERROR', 'Could not fetch data from server. Check your connection.', 'danger');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, addNotification]);

  // A recurring bill with five consecutive unconfirmed monthly cycles is treated as cancelled.
  useEffect(() => {
    if (!isAuthenticated || !bills.length) return;
    const monthKey = selectedMonthKey;
    const monthIndex = (key) => {
      const [year, month] = key.split('-').map(Number);
      return year * 12 + month - 1;
    };
    const currentIndex = monthIndex(monthKey);
    const newlyArchived = [];
    const nextBills = bills.map((bill) => {
      if (bill.archived || bill.frequency !== 'Monthly' || !bill.startDate) return bill;
      const [startYear, startMonth] = bill.startDate.split('-').map(Number);
      const startIndex = startYear * 12 + startMonth - 1;
      const missedCount = Array.from({ length: 5 }, (_, offset) => currentIndex - offset)
        .filter((index) => index >= startIndex)
        .filter((index) => {
          const year = Math.floor(index / 12);
          const month = String((index % 12) + 1).padStart(2, '0');
          return !bill.paidMonths?.[`${year}-${month}`];
        }).length;
      if (missedCount >= 5) {
        newlyArchived.push(bill);
        return { ...bill, archived: true };
      }
      return bill;
    });
    if (newlyArchived.length) {
      setBills(nextBills);
      newlyArchived.forEach((bill) => {
        billsAPI.update(bill.id, { ...bill, archived: true }).catch((error) => console.error('Failed to archive inactive bill:', error));
      });
      addNotification('RECURRING BILL ARCHIVED', `${newlyArchived.map((bill) => bill.name).join(', ')} was inactive for 5 months and removed from active expenses.`, 'info');
    }
  }, [isAuthenticated, bills, selectedMonthKey, addNotification]);

  useEffect(() => {
    if (!isAuthenticated || !bills.length || settings.notificationsEnabled === false) return;
    const reminderKey = `${selectedMonthKey}:${bills.map((bill) => `${bill.id}-${bill.paidMonths?.[selectedMonthKey] ? 'paid' : 'pending'}`).join('|')}`;
    if (remindedBillsRef.current === reminderKey) return;
    const today = new Date();
    const pending = bills.filter((bill) => !bill.archived && !bill.paidMonths?.[selectedMonthKey] && bill.dueDate);
    const dueSoon = pending.filter((bill) => {
      const days = Math.ceil((new Date(`${bill.dueDate}T12:00:00`) - today) / 86400000);
      return days <= Math.max(0, Number(bill.reminderDays ?? 3));
    });
    if (dueSoon.length) {
      addNotification('BILL REMINDER', `${dueSoon.map((bill) => bill.name).join(', ')} is pending. Confirm payment when paid.`, 'warning', { label: 'Open Recurring Bills', tab: 'BILLS' });
    }
    remindedBillsRef.current = reminderKey;
  }, [isAuthenticated, bills, selectedMonthKey, settings.notificationsEnabled, addNotification]);

  // Compute available month keys
  const availableMonthKeys = useMemo(() => {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const keys = new Set([currentKey]);

    // Add surrounding months
    for (let offset = -2; offset <= 2; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      keys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    expenses.forEach((e) => {
      if (e.date && e.date.length >= 7) {
        keys.add(e.date.substring(0, 7));
      }
    });
    savingsTransfers.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        keys.add(t.date.substring(0, 7));
      }
    });
    incomeEntries.forEach((entry) => {
      if (entry.date && entry.date.length >= 7) {
        keys.add(entry.date.substring(0, 7));
      }
    });
    return Array.from(keys).sort().reverse();
  }, [expenses, savingsTransfers, incomeEntries]);

  const rolloverOpeningCashBalance = useMemo(() => calculateRolloverOpeningBalance({
      monthKey: selectedMonthKey,
      cashBalances,
      salaryData,
      expenses,
      investments,
      savingsTransfers,
      loans,
      incomeEntries,
    }), [selectedMonthKey, cashBalances, salaryData, expenses, investments, savingsTransfers, loans, incomeEntries]);

  // Calculate comprehensive metrics strictly for the selectedMonthKey
  const metrics = useMemo(() => {
    return calculateComprehensiveMetrics(
      { ...salaryData, thresholds: { ...(salaryData.thresholds || {}), yellow: Number(settings.budgetWarningThreshold) || 80 } },
      expenses,
      investments,
      savingsTransfers,
      selectedMonthKey,
      undefined,
      loans,
      incomeEntries,
      rolloverOpeningCashBalance
    );
  }, [salaryData, settings.budgetWarningThreshold, expenses, investments, savingsTransfers, selectedMonthKey, loans, incomeEntries, rolloverOpeningCashBalance]);

  // ─── Handlers for Salary & Allocations ───────────────────────────────
  const handleSaveSalaryData = async (newData) => {
    setSalaryData(newData);
    addNotification('ALLOCATIONS SAVED', 'Monthly salary and budget allocations updated.', 'success');

    try {
      await salaryAPI.update(newData);
    } catch (error) {
      console.error('Failed to save salary:', error);
      addNotification('SYNC ERROR', 'Failed to save allocations to server.', 'danger');
    }
  };

  // ─── Handlers for Expenses ───────────────────────────────────────────
  const handleSaveExpense = async (expenseItem) => {
    if (editingExpense) {
      setExpenses((prev) =>
        prev.map((item) => (item.id === expenseItem.id ? expenseItem : item))
      );
      addNotification('EXPENSE UPDATED', `Updated "${expenseItem.name}"`, 'success');
      setEditingExpense(null);

      try {
        await expensesAPI.update(expenseItem.id, expenseItem);
      } catch (error) {
        console.error('Failed to update expense:', error);
        addNotification('SYNC ERROR', 'Failed to sync expense update.', 'danger');
      }
    } else {
      setExpenses((prev) => [expenseItem, ...prev]);

      // Check if this newly added expense breaches budget
      const isEssential = expenseItem.type === 'Essential';
      const signedAmount = getSignedExpenseAmount(expenseItem);
      if (expenseItem.transactionKind === 'refund') {
        addNotification('REFUND RECORDED', `${formatINR(expenseItem.amount)} will reduce ${expenseItem.category || 'expense'} totals.`, 'success');
      } else if (isEssential && metrics.essentialActual + signedAmount > metrics.essentialBudget) {
        addNotification(
          '⚠️ ESSENTIAL BUDGET EXCEEDED',
          `Adding "${expenseItem.name}" pushed essential expenses over the ${formatINR(metrics.essentialBudget)} budget!`,
          'danger'
        );
      } else if (!isEssential && metrics.flexibleBudget > 0 && metrics.flexibleActual + signedAmount > metrics.flexibleBudget) {
        addNotification(
          '⚠️ FLEXIBLE BUDGET EXCEEDED',
          `Adding "${expenseItem.name}" pushed flexible spending over your ${formatINR(metrics.flexibleBudget)} allowance!`,
          'danger'
        );
      } else if (!isEssential && metrics.flexibleBudget <= 0) {
        addNotification(
          '⚠️ UNBUDGETED FLEXIBLE SPEND',
          `Logged ${formatINR(expenseItem.amount)} with ₹0 flexible budget. This draws from planned savings!`,
          'warning'
        );
      } else {
        addNotification('EXPENSE RECORDED', `Logged ${formatINR(expenseItem.amount)} for "${expenseItem.name}"`, 'success');
      }

      try {
        await expensesAPI.create(expenseItem);
      } catch (error) {
        console.error('Failed to create expense:', error);
        addNotification('SYNC ERROR', 'Failed to sync new expense.', 'danger');
      }
    }
  };

  const handleSaveIncome = async (incomeItem) => {
    const exists = incomeEntries.some((entry) => entry.id === incomeItem.id);
    setIncomeEntries((prev) => (exists ? prev.map((entry) => entry.id === incomeItem.id ? incomeItem : entry) : [incomeItem, ...prev]));
    addNotification(exists ? 'INCOME UPDATED' : 'INCOME RECORDED', `${formatINR(incomeItem.amount)} recorded as ${incomeItem.category}.`, 'success');
    try { if (exists) await incomeAPI.update(incomeItem.id, incomeItem); else await incomeAPI.create(incomeItem); } catch (error) { console.error('Failed to sync income:', error); addNotification('SYNC ERROR', 'Income was saved locally but failed to sync.', 'warning'); }
  };

  const handleDeleteIncome = async (id) => {
    const entry = incomeEntries.find((item) => item.id === id);
    if (!window.confirm(`Delete income entry "${entry?.name || 'entry'}"?`)) return;
    setIncomeEntries((prev) => prev.filter((item) => item.id !== id));
    try { await incomeAPI.delete(id); } catch (error) { console.error('Failed to delete income:', error); }
  };

  const handleSaveCard = async (card) => {
    const exists = cards.some((item) => item.id === card.id);
    setCards((prev) => (exists ? prev.map((item) => (item.id === card.id ? card : item)) : [card, ...prev]));
    addNotification(exists ? 'CARD UPDATED' : 'CARD ADDED', `${card.name} ending in ${card.lastFour} is ready for expense tracking.`, 'success');
    try {
      if (exists) await cardsAPI.update(card.id, card);
      else await cardsAPI.create(card);
    } catch (error) { console.error('Failed to sync card:', error); addNotification('SYNC ERROR', `Card saved locally. ${error.message || 'Backend sync failed.'}`, 'warning'); }
    return card;
  };

  const handleDeleteCard = async (id) => {
    const card = cards.find((item) => item.id === id);
    if (!window.confirm(`Delete ${card?.name || 'this card'}? Existing expenses will remain but lose their card link.`)) return;
    setCards((prev) => prev.filter((item) => item.id !== id));
    setExpenses((prev) => prev.map((expense) => expense.cardId === id ? { ...expense, cardId: null } : expense));
    try { await cardsAPI.delete(id); } catch (error) { console.error('Failed to delete card:', error); }
  };

  const handleAddCardPayment = async (cardId, payment) => {
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;
    const updatedCard = {
      ...card,
      outstandingAmount: Math.max(0, (Number(card.outstandingAmount) || 0) - Number(payment.amount)),
      payments: [payment, ...(card.payments || [])],
    };
    setCards((prev) => prev.map((item) => item.id === cardId ? updatedCard : item));
    addNotification('CARD PAYMENT RECORDED', `${formatINR(payment.amount)} reduced ${card.name} liability. No duplicate expense was created.`, 'success');
    try { await cardsAPI.addPayment(cardId, payment); } catch (error) { console.error('Failed to sync card payment:', error); addNotification('SYNC ERROR', 'Card payment saved locally but failed to sync.', 'warning'); }
  };

  const handleSaveAccount = async (account) => {
    const exists = accounts.some((item) => item.id === account.id);
    setAccounts((prev) => (exists ? prev.map((item) => item.id === account.id ? account : item) : [...prev, account]));
    addNotification(exists ? 'ACCOUNT UPDATED' : 'ACCOUNT ADDED', `${account.name} is available as a payment source.`, 'success');
    try { if (exists) await accountsAPI.update(account.id, account); else await accountsAPI.create(account); } catch (error) { console.error('Failed to sync account:', error); addNotification('SYNC ERROR', 'Account saved locally but failed to sync.', 'warning'); }
  };

  const handleArchiveAccount = async (id) => {
    const account = accounts.find((item) => item.id === id);
    if (!window.confirm(`Archive account "${account?.name || 'account'}"? Existing transactions remain unchanged.`)) return;
    setAccounts((prev) => prev.map((item) => item.id === id ? { ...item, isActive: false } : item));
    try { await accountsAPI.archive(id); } catch (error) { console.error('Failed to archive account:', error); }
  };

  const handleAddPresetExpense = (presetData) => {
    const newExpense = {
      ...presetData,
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: `${selectedMonthKey}-10`,
      paymentMethod: 'UPI',
    };
    handleSaveExpense(newExpense);
  };

  const handleAddQuickInvestment = async ({ name, amount, detail }) => {
    const investment = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      type: 'Stocks',
      monthlyContribution: 0,
      actualContributions: { [selectedMonthKey]: amount },
      totalInvested: amount,
      currentValue: amount,
      startDate: `${selectedMonthKey}-10`,
      expectedRoi: 0,
      tenureYears: 1,
      notes: detail || 'Quick one-time investment entry',
    };
    setInvestments((prev) => [investment, ...prev]);
    addNotification('INVESTMENT RECORDED', `${formatINR(amount)} invested in ${name}.`, 'success');
    try { await investmentsAPI.create(investment); } catch (error) { console.error('Failed to sync quick investment:', error); }
  };

  const handleDeleteExpense = async (id) => {
    const item = expenses.find((e) => e.id === id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    addNotification('EXPENSE DELETED', `Removed "${item?.name || 'entry'}"`, 'info');

    try {
      await expensesAPI.delete(id);
    } catch (error) {
      console.error('Failed to delete expense:', error);
      addNotification('SYNC ERROR', 'Failed to sync expense deletion.', 'danger');
    }
  };

  const handleImportExpenses = async (importedRows) => {
    const existingKeys = new Set(expenses.map((expense) => `${expense.date}|${expense.name}|${expense.amount}`));
    const uniqueRows = importedRows.filter((expense) => {
      const key = `${expense.date}|${expense.name}|${expense.amount}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });
    if (!uniqueRows.length) { addNotification('IMPORT SKIPPED', 'All CSV rows already exist.', 'info'); return; }
    setExpenses((prev) => [...uniqueRows, ...prev]);
    let failed = 0;
    for (const expense of uniqueRows) {
      try { await expensesAPI.create(expense); } catch (error) { failed += 1; console.error('Failed to sync imported expense:', error); }
    }
    addNotification('CSV IMPORT COMPLETE', `${uniqueRows.length - failed} expenses added${failed ? `, ${failed} failed to sync` : ''}.`, failed ? 'warning' : 'success');
  };

  const handleDeleteAllExpenses = async () => {
    if (!expenses.length) return;
    const confirmed = window.confirm(
      `Delete all ${expenses.length} expense records? This will not delete bills, investments, loans, savings, or salary allocations.`
    );
    if (!confirmed) return;

    setExpenses([]);
    addNotification('ALL EXPENSES DELETED', 'Only expense records were removed. Other financial data is unchanged.', 'info');
    try {
      await expensesAPI.deleteAll();
    } catch (error) {
      console.error('Failed to delete all expenses:', error);
      addNotification('SYNC ERROR', 'Expenses were cleared locally but failed to sync to the server.', 'danger');
    }
  };

  const handleEditExpense = (item) => {
    setEditingExpense(item);
    setIsExpenseModalOpen(true);
  };

  const handleAddCustomCategory = async (name, metadata = {}) => {
    if (!customCategories.includes(name)) {
      setCustomCategories((prev) => [...prev, name]);
      setCustomCategoryDetails((prev) => {
        const next = { name, parentCategory: metadata.parentCategory || 'Custom', transactionType: metadata.transactionType || 'expense', monthlyBudget: Number(metadata.monthlyBudget) || 0, description: metadata.description || '', active: true };
        return prev.some((item) => item.name === name) ? prev.map((item) => (item.name === name ? { ...item, ...next } : item)) : [...prev, next];
      });
      addNotification('CUSTOM CATEGORY ADDED', `Created category "${name}"`, 'success');

      try {
        const created = await customCategoriesAPI.create(name, metadata);
        if (created.category) setCustomCategoryDetails((prev) => prev.map((item) => (item.name === name ? created.category : item)));
      } catch (error) {
        console.error('Failed to create category:', error);
      }
    }
  };

  const handleArchiveCustomCategory = async (name) => {
    if (!window.confirm(`Archive custom category "${name}"? Existing transactions will keep this category.`)) return;
    setCustomCategories((prev) => prev.filter((category) => category !== name));
    setCustomCategoryDetails((prev) => prev.map((category) => (category.name === name ? { ...category, active: false } : category)));
    addNotification('CATEGORY ARCHIVED', `${name} removed from future entry forms.`, 'info');
    try { await customCategoriesAPI.archive(name); } catch (error) { console.error('Failed to archive category:', error); }
  };

  const handleEditCustomCategory = async (oldName, updates) => {
    const newName = String(updates.name || oldName).trim();
    if (!newName || (newName !== oldName && customCategories.includes(newName))) return;
    setCustomCategories((prev) => prev.map((category) => (category === oldName ? newName : category)));
    setCustomCategoryDetails((prev) => prev.map((item) => (item.name === oldName ? { ...item, ...updates, name: newName } : item)));
    try { const result = await customCategoriesAPI.rename(oldName, newName, updates); if (result.category) setCustomCategoryDetails((prev) => prev.map((item) => (item.name === newName ? result.category : item))); addNotification('CATEGORY UPDATED', `${newName} metadata saved.`, 'success'); } catch (error) { console.error('Failed to update category:', error); addNotification('SYNC ERROR', 'Category metadata could not be saved.', 'warning'); }
  };

  // ─── Handlers for Recurring Bills ────────────────────────────────────
  const handleToggleBillStatus = (bill) => {
    const isPaidThisMonth = Boolean(bill.paidMonths?.[selectedMonthKey] ?? bill.isPaid);
    setBillActionPrompt({ bill, isPaidThisMonth, amount: String(bill.expectedAmount ?? '') });
  };

  const processToggleBillStatus = async (bill, enteredAmount, isPaidThisMonth) => {
    setBillActionPrompt(null);
    if (isPaidThisMonth) {
      // Mark as unpaid safely
      const { updatedBill, updatedExpenses } = markBillAsUnpaidSafe(bill, expenses);
      const paidMonths = { ...(bill.paidMonths || {}) };
      delete paidMonths[selectedMonthKey];
      const monthBill = { ...updatedBill, isPaid: false, paidMonths };
      setBills((prev) => prev.map((b) => (b.id === bill.id ? monthBill : b)));
      setExpenses(updatedExpenses);
      addNotification('BILL MARKED UNPAID', `"${bill.name}" marked pending; associated expense removed.`, 'info');

      try {
        await billsAPI.update(bill.id, monthBill);
        // Find and delete the linked expense from backend
        if (bill.linkedExpenseId) {
          await expensesAPI.delete(bill.linkedExpenseId).catch(() => {});
        }
      } catch (error) {
        console.error('Failed to sync bill status:', error);
      }
    } else {
      // Mark as paid safely without duplicate
      const actualAmount = Number(enteredAmount);
      if (!Number.isFinite(actualAmount) || actualAmount <= 0) {
        addNotification('INVALID AMOUNT', 'Enter a positive actual paid amount.', 'warning');
        return;
      }
      const payDate = `${selectedMonthKey}-10`;
      const { updatedBill, updatedExpenses } = markBillAsPaidSafe(
        bill,
        expenses,
        actualAmount,
        payDate
      );
      const paidMonths = { ...(bill.paidMonths || {}), [selectedMonthKey]: true };
      const monthBill = { ...updatedBill, isPaid: true, paidMonths, dueDate: calculateNextDueDate(bill.dueDate, bill.frequency) };
      setBills((prev) => prev.map((b) => (b.id === bill.id ? monthBill : b)));
      setExpenses(updatedExpenses);
      addNotification('BILL SETTLED', `"${bill.name}" marked paid; recorded in expense ledger safely.`, 'success');

      try {
        const result = await billsAPI.pay(bill.id, {
          monthKey: selectedMonthKey,
          amount: actualAmount,
          date: payDate,
          paymentMethod: 'Bank transfer',
          accountName: bill.paymentAccount || 'Bank Account',
          notes: `Recurring bill settlement (${bill.name})`,
          dueDate: monthBill.dueDate,
        });
        if (result?.bill) setBills((prev) => prev.map((item) => (item.id === bill.id ? result.bill : item)));
        if (result?.expense) setExpenses((prev) => {
          const exists = prev.some((item) => item.id === result.expense.id);
          return exists ? prev.map((item) => (item.id === result.expense.id ? result.expense : item)) : [result.expense, ...prev];
        });
      } catch (error) {
        console.error('Failed to sync bill payment:', error);
        addNotification('SYNC ERROR', 'Bill was updated locally but server payment sync failed.', 'warning');
      }
    }
  };

  const handleSaveBill = async (billData) => {
    if (bills.some((b) => b.id === billData.id)) {
      setBills((prev) => prev.map((b) => (b.id === billData.id ? billData : b)));
      addNotification('BILL UPDATED', `Updated "${billData.name}"`, 'success');

      try {
        await billsAPI.update(billData.id, billData);
      } catch (error) {
        console.error('Failed to update bill:', error);
      }
    } else {
      setBills((prev) => [...prev, billData]);
      addNotification('BILL REGISTERED', `Registered recurring bill "${billData.name}"`, 'success');

      try {
        await billsAPI.create(billData);
      } catch (error) {
        console.error('Failed to create bill:', error);
      }
    }
  };

  const handleDeleteBill = async (id) => {
    const bill = bills.find((b) => b.id === id);
    setBills((prev) => prev.filter((b) => b.id !== id));
    addNotification('BILL REMOVED', `Deleted bill "${bill?.name || 'entry'}"`, 'info');

    try {
      await billsAPI.delete(id);
    } catch (error) {
      console.error('Failed to delete bill:', error);
    }
  };

  const handleMarkAllBillsPaid = async () => {
    let currentExpenses = [...expenses];
    const updatedBillsList = bills.map((bill) => {
      if (bill.isPaid) return bill;
      const { updatedBill, updatedExpenses } = markBillAsPaidSafe(
        bill,
        currentExpenses,
        bill.expectedAmount,
        `${selectedMonthKey}-10`
      );
      currentExpenses = updatedExpenses;
      return {
        ...updatedBill,
        dueDate: calculateNextDueDate(bill.dueDate, bill.frequency),
        paidMonths: { ...(bill.paidMonths || {}), [selectedMonthKey]: true },
      };
    });

    setBills(updatedBillsList);
    setExpenses(currentExpenses);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    addNotification('ALL BILLS SETTLED', 'All pending recurring bills marked paid without duplicates! 🎉', 'success');

    // Sync all to backend
    try {
      await dataAPI.importAll({
        salaryData,
        expenses: currentExpenses,
        incomeEntries,
        bills: updatedBillsList,
        investments,
        savingsTransfers,
        customCategories,
        cards,
      });
    } catch (error) {
      console.error('Failed to sync bulk bill updates:', error);
    }
  };

  // ─── Handlers for Investments ────────────────────────────────────────
  const handleSaveInvestment = async (invItem) => {
    if (editingInvestment) {
      setInvestments((prev) =>
        prev.map((i) => (i.id === invItem.id ? invItem : i))
      );
      addNotification('ASSET UPDATED', `Updated investment "${invItem.name}"`, 'success');
      setEditingInvestment(null);

      try {
        await investmentsAPI.update(invItem.id, invItem);
      } catch (error) {
        console.error('Failed to update investment:', error);
      }
    } else {
      setInvestments((prev) => [...prev, invItem]);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      addNotification('INVESTMENT REGISTERED', `Added "${invItem.name}" to portfolio!`, 'success');

      try {
        await investmentsAPI.create(invItem);
      } catch (error) {
        console.error('Failed to create investment:', error);
      }
    }
  };

  const handleDeleteInvestment = async (id) => {
    const item = investments.find((i) => i.id === id);
    setInvestments((prev) => prev.filter((i) => i.id !== id));
    addNotification('INVESTMENT REMOVED', `Deleted "${item?.name || 'asset'}"`, 'info');

    try {
      await investmentsAPI.delete(id);
    } catch (error) {
      console.error('Failed to delete investment:', error);
    }
  };

  const handleEditInvestment = (item) => {
    setEditingInvestment(item);
    setIsInvestmentModalOpen(true);
  };

  const handleToggleMonthContribution = async (invId, mKey) => {
    let updatedInv = null;
    setInvestments((prev) =>
      prev.map((inv) => {
        if (inv.id !== invId) return inv;
        const currentContrib =
          inv.actualContributions && inv.actualContributions[mKey] !== undefined
            ? Number(inv.actualContributions[mKey])
            : 0;

        const isCurrentlyPaid = currentContrib >= inv.monthlyContribution && inv.monthlyContribution > 0;
        const newContrib = isCurrentlyPaid ? 0 : inv.monthlyContribution;

        addNotification(
          !isCurrentlyPaid ? 'SIP CONTRIBUTED' : 'SIP MARKED PENDING',
          `"${inv.name}" marked as ${!isCurrentlyPaid ? 'contributed for ' + mKey : 'pending'}.`,
          !isCurrentlyPaid ? 'success' : 'warning'
        );

        updatedInv = {
          ...inv,
          actualContributions: {
            ...(inv.actualContributions || {}),
            [mKey]: newContrib,
          },
        };
        return updatedInv;
      })
    );

    if (updatedInv) {
      try {
        await investmentsAPI.update(invId, updatedInv);
      } catch (error) {
        console.error('Failed to sync contribution toggle:', error);
      }
    }
  };

  // ─── Handlers for Savings Transfers ──────────────────────────────────
  const handleAddSavingsTransfer = async (transfer) => {
    setSavingsTransfers((prev) => [transfer, ...prev]);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    addNotification('SAVINGS TRANSFER LOGGED', `Recorded deposit of ${formatINR(transfer.amount)} into savings!`, 'success');

    try {
      await savingsTransfersAPI.create(transfer);
    } catch (error) {
      console.error('Failed to create savings transfer:', error);
    }
  };

  const handleDeleteSavingsTransfer = async (id) => {
    setSavingsTransfers((prev) => prev.filter((t) => t.id !== id));
    addNotification('TRANSFER DELETED', 'Savings transfer record removed.', 'info');

    try {
      await savingsTransfersAPI.delete(id);
    } catch (error) {
      console.error('Failed to delete transfer:', error);
    }
  };

  const handleSaveOpeningBalance = async (monthKey, openingBalance) => {
    const saved = { monthKey, openingBalance: Number(openingBalance) || 0 };
    setCashBalances((prev) => prev.some((item) => item.monthKey === monthKey) ? prev.map((item) => item.monthKey === monthKey ? { ...item, ...saved } : item) : [saved, ...prev]);
    addNotification('OPENING BALANCE SAVED', `${monthKey} opening cash is ${formatINR(saved.openingBalance)}.`, 'success');
    try { await cashBalancesAPI.save(monthKey, saved); } catch (error) { console.error('Failed to sync opening balance:', error); addNotification('SYNC ERROR', 'Opening balance saved locally but failed to sync.', 'warning'); }
  };

  const handleSaveSettings = async (nextSettings) => {
    setSettings(nextSettings);
    setDefaultCurrency(nextSettings.currency);
    addNotification('SETTINGS SAVED', 'Your preferences were updated.', 'success');
    try { const saved = await settingsAPI.save(nextSettings); setSettings(saved); } catch (error) { console.error('Failed to sync settings:', error); addNotification('SYNC ERROR', 'Settings saved locally but failed to sync.', 'warning'); }
  };

  const handleSaveSavingsGoal = async (goal) => {
    const exists = savingsGoals.some((item) => item.id === goal.id);
    setSavingsGoals((prev) => (exists ? prev.map((item) => item.id === goal.id ? goal : item) : [goal, ...prev]));
    addNotification(exists ? 'SAVINGS GOAL UPDATED' : 'SAVINGS GOAL ADDED', `${goal.name} target is now tracked.`, 'success');
    try { if (exists) await savingsGoalsAPI.update(goal.id, goal); else await savingsGoalsAPI.create(goal); } catch (error) { console.error('Failed to sync savings goal:', error); addNotification('SYNC ERROR', 'Savings goal was saved locally but failed to sync.', 'warning'); }
  };

  const handleAddSavingsGoalTransaction = async (goalId, transaction) => {
    const goal = savingsGoals.find((item) => item.id === goalId);
    if (!goal) return;
    const delta = transaction.transactionType === 'withdrawal' ? -transaction.amount : transaction.amount;
    if (goal.currentAmount + delta < 0) { addNotification('WITHDRAWAL BLOCKED', 'Withdrawal cannot exceed the current saved amount.', 'warning'); return; }
    const updatedGoal = { ...goal, currentAmount: goal.currentAmount + delta, transactions: [transaction, ...(goal.transactions || [])] };
    setSavingsGoals((prev) => prev.map((item) => item.id === goalId ? updatedGoal : item));
    addNotification(transaction.transactionType === 'withdrawal' ? 'GOAL WITHDRAWAL RECORDED' : 'GOAL CONTRIBUTION RECORDED', `${formatINR(transaction.amount)} recorded for ${goal.name}.`, 'success');
    try { await savingsGoalsAPI.addTransaction(goalId, transaction); } catch (error) { console.error('Failed to sync savings goal transaction:', error); addNotification('SYNC ERROR', 'Goal update was saved locally but failed to sync.', 'warning'); }
  };

  const handleDeleteSavingsGoal = async (id) => {
    const goal = savingsGoals.find((item) => item.id === id);
    if (!window.confirm(`Delete savings goal "${goal?.name || 'goal'}" and its history?`)) return;
    setSavingsGoals((prev) => prev.filter((item) => item.id !== id));
    try { await savingsGoalsAPI.delete(id); } catch (error) { console.error('Failed to delete savings goal:', error); }
  };

  const handleSaveLoan = async (loan) => {
    const exists = loans.some((item) => item.id === loan.id);
    setLoans((prev) => (exists ? prev.map((item) => (item.id === loan.id ? loan : item)) : [loan, ...prev]));
    addNotification(exists ? 'LOAN UPDATED' : 'LOAN ADDED', `${loan.name} EMI is now tracked monthly.`, 'success');
    try {
      if (exists) await loansAPI.update(loan.id, loan);
      else await loansAPI.create(loan);
    } catch (error) {
      console.error('Failed to sync loan:', error);
      addNotification('SYNC ERROR', 'Loan was saved locally but failed to sync.', 'warning');
    }
  };

  const handleDeleteLoan = async (id) => {
    const loan = loans.find((item) => item.id === id);
    setLoans((prev) => prev.filter((item) => item.id !== id));
    addNotification('LOAN REMOVED', `Deleted ${loan?.name || 'loan'}.`, 'info');
    try { await loansAPI.delete(id); } catch (error) { console.error('Failed to delete loan:', error); }
  };

  const handleToggleLoanPaid = async (loan, amountOverride = null) => {
    const paidMonths = { ...(loan.paidMonths || {}) };
    const existingRecord = paidMonths[selectedMonthKey];
    let updatedLoan;
    if (existingRecord) {
      const record = typeof existingRecord === 'object' ? existingRecord : null;
      const restoredBalance = record
        ? Number(record.balanceBefore ?? (Number(record.balanceAfter || 0) + Number(record.principalPaid || 0)))
        : Number(loan.outstandingPrincipal || 0);
      delete paidMonths[selectedMonthKey];
      updatedLoan = {
        ...loan,
        outstandingPrincipal: restoredBalance,
        status: 'Active',
        paidMonths,
      };
    } else {
      const outstanding = Number(loan.outstandingPrincipal || 0);
      const annualRate = Number(loan.interestRate || 0);
      const emi = Number(amountOverride ?? (loan.emiAmount || 0));
      const { interestPaid: monthlyInterest, principalPaid, balanceAfter } = calculateLoanPaymentBreakdown(outstanding, emi, annualRate);
      paidMonths[selectedMonthKey] = {
        paid: true,
        date: `${selectedMonthKey}-${String(Math.min(28, Number(loan.dueDay) || 5)).padStart(2, '0')}`,
        amount: emi,
        balanceBefore: outstanding,
        interestPaid: monthlyInterest,
        principalPaid,
        balanceAfter,
      };
      updatedLoan = {
        ...loan,
        outstandingPrincipal: balanceAfter,
        status: balanceAfter <= 0 ? 'Paid Off' : 'Active',
        paidMonths,
      };
    }
    setLoans((prev) => prev.map((item) => (item.id === loan.id ? updatedLoan : item)));
    addNotification(existingRecord ? 'EMI MARKED PENDING' : 'EMI MARKED PAID', `${loan.name} for ${selectedMonthKey}.`, existingRecord ? 'warning' : 'success');
    try { await loansAPI.update(loan.id, updatedLoan); } catch (error) { console.error('Failed to sync EMI status:', error); }
  };

  // ─── Full Backup, Restore and Demo Reset ─────────────────────────────
  const handleImportData = async (backup) => {
    if (backup.salaryData) setSalaryData(backup.salaryData);
    if (backup.expenses) setExpenses(backup.expenses);
    if (backup.incomeEntries) setIncomeEntries(backup.incomeEntries);
    if (backup.bills) setBills(backup.bills);
    if (backup.investments) setInvestments(backup.investments);
    if (backup.savingsTransfers) setSavingsTransfers(backup.savingsTransfers);
    if (backup.savingsGoals) setSavingsGoals(backup.savingsGoals);
    if (backup.loans) setLoans(backup.loans);
    if (backup.customCategories) setCustomCategories(backup.customCategories);
    if (backup.customCategoryDetails) setCustomCategoryDetails(backup.customCategoryDetails);
    if (backup.cards) setCards(backup.cards);
    if (backup.accounts) setAccounts(backup.accounts);
    if (backup.cashBalances) setCashBalances(backup.cashBalances);
    if (backup.settings) { setSettings(backup.settings); setDefaultCurrency(backup.settings.currency); }
    addNotification('RESTORE COMPLETE', 'Data restored successfully from backup file.', 'success');

    try {
      await dataAPI.importAll(backup);
    } catch (error) {
      console.error('Failed to sync imported data:', error);
      addNotification('SYNC ERROR', 'Import saved locally but failed to sync to server.', 'warning');
    }
  };

  const handleResetData = async (mode = 'clean') => {
    if (mode === 'demo') {
      setSalaryData(DEMO_SALARY_DATA);
      setExpenses(DEMO_EXPENSES);
      setIncomeEntries([]);
      setBills(DEMO_BILLS);
      setInvestments(DEMO_INVESTMENTS);
      setSavingsTransfers(DEMO_SAVINGS_TRANSFERS);
      setSavingsGoals([]);
      setLoans([]);
      setCards([]);
      setAccounts([]);
      setCashBalances([]);
      setSettings({ currency: '₹', dateFormat: 'YYYY-MM-DD', monthStartDay: 1, budgetWarningThreshold: 80, notificationsEnabled: true, theme: 'neo-brutalist' });
      setDefaultCurrency('₹');
      setCustomCategories([]);
      addNotification('DEMO RESTORED', 'Loaded ₹1,90,000 demonstration model.', 'info');

      try {
        await dataAPI.importAll({
          salaryData: DEMO_SALARY_DATA,
          expenses: DEMO_EXPENSES,
          incomeEntries: [],
          bills: DEMO_BILLS,
          investments: DEMO_INVESTMENTS,
          savingsTransfers: DEMO_SAVINGS_TRANSFERS,
          savingsGoals: [],
          loans: [],
          customCategories: [],
          cards: [],
          accounts: [],
          cashBalances: [],
          settings: { currency: '₹', dateFormat: 'YYYY-MM-DD', monthStartDay: 1, budgetWarningThreshold: 80, notificationsEnabled: true, theme: 'neo-brutalist' },
        });
      } catch (error) {
        console.error('Failed to sync demo data:', error);
      }
    } else {
      setSalaryData(FRESH_ACCOUNT_SALARY_DATA);
      setExpenses([]);
      setIncomeEntries([]);
      setBills([]);
      setInvestments([]);
      setSavingsTransfers([]);
      setSavingsGoals([]);
      setLoans([]);
      setCards([]);
      setAccounts([]);
      setCashBalances([]);
      setSettings({ currency: '₹', dateFormat: 'YYYY-MM-DD', monthStartDay: 1, budgetWarningThreshold: 80, notificationsEnabled: true, theme: 'neo-brutalist' });
      setDefaultCurrency('₹');
      setCustomCategories([]);
      addNotification('ACCOUNT RESET', 'Brand new account initialized (0 entries).', 'success');

      try {
        await dataAPI.reset('clean');
      } catch (error) {
        console.error('Failed to sync reset:', error);
      }
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────

  // Show auth page if not logged in
  if (!isAuthenticated) {
    return <AuthPage onLogin={handleAuth} />;
  }

  // Show loading spinner during initial data fetch
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neo-bg flex items-center justify-center">
        <div className="brutal-card bg-white p-8 text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-3 animate-spin text-neo-yellow" />
          <p className="font-black uppercase text-sm">Loading your financial data...</p>
          <p className="text-xs text-black/50 font-mono mt-1">Connecting to command center</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-bg text-black pb-16 lg:pl-64">
      {/* Header */}
      <Header
        salaryData={salaryData}
        onOpenSalaryModal={() => setIsSalaryModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        selectedMonthKey={selectedMonthKey}
        setSelectedMonthKey={setSelectedMonthKey}
        availableMonthKeys={availableMonthKeys}
        metrics={metrics}
        user={user}
        onLogout={handleLogout}
        cards={cards}
         activeTab={activeTab}
         setActiveTab={setActiveTab}
      />

      {/* Player money HUD and summary cards at the very top of the dashboard */}
      <SummaryCards
        metrics={metrics}
        user={user}
        onOpenSalaryModal={() => setIsSalaryModalOpen(true)}
      />

      {/* 4-Tier Overspending & Budget Alert Banner */}
      <BudgetAlertBanner
        metrics={metrics}
        onOpenSalaryModal={() => setIsSalaryModalOpen(true)}
      />

      {/* Main Tab Views */}
      <main id="workspace-content" className="max-w-7xl mx-auto px-4 md:px-8 mt-6 scroll-mt-4">
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-5">
            <MonthlyBudgetView
              selectedMonthKey={selectedMonthKey}
              setSelectedMonthKey={setSelectedMonthKey}
              availableMonthKeys={availableMonthKeys}
              expenses={expenses}
              salaryData={salaryData}
              metrics={metrics}
              onOpenAddModal={() => {
                setEditingExpense(null);
                setIsExpenseModalOpen(true);
              }}
            />

            <DashboardInsights
              expenses={expenses}
              bills={bills}
              metrics={metrics}
              selectedMonthKey={selectedMonthKey}
            />

            <QuickDefaultExpenses
              onAddPresetExpense={handleAddPresetExpense}
              onAddQuickInvestment={handleAddQuickInvestment}
            />

            <ExpenseList
              expenses={expenses}
              selectedMonthKey={selectedMonthKey}
              onOpenAddModal={() => {
                setEditingExpense(null);
                setIsExpenseModalOpen(true);
              }}
              onEditExpense={handleEditExpense}
              onDeleteExpense={handleDeleteExpense}
              onDeleteAllExpenses={handleDeleteAllExpenses}
            />
          </div>
        )}

        {activeTab === 'BILLS' && (
          <div>
            <MonthlyBills
              bills={bills}
              expenses={expenses}
              onToggleBillStatus={handleToggleBillStatus}
              onSaveBill={handleSaveBill}
              onDeleteBill={handleDeleteBill}
              onMarkAllBillsPaid={handleMarkAllBillsPaid}
              selectedMonthKey={selectedMonthKey}
              accounts={accounts}
            />
          </div>
        )}

        {activeTab === 'INVESTMENTS' && (
          <div>
            <InvestmentEngine
              investments={investments}
              selectedMonthKey={selectedMonthKey}
              onAddInvestment={() => {
                setEditingInvestment(null);
                setIsInvestmentModalOpen(true);
              }}
              onDeleteInvestment={handleDeleteInvestment}
              onEditInvestment={handleEditInvestment}
              onToggleMonthContribution={handleToggleMonthContribution}
            />
          </div>
        )}

        {activeTab === 'SAVINGS' && (
          <div>
            <SavingsAndCashFlow
              metrics={metrics}
              savingsTransfers={savingsTransfers}
              selectedMonthKey={selectedMonthKey}
              onAddSavingsTransfer={handleAddSavingsTransfer}
              onDeleteSavingsTransfer={handleDeleteSavingsTransfer}
              openingCashBalance={rolloverOpeningCashBalance}
              onSaveOpeningBalance={handleSaveOpeningBalance}
            />
          </div>
        )}

        {activeTab === 'SAVINGS_GOALS' && <SavingsGoalsView goals={savingsGoals} onSaveGoal={handleSaveSavingsGoal} onDeleteGoal={handleDeleteSavingsGoal} onAddGoalTransaction={handleAddSavingsGoalTransaction} />}

        {activeTab === 'LOANS' && (
          <LoansView
            loans={loans}
            selectedMonthKey={selectedMonthKey}
            onSaveLoan={handleSaveLoan}
            onDeleteLoan={handleDeleteLoan}
            onTogglePaid={handleToggleLoanPaid}
          />
        )}

        {activeTab === 'CARDS' && (
          <CardsView cards={cards} expenses={expenses} onSaveCard={handleSaveCard} onDeleteCard={handleDeleteCard} onAddCardPayment={handleAddCardPayment} />
        )}

        {activeTab === 'ACCOUNTS' && <AccountsView accounts={accounts} expenses={expenses} incomeEntries={incomeEntries} savingsTransfers={savingsTransfers} cards={cards} onSaveAccount={handleSaveAccount} onArchiveAccount={handleArchiveAccount} />}
        {activeTab === 'SETTINGS' && <SettingsView settings={settings} onSaveSettings={handleSaveSettings} />}

        {activeTab === 'ANALYTICS' && (
          <div>
            <AnalyticsView
              metrics={metrics}
              expenses={expenses}
              investments={investments}
              savingsTransfers={savingsTransfers}
              selectedMonthKey={selectedMonthKey}
            />
          </div>
        )}

        {activeTab === 'CATEGORIES' && (
          <CategoriesView
            customCategories={customCategories}
            customCategoryDetails={customCategoryDetails}
            onAddCategory={handleAddCustomCategory}
            onEditCategory={handleEditCustomCategory}
            onArchiveCategory={handleArchiveCustomCategory}
          />
        )}

        {activeTab === 'INCOME' && (
          <IncomeView
            incomeEntries={incomeEntries}
            selectedMonthKey={selectedMonthKey}
            onSaveIncome={handleSaveIncome}
            onDeleteIncome={handleDeleteIncome}
          />
        )}

        {activeTab === 'HISTORY' && (
          <ExpenseHistoryView
            expenses={expenses}
            incomeEntries={incomeEntries}
            savingsTransfers={savingsTransfers}
            investments={investments}
            loans={loans}
            selectedMonthKey={selectedMonthKey}
            setSelectedMonthKey={setSelectedMonthKey}
          />
        )}
      </main>

      {/* Modals */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSaveExpense={handleSaveExpense}
        initialData={editingExpense}
        cards={cards}
          onAddCard={handleSaveCard}
        accounts={accounts}
        currencySymbol={settings.currency}
        customCategories={customCategories}
        onAddCustomCategory={handleAddCustomCategory}
      />

      <InvestmentModal
        isOpen={isInvestmentModalOpen}
        onClose={() => {
          setIsInvestmentModalOpen(false);
          setEditingInvestment(null);
        }}
        onSaveInvestment={handleSaveInvestment}
        initialData={editingInvestment}
      />

      <SalaryBudgetModal
        isOpen={isSalaryModalOpen}
        onClose={() => setIsSalaryModalOpen(false)}
        salaryData={salaryData}
        onSaveSalaryData={handleSaveSalaryData}
        investments={investments}
        loans={loans}
      />

      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        fullData={{
          backupVersion: 2,
          exportedAt: new Date().toISOString(),
          salaryData,
          expenses,
          incomeEntries,
          bills,
          investments,
          savingsTransfers,
          savingsGoals,
          loans,
          customCategories,
          customCategoryDetails,
          cards,
          accounts,
          cashBalances,
          settings,
        }}
        monthlyStats={{
          monthKey: selectedMonthKey,
          metrics,
          expenses,
          incomeEntries,
          investments,
          savingsTransfers,
          bills,
          loans,
        }}
        onImportData={handleImportData}
        onImportExpenses={handleImportExpenses}
        onResetData={handleResetData}
      />

      {billActionPrompt && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Recurring bill action</div><h2 className="mt-1 text-xl font-black text-slate-900">{billActionPrompt.isPaidThisMonth ? 'Mark bill as unpaid?' : 'Confirm bill payment'}</h2><p className="mt-1 text-sm text-slate-500">{billActionPrompt.bill.name} · {selectedMonthKey}</p></div><button type="button" onClick={() => setBillActionPrompt(null)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Close"><X className="w-4 h-4" /></button></div>{billActionPrompt.isPaidThisMonth ? <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">This removes the linked expense for this month and returns the bill to pending.</p> : <label className="mt-5 block text-xs font-black uppercase tracking-wide text-slate-700">Actual amount paid<input type="number" min="0.01" step="0.01" autoFocus value={billActionPrompt.amount} onChange={(event) => setBillActionPrompt((current) => ({ ...current, amount: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-lg font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><span className="mt-1 block text-[11px] font-normal normal-case text-slate-500">Expected amount: {formatINR(billActionPrompt.bill.expectedAmount)}</span></label>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setBillActionPrompt(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => processToggleBillStatus(billActionPrompt.bill, billActionPrompt.amount, billActionPrompt.isPaidThisMonth)} className={`rounded-xl px-4 py-2.5 text-xs font-bold text-white ${billActionPrompt.isPaidThisMonth ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-950 hover:bg-slate-800'}`}>{billActionPrompt.isPaidThisMonth ? 'Mark Unpaid' : 'Confirm Payment'}</button></div></div></div>}

      {/* Floating Neo-Brutalist Toast Notifications */}
      <NotificationToast
        notifications={notifications}
        onDismiss={dismissNotification}
        onAction={(notification) => { if (notification.action?.tab) { setActiveTab(notification.action.tab); dismissNotification(notification.id); window.setTimeout(() => document.getElementById('workspace-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); } }}
      />
    </div>
  );
}
