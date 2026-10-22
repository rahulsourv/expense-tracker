// Financial calculations, budget metrics, and currency formatters
import { topicForExpense } from './budgetTopics';

let defaultCurrencySymbol = '₹';

export const setDefaultCurrency = (symbol) => {
  if (['₹', '$', '€', '£', '¥'].includes(symbol)) defaultCurrencySymbol = symbol;
};

/**
 * Format currency in Indian numbering system (e.g., ₹1,90,000)
 */
export const formatINR = (amount, currencySymbol = defaultCurrencySymbol) => {
  const num = Number(amount) || 0;
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const formatted = absNum.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });

  return `${isNegative ? '-' : ''}${currencySymbol}${formatted}`;
};

// Alias for backwards compatibility
export const formatCurrency = formatINR;

// Refunds/reversals are stored as positive source amounts but participate in
// reports as negative consumption. Keeping this rule in one helper prevents
// individual screens from disagreeing about totals.
export const getSignedExpenseAmount = (expense) => {
  const amount = Number(expense?.amount) || 0;
  return expense?.transactionKind === 'refund' ? -amount : amount;
};

export const calculateAccountBalances = ({
  accounts = [],
  expenses = [],
  incomeEntries = [],
  savingsTransfers = [],
  cards = [],
}) => {
  const balances = Object.fromEntries(accounts.map((account) => [account.name, Number(account.openingBalance) || 0]));
  const accountTypes = Object.fromEntries(accounts.map((account) => [account.name, account.accountType]));
  const creditCardNames = new Set(accounts.filter((account) => account.accountType === 'Credit Card').map((account) => account.name));
  const add = (name, amount) => {
    if (name && Object.prototype.hasOwnProperty.call(balances, name)) balances[name] += Number(amount) || 0;
  };
  incomeEntries.forEach((entry) => add(entry.accountName, entry.amount));
  expenses.forEach((expense) => {
    // Credit-card purchases are liability movements; their card balance is
    // already represented by the card record and must not reduce bank cash.
    if (!creditCardNames.has(expense.accountName)) add(expense.accountName, -getSignedExpenseAmount(expense));
  });
  savingsTransfers.forEach((transfer) => {
    add(transfer.sourceAccount, -(Number(transfer.amount) || 0));
    add(transfer.destinationAccount, Number(transfer.amount) || 0);
  });
  cards.forEach((card) => (card.payments || []).forEach((payment) => {
    add(payment.accountName, -(Number(payment.amount) || 0));
  }));
  return accounts.map((account) => ({
    ...account,
    calculatedBalance: Math.round((balances[account.name] || 0) * 100) / 100,
    accountType: accountTypes[account.name] || account.accountType,
  }));
};

export const buildTransactionLedger = ({
  expenses = [],
  incomeEntries = [],
  savingsTransfers = [],
  investments = [],
  loans = [],
}) => {
  const ledger = [
    ...expenses.map((item) => {
      const signedExpense = getSignedExpenseAmount(item);
      return { id: item.id, date: item.date, description: item.name, category: item.category, type: item.transactionKind === 'refund' ? 'Refund' : 'Expense', amount: Math.abs(Number(item.amount) || 0), cashEffect: -signedExpense, accountName: item.accountName };
    }),
    ...incomeEntries.map((item) => ({ id: item.id, date: item.date, description: item.name, category: item.category, type: 'Income', amount: Number(item.amount) || 0, cashEffect: Number(item.amount) || 0, accountName: item.accountName })),
    ...savingsTransfers.map((item) => ({ id: item.id, date: item.date, description: `${item.sourceAccount || 'Account'} → ${item.destinationAccount || 'Savings'}`, category: 'Savings transfer', type: 'Transfer', amount: Number(item.amount) || 0, cashEffect: -(Number(item.amount) || 0), accountName: item.sourceAccount })),
    ...investments.flatMap((investment) => Object.entries(investment.actualContributions || {}).map(([monthKey, amount]) => ({ id: `${investment.id}-${monthKey}`, date: `${monthKey}-01`, description: investment.name, category: investment.type, type: 'Investment', amount: Number(amount) || 0, cashEffect: -(Number(amount) || 0), accountName: investment.accountName }))),
    ...loans.flatMap((loan) => Object.entries(loan.paidMonths || {}).filter(([, paid]) => Boolean(paid)).map(([monthKey, paid]) => {
      const amount = typeof paid === 'object' ? Number(paid.amount || paid.emiAmount || loan.emiAmount) : Number(loan.emiAmount) || 0;
      const day = String(Math.min(28, Number(loan.dueDay) || 5)).padStart(2, '0');
      return { id: `${loan.id}-${monthKey}`, date: `${monthKey}-${day}`, description: loan.name, category: 'Loan repayment', type: 'Loan payment', amount, cashEffect: -amount, accountName: loan.accountName };
    })),
  ];
  return ledger.filter((item) => item.date && Number.isFinite(Number(item.amount))).sort((a, b) => String(b.date).localeCompare(String(a.date)));
};

/**
 * Calculate SIP Future Value
 * Formula: FV = P * [((1 + i)^n - 1) / i] * (1 + i)
 * where i = annualRate / (12 * 100), n = years * 12
 */
export const calculateSipFutureValue = (monthlyAmount, annualRate, years) => {
  const p = Number(monthlyAmount) || 0;
  const rate = Number(annualRate) || 0;
  const t = Number(years) || 1;

  if (p <= 0) return { totalDeposited: 0, futureValue: 0, returnsGain: 0 };
  if (rate <= 0) {
    const total = p * t * 12;
    return { totalDeposited: total, futureValue: total, returnsGain: 0 };
  }

  const i = rate / (12 * 100);
  const n = t * 12;

  const futureValue = p * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  const totalDeposited = p * n;
  const returnsGain = Math.max(0, futureValue - totalDeposited);

  return {
    totalDeposited: Math.round(totalDeposited),
    futureValue: Math.round(futureValue),
    returnsGain: Math.round(returnsGain),
  };
};

/** Calculate one loan EMI split without treating market/loan interest as principal. */
export const calculateLoanPaymentBreakdown = (outstandingPrincipal, emiAmount, annualInterestRate) => {
  const outstanding = Math.max(0, Number(outstandingPrincipal) || 0);
  const emi = Math.max(0, Number(emiAmount) || 0);
  const annualRate = Math.max(0, Number(annualInterestRate) || 0);
  const interestPaid = Math.round((outstanding * annualRate / 100 / 12) * 100) / 100;
  const principalPaid = Math.min(outstanding, Math.max(0, emi - interestPaid));
  return {
    interestPaid,
    principalPaid,
    balanceAfter: Math.max(0, outstanding - principalPaid),
  };
};

/**
 * Helper to get days in a given month (e.g. '2026-10')
 */
export const getDaysInMonth = (monthKey) => {
  if (!monthKey || !monthKey.includes('-')) return 30;
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  return new Date(year, month, 0).getDate();
};

export const getPreviousMonthKey = (monthKey) => {
  if (!/^\d{4}-\d{2}$/.test(monthKey || '')) return null;
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Resolve a month's opening cash balance. An explicitly saved balance wins;
 * otherwise the latest earlier manual opening balance is rolled forward using
 * each intervening month's actual income, expenses, investments, loans, and
 * savings transfers. This keeps month navigation consistent without silently
 * overwriting a user's manual correction.
 */
export const calculateRolloverOpeningBalance = ({
  monthKey,
  cashBalances = [],
  salaryData = {},
  expenses = [],
  investments = [],
  savingsTransfers = [],
  loans = [],
  incomeEntries = [],
}) => {
  if (!/^\d{4}-\d{2}$/.test(monthKey || '')) return 0;
  const explicit = cashBalances
    .filter((balance) => /^\d{4}-\d{2}$/.test(balance.monthKey || '') && balance.monthKey <= monthKey)
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))[0];
  let cursor = explicit?.monthKey || null;
  let opening = Math.max(0, Number(explicit?.openingBalance) || 0);
  if (!cursor) {
    cursor = getPreviousMonthKey(monthKey);
    return 0;
  }
  while (cursor < monthKey) {
    const next = `${new Date(Number(cursor.slice(0, 4)), Number(cursor.slice(5, 7)), 1).getFullYear()}-${String(new Date(Number(cursor.slice(0, 4)), Number(cursor.slice(5, 7)), 1).getMonth() + 1).padStart(2, '0')}`;
    const closing = calculateComprehensiveMetrics(salaryData, expenses, investments, savingsTransfers, cursor, undefined, loans, incomeEntries, opening).closingCashBalance;
    opening = Math.max(0, Number(closing) || 0);
    cursor = next;
  }
  return opening;
};

/**
 * Comprehensive monthly financial metrics calculator
 * 
 * @param {Object} salaryData - { monthlySalary, investmentsAllocation, essentialBudget, plannedSavings, thresholds, categoryBudgets }
 * @param {Array} expenses - list of all expenses
 * @param {Array} investments - list of investments
 * @param {Array} savingsTransfers - list of transfers into savings
 * @param {string} monthKey - 'YYYY-MM' format, e.g. '2026-10'
 * @param {Date} [referenceDate] - reference date for pace and overdue checks
 * @param {Array} incomeEntries - additional income received in the selected month
 * @param {number} openingCashBalance - opening consolidated cash balance for the selected month
 */
export const calculateComprehensiveMetrics = (
  salaryData,
  expenses = [],
  investments = [],
  savingsTransfers = [],
  monthKey = '2026-10',
  referenceDate = new Date('2026-10-16T12:00:00Z'),
  loans = [],
  incomeEntries = [],
  openingCashBalance = 0
) => {
  const salary = Number(salaryData.monthlySalary) || 0;
  const openingBalance = Math.max(0, Number(openingCashBalance) || 0);
  const monthIncome = (incomeEntries || []).filter((entry) => entry.date && entry.date.startsWith(monthKey));
  const otherIncome = monthIncome.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const totalIncome = salary + otherIncome;
  const investmentsAllocation = Number(salaryData.investmentsAllocation) || 0;
  const essentialBudget = Number(salaryData.essentialBudget) || 0;
  const plannedSavings = Number(salaryData.plannedSavings) || 0;
  const activeLoans = loans.filter((loan) => loan.status === 'Active');
  const loanCommitment = activeLoans.reduce((sum, loan) => sum + (Number(loan.emiAmount) || 0), 0);

  // Flexible budget calculated strictly:
  // Flexible Budget = Salary - Investments - Essential Budget - Planned Savings
  const flexibleBudget = salary - investmentsAllocation - essentialBudget - plannedSavings - loanCommitment;

  // Total committed allocations
  const totalAllocations = investmentsAllocation + essentialBudget + plannedSavings + loanCommitment + Math.max(0, flexibleBudget);
  const unallocatedIncome = salary - totalAllocations;
  const allocationPercent = salary > 0 ? Math.round((totalAllocations / salary) * 100) : 0;
  // Filter expenses strictly for the selected monthKey
  const monthExpenses = expenses.filter((e) => e.date && e.date.startsWith(monthKey));

  let essentialActual = 0;
  let flexibleActual = 0;
  const categorySpendMap = {};

  monthExpenses.forEach((exp) => {
    const signedAmount = getSignedExpenseAmount(exp);
    if (exp.type === 'Essential') {
      essentialActual += signedAmount;
    } else {
      flexibleActual += signedAmount;
    }

    const cat = exp.category || 'Other';
    categorySpendMap[cat] = (categorySpendMap[cat] || 0) + signedAmount;
  });

  const consumptionExpenses = essentialActual + flexibleActual;
  const loanInterestPaid = activeLoans.reduce((sum, loan) => {
    const record = loan.paidMonths?.[monthKey];
    return sum + (record && typeof record === 'object' ? (Number(record.interestPaid) || 0) : 0);
  }, 0);
  // Principal is a liability reduction; only the interest portion is an
  // expense. The complete EMI remains a cash outflow below.
  const totalExpenses = consumptionExpenses + loanInterestPaid;

  // Remaining budgets
  const remainingEssentialBudget = essentialBudget - essentialActual;
  const remainingFlexibleBudget = flexibleBudget - flexibleActual;

  // Investment contributions for this month
  let actualInvestments = 0;
  let plannedInvestmentsSum = 0;
  let totalInvestedPrincipal = 0;
  let currentPortfolioValue = 0;

  investments.forEach((inv) => {
    const planned = Number(inv.monthlyContribution) || 0;
    plannedInvestmentsSum += planned;

    // Check recorded actual contribution for this month
    const actual = inv.actualContributions && inv.actualContributions[monthKey] !== undefined
      ? Number(inv.actualContributions[monthKey])
      : 0;
    actualInvestments += actual;

    totalInvestedPrincipal += Number(inv.totalInvested) || 0;
    currentPortfolioValue += Number(inv.currentValue) || 0;
  });

  const unrealizedGainLoss = currentPortfolioValue - totalInvestedPrincipal;

  const actualLoanPayments = activeLoans.reduce(
    (sum, loan) => {
      const record = loan.paidMonths?.[monthKey];
      return sum + (record ? (typeof record === 'object' ? (Number(record.amount || record.emiAmount || loan.emiAmount) || 0) : (Number(loan.emiAmount) || 0)) : 0);
    },
    0
  );

  // Savings transfers for this month
  const monthTransfers = (savingsTransfers || []).filter(
    (t) => t.date && t.date.startsWith(monthKey)
  );
  const actualSavingsTransfers = monthTransfers.reduce(
    (sum, t) => sum + (Number(t.amount) || 0),
    0
  );

  // Cash flow calculation:
  // Liquid cash remaining in salary checking account after all outflows
  // Total Outflows = Total Expenses + Actual Investments
  const totalCashOutflow = consumptionExpenses + actualInvestments + actualLoanPayments;
  // Net cash remaining in bank account (after expenses, investments, and savings transfers)
  const remainingBankBalance = openingBalance + totalIncome - consumptionExpenses - actualInvestments - actualLoanPayments - actualSavingsTransfers;

  // Actual savings achieved: money transferred to savings + any positive residual cash balance
  const actualSavings = actualSavingsTransfers + Math.max(0, remainingBankBalance);
  const savingsVariance = actualSavings - plannedSavings;
  // Any underspend increases the amount left as savings; any overspend reduces it.
  const savingsAdjustment = savingsVariance;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
  const investmentAllocationRate = totalIncome > 0 ? (actualInvestments / totalIncome) * 100 : 0;

  const topicBudgetMap = Object.entries(salaryData.categoryBudgets || {}).reduce((result, [category, budget]) => {
    const topic = topicForExpense({ category });
    result[topic] = (Number(result[topic]) || 0) + (Number(budget) || 0);
    return result;
  }, {});
  const topicSpendMap = monthExpenses.reduce((result, expense) => {
    const topic = topicForExpense(expense);
    const signedAmount = getSignedExpenseAmount(expense);
    result[topic] = (Number(result[topic]) || 0) + signedAmount;
    return result;
  }, {});

  const categoryBudgetDetails = Object.entries(topicBudgetMap)
    .map(([category, budget]) => {
      const spent = topicSpendMap[category] || 0;
      return {
        category,
        budget: Number(budget) || 0,
        spent,
        variance: (Number(budget) || 0) - spent,
      };
    })
    .filter((item) => item.budget > 0 || item.spent > 0)
    .sort((a, b) => a.variance - b.variance);

  // Thresholds (defaults: green < 75%, yellow 75%-90%, orange 90%-100%, red > 100%)
  const thresholds = salaryData.thresholds || { green: 75, yellow: 90, orange: 100 };

  // Calculate essential budget utilization %
  const essentialPercent = essentialBudget > 0
    ? Math.round((essentialActual / essentialBudget) * 100)
    : (essentialActual > 0 ? 100 : 0);

  // Calculate flexible budget utilization %
  let flexiblePercent = 0;
  if (flexibleBudget > 0) {
    flexiblePercent = Math.round((flexibleActual / flexibleBudget) * 100);
  } else if (flexibleActual > 0) {
    // If flexible budget is 0 and user spent money, it is over-budget
    flexiblePercent = 100 + Math.round((flexibleActual / (salary || 1)) * 100);
  }

  // Calculate total expense & outflow utilization against salary
  const totalOutflowPercent = salary > 0
    ? Math.round((totalCashOutflow / salary) * 100)
    : 0;

  // Determine Overall Status tier: 'green' | 'yellow' | 'orange' | 'red'
  let status = 'green';
  const alerts = [];

  // Check 1: Allocations exceeding salary
  const totalCommittedWithLoans = investmentsAllocation + essentialBudget + plannedSavings + loanCommitment;
  const isAllocationOverSalaryWithLoans = totalCommittedWithLoans > salary;

  if (isAllocationOverSalaryWithLoans) {
    status = 'red';
    alerts.push({
      id: 'alloc-exceeded',
      type: 'red',
      title: 'COMMITTED ALLOCATIONS EXCEED SALARY',
      message: `Your planned allocations including loan EMIs (${formatINR(totalCommittedWithLoans)}) exceed your monthly income of ${formatINR(salary)} by ${formatINR(totalCommittedWithLoans - salary)}.`,
    });
  }

  // Check 2: Essential budget overspending
  if (essentialActual > essentialBudget) {
    status = 'red';
    alerts.push({
      id: 'essential-exceeded',
      type: 'red',
      title: 'ESSENTIAL BUDGET EXCEEDED',
      message: `Essential expenses (${formatINR(essentialActual)}) exceeded the ${formatINR(essentialBudget)} budget by ${formatINR(essentialActual - essentialBudget)}.`,
    });
  } else if (essentialPercent >= thresholds.orange) {
    if (status !== 'red') status = 'orange';
    alerts.push({
      id: 'essential-orange',
      type: 'orange',
      title: 'ESSENTIAL BUDGET NEAR CAPACITY',
      message: `Essential expenses have reached ${essentialPercent}% of the budget limit. Only ${formatINR(remainingEssentialBudget)} remains.`,
    });
  } else if (essentialPercent >= thresholds.yellow) {
    if (status === 'green') status = 'yellow';
    alerts.push({
      id: 'essential-yellow',
      type: 'yellow',
      title: 'ESSENTIAL EXPENSES APPROACHING LIMIT',
      message: `Essential expenses are at ${essentialPercent}% of limit (${formatINR(essentialActual)} / ${formatINR(essentialBudget)}).`,
    });
  }

  // Check 3: Flexible budget overspending
  if (flexibleBudget <= 0 && flexibleActual > 0) {
    status = 'red';
    alerts.push({
      id: 'flexible-unbudgeted',
      type: 'red',
      title: 'UNBUDGETED FLEXIBLE SPENDING',
      message: `Your flexible spending budget is ₹0, but you have spent ${formatINR(flexibleActual)}. This reduces your planned savings!`,
    });
  } else if (flexibleBudget > 0) {
    if (flexibleActual > flexibleBudget) {
      status = 'red';
      alerts.push({
        id: 'flexible-exceeded',
        type: 'red',
        title: 'FLEXIBLE BUDGET EXCEEDED',
        message: `Flexible spending (${formatINR(flexibleActual)}) exceeded the ${formatINR(flexibleBudget)} allowance by ${formatINR(flexibleActual - flexibleBudget)}.`,
      });
    } else if (flexiblePercent >= thresholds.orange) {
      if (status !== 'red') status = 'orange';
      alerts.push({
        id: 'flexible-orange',
        type: 'orange',
        title: 'FLEXIBLE BUDGET CRITICAL',
        message: `You have spent ${flexiblePercent}% of your flexible budget. Only ${formatINR(remainingFlexibleBudget)} remains this month.`,
      });
    } else if (flexiblePercent >= thresholds.yellow) {
      if (status === 'green') status = 'yellow';
      alerts.push({
        id: 'flexible-yellow',
        type: 'yellow',
        title: 'FLEXIBLE BUDGET WARNING',
        message: `Flexible spending reached ${flexiblePercent}% of allocation (${formatINR(flexibleActual)} of ${formatINR(flexibleBudget)}).`,
      });
    }
  }

  // Check 4: Category-level budget check
  if (salaryData.categoryBudgets) {
    Object.entries(topicBudgetMap).forEach(([cat, catBudget]) => {
      const spent = topicSpendMap[cat] || 0;
      if (spent > catBudget) {
        alerts.push({
          id: `cat-exceeded-${cat}`,
          type: 'orange',
          title: `${cat.toUpperCase()} BUDGET EXCEEDED`,
          message: `You have spent ${formatINR(spent)} on ${cat}, exceeding your ${formatINR(catBudget)} category budget by ${formatINR(spent - catBudget)}.`,
        });
      }
    });
  }

  // Check 5: Spending Pace Projection
  // Days analysis for current month
  const totalDaysInMonth = getDaysInMonth(monthKey);
  const now = referenceDate;
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  let isCurrentMonth = monthKey === currentMonthKey;
  let dayOfMonth = isCurrentMonth ? now.getDate() : totalDaysInMonth;
  let daysRemaining = Math.max(0, totalDaysInMonth - dayOfMonth);
  let expectedPacePercent = Math.round((dayOfMonth / totalDaysInMonth) * 100);

  // If we are mid-month, check if spending pace is abnormally high
  if (isCurrentMonth && daysRemaining > 3 && flexibleBudget > 0) {
    if (flexiblePercent > expectedPacePercent + 25 && flexiblePercent >= 60) {
      alerts.push({
        id: 'pace-alert',
        type: 'yellow',
        title: 'SPENDING PACE ESTIMATE ALERT',
        message: `You have used ${flexiblePercent}% of your flexible budget on day ${dayOfMonth} of ${totalDaysInMonth} (${daysRemaining} days remain). Estimated projected run-rate may exceed budget if pace continues.`,
      });
    }
  }

  // Check 6: Investment variance
  if (investmentsAllocation > 0 && actualInvestments < investmentsAllocation && isCurrentMonth && dayOfMonth > 15) {
    alerts.push({
      id: 'inv-variance',
      type: 'yellow',
      title: 'INVESTMENT CONTRIBUTION GAP',
      message: `Planned monthly investment is ${formatINR(investmentsAllocation)}, but actual contributed so far is ${formatINR(actualInvestments)}.`,
    });
  }

  return {
    salary,
    openingCashBalance: openingBalance,
    otherIncome,
    totalIncome,
    monthIncome,
    investmentsAllocation,
    essentialBudget,
    plannedSavings,
    loanCommitment,
    actualLoanPayments,
    flexibleBudget,
    totalAllocations,
    unallocatedIncome,
    allocationPercent,
    isAllocationOverSalary: isAllocationOverSalaryWithLoans,
    essentialActual,
    flexibleActual,
    totalExpenses,
    consumptionExpenses,
    loanInterestPaid,
    remainingEssentialBudget,
    remainingFlexibleBudget,
    actualInvestments,
    plannedInvestmentsSum,
    totalInvestedPrincipal,
    currentPortfolioValue,
    unrealizedGainLoss,
    actualSavingsTransfers,
    remainingBankBalance,
    closingCashBalance: remainingBankBalance,
    actualSavings,
    savingsVariance,
    savingsAdjustment,
    savingsRate,
    expenseRatio,
    investmentAllocationRate,
    categoryBudgetDetails,
    totalCashOutflow,
    totalOutflowPercent,
    essentialPercent,
    flexiblePercent,
    status, // 'green' | 'yellow' | 'orange' | 'red'
    alerts,
    categorySpendMap,
    monthKey,
    dayOfMonth,
    totalDaysInMonth,
    daysRemaining,
    monthExpenses,
  };
};

/**
 * Bill payment helper that prevents duplicate expense entries
 * 
 * @param {Object} bill - The bill object to pay
 * @param {Array} existingExpenses - Current expenses list
 * @param {number} paidAmount - Actual amount paid
 * @param {string} paymentDate - Payment date ('YYYY-MM-DD')
 * @returns {{ updatedBill: Object, updatedExpenses: Array }}
 */
export const markBillAsPaidSafe = (bill, existingExpenses, paidAmount, paymentDate) => {
  const actualAmt = Number(paidAmount) || bill.expectedAmount;
  const payDate = paymentDate || new Date().toISOString().split('T')[0];

  // Check if an expense is already linked to this bill
  const existingExpIndex = existingExpenses.findIndex(
    (e) => e.linkedBillId === bill.id || (bill.linkedExpenseId && e.id === bill.linkedExpenseId)
  );

  let updatedExpenses = [...existingExpenses];
  let expenseId;

  if (existingExpIndex >= 0) {
    // Update existing linked expense without duplicating
    expenseId = existingExpenses[existingExpIndex].id;
    updatedExpenses[existingExpIndex] = {
      ...existingExpenses[existingExpIndex],
      name: bill.name,
      amount: actualAmt,
      category: bill.category,
      date: payDate,
      type: 'Essential',
      isRecurring: true,
      linkedBillId: bill.id,
    };
  } else {
    // Create new linked expense
    expenseId = `exp-bill-${bill.id}-${Date.now()}`;
    const newExpense = {
      id: expenseId,
      name: bill.name,
      amount: actualAmt,
      category: bill.category,
      type: 'Essential',
      date: payDate,
      paymentMethod: 'Bank transfer',
      notes: `Recurring bill settlement (${bill.name})`,
      isRecurring: true,
      linkedBillId: bill.id,
    };
    updatedExpenses = [newExpense, ...updatedExpenses];
  }

  const updatedBill = {
    ...bill,
    isPaid: true,
    actualAmountPaid: actualAmt,
    paymentDate: payDate,
    linkedExpenseId: expenseId,
  };

  return { updatedBill, updatedExpenses };
};

/**
 * Mark bill as unpaid helper that removes or unlinks the expense safely
 */
export const markBillAsUnpaidSafe = (bill, existingExpenses) => {
  // Remove the linked expense
  const updatedExpenses = existingExpenses.filter(
    (e) => e.linkedBillId !== bill.id && (!bill.linkedExpenseId || e.id !== bill.linkedExpenseId)
  );

  const updatedBill = {
    ...bill,
    isPaid: false,
    actualAmountPaid: 0,
    paymentDate: null,
    linkedExpenseId: null,
  };

  return { updatedBill, updatedExpenses };
};

/**
 * Export transactions to CSV format
 */
export const exportExpensesToCSV = (expenses) => {
  const headers = ['ID', 'Date', 'Name', 'Merchant', 'Category', 'Type', 'Record Type', 'Amount', 'Currency', 'Payment Method', 'Account', 'Tags', 'Notes', 'Recurring'];
  const rows = expenses.map((e) => [
    `"${e.id}"`,
    `"${e.date || ''}"`,
    `"${(e.name || '').replace(/"/g, '""')}"`,
    `"${(e.merchant || '').replace(/"/g, '""')}"`,
    `"${e.category || ''}"`,
    `"${e.type || ''}"`,
    `"${e.transactionKind || 'expense'}"`,
    e.amount || 0,
    `"${e.currency || '₹'}"`,
    `"${e.paymentMethod || ''}"`,
    `"${e.accountName || ''}"`,
    `"${(e.tags || []).join(', ').replace(/"/g, '""')}"`,
    `"${(e.notes || '').replace(/"/g, '""')}"`,
    e.isRecurring ? 'Yes' : 'No',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  return csvContent;
};

/**
 * Export a readable, chart-ready monthly report. The graph column uses text
 * bars so it remains visible in CSV viewers and can also be charted in Excel.
 */
export const exportMonthlyStatsToCSV = ({ monthKey, metrics = {}, expenses = [], investments = [], savingsTransfers = [], bills = [], loans = [], incomeEntries = [] }) => {
  const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const monthExpenses = expenses.filter((expense) => expense.date?.startsWith(monthKey));
  const monthIncome = incomeEntries.filter((entry) => entry.date?.startsWith(monthKey));
  const monthTransfers = savingsTransfers.filter((transfer) => transfer.date?.startsWith(monthKey));
  const topicMap = {};
  monthExpenses.forEach((expense) => {
    const topic = topicForExpense(expense);
    topicMap[topic] = (topicMap[topic] || 0) + getSignedExpenseAmount(expense);
  });
  const topicRows = Object.entries(topicMap).sort(([, a], [, b]) => b - a);
  const maxTopicSpend = Math.max(...topicRows.map(([, amount]) => amount), 0);
  const graph = (amount) => maxTopicSpend > 0 ? '█'.repeat(Math.max(1, Math.round((amount / maxTopicSpend) * 20))) : '';
  const paidBills = bills.filter((bill) => bill.paidMonths?.[monthKey]);
  const paidLoans = loans.filter((loan) => loan.paidMonths?.[monthKey]);
  const actualInvestments = investments.reduce((sum, investment) => sum + (Number(investment.actualContributions?.[monthKey]) || 0), 0);
  const lines = [];

  lines.push(['MONTHLY FINANCE REPORT', monthKey].map(quote).join(','));
  lines.push([]);
  lines.push(['SUMMARY', 'AMOUNT', 'NOTE'].map(quote).join(','));
  [
    ['Monthly income', metrics.totalIncome, 'Salary plus other income'],
    ['Recurring expenses', metrics.essentialActual, 'Recorded recurring/fixed expenses'],
    ['Monthly expenses', metrics.flexibleActual, 'Recorded non-recurring expenses'],
    ['Investments contributed', actualInvestments, 'One-time and monthly contributions recorded this month'],
    ['Savings transfers', metrics.actualSavingsTransfers ?? monthTransfers.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), 'Transfers into savings accounts'],
    ['Cash left in bank', metrics.remainingBankBalance, 'After expenses, investments, EMIs and savings transfers'],
    ['Savings achieved', metrics.actualSavings, 'Savings transfers plus positive leftover cash'],
    ['Pending recurring bills', bills.filter((bill) => !bill.paidMonths?.[monthKey] && !bill.archived).length, 'Bills still awaiting paid confirmation'],
  ].forEach((row) => lines.push([row[0], row[1], row[2]].map(quote).join(',')));

  lines.push([]);
  lines.push(['TOPIC SPENDING GRAPH', 'USED', 'PERCENT OF EXPENSES', 'GRAPH'].map(quote).join(','));
  topicRows.forEach(([topic, amount]) => lines.push([topic, amount, metrics.consumptionExpenses > 0 ? `${((amount / metrics.consumptionExpenses) * 100).toFixed(1)}%` : '0%', graph(amount)].map(quote).join(',')));

  lines.push([]);
  lines.push(['RECURRING BILLS PAID', 'AMOUNT', 'CATEGORY', 'ACCOUNT'].map(quote).join(','));
  paidBills.forEach((bill) => lines.push([bill.name, bill.paidMonths?.[monthKey]?.amount || bill.expectedAmount || 0, bill.category, bill.paymentAccount].map(quote).join(',')));

  lines.push([]);
  lines.push(['INVESTMENTS', 'MONTHLY CONTRIBUTION', 'ACTUAL THIS MONTH', 'ACCOUNT'].map(quote).join(','));
  investments.forEach((investment) => lines.push([investment.name, investment.monthlyContribution || 0, investment.actualContributions?.[monthKey] || 0, investment.accountName].map(quote).join(',')));

  lines.push([]);
  lines.push(['LOAN EMIS PAID', 'AMOUNT', 'INTEREST', 'PRINCIPAL'].map(quote).join(','));
  paidLoans.forEach((loan) => {
    const payment = loan.paidMonths?.[monthKey] || {};
    lines.push([loan.name, payment.amount || loan.emiAmount || 0, payment.interestPaid || 0, payment.principalPaid || 0].map(quote).join(','));
  });

  lines.push([]);
  lines.push(['EXPENSE DETAIL', 'DATE', 'NAME', 'TOPIC', 'TYPE', 'AMOUNT', 'ACCOUNT', 'MERCHANT', 'TAGS'].map(quote).join(','));
  monthExpenses.forEach((expense) => lines.push([expense.date, expense.name, topicForExpense(expense), expense.type, getSignedExpenseAmount(expense), expense.accountName, expense.merchant, (expense.tags || []).join('; ')].map(quote).join(',')));
  if (monthIncome.length) lines.push(['OTHER INCOME ENTRIES', monthIncome.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0), monthIncome.map((entry) => entry.name).join('; ')].map(quote).join(','));
  return lines.join('\n');
};

// Parse the export format (and compatible CSV files) without silently dropping bad rows.
export const parseExpensesCSV = (csvText, mapping = {}) => {
  const lines = String(csvText || '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { rows: [], errors: ['CSV must include a header and at least one data row.'] };
  const parseLine = (line) => {
    const cells = [];
    let value = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"' && quoted) { value += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { cells.push(value.trim()); value = ''; }
      else value += char;
    }
    cells.push(value.trim());
    return cells;
  };
  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((header) => header.toLowerCase().replace(/[^a-z]/g, ''));
  const indexOf = (...names) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0);
  const mappedIndex = (field, ...aliases) => mapping[field] !== undefined && mapping[field] !== '' && Number.isInteger(Number(mapping[field])) ? Number(mapping[field]) : indexOf(...aliases);
  const required = { date: mappedIndex('date', 'date'), name: mappedIndex('name', 'name', 'description'), amount: mappedIndex('amount', 'amount') };
  const errors = [];
  if (required.date === undefined || required.name === undefined || required.amount === undefined) return { headers: rawHeaders, needsMapping: ['date', 'name', 'amount'].filter((field) => required[field] === undefined), rows: [], errors: ['CSV must contain Date, Name (or Description), and Amount columns, or map those fields before importing.'] };
  const rows = [];
  lines.slice(1).forEach((line, offset) => {
    const values = parseLine(line);
    const rowNumber = offset + 2;
    const date = values[required.date];
    const name = values[required.name];
    const amount = Number(String(values[required.amount] || '').replace(/[₹,\s]/g, ''));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !name || !Number.isFinite(amount) || amount <= 0) {
      errors.push(`Row ${rowNumber}: date must be YYYY-MM-DD, name is required, and amount must be positive.`);
      return;
    }
    const categoryIndex = mappedIndex('category', 'category');
    const merchantIndex = mappedIndex('merchant', 'merchant', 'payee');
    const typeIndex = mappedIndex('type', 'type', 'transactiontype');
    const kindIndex = mappedIndex('transactionKind', 'recordtype', 'transactionkind', 'kind');
    const paymentIndex = mappedIndex('paymentMethod', 'paymentmethod', 'payment');
    const notesIndex = mappedIndex('notes', 'notes', 'note');
    const tagsIndex = mappedIndex('tags', 'tags', 'tag');
    const currencyIndex = mappedIndex('currency', 'currency');
    const accountIndex = mappedIndex('accountName', 'account', 'paymentsource', 'accountname');
    rows.push({
      id: `exp-import-${Date.now()}-${rowNumber}`,
      date,
      name,
      merchant: merchantIndex === undefined ? '' : values[merchantIndex],
      amount,
      category: categoryIndex === undefined ? 'Miscellaneous' : (values[categoryIndex] || 'Miscellaneous'),
      type: typeIndex === undefined || !['Essential', 'Flexible'].includes(values[typeIndex]) ? 'Flexible' : values[typeIndex],
      transactionKind: kindIndex !== undefined && values[kindIndex] === 'refund' ? 'refund' : 'expense',
      paymentMethod: paymentIndex === undefined ? 'Other' : (values[paymentIndex] || 'Other'),
      accountName: accountIndex === undefined ? 'Other Account' : (values[accountIndex] || 'Other Account'),
      notes: notesIndex === undefined ? '' : values[notesIndex],
      tags: tagsIndex === undefined ? [] : String(values[tagsIndex] || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      currency: currencyIndex === undefined ? '₹' : (values[currencyIndex] || '₹'),
      isRecurring: false,
    });
  });
  return { headers: rawHeaders, rows, errors };
};
