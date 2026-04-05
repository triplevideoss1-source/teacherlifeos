import React, { useState, useEffect, useMemo } from 'react';
import { AppState, Dua, RamadanDayLog } from '../types';
import { useTranslation } from '../lib/translations';
import { exportToCSV } from '../lib/exportUtils';
import { ADHKAR_LIST } from '../services/storage';
import { suggestDua } from '../services/gemini';
import { soundService } from '../services/sounds';
import { BookOpen, Moon, Plus, Sparkles, Bookmark, Award, Sun, CheckCircle2, History, Star, TrendingUp, CalendarDays, Utensils, HeartHandshake, Sunrise, Sunset, Clock, Check, RotateCcw, FileText, Loader2, ChevronRight } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: AppState) => void;
  prayerTimes: any;
}

const MuslimModule: React.FC<Props> = ({ state, updateState, prayerTimes }) => {
  const { t } = useTranslation(state.language);
  const [duaTopic, setDuaTopic] = useState('');
  const [loadingDua, setLoadingDua] = useState(false);
  const [isDuaModalOpen, setIsDuaModalOpen] = useState(false);
    const [selectedDuaCategory, setSelectedDuaCategory] = useState<string>('');
  const [adhkarTab, setAdhkarTab] = useState<'morning' | 'evening' | 'sleep'>('morning');
  const [timeLeft, setTimeLeft] = useState<{label: string, time: string} | null>(null);
  
  // Tasbih State
  const [tasbihCount, setTasbihCount] = useState(0);
  const [tasbihTarget, setTasbihTarget] = useState(33);
  
  const todayDate = new Date().toISOString().split('T')[0];

  // --- Countdown Logic ---
  useEffect(() => {
    if (!prayerTimes) return;

    const interval = setInterval(() => {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const parseTime = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };

        const fajr = parseTime(prayerTimes.Fajr);
        const maghrib = parseTime(prayerTimes.Maghrib);

        if (currentTime < fajr) {
            // Counting down to Fajr (Suhoor ends)
            const diff = fajr - currentTime;
            const h = Math.floor(diff / 60);
            const m = diff % 60;
            setTimeLeft({ label: t('suhoorEnds'), time: `${h}h ${m}m` });
        } else if (currentTime >= fajr && currentTime < maghrib) {
            // Counting down to Maghrib (Iftar)
            const diff = maghrib - currentTime;
            const h = Math.floor(diff / 60);
            const m = diff % 60;
            setTimeLeft({ label: t('iftarIn'), time: `${h}h ${m}m` });
        } else {
             // Past Maghrib
             setTimeLeft({ label: t('iftarTime'), time: t('now') });
        }
    }, 60000); // Update every minute
    
    // Initial call
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const parseTime = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };
    const fajr = parseTime(prayerTimes.Fajr);
    const maghrib = parseTime(prayerTimes.Maghrib);
    if (currentTime < fajr) {
        const diff = fajr - currentTime;
        setTimeLeft({ label: t('suhoorEnds'), time: `${Math.floor(diff/60)}h ${diff%60}m` });
    } else if (currentTime >= fajr && currentTime < maghrib) {
        const diff = maghrib - currentTime;
        setTimeLeft({ label: t('iftarIn'), time: `${Math.floor(diff/60)}h ${diff%60}m` });
    } else {
         setTimeLeft({ label: t('iftarTime'), time: t('now') });
    }

    return () => clearInterval(interval);
  }, [prayerTimes]);


  // --- Daily Score Calculation ---
  const sunnahData = state.sunnahs[todayDate] || { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false, witr: false };
  const adhkarData = state.adhkarLog[todayDate] || { morning: false, evening: false, sleep: false };
  
  const totalSunnahs = 5; 
  const completedSunnahs = Object.values(sunnahData).filter(Boolean).length;
  
  const totalAdhkar = 3; 
  const completedAdhkar = Object.values(adhkarData).filter(Boolean).length;
  const quranActivity = state.quran.lastRead.ayah > 1 ? 1 : 0; 
  
  const maxScore = totalSunnahs + totalAdhkar + 1; 
  const currentScore = completedSunnahs + completedAdhkar + quranActivity;
  const scorePercentage = Math.round((currentScore / maxScore) * 100);

  // --- Dua Logic ---
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  const dailyDuas = useMemo(() => {
    if (!state.duas || state.duas.length === 0) return [];
    // Deterministic shuffle based on day of year
    const seed = dayOfYear;
    return [...state.duas]
      .sort((a, b) => {
        const valA = (parseInt(a.id) || 0) * seed;
        const valB = (parseInt(b.id) || 0) * seed;
        return (valA % 101) - (valB % 101);
      })
      .slice(0, 5);
  }, [state.duas, dayOfYear]);

    const duaCategories = useMemo(() => {
        const grouped = state.duas.reduce((acc, dua) => {
            const bucket = acc[dua.category] || [];
            bucket.push(dua);
            acc[dua.category] = bucket;
            return acc;
        }, {} as Record<string, Dua[]>);

        return Object.entries(grouped)
            .map(([category, duas]) => ({
                category,
                duas: duas.slice(0, 3),
                total: duas.length,
            }))
            .sort((left, right) => left.category.localeCompare(right.category));
    }, [state.duas]);

    useEffect(() => {
        if (!duaCategories.length) {
            if (selectedDuaCategory) {
                setSelectedDuaCategory('');
            }
            return;
        }

        const hasSelectedCategory = duaCategories.some(({ category }) => category === selectedDuaCategory);
        if (!hasSelectedCategory) {
            setSelectedDuaCategory(duaCategories[0].category);
        }
    }, [duaCategories, selectedDuaCategory]);

    const activeDuaCategory = useMemo(() => {
        return duaCategories.find(({ category }) => category === selectedDuaCategory) || duaCategories[0] || null;
    }, [duaCategories, selectedDuaCategory]);

  const toggleSunnah = (prayer: keyof typeof sunnahData) => {
      soundService.play('success');
      updateState({
          ...state,
          sunnahs: { ...state.sunnahs, [todayDate]: { ...sunnahData, [prayer]: !sunnahData[prayer] } }
      });
  };

  const toggleAdhkarLog = (time: 'morning' | 'evening' | 'sleep') => {
      soundService.play('success');
      const log = state.adhkarLog[todayDate] || { morning: false, evening: false, sleep: false };
      updateState({
          ...state,
          adhkarLog: { ...state.adhkarLog, [todayDate]: { ...log, [time]: !log[time] } }
      });
  };
  const isAdhkarComplete = state.adhkarLog[todayDate]?.[adhkarTab] || false;

  // --- Ramadan Logic ---
  const defaultRamadanLog: RamadanDayLog = { fasted: false, taraweeh: false, suhoor: false, sadaqah: false, juz: false };
  const ramadanData = state.ramadanLog[todayDate] || defaultRamadanLog;
  
  const toggleRamadan = (field: keyof RamadanDayLog) => {
      soundService.play('success');
      updateState({
          ...state,
          ramadanLog: { ...state.ramadanLog, [todayDate]: { ...ramadanData, [field]: !ramadanData[field] } }
      });
  };
  
  const ramadanDaysFasted = Object.values(state.ramadanLog).filter((d: RamadanDayLog) => d.fasted).length;
  
  const toggleKhatamJuz = (index: number) => {
      soundService.play('click');
      const newKhatam = [...state.khatam];
      newKhatam[index] = !newKhatam[index];
      updateState({ ...state, khatam: newKhatam });
  };
  const juzCompleted = state.khatam.filter(Boolean).length;

  const handleAiDua = async () => {
    if (!duaTopic) return;
    setLoadingDua(true);
    const result = await suggestDua(duaTopic);
    const newDua: Dua = {
        id: Date.now().toString(),
        title: duaTopic,
        translation: result,
        category: 'AI Generated'
    };
    updateState({ ...state, duas: [...state.duas, newDua] });
    setLoadingDua(false);
    setDuaTopic('');
    setIsDuaModalOpen(false);
  };

  const updateQuran = (type: 'lastRead' | 'memorization', field: 'surah' | 'ayah', value: string | number) => {
    updateState({
        ...state,
        quran: { ...state.quran, [type]: { ...state.quran[type], [field]: value } }
    });
  };

  const handleTasbihClick = () => {
      soundService.play('click');
      if ('vibrate' in navigator) {
          navigator.vibrate(10);
      }
      if (tasbihCount >= tasbihTarget) {
          soundService.play('success');
          setTasbihCount(1);
      } else {
          setTasbihCount(prev => prev + 1);
      }
  };

  const handleExportCSV = () => {
    const combinedData = [];
    
    // Add Ramadan logs
    Object.entries(state.ramadanLog).forEach(([date, log]) => {
      combinedData.push({ type: 'Ramadan', date, ...Object(log) });
    });
    
    // Add Sunnah logs
    Object.entries(state.sunnahs).forEach(([date, log]) => {
      combinedData.push({ type: 'Sunnah', date, ...Object(log) });
    });
    
    // Add Adhkar logs
    Object.entries(state.adhkarLog).forEach(([date, log]) => {
      combinedData.push({ type: 'Adhkar', date, ...Object(log) });
    });

    if (combinedData.length === 0) {
      alert("No data to export.");
      return;
    }

    const filename = `muslim_life_export_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(combinedData, filename);
  };

  const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date());

  return (
     <div className="space-y-5 md:space-y-8 pb-12 animate-fade-in-up">
         <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 md:gap-6 bg-white dark:bg-slate-900 p-5 md:p-8 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                    <Moon className="w-6 h-6" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">{t('muslim')}</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">{t('muhasabah')}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
             <div className="flex-1 min-w-0 lg:flex-none bg-emerald-50 dark:bg-emerald-900/20 px-5 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 flex items-center gap-4">
                <div className="text-right flex-1">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-0.5">{t('hijriDate')}</span>
                    <p className="text-emerald-900 dark:text-emerald-100 font-serif text-base md:text-lg font-bold leading-snug break-words">{hijriDate}</p>
                </div>
                <CalendarDays className="w-6 h-6 text-emerald-500 opacity-50" />
             </div>
             
             <div className="flex gap-2 w-full sm:w-auto">
                <button 
                    onClick={() => updateState({...state, ramadanMode: !state.ramadanMode})}
                    className={`flex-1 sm:flex-none px-5 py-3 text-xs font-bold rounded-2xl border transition-all flex items-center justify-center gap-2 ${state.ramadanMode ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                    <Star className={`w-4 h-4 ${state.ramadanMode ? 'fill-white' : ''}`} />
                    {state.ramadanMode ? t('ramadanMode') : t('standardMode')}
                </button>
                <button 
                    onClick={handleExportCSV}
                    className="p-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm"
                    title={t('export')}
                >
                    <FileText className="w-5 h-5" />
                </button>
              </div>
           </div>
        </header>

        {/* --- DAILY PRIORITIES --- */}
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 md:grid md:grid-cols-3 md:overflow-visible md:mx-0 md:px-0 md:gap-4 mb-6 md:mb-8">
            <div className="min-w-[calc(100vw-2.75rem)] md:min-w-0 snap-start bg-gradient-to-br from-emerald-500 to-teal-600 p-5 md:p-6 rounded-[2rem] text-white shadow-lg shadow-emerald-200 dark:shadow-none relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                    <Sun className="w-12 h-12" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">{t('priority', { num: 1 })}</h3>
                <div className="text-xl font-bold mb-1">{t('fardPrayers')}</div>
                <div className="text-xs opacity-90">{t('neverMissPrayer')}</div>
            </div>
            <div className="min-w-[calc(100vw-2.75rem)] md:min-w-0 snap-start bg-gradient-to-br from-indigo-500 to-blue-600 p-5 md:p-6 rounded-[2rem] text-white shadow-lg shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-12 h-12" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">{t('priority', { num: 2 })}</h3>
                <div className="text-xl font-bold mb-1">{t('quranConnection')}</div>
                <div className="text-xs opacity-90">{t('readOnePage')}</div>
            </div>
            <div className="min-w-[calc(100vw-2.75rem)] md:min-w-0 snap-start bg-gradient-to-br from-amber-500 to-orange-600 p-5 md:p-6 rounded-[2rem] text-white shadow-lg shadow-amber-200 dark:shadow-none relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                    <History className="w-12 h-12" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">{t('priority', { num: 3 })}</h3>
                <div className="text-xl font-bold mb-1">{t('morningEveningAdhkar')}</div>
                <div className="text-xs opacity-90">{t('protectSoul')}</div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Utensils className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">{t('fastingDay')}</span>
                    </div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100">{ramadanData.fasted ? t('fastedToday') : t('markFastingDay')}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t('fastingTodayDesc')}</p>
                    {timeLeft && ramadanData.fasted && (
                        <div className="mt-4 inline-flex max-w-full items-center gap-3 rounded-2xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                            <Clock className="w-4 h-4 shrink-0" />
                            <span className="break-words">{timeLeft.label}: {timeLeft.time}</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-stretch gap-3 sm:items-end">
                    <button
                        onClick={() => toggleRamadan('fasted')}
                        className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.18em] transition-all ${ramadanData.fasted ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'}`}
                    >
                        {ramadanData.fasted ? t('fastedToday') : t('markFastingDay')}
                    </button>
                    <div className="text-xs text-slate-500 dark:text-slate-400 sm:max-w-xs">{t('fastingMealsAdapted')}</div>
                </div>
            </div>
        </div>

        {/* --- RAMADAN DASHBOARD --- */}
       {state.ramadanMode && (
           <div className="animate-fade-in-up space-y-4 md:space-y-6">
                
                {/* 1. Hero Card */}
                <div className="bg-slate-900 text-white p-5 md:p-8 rounded-3xl shadow-2xl border border-emerald-900/50 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                   <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
 
                   <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-center">
                        <div className="text-center lg:text-left">
                           <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                               <Moon className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                               <span className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">{t('ramadanKareem')}</span>
                           </div>
                           <h2 className="text-2xl md:text-4xl font-bold mb-1 tracking-tight">{t('makeMomentCount')}</h2>
                           <p className="text-slate-400 text-xs md:text-sm mb-6">{t('ramadanDay', { day: ramadanDaysFasted + 1 })}</p>
                           
                           {timeLeft && (
                               <div className="inline-flex items-center gap-3 md:gap-4 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
                                   <Clock className="w-6 h-6 md:w-8 md:h-8 text-emerald-300" />
                                   <div className="text-left">
                                       <div className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider">{timeLeft.label}</div>
                                       <div className="text-xl md:text-2xl font-mono font-bold tracking-tighter">{timeLeft.time}</div>
                                   </div>
                               </div>
                           )}
                       </div>

                       <div className="grid grid-cols-2 gap-2 md:gap-3">
                           <div className="bg-slate-800/50 p-3 md:p-4 rounded-2xl border border-slate-700 text-center">
                               <div className="text-slate-400 text-[10px] uppercase font-bold mb-1 tracking-wider">{t('suhoorEnds')}</div>
                               <div className="text-lg md:text-2xl font-bold text-white tabular-nums">{prayerTimes?.Fajr || '--:--'}</div>
                           </div>
                           <div className="bg-slate-800/50 p-3 md:p-4 rounded-2xl border border-slate-700 text-center">
                               <div className="text-slate-400 text-[10px] uppercase font-bold mb-1 tracking-wider">{t('iftarTime')}</div>
                               <div className="text-lg md:text-2xl font-bold text-white tabular-nums">{prayerTimes?.Maghrib || '--:--'}</div>
                           </div>
                           <div className="col-span-2 bg-emerald-900/30 p-4 rounded-2xl border border-emerald-800/50">
                               <div className="text-emerald-400 text-[10px] uppercase font-bold mb-2 tracking-wider">{t('duaBreakingFast')}</div>
                               <div className="text-right font-serif text-lg md:text-xl leading-relaxed mb-2 text-emerald-50">{t('duaBreakingFastArabic')}</div>
                               <div className="text-[10px] md:text-xs text-emerald-200/70 italic leading-snug">{t('duaBreakingFastMeaning')}</div>
                           </div>
                       </div>
                   </div>
                </div>
 
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* 2. Daily Deed Grid */}
                    <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <Star className="w-5 h-5 text-yellow-500" /> {t('dailyDeeds')}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3">
                            <button onClick={() => toggleRamadan('suhoor')} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${ramadanData.suhoor ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${ramadanData.suhoor ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}><Sunrise className="w-4 h-4" /></div>
                                    <span className="font-bold text-xs md:text-sm text-slate-700 dark:text-slate-300">{t('ateSuhoor')}</span>
                                </div>
                                {ramadanData.suhoor && <CheckCircle2 className="w-5 h-5 text-indigo-500" />}
                            </button>
 
                            <button onClick={() => toggleRamadan('fasted')} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${ramadanData.fasted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${ramadanData.fasted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}><Utensils className="w-4 h-4" /></div>
                                    <span className="font-bold text-xs md:text-sm text-slate-700 dark:text-slate-300">{t('fastedToday')}</span>
                                </div>
                                {ramadanData.fasted && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                            </button>
 
                            <button onClick={() => toggleRamadan('sadaqah')} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${ramadanData.sadaqah ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${ramadanData.sadaqah ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}><HeartHandshake className="w-4 h-4" /></div>
                                    <span className="font-bold text-xs md:text-sm text-slate-700 dark:text-slate-300">{t('gaveSadaqah')}</span>
                                </div>
                                {ramadanData.sadaqah && <CheckCircle2 className="w-5 h-5 text-amber-500" />}
                            </button>
 
                            <button onClick={() => toggleRamadan('taraweeh')} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${ramadanData.taraweeh ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${ramadanData.taraweeh ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}><Moon className="w-4 h-4" /></div>
                                    <span className="font-bold text-xs md:text-sm text-slate-700 dark:text-slate-300">{t('prayedTaraweeh')}</span>
                                </div>
                                {ramadanData.taraweeh && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                            </button>
                            
                            <button onClick={() => toggleRamadan('juz')} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${ramadanData.juz ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${ramadanData.juz ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}><BookOpen className="w-4 h-4" /></div>
                                    <span className="font-bold text-xs md:text-sm text-slate-700 dark:text-slate-300">{t('readDailyJuz')}</span>
                                </div>
                                {ramadanData.juz && <CheckCircle2 className="w-5 h-5 text-purple-500" />}
                            </button>
                        </div>
                    </div>
 
                    {/* 3. Khatam Tracker */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 rounded-3xl shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                             <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Bookmark className="w-5 h-5 text-emerald-500" /> Quran Khatam Tracker
                             </h3>
                             <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full uppercase tracking-wider">
                                 {t('juzCompleted', { completed: juzCompleted })}
                             </span>
                        </div>
                        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2 md:gap-3">
                             {state.khatam.map((isRead, idx) => (
                                 <button 
                                    key={idx} 
                                    onClick={() => toggleKhatamJuz(idx)}
                                    className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all relative overflow-hidden group ${isRead ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-emerald-400'}`}
                                 >
                                     <span className="text-[8px] uppercase font-bold opacity-60">Juz</span>
                                     <span className="text-sm md:text-lg font-bold">{idx + 1}</span>
                                     {isRead && <div className="absolute inset-0 bg-white/20 animate-pulse-slow"></div>}
                                 </button>
                             ))}
                        </div>
                        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                             <div className="flex items-center gap-2 mb-2">
                                 <Award className="w-4 h-4 text-amber-500" />
                                 <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Khatam Progress</span>
                             </div>
                             <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 md:h-3 rounded-full overflow-hidden">
                                 <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-1000" style={{width: `${(juzCompleted/30)*100}%`}}></div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {/* Daily Ibadah Score (Standard) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 md:p-10 rounded-[2rem] md:rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-6 md:gap-8 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none"></div>
                
                <div className="relative z-10 text-center sm:text-left">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('spiritualProgress')}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-md">{t('spiritualGrowthDesc')}</p>
                    
                    <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:border-emerald-200">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-widest">{t('sunnahCount', { completed: completedSunnahs, total: totalSunnahs })}</span>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:border-blue-200">
                            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                            <span className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-widest">{t('adhkarCount', { completed: completedAdhkar, total: totalAdhkar })}</span>
                        </div>
                    </div>
                </div>
                
                {/* Progress Ring */}
                <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center shrink-0 group">
                    <div className="absolute inset-0 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all"></div>
                    <svg className="w-full h-full transform -rotate-90 relative z-10">
                        <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                        <circle 
                         cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="12" fill="transparent" 
                         strokeDasharray="264" 
                         strokeDashoffset={264 - (264 * scorePercentage) / 100} 
                         className="text-emerald-500 transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                         strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center z-20">
                        <span className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tighter">{scorePercentage}%</span>
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-[0.2em]">{t('dailyGoal')}</span>
                    </div>
                </div>
            </div>
  
            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 text-white flex flex-col justify-center items-center shadow-xl shadow-indigo-500/20 text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                    <Sparkles className="w-24 h-24" />
                </div>
                <div className="relative z-10">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-4xl md:text-5xl font-bold tracking-tighter tabular-nums mb-1 break-words">{completedSunnahs + completedAdhkar}</div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">{t('goodDeedsLogged')}</div>
                </div>
            </div>
        </div>
        
        {/* DIGITAL TASBIH WIDGET */}
        <div className="bg-slate-900 dark:bg-slate-950 p-5 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center group">
           <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors pointer-events-none"></div>
           <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
           
           <h2 className="text-base md:text-xl font-bold text-emerald-100 mb-8 z-10 flex items-center gap-3">
             <div className="p-2 bg-emerald-500/20 rounded-xl">
                <RotateCcw className="w-5 h-5 text-emerald-400" />
             </div>
             {t('digitalTasbih')}
           </h2>
  
              <div 
              onClick={handleTasbihClick}
                  className="w-40 h-40 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-8 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_2px_10px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all select-none z-10 hover:border-emerald-500/30 group/btn relative"
           >
              <div className="absolute inset-0 rounded-full bg-emerald-500/0 group-active/btn:bg-emerald-500/5 transition-colors"></div>
                  <div className="text-5xl sm:text-6xl md:text-8xl font-mono font-bold text-emerald-400 tabular-nums drop-shadow-[0_0_20px_rgba(52,211,153,0.4)] group-active/btn:scale-110 transition-transform">{tasbihCount}</div>
              <div className="text-[10px] text-slate-500 mt-4 uppercase tracking-[0.3em] font-bold opacity-60">{t('tapToCount')}</div>
           </div>
  
           <div className="flex flex-wrap justify-center gap-8 mt-10 z-10">
               <div className="flex flex-col items-center">
                   <span className="text-[10px] text-slate-500 uppercase font-bold mb-3 tracking-widest opacity-60">{t('targetGoal')}</span>
                   <div className="flex bg-slate-800/50 backdrop-blur-md rounded-2xl p-1.5 border border-slate-700/50">
                       <button onClick={() => setTasbihTarget(33)} className={`px-6 py-2 text-xs font-bold rounded-xl transition-all ${tasbihTarget === 33 ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>33</button>
                       <button onClick={() => setTasbihTarget(100)} className={`px-6 py-2 text-xs font-bold rounded-xl transition-all ${tasbihTarget === 100 ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>100</button>
                   </div>
               </div>
               <div className="flex flex-col items-center justify-end">
                    <button onClick={() => setTasbihCount(0)} className="p-4 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all border border-transparent hover:border-rose-500/20 group/reset" title="Reset Counter">
                        <RotateCcw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
                    </button>
               </div>
           </div>
        </div>
  
        {/* Sunnah Tracker */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-sm">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-8 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                    <Sun className="w-5 h-5 text-emerald-500" />
                </div>
                {t('sunnahWitrPrayers')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {[
                    { id: 'fajr', label: t('fajr'), detail: t('rakahCount', { count: 2 }) },
                    { id: 'dhuhr', label: t('dhuhr'), detail: t('rakahCount', { count: '4+2' }) },
                    { id: 'maghrib', label: t('maghrib'), detail: t('rakahCount', { count: 2 }) },
                    { id: 'isha', label: t('isha'), detail: t('rakahCount', { count: 2 }) },
                    { id: 'witr', label: t('witr'), detail: t('rakahCount', { count: '1+' }) },
                ].map((prayer) => {
                    const isDone = sunnahData[prayer.id as keyof typeof sunnahData];
                    return (
                        <button 
                            key={prayer.id}
                            onClick={() => toggleSunnah(prayer.id as any)}
                            className={`p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border text-center transition-all group relative overflow-hidden ${isDone ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-100 dark:shadow-none scale-105' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-emerald-400 hover:bg-white dark:hover:bg-slate-700'}`}
                        >
                            <div className="relative z-10">
                                <div className="font-bold text-base md:text-lg mb-1">{prayer.label}</div>
                                <div className={`text-[10px] md:text-xs font-bold uppercase tracking-widest ${isDone ? 'text-emerald-100' : 'text-slate-400'}`}>{prayer.detail}</div>
                            </div>
                            {isDone && (
                                <div className="absolute top-2 right-2">
                                    <Check className="w-4 h-4 text-emerald-200" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: Adhkar & Quran */}
            <div className="lg:col-span-2 space-y-8">
                 {/* Adhkar Section */}
                 <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                           <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                               <History className="w-5 h-5 text-indigo-600" />
                           </div>
                           {t('dailyAdhkar')}
                        </h2>
                        <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl border border-slate-100 dark:border-slate-700 w-full sm:w-auto">
                            {(['morning', 'evening', 'sleep'] as const).map(tab => (
                                <button 
                                    key={tab}
                                    onClick={() => setAdhkarTab(tab)}
                                    className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${adhkarTab === tab ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {t(tab as any)}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="space-y-3 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {ADHKAR_LIST.filter(a => a.time === adhkarTab).map(adhkar => (
                            <div key={adhkar.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-all group">
                                <div className="flex-1 mr-4">
                                    <p className="font-medium text-slate-800 dark:text-slate-200 text-sm leading-relaxed">{adhkar.text}</p>
                                </div>
                                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm group-hover:scale-110 transition-transform">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{adhkar.count}</span>
                                    <span className="text-[8px] text-slate-400 font-bold uppercase">{t('times')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <button 
                        onClick={() => toggleAdhkarLog(adhkarTab)}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-lg ${isAdhkarComplete ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-emerald-100/50' : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 shadow-slate-900/20'}`}
                    >
                        {isAdhkarComplete ? <><CheckCircle2 className="w-5 h-5"/> {t('sessionLogged')}</> : t('markComplete')}
                    </button>
                 </div>

                 {/* Quran Journal */}
                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                                <Bookmark className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            {t('quranJournal')}
                        </h2>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700">
                            {t('dailyProgress')}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 group hover:border-amber-200 dark:hover:border-amber-900/50 transition-all">
                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-4 flex items-center gap-2 tracking-widest">
                                <BookOpen className="w-4 h-4 text-amber-500" /> {t('lastRead')}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1.5 ml-1 uppercase">{t('surahName')}</label>
                                    <input 
                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" 
                                        value={state.quran?.lastRead?.surah || ''} 
                                        onChange={e => updateQuran('lastRead', 'surah', e.target.value)}
                                        placeholder={t('egAlBaqarah')}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1.5 ml-1 uppercase">{t('ayahNumber')}</label>
                                    <input 
                                        type="number"
                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" 
                                        value={state.quran?.lastRead?.ayah || ''} 
                                        onChange={e => updateQuran('lastRead', 'ayah', parseInt(e.target.value))}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 group hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all">
                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-4 flex items-center gap-2 tracking-widest">
                                <Award className="w-4 h-4 text-indigo-500" /> {t('hifz')}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1.5 ml-1 uppercase">{t('surahName')}</label>
                                    <input 
                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" 
                                        value={state.quran?.memorization?.surah || ''} 
                                        onChange={e => updateQuran('memorization', 'surah', e.target.value)}
                                        placeholder={t('egAnNaba')}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1.5 ml-1 uppercase">{t('ayahNumber')}</label>
                                    <input 
                                        type="number"
                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" 
                                        value={state.quran?.memorization?.ayah || ''} 
                                        onChange={e => updateQuran('memorization', 'ayah', parseInt(e.target.value))}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
            </div>

            {/* Right Col: Dua Vault */}
            <div className="space-y-6">
                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm flex flex-col h-full">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            {t('duaVault')}
                        </h2>
                        <button 
                            onClick={() => setIsDuaModalOpen(!isDuaModalOpen)}
                            className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full border border-indigo-100 dark:border-indigo-800 uppercase tracking-widest hover:bg-indigo-100 transition-all"
                        >
                            {isDuaModalOpen ? t('close') : t('addCustom')}
                        </button>
                    </div>

                    {isDuaModalOpen && (
                        <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 animate-fade-in-down">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4 font-bold uppercase tracking-widest">{t('askAiDua')}</p>
                            <div className="flex flex-col gap-3">
                                <input 
                                    value={duaTopic}
                                    onChange={e => setDuaTopic(e.target.value)}
                                    placeholder={t('egPatienceExams')} 
                                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                />
                                <button 
                                    onClick={handleAiDua} 
                                    disabled={loadingDua}
                                    className="w-full bg-indigo-600 text-white px-4 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                                >
                                    {loadingDua ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {loadingDua ? t('generating') : t('generateWithAi')}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t('dailyRotation')}</h3>
                            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 ml-4"></div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {dailyDuas.map(dua => (
                                <div key={dua.id} className="p-5 bg-amber-50/50 dark:bg-slate-800/40 rounded-3xl border border-amber-100/50 dark:border-slate-700 group hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[8px] font-bold text-amber-600 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-lg uppercase tracking-widest">{dua.category}</span>
                                    </div>
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1">{dua.title}</h3>
                                    {dua.arabic && <p className="text-right font-serif text-xl text-slate-800 dark:text-slate-200 my-4 leading-loose">{dua.arabic}</p>}
                                    <p className="text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed">"{dua.translation}"</p>
                                </div>
                            ))}
                        </div>

                                                <div className="pt-8 mt-4 border-t border-slate-100 dark:border-slate-800">
                                                         <div className="flex items-center justify-between mb-4 gap-3">
                                                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t('savedDuasCount', { count: state.duas.length })}</h3>
                                                                {activeDuaCategory && (
                                                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.18em]">
                                                                        {activeDuaCategory.duas.length} {t('entries')}
                                                                    </span>
                                                                )}
                                                         </div>

                                                         {duaCategories.length > 0 ? (
                                                             <>
                                                                 <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                                     {duaCategories.map(({ category, total }) => {
                                                                         const isActive = activeDuaCategory?.category === category;
                                                                         return (
                                                                             <button
                                                                                 key={category}
                                                                                 onClick={() => setSelectedDuaCategory(category)}
                                                                                 className={`text-left p-4 rounded-2xl border transition-all ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}
                                                                             >
                                                                                 <div className="flex items-center justify-between gap-3">
                                                                                     <div className="min-w-0">
                                                                                         <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{category}</div>
                                                                                         <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">3 {t('dailyRotation')}</div>
                                                                                     </div>
                                                                                     <div className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${isActive ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                                                                                         {total}
                                                                                     </div>
                                                                                 </div>
                                                                             </button>
                                                                         );
                                                                     })}
                                                                 </div>

                                                                 {activeDuaCategory && (
                                                                     <div className="mt-5 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/30 p-5">
                                                                         <div className="flex items-center justify-between gap-3 mb-4">
                                                                             <div>
                                                                                 <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{t('categories')}</div>
                                                                                 <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{activeDuaCategory.category}</h4>
                                                                             </div>
                                                                             <div className="text-right text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                                                                 3 / {activeDuaCategory.total}
                                                                             </div>
                                                                         </div>

                                                                         <div className="grid grid-cols-1 gap-3">
                                                                             {activeDuaCategory.duas.map((dua) => (
                                                                                 <div key={dua.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
                                                                                     <div className="flex items-start justify-between gap-3 mb-2">
                                                                                         <div>
                                                                                             <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">{dua.title}</h5>
                                                                                             <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">{dua.category}</div>
                                                                                         </div>
                                                                                         <ChevronRight className="w-4 h-4 text-slate-300" />
                                                                                     </div>
                                                                                     {dua.arabic && <p className="text-right font-serif text-lg leading-loose text-slate-800 dark:text-slate-200 mb-3">{dua.arabic}</p>}
                                                                                     <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{dua.translation}</p>
                                                                                     {dua.source && <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{dua.source}</p>}
                                                                                 </div>
                                                                             ))}
                                                                         </div>
                                                                     </div>
                                                                 )}
                                                             </>
                                                         ) : (
                                                             <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                                                                 {t('allCaughtUp')}
                                                             </div>
                                                         )}
                                                </div>
                    </div>
                 </div>
            </div>
       </div>
    </div>
  );
};

export default MuslimModule;