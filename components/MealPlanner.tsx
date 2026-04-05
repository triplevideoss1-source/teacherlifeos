import React, { useState } from 'react';
import { AppState } from '../types';
import { useTranslation } from '../lib/translations';
import { suggestMealPlan } from '../services/gemini';
import { Utensils, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: AppState) => void;
}

const MealPlanner: React.FC<Props> = ({ state, updateState }) => {
  const { t } = useTranslation(state.language);
  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(false);

  const days = Object.keys(state.meals);
   const todayDate = new Date().toISOString().split('T')[0];
   const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
   const isFastingToday = Boolean(state.ramadanLog[todayDate]?.fasted);

   const handleInputChange = (day: string, type: 'lunch' | 'dinner' | 'suhoor' | 'iftar', value: string) => {
    updateState({
      ...state,
      meals: {
        ...state.meals,
        [day]: {
          ...state.meals[day],
          [type]: value
        }
      }
    });
  };

  const generatePlan = async () => {
     if (!preferences) return;
     setLoading(true);
     // Note: This is a simple implementation. Ideally we parse JSON from Gemini.
     const suggestion = await suggestMealPlan(preferences);
     // For now, we'll just put the suggestion in Monday as a demo, or alert it
     alert("AI Suggestion:\n" + suggestion);
     setLoading(false);
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-12 animate-fade-in-up">
        
        {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 md:gap-6">
           <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                 <Utensils className="w-7 h-7 md:w-8 md:h-8 text-emerald-500" /> {t('meals')}
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{t('meals')}</p>
              {isFastingToday && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                  {t('todayFastingPlan')}
                </p>
              )}
           </div>
           
           <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-64">
                 <input 
                   placeholder={t('dietaryPreferences')} 
                   className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                   value={preferences}
                   onChange={e => setPreferences(e.target.value)}
                 />
              </div>
              <button 
                 onClick={generatePlan}
                 disabled={loading || !preferences}
                 className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition-all shadow-lg shadow-emerald-600/20"
              >
                 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                 {t('aiSuggestPlan')}
              </button>
           </div>
        </div>
         {/* Weekly Grid */}
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:overflow-visible sm:mx-0 sm:px-0 sm:gap-4 md:gap-6">
           {days.map(day => {
           const isFastingCard = isFastingToday && day === todayDay;
           const primaryMeal = isFastingCard ? 'suhoor' : 'lunch';
           const secondaryMeal = isFastingCard ? 'iftar' : 'dinner';
           const primaryLabel = isFastingCard ? t('suhoor') : t('lunch');
           const secondaryLabel = isFastingCard ? t('iftar') : t('dinner');
           const primaryPlaceholder = isFastingCard ? t('suhoorPlaceholder') : t('lunchPlaceholder');
           const secondaryPlaceholder = isFastingCard ? t('iftarPlaceholder') : t('dinnerPlaceholder');

           return (
           <div key={day} className={`min-w-[calc(100vw-2.75rem)] sm:min-w-0 snap-start bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all group border-b-4 ${isFastingCard ? 'border-b-amber-500/60' : 'border-b-emerald-500/20 hover:border-b-emerald-500'}`}>
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-base md:text-lg">
                       <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> {t(day.toLowerCase() as any)}
                    </h3>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isFastingCard ? 'text-amber-500' : 'text-slate-400'}`}>{isFastingCard ? t('fastingDay') : t('dailyMenu')}</span>
                 </div>
                 {isFastingCard && (
                    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium leading-relaxed text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                      {t('fastingMealsAdapted')}
                    </div>
                 )}
                 
                 <div className="space-y-5">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></div> {primaryLabel}
                       </label>
                       <textarea 
                         className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/10 transition-all text-slate-700 dark:text-slate-300 min-h-[80px] resize-none outline-none"
                         value={state.meals[day][primaryMeal] || ''}
                         onChange={e => handleInputChange(day, primaryMeal, e.target.value)}
                         placeholder={primaryPlaceholder}
                       />
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></div> {secondaryLabel}
                       </label>
                       <textarea 
                         className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/10 transition-all text-slate-700 dark:text-slate-300 min-h-[80px] resize-none outline-none"
                         value={state.meals[day][secondaryMeal] || ''}
                         onChange={e => handleInputChange(day, secondaryMeal, e.target.value)}
                         placeholder={secondaryPlaceholder}
                       />
                    </div>
                 </div>
              </div>
           )})}
        </div>
    </div>
  );
};

export default MealPlanner;