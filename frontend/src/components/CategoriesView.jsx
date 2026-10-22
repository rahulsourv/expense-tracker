import React, { useState } from 'react';
import { Archive, CheckCircle2, Pencil, Plus, Save, Tag, X } from 'lucide-react';
import { CATEGORY_GROUPS } from '../data/categoryRegistry';

const emptyForm = { name: '', parentCategory: 'Custom', transactionType: 'expense', monthlyBudget: '', description: '' };

export const CategoriesView = ({ customCategories = [], customCategoryDetails = [], onAddCategory, onEditCategory, onArchiveCategory }) => {
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    if (editing) onEditCategory?.(editing.name, { ...form, name });
    else onAddCategory?.(name, form);
    setForm(emptyForm); setEditing(null);
  };
  const startEdit = (category) => { setEditing(category); setForm({ name: category.name, parentCategory: category.parentCategory || 'Custom', transactionType: category.transactionType || 'expense', monthlyBudget: category.monthlyBudget || '', description: category.description || '' }); };
  const cancelEdit = () => { setEditing(null); setForm(emptyForm); };
  return <section className="brutal-card bg-white p-5 md:p-7">
    <div className="flex items-center gap-2 mb-1"><Tag className="w-6 h-6" /><h2 className="text-2xl font-black uppercase">Categories</h2></div>
    <p className="text-sm font-bold text-black/60 mb-5">Choose the category, type and monthly budget yourself. Archived categories stay on old records.</p>
    <form onSubmit={submit} className="border-2 border-black bg-cyan-50 p-4 mb-6">
      <div className="flex items-center justify-between mb-3"><h3 className="font-black uppercase">{editing ? 'Edit custom category' : 'Create custom category'}</h3>{editing && <button type="button" onClick={cancelEdit} className="p-1 border border-black bg-white"><X className="w-4 h-4" /></button>}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2"><input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Category name" className="brutal-input" /><input value={form.parentCategory} onChange={(e) => setField('parentCategory', e.target.value)} placeholder="Group / parent" className="brutal-input" /><select value={form.transactionType} onChange={(e) => setField('transactionType', e.target.value)} className="brutal-input"><option value="expense">Expense</option><option value="income">Income</option></select><input type="number" min="0" value={form.monthlyBudget} onChange={(e) => setField('monthlyBudget', e.target.value)} placeholder="Monthly budget (optional)" className="brutal-input" /></div>
      <div className="flex flex-col sm:flex-row gap-2 mt-2"><input value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Description (optional)" className="brutal-input flex-1" /><button className="brutal-btn bg-neo-yellow px-4 py-2 text-xs font-black uppercase">{editing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{editing ? 'Save Category' : 'Add Category'}</button></div>
    </form>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{CATEGORY_GROUPS.map((group) => <div key={group.parent} className="border-2 border-black p-4 bg-cyan-50"><h3 className="font-black uppercase mb-3">{group.parent}</h3>{group.categories.map((category) => <div key={category.name} className="flex items-center gap-2 text-sm font-bold py-1"><CheckCircle2 className="w-4 h-4 text-emerald-700" />{category.name}</div>)}</div>)}<div className="border-2 border-black p-4 bg-neo-yellow"><h3 className="font-black uppercase mb-3">Custom Categories</h3>{customCategories.length ? customCategories.map((name) => { const category = customCategoryDetails.find((item) => item.name === name) || { name }; return <div key={name} className="border-b border-black/30 py-2"><div className="flex items-center justify-between gap-2 text-sm font-bold"><span className="truncate">{name}</span><span className="flex gap-1"><button type="button" onClick={() => startEdit(category)} className="p-1 border border-black bg-white hover:bg-cyan-200" title="Edit category"><Pencil className="w-3.5 h-3.5" /></button><button type="button" onClick={() => onArchiveCategory?.(name)} className="p-1 border border-black bg-white hover:bg-red-200" title="Archive category"><Archive className="w-3.5 h-3.5" /></button></span></div><div className="text-xs font-bold text-black/60">{category.parentCategory || 'Custom'} · {category.transactionType || 'expense'}{Number(category.monthlyBudget) > 0 ? ` · budget ₹${Number(category.monthlyBudget).toLocaleString('en-IN')}` : ''}</div>{category.description && <div className="text-xs mt-1">{category.description}</div>}</div>; }) : <p className="text-sm font-bold text-black/60">No custom categories yet.</p>}</div></div>
  </section>;
};
