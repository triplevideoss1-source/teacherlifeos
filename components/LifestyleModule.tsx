import React, { useState } from 'react';
import { AppState, BrainDumpItem, ReadingBook, BadHabit, Goal, Exercise } from '../types';
import { useTranslation } from '../lib/translations';
import { processBrainDump } from '../services/gemini';
import { soundService } from '../services/sounds';
import { Brain, GlassWater, Loader2, Trash, Trash2, Mic, BookOpen, Footprints, ShieldAlert, RotateCcw, Plus, Check, Trophy, Activity, Flame, Timer, Target, Edit2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: AppState) => void;
}

const LifestyleModule: React.FC<Props> = ({ state, updateState }) => {
  const { t } = useTranslation(state.language);
  const [brainInput, setBrainInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  // Steps State
  const [stepsInput, setStepsInput] = useState(state.steps[today] || 0);
  
  // Keep stepsInput in sync with external state changes
  React.useEffect(() => {
    setStepsInput(state.steps[today] || 0);
  }, [state.steps[today]]);
  
  // Bad Habit State
  const [newBadHabit, setNewBadHabit] = useState('');

  // Reading State
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookTotal, setNewBookTotal] = useState('');
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editBookTitle, setEditBookTitle] = useState('');
  const [editBookAuthor, setEditBookAuthor] = useState('');
  const [editBookTotal, setEditBookTotal] = useState('');

  // Goal State
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<Goal['category']>('personal');
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);

  // Exercise State
  const [exActivity, setExActivity] = useState('');
  const [exDuration, setExDuration] = useState('');
  const [exCalories, setExCalories] = useState('');
  const [activityDate, setActivityDate] = useState(today);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setBrainInput(prev => prev ? prev + ' ' + transcript : transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const addBrainDump = async () => {
    if (!brainInput.trim()) return;
    setProcessing(true);
    soundService.play('success');
    
    const newItem: BrainDumpItem = {
      id: Date.now().toString(),
      content: brainInput,
      createdAt: new Date().toISOString(),
      status: 'new'
    };
    
    const aiAnalysis = await processBrainDump(brainInput);
    const enhancedItem = { ...newItem, content: `${brainInput} \n\n[AI]: ${aiAnalysis}` };

    updateState({ ...state, brainDump: [enhancedItem, ...state.brainDump] });
    setBrainInput('');
    setProcessing(false);
  };

  const deleteBrainItem = (id: string) => {
    soundService.play('delete');
    updateState({ ...state, brainDump: state.brainDump.filter(i => i.id !== id) });
  };

  const waterCount = state.waterIntake[today] || 0;
  const setWater = (count: number) => {
    soundService.play('notification'); // Pop sound for water
    updateState({ ...state, waterIntake: { ...state.waterIntake, [today]: Math.max(0, count) } });
  };

  const handleStepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value) || 0;
      setStepsInput(val);
      updateState({ ...state, steps: { ...state.steps, [today]: val } });
  };

  const stepsGoal = 10000;
  const stepsPercent = Math.min(100, Math.round((stepsInput / stepsGoal) * 100));

  // --- Reading Logic ---
  const addBook = () => {
      if(!newBookTitle || !newBookTotal) return;
      soundService.play('success');
      const book: ReadingBook = {
          id: Date.now().toString(),
          title: newBookTitle,
          author: '',
          currentPage: 0,
          totalPages: parseInt(newBookTotal),
          isCompleted: false
      };
      updateState({ ...state, reading: [...state.reading, book] });
      setNewBookTitle('');
      setNewBookTotal('');
      setIsAddBookOpen(false);
  };

  const updateBookProgress = (id: string, page: number) => {
      updateState({
          ...state,
          reading: state.reading.map(b => b.id === id ? { ...b, currentPage: Math.min(b.totalPages, Math.max(0, page)), isCompleted: page >= b.totalPages } : b)
      });
  };

  const openEditBook = (book: ReadingBook) => {
      setEditingBookId(book.id);
      setEditBookTitle(book.title);
      setEditBookAuthor(book.author);
      setEditBookTotal(book.totalPages.toString());
  };

  const saveEditBook = () => {
      if (!editingBookId || !editBookTitle.trim()) return;
      const newTotal = parseInt(editBookTotal) || 1;
      updateState({
          ...state,
          reading: state.reading.map(b => b.id === editingBookId ? {
              ...b,
              title: editBookTitle.trim(),
              author: editBookAuthor.trim(),
              totalPages: newTotal,
              currentPage: Math.min(b.currentPage, newTotal),
              isCompleted: b.currentPage >= newTotal
          } : b)
      });
      setEditingBookId(null);
  };

  const deleteBook = (id: string) => {
      soundService.play('delete');
      updateState({ ...state, reading: state.reading.filter(b => b.id !== id) });
      setEditingBookId(null);
  };

  // --- Habit Breaker Logic ---
  const addBadHabit = () => {
      if(!newBadHabit) return;
      const habit: BadHabit = {
          id: Date.now().toString(),
          name: newBadHabit,
          lastRelapse: new Date().toISOString(),
          longestStreak: 0
      };
      updateState({ ...state, badHabits: [...state.badHabits, habit] });
      setNewBadHabit('');
  };

  const resetBadHabit = (id: string) => {
      soundService.play('switch');
      const habit = state.badHabits.find(h => h.id === id);
      if(!habit) return;
      
      const currentStreak = Math.floor((new Date().getTime() - new Date(habit.lastRelapse).getTime()) / (1000 * 3600 * 24));
      const newLongest = Math.max(habit.longestStreak, currentStreak);

      updateState({
          ...state,
          badHabits: state.badHabits.map(h => h.id === id ? { ...h, lastRelapse: new Date().toISOString(), longestStreak: newLongest } : h)
      });
  };

  // --- Goals Logic ---
  const addGoal = () => {
      if(!newGoalTitle) return;
      soundService.play('success');
      const goal: Goal = {
          id: Date.now().toString(),
          title: newGoalTitle,
          category: newGoalCategory,
          progress: 0,
          completed: false
      };
      updateState({ ...state, goals: [...state.goals, goal] });
      setNewGoalTitle('');
      setIsAddGoalOpen(false);
  };

  const updateGoalProgress = (id: string, progress: number) => {
      const goal = state.goals.find(g => g.id === id);
      if(goal && progress === 100 && !goal.completed) soundService.play('success');
      
      updateState({
          ...state,
          goals: state.goals.map(g => g.id === id ? { ...g, progress: Math.min(100, Math.max(0, progress)), completed: progress === 100 } : g)
      });
  };

  const deleteGoal = (id: string) => {
      soundService.play('delete');
      updateState({ ...state, goals: state.goals.filter(g => g.id !== id) });
  };

  // --- Exercise Logic ---
  const logExercise = () => {
      if(!exActivity || !exDuration) return;
      soundService.play('success');
      const ex: Exercise = {
          id: Date.now().toString(),
          activity: exActivity,
          duration: parseInt(exDuration),
          calories: exCalories ? parseInt(exCalories) : undefined,
          date: activityDate
      };
      updateState({ ...state, exercises: [ex, ...state.exercises] });
      setExActivity('');
      setExDuration('');
      setExCalories('');
  };

  const deleteExercise = (id: string) => {
      soundService.play('delete');
      updateState({ ...state, exercises: state.exercises.filter(e => e.id !== id) });
  };

  const shiftActivityDate = (days: number) => {
      const d = new Date(activityDate);
      d.setDate(d.getDate() + days);
      setActivityDate(d.toISOString().split('T')[0]);
  };

  const selectedDateExercises = state.exercises.filter(e => e.date === activityDate);
  const selectedDuration = selectedDateExercises.reduce((acc, curr) => acc + curr.duration, 0);
  const selectedCalories = selectedDateExercises.reduce((acc, curr) => acc + (curr.calories || 0), 0);

  // Weekly summary
  const weekStart = new Date(activityDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
  });
  const weeklyStats = weekDays.map(day => {
      const dayExercises = state.exercises.filter(e => e.date === day);
      return {
          day,
          label: new Date(day).toLocaleDateString('en', { weekday: 'short' }),
          duration: dayExercises.reduce((a, c) => a + c.duration, 0),
      };
  });
  const maxWeekDuration = Math.max(...weeklyStats.map(s => s.duration), 1);

  const todaysExercises = selectedDateExercises;
  const totalDuration = selectedDuration;
  const totalCalories = selectedCalories;

  const getCategoryColor = (cat: Goal['category']) => {
      switch(cat) {
          case 'health': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
          case 'finance': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
          case 'faith': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
          case 'career': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
          default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-12 animate-fade-in-up">
        
        {/* Top Grid: Trackers */}
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:mx-0 md:px-0 md:gap-4 md:gap-y-6">
            
            {/* Water Tracker */}
            <div className="min-w-[calc(100vw-2.75rem)] md:min-w-0 snap-start bg-blue-50 dark:bg-blue-950/20 p-5 md:p-6 rounded-2xl md:rounded-3xl relative overflow-hidden group border border-blue-100 dark:border-blue-900/30 shadow-sm transition-all hover:shadow-md">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                    <GlassWater className="w-20 h-20 md:w-24 md:h-24 text-blue-500" />
                </div>
                <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2 text-sm md:text-base"><GlassWater className="w-4 h-4 md:w-5 md:h-5"/> {t('lifestyle')}</h3>
                <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-4 tabular-nums">{waterCount} <span className="text-xs md:text-sm font-medium opacity-60">cups</span></div>
                <div className="flex gap-2 relative z-10">
                    <button onClick={() => setWater(waterCount - 1)} className="w-10 h-10 rounded-2xl bg-blue-200 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-300 flex items-center justify-center font-bold transition-colors">-</button>
                    <button onClick={() => setWater(waterCount + 1)} className="w-10 h-10 rounded-2xl bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center font-bold transition-colors shadow-lg shadow-blue-500/30">+</button>
                </div>
            </div>
 
            {/* Steps Tracker */}
            <div className="min-w-[calc(100vw-2.75rem)] md:min-w-0 snap-start bg-orange-50 dark:bg-orange-950/20 p-5 md:p-6 rounded-2xl md:rounded-3xl relative overflow-hidden group border border-orange-100 dark:border-orange-900/30 shadow-sm transition-all hover:shadow-md">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                    <Footprints className="w-20 h-20 md:w-24 md:h-24 text-orange-500" />
                </div>
                <h3 className="font-bold text-orange-800 dark:text-orange-200 mb-2 flex items-center gap-2 text-sm md:text-base"><Footprints className="w-4 h-4 md:w-5 md:h-5"/> Daily Steps</h3>
                <div className="relative z-10">
                    <div className="flex items-baseline gap-1">
                        <input 
                            type="number" 
                            value={stepsInput || ''} 
                            onChange={handleStepsChange} 
                            placeholder="0"
                            className="text-3xl md:text-4xl font-bold text-orange-600 dark:text-orange-400 bg-transparent w-28 md:w-32 focus:outline-none mb-1 tabular-nums"
                        />
                        <span className="text-xs font-medium text-orange-400 opacity-60">steps</span>
                    </div>
                    <div className="text-[10px] md:text-xs text-orange-600/60 dark:text-orange-400/60 font-bold uppercase tracking-wider">Goal: {stepsGoal.toLocaleString()}</div>
                    <div className="w-full bg-orange-200 dark:bg-orange-900 h-2 md:h-2.5 rounded-full mt-3 overflow-hidden">
                        <div className="bg-orange-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stepsPercent}%` }}></div>
                    </div>
                </div>
            </div>
 
            {/* Sports & Fitness */}
            <div className="min-w-[calc(100vw-2.75rem)] md:min-w-0 snap-start md:col-span-2 bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm md:text-base"><Activity className="w-4 h-4 md:w-5 md:h-5 text-rose-500"/> Activity Log</h3>
                        <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium">Move your body, clear your mind.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xl md:text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">{totalDuration} <span className="text-[10px] md:text-xs text-rose-400 uppercase font-bold">mins</span></div>
                        {totalCalories > 0 && <div className="text-[10px] font-bold text-rose-500/70 dark:text-rose-300/70 uppercase tracking-wider">{totalCalories} kcal burned</div>}
                    </div>
                 </div>

                 {/* Date Navigator */}
                 <div className="flex items-center justify-between mb-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2 border border-slate-100 dark:border-slate-700">
                     <button onClick={() => shiftActivityDate(-1)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                         <ChevronLeft className="w-4 h-4" />
                     </button>
                     <button onClick={() => setActivityDate(today)} className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2">
                         {activityDate === today ? 'Today' : new Date(activityDate).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                     </button>
                     <button onClick={() => shiftActivityDate(1)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors" disabled={activityDate >= today}>
                         <ChevronRight className={`w-4 h-4 ${activityDate >= today ? 'opacity-30' : ''}`} />
                     </button>
                 </div>

                 {/* Weekly Mini Chart */}
                 <div className="flex items-end gap-1 mb-4 h-12">
                     {weeklyStats.map(stat => (
                         <button
                             key={stat.day}
                             onClick={() => setActivityDate(stat.day)}
                             className={`flex-1 flex flex-col items-center gap-0.5 group`}
                             title={`${stat.label}: ${stat.duration}m`}
                         >
                             <div className="w-full rounded-t-md transition-all" style={{ height: `${Math.max(4, (stat.duration / maxWeekDuration) * 36)}px`, backgroundColor: stat.day === activityDate ? '#f43f5e' : stat.duration > 0 ? '#fda4af' : '#e2e8f0' }}></div>
                             <span className={`text-[8px] font-bold uppercase ${stat.day === activityDate ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>{stat.label}</span>
                         </button>
                     ))}
                 </div>
                 
                 <div className="flex flex-col sm:flex-row gap-2 mb-4">
                     <input className="flex-[2] text-xs md:text-sm p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all" placeholder="Running, Gym..." value={exActivity} onChange={e => setExActivity(e.target.value)} />
                     <div className="flex gap-2 flex-1">
                        <input type="number" className="flex-1 text-xs md:text-sm p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all" placeholder="Mins" value={exDuration} onChange={e => setExDuration(e.target.value)} />
                        <input type="number" className="flex-1 text-xs md:text-sm p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all" placeholder="Kcal" value={exCalories} onChange={e => setExCalories(e.target.value)} />
                        <button onClick={logExercise} className="bg-rose-500 text-white p-2.5 rounded-xl hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"><Plus className="w-5 h-5"/></button>
                     </div>
                 </div>
 
                 <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                     {todaysExercises.length === 0 && <div className="text-center text-[10px] md:text-xs text-slate-400 py-4 font-medium italic">No activity recorded{activityDate === today ? ' today' : ' on this day'}.</div>}
                     {todaysExercises.map(ex => (
                         <div key={ex.id} className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 group">
                             <span className="font-bold text-slate-700 dark:text-slate-300">{ex.activity}</span>
                             <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                 <span className="flex items-center gap-1"><Timer className="w-3 h-3"/> {ex.duration}m</span>
                                 {ex.calories && <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500"/> {ex.calories}</span>}
                                 <button onClick={() => deleteExercise(ex.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all rounded hover:bg-rose-50 dark:hover:bg-rose-900/20">
                                     <Trash2 className="w-3 h-3" />
                                 </button>
                             </div>
                         </div>
                     ))}
                 </div>
            </div>
        </div>
 
        {/* Goals Section */}
             <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                 <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Trophy className="w-6 h-6 md:w-7 md:h-7 text-yellow-500" /> Long-Term Goals
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">Break down your vision into achievable milestones.</p>
                 </div>
                 <button onClick={() => setIsAddGoalOpen(!isAddGoalOpen)} className="w-full sm:w-auto text-xs bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-slate-900/10">
                    {isAddGoalOpen ? 'Cancel' : '+ New Goal'}
                 </button>
             </div>
 
             {isAddGoalOpen && (
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl mb-8 animate-fade-in flex flex-col md:flex-row gap-3 items-center border border-slate-100 dark:border-slate-700">
                     <input className="w-full md:flex-[2] p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="What do you want to achieve?" value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} />
                     <select className="w-full md:flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" value={newGoalCategory} onChange={e => setNewGoalCategory(e.target.value as any)}>
                         <option value="personal">Personal</option>
                         <option value="health">Health</option>
                         <option value="finance">Finance</option>
                         <option value="faith">Faith</option>
                         <option value="career">Career</option>
                     </select>
                     <button onClick={addGoal} className="w-full md:w-auto bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20">Add Goal</button>
                 </div>
             )}
 
             <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:mx-0 md:px-0 md:gap-4 md:gap-y-6">
                 {state.goals.map(goal => (
                     <div key={goal.id} className="min-w-[calc(100vw-2.75rem)] md:min-w-0 snap-start p-5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/20 relative group hover:shadow-xl transition-all hover:-translate-y-1">
                         <button onClick={() => deleteGoal(goal.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash className="w-4 h-4"/></button>
                         <div className="flex items-center gap-2 mb-3">
                             <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider ${getCategoryColor(goal.category)}`}>{goal.category}</span>
                             {goal.completed && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider"><Check className="w-3 h-3"/> Done</span>}
                         </div>
                         <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 text-sm md:text-base leading-tight">{goal.title}</h3>
                         <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>Progress</span>
                                <span className="tabular-nums">{goal.progress}%</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="range" 
                                    min="0" max="100" 
                                    value={goal.progress} 
                                    onChange={e => updateGoalProgress(goal.id, parseInt(e.target.value))}
                                    className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>
                         </div>
                     </div>
                 ))}
                 {state.goals.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                        <Target className="w-12 h-12 text-slate-300 mx-auto mb-3 opacity-50" />
                        <div className="text-slate-400 font-bold text-sm">No goals set yet. Aim high!</div>
                    </div>
                 )}
             </div>
        </div>
 
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
             {/* Left Column: Brain Dump */}
             <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Brain className="w-5 h-5 md:w-6 md:h-6 text-purple-500" /> Brain Dump
                        </h2>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Enhanced Capture</span>
                    </div>
                    <div className="relative mb-4">
                        <textarea 
                        className="w-full p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-0 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 resize-none h-32 text-slate-800 dark:text-slate-200 placeholder-slate-400 text-sm outline-none transition-all"
                        placeholder="Quick capture ideas, thoughts, or tasks. AI will help you organize them..."
                        value={brainInput}
                        onChange={e => setBrainInput(e.target.value)}
                        ></textarea>
                        <button 
                            onClick={startListening}
                            className={`absolute bottom-4 right-4 p-2.5 rounded-xl bg-white dark:bg-slate-700 shadow-md hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-100 dark:border-slate-600 transition-all ${isListening ? 'text-red-500 animate-pulse scale-110' : 'text-slate-400 hover:text-purple-500'}`}
                        >
                            <Mic className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex justify-end">
                        <button 
                            onClick={addBrainDump}
                            disabled={processing || !brainInput.trim()}
                            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-purple-500/20"
                        >
                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Capture Thought
                        </button>
                    </div>
                    <div className="mt-8 space-y-4">
                        {state.brainDump.slice(0, 5).map(item => (
                        <div key={item.id} className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 relative group hover:border-purple-200 dark:hover:border-purple-900/30 transition-all">
                            <button 
                                onClick={() => deleteBrainItem(item.id)}
                                className="absolute top-4 right-4 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Trash className="w-4 h-4" />
                            </button>
                            <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed pr-8">{item.content}</p>
                            <div className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                        ))}
                        {state.brainDump.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm font-medium italic">Your mind is clear. Capture something!</div>
                        )}
                    </div>
                </div>
             </div>
 
             {/* Right Column: Reading & Habits */}
             <div className="space-y-6 md:space-y-8">
                 
                 {/* Reading List */}
                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 rounded-3xl shadow-sm">
                     <div className="flex justify-between items-center mb-6">
                         <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-base md:text-lg"><BookOpen className="w-5 h-5 text-indigo-500"/> Reading List</h3>
                         <button onClick={() => setIsAddBookOpen(!isAddBookOpen)} className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500 hover:text-white p-2 rounded-xl transition-all"><Plus className="w-4 h-4"/></button>
                     </div>
                     
                     {isAddBookOpen && (
                         <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-6 animate-fade-in border border-slate-100 dark:border-slate-700">
                             <input className="w-full mb-2 p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Book Title" value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)} />
                             <div className="flex gap-2">
                                <input type="number" className="w-24 p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Pages" value={newBookTotal} onChange={e => setNewBookTotal(e.target.value)} />
                                <button onClick={addBook} className="flex-1 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20">Add Book</button>
                             </div>
                         </div>
                     )}
 
                     <div className="space-y-4">
                         {state.reading.map(book => {
                             const percent = Math.round((book.currentPage / book.totalPages) * 100);
                             const isEditing = editingBookId === book.id;
                             return (
                                 <div key={book.id} className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 dark:hover:border-indigo-900/30 transition-all">
                                     {isEditing ? (
                                         <div className="space-y-2 animate-fade-in">
                                             <input 
                                                 className="w-full p-2.5 text-sm rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                                 placeholder="Title" 
                                                 value={editBookTitle} 
                                                 onChange={e => setEditBookTitle(e.target.value)} 
                                             />
                                             <input 
                                                 className="w-full p-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                                 placeholder="Author (optional)" 
                                                 value={editBookAuthor} 
                                                 onChange={e => setEditBookAuthor(e.target.value)} 
                                             />
                                             <div className="flex gap-2">
                                                 <input 
                                                     type="number" 
                                                     className="w-20 p-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                                     placeholder="Pages" 
                                                     value={editBookTotal} 
                                                     onChange={e => setEditBookTotal(e.target.value)} 
                                                 />
                                                 <button onClick={saveEditBook} className="flex-1 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors py-2.5">Save</button>
                                                 <button onClick={() => setEditingBookId(null)} className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                                             </div>
                                         </div>
                                     ) : (
                                         <>
                                             <div className="flex justify-between items-start mb-1">
                                                 <div className="min-w-0 flex-1 pr-2">
                                                     <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-2 break-words">{book.title}</h4>
                                                     {book.author && <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">{book.author}</p>}
                                                 </div>
                                                 <div className="flex items-center gap-1 shrink-0">
                                                     <span className="text-xs font-mono font-bold text-indigo-500 tabular-nums mr-1">{percent}%</span>
                                                     <button onClick={() => openEditBook(book)} className="p-1.5 text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Edit">
                                                         <Edit2 className="w-3.5 h-3.5" />
                                                     </button>
                                                     <button onClick={() => deleteBook(book.id)} className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20" title="Delete">
                                                         <Trash2 className="w-3.5 h-3.5" />
                                                     </button>
                                                 </div>
                                             </div>
                                             <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mb-3 overflow-hidden">
                                                 <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{width: `${percent}%`}}></div>
                                             </div>
                                             <div className="flex flex-wrap items-center justify-between gap-2">
                                                 <div className="flex items-center gap-2 min-w-0">
                                                     <input 
                                                        type="number" 
                                                        className="w-14 p-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-center outline-none focus:ring-2 focus:ring-indigo-500/20 tabular-nums"
                                                        value={book.currentPage}
                                                        onChange={(e) => updateBookProgress(book.id, parseInt(e.target.value))}
                                                     />
                                                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">/ {book.totalPages} pages</span>
                                                 </div>
                                                 {book.isCompleted && <Check className="w-4 h-4 text-emerald-500" />}
                                             </div>
                                         </>
                                     )}
                                 </div>
                             )
                         })}
                         {state.reading.length === 0 && (
                             <div className="text-center py-6 text-slate-400 text-xs font-medium italic">No books in your list. Knowledge is power!</div>
                         )}
                     </div>
                 </div>
 
                 {/* Habit Breaker */}
                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 rounded-3xl shadow-sm">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-base md:text-lg"><ShieldAlert className="w-5 h-5 text-red-500"/> Habit Breaker</h3>
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Stay Strong</span>
                     </div>
                     
                     <div className="flex gap-2 mb-6">
                         <input 
                            className="flex-1 text-sm p-3 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                            placeholder="What habit are you breaking?"
                            value={newBadHabit}
                            onChange={e => setNewBadHabit(e.target.value)}
                         />
                         <button onClick={addBadHabit} className="bg-slate-900 dark:bg-slate-700 text-white p-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-slate-900/10"><Plus className="w-5 h-5"/></button>
                     </div>
 
                     <div className="space-y-4">
                         {state.badHabits.map(habit => {
                             const daysFree = Math.floor((new Date().getTime() - new Date(habit.lastRelapse).getTime()) / (1000 * 3600 * 24));
                             return (
                                 <div key={habit.id} className="flex items-center justify-between gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 group hover:shadow-md transition-all">
                                     <div>
                                         <div className="font-bold text-red-800 dark:text-red-300 text-sm leading-tight mb-1">{habit.name}</div>
                                         <div className="text-[10px] font-bold text-red-600/70 dark:text-red-400/70 uppercase tracking-wider">Best: {habit.longestStreak} days</div>
                                     </div>
                                     <div className="text-right flex items-center gap-4">
                                         <div className="flex flex-col items-center">
                                             <div className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums leading-none">{daysFree}</div>
                                             <div className="text-[8px] uppercase font-bold text-red-400 tracking-widest mt-1">Days</div>
                                         </div>
                                         <button 
                                            onClick={() => resetBadHabit(habit.id)}
                                            className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-100 dark:border-slate-700 transition-all shadow-sm active:scale-90" 
                                            title="Relapsed? Start again."
                                         >
                                             <RotateCcw className="w-4 h-4"/>
                                         </button>
                                     </div>
                                 </div>
                             )
                         })}
                         {state.badHabits.length === 0 && (
                             <div className="text-center py-6 text-slate-400 text-xs font-medium italic">No bad habits tracked. Keep it up!</div>
                         )}
                     </div>
                 </div>
 
             </div>
        </div>
 
    </div>
  );
};

export default LifestyleModule;