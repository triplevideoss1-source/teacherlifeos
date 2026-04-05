
export type View = 'dashboard' | 'teacher' | 'muslim' | 'lifestyle' | 'finance' | 'meals';
export type Theme = 'light' | 'dark';
export type Language = 'en' | 'fr' | 'ar';

export const APP_VIEWS: View[] = ['dashboard', 'teacher', 'muslim', 'lifestyle', 'finance', 'meals'];

export interface FeatureToggles {
  views: Record<View, boolean>;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  category: 'work' | 'personal' | 'urgent';
  priority: 'low' | 'medium' | 'high';
  date?: string;
  createdAt: string;
  completedAt?: string;
  scheduledDay?: string;
  scheduledTime?: string;
  scheduledDuration?: number;
}

export interface Lesson {
  id: string;
  studentName: string; // Acts as Title
  subject: string;    // Acts as Subtitle
  day: string;        // 'Monday', 'Tuesday', etc.
  time: string;       // "HH:MM" 24h format
  duration: number;   // in minutes
  color: string;      // Hex or Tailwind class
  location: string;
  notes: string;
  isFixed?: boolean;
}

export interface ClassTemplate {
  id: string;
  title: string;
  subject: string;
  color: string;
  duration: number;
  location?: string;
  notes?: string;
}

export interface Dua {
  id: string;
  title: string;
  arabic?: string;
  translation: string;
  category: string;
  source?: string;
}

export interface AdhkarItem {
  id: string;
  text: string;
  count: number;
  time: 'morning' | 'evening' | 'sleep';
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  isSubscription: boolean;
}

export interface Budget {
  category: string;
  limit: number;
  period: 'monthly' | 'weekly';
}

export interface FixedItem {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  dayOfMonth: number;
  active: boolean;
}

export interface Habit {
  id: string;
  name: string;
  streak: number;
  completedDates: string[]; // ISO date strings
}

export interface BrainDumpItem {
  id: string;
  content: string;
  createdAt: string;
  status: 'new' | 'processed';
}

export interface MealPlan {
  [day: string]: {
    lunch: string;
    dinner: string;
    suhoor?: string;
    iftar?: string;
  };
}

export interface QuranProgress {
  lastRead: { surah: string; ayah: number };
  memorization: { surah: string; ayah: number };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'prayer' | 'work' | 'habit' | 'general';
  timestamp: string;
  read: boolean;
  relatedId?: string; // To prevent duplicate reminders for the same event
}

export interface ReadingBook {
  id: string;
  title: string;
  author: string;
  currentPage: number;
  totalPages: number;
  isCompleted: boolean;
}

export interface BadHabit {
  id: string;
  name: string;
  lastRelapse: string; // ISO Date string
  longestStreak: number;
}

export interface Goal {
  id: string;
  title: string;
  category: 'health' | 'finance' | 'personal' | 'faith' | 'career';
  deadline?: string;
  progress: number; // 0-100
  completed: boolean;
}

export interface Exercise {
  id: string;
  activity: string;
  duration: number; // minutes
  calories?: number;
  date: string; // ISO date
}

export interface RamadanDayLog {
  fasted: boolean;
  taraweeh: boolean;
  suhoor: boolean;
  sadaqah: boolean;
  juz: boolean;
}

export interface MuhasabahEntry {
  date: string;
  rating: number; // 1-5
  gratitude: string;
  struggle: string;
  improvements: string;
}

export interface FocusSession {
  isActive: boolean;
  mode: 'focus' | 'dhikr' | 'break';
  timeLeft: number; // seconds
  startTime: number | null;
}

export interface AppState {
  theme: Theme;
  featureToggles: FeatureToggles;
  notifications: Notification[];
  tasks: Task[];
  lessons: Lesson[];
  classTemplates: ClassTemplate[];
  duas: Dua[];
  transactions: Transaction[];
  habits: Habit[];
  brainDump: BrainDumpItem[];
  meals: MealPlan;
  quran: QuranProgress;
  sunnahs: {
    [date: string]: {
      fajr: boolean; // 2 rakah
      dhuhr: boolean; // 4+2
      asr: boolean; // 0 (non-muakkadah usually not tracked here or optional)
      maghrib: boolean; // 2
      isha: boolean; // 2
      witr: boolean;
    }
  };
  adhkarLog: { [date: string]: { morning: boolean; evening: boolean; sleep: boolean } };
  ramadanMode: boolean;
  ramadanLog: { [date: string]: RamadanDayLog };
  khatam: boolean[]; // Array of 30 booleans for Juz completion
  qada: {
    fajr: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
    witr: number;
  };
  waterIntake: { [date: string]: number }; // cups per day
  mood: { [date: string]: 'great' | 'good' | 'neutral' | 'tired' | 'stressed' };
  steps: { [date: string]: number };
  reading: ReadingBook[];
  badHabits: BadHabit[];
  goals: Goal[];
  exercises: Exercise[];
  scheduleSettings: {
    startHour: number;
    endHour: number;
    interval: number; // minutes
    daysToShow: string[];
  };
  muhasabah: MuhasabahEntry[];
  focusSession?: FocusSession;
  financeCategories?: string[];
  budgets?: Budget[];
  fixedItems?: FixedItem[];
  language: Language;
  onboardingCompleted: boolean;
}
