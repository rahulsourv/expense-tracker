import React, { useMemo, useState } from 'react';
import { BarChart3, CalendarRange, History, TrendingUp } from 'lucide-react';
import { buildTransactionLedger, formatINR, getSignedExpenseAmount } from '../utils/financeCalculators';

const COLORS = ['#FFE600', '#FF6B8B', '#2DE2E6', '#A388EE', '#00E599', '#FF8811', '#111111'];
const RANGES = [
  { id: '6M', label: '6 Months', months: 6 },
  { id: '1Y', label: '1 Year', months: 12 },
  { id: '2Y', label: '2 Years', months: 24 },
  { id: '5Y', label: '5 Years', months: 60 },
];

const monthKeyFromDate = (date) => (date ? String(date).slice(0, 7) : null);

const monthLabel = (key) => {
  if (!key) return 'Unknown month';
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
};

const shiftMonth = (key, amount) => {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const Donut = ({ segments, total, size = 112 }) => {
  const gradient = segments.length
    ? segments
        .reduce((parts, segment) => {
          const start = parts.length ? parts[parts.length - 1].end : 0;
          const end = start + (segment.amount / total) * 100;
          parts.push({ end, value: `${segment.color} ${start}% ${end}%` });
          return parts;
        }, [])
        .map((part) => part.value)
        .join(', ')
    : '#e5e7eb 0% 100%';

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 border-2 border-black"
      style={{ width: size, height: size, background: `conic-gradient(${gradient})` }}
      aria-label={`Expense total ${formatINR(total)}`}
    >
      <div className="rounded-full bg-white border-2 border-black flex flex-col items-center justify-center" style={{ width: size * 0.57, height: size * 0.57 }}>
        <span className="text-[10px] font-black uppercase">Total</span>
        <span className="text-xs font-black">{formatINR(total)}</span>
      </div>
    </div>
  );
};

const buildSegments = (categories) =>
  categories.map(([category, amount], index) => ({
    category,
    amount,
    color: COLORS[index % COLORS.length],
  }));

export const ExpenseHistoryView = ({ expenses = [], incomeEntries = [], savingsTransfers = [], investments = [], loans = [], selectedMonthKey, setSelectedMonthKey }) => {
  const [range, setRange] = useState('6M');
  const [ledgerQuery, setLedgerQuery] = useState('');
  const [ledgerType, setLedgerType] = useState('All');
  const [ledgerLimit, setLedgerLimit] = useState(50);

  const monthMap = useMemo(() => {
    const map = {};
    expenses.forEach((expense) => {
      const key = monthKeyFromDate(expense.date);
      if (!key) return;
      if (!map[key]) map[key] = { key, total: 0, categories: {} };
      const amount = getSignedExpenseAmount(expense);
      const category = expense.category || 'Other';
      map[key].total += amount;
      map[key].categories[category] = (map[key].categories[category] || 0) + amount;
    });
    return map;
  }, [expenses]);

  const currentMonthKey = useMemo(() => monthKeyFromDate(new Date().toISOString()), []);
  const anchorMonth = selectedMonthKey || currentMonthKey;
  const selectedSummary = monthMap[anchorMonth] || { key: anchorMonth, total: 0, categories: {} };

  const monthSummaries = useMemo(() => {
    const keys = Object.keys(monthMap);
    if (!keys.includes(anchorMonth)) keys.push(anchorMonth);
    return keys
      .sort((a, b) => b.localeCompare(a))
      .map((key) => monthMap[key] || { key, total: 0, categories: {} });
  }, [monthMap, anchorMonth]);

  const trend = useMemo(() => {
    const rangeConfig = RANGES.find((item) => item.id === range) || RANGES[0];
    return Array.from({ length: rangeConfig.months }, (_, index) => {
      const key = shiftMonth(anchorMonth, index - rangeConfig.months + 1);
      return { key, total: monthMap[key]?.total || 0 };
    });
  }, [anchorMonth, monthMap, range]);

  const maxTrend = Math.max(...trend.map((item) => item.total), 1);
  const chartWidth = 900;
  const chartHeight = 260;
  const chartPadding = { top: 20, right: 18, bottom: 46, left: 18 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const barWidth = Math.max(5, Math.min(28, (plotWidth / trend.length) * 0.62));
  const points = trend.map((item, index) => {
    const x = chartPadding.left + ((index + 0.5) / trend.length) * plotWidth;
    const y = chartPadding.top + plotHeight - (item.total / maxTrend) * plotHeight;
    return `${x},${y}`;
  });

  const selectedSegments = buildSegments(
    Object.entries(selectedSummary.categories).sort(([, a], [, b]) => b - a),
  );
  const ledger = useMemo(() => buildTransactionLedger({ expenses, incomeEntries, savingsTransfers, investments, loans }), [expenses, incomeEntries, savingsTransfers, investments, loans]);
  const filteredLedger = useMemo(() => {
    const query = ledgerQuery.trim().toLowerCase();
    return ledger.filter((item) => {
      const matchesType = ledgerType === 'All' || item.type === ledgerType;
      const matchesQuery = !query || [item.description, item.category, item.accountName, item.date].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
      return matchesType && matchesQuery;
    });
  }, [ledger, ledgerQuery, ledgerType]);

  return (
    <div className="space-y-6">
      <section className="brutal-card bg-white p-5 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-6 h-6" />
              <h2 className="text-2xl font-black uppercase">Previous Months</h2>
            </div>
            <p className="text-sm font-bold text-black/60 mt-1">See exactly where each month’s money went.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-black uppercase bg-neo-yellow border-2 border-black px-3 py-2">
            <CalendarRange className="w-4 h-4" /> {monthSummaries.length} months recorded
          </div>
        </div>

        {monthSummaries.length === 1 && monthSummaries[0].total === 0 ? (
          <div className="border-2 border-dashed border-black/40 p-8 text-center font-black uppercase text-black/60">
            Your previous-month expense history will appear here after you add expenses.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthSummaries.map((summary) => {
              const segments = buildSegments(Object.entries(summary.categories).sort(([, a], [, b]) => b - a));
              const isSelected = summary.key === anchorMonth;
              return (
                <button
                  key={summary.key}
                  type="button"
                  onClick={() => setSelectedMonthKey?.(summary.key)}
                  className={`brutal-card text-left p-4 flex items-center gap-4 transition-all ${
                    isSelected ? 'bg-neo-cyan shadow-brutal' : 'bg-gray-50 hover:bg-neo-yellow'
                  }`}
                >
                  <Donut segments={segments} total={summary.total} size={86} />
                  <div className="min-w-0">
                    <p className="font-black uppercase text-sm truncate">{monthLabel(summary.key)}</p>
                    <p className="font-black text-lg mt-1">{formatINR(summary.total)}</p>
                    <p className="text-xs font-bold text-black/60 mt-1">{segments.length} categories</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] gap-6">
        <div className="brutal-card bg-white p-5 md:p-7">
          <p className="text-xs font-black uppercase text-black/60">Selected month</p>
          <h3 className="text-2xl font-black uppercase mt-1">{monthLabel(anchorMonth)}</h3>
          <div className="flex justify-center py-6">
            <Donut segments={selectedSegments} total={selectedSummary.total} size={190} />
          </div>
          <div className="space-y-2">
            {selectedSegments.length ? selectedSegments.map((segment) => (
              <div key={segment.category} className="flex items-center justify-between gap-3 text-sm font-bold">
                <span className="flex items-center gap-2 min-w-0"><span className="w-3 h-3 border border-black shrink-0" style={{ backgroundColor: segment.color }} /> <span className="truncate">{segment.category}</span></span>
                <span>{formatINR(segment.amount)}</span>
              </div>
            )) : <p className="text-sm font-bold text-black/50 text-center">No expenses recorded for this month.</p>}
          </div>
        </div>

        <div className="brutal-card bg-white p-5 md:p-7 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /><h3 className="text-xl font-black uppercase">Expense trend</h3></div>
              <p className="text-xs font-bold text-black/60 mt-1">Monthly total expenses</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {RANGES.map((item) => <button key={item.id} type="button" onClick={() => setRange(item.id)} className={`border-2 border-black px-2 py-1 text-[10px] font-black uppercase ${range === item.id ? 'bg-neo-pink shadow-brutal' : 'bg-white hover:bg-neo-yellow'}`}>{item.label}</button>)}
            </div>
          </div>
          <div className="border-2 border-black bg-gray-50 p-2 overflow-hidden">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto" role="img" aria-label={`${RANGES.find((item) => item.id === range)?.label} expense trend`}>
              <line x1={chartPadding.left} y1={chartPadding.top + plotHeight} x2={chartWidth - chartPadding.right} y2={chartPadding.top + plotHeight} stroke="#111" strokeWidth="3" />
              {trend.map((item, index) => {
                const x = chartPadding.left + ((index + 0.5) / trend.length) * plotWidth;
                const height = (item.total / maxTrend) * plotHeight;
                return <g key={item.key}><title>{`${monthLabel(item.key)}: ${formatINR(item.total)}`}</title><rect x={x - barWidth / 2} y={chartPadding.top + plotHeight - height} width={barWidth} height={height} fill="#2DE2E6" stroke="#111" strokeWidth="2" /><text x={x} y={chartHeight - 15} textAnchor="middle" fontSize="11" fontWeight="700">{trend.length <= 12 || index % Math.ceil(trend.length / 6) === 0 ? monthLabel(item.key).replace(' ', '\n') : ''}</text></g>;
              })}
              <polyline points={points.join(' ')} fill="none" stroke="#FF6B8B" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
              {points.map((point, index) => { const [x, y] = point.split(','); return <circle key={trend[index].key} cx={x} cy={y} r="4" fill="#FF6B8B" stroke="#111" strokeWidth="2"><title>{formatINR(trend[index].total)}</title></circle>; })}
            </svg>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs font-black uppercase mt-3"><span className="flex items-center gap-1"><span className="w-3 h-3 bg-neo-cyan border border-black" /> Bars</span><span className="flex items-center gap-1"><span className="w-3 h-3 bg-neo-pink border border-black rounded-full" /> Trend line</span><BarChart3 className="w-4 h-4" /></div>
        </div>
      </section>

      <section className="brutal-card bg-white p-5 md:p-7">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-4"><div><h3 className="text-xl font-black uppercase">Unified transaction ledger</h3><p className="text-xs font-bold text-black/60 mt-1">Income, expenses, refunds, savings transfers, investments and loan payments in one chronological view.</p></div><span className="brutal-badge bg-neo-yellow">{filteredLedger.length} matching / {ledger.length} records</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_180px] gap-2 mb-4"><input value={ledgerQuery} onChange={(event) => { setLedgerQuery(event.target.value); setLedgerLimit(50); }} placeholder="Search description, category, account or date" className="brutal-input" /><select value={ledgerType} onChange={(event) => { setLedgerType(event.target.value); setLedgerLimit(50); }} className="brutal-input bg-white"><option>All</option><option>Income</option><option>Expense</option><option>Refund</option><option>Transfer</option><option>Investment</option><option>Loan payment</option></select></div>
        {filteredLedger.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b-2 border-black font-black uppercase"><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Description</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Category</th><th className="py-2 text-right">Amount</th></tr></thead><tbody>{filteredLedger.slice(0, ledgerLimit).map((item) => <tr key={`${item.type}-${item.id}`} className="border-b border-black/15"><td className="py-2 pr-3 font-mono">{item.date}</td><td className="py-2 pr-3 font-bold">{item.description}</td><td className="py-2 pr-3"><span className={`border border-black px-1.5 py-0.5 font-black uppercase ${item.type === 'Income' ? 'bg-emerald-200' : item.type === 'Refund' ? 'bg-cyan-200' : item.type === 'Transfer' ? 'bg-yellow-200' : 'bg-rose-100'}`}>{item.type}</span></td><td className="py-2 pr-3 text-black/60">{item.category || '—'}</td><td className={`py-2 text-right font-mono font-black ${item.cashEffect >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{item.cashEffect >= 0 ? '+' : '-'}{formatINR(item.amount)}</td></tr>)}</tbody></table>{filteredLedger.length > ledgerLimit && <button type="button" onClick={() => setLedgerLimit((limit) => limit + 50)} className="brutal-btn bg-white px-3 py-1.5 text-xs font-black mt-3">Show 50 more</button>}</div> : <div className="border-2 border-dashed border-black/40 p-8 text-center font-black uppercase text-black/60">No matching transactions.</div>}
      </section>
    </div>
  );
};

