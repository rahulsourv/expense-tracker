import { Router } from 'express';
import pool, { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { toDateString } from '../utils/date.js';

const router = Router();
router.use(authenticate);

/**
 * GET /api/data/all
 * Fetch all user data in one shot (for initial app load)
 */
router.get('/all', async (req, res) => {
  try {
    const [salaryResult, expensesResult, incomeResult, billsResult, investmentsResult, transfersResult, goalsResult, loansResult, categoriesResult, cardsResult, cardPaymentsResult, accountsResult, cashBalancesResult] =
      await Promise.all([
        query('SELECT * FROM salary_data WHERE user_id = $1', [req.userId]),
        query('SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC, created_at DESC', [req.userId]),
        query('SELECT * FROM income_entries WHERE user_id = $1 ORDER BY date DESC, created_at DESC', [req.userId]),
        query('SELECT * FROM bills WHERE user_id = $1 AND COALESCE(archived, FALSE) = FALSE ORDER BY due_date ASC', [req.userId]),
        query('SELECT * FROM investments WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]),
        query('SELECT * FROM savings_transfers WHERE user_id = $1 ORDER BY date DESC, created_at DESC', [req.userId]),
        query('SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY status ASC, target_date ASC NULLS LAST, created_at DESC', [req.userId]),
        query('SELECT * FROM loans WHERE user_id = $1 ORDER BY status ASC, due_day ASC, created_at DESC', [req.userId]),
        query('SELECT * FROM custom_categories WHERE user_id = $1 ORDER BY name ASC', [req.userId]),
        query('SELECT * FROM cards WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]),
        query('SELECT * FROM card_payments WHERE user_id = $1 ORDER BY date DESC, created_at DESC', [req.userId]),
        query('SELECT * FROM accounts WHERE user_id = $1 ORDER BY is_active DESC, name ASC', [req.userId]),
        query('SELECT * FROM cash_balances WHERE user_id = $1 ORDER BY month_key DESC', [req.userId]),
      ]);

    // Format salary data
    const salaryRow = salaryResult.rows[0];
    const salaryData = salaryRow
      ? {
          monthlySalary: Number(salaryRow.monthly_salary) || 0,
          investmentsAllocation: Number(salaryRow.investments_allocation) || 0,
          essentialBudget: Number(salaryRow.essential_budget) || 0,
          plannedSavings: Number(salaryRow.planned_savings) || 0,
          thresholds: salaryRow.thresholds || { green: 75, yellow: 90, orange: 100 },
          categoryBudgets: salaryRow.category_budgets || {},
          currency: salaryRow.currency || '₹',
        }
      : {
          monthlySalary: 0,
          investmentsAllocation: 0,
          essentialBudget: 0,
          plannedSavings: 0,
          thresholds: { green: 75, yellow: 90, orange: 100 },
          categoryBudgets: {},
          currency: '₹',
        };

    // Format expenses
    const expenses = expensesResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      amount: Number(row.amount) || 0,
      category: row.category,
      type: row.type,
      transactionKind: row.transaction_kind || 'expense',
      date: toDateString(row.date),
      paymentMethod: row.payment_method,
      accountName: row.account_name,
      receiptReference: row.receipt_reference,
      notes: row.notes,
      payments: cardPaymentsResult.rows.filter((payment) => payment.card_id === row.id).map((payment) => ({ id: payment.id, date: toDateString(payment.date), amount: Number(payment.amount) || 0, paymentMethod: payment.payment_method, accountName: payment.account_name, notes: payment.notes })),
      startDate: toDateString(row.start_date),
      renewDate: toDateString(row.renew_date),
      paidMonths: row.paid_months || {},
      archived: row.archived || false,
      isRecurring: row.is_recurring,
      linkedBillId: row.linked_bill_id,
      cardId: row.card_id,
      merchant: row.merchant || '',
      tags: Array.isArray(row.tags) ? row.tags : [],
      currency: row.currency || '₹',
    }));

    // Format bills
    const incomeEntries = incomeResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      amount: Number(row.amount) || 0,
      category: row.category,
      date: toDateString(row.date),
      paymentMethod: row.payment_method,
      notes: row.notes,
    }));

    // Format bills
    const bills = billsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      expectedAmount: Number(row.expected_amount) || 0,
      category: row.category,
      dueDate: toDateString(row.due_date),
      frequency: row.frequency,
      isPaid: row.is_paid,
      actualAmountPaid: Number(row.actual_amount_paid) || 0,
      paymentDate: toDateString(row.payment_date),
      linkedExpenseId: row.linked_expense_id,
      notes: row.notes,
      startDate: toDateString(row.start_date),
      renewDate: toDateString(row.renew_date),
      paidMonths: row.paid_months || {},
      archived: row.archived || false,
      amountType: row.amount_type || 'fixed',
      paymentAccount: row.payment_account || '',
      reminderDays: Number(row.reminder_days) || 3,
      endDate: toDateString(row.end_date),
    }));

    // Format investments
    const investments = investmentsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      quantity: Number(row.quantity) || 0,
      monthlyContribution: Number(row.monthly_contribution) || 0,
      actualContributions: row.actual_contributions || {},
      totalInvested: Number(row.total_invested) || 0,
      currentValue: Number(row.current_value) || 0,
      startDate: toDateString(row.start_date),
      expectedRoi: Number(row.expected_roi) || 0,
      tenureYears: Number(row.tenure_years) || 1,
      notes: row.notes,
    }));

    // Format transfers
    const savingsTransfers = transfersResult.rows.map((row) => ({
      id: row.id,
      date: toDateString(row.date),
      amount: Number(row.amount) || 0,
      sourceAccount: row.source_account,
      destinationAccount: row.destination_account,
      notes: row.notes,
    }));

    const loans = loansResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      loanType: row.loan_type,
      principalAmount: Number(row.principal_amount) || 0,
      outstandingPrincipal: Number(row.outstanding_principal) || 0,
      interestRate: Number(row.interest_rate) || 0,
      tenureMonths: Number(row.tenure_months) || 0,
      emiAmount: Number(row.emi_amount) || 0,
      dueDay: Number(row.due_day) || 5,
      startDate: toDateString(row.start_date),
      status: row.status || 'Active',
      paidMonths: row.paid_months || {},
      notes: row.notes,
    }));

    const goalTransactionsResult = await query('SELECT * FROM savings_goal_transactions WHERE user_id = $1 ORDER BY date DESC, created_at DESC', [req.userId]);
    const savingsGoals = goalsResult.rows.map((row) => {
      const target = Number(row.target_amount) || 0;
      const current = Number(row.current_amount) || 0;
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        targetAmount: target,
        currentAmount: current,
        targetDate: toDateString(row.target_date),
        status: row.status || 'Active',
        notes: row.notes,
        progressPercent: target > 0 ? Math.min(100, (current / target) * 100) : 0,
        transactions: goalTransactionsResult.rows.filter((tx) => tx.goal_id === row.id).map((tx) => ({ id: tx.id, date: toDateString(tx.date), amount: Number(tx.amount) || 0, transactionType: tx.transaction_type, notes: tx.notes })),
      };
    });

    // Custom categories
    const customCategoryDetails = categoriesResult.rows.map((r) => ({ id: r.id, name: r.name, parentCategory: r.parent_category || 'Custom', transactionType: r.transaction_type || 'expense', icon: r.icon || 'Tag', color: r.color || 'yellow', monthlyBudget: Number(r.monthly_budget) || 0, description: r.description || '', active: r.active !== false }));
    const customCategories = customCategoryDetails.filter((r) => r.active !== false).map((r) => r.name);
    const cards = cardsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      bankName: row.bank_name,
      cardType: row.card_type,
      lastFour: row.last_four,
      billingDay: row.billing_day,
      dueDay: row.due_day,
      creditLimit: Number(row.credit_limit) || 0,
      outstandingAmount: Number(row.outstanding_amount) || 0,
      color: row.color || 'yellow',
      notes: row.notes,
    }));
    const accounts = accountsResult.rows.map((row) => ({ id: row.id, name: row.name, accountType: row.account_type, openingBalance: Number(row.opening_balance) || 0, isActive: row.is_active !== false, notes: row.notes }));
    const cashBalances = cashBalancesResult.rows.map((row) => ({ id: row.id, monthKey: row.month_key, openingBalance: Number(row.opening_balance) || 0, notes: row.notes }));

    res.json({
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
    });
  } catch (error) {
    console.error('Get all data error:', error);
    res.status(500).json({ error: 'Failed to fetch all data.' });
  }
});

/**
 * POST /api/data/import
 * Full data import/restore - replaces all user data
 */
router.post('/import', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const query = (...args) => client.query(...args);
    const { salaryData, expenses, incomeEntries, bills, investments, savingsTransfers, savingsGoals, loans, customCategories, customCategoryDetails, cards, accounts, cashBalances, settings } = req.body;

    // Update salary data
    if (salaryData) {
      await query(
        `UPDATE salary_data SET
          monthly_salary = $2,
          investments_allocation = $3,
          essential_budget = $4,
          planned_savings = $5,
          thresholds = $6,
          category_budgets = $7,
          currency = $8,
          updated_at = NOW()
         WHERE user_id = $1`,
        [
          req.userId,
          salaryData.monthlySalary || 0,
          salaryData.investmentsAllocation || 0,
          salaryData.essentialBudget || 0,
          salaryData.plannedSavings || 0,
          JSON.stringify(salaryData.thresholds || { green: 75, yellow: 90, orange: 100 }),
          JSON.stringify(salaryData.categoryBudgets || {}),
          salaryData.currency || '₹',
        ]
      );
    }

    // Replace expenses
    if (Array.isArray(expenses)) {
      await query('DELETE FROM expenses WHERE user_id = $1', [req.userId]);
      for (const exp of expenses) {
        await query(
          `INSERT INTO expenses (id, user_id, name, amount, category, type, transaction_kind, date, payment_method, account_name, receipt_reference, notes, is_recurring, linked_bill_id, card_id, merchant, tags, currency)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
          [exp.id, req.userId, exp.name, exp.amount, exp.category, exp.type, ['expense', 'refund'].includes(exp.transactionKind) ? exp.transactionKind : 'expense', exp.date, exp.paymentMethod, exp.accountName, exp.receiptReference, exp.notes, exp.isRecurring || false, exp.linkedBillId, exp.cardId, exp.merchant || null, JSON.stringify(Array.isArray(exp.tags) ? exp.tags : []), exp.currency || '₹']
        );
      }
    }

    // Replace bills
    if (Array.isArray(incomeEntries)) {
      await query('DELETE FROM income_entries WHERE user_id = $1', [req.userId]);
      for (const income of incomeEntries) {
        await query(
          `INSERT INTO income_entries (id, user_id, name, amount, category, date, payment_method, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [income.id, req.userId, income.name, income.amount, income.category || 'Other Income', income.date, income.paymentMethod, income.notes]
        );
      }
    }

    // Replace bills
    if (Array.isArray(bills)) {
      await query('DELETE FROM bills WHERE user_id = $1', [req.userId]);
      for (const bill of bills) {
        await query(
          `INSERT INTO bills (id, user_id, name, expected_amount, category, due_date, frequency, is_paid, actual_amount_paid, payment_date, linked_expense_id, notes, start_date, renew_date, paid_months, archived, amount_type, payment_account, reminder_days, end_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
          [bill.id, req.userId, bill.name, bill.expectedAmount, bill.category, bill.dueDate, bill.frequency, bill.isPaid || false, bill.actualAmountPaid || 0, bill.paymentDate, bill.linkedExpenseId, bill.notes, bill.startDate || bill.dueDate, bill.renewDate || bill.dueDate, JSON.stringify(bill.paidMonths || {}), bill.archived || false, bill.amountType === 'variable' ? 'variable' : 'fixed', bill.paymentAccount || null, Math.max(0, Number(bill.reminderDays) || 3), bill.endDate || null]
        );
      }
    }

    if (Array.isArray(savingsGoals)) {
      await query('DELETE FROM savings_goals WHERE user_id = $1', [req.userId]);
      for (const goal of savingsGoals) {
        await query('INSERT INTO savings_goals (id,user_id,name,category,target_amount,current_amount,target_date,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [goal.id, req.userId, goal.name, goal.category || 'Custom Savings Goal', goal.targetAmount || 0, goal.currentAmount || 0, goal.targetDate, goal.status || 'Active', goal.notes]);
        for (const tx of (goal.transactions || [])) {
          await query('INSERT INTO savings_goal_transactions (id,user_id,goal_id,date,amount,transaction_type,notes) VALUES ($1,$2,$3,$4,$5,$6,$7)', [tx.id, req.userId, goal.id, tx.date, tx.amount, tx.transactionType, tx.notes]);
        }
      }
    }

    // Replace investments
    if (Array.isArray(investments)) {
      await query('DELETE FROM investments WHERE user_id = $1', [req.userId]);
      for (const inv of investments) {
        await query(
          `INSERT INTO investments (id, user_id, name, type, quantity, monthly_contribution, actual_contributions, total_invested, current_value, start_date, expected_roi, tenure_years, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [inv.id, req.userId, inv.name, inv.type, inv.quantity || 0, inv.monthlyContribution || 0, JSON.stringify(inv.actualContributions || {}), inv.totalInvested || 0, inv.currentValue || 0, inv.startDate, inv.expectedRoi || 0, inv.tenureYears || 1, inv.notes]
        );
      }
    }

    // Replace savings transfers
    if (Array.isArray(savingsTransfers)) {
      await query('DELETE FROM savings_transfers WHERE user_id = $1', [req.userId]);
      for (const t of savingsTransfers) {
        await query(
          `INSERT INTO savings_transfers (id, user_id, date, amount, source_account, destination_account, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [t.id, req.userId, t.date, t.amount, t.sourceAccount, t.destinationAccount, t.notes]
        );
      }
    }

    if (Array.isArray(loans)) {
      await query('DELETE FROM loans WHERE user_id = $1', [req.userId]);
      for (const loan of loans) {
        await query(
          `INSERT INTO loans (id, user_id, name, loan_type, principal_amount, outstanding_principal, interest_rate, tenure_months, emi_amount, due_day, start_date, status, paid_months, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [loan.id, req.userId, loan.name, loan.loanType, loan.principalAmount || 0, loan.outstandingPrincipal || 0, loan.interestRate || 0, loan.tenureMonths || 0, loan.emiAmount || 0, loan.dueDay || 5, loan.startDate, loan.status || 'Active', JSON.stringify(loan.paidMonths || {}), loan.notes]
        );
      }
    }

    // Replace custom categories
    if (Array.isArray(customCategories)) {
      await query('DELETE FROM custom_categories WHERE user_id = $1', [req.userId]);
      const detailsByName = new Map((Array.isArray(customCategoryDetails) ? customCategoryDetails : []).map((category) => [category.name, category]));
      const categoryNames = [...new Set([...(customCategories || []), ...detailsByName.keys()])];
      for (const name of categoryNames) {
        const category = detailsByName.get(name) || {};
        await query(
          `INSERT INTO custom_categories (user_id, name, parent_category, transaction_type, icon, color, monthly_budget, description, active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (user_id, name) DO NOTHING`,
          [req.userId, name, category.parentCategory || 'Custom', category.transactionType === 'income' ? 'income' : 'expense', category.icon || 'Tag', category.color || 'yellow', Math.max(0, Number(category.monthlyBudget) || 0), category.description || null, category.active !== false]
        );
      }
    }

    if (Array.isArray(cards)) {
      await query('DELETE FROM cards WHERE user_id = $1', [req.userId]);
      for (const card of cards) {
        await query(
          `INSERT INTO cards (id, user_id, name, bank_name, card_type, last_four, card_number, expiry_date, cvv, billing_day, due_day, credit_limit, outstanding_amount, color, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [card.id, req.userId, card.name, card.bankName, card.cardType || 'Credit', String(card.lastFour || '').slice(-4), card.cardNumber || null, card.expiryDate || null, card.cvv || null, card.billingDay || null, card.dueDay || null, card.creditLimit || 0, card.outstandingAmount || 0, card.color || 'yellow', card.notes]
        );
        for (const payment of (card.payments || [])) {
          await query('INSERT INTO card_payments (id,user_id,card_id,date,amount,payment_method,account_name,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [payment.id, req.userId, card.id, payment.date, payment.amount, payment.paymentMethod, payment.accountName, payment.notes]);
        }
      }
    }

    if (Array.isArray(accounts)) {
      await query('DELETE FROM accounts WHERE user_id = $1', [req.userId]);
      for (const account of accounts) {
        await query('INSERT INTO accounts (id,user_id,name,account_type,opening_balance,is_active,notes) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (user_id,name) DO UPDATE SET account_type=EXCLUDED.account_type, opening_balance=EXCLUDED.opening_balance, is_active=EXCLUDED.is_active, notes=EXCLUDED.notes', [account.id, req.userId, account.name, account.accountType || 'Other Account', account.openingBalance || 0, account.isActive !== false, account.notes]);
      }
    }

    if (Array.isArray(cashBalances)) {
      await query('DELETE FROM cash_balances WHERE user_id = $1', [req.userId]);
      for (const balance of cashBalances) {
        await query('INSERT INTO cash_balances (user_id,month_key,opening_balance,notes) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id,month_key) DO UPDATE SET opening_balance=EXCLUDED.opening_balance, notes=EXCLUDED.notes', [req.userId, balance.monthKey, Number(balance.openingBalance) || 0, balance.notes]);
      }
    }

    if (settings) {
      await query('INSERT INTO user_settings (user_id,currency,date_format,month_start_day,notifications_enabled,theme,budget_warning_threshold) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (user_id) DO UPDATE SET currency=EXCLUDED.currency, date_format=EXCLUDED.date_format, month_start_day=EXCLUDED.month_start_day, notifications_enabled=EXCLUDED.notifications_enabled, theme=EXCLUDED.theme, budget_warning_threshold=EXCLUDED.budget_warning_threshold, updated_at=NOW()', [req.userId, settings.currency || '₹', settings.dateFormat || 'YYYY-MM-DD', settings.monthStartDay || 1, settings.notificationsEnabled !== false, settings.theme || 'neo-brutalist', Number(settings.budgetWarningThreshold) || 80]);
    }

    await client.query('COMMIT');
    res.json({ message: 'All data imported successfully.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Import data error:', error);
    res.status(500).json({ error: 'Failed to import data.' });
  } finally { client?.release(); }
});

/**
 * POST /api/data/reset
 * Reset all user data (clean slate or demo)
 */
router.post('/reset', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const query = (...args) => client.query(...args);
    const { mode } = req.body; // 'clean' or 'demo'

    // Delete all user data
    await Promise.all([
      query('DELETE FROM expenses WHERE user_id = $1', [req.userId]),
      query('DELETE FROM income_entries WHERE user_id = $1', [req.userId]),
      query('DELETE FROM bills WHERE user_id = $1', [req.userId]),
      query('DELETE FROM investments WHERE user_id = $1', [req.userId]),
      query('DELETE FROM savings_transfers WHERE user_id = $1', [req.userId]),
      query('DELETE FROM savings_goals WHERE user_id = $1', [req.userId]),
      query('DELETE FROM loans WHERE user_id = $1', [req.userId]),
      query('DELETE FROM custom_categories WHERE user_id = $1', [req.userId]),
      query('DELETE FROM cards WHERE user_id = $1', [req.userId]),
      query('DELETE FROM accounts WHERE user_id = $1', [req.userId]),
      query('DELETE FROM cash_balances WHERE user_id = $1', [req.userId]),
      query('DELETE FROM user_settings WHERE user_id = $1', [req.userId]),
    ]);

    // Reset salary to defaults
    await query(
      `UPDATE salary_data SET
        monthly_salary = 0, investments_allocation = 0, essential_budget = 0,
        planned_savings = 0, thresholds = '{"green": 75, "yellow": 90, "orange": 100}',
        category_budgets = '{}', currency = '₹', updated_at = NOW()
       WHERE user_id = $1`,
      [req.userId]
    );

    await client.query('COMMIT');
    res.json({ message: mode === 'demo' ? 'Data reset. Load demo data from frontend.' : 'Account reset to fresh state.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Reset data error:', error);
    res.status(500).json({ error: 'Failed to reset data.' });
  } finally { client?.release(); }
});

export default router;
