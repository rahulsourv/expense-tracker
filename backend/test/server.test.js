import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool, { query } from '../db/pool.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret';

after(async () => { await pool.end(); });

const { default: app } = await import('../server.js');

const request = (method, path, body, token) => new Promise((resolve, reject) => {
  const server = http.createServer(app);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    const req = http.request({ method, hostname: '127.0.0.1', port, path, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => { server.close(); resolve({ status: res.statusCode, body: JSON.parse(responseBody) }); });
    });
    req.on('error', (error) => { server.close(); reject(error); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
});

test('protects financial routes when authentication is missing', async () => {
  for (const path of ['/api/expenses', '/api/accounts', '/api/cash-balances', '/api/settings', '/api/data/all']) {
    const response = await request('GET', path);
    assert.equal(response.status, 401, path);
    assert.equal(response.body.error, 'Access denied. No token provided.');
  }
});

test('returns a JSON 404 for unknown API routes', async () => {
  const response = await request('GET', '/api/does-not-exist');
  assert.equal(response.status, 404);
  assert.match(response.body.error, /Route GET \/api\/does-not-exist not found/);
});

test('supports isolated expense CRUD, category rename, and idempotent bill payment', async (t) => {
  const email = `codex-test-${Date.now()}@example.invalid`;
  const passwordHash = await bcrypt.hash('test-only-password', 4);
  const userResult = await query('INSERT INTO users (email,password_hash,display_name) VALUES ($1,$2,$3) RETURNING id', [email, passwordHash, 'Integration Test User']);
  const userId = userResult.rows[0].id;
  const token = jwt.sign({ userId, email }, process.env.JWT_SECRET);
  t.after(async () => { await query('DELETE FROM users WHERE id=$1', [userId]); });

  const expense = await request('POST', '/api/expenses', {
    id: `test-expense-${Date.now()}`, name: 'Integration groceries', amount: 1250,
    category: 'Groceries', type: 'Flexible', transactionKind: 'expense', date: '2026-10-02', merchant: 'Integration Mart', tags: ['test', 'groceries'], currency: '₹',
  }, token);
  assert.equal(expense.status, 201);
  assert.equal(expense.body.amount, 1250);
  assert.equal(expense.body.merchant, 'Integration Mart');
  assert.deepEqual(expense.body.tags, ['test', 'groceries']);

  const updated = await request('PUT', `/api/expenses/${expense.body.id}`, { amount: 1300 }, token);
  assert.equal(updated.status, 200);
  assert.equal(updated.body.amount, 1300);
  const otherUserToken = jwt.sign({ userId: userId + 999999, email: 'other@example.invalid' }, process.env.JWT_SECRET);
  const crossUserUpdate = await request('PUT', `/api/expenses/${expense.body.id}`, { amount: 999999 }, otherUserToken);
  assert.equal(crossUserUpdate.status, 404);

  const investment = await request('POST', '/api/investments', {
    id: `test-investment-${Date.now()}`, name: 'Google stock', type: 'Stocks', quantity: 2,
    monthlyContribution: 0, totalInvested: 10000, startDate: '2026-10-03', notes: 'One-time purchase',
  }, token);
  assert.equal(investment.status, 201);
  assert.equal(investment.body.quantity, 2);
  assert.equal(investment.body.totalInvested, 10000);

  const category = await request('POST', '/api/custom-categories', { name: 'Integration Category', parentCategory: 'Testing', transactionType: 'expense', monthlyBudget: 900, description: 'Integration metadata' }, token);
  assert.equal(category.status, 201);
  assert.equal(category.body.category.parentCategory, 'Testing');
  assert.equal(category.body.category.monthlyBudget, 900);
  const renamed = await request('PUT', `/api/custom-categories/${encodeURIComponent('Integration Category')}`, { name: 'Renamed Category' }, token);
  assert.equal(renamed.status, 200);
  const categoryDetails = await request('GET', '/api/custom-categories/details', undefined, token);
  assert.equal(categoryDetails.body.find((item) => item.name === 'Renamed Category').description, 'Integration metadata');
  const categorizedExpense = await request('PUT', `/api/expenses/${expense.body.id}`, { category: 'Renamed Category' }, token);
  assert.equal(categorizedExpense.status, 200);
  const archived = await request('DELETE', `/api/custom-categories/${encodeURIComponent('Renamed Category')}`, undefined, token);
  assert.equal(archived.status, 200);
  const activeCategories = await request('GET', '/api/custom-categories', undefined, token);
  assert.equal(activeCategories.body.includes('Renamed Category'), false);
  const historicalExpenses = await request('GET', '/api/expenses', undefined, token);
  assert.equal(historicalExpenses.body.find((item) => item.id === expense.body.id).category, 'Renamed Category');

  const savedSettings = await request('PUT', '/api/settings', { budgetWarningThreshold: 85 }, token);
  assert.equal(savedSettings.status, 200);
  assert.equal(savedSettings.body.budgetWarningThreshold, 85);
  const loadedSettings = await request('GET', '/api/settings', undefined, token);
  assert.equal(loadedSettings.body.budgetWarningThreshold, 85);
  const invalidSettings = await request('PUT', '/api/settings', { budgetWarningThreshold: 40 }, token);
  assert.equal(invalidSettings.status, 400);

  const bill = await request('POST', '/api/bills', {
    id: `test-bill-${Date.now()}`, name: 'Integration Internet', expectedAmount: 500,
    category: 'Internet', dueDate: '2026-10-05', startDate: '2026-10-05', renewDate: '2026-10-05', frequency: 'Monthly', amountType: 'variable', paymentAccount: 'Bank Account', reminderDays: 5, endDate: '2027-10-05',
  }, token);
  assert.equal(bill.status, 201);
  assert.equal(bill.body.amountType, 'variable');
  assert.equal(bill.body.paymentAccount, 'Bank Account');
  assert.equal(bill.body.reminderDays, 5);
  const paymentBody = { monthKey: '2026-10', amount: 525, date: '2026-10-05', paymentMethod: 'UPI', accountName: 'Bank Account' };
  const firstPayment = await request('POST', `/api/bills/${bill.body.id}/payments`, paymentBody, token);
  const retryPayment = await request('POST', `/api/bills/${bill.body.id}/payments`, paymentBody, token);
  assert.equal(firstPayment.status, 201);
  assert.equal(retryPayment.status, 201);
  assert.equal(retryPayment.body.duplicate, true);

  const expenses = await request('GET', '/api/expenses', undefined, token);
  assert.equal(expenses.status, 200);
  assert.equal(expenses.body.filter((item) => item.linkedBillId === bill.body.id).length, 1);
  assert.equal(expenses.body.find((item) => item.linkedBillId === bill.body.id).amount, 525);
  const allData = await request('GET', '/api/data/all', undefined, token);
  assert.equal(allData.status, 200);
  assert.deepEqual(allData.body.expenses.find((item) => item.id === expense.body.id).tags, ['test', 'groceries']);
  assert.equal(allData.body.bills.find((item) => item.id === bill.body.id).amountType, 'variable');
  assert.equal(allData.body.customCategoryDetails.find((item) => item.name === 'Renamed Category').active, false);

  const invalidBulkBill = await request('POST', '/api/bills/bulk', { bills: [{ id: 'bad-bill', name: '', dueDate: 'not-a-date' }] }, token);
  assert.equal(invalidBulkBill.status, 400);
  const billsAfterRejectedImport = await request('GET', '/api/bills', undefined, token);
  assert.equal(billsAfterRejectedImport.body.some((item) => item.id === bill.body.id), true);

  const invalidBulkExpense = await request('POST', '/api/expenses/bulk', { expenses: [{ id: 'bad-expense', name: '', amount: 0, date: 'not-a-date' }] }, token);
  assert.equal(invalidBulkExpense.status, 400);
  const expensesAfterRejectedImport = await request('GET', '/api/expenses', undefined, token);
  assert.equal(expensesAfterRejectedImport.body.some((item) => item.id === expense.body.id), true);

  const restored = await request('POST', '/api/data/import', {
    customCategories: [],
    customCategoryDetails: [{ name: 'Archived Restore Category', parentCategory: 'Testing', transactionType: 'expense', monthlyBudget: 1200, description: 'Preserve me', active: false }],
    expenses: [{ id: 'restore-expense', name: 'Restored tagged expense', amount: 75, category: 'Archived Restore Category', type: 'Flexible', transactionKind: 'expense', date: '2026-10-15', merchant: 'Restore Shop', tags: ['restored'] }],
  }, token);
  assert.equal(restored.status, 200);
  const reloaded = await request('GET', '/api/data/all', undefined, token);
  assert.equal(reloaded.body.customCategoryDetails.find((item) => item.name === 'Archived Restore Category').active, false);
  assert.deepEqual(reloaded.body.expenses.find((item) => item.id === 'restore-expense').tags, ['restored']);
});
