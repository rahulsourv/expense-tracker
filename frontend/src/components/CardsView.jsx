import React, { useState } from 'react';
import { CreditCard, Plus, Pencil, Trash2, X, Save, Eye, EyeOff } from 'lucide-react';
import { formatINR, getSignedExpenseAmount } from '../utils/financeCalculators';
import { verifyDevice } from '../utils/deviceAuth';

const EMPTY = { name: '', bankName: '', cardType: 'Credit', cardNumber: '', expiryDate: '', cvv: '', lastFour: '', color: 'yellow', notes: '' };
const cardColors = { yellow: 'bg-neo-yellow', cyan: 'bg-neo-cyan', purple: 'bg-neo-purple text-white', green: 'bg-neo-green', orange: 'bg-neo-orange' };

export const CardsView = ({ cards = [], expenses = [], onSaveCard, onDeleteCard, onAddCardPayment }) => {
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [revealedCardId, setRevealedCardId] = useState(null);

  const openForm = (card = null) => { setEditing(card); setIsFormOpen(true); setForm(card ? { ...EMPTY, ...card } : EMPTY); setError(''); };
  const closeForm = () => { setEditing(null); setIsFormOpen(false); setForm(EMPTY); setError(''); };
  const submit = (event) => {
    event.preventDefault();
    const lastFour = String(form.lastFour || '').replace(/\D/g, '').slice(-4);
    if (!form.name.trim() || lastFour.length !== 4) { setError('Card name and exactly last 4 digits are required.'); return; }
    const { name, bankName, cardType, color, notes } = form;
    onSaveCard({ name, bankName, cardType, color, notes, lastFour, id: editing?.id || `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` });
    closeForm();
  };

  return <div className="space-y-6">
    <section className="brutal-card bg-white p-5 md:p-7">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div><div className="flex items-center gap-2"><CreditCard className="w-6 h-6" /><h2 className="text-2xl font-black uppercase">My Cards</h2></div><p className="text-sm font-bold text-black/60 mt-1">Track card expenses and outstanding balances. Only the last 4 digits are stored.</p></div>
        <button onClick={() => openForm()} className="brutal-btn bg-black text-white px-4 py-2 text-xs font-black uppercase"><Plus className="w-4 h-4 text-neo-yellow" /> Add Card</button>
      </div>
      {cards.length === 0 ? <div className="border-2 border-dashed border-black/40 p-10 text-center font-black uppercase text-black/60">No cards added yet. Add a card to link future expenses.</div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{cards.map((card) => {
        const linkedSpend = expenses.filter((expense) => expense.cardId === card.id).reduce((sum, expense) => sum + getSignedExpenseAmount(expense), 0);
        return <article key={card.id} className={`brutal-card ${cardColors[card.color] || cardColors.yellow} p-5 min-h-[220px] flex flex-col justify-between`}>
          <button onClick={async () => { try { await verifyDevice(); setRevealedCardId(revealedCardId === card.id ? null : card.id); } catch (error) { setError(error.message); } }} className="brutal-btn bg-white self-end px-2 py-1 text-[10px] font-black uppercase">{revealedCardId === card.id ? <EyeOff className="w-3 h-3 inline" /> : <Eye className="w-3 h-3 inline" />} Protected details</button>
          <div><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase opacity-70">{card.cardType} Card</p><h3 className="text-xl font-black uppercase mt-1">{card.name}</h3><p className="font-bold text-sm">{card.bankName || 'Bank not specified'}</p></div><CreditCard className="w-9 h-9" /></div><p className="font-mono text-lg tracking-[0.3em] mt-6">•••• {card.lastFour}</p>{revealedCardId === card.id && <p className="font-mono text-xs mt-2 break-all">{card.cardNumber || 'Full number not saved'} · Exp {card.expiryDate || '—'} · CVV {card.cvv || '—'}</p>}</div>
          <div><div className="flex justify-between text-[10px] font-black uppercase mt-3"><span>Linked expenses</span><span>{formatINR(linkedSpend)}</span></div><div className="flex items-center justify-end mt-3 text-xs font-black uppercase"><span className="flex gap-1"><button onClick={() => openForm(card)} className="p-1.5 border-2 border-black bg-white hover:bg-black hover:text-white" title="Edit card"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => onDeleteCard(card.id)} className="p-1.5 border-2 border-black bg-red-200 hover:bg-red-400" title="Delete card"><Trash2 className="w-3.5 h-3.5" /></button></span></div></div>
        </article>;
      })}</div>}
    </section>
    {isFormOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"><form onSubmit={submit} className="brutal-card bg-neo-cream max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center border-b-2 border-black pb-3 mb-4"><h3 className="text-xl font-black uppercase">{editing ? 'Edit Card' : 'Add Card'}</h3><button type="button" onClick={closeForm} className="p-1 border-2 border-black"><X className="w-5 h-5" /></button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[['name','Card name','text','e.g. HDFC Credit Card'],['bankName','Bank name','text','e.g. HDFC Bank'],['lastFour','Last 4 digits','text','4582']].map(([key,label,type,placeholder]) => <label key={key} className="text-xs font-black uppercase">{label}<input type={type} inputMode={key === 'lastFour' ? 'numeric' : undefined} maxLength={key === 'lastFour' ? 4 : undefined} placeholder={placeholder} value={form[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="brutal-input mt-1" /></label>)}<label className="text-xs font-black uppercase">Card type<select value={form.cardType} onChange={(e) => setForm({ ...form, cardType: e.target.value })} className="brutal-input mt-1 bg-white"><option>Credit</option><option>Debit</option></select></label><label className="text-xs font-black uppercase">Card color<select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="brutal-input mt-1 bg-white"><option value="yellow">Yellow</option><option value="cyan">Cyan</option><option value="purple">Purple</option><option value="green">Green</option><option value="orange">Orange</option></select></label></div>{error && <p className="text-sm font-bold text-red-700 mt-3">{error}</p>}<label className="block text-xs font-black uppercase mt-4">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="brutal-input mt-1 min-h-20" /></label><div className="flex justify-end gap-3 border-t-2 border-black pt-4 mt-4"><button type="button" onClick={closeForm} className="brutal-btn bg-white px-4 py-2 text-xs font-black">Cancel</button><button className="brutal-btn bg-neo-yellow px-4 py-2 text-xs font-black"><Save className="w-4 h-4" /> Save Card</button></div></form></div>}
  </div>;
};
