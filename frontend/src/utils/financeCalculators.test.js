import { describe, it, expect } from 'vitest';
import {
  formatINR,
  setDefaultCurrency,
  calculateSipFutureValue,
  calculateComprehensiveMetrics,
  markBillAsPaidSafe,
  markBillAsUnpaidSafe,
  exportExpensesToCSV,
  parseExpensesCSV,
  calculateLoanPaymentBreakdown,
  calculateRolloverOpeningBalance,
  calculateAccountBalances,
  buildTransactionLedger,
  exportMonthlyStatsToCSV,
} from './financeCalculators';
import { normalizeTopicBudgets, topicForExpense } from './budgetTopics';
import { DEFAULT_CATEGORY_REGISTRY, getCategoryMeta } from '../data/categoryRegistry';
import { calculateNextDueDate } from './billDates';

describe('Financial Calculators & Metrics Engine', () => {
  it('formats Indian currency correctly with commas', () => {
    expect(formatINR(190000)).toBe('₹1,90,000');
    expect(formatINR(40000)).toBe('₹40,000');
    expect(formatINR(50000)).toBe('₹50,000');
    expect(formatINR(100000)).toBe('₹1,00,000');
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(-5000)).toBe('-₹5,000');
  });

  it('uses the selected user currency for shared amount formatting', () => {
    setDefaultCurrency('$');
    expect(formatINR(12500)).toBe('$12,500');
    setDefaultCurrency('₹');
  });

  it('correctly calculates core allocation model for example ₹1,90,000', () => {
    // Prompt specification:
    // Monthly salary: ₹1,90,000
    // Monthly investments: ₹40,000
    // Essential and recurring expense budget: ₹50,000
    // Planned savings account allocation: ₹1,00,000
    // Flexible Budget = 1,90,000 - 40,000 - 50,000 - 1,00,000 = ₹0
    const salaryData = {
      monthlySalary: 190000,
      investmentsAllocation: 40000,
      essentialBudget: 50000,
      plannedSavings: 100000,
    };

    const metrics = calculateComprehensiveMetrics(salaryData, [], [], [], '2026-10');

    expect(metrics.salary).toBe(190000);
    expect(metrics.investmentsAllocation).toBe(40000);
    expect(metrics.essentialBudget).toBe(50000);
    expect(metrics.plannedSavings).toBe(100000);
    expect(metrics.flexibleBudget).toBe(0);
    expect(metrics.totalAllocations).toBe(190000);
    expect(metrics.unallocatedIncome).toBe(0);
    expect(metrics.allocationPercent).toBe(100);
    expect(metrics.isAllocationOverSalary).toBe(false);
  });

  it('warns when committed allocations exceed salary', () => {
    const salaryData = {
      monthlySalary: 100000,
      investmentsAllocation: 40000,
      essentialBudget: 50000,
      plannedSavings: 30000, // Total 1,20,000 > 1,00,000
    };

    const metrics = calculateComprehensiveMetrics(salaryData, [], [], [], '2026-10');
    expect(metrics.isAllocationOverSalary).toBe(true);
    expect(metrics.status).toBe('red');
    expect(metrics.alerts.some((a) => a.id === 'alloc-exceeded')).toBe(true);
  });

  it('computes essential vs flexible spending accurately for month', () => {
    const salaryData = {
      monthlySalary: 190000,
      investmentsAllocation: 40000,
      essentialBudget: 50000,
      plannedSavings: 90000, // leaves 10,000 flexible budget
    };

    const expenses = [
      // October expenses
      { id: '1', date: '2026-10-05', amount: 25000, type: 'Essential', category: 'Rent' },
      { id: '2', date: '2026-10-10', amount: 5000, type: 'Essential', category: 'Electricity' },
      { id: '3', date: '2026-10-12', amount: 3000, type: 'Flexible', category: 'Dining' },
      // September expense (should be ignored for October)
      { id: '4', date: '2026-09-12', amount: 9999, type: 'Essential', category: 'Rent' },
    ];

    const metrics = calculateComprehensiveMetrics(salaryData, expenses, [], [], '2026-10');

    expect(metrics.flexibleBudget).toBe(10000);
    expect(metrics.essentialActual).toBe(30000);
    expect(metrics.flexibleActual).toBe(3000);
    expect(metrics.totalExpenses).toBe(33000);
    expect(metrics.remainingEssentialBudget).toBe(20000);
    expect(metrics.remainingFlexibleBudget).toBe(7000);
    expect(metrics.status).toBe('green');
  });

  it('resets monthly expense totals while keeping recurring plan, income, investments, and savings ledgers scoped', () => {
    const salaryData = { monthlySalary: 100000, investmentsAllocation: 10000, essentialBudget: 20000, plannedSavings: 30000 };
    const expenses = [{ date: '2026-09-20', amount: 9000, type: 'Flexible', category: 'Shopping' }];
    const investments = [{ monthlyContribution: 10000, actualContributions: { '2026-09': 10000, '2026-10': 10000 } }];
    const savingsTransfers = [{ date: '2026-09-25', amount: 20000 }, { date: '2026-10-25', amount: 30000 }];
    const october = calculateComprehensiveMetrics(salaryData, expenses, investments, savingsTransfers, '2026-10');

    expect(october.totalIncome).toBe(100000);
    expect(october.consumptionExpenses).toBe(0);
    expect(october.actualInvestments).toBe(10000);
    expect(october.actualSavingsTransfers).toBe(30000);
  });

  it('triggers red overbudget alert if flexible budget is 0 and user spends money', () => {
    const salaryData = {
      monthlySalary: 190000,
      investmentsAllocation: 40000,
      essentialBudget: 50000,
      plannedSavings: 100000, // Flexible budget is 0
    };

    const expenses = [
      { id: '1', date: '2026-10-12', amount: 1500, type: 'Flexible', category: 'Clothes' },
    ];

    const metrics = calculateComprehensiveMetrics(salaryData, expenses, [], [], '2026-10');
    expect(metrics.flexibleBudget).toBe(0);
    expect(metrics.flexibleActual).toBe(1500);
    expect(metrics.status).toBe('red');
    expect(metrics.alerts.some((a) => a.id === 'flexible-unbudgeted')).toBe(true);
  });

  it('prevents duplicate expense entries when repeatedly marking bill as paid', () => {
    const bill = {
      id: 'bill-1',
      name: 'Internet Fiber',
      expectedAmount: 999,
      category: 'Internet',
    };

    let expenses = [];

    // First click: mark as paid
    const step1 = markBillAsPaidSafe(bill, expenses, 999, '2026-10-10');
    expect(step1.updatedExpenses.length).toBe(1);
    expect(step1.updatedBill.isPaid).toBe(true);
    expect(step1.updatedBill.linkedExpenseId).toBe(step1.updatedExpenses[0].id);

    // Second click with same bill: MUST NOT CREATE DUPLICATE
    const step2 = markBillAsPaidSafe(step1.updatedBill, step1.updatedExpenses, 999, '2026-10-10');
    expect(step2.updatedExpenses.length).toBe(1); // Still 1!
    expect(step2.updatedExpenses[0].id).toBe(step1.updatedExpenses[0].id);

    // Mark as unpaid
    const step3 = markBillAsUnpaidSafe(step2.updatedBill, step2.updatedExpenses);
    expect(step3.updatedExpenses.length).toBe(0);
    expect(step3.updatedBill.isPaid).toBe(false);
  });

  it('accurately calculates compound SIP future value', () => {
    // 5000/mo at 12% p.a. for 5 years
    // Formula check
    const result = calculateSipFutureValue(5000, 12, 5);
    expect(result.totalDeposited).toBe(300000);
    // At 12% annual (1% monthly), 5000 monthly for 60 months compounds to approx ₹4,12,432
    expect(result.futureValue).toBeGreaterThan(400000);
    expect(result.futureValue).toBeLessThan(430000);
    expect(result.returnsGain).toBe(result.futureValue - 300000);
  });

  it('splits a loan EMI into interest and principal and reduces balance', () => {
    const result = calculateLoanPaymentBreakdown(100000, 5000, 12);
    expect(result.interestPaid).toBe(1000);
    expect(result.principalPaid).toBe(4000);
    expect(result.balanceAfter).toBe(96000);
  });

  it('keeps the loan balance-before value reversible for an EMI record', () => {
    const before = 100000;
    const breakdown = calculateLoanPaymentBreakdown(before, 5000, 12);
    expect({ balanceBefore: before, ...breakdown }).toMatchObject({ balanceBefore: 100000, principalPaid: 4000, balanceAfter: 96000 });
  });

  it('counts loan interest as expense but does not double-count principal in cash outflow', () => {
    const metrics = calculateComprehensiveMetrics(
      { monthlySalary: 10000 }, [], [], [], '2026-10', undefined, [{
        id: 'loan-1', status: 'Active', emiAmount: 5000, outstandingPrincipal: 100000,
        interestRate: 12, paidMonths: { '2026-10': { interestPaid: 1000, principalPaid: 4000, balanceAfter: 96000 } },
      }]
    );
    expect(metrics.consumptionExpenses).toBe(0);
    expect(metrics.loanInterestPaid).toBe(1000);
    expect(metrics.totalExpenses).toBe(1000);
    expect(metrics.totalCashOutflow).toBe(5000);
    expect(metrics.remainingBankBalance).toBe(5000);
  });

  it('uses the actual recorded EMI amount when it differs from the scheduled EMI', () => {
    const metrics = calculateComprehensiveMetrics(
      { monthlySalary: 10000 }, [], [], [], '2026-10', undefined, [{
        status: 'Active', emiAmount: 5000, paidMonths: { '2026-10': { amount: 4500, interestPaid: 1000, principalPaid: 3500 } },
      }]
    );
    expect(metrics.totalCashOutflow).toBe(4500);
    expect(metrics.remainingBankBalance).toBe(5500);
  });

  it('exports expenses cleanly to CSV', () => {
    const expenses = [
      {
        id: '1',
        date: '2026-10-01',
        name: 'House Rent',
        category: 'Rent',
        type: 'Essential',
        amount: 25000,
        paymentMethod: 'Bank transfer',
        notes: 'Rent',
        isRecurring: true,
      },
    ];

    const csv = exportExpensesToCSV(expenses);
    expect(csv).toContain('ID,Date,Name,Merchant,Category,Type,Record Type,Amount,Currency,Payment Method,Account,Tags,Notes,Recurring');
    expect(csv).toContain('"House Rent"');
    expect(csv).toContain('25000');
  });

  it('exports a systematic monthly report with topic graph data', () => {
    const csv = exportMonthlyStatsToCSV({
      monthKey: '2026-10',
      metrics: { totalIncome: 100000, essentialActual: 20000, flexibleActual: 5000, actualInvestments: 10000, actualSavingsTransfers: 30000, remainingBankBalance: 35000, actualSavings: 65000, consumptionExpenses: 25000 },
      expenses: [{ date: '2026-10-02', name: 'Rent', category: 'Rent', type: 'Essential', amount: 20000 }],
      investments: [{ name: 'Google', monthlyContribution: 10000, actualContributions: { '2026-10': 10000 } }],
      savingsTransfers: [],
      bills: [],
      loans: [],
    });
    expect(csv).toContain('MONTHLY FINANCE REPORT');
    expect(csv).toContain('TOPIC SPENDING GRAPH');
    expect(csv).toContain('Flat');
    expect(csv).toContain('EXPENSE DETAIL');
  });

  it('previews valid CSV rows and reports malformed rows instead of skipping them', () => {
    const csv = 'Date,Name,Category,Type,Amount,Notes\n2026-10-01,"Cafe, lunch",Restaurants and dining,Flexible,"₹1,250",Paid by UPI\nnot-a-date,Missing amount,Other,Flexible,0,Bad row';
    const result = parseExpensesCSV(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('Cafe, lunch');
    expect(result.rows[0].amount).toBe(1250);
    expect(result.errors).toHaveLength(1);
  });

  it('supports explicit CSV column mapping for non-standard exports', () => {
    const csv = 'When,What,Value\n2026-10-03,Taxi,450';
    const preview = parseExpensesCSV(csv);
    expect(preview.needsMapping).toEqual(['date', 'name', 'amount']);
    const mapped = parseExpensesCSV(csv, { date: 0, name: 1, amount: 2 });
    expect(mapped.errors).toHaveLength(0);
    expect(mapped.rows[0]).toMatchObject({ date: '2026-10-03', name: 'Taxi', amount: 450 });
  });

  it('keeps dashboard budget topics consistent with transaction categories', () => {
    expect(topicForExpense({ category: 'Electricity' })).toBe('Recharge and Bill Payments');
    expect(topicForExpense({ category: 'Restaurants and dining' })).toBe('Foods and Drinks');
    expect(topicForExpense({ category: 'Rent' })).toBe('Flat');
    expect(normalizeTopicBudgets({ Electricity: 2990, Rent: 15000, Groceries: 10000, 'Restaurants and dining': 5000 }))
      .toEqual({
        'Recharge and Bill Payments': 2990,
        Flat: 15000,
        'Foods and Drinks': 15000,
      });
  });

  it('uses one category registry for recurring and discretionary expense forms', () => {
    expect(DEFAULT_CATEGORY_REGISTRY.some((category) => category.name === 'Electricity')).toBe(true);
    expect(DEFAULT_CATEGORY_REGISTRY.some((category) => category.name === 'Groceries')).toBe(true);
    expect(getCategoryMeta('Electricity').type).toBe('Essential');
    expect(getCategoryMeta('Restaurants and dining').type).toBe('Flexible');
    expect(new Set(DEFAULT_CATEGORY_REGISTRY.map((category) => category.name)).size).toBe(DEFAULT_CATEGORY_REGISTRY.length);
  });

  it('handles zero-income metrics without invalid percentages', () => {
    const metrics = calculateComprehensiveMetrics({ monthlySalary: 0 }, [], [], [], '2026-10');
    expect(metrics.salary).toBe(0);
    expect(metrics.allocationPercent).toBe(0);
    expect(metrics.flexiblePercent).toBe(0);
    expect(metrics.savingsRate).toBe(0);
  });

  it('treats refunds as reductions instead of double-counting them as expenses', () => {
    const metrics = calculateComprehensiveMetrics(
      { monthlySalary: 10000, essentialBudget: 6000, plannedSavings: 0 },
      [
        { date: '2026-10-01', amount: 2000, type: 'Flexible', category: 'Shopping', transactionKind: 'expense' },
        { date: '2026-10-05', amount: 500, type: 'Flexible', category: 'Shopping', transactionKind: 'refund' },
      ], [], [], '2026-10'
    );
    expect(metrics.totalExpenses).toBe(1500);
    expect(metrics.categorySpendMap.Shopping).toBe(1500);
    expect(metrics.remainingBankBalance).toBe(8500);
  });

  it('adds selected-month income ledger entries to cash flow without changing salary allocations', () => {
    const salaryData = { monthlySalary: 100000, essentialBudget: 30000, plannedSavings: 20000 };
    const incomeEntries = [
      { name: 'Freelance', amount: 15000, date: '2026-10-12' },
      { name: 'Old bonus', amount: 9000, date: '2026-09-12' },
    ];
    const metrics = calculateComprehensiveMetrics(salaryData, [], [], [], '2026-10', undefined, [], incomeEntries);
    expect(metrics.salary).toBe(100000);
    expect(metrics.otherIncome).toBe(15000);
    expect(metrics.totalIncome).toBe(115000);
    expect(metrics.flexibleBudget).toBe(50000);
    expect(metrics.remainingBankBalance).toBe(115000);
  });

  it('rolls an opening cash balance into the calculated closing balance', () => {
    const metrics = calculateComprehensiveMetrics({ monthlySalary: 50000 }, [{ date: '2026-10-02', amount: 5000, type: 'Flexible', category: 'Shopping' }], [], [], '2026-10', undefined, [], [], 12000);
    expect(metrics.openingCashBalance).toBe(12000);
    expect(metrics.closingCashBalance).toBe(57000);
    expect(metrics.remainingBankBalance).toBe(57000);
  });

  it('rolls a manual opening balance into later months using actual prior-month activity', () => {
    const opening = calculateRolloverOpeningBalance({
      monthKey: '2026-12',
      cashBalances: [{ monthKey: '2026-10', openingBalance: 10000 }],
      salaryData: { monthlySalary: 5000 },
      expenses: [
        { date: '2026-10-05', amount: 1000, type: 'Flexible', category: 'Food' },
        { date: '2026-11-05', amount: 500, type: 'Flexible', category: 'Food' },
      ],
    });
    expect(opening).toBe(18500);
  });

  it('calculates recurring bill dates without skipping month-end renewals', () => {
    expect(calculateNextDueDate('2026-01-31', 'Monthly')).toBe('2026-02-28');
    expect(calculateNextDueDate('2028-01-31', 'Monthly')).toBe('2028-02-29');
    expect(calculateNextDueDate('2026-10-21', 'Quarterly')).toBe('2027-01-21');
    expect(calculateNextDueDate('2026-10-21', 'Weekly')).toBe('2026-10-28');
  });

  it('derives individual account balances without double-counting card purchases', () => {
    const balances = calculateAccountBalances({
      accounts: [
        { id: 'bank', name: 'Bank', accountType: 'Bank Account', openingBalance: 10000 },
        { id: 'card', name: 'Card', accountType: 'Credit Card', openingBalance: 0 },
      ],
      incomeEntries: [{ accountName: 'Bank', amount: 2000 }],
      expenses: [
        { accountName: 'Bank', amount: 1000, transactionKind: 'expense' },
        { accountName: 'Card', amount: 500, transactionKind: 'expense' },
        { accountName: 'Bank', amount: 200, transactionKind: 'refund' },
      ],
      cards: [{ name: 'Card', payments: [{ accountName: 'Bank', amount: 300 }] }],
    });
    expect(balances.find((account) => account.name === 'Bank').calculatedBalance).toBe(10900);
    expect(balances.find((account) => account.name === 'Card').calculatedBalance).toBe(0);
  });

  it('builds one chronological ledger without turning transfers into income', () => {
    const ledger = buildTransactionLedger({
      expenses: [{ id: 'e1', date: '2026-10-05', name: 'Groceries', amount: 500, category: 'Groceries' }],
      incomeEntries: [{ id: 'i1', date: '2026-10-02', name: 'Salary', amount: 5000, category: 'Salary' }],
      savingsTransfers: [{ id: 't1', date: '2026-10-03', amount: 1000, sourceAccount: 'Bank', destinationAccount: 'Savings' }],
    });
    expect(ledger.map((item) => item.type)).toEqual(['Expense', 'Transfer', 'Income']);
    expect(ledger.find((item) => item.type === 'Transfer').cashEffect).toBe(-1000);
  });
});
