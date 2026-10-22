/**
 * API client for the NYNET backend
 * Handles all HTTP requests with JWT auth token management
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get the stored auth token
 */
export const getToken = () => localStorage.getItem('brutal_auth_token');

/**
 * Store auth token after login/signup
 */
export const setToken = (token) => localStorage.setItem('brutal_auth_token', token);

/**
 * Remove auth token (logout)
 */
export const removeToken = () => {
  localStorage.removeItem('brutal_auth_token');
  localStorage.removeItem('brutal_user');
};

/**
 * Get stored user info
 */
export const getStoredUser = () => {
  try {
    const user = localStorage.getItem('brutal_user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

/**
 * Store user info
 */
export const setStoredUser = (user) => {
  localStorage.setItem('brutal_user', JSON.stringify(user));
};

/**
 * Core fetch wrapper with auth headers
 */
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // If 401, token is expired/invalid
  if (response.status === 401) {
    removeToken();
    window.dispatchEvent(new CustomEvent('auth:logout'));
    throw new Error('Session expired. Please login again.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: `Backend returned an invalid response (${response.status}).` };
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

// ─── Auth API ──────────────────────────────────────────────────────────

export const authAPI = {
  signup: (email, password, displayName) =>
    apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    }),

  login: (email, password) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => apiFetch('/auth/me'),
};

// ─── Data API (bulk fetch/import/reset) ────────────────────────────────

export const dataAPI = {
  /** Fetch ALL user data in one call (initial load) */
  getAll: () => apiFetch('/data/all'),

  /** Full data import/restore */
  importAll: (data) =>
    apiFetch('/data/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Reset user data */
  reset: (mode = 'clean') =>
    apiFetch('/data/reset', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    }),
};

// ─── Salary API ────────────────────────────────────────────────────────

export const salaryAPI = {
  get: () => apiFetch('/salary'),

  update: (salaryData) =>
    apiFetch('/salary', {
      method: 'PUT',
      body: JSON.stringify(salaryData),
    }),
};

// ─── Expenses API ──────────────────────────────────────────────────────

export const expensesAPI = {
  getAll: () => apiFetch('/expenses'),

  create: (expense) =>
    apiFetch('/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    }),

  update: (id, expense) =>
    apiFetch(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expense),
    }),

  delete: (id) =>
    apiFetch(`/expenses/${id}`, { method: 'DELETE' }),

  deleteAll: () => apiFetch('/expenses/all', { method: 'DELETE' }),
};

// ─── Income API ───────────────────────────────────────────────────────

export const incomeAPI = {
  getAll: () => apiFetch('/income'),
  create: (income) => apiFetch('/income', { method: 'POST', body: JSON.stringify(income) }),
  update: (id, income) => apiFetch(`/income/${id}`, { method: 'PUT', body: JSON.stringify(income) }),
  delete: (id) => apiFetch(`/income/${id}`, { method: 'DELETE' }),
};

// ─── Bills API ─────────────────────────────────────────────────────────

export const billsAPI = {
  getAll: () => apiFetch('/bills'),

  create: (bill) =>
    apiFetch('/bills', {
      method: 'POST',
      body: JSON.stringify(bill),
    }),

  update: (id, bill) =>
    apiFetch(`/bills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bill),
    }),
  pay: (id, payment) => apiFetch(`/bills/${id}/payments`, { method: 'POST', body: JSON.stringify(payment) }),

  delete: (id) =>
    apiFetch(`/bills/${id}`, { method: 'DELETE' }),
};

// ─── Investments API ───────────────────────────────────────────────────

export const investmentsAPI = {
  getAll: () => apiFetch('/investments'),

  create: (investment) =>
    apiFetch('/investments', {
      method: 'POST',
      body: JSON.stringify(investment),
    }),

  update: (id, investment) =>
    apiFetch(`/investments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(investment),
    }),

  delete: (id) =>
    apiFetch(`/investments/${id}`, { method: 'DELETE' }),
};

// ─── Savings Transfers API ─────────────────────────────────────────────

export const savingsTransfersAPI = {
  getAll: () => apiFetch('/savings-transfers'),

  create: (transfer) =>
    apiFetch('/savings-transfers', {
      method: 'POST',
      body: JSON.stringify(transfer),
    }),

  delete: (id) =>
    apiFetch(`/savings-transfers/${id}`, { method: 'DELETE' }),
};

export const savingsGoalsAPI = {
  getAll: () => apiFetch('/savings-goals'),
  create: (goal) => apiFetch('/savings-goals', { method: 'POST', body: JSON.stringify(goal) }),
  update: (id, goal) => apiFetch(`/savings-goals/${id}`, { method: 'PUT', body: JSON.stringify(goal) }),
  addTransaction: (id, transaction) => apiFetch(`/savings-goals/${id}/transactions`, { method: 'POST', body: JSON.stringify(transaction) }),
  delete: (id) => apiFetch(`/savings-goals/${id}`, { method: 'DELETE' }),
};

// ─── Loans API ────────────────────────────────────────────────────────

export const loansAPI = {
  getAll: () => apiFetch('/loans'),
  create: (loan) => apiFetch('/loans', { method: 'POST', body: JSON.stringify(loan) }),
  update: (id, loan) => apiFetch(`/loans/${id}`, { method: 'PUT', body: JSON.stringify(loan) }),
  delete: (id) => apiFetch(`/loans/${id}`, { method: 'DELETE' }),
};

// ─── Cards API ────────────────────────────────────────────────────────

export const cardsAPI = {
  getAll: () => apiFetch('/cards'),
  create: (card) => apiFetch('/cards', { method: 'POST', body: JSON.stringify(card) }),
  update: (id, card) => apiFetch(`/cards/${id}`, { method: 'PUT', body: JSON.stringify(card) }),
  delete: (id) => apiFetch(`/cards/${id}`, { method: 'DELETE' }),
  addPayment: (id, payment) => apiFetch(`/cards/${id}/payments`, { method: 'POST', body: JSON.stringify(payment) }),
};

export const accountsAPI = {
  getAll: () => apiFetch('/accounts'),
  create: (account) => apiFetch('/accounts', { method: 'POST', body: JSON.stringify(account) }),
  update: (id, account) => apiFetch(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(account) }),
  archive: (id) => apiFetch(`/accounts/${id}`, { method: 'DELETE' }),
};

export const cashBalancesAPI = {
  getAll: () => apiFetch('/cash-balances'),
  save: (monthKey, balance) => apiFetch(`/cash-balances/${monthKey}`, { method: 'PUT', body: JSON.stringify(balance) }),
};

export const settingsAPI = {
  get: () => apiFetch('/settings'),
  save: (settings) => apiFetch('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
};

// ─── Custom Categories API ─────────────────────────────────────────────

export const customCategoriesAPI = {
  getAll: () => apiFetch('/custom-categories'),
  getDetails: () => apiFetch('/custom-categories/details'),

  create: (name, metadata = {}) =>
    apiFetch('/custom-categories', {
      method: 'POST',
      body: JSON.stringify({ name, ...metadata }),
    }),
  rename: (oldName, name, metadata = {}) => apiFetch(`/custom-categories/${encodeURIComponent(oldName)}`, {
    method: 'PUT',
    body: JSON.stringify({ name, ...metadata }),
  }),
  archive: (name) => apiFetch(`/custom-categories/${encodeURIComponent(name)}`, { method: 'DELETE' }),
};
