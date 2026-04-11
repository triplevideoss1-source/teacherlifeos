import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AppState, Task, FocusSession, MuhasabahEntry } from '../types';
import { auth } from '../firebase';
import { exportToCSV } from '../lib/exportUtils';
import { soundService } from '../services/sounds';
import { useTranslation } from '../lib/translations';
import { Calendar, CheckCircle2, Droplets, Wallet, Clock, Quote, Mic, Loader2, Trash2, Tag, Play, Pause, RotateCcw, Coffee, Moon, BookHeart, ScrollText, Check, Hourglass, Star, Archive, Activity, Trophy, FileText, ChevronRight, ShieldAlert, X } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: AppState) => void;
  prayerTimes: any;
  setView: (v: any) => void;
}

const QUOTES = [
    "Consistency is what transforms average into excellence.",
    "Allah does not burden a soul beyond that it can bear.",
    "The best way to predict the future is to create it.",
    "Verily, with hardship comes ease.",
    "Your time is limited, so don't waste it living someone else's life.",
    "Faith is taking the first step even when you don't see the whole staircase.",
    "And He is with you wherever you are.",
    "Be like a flower that gives its fragrance even to the hand that crushes it.",
    "The heart that beats for Allah is always a stranger among the people.",
    "Patience is not the ability to wait, but the ability to keep a good attitude while waiting.",
    "What is meant for you will never miss you, and what misses you was never meant for you.",
    "The more you let go, the higher you rise.",
    "Kindness is a mark of faith, and whoever is not kind has no faith.",
    "Speak only when your words are more beautiful than silence.",
    "A busy life makes prayer harder, but prayer makes a busy life easier.",
    "The world is a bridge, pass over it, but build no houses upon it.",
    "Happiness is found in the remembrance of Allah.",
    "Do good and it will come back to you in unexpected ways.",
    "Trust Allah's timing, He is the best of planners.",
    "Every soul shall taste death, but only some will taste life.",
    "The strongest among you is the one who controls his anger.",
    "Gratitude is the key to abundance.",
    "Forgive others as quickly as you expect Allah to forgive you.",
    "Your character is your true identity.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "Don't tell Allah how big your problems are, tell your problems how big Allah is.",
    "The best of people are those who are most beneficial to others.",
    "Seek knowledge from the cradle to the grave.",
    "Modesty brings nothing but good.",
    "The best richness is the richness of the soul.",
    "When you pray, you are talking to the King of Kings.",
    "A moment of patience in a moment of anger saves a thousand moments of regret.",
    "The tongue is like a lion; if you let it loose, it will wound someone.",
    "He who has no manners has no knowledge.",
    "The most excellent Jihad is that for the conquest of self.",
    "To Allah belongs whatever is in the heavens and whatever is in the earth.",
    "Verily, Allah is with those who are patient.",
    "The life of this world is but enjoyment of delusion.",
    "And whoever fears Allah - He will make for him a way out.",
    "Is not Allah sufficient for His servant?",
    "My success is only by Allah.",
    "And lower to them the wing of humility out of mercy.",
    "So verily, with every difficulty, there is relief.",
    "And your Lord is not ever forgetful.",
    "The best among you are those who have the best manners and character.",
    "Richness is not having many possessions, but richness is being content with oneself.",
    "The most beloved of places to Allah are the mosques.",
    "Take account of yourselves before you are taken to account.",
    "Knowledge without action is like a tree without fruit.",
    "The best of you is the one who learns the Quran and teaches it.",
    "A Muslim is a brother to a Muslim.",
    "The upper hand is better than the lower hand.",
    "Avoid jealousy, for it consumes good deeds as fire consumes wood.",
    "The most perfect believer in faith is the one who is best in moral character."
];

const ISLAMIC_DAILY = [
    { type: 'Hadith', text: "The most beloved of deeds to Allah are those that are most consistent, even if they are small.", source: "Sahih Bukhari" },
    { type: 'Ayah', text: "So remember Me; I will remember you.", source: "Surah Al-Baqarah (2:152)" },
    { type: 'Advice', text: "Take advantage of five before five: your youth before your old age, your health before your sickness, your wealth before your poverty, your free time before your preoccupation, and your life before your death.", source: "Prophet Muhammad (ﷺ)" },
    { type: 'Hadith', text: "None of you truly believes until he loves for his brother what he loves for himself.", source: "Sahih Bukhari" },
    { type: 'Ayah', text: "Indeed, Allah is with the patient.", source: "Surah Al-Baqarah (2:153)" },
    { type: 'Reminder', text: "Your character is your beauty.", source: "Islamic Proverb" },
    { type: 'Hadith', text: "A good word is charity.", source: "Sahih Bukhari" },
    { type: 'Ayah', text: "Call upon Me, I will respond to you.", source: "Surah Ghafir (40:60)" },
    { type: 'Hadith', text: "He who is not grateful to people is not grateful to Allah.", source: "Sunan Abi Dawud" },
    { type: 'Advice', text: "Do not let your difficulties fill you with anxiety, after all it is only in the darkest nights that stars shine more brightly.", source: "Ali Ibn Abi Talib (RA)" },
    { type: 'Hadith', text: "The best of you are those who are best to their families.", source: "Tirmidhi" },
    { type: 'Ayah', text: "And whoever relies upon Allah - then He is sufficient for him.", source: "Surah At-Talaq (65:3)" },
    { type: 'Advice', text: "Be in this world as if you were a stranger or a traveler.", source: "Ibn Umar (RA)" },
    { type: 'Hadith', text: "Purity is half of faith.", source: "Sahih Muslim" },
    { type: 'Ayah', text: "Indeed, good deeds do away with misdeeds.", source: "Surah Hud (11:114)" },
    { type: 'Reminder', text: "The heart finds rest in the remembrance of Allah.", source: "Surah Ar-Ra'd (13:28)" },
    { type: 'Hadith', text: "The world is a prison for the believer and a paradise for the disbeliever.", source: "Sahih Muslim" },
    { type: 'Ayah', text: "And speak to people good [words].", source: "Surah Al-Baqarah (2:83)" },
    { type: 'Advice', text: "The tongue is very small and light, but it can take you to the greatest heights and it can put you in the lowest depths.", source: "Al-Ghazali" },
    { type: 'Hadith', text: "Modesty is part of faith.", source: "Sahih Bukhari" },
    { type: 'Ayah', text: "Indeed, Allah loves those who rely [upon Him].", source: "Surah Ali 'Imran (3:159)" },
    { type: 'Reminder', text: "Every act of kindness is a charity.", source: "Sahih Muslim" },
    { type: 'Hadith', text: "The most perfect man in his faith among the believers is the one whose behaviour is most excellent.", source: "Tirmidhi" },
    { type: 'Ayah', text: "And be patient, [O Muhammad], and your patience is not but through Allah.", source: "Surah An-Nahl (16:127)" },
    { type: 'Advice', text: "Knowledge is that which benefits, not that which is memorized.", source: "Imam Shafi'i" },
    { type: 'Hadith', text: "A Muslim is the one from whose tongue and hands the Muslims are safe.", source: "Sahih Bukhari" },
    { type: 'Ayah', text: "And do good; indeed, Allah loves the doers of good.", source: "Surah Al-Baqarah (2:195)" },
    { type: 'Reminder', text: "The best provision is piety.", source: "Surah Al-Baqarah (2:197)" },
    { type: 'Hadith', text: "He who has in his heart the weight of a mustard seed of pride shall not enter Paradise.", source: "Sahih Muslim" },
    { type: 'Ayah', text: "And lower to them the wing of humility out of mercy.", source: "Surah Al-Isra (17:24)" },
    { type: 'Advice', text: "The soul that is attached to Allah is never lonely.", source: "Islamic Wisdom" },
    { type: 'Hadith', text: "Allah does not look at your appearances or your wealth, but He looks at your hearts and your actions.", source: "Sahih Muslim" },
    { type: 'Ayah', text: "And your Lord is not ever forgetful.", source: "Surah Maryam (19:64)" },
    { type: 'Reminder', text: "Patience is a pillar of faith.", source: "Islamic Proverb" },
    { type: 'Hadith', text: "The strong man is not the one who can wrestle, but the one who can control himself when he is angry.", source: "Sahih Bukhari" },
    { type: 'Ayah', text: "So verily, with every difficulty, there is relief.", source: "Surah Ash-Sharh (94:5)" },
    { type: 'Advice', text: "Do not look at the smallness of the sin, but look at the greatness of the One you are disobeying.", source: "Bilal ibn Sa'id" },
    { type: 'Hadith', text: "The best of people are those with the longest lives and the best deeds.", source: "Tirmidhi" },
    { type: 'Ayah', text: "And He is with you wherever you are.", source: "Surah Al-Hadid (57:4)" },
    { type: 'Reminder', text: "Gratitude is the way to more.", source: "Surah Ibrahim (14:7)" },
    { type: 'Hadith', text: "Wealth is not in having vast riches, it is in contentment.", source: "Sahih Bukhari" },
    { type: 'Ayah', text: "Indeed, Allah is with those who fear Him and those who are doers of good.", source: "Surah An-Nahl (16:128)" },
    { type: 'Advice', text: "If you want to know your standing with Allah, look at where He has placed you.", source: "Ibn Ata'illah" },
    { type: 'Hadith', text: "Whoever follows a path in pursuit of knowledge, Allah will make easy for him a path to Paradise.", source: "Sahih Muslim" },
    { type: 'Ayah', text: "And whoever fears Allah - He will make for him a way out.", source: "Surah At-Talaq (65:2)" },
    { type: 'Reminder', text: "Forgiveness is the attribute of the strong.", source: "Islamic Wisdom" },
    { type: 'Hadith', text: "The most beloved of people to Allah is the one who brings most benefit to people.", source: "Tabarani" },
    { type: 'Ayah', text: "Is not Allah sufficient for His servant?", source: "Surah Az-Zumar (39:36)" },
    { type: 'Advice', text: "The best way to find yourself is to lose yourself in the service of others.", source: "Islamic Wisdom" },
    { type: 'Hadith', text: "Righteousness is good character.", source: "Sahih Muslim" },
    { type: 'Ayah', text: "And hold firmly to the rope of Allah all together and do not become divided.", source: "Surah Ali 'Imran (3:103)" },
    { type: 'Reminder', text: "Every soul shall taste death.", source: "Surah Ali 'Imran (3:185)" },
    { type: 'Hadith', text: "The best of you is the one who learns the Quran and teaches it.", source: "Sahih Bukhari" },
    { type: 'Ayah', text: "My success is only by Allah.", source: "Surah Hud (11:88)" }
];

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const FOCUS_DURATIONS = {
  focus: 25 * 60,
  dhikr: 5 * 60,
} as const;
const toLocalISODate = (date: Date) => date.toLocaleDateString('en-CA');
const getNextOccurrenceDate = (weekday: string) => {
  const targetIndex = WEEK_DAYS.indexOf(weekday);
  if (targetIndex === -1) return toLocalISODate(new Date());
  const now = new Date();
  const currentIndex = (now.getDay() + 6) % 7; // Monday=0
  const diff = (targetIndex - currentIndex + 7) % 7;
  const target = new Date(now);
  target.setDate(now.getDate() + diff);
  return toLocalISODate(target);
};

const Dashboard: React.FC<Props> = ({ state, updateState, prayerTimes, setView }) => {
  const [quickNote, setQuickNote] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [quote, setQuote] = useState('');
  const [dailyWisdom, setDailyWisdom] = useState(ISLAMIC_DAILY[0]);
    const [mobileDashboardSection, setMobileDashboardSection] = useState<'today' | 'faith' | 'reflect'>('today');
  
  // Task State
  const [taskTab, setTaskTab] = useState<'active' | 'history'>('active');
  const [newTaskPriority, setNewTaskPriority] = useState<'low'|'medium'|'high'>('medium');
  const [newTaskCategory, setNewTaskCategory] = useState<'work'|'personal'|'urgent'>('personal');
  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
  const [scheduleDay, setScheduleDay] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleDuration, setScheduleDuration] = useState(30);

  // Muhasabah State
  const [muhasabahRating, setMuhasabahRating] = useState(0);
  const [muhasabahGratitude, setMuhasabahGratitude] = useState('');
  const [muhasabahStruggle, setMuhasabahStruggle] = useState('');
  const [muhasabahImprovements, setMuhasabahImprovements] = useState('');
  const [isMuhasabahSaved, setIsMuhasabahSaved] = useState(false);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayDate = new Date().toISOString().split('T')[0];

  // Focus Timer Ref
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
      // Pick content based on the day of year so it stays consistent for the day
      const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
      setQuote(QUOTES[dayOfYear % QUOTES.length]);
      setDailyWisdom(ISLAMIC_DAILY[dayOfYear % ISLAMIC_DAILY.length]);
      
      // Check if muhasabah done
      if(state.muhasabah && state.muhasabah.find(m => m.date === todayDate)) {
        setIsMuhasabahSaved(true);
      }
  }, []);

  const syncFocusSession = useCallback(() => {
    updateState((prev: AppState) => {
      const session = prev.focusSession;

      if (!session?.isActive || !session.endTime) {
        return prev;
      }

      const nextTimeLeft = Math.max(0, Math.ceil((session.endTime - Date.now()) / 1000));

      if (nextTimeLeft === session.timeLeft) {
        return prev;
      }

      return {
        ...prev,
        focusSession: {
          ...session,
          timeLeft: nextTimeLeft,
          isActive: nextTimeLeft > 0,
          endTime: nextTimeLeft > 0 ? session.endTime : null,
        }
      };
    });
  }, [updateState]);

  // Timer Logic - derives remaining time from an absolute end time so it survives tab throttling.
  useEffect(() => {
    if (state.focusSession?.isActive) {
        syncFocusSession();
        timerRef.current = window.setInterval(syncFocusSession, 1000);
    } else if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
    }
    return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
    };
  }, [state.focusSession?.isActive, syncFocusSession]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncFocusSession();
      }
    };

    window.addEventListener('focus', syncFocusSession);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', syncFocusSession);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncFocusSession]);


  const todaysLessons = useMemo(() => state.lessons.filter(l => l.day === today).sort((a,b) => a.time.localeCompare(b.time)), [state.lessons, today]);
  const todaysScheduledTasks = useMemo(() => {
        return state.tasks
            .filter(task => {
                if (task.completed || !task.scheduledTime) return false;
                if (task.scheduledDate) return task.scheduledDate === todayDate;
                return task.scheduledDay === today;
            })
            .sort((left, right) => (left.scheduledTime || '').localeCompare(right.scheduledTime || ''));
    }, [state.tasks, today, todayDate]);

    const todaysAgenda = useMemo(() => {
        const lessons = todaysLessons.map((lesson) => ({
            kind: 'lesson' as const,
            id: lesson.id,
            time: lesson.time,
            title: lesson.studentName,
            subtitle: lesson.subject,
            duration: lesson.duration,
            color: lesson.color,
            location: lesson.location,
        }));

        const tasks = todaysScheduledTasks.map((task) => ({
            kind: 'task' as const,
            id: task.id,
            time: task.scheduledTime || '00:00',
            title: task.title,
            subtitle: `${task.priority} priority`,
            duration: task.scheduledDuration || 30,
            color: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#3b82f6',
            location: task.category,
        }));

        return [...lessons, ...tasks].sort((left, right) => left.time.localeCompare(right.time));
    }, [todaysLessons, todaysScheduledTasks]);

  // Memoized calculations for performance
  const filteredTasks = useMemo(() => {
        const getPlanSortValue = (task: Task) => {
            if (!task.scheduledDay || !task.scheduledTime) {
                return Number.MAX_SAFE_INTEGER;
            }

            const dayIndex = WEEK_DAYS.indexOf(task.scheduledDay);
            const [hours, minutes] = task.scheduledTime.split(':').map(Number);
            return ((dayIndex === -1 ? WEEK_DAYS.length : dayIndex) * 24 * 60) + (hours * 60) + minutes;
        };

    return state.tasks
      .filter(t => taskTab === 'active' ? !t.completed : t.completed)
      .sort((a, b) => {
          if (taskTab === 'active') {
                             const aHasPlan = Boolean(a.scheduledDay && a.scheduledTime);
                             const bHasPlan = Boolean(b.scheduledDay && b.scheduledTime);

                             if (aHasPlan !== bHasPlan) {
                                     return aHasPlan ? -1 : 1;
                             }

                             if (aHasPlan && bHasPlan) {
                                     const planDiff = getPlanSortValue(a) - getPlanSortValue(b);
                                     if (planDiff !== 0) return planDiff;
                             }

               const pMap = { high: 3, medium: 2, low: 1 };
               if (pMap[a.priority] !== pMap[b.priority]) return pMap[b.priority] - pMap[a.priority];
               return b.createdAt.localeCompare(a.createdAt);
          }
          return (b.completedAt || '').localeCompare(a.completedAt || '');
      });
  }, [state.tasks, taskTab]);

  const { income, expenses, balance } = useMemo(() => {
      const inc = state.transactions.filter(t => t.type === 'income' && t.date.startsWith(todayDate.substring(0, 7))).reduce((sum, t) => sum + t.amount, 0);
      const exp = state.transactions.filter(t => t.type === 'expense' && t.date.startsWith(todayDate.substring(0, 7))).reduce((sum, t) => sum + t.amount, 0);
      return { income: inc, expenses: exp, balance: inc - exp };
  }, [state.transactions, todayDate]);

  const todaysActivity = useMemo(() => {
      const active = state.exercises.filter(e => e.date === todayDate);
      return {
          mins: active.reduce((acc, c) => acc + c.duration, 0),
          cals: active.reduce((acc, c) => acc + (c.calories || 0), 0)
      };
  }, [state.exercises, todayDate]);

  // --- Quick Info Helpers ---
  const nextPrayer = useMemo(() => {
      if (!prayerTimes) return null;
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const times = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(p => {
          const t = prayerTimes[p];
          if(!t) return { name: p, mins: 0, time: ''};
          const [h, m] = t.split(':').map(Number);
          return { name: p, mins: h * 60 + m, time: t };
      });
      // Find first time > currentMins
      const next = times.find(t => t.mins > currentMins);
      // If none, next is Fajr tomorrow (just show Fajr)
      return next || times[0]; 
  }, [prayerTimes]);

  const nextClass = useMemo(() => {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const upcoming = todaysLessons
          .map(l => ({ ...l, mins: parseInt(l.time.split(':')[0]) * 60 + parseInt(l.time.split(':')[1]) }))
          .filter(l => l.mins > currentMins);
      return upcoming[0] || null;
  }, [todaysLessons]);

  const { t } = useTranslation(state.language);

  const activeTaskCount = state.tasks.filter(t => !t.completed).length;

  // --- Handlers ---

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;
    soundService.play('success');
    const newTask: Task = {
      id: Date.now().toString(),
      title: quickNote,
      completed: false,
      category: newTaskCategory,
      priority: newTaskPriority,
      date: todayDate,
      createdAt: new Date().toISOString()
    };
    updateState({ ...state, tasks: [...state.tasks, newTask] });
    setQuickNote('');
  };

  const toggleTask = (id: string) => {
    const task = state.tasks.find(t => t.id === id);
    if (task && !task.completed) {
        soundService.play('success');
    } else {
        soundService.play('switch');
    }
    updateState({
      ...state,
      tasks: state.tasks.map(t => {
        if (t.id === id) {
           return { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined };
        }
        return t;
      })
    });
  };

  const deleteTask = (id: string) => {
    soundService.play('delete');
    updateState({ ...state, tasks: state.tasks.filter(t => t.id !== id) });
  };

  const openScheduleTask = (task: Task) => {
    setSchedulingTaskId(task.id);
    setScheduleDay(task.scheduledDay || WEEK_DAYS[0]);
    setScheduleTime(task.scheduledTime || '09:00');
    setScheduleDuration(task.scheduledDuration || 30);
  };

  const saveTaskSchedule = () => {
    if (!schedulingTaskId || !scheduleDay || !scheduleTime) return;
    soundService.play('success');
    const scheduledDate = getNextOccurrenceDate(scheduleDay);
    updateState({
      ...state,
      tasks: state.tasks.map(t =>
        t.id === schedulingTaskId
          ? {
              ...t,
              scheduledDay: scheduleDay,
              scheduledTime: scheduleTime,
              scheduledDuration: scheduleDuration,
              scheduledDate
            }
          : t
      )
    });
    setSchedulingTaskId(null);
  };

  const removeTaskSchedule = (id: string) => {
    soundService.play('switch');
    updateState({
      ...state,
      tasks: state.tasks.map(t =>
        t.id === id
          ? { ...t, scheduledDay: undefined, scheduledTime: undefined, scheduledDuration: undefined, scheduledDate: undefined }
          : t
      )
    });
    setSchedulingTaskId(null);
  };

  // --- Focus Session Handlers ---
  const toggleTimer = () => {
      soundService.play('switch');
      if (!state.focusSession) {
          const duration = FOCUS_DURATIONS.focus;
          const now = Date.now();
          // Init
          updateState({
              ...state,
              focusSession: { isActive: true, mode: 'focus', timeLeft: duration, startTime: now, endTime: now + (duration * 1000) }
          });
      } else {
          const now = Date.now();
          const nextIsActive = !state.focusSession.isActive;
          const nextTimeLeft = state.focusSession.isActive && state.focusSession.endTime
            ? Math.max(0, Math.ceil((state.focusSession.endTime - now) / 1000))
            : state.focusSession.timeLeft;

          updateState({
              ...state,
              focusSession: {
                  ...state.focusSession,
                  isActive: nextIsActive,
                  timeLeft: nextTimeLeft,
                  startTime: nextIsActive ? now : state.focusSession.startTime,
                  endTime: nextIsActive ? now + (nextTimeLeft * 1000) : null
              }
          });
      }
  };

  const resetTimer = () => {
      soundService.play('click');
      updateState({
          ...state,
          focusSession: undefined
      });
  };

  const switchMode = (mode: 'focus' | 'dhikr') => {
      soundService.play('switch');
      updateState({
          ...state,
          focusSession: {
              isActive: false,
              mode: mode,
              timeLeft: FOCUS_DURATIONS[mode],
              startTime: null,
              endTime: null
          }
      });
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

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  // --- Muhasabah Handler ---
  const saveMuhasabah = () => {
      if (!muhasabahRating) return;
      soundService.play('success');
      const entry: MuhasabahEntry = {
          date: todayDate,
          rating: muhasabahRating,
          gratitude: muhasabahGratitude,
          struggle: muhasabahStruggle,
          improvements: muhasabahImprovements
      };
      const existing = state.muhasabah || [];
      updateState({ ...state, muhasabah: [...existing.filter(m => m.date !== todayDate), entry] });
      setIsMuhasabahSaved(true);
  };

  const handleFullExport = () => {
    // This will export a flattened version of the entire state that's relevant for AI
    const exportData: any[] = [];
    
    // Tasks
    state.tasks.forEach(t => exportData.push({ type: 'Task', ...t }));
    
    // Transactions
    state.transactions.forEach(t => exportData.push({ type: 'Transaction', ...t }));
    
    // Habits
    state.habits.forEach(h => exportData.push({ type: 'Habit', ...h, completedDates: h.completedDates.join('|') }));
    
    // Lessons
    state.lessons.forEach(l => exportData.push({ type: 'Lesson', ...l }));
    
    // Exercises
    state.exercises.forEach(e => exportData.push({ type: 'Exercise', ...e }));
    
    // Muhasabah
    state.muhasabah.forEach(m => exportData.push({ type: 'Reflection', ...m }));

    if (exportData.length === 0) {
      alert("No data to export.");
      return;
    }

    const filename = `full_life_data_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(exportData, filename);
  };

  // Hijri Date
  const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
  }).format(new Date());

  const getPriorityColor = (p: string) => {
      switch(p) {
          case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
          case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
          case 'low': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
          default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      }
  };

  const getTaskScheduleLabel = (task: Task) => {
      if (!task.scheduledDay || !task.scheduledTime) {
          return null;
      }

      return `${t(task.scheduledDay.toLowerCase() as any)} • ${task.scheduledTime}`;
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-4">
        <div className="space-y-1">
           <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
             {t('ahlan')}, <span className="text-indigo-600 dark:text-indigo-400">{auth.currentUser?.displayName || 'User'}</span>
           </h1>
           <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 font-medium text-xs md:text-sm animate-fade-in-up min-w-0">
               <Quote className="w-3 h-3 text-indigo-500 shrink-0" />
               <span className="italic line-clamp-2 md:line-clamp-1 opacity-80">"{quote}"</span>
           </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleFullExport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm uppercase tracking-widest"
          >
            <FileText className="w-4 h-4" />
            <span>{t('exportData')}</span>
          </button>
             <div className="bg-indigo-600 dark:bg-indigo-500 px-5 py-3 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 flex flex-col items-end justify-center min-w-[120px] max-w-[12rem]">
             <span className="text-[8px] font-black text-indigo-100 uppercase tracking-[0.2em] mb-0.5">{t('hijriDate')}</span>
                 <p className="text-white font-serif font-bold text-sm md:text-base dir-rtl leading-snug break-words text-right">{hijriDate}</p>
          </div>
        </div>
      </header>

      {/* QUICK GLANCE BAR - Modernized Bento Style */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-[2rem] flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                  <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block tracking-widest mb-0.5">{t('nextPrayer')}</span>
                  {nextPrayer ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{nextPrayer.name}</span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{nextPrayer.time}</span>
                      </div>
                  ) : <Loader2 className="w-3 h-3 animate-spin text-emerald-400"/>}
              </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-[2rem] flex items-center gap-4 shadow-sm group hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                  <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block tracking-widest mb-0.5">{t('nextClass')}</span>
                  {nextClass ? (
                      <div className="flex items-baseline gap-1.5">
                         <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{nextClass.time}</span>
                         <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 truncate">{nextClass.studentName.split(' ')[0]}</span>
                      </div>
                  ) : (
                      <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600">No Classes</span>
                  )}
              </div>
          </div>

          <div className="col-span-2 md:col-span-1 flex bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-[2rem] items-center gap-4 shadow-sm group hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                  <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block tracking-widest mb-0.5">{t('activeTasks')}</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{activeTaskCount}</span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{t('remaining')}</span>
                  </div>
              </div>
          </div>
      </div>

            <div className="md:hidden flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm gap-1">
                    <button
                        onClick={() => setMobileDashboardSection('today')}
                        className={`flex-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] transition-all ${mobileDashboardSection === 'today' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        {t('dashboard')}
                    </button>
                    <button
                        onClick={() => setMobileDashboardSection('faith')}
                        className={`flex-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] transition-all ${mobileDashboardSection === 'faith' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        {t('muslim')}
                    </button>
                    <button
                        onClick={() => setMobileDashboardSection('reflect')}
                        className={`flex-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] transition-all ${mobileDashboardSection === 'reflect' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        {t('muhasabah')}
                    </button>
            </div>

      {/* Main Grid Layout - Flex Col on Mobile (Reordered), Grid on Desktop */}
    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6 items-start">
        
        {/* COLUMN 1: SPIRITUALITY & ROUTINE */}
                <div className={`space-y-4 md:space-y-6 w-full order-2 lg:order-1 ${mobileDashboardSection === 'faith' ? 'block' : 'hidden'} lg:block`}>
            
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 lg:grid lg:grid-cols-1 lg:overflow-visible lg:snap-none lg:p-0 lg:mx-0 lg:gap-6">
                {/* Daily Islamic Wisdom */}
                <div className="min-w-[calc(100vw-2.75rem)] sm:min-w-0 lg:min-w-0 snap-start bg-amber-50/50 dark:bg-slate-900 border border-amber-100/50 dark:border-slate-800 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm transition-all hover:shadow-md relative overflow-hidden group lg:w-auto">
                    <div className="absolute -top-6 -right-6 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rotate-12">
                        <BookHeart className="w-40 h-40 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100 flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                            <ScrollText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        {t('dailyWisdom')}
                    </h2>
                    <div className="relative z-10">
                        <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 mb-4 border border-amber-200/50 dark:border-amber-800/50">
                            {dailyWisdom.type}
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 font-serif text-lg md:text-xl italic mb-6 leading-relaxed">
                            "{dailyWisdom.text}"
                        </p>
                        <div className="flex items-center justify-end gap-3">
                          <div className="h-px w-8 bg-amber-200 dark:bg-amber-800"></div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em]">
                              {dailyWisdom.source}
                          </p>
                        </div>
                    </div>
                </div>

                {/* Prayer Times Widget */}
                <div className="min-w-[calc(100vw-2.75rem)] sm:min-w-0 lg:min-w-0 snap-start bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm transition-all hover:shadow-md lg:w-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                                <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            {t('prayerTimes')}
                        </h2>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">{nextPrayer?.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Next</span>
                        </div>
                    </div>
                    {prayerTimes ? (
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(prayerTimes).slice(0, 6).map(([name, time]) => (
                            <div key={name} className={`flex flex-col items-center justify-center p-4 rounded-3xl border transition-all ${nextPrayer?.name === name ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20 scale-[1.05] z-10' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${nextPrayer?.name === name ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>{name}</span>
                                <span className={`font-mono font-bold text-sm ${nextPrayer?.name === name ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>{time as string}</span>
                            </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-emerald-600/50">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    )}
                    <button onClick={() => setView('muslim')} className="w-full mt-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-[0.2em] border border-slate-100 dark:border-slate-700">
                        Open Full Tracker
                    </button>
                </div>
            </div>

            {/* Daily Habits */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
                            <Droplets className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        {t('dailyHabits')}
                    </h2>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('progress')}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    {state.habits.slice(0,4).map(h => {
                    const isDone = h.completedDates.includes(todayDate);
                    return (
                        <button 
                            key={h.id}
                            onClick={() => {
                                const newDates = isDone 
                                ? h.completedDates.filter(d => d !== todayDate)
                                : [...h.completedDates, todayDate];
                                const newStreak = isDone ? Math.max(0, h.streak - 1) : h.streak + 1;
                                if (!isDone) soundService.play('success');
                                updateState({
                                    ...state,
                                    habits: state.habits.map(hb => hb.id === h.id ? { ...hb, completedDates: newDates, streak: newStreak } : hb)
                                });
                            }}
                            className={`flex flex-col items-center justify-center p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all group ${isDone ? 'bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-600/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-teal-200 dark:hover:border-teal-900/50'}`}
                        >
                            <div className={`mb-3 p-3 rounded-2xl transition-transform group-hover:scale-110 ${isDone ? 'bg-white/20' : 'bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-700'}`}>
                                {isDone ? <Check className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-center line-clamp-2 leading-tight break-words">{h.name}</span>
                        </button>
                    )
                    })}
                </div>
            </div>
        </div>

        {/* COLUMN 2: WORK & ACTION (Primary Focus) */}
        <div className={`space-y-4 md:space-y-6 w-full order-1 lg:order-2 ${mobileDashboardSection === 'today' ? 'block' : 'hidden'} lg:block`}>
            
            {/* Today's Schedule */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        {t('todaysSchedule')}
                    </h2>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-full border border-indigo-100 dark:border-indigo-800 uppercase tracking-widest">{todaysLessons.length} {t('classes')}</div>
                        <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full border border-blue-100 dark:border-blue-900/40 uppercase tracking-widest">{todaysScheduledTasks.length} planned tasks</div>
                    </div>
                </div>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {todaysAgenda.length > 0 ? (
                    todaysAgenda.map((item) => (
                        <div key={`${item.kind}-${item.id}`} className={`flex items-center gap-5 p-5 rounded-3xl transition-all border hover:shadow-md group ${item.kind === 'lesson' ? 'bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700' : 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 hover:border-blue-200 dark:hover:border-blue-800/40'}`}>
                            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-700 shrink-0 group-hover:scale-110 transition-transform">
                                <span className="text-sm font-black text-slate-800 dark:text-slate-200">{item.time.split(':')[0]}</span>
                                <span className="text-[10px] text-slate-400 font-black">{item.time.split(':')[1]}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base truncate">{item.title}</h4>
                                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.kind === 'lesson' ? 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-200' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                        {item.kind === 'lesson' ? t('classes') : 'Task'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || '#6366f1' }}></div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{item.subtitle}</p>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-600">•</span>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.duration}m</p>
                                  {item.location && (
                                    <>
                                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-600">•</span>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[10rem]">{item.location}</p>
                                    </>
                                  )}
                                </div>
                            </div>
                            <ChevronRight className={`w-5 h-5 transition-colors ${item.kind === 'lesson' ? 'text-slate-200 group-hover:text-indigo-500' : 'text-blue-300 group-hover:text-blue-500'}`} />
                        </div>
                    ))
                    ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem]">
                        <Calendar className="w-12 h-12 mb-4 opacity-10" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">No planned items today</p>
                    </div>
                    )}
                </div>
                <button onClick={() => setView('teacher')} className="w-full mt-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all uppercase tracking-[0.2em] border border-slate-100 dark:border-slate-700">
                    Manage Full Schedule
                </button>
            </div>

            {/* Tasks Widget */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm flex flex-col min-h-0 md:min-h-[500px]">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        {t('activeTasks')}
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <button 
                                onClick={() => setTaskTab('active')}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${taskTab === 'active' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
                            >
                                {t('todo')}
                            </button>
                            <button 
                                onClick={() => setTaskTab('history')}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${taskTab === 'history' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
                            >
                                {t('done')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Add Form */}
                {taskTab === 'active' && (
                    <form onSubmit={handleQuickAdd} className="mb-6 md:mb-8 space-y-4 bg-slate-50 dark:bg-slate-800/30 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800">
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder={t('whatNeedsToBeDone')} 
                                className="w-full pl-5 pr-12 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm placeholder:text-slate-400 text-sm font-medium"
                                value={quickNote}
                                onChange={(e) => setQuickNote(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-3 items-center justify-between">
                            <div className="flex gap-3 w-full sm:w-auto">
                                <select 
                                    value={newTaskPriority}
                                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                                    className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
                                >
                                    <option value="low">{t('low')}</option>
                                    <option value="medium">{t('medium')}</option>
                                    <option value="high">{t('high')}</option>
                                </select>
                                <select 
                                    value={newTaskCategory}
                                    onChange={(e) => setNewTaskCategory(e.target.value as any)}
                                    className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
                                >
                                    <option value="personal">{t('personal')}</option>
                                    <option value="work">{t('work')}</option>
                                    <option value="urgent">{t('urgent')}</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full sm:w-auto bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] px-8 py-2.5 rounded-xl font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-lg active:scale-95">
                                {t('addTask')}
                            </button>
                        </div>
                    </form>
                )}

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                    {filteredTasks.map(t => (
                        <div key={t.id} className="group bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl sm:rounded-3xl transition-all shadow-sm">
                        <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4">
                        <button 
                                 onClick={() => toggleTask(t.id)}
                                 className={`mt-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${t.completed ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'}`}
                        >
                            {t.completed && <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-0.5 sm:mb-1">
                                <span className={`text-xs sm:text-sm font-bold leading-tight line-clamp-2 break-words ${t.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {t.title}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1">
                                <span className={`px-1.5 py-0.5 rounded-lg font-black uppercase tracking-widest ${getPriorityColor(t.priority)}`}>
                                    {t.priority}
                                </span>
                                <span className="flex items-center gap-1 font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700"><Tag className="w-2 h-2 sm:w-2.5 sm:h-2.5"/> {t.category}</span>
                                {!t.completed && (
                                    <button
                                        onClick={() => openScheduleTask(t)}
                                        className={`flex items-center gap-1 font-black uppercase tracking-widest px-1.5 py-0.5 rounded-lg border transition-colors ${
                                            getTaskScheduleLabel(t) 
                                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-100 dark:border-blue-900/40' 
                                                : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:text-blue-600'
                                        }`}
                                    >
                                        <Calendar className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                                        {getTaskScheduleLabel(t) || 'Schedule'}
                                    </button>
                                )}
                                {t.completed && getTaskScheduleLabel(t) && (
                                    <span className="flex items-center gap-1 font-black uppercase tracking-widest bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 px-1.5 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                                        <Calendar className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                                        {getTaskScheduleLabel(t)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <button onClick={() => deleteTask(t.id)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 sm:p-2.5 text-slate-300 hover:text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl">
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        </div>

                        {/* Inline Schedule Popover */}
                        {schedulingTaskId === t.id && (
                            <div className="px-3 sm:px-4 pb-3 sm:pb-4 animate-fade-in">
                                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-3 sm:p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Schedule Task</span>
                                        <button onClick={() => setSchedulingTaskId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Day</label>
                                            <select 
                                                value={scheduleDay} 
                                                onChange={e => setScheduleDay(e.target.value)}
                                                className="w-full text-xs p-2 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                                            >
                                                {WEEK_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Time</label>
                                            <input 
                                                type="time" 
                                                value={scheduleTime} 
                                                onChange={e => setScheduleTime(e.target.value)}
                                                className="w-full text-xs p-2 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Duration</label>
                                            <select 
                                                value={scheduleDuration} 
                                                onChange={e => setScheduleDuration(parseInt(e.target.value))}
                                                className="w-full text-xs p-2 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                                            >
                                                <option value={15}>15m</option>
                                                <option value={30}>30m</option>
                                                <option value={45}>45m</option>
                                                <option value={60}>1h</option>
                                                <option value={90}>1.5h</option>
                                                <option value={120}>2h</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={saveTaskSchedule}
                                            className="flex-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.18em] py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-95"
                                        >
                                            Save to Schedule
                                        </button>
                                        {getTaskScheduleLabel(t) && (
                                            <button 
                                                onClick={() => removeTaskSchedule(t.id)}
                                                className="px-3 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-[0.18em] hover:bg-rose-100 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        </div>
                    ))}
                    
                    {filteredTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 md:h-64 text-slate-400 dark:text-slate-600">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-full mb-4">
                                <Archive className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t('noTasks')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* FOCUS FLOW WIDGET (Smaller & Moved Down) */}
            <div className="bg-slate-900 dark:bg-slate-950 border border-slate-800 p-4 sm:p-5 rounded-[2rem] shadow-xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                
                <div className="flex justify-between items-center mb-4 relative z-10">
                    <h2 className="text-xs font-bold flex items-center gap-2">
                        <Hourglass className="w-3.5 h-3.5 text-indigo-400" />
                        {t('focus')}
                    </h2>
                    <div className="flex bg-slate-800/50 backdrop-blur-sm rounded-lg p-0.5 border border-slate-700/50">
                        <button 
                            onClick={() => switchMode('focus')} 
                            className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest transition-all ${!state.focusSession || state.focusSession.mode === 'focus' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                        >
                            {t('work')}
                        </button>
                        <button 
                            onClick={() => switchMode('dhikr')} 
                            className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest transition-all ${state.focusSession?.mode === 'dhikr' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                        >
                            {t('dhikr')}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center relative z-10">
                    <div className="text-3xl sm:text-4xl font-mono font-black tracking-tighter mb-4 tabular-nums text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
                        {state.focusSession ? formatTime(state.focusSession.timeLeft) : '25:00'}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={toggleTimer}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 shadow-lg ${state.focusSession?.isActive ? 'bg-slate-800 text-rose-400 border border-slate-700' : 'bg-white text-slate-900'}`}
                        >
                            {state.focusSession?.isActive ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        </button>
                        <button 
                            onClick={resetTimer}
                            className="w-10 h-10 rounded-full bg-slate-800/50 text-slate-400 flex items-center justify-center hover:bg-slate-800 hover:text-white transition-all border border-slate-700/50"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div className={`space-y-4 md:space-y-6 w-full order-3 ${mobileDashboardSection === 'reflect' ? 'block' : 'hidden'} lg:block`}>

            <div className="grid grid-cols-1 gap-6">
                {/* MUHASABAH (DAILY REFLECTION) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm transition-all hover:shadow-md">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3 mb-8">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                            <BookHeart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        {t('muhasabah')}
                    </h2>
                    
                    {isMuhasabahSaved ? (
                        <div className="text-center py-10 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100/50 dark:border-emerald-900/20">
                            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100 dark:shadow-none">
                                <Check className="w-10 h-10" />
                            </div>
                            <h3 className="font-black text-slate-800 dark:text-slate-200 text-base uppercase tracking-widest">{t('reflectionLogged')}</h3>
                            <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-[0.2em]">{t('mayAllahAccept')}</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('dailyRating')}</span>
                                <div className="flex gap-1 flex-wrap justify-end">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button 
                                            key={star} 
                                            onClick={() => setMuhasabahRating(star)}
                                            className={`w-5 h-5 sm:w-7 sm:h-7 transition-all transform active:scale-90 ${muhasabahRating >= star ? 'text-amber-400 fill-amber-400 scale-110' : 'text-slate-200 dark:text-slate-700'}`}
                                        >
                                            <Star className="w-full h-full" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">{t('gratitude')}</label>
                                    <textarea 
                                        className="w-full p-4 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all placeholder:text-slate-400 min-h-[80px] resize-none"
                                        placeholder={t('reflectionPlaceholder')}
                                        value={muhasabahGratitude}
                                        onChange={e => setMuhasabahGratitude(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">{t('struggle')}</label>
                                    <textarea 
                                        className="w-full p-4 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all placeholder:text-slate-400 min-h-[80px] resize-none"
                                        placeholder={t('strugglePlaceholder')}
                                        value={muhasabahStruggle}
                                        onChange={e => setMuhasabahStruggle(e.target.value)}
                                    />
                                </div>
                             </div>
                             <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">{t('tomorrowImprovements')}</label>
                                <textarea 
                                    className="w-full p-4 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all placeholder:text-slate-400 min-h-[80px] resize-none"
                                    placeholder={t('improvementPlaceholder')}
                                    value={muhasabahImprovements}
                                    onChange={e => setMuhasabahImprovements(e.target.value)}
                                />
                             </div>
                            <button 
                                onClick={saveMuhasabah} 
                                disabled={!muhasabahRating}
                                className="w-full py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 disabled:opacity-50 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                            >
                                {t('saveReflection')}
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Habit Breaker Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            {t('habitBreaker')}
                        </h2>
                        <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{t('stayStrong')}</div>
                    </div>
                    <div className="space-y-4">
                        {state.badHabits.slice(0, 2).map(habit => {
                            const daysFree = Math.floor((new Date().getTime() - new Date(habit.lastRelapse).getTime()) / (1000 * 3600 * 24));
                            return (
                                <div key={habit.id} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 group hover:shadow-md transition-all">
                                    <div>
                                        <div className="font-bold text-red-800 dark:text-red-300 text-sm leading-tight mb-1">{habit.name}</div>
                                        <div className="text-[10px] font-bold text-red-600/70 dark:text-red-400/70 uppercase tracking-wider">{t('bestStreakShort', { days: habit.longestStreak })}</div>
                                    </div>
                                    <div className="text-right flex items-center gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums leading-none">{daysFree}</div>
                                            <div className="text-[8px] uppercase font-bold text-red-400 tracking-widest mt-1">{t('days')}</div>
                                        </div>
                                        <button 
                                            onClick={() => resetBadHabit(habit.id)}
                                            className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-100 dark:border-slate-700 transition-all shadow-sm active:scale-90" 
                                        >
                                            <RotateCcw className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                        {state.badHabits.length === 0 && (
                            <div className="text-center py-6 text-slate-400 text-xs font-medium italic">{t('noHabitsTracked')}</div>
                        )}
                        <button onClick={() => setView('lifestyle')} className="w-full mt-2 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-[0.2em] border border-slate-100 dark:border-slate-700">
                            {t('manageHabits')}
                        </button>
                    </div>
                </div>

                {/* Fitness Summary */}
                <div className="bg-rose-50/50 dark:bg-slate-900 border border-rose-100/50 dark:border-slate-800 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm transition-all hover:shadow-md relative overflow-hidden group">
                    <div className="absolute -bottom-6 -right-6 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity -rotate-12">
                        <Activity className="w-40 h-40 text-rose-600" />
                    </div>
                    <h2 className="text-lg font-bold text-rose-900 dark:text-rose-200 flex items-center gap-3 mb-8 relative z-10">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
                            <Activity className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                        </div>
                        {t('activity')}
                    </h2>
                    <div className="flex items-end justify-between relative z-10">
                        <div>
                            <div className="text-4xl md:text-5xl font-black text-rose-600 dark:text-rose-400 leading-none mb-2 tracking-tighter">{todaysActivity.mins}<span className="text-lg md:text-xl font-bold text-rose-400 ml-1">m</span></div>
                            <div className="text-[10px] uppercase font-black text-rose-400 tracking-[0.2em]">{t('activeTime')}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-black text-rose-500 dark:text-rose-300 leading-none mb-2 tracking-tight">{todaysActivity.cals}</div>
                            <div className="text-[10px] uppercase font-black text-rose-400 tracking-[0.2em]">{t('calories')}</div>
                        </div>
                    </div>
                </div>

                {/* Goals Widget */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-8 flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                            <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        {t('topGoals')}
                    </h2>
                    <div className="space-y-6">
                        {state.goals.length > 0 ? state.goals.slice(0, 2).map(g => (
                            <div key={g.id} className="group">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                                    <span className="text-slate-700 dark:text-slate-200 line-clamp-2 break-words pr-4">{g.title}</span>
                                    <span className="text-indigo-600 dark:text-indigo-400">{g.progress}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner">
                                    <div 
                                        className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full rounded-full transition-all duration-1000 ease-out shadow-lg shadow-yellow-500/20" 
                                        style={{width: `${g.progress}%`}}
                                    ></div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-slate-400 py-4 text-[10px] font-bold uppercase tracking-widest">{t('noGoals')}</div>
                        )}
                        <button onClick={() => setView('lifestyle')} className="w-full text-[10px] font-black text-center text-indigo-500 uppercase tracking-[0.2em] hover:underline mt-4">{t('exploreAllGoals')}</button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
