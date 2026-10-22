# ⚡ FINANCE COMMAND CENTER // Neo-Brutalist Wealth & Expense Engine

A full-featured personal finance command center built with **React 19**, **Tailwind CSS**, **Framer Motion**, and **Vitest**, adhering to bold **Neo-Brutalism** design principles.

---

## 🚀 Key Upgrades & Architecture

### 1. Core Financial Model & Custom Allocations
Configured with the prompt's benchmark demonstration values (customizable by the user):
- **Monthly Salary (Income)**: ₹1,90,000
- **Monthly Investments Allocation**: ₹40,000
- **Essential & Recurring Expense Budget**: ₹50,000
- **Planned Savings Account Allocation**: ₹1,00,000
- **Flexible Spending Formula**:
  $$\text{Flexible Budget} = \text{Salary} - \text{Investments} - \text{Essential Budget} - \text{Planned Savings}$$
  $$₹1,90,000 - ₹40,000 - ₹50,000 - ₹1,00,000 = ₹0$$
- **No Artificial Surplus**: The entire salary is explicitly allocated. Any spending with ₹0 flexible budget triggers an overbudget warning.
- **Indian Numbering Format**: Formatted as `₹1,90,000` across the entire application.

### 2. Comprehensive Monthly Dashboard
- Month-by-month scoping (e.g. `2026-10`, `2026-09`, `2026-08`) so past transactions do not bleed into current budget metrics.
- Live dynamic summary cards:
  - Monthly Salary received
  - Essential Expenses Budget vs. Actual (with remaining balance)
  - Flexible Spending Budget vs. Actual (with remaining balance)
  - Monthly Investments Planned vs. Actual Contributed
  - Planned Savings vs. Actual Savings Transferred
  - Residual Checking Account Liquidity & Unallocated Income

### 3. Essential Bills & Duplicate-Free Payment Tracking
- Dedicated recurring bills checklist: Water, Electricity, Cooking Gas, Rent, Broadband, Maintenance, Insurance.
- Fields: Name, Expected amount, Category, Due date, Frequency (Monthly, Weekly, Yearly, Custom), Actual amount paid, Payment date.
- **Duplicate Prevention Guarantee**: Clicking "Mark as Paid" links directly to the expense ledger (`linkedBillId`). Clicking repeatedly updates the existing transaction without ever duplicating entries.
- Overdue tracking flags bills whose due date has passed.

### 4. Investment Portfolio & Monthly SIP Contributions
- Supported Instruments: Mutual funds & SIPs, Index funds, Stocks, Gold, PPF, Fixed deposits, Recurring deposits, Custom.
- Tracks:
  1. Planned monthly contribution
  2. Actual contribution made for the selected month
  3. Total invested principal
  4. Current market value (manually maintained)
  5. Unrealized gain/loss
  6. Theoretical compounded future value ($FV$)
- **Cash Outflow Integrity**: Investments are separated from regular expenses; total cash outflow is calculated as $\text{Total Expenses} + \text{Actual Investments}$ without double-counting.

### 5. Transparent Actual Savings & Cash Flow
- Distinguishes **Planned Savings** (an allocation) from **Actual Savings** (money moved into savings accounts).
- Manual savings deposit logging: Date, Amount, Source account, Destination account, Notes.
- Internal transfers between user accounts are excluded from income and expenses to avoid double-counting.

### 6. Budget Monitoring & Overspending Alerts
- 4-Tier Thresholds:
  - 🟢 **Green**: Under 75% of budget.
  - 🟡 **Yellow**: 75% to below 90%.
  - 🟠 **Orange**: 90% to 100%.
  - 🔴 **Red**: Above 100% or committed allocations exceed salary.
- Real mathematical alerts for pace projection, overdue bills, and category limits.

### 7. Data Persistence, Backup & Reliability
- Offline-first `localStorage` persistence.
- Export transactions to **CSV**.
- Full **JSON backup & restore** with confirmation guards.
- Factory reset with confirmation.

---

## 🧪 Testing

Automated test suite using Vitest verifying core allocation math, safe bill toggling, and compound SIP formulas:
```bash
cd frontend
npm test
```

## 🏃 Running Locally

```bash
# Install frontend and backend dependencies from the project root
npm run install:all

# Initialize the PostgreSQL schema after setting DATABASE_URL in backend/.env
npm run db:init

# Start the backend in one terminal
npm run dev:backend

# Start the frontend in another terminal
npm run dev
```

Open **`http://localhost:5173/`** in your browser.

### Backend configuration

The project includes safe templates at `backend/.env.example` and `frontend/.env.local.example`. Copy them to local env files and update these values before starting the application:

- `backend/.env` → copy from `backend/.env.example`, then set `DATABASE_URL` and `JWT_SECRET`
- `frontend/.env.local` → `VITE_API_URL` if the backend is not running at `http://localhost:5000/api`

The backend health check is available at **`http://localhost:5002/api/health`**. It should report `healthy` and `database: connected` after the database schema has been initialized.
