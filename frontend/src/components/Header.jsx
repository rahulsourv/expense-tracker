import React from 'react';
import { TrendingUp, Settings, FileSpreadsheet, LogOut, User, Menu, X, Receipt, CreditCard, History, PiggyBank, BarChart3, Layers } from 'lucide-react';

const navItems = [
  ['DASHBOARD', 'Dashboard', Receipt, 'bg-neo-yellow'],
  ['CARDS', 'Cards', CreditCard, 'bg-neo-cyan'],
  ['HISTORY', 'History', History, 'bg-neo-pink'],
  ['BILLS', 'Recurring Bills', Layers, 'bg-amber-200'],
  ['INVESTMENTS', 'Investments & SIPs', TrendingUp, 'bg-purple-200'],
  ['SAVINGS', 'Savings & Cash Flow', PiggyBank, 'bg-emerald-200'],
  ['SAVINGS_GOALS', 'Savings Goals', PiggyBank, 'bg-cyan-200'],
  ['LOANS', 'Loans & EMIs', CreditCard, 'bg-orange-200'],
  ['ANALYTICS', 'Analytics & Trends', BarChart3, 'bg-pink-200'],
  ['CATEGORIES', 'Categories', Layers, 'bg-lime-200'],
  ['INCOME', 'Income Ledger', Receipt, 'bg-blue-200'],
  ['ACCOUNTS', 'Accounts', CreditCard, 'bg-slate-200'],
  ['SETTINGS', 'Settings', Settings, 'bg-neutral-200'],
];

export const Header = ({ onOpenSalaryModal, onOpenBackupModal, selectedMonthKey, setSelectedMonthKey, availableMonthKeys, user, onLogout, activeTab, setActiveTab, cards = [] }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const navigateTo = (tabId) => {
    setActiveTab(tabId);
    setMenuOpen(false);
    window.setTimeout(() => document.getElementById('workspace-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  const formatMonthLabel = (key) => {
    if (!key) return '';
    const [year, month] = key.split('-');
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  return <>
    <aside className="hidden lg:flex fixed z-50 inset-y-0 left-0 w-64 bg-slate-950 text-white flex-col border-r border-slate-800">
      <div className="p-5 border-b border-white/10"><div className="flex items-center gap-3"><div className="bg-neo-yellow text-black p-2 rounded-xl"><TrendingUp className="w-6 h-6" /></div><div><div className="text-2xl font-black tracking-tight">NYNET</div><div className="text-[9px] leading-tight font-bold uppercase text-slate-400">Not Your Normal<br />Expense Tracker</div></div></div></div>
      <div className="px-4 pt-5 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace</div>
      <nav className="px-3 space-y-1 overflow-y-auto flex-1" aria-label="Main navigation">
        {navItems.map(([id, label, Icon, color]) => <button key={id} type="button" onClick={() => navigateTo(id)} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-bold transition-colors ${activeTab === id ? `${color} text-black` : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon className="w-4 h-4 shrink-0" /><span>{id === 'CARDS' ? `${label} (${cards.length})` : label}</span></button>)}
      </nav>
      <div className="p-4 border-t border-white/10"><div className="text-[10px] font-bold uppercase text-slate-500 mb-2">Current period</div><div className="text-xs font-bold text-slate-200">{formatMonthLabel(selectedMonthKey)}</div></div>
    </aside>

    {menuOpen && <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/50" onClick={() => setMenuOpen(false)}><aside className="w-[min(84vw,320px)] h-full bg-slate-950 text-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between pb-4 border-b border-white/10"><div className="flex items-center gap-2"><div className="bg-neo-yellow text-black p-2 rounded-lg"><TrendingUp className="w-5 h-5" /></div><div><div className="font-black text-xl">NYNET</div><div className="text-[8px] text-slate-400 uppercase">Not Your Normal Expense Tracker</div></div></div><button onClick={() => setMenuOpen(false)} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button></div><nav className="mt-5 space-y-1">{navItems.map(([id, label, Icon, color]) => <button key={id} type="button" onClick={() => navigateTo(id)} className={`w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold ${activeTab === id ? `${color} text-black` : 'text-slate-300 hover:bg-white/10'}`}><Icon className="w-4 h-4" />{id === 'CARDS' ? `${label} (${cards.length})` : label}</button>)}</nav></aside></div>}

    <header className="relative z-30 border-b border-slate-200 bg-white px-4 py-3 md:px-8">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="lg:hidden flex items-center gap-3"><button type="button" onClick={() => setMenuOpen(true)} className="rounded-lg bg-slate-950 text-white p-2" aria-label="Open navigation"><Menu className="w-5 h-5" /></button><div className="bg-slate-950 text-neo-yellow p-2 rounded-lg"><TrendingUp className="w-5 h-5" /></div><div><h1 className="text-xl font-black tracking-tight text-slate-950">NYNET</h1><p className="hidden sm:block text-[10px] font-bold uppercase tracking-wide text-slate-500">Not Your Normal Expense Tracker</p></div></div>
        <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 lg:ml-auto">
          <select value={selectedMonthKey} onChange={(event) => setSelectedMonthKey(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold shadow-sm" title="Select month">{availableMonthKeys.map((key) => <option key={key} value={key}>{formatMonthLabel(key)}</option>)}</select>
          <button onClick={onOpenSalaryModal} className="rounded-lg bg-slate-950 text-white px-3 py-2 text-xs font-bold hover:bg-slate-800"><Settings className="w-4 h-4 inline mr-1" /> Salary & Allocations</button>
          <button onClick={onOpenBackupModal} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50"><FileSpreadsheet className="w-4 h-4 inline mr-1" /> Backup</button>
          {user && <div className="flex items-center gap-2"><span className="hidden sm:flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"><User className="w-3.5 h-3.5" />{user.displayName || user.email}</span><button onClick={onLogout} className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700" title="Logout"><LogOut className="w-4 h-4" /></button></div>}
        </div>
      </div>
    </header>
  </>;
};
