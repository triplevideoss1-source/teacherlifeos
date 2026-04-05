import React, { useState, useMemo } from 'react';
import { AppState, Transaction } from '../types';
import { useTranslation } from '../lib/translations';
import { soundService } from '../services/sounds';
import { exportToCSV } from '../lib/exportUtils';
import { DollarSign, ArrowUpRight, ArrowDownLeft, Plus, PieChart, Tag, Calendar, TrendingUp, Filter, Wallet, Download, Edit2, Trash2, Settings, Check, X, Repeat, Copy } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: AppState) => void;
}

type TimeRange = '3M' | '6M' | '1Y' | 'ALL';

const FinanceModule: React.FC<Props> = ({ state, updateState }) => {
  const { t } = useTranslation(state.language);
  const locale = state.language === 'fr' ? 'fr-FR' : state.language === 'ar' ? 'ar' : 'en-US';
  const [activeTab, setActiveTab] = useState<'activity' | 'recurring' | 'budgets'>('activity');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Other');
  const [isFixed, setIsFixed] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Recurring state
  const [recurringDay, setRecurringDay] = useState('1');
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);

  // Budget state
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetCategory, setBudgetCategory] = useState('Food');
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'weekly'>('monthly');

  const categoriesList = state.financeCategories || ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Education', 'Subscriptions', 'Other'];
  const fixedItems = state.fixedItems || [];
  const budgets = state.budgets || [];

  const resetForm = () => {
    setDesc('');
    setAmount('');
    setType('expense');
    setCategory('Other');
    setIsFixed(false);
    setDate(new Date().toISOString().split('T')[0]);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount) return;
    
    soundService.play('success');
    
    const transactionData: Transaction = {
      id: editingId || Date.now().toString(),
      description: desc,
      amount: parseFloat(amount),
      type,
      category,
      date,
      isSubscription: isFixed
    };

    if (editingId) {
      updateState({
        ...state,
        transactions: state.transactions.map(t => t.id === editingId ? transactionData : t)
      });
    } else {
      updateState({
        ...state,
        transactions: [transactionData, ...state.transactions]
      });
    }
    
    resetForm();
  };

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setDesc(t.description);
    setAmount(t.amount.toString());
    setType(t.type);
    setCategory(t.category);
    setIsFixed(t.isSubscription);
    setDate(t.date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const duplicateTransaction = (t: Transaction) => {
    setEditingId(null);
    setDesc(t.description);
    setAmount(t.amount.toString());
    setType(t.type);
    setCategory(t.category);
    setIsFixed(t.isSubscription);
    setDate(new Date().toISOString().split('T')[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteTransaction = (id: string) => {
    if (confirm(t('confirmDeleteTransaction'))) {
      updateState({
        ...state,
        transactions: state.transactions.filter(t => t.id !== id)
      });
    }
  };

  const addCategory = () => {
    if (!newCategoryName || categoriesList.includes(newCategoryName)) return;
    updateState({
      ...state,
      financeCategories: [...categoriesList, newCategoryName]
    });
    setNewCategoryName('');
  };

  const removeCategory = (cat: string) => {
    if (cat === 'Other') return;
    updateState({
      ...state,
      financeCategories: categoriesList.filter(c => c !== cat)
    });
    if (category === cat) setCategory('Other');
  };

  // --- Recurring & Budget Handlers ---

  const handleAddFixed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount) return;
    
    const newItem = {
      id: editingFixedId || Date.now().toString(),
      description: desc,
      amount: parseFloat(amount),
      type,
      category,
      dayOfMonth: parseInt(recurringDay),
      active: true
    };

    if (editingFixedId) {
      updateState({
        ...state,
        fixedItems: fixedItems.map(item => item.id === editingFixedId ? newItem : item)
      });
    } else {
      updateState({
        ...state,
        fixedItems: [...fixedItems, newItem]
      });
    }
    
    resetForm();
    setEditingFixedId(null);
    setShowAddForm(false);
    soundService.play('success');
  };

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetLimit) return;

    const newBudget = {
      category: budgetCategory,
      limit: parseFloat(budgetLimit),
      period: budgetPeriod
    };

    const existingIndex = budgets.findIndex(b => b.category === budgetCategory);
    let newBudgets = [...budgets];
    if (existingIndex >= 0) {
      newBudgets[existingIndex] = newBudget;
    } else {
      newBudgets.push(newBudget);
    }

    updateState({ ...state, budgets: newBudgets });
    setBudgetLimit('');
    soundService.play('success');
  };

  const deleteFixed = (id: string) => {
    updateState({ ...state, fixedItems: fixedItems.filter(i => i.id !== id) });
  };

  const deleteBudget = (cat: string) => {
    updateState({ ...state, budgets: budgets.filter(b => b.category !== cat) });
  };

  const applyRecurring = () => {
    const today = new Date().toISOString().split('T')[0];
    const newTransactions = fixedItems
      .filter(item => item.active)
      .map(item => ({
        id: `rec-${item.id}-${Date.now()}`,
        description: item.description,
        amount: item.amount,
        type: item.type,
        category: item.category,
        date: today,
        isSubscription: true
      }));

    updateState({
      ...state,
      transactions: [...newTransactions, ...state.transactions]
    });
    soundService.play('success');
  };

  // --- Filtering & Aggregation ---

  const { filteredTransactions, chartData, summary, categories } = useMemo(() => {
      const now = new Date();
      let startDate = new Date();
      
      if (timeRange === '3M') startDate.setMonth(now.getMonth() - 3);
      else if (timeRange === '6M') startDate.setMonth(now.getMonth() - 6);
      else if (timeRange === '1Y') startDate.setFullYear(now.getFullYear() - 1);
      else startDate = new Date(0); // ALL

      // Filter transactions
      const filtered = state.transactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate >= startDate && tDate <= now;
      }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Summary Stats for Range
      const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      // Category Breakdown for Range
      const expByCat = filtered
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);
      
      const sortedCats = (Object.entries(expByCat) as [string, number][])
        .sort(([, a], [, b]) => b - a);

      // Chart Data Generation (Monthly Aggregation)
      const monthlyData: Record<string, { income: number, expense: number }> = {};
      
      // Initialize months for the range to ensure x-axis continuity
      const monthsToGenerate = timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : timeRange === '1Y' ? 12 : 0;
      if (monthsToGenerate > 0) {
          for(let i = monthsToGenerate - 1; i >= 0; i--) {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              const key = d.toISOString().slice(0, 7); // YYYY-MM
              monthlyData[key] = { income: 0, expense: 0 };
          }
      } else {
           // For ALL, find min date
           if (filtered.length > 0) {
               const minDate = new Date(filtered[filtered.length - 1].date);
               const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
               while (start <= now) {
                   const key = start.toISOString().slice(0, 7);
                   monthlyData[key] = { income: 0, expense: 0 };
                   start.setMonth(start.getMonth() + 1);
               }
           }
      }

      // Populate Data
      filtered.forEach(t => {
          const key = t.date.slice(0, 7);
          if (monthlyData[key]) {
              if (t.type === 'income') monthlyData[key].income += t.amount;
              else monthlyData[key].expense += t.amount;
          }
      });

      const chart = Object.entries(monthlyData).map(([key, val]) => ({
          label: key,
          ...val
      })).sort((a,b) => a.label.localeCompare(b.label));

      return { filteredTransactions: filtered, chartData: chart, summary: { income, expense }, categories: sortedCats };
  }, [state.transactions, timeRange]);


  // Helper for Chart Rendering
  const maxChartVal = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 100);

  const handleDownload = () => {
    if (filteredTransactions.length === 0) {
      alert(t('noDataDownload'));
      return;
    }
    const filename = `finance_report_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(filteredTransactions, filename);
  };

   return (
     <div className="space-y-4 md:space-y-6 pb-12 animate-fade-in-up">
       <header className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                  <Wallet className="w-8 h-8 text-indigo-500" /> {t('finance')}
                </h1>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{t('finance')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <button 
                    onClick={handleDownload}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm font-bold text-xs"
                >
                    <Download className="w-4 h-4" /> {t('export')}
                </button>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                    {(['3M', '6M', '1Y', 'ALL'] as const).map(r => (
                        <button 
                          key={r}
                          onClick={() => setTimeRange(r)}
                          className={`px-4 py-2 text-[10px] font-bold rounded-xl transition-all ${timeRange === r ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 w-full overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('activity')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'activity' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-slate-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <TrendingUp className="w-4 h-4" /> {t('activity')}
            </button>
            <button 
              onClick={() => setActiveTab('recurring')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'recurring' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-slate-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Repeat className="w-4 h-4" /> {t('recurring')}
            </button>
            <button 
              onClick={() => setActiveTab('budgets')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'budgets' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-slate-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <PieChart className="w-4 h-4" /> {t('budgets')}
            </button>
          </div>
       </header>

       {activeTab === 'activity' && (
         <>
           {/* Top Stats Cards */}
           <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1 -mx-1 px-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:mx-0 sm:gap-4 md:gap-6">
            <div className="min-w-[calc(100vw-2.75rem)] sm:min-w-0 snap-start bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                        <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('income')}</span>
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 break-words">${summary.income.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                <div className="text-[10px] font-bold text-emerald-500 mt-2 uppercase tracking-tight">{t('totalForPeriod')}</div>
            </div>
            <div className="min-w-[calc(100vw-2.75rem)] sm:min-w-0 snap-start bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                        <ArrowDownLeft className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('expenses')}</span>
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 break-words">${summary.expense.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                <div className="text-[10px] font-bold text-rose-500 mt-2 uppercase tracking-tight">{t('totalForPeriod')}</div>
            </div>
            <div className="min-w-[calc(100vw-2.75rem)] sm:min-w-0 snap-start bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:shadow-md transition-all border-b-4 border-b-indigo-500">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('netBalance')}</span>
                </div>
                <div className={`text-xl sm:text-2xl md:text-3xl font-bold break-words ${summary.income - summary.expense >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-500'}`}>
                    ${(summary.income - summary.expense).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </div>
                <div className="text-[10px] font-bold text-indigo-500 mt-2 uppercase tracking-tight">{t('currentSavings')}</div>
            </div>
       </div>

       {/* Charts Section */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Bar Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
             <div className="flex items-center justify-between mb-8">
                <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                   <TrendingUp className="w-5 h-5 text-indigo-500" /> {t('cashFlow')}
                </h2>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('income')}</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('expenses')}</span>
                   </div>
                </div>
             </div>
             
             <div className="flex-1 min-h-[180px] md:min-h-[280px] flex items-end justify-between gap-1 md:gap-4 px-1 md:px-2">
                {chartData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full mb-3 hidden group-hover:block bg-slate-900 dark:bg-slate-800 text-white text-[10px] md:text-xs p-3 rounded-2xl z-30 shadow-2xl min-w-[140px] border border-slate-700 dark:border-slate-600 animate-fade-in">
                            <div className="font-bold mb-2 border-b border-slate-700 pb-1.5 text-slate-300">{new Date(d.label + '-02').toLocaleDateString(locale, {month: 'long', year: 'numeric'})}</div>
                            <div className="flex justify-between gap-4 text-emerald-400 font-bold mb-1"><span>{t('income')}:</span> <span>${d.income.toFixed(0)}</span></div>
                            <div className="flex justify-between gap-4 text-rose-400 font-bold"><span>{t('expenses')}:</span> <span>${d.expense.toFixed(0)}</span></div>
                        </div>
                        
                        {/* Bars */}
                        <div className="w-full h-full flex items-end justify-center gap-0.5 md:gap-1.5">
                                <div 
                                style={{ height: `${Math.max(4, (d.income / maxChartVal) * 100)}%` }} 
                                className="w-full max-w-[10px] md:max-w-[24px] bg-emerald-500 rounded-t-lg opacity-80 group-hover:opacity-100 transition-all duration-700 relative shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                ></div>
                                <div 
                                style={{ height: `${Math.max(4, (d.expense / maxChartVal) * 100)}%` }} 
                                className="w-full max-w-[10px] md:max-w-[24px] bg-rose-500 rounded-t-lg opacity-80 group-hover:opacity-100 transition-all duration-700 relative shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                                ></div>
                        </div>
                        
                        {/* X-Axis Label */}
                        <div className="mt-4 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter sm:tracking-normal">
                            {new Date(d.label + '-02').toLocaleDateString(locale, { month: 'short' })}
                        </div>
                    </div>
                ))}
                {chartData.length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium italic">{t('noDataAvailable')}</div>
                )}
             </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-y-auto max-h-[350px] md:max-h-[450px] custom-scrollbar">
             <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 mb-8 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-amber-500" /> {t('spendingDistribution')}
             </h2>
             <div className="space-y-6">
                {categories.length > 0 ? (
                    categories.map(([cat, amt]) => {
                        const totalRangeExpense = summary.expense;
                        const percentage = totalRangeExpense > 0 ? (amt / totalRangeExpense) * 100 : 0;
                        return (
                            <div key={cat} className="group">
                                <div className="flex justify-between text-xs md:text-sm mb-2">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"></div> {cat}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold tracking-tight">${amt.toLocaleString(undefined, {minimumFractionDigits: 0})} ({percentage.toFixed(0)}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="bg-indigo-500 h-full rounded-full transition-all duration-1000 group-hover:bg-indigo-400" 
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-600">
                        <Filter className="w-10 h-10 mb-3 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">{t('noDataFound')}</p>
                    </div>
                )}
             </div>
          </div>
       </div>
      </>)}
       
       {activeTab === 'recurring' && (
         <div className="space-y-6 animate-fade-in">
           <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
             <div>
               <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('recurringItems')}</h2>
               <p className="text-xs text-slate-500 dark:text-slate-400">{t('manageFixed')}</p>
             </div>
             <div className="flex gap-2">
               <button 
                 onClick={applyRecurring}
                 className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
               >
                 <Repeat className="w-4 h-4" /> {t('applyAll')}
               </button>
               <button 
                 onClick={() => { resetForm(); setShowAddForm(true); }}
                 className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
               >
                 <Plus className="w-4 h-4" /> {t('addNew')}
               </button>
             </div>
           </div>

           {showAddForm && (
             <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl animate-fade-in-down">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-slate-800 dark:text-slate-100">{editingFixedId ? t('editRecurring') : t('newRecurring')}</h3>
                 <button onClick={() => { setShowAddForm(false); setEditingFixedId(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
               </div>
               <form onSubmit={handleAddFixed} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 <div className="sm:col-span-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">{t('description')}</label>
                   <input className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 outline-none" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Rent, Salary, etc." />
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">{t('amount')}</label>
                   <input type="number" className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 outline-none" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">{t('dayOfMonth')}</label>
                   <input type="number" min="1" max="31" className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 outline-none" value={recurringDay} onChange={e => setRecurringDay(e.target.value)} />
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">{t('category')}</label>
                   <select className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 outline-none" value={category} onChange={e => setCategory(e.target.value)}>
                     {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">{t('type')}</label>
                   <select className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 outline-none" value={type} onChange={e => setType(e.target.value as any)}>
                     <option value="expense">{t('expense')}</option>
                     <option value="income">{t('income')}</option>
                   </select>
                 </div>
                 <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-3 mt-2">
                   <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                     {editingFixedId ? t('update') : t('saveRecurring')}
                   </button>
                 </div>
               </form>
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {fixedItems.map(item => (
               <div key={item.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                 <div className="flex justify-between items-start mb-4">
                   <div className={`p-3 rounded-2xl ${item.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'}`}>
                     {item.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                   </div>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => {
                       setEditingFixedId(item.id);
                       setDesc(item.description);
                       setAmount(item.amount.toString());
                       setType(item.type);
                       setCategory(item.category);
                       setRecurringDay(item.dayOfMonth.toString());
                       setShowAddForm(true);
                     }} className="p-2 text-slate-400 hover:text-indigo-500"><Edit2 className="w-4 h-4" /></button>
                     <button onClick={() => deleteFixed(item.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                   </div>
                 </div>
                 <h3 className="font-bold text-slate-800 dark:text-slate-100">{item.description}</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.category} • Day {item.dayOfMonth}</p>
                 <div className="mt-4 flex justify-between items-end">
                   <span className={`text-xl font-bold ${item.type === 'income' ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-100'}`}>
                     ${item.amount.toLocaleString()}
                   </span>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly</span>
                 </div>
               </div>
             ))}
             {fixedItems.length === 0 && (
               <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-300 dark:border-slate-700">
                 <Repeat className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                 <p className="text-slate-500 dark:text-slate-400 font-medium">{t('noRecurringItems')}</p>
               </div>
             )}
           </div>
         </div>
       )}

       {activeTab === 'budgets' && (
         <div className="space-y-6 animate-fade-in">
           <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
             <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">{t('budgetPlanning')}</h2>
             <form onSubmit={handleAddBudget} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
               <div className="sm:col-span-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">{t('category')}</label>
                 <select className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 outline-none" value={budgetCategory} onChange={e => setBudgetCategory(e.target.value)}>
                   {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
               <div>
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">{t('limit')}</label>
                 <input type="number" className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 outline-none" value={budgetLimit} onChange={e => setBudgetLimit(e.target.value)} placeholder="0.00" />
               </div>
               <div>
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">{t('period')}</label>
                 <select className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 outline-none" value={budgetPeriod} onChange={e => setBudgetPeriod(e.target.value as any)}>
                   <option value="monthly">{t('monthly')}</option>
                   <option value="weekly">{t('weekly')}</option>
                 </select>
               </div>
               <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                 {t('setBudget')}
               </button>
             </form>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {budgets.map(budget => {
               const spent = filteredTransactions
                 .filter(t => t.category === budget.category && t.type === 'expense')
                 .reduce((sum, t) => sum + t.amount, 0);
               const percent = Math.min(100, (spent / budget.limit) * 100);
               const isOver = spent > budget.limit;

               return (
                 <div key={budget.category} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group">
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <h3 className="font-bold text-slate-800 dark:text-slate-100">{budget.category}</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{budget.period} {t('limit')}</p>
                     </div>
                     <button onClick={() => deleteBudget(budget.category)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                   </div>
                   
                   <div className="flex justify-between items-end mb-2">
                     <span className={`text-xl font-bold ${isOver ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}`}>
                       ${spent.toLocaleString()} <span className="text-xs text-slate-400 font-medium">/ ${budget.limit.toLocaleString()}</span>
                     </span>
                     <span className={`text-[10px] font-bold uppercase tracking-widest ${isOver ? 'text-rose-500' : 'text-emerald-500'}`}>
                       {percent.toFixed(0)}% {t('used')}
                     </span>
                   </div>

                   <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                     <div 
                       className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                       style={{ width: `${percent}%` }}
                     ></div>
                   </div>
                   
                   {isOver && (
                     <p className="text-[10px] font-bold text-rose-500 mt-3 flex items-center gap-1 uppercase tracking-widest">
                       <ArrowDownLeft className="w-3 h-3" /> {t('budgetExceeded').replace('{amount}', (spent - budget.limit).toLocaleString())}
                     </p>
                   )}
                 </div>
               );
             })}
             {budgets.length === 0 && (
               <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-300 dark:border-slate-700">
                 <PieChart className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                 <p className="text-slate-500 dark:text-slate-400 font-medium">{t('noBudgetsSet')}</p>
               </div>
             )}
           </div>
         </div>
       )}

       {activeTab === 'activity' && (
         <div className="space-y-6">
           {/* Add/Edit Transaction Form */}
           <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                {editingId ? <Edit2 className="w-5 h-5 text-indigo-500" /> : <Plus className="w-5 h-5 text-indigo-500" />}
              </div>
              {editingId ? t('editTransaction') : t('newTransaction')}
            </h2>
            <button 
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full transition-colors"
            >
              <Settings className="w-3 h-3" /> {t('categories')}
            </button>
          </div>

          {showCategoryManager && (
            <div className="mb-8 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 animate-fade-in-down">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('manageCategories')}</h3>
                <button onClick={() => setShowCategoryManager(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                {categoriesList.map(cat => (
                  <span key={cat} className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                    {cat}
                    {cat !== 'Other' && (
                      <button onClick={() => removeCategory(cat)} className="text-slate-300 hover:text-rose-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  className="flex-1 px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" 
                  value={newCategoryName} 
                  onChange={e => setNewCategoryName(e.target.value)} 
                  placeholder={t('categoryName')}                />
                <button 
                  onClick={addCategory}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  {t('add')}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">{t('description')}</label>
              <input className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" value={desc} onChange={e => setDesc(e.target.value)} placeholder={t('whatWasThisFor')} />
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">{t('category')}</label>
              <select className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all appearance-none cursor-pointer" value={category} onChange={e => setCategory(e.target.value)}>
                  {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">{t('amount')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                <input type="number" step="0.01" className="w-full pl-8 pr-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">{t('date')}</label>
              <input type="date" className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="col-span-1 flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">{t('type')}</label>
                <select className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all appearance-none cursor-pointer" value={type} onChange={e => setType(e.target.value as any)}>
                  <option value="expense">{t('expenses')}</option>
                  <option value="income">{t('income')}</option>
                </select>
              </div>
              <div className="flex flex-col justify-end pb-1">
                <button 
                  type="button"
                  onClick={() => setIsFixed(!isFixed)}
                  className={`p-3 rounded-xl border transition-all ${isFixed ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shadow-inner' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300 hover:text-slate-400'}`}
                  title={t('fixedRecurring')}
                >
                  <Repeat className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="col-span-1 sm:col-span-2 lg:col-span-6 flex justify-end gap-3 mt-4">
              {editingId && (
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  {t('cancel')}
                </button>
              )}
              <button type="submit" className="flex-1 sm:flex-none bg-slate-900 dark:bg-slate-700 text-white px-10 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-600 flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20 active:scale-95">
                {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingId ? t('updateEntry') : t('addEntry')}
              </button>
            </div>
          </form>
       </div>

           {/* Transaction History (Filtered) */}
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                     <Calendar className="w-5 h-5 text-indigo-500" /> {t('recentActivity')}
                 </h3>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filteredTransactions.length} {t('entries')}</span>
              </div>
          
          {/* Mobile List View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTransactions.slice(0, 50).map((transaction) => (
              <div key={transaction.id} className="p-5 flex flex-col gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{new Date(transaction.date).toLocaleDateString(locale, {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{transaction.description}</span>
                      {transaction.isSubscription && (
                        <span className="p-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-full">
                          <Repeat className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`text-right font-bold text-base ${transaction.type === 'income' ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-100'}`}>
                    {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                    <Tag className="w-3 h-3" /> {transaction.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => duplicateTransaction(transaction)} className="p-2.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all" title={t('duplicate')}><Copy className="w-4 h-4" /></button>
                    <button onClick={() => startEdit(transaction)} className="p-2.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all" title={t('edit')}><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteTransaction(transaction.id)} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all" title={t('delete')}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="p-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('date')}</th>
                    <th className="p-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('description')}</th>
                    <th className="p-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('category')}</th>
                    <th className="p-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">{t('amount')}</th>
                    <th className="p-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">{t('actions')}</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filteredTransactions.slice(0, 50).map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="p-5 text-slate-500 dark:text-slate-400 text-xs font-medium whitespace-nowrap">{new Date(transaction.date).toLocaleDateString(locale, {month: 'short', day: 'numeric', year: 'numeric'})}</td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{transaction.description}</span>
                            {transaction.isSubscription && (
                              <span className="p-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-full" title={t('fixedRecurring')}>
                                <Repeat className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-5">
                            <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                              <Tag className="w-3 h-3" /> {transaction.category}
                            </span>
                        </td>
                        <td className={`p-5 text-right font-bold text-sm ${transaction.type === 'income' ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-200'}`}>
                          <div className="flex items-center justify-end gap-1.5">
                            {transaction.type === 'income' ? <ArrowUpRight className="w-3.5 h-3.5"/> : <ArrowDownLeft className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600"/>}
                            ${transaction.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </div>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => duplicateTransaction(transaction)}
                              className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
                              title={t('duplicate')}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => startEdit(transaction)}
                              className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                              title={t('edit')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteTransaction(transaction.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                              title={t('delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center text-slate-400 dark:text-slate-600 font-medium italic">{t('noTransactionsFound')}</div>
          )}
          {filteredTransactions.length > 50 && (
              <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                  {t('showingLastEntries').replace('{count}', '50')}
              </div>
          )}
           </div>
         </div>
       )}
    </div>
  );
};

export default FinanceModule;