import React, { useState } from 'react';
import {
  Droplets,
  Zap,
  Flame,
  Home,
  ShoppingCart,
  Wifi,
  Smartphone,
  Car,
  Fuel,
  Wrench,
  Activity,
  Utensils,
  Tv,
  TrendingUp,
  Shirt,
  Plus,
  Check,
} from 'lucide-react';
import { DEFAULT_EXPENSE_PRESETS } from '../data/defaultData';
import { formatINR } from '../utils/financeCalculators';

// Icon mapper for presets
const iconMap = {
  Droplets: Droplets,
  Zap: Zap,
  Flame: Flame,
  Home: Home,
  ShoppingCart: ShoppingCart,
  Wifi: Wifi,
  Smartphone: Smartphone,
  Car: Car,
  Fuel: Fuel,
  Shirt: Shirt,
  Wrench: Wrench,
  Activity: Activity,
  Utensils: Utensils,
  Tv: Tv,
};

export const QuickDefaultExpenses = ({ onAddPresetExpense, onAddQuickInvestment }) => {
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [justAddedId, setJustAddedId] = useState(null);
  const [investmentName, setInvestmentName] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [investmentDetail, setInvestmentDetail] = useState('');
  const [isInvestmentSelected, setIsInvestmentSelected] = useState(false);

  const handlePresetClick = (preset) => {
    setSelectedPresetId(preset.id);
    setCustomName(preset.name);
    setCustomAmount(preset.defaultAmount.toString());
  };

  const handleQuickSubmit = (preset) => {
    const amount = Number(customAmount) > 0 ? Number(customAmount) : preset.defaultAmount;
    onAddPresetExpense({
      name: customName.trim() || preset.name,
      amount: amount,
      category: preset.category,
      type: preset.type || (preset.isMandate ? 'Essential' : 'Flexible'),
      isRecurring: preset.type === 'Essential',
      notes: `Quick preset entry (${preset.description})`,
    });

    setJustAddedId(preset.id);
    setTimeout(() => {
      setJustAddedId(null);
      setSelectedPresetId(null);
      setCustomName('');
      setCustomAmount('');
    }, 1200);
  };

  return (
    <div className="brutal-card p-4 md:p-6 bg-white mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b-2 border-black">
        <div>
          <div className="flex items-center gap-2">
            <span className="brutal-badge bg-neo-yellow text-black">
              QUICK ACCESS
            </span>
            <h3 className="text-lg md:text-xl font-black uppercase tracking-tight">
              DEFAULT EXPENSE PRESETS
            </h3>
          </div>
          <p className="text-xs font-bold text-black/70 mt-0.5">
            1-Click default presets (Water, Electricity, Gas, Rent, Petrol, Groceries, Dining) with custom number input.
          </p>
          <p className="text-[11px] font-mono font-bold text-black/60 mt-1">
            Tip: kisi bhi preset par click karke name aur amount edit karein — jaise “Restaurant Dinner” ya “Lunch with friends”.
          </p>
        </div>
        <span className="font-mono text-xs font-bold text-black/60 hidden sm:inline-block">
          TAP TO QUICK-LOG
        </span>
      </div>

      {/* Preset Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className={`border-2 border-black p-2.5 bg-purple-200 transition-all flex flex-col justify-between ${isInvestmentSelected ? 'ring-2 ring-black shadow-none translate-x-1 translate-y-1' : 'shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal'}`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="bg-white border-2 border-black p-1 text-purple-900"><TrendingUp className="w-4 h-4" /></div>
              <span className="font-mono text-[9px] font-bold px-1 bg-black text-white">INVEST</span>
            </div>
            <div className="font-black text-xs md:text-sm leading-tight">Investment</div>
            <div className="text-[10px] font-mono font-bold text-black/70 mt-0.5">One-time / SIP</div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-black/40">
            {isInvestmentSelected ? (
              <div className="space-y-1.5">
                <input autoFocus className="w-full bg-white border border-black px-1.5 py-0.5 text-xs font-bold" placeholder="Name" value={investmentName} onChange={(e) => setInvestmentName(e.target.value)} />
                <input className="w-full bg-white border border-black px-1.5 py-0.5 text-xs font-bold font-mono" type="number" min="1" placeholder="Amount ₹" value={investmentAmount} onChange={(e) => setInvestmentAmount(e.target.value)} />
                <input className="w-full bg-white border border-black px-1.5 py-0.5 text-xs font-bold" placeholder="Details" value={investmentDetail} onChange={(e) => setInvestmentDetail(e.target.value)} />
                <div className="flex gap-1">
                  <button className="flex-1 bg-black text-white text-[10px] font-bold py-1 border border-black" onClick={() => { if (investmentName.trim() && Number(investmentAmount) > 0) { onAddQuickInvestment({ name: investmentName.trim(), amount: Number(investmentAmount), detail: investmentDetail.trim() }); setInvestmentName(''); setInvestmentAmount(''); setInvestmentDetail(''); setIsInvestmentSelected(false); } }}>ADD</button>
                  <button className="bg-white text-black text-[10px] font-bold px-1.5 py-1 border border-black" onClick={() => setIsInvestmentSelected(false)}>✕</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setIsInvestmentSelected(true)} className="w-full bg-white hover:bg-black hover:text-white border border-black text-[10px] font-black py-1 transition-colors flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> ADD AMOUNT</button>
            )}
          </div>
        </div>
        {DEFAULT_EXPENSE_PRESETS.map((preset) => {
          const IconComponent = iconMap[preset.icon] || Droplets;
          const isSelected = selectedPresetId === preset.id;
          const isSuccess = justAddedId === preset.id;
          const isEssential = preset.type === 'Essential' || preset.isMandate;

          return (
            <div
              key={preset.id}
              className={`border-2 border-black p-2.5 transition-all flex flex-col justify-between ${
                preset.color
              } ${
                isSelected
                  ? 'ring-2 ring-black shadow-none translate-x-1 translate-y-1'
                  : 'shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="bg-white border-2 border-black p-1">
                    <IconComponent className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="font-mono text-[9px] font-bold px-1 bg-black text-white">
                    {isEssential ? 'RECURRING' : 'EXPENSE'}
                  </span>
                </div>

                <div className="font-black text-xs md:text-sm leading-tight truncate" title={preset.name}>
                  {preset.name}
                </div>
                <div className="text-[10px] font-mono font-bold text-black/70 mt-0.5">
                  Default: {formatINR(preset.defaultAmount)}
                </div>
              </div>

              {/* Action Area */}
              <div className="mt-2.5 pt-2 border-t border-black/40">
                {isSelected ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Expense name"
                      className="w-full bg-white border border-black px-1.5 py-0.5 text-xs font-bold focus:outline-none"
                      aria-label={`Custom name for ${preset.name}`}
                    />
                    <div className="relative">
                      <span className="absolute left-1.5 top-1 font-mono text-xs font-bold text-black/60">
                        ₹
                      </span>
                      <input
                        type="number"
                        autoFocus
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Amount"
                        className="w-full bg-white border border-black pl-5 pr-1 py-0.5 text-xs font-bold font-mono focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleQuickSubmit(preset)}
                        className="flex-1 bg-black text-white text-[10px] font-bold py-1 border border-black hover:bg-neutral-800 flex items-center justify-center gap-1"
                      >
                        {isSuccess ? <Check className="w-3 h-3 text-neo-green" /> : <Plus className="w-3 h-3" />}
                        {isSuccess ? 'ADDED!' : 'CONFIRM'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPresetId(null);
                          setCustomName('');
                          setCustomAmount('');
                        }}
                        className="bg-white text-black text-[10px] font-bold px-1.5 py-1 border border-black hover:bg-neutral-200"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handlePresetClick(preset)}
                    className="w-full bg-white hover:bg-black hover:text-white border border-black text-[10px] font-black py-1 transition-colors flex items-center justify-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    {isSuccess ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" /> ADDED!
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" /> ADD {formatINR(preset.defaultAmount)}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
