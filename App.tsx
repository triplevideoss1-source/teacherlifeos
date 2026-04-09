import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from './firebase';
import { View, AppState, Notification as AppNotification, APP_VIEWS } from './types';
import { loadState, saveState, defaultState, normalizeAppState } from './services/storage';
import { subscribeToAppState, saveAppStateToFirestore } from './services/firestoreService';
import { soundService } from './services/sounds';
import { requestNotificationPermission, showSystemNotification } from './services/notifications';
import { useTranslation } from './lib/translations';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import ErrorBoundary from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

const getNotificationUrl = (view: View, notificationId: string) => `/?view=${view}&notification=${notificationId}`;

// Lazy Load Modules for Performance
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const TeacherSchedule = React.lazy(() => import('./components/TeacherSchedule'));
const MuslimModule = React.lazy(() => import('./components/MuslimModule'));
const LifestyleModule = React.lazy(() => import('./components/LifestyleModule'));
const FinanceModule = React.lazy(() => import('./components/FinanceModule'));
const MealPlanner = React.lazy(() => import('./components/MealPlanner'));

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<View>('dashboard');
  const [state, setState] = useState<AppState>(loadState());
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const skipNextFirestoreSaveRef = useRef(false);
  const { t } = useTranslation(state.language);
  const enabledViews = useMemo(
    () => APP_VIEWS.filter((candidateView) => state.featureToggles?.views?.[candidateView]),
    [state.featureToggles]
  );

  // Auth listener & Firestore Sync
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      skipNextFirestoreSaveRef.current = false;
      
      if (currentUser) {
        setState(loadState());
        setIsInitialLoad(true);

        // Subscribe to real-time updates from Firestore
        unsubscribeFirestore = subscribeToAppState(
          currentUser.uid,
          (firestoreState) => {
            skipNextFirestoreSaveRef.current = true;
            setState(normalizeAppState(firestoreState));
          },
          () => {
            setIsInitialLoad(false);
          }
        );
      } else {
        // Reset state on logout
        setState(defaultState);
        setIsInitialLoad(false);
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }
      }
      setAuthLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  useEffect(() => {
    if (user) {
      saveState(state);
    }
  }, [state, user]);

  // Auto-save effect (Debounced to Firestore)
  useEffect(() => {
    if (user && !isInitialLoad) {
      if (skipNextFirestoreSaveRef.current) {
        skipNextFirestoreSaveRef.current = false;
        return;
      }
      
      const timeoutId = setTimeout(() => {
        saveAppStateToFirestore(user.uid, state);
      }, 2000); // 2 second debounce

      return () => clearTimeout(timeoutId);
    }
  }, [state, user, isInitialLoad]);

  // Apply Theme & RTL
  useEffect(() => {
    const root = window.document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Handle RTL for Arabic
    if (state.language === 'ar') {
      root.setAttribute('dir', 'rtl');
      root.classList.add('rtl');
    } else {
      root.setAttribute('dir', 'ltr');
      root.classList.remove('rtl');
    }
  }, [state.theme, state.language]);

  useEffect(() => {
    if (enabledViews.length > 0 && !enabledViews.includes(view)) {
      setView(enabledViews[0]);
    }
  }, [enabledViews, view]);

  useEffect(() => {
    const applyNotificationRoute = () => {
      const url = new URL(window.location.href);
      const requestedView = url.searchParams.get('view') as View | null;
      const notificationId = url.searchParams.get('notification');

      if (requestedView && APP_VIEWS.includes(requestedView) && enabledViews.includes(requestedView)) {
        setView(requestedView);
      }

      if (notificationId) {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(notification =>
            notification.id === notificationId ? { ...notification, read: true } : notification
          ),
        }));
      }
    };

    applyNotificationRoute();
    window.addEventListener('popstate', applyNotificationRoute);

    return () => {
      window.removeEventListener('popstate', applyNotificationRoute);
    };
  }, [enabledViews]);

  // Fetch Prayer Times
  useEffect(() => {
    const fetchPrayers = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          const date = new Date();
          const timestamp = Math.floor(date.getTime() / 1000);
          try {
            const res = await fetch(`https://api.aladhan.com/v1/timings/${timestamp}?latitude=${latitude}&longitude=${longitude}&method=2`);
            const data = await res.json();
            setPrayerTimes(data.data.timings);
          } catch (e) {
            console.error("Failed to fetch prayers", e);
          }
        }, () => {
           console.log("Geolocation permission denied. Using defaults or manual location in future.");
        });
      }
    };
    fetchPrayers();
  }, []);

  // --- COMPREHENSIVE REMINDER ENGINE ---
  useEffect(() => {
    if (!user) return;

    if (state.notificationPreferences.enabled && state.notificationPreferences.systemEnabled) {
      requestNotificationPermission().catch((error) => {
        console.error('Notification permission request failed:', error);
      });
    }

    const checkReminders = () => {
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
        const currentDateStr = now.toISOString().split('T')[0];
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTimeVal = currentHours * 60 + currentMinutes;

        const newNotifications: AppNotification[] = [];

        const alreadyNotified = (relatedId: string) => {
            return state.notifications.some(n => n.relatedId === relatedId);
        };

        const pushNotify = (
          title: string,
          message: string,
          type: AppNotification['type'],
          uniqueId: string,
          targetView: View = 'dashboard'
        ) => {
            if (!state.notificationPreferences.enabled || !state.notificationPreferences.types[type]) {
                return;
            }

            if (!alreadyNotified(uniqueId)) {
                const notificationId = Date.now().toString() + Math.random();
                newNotifications.push({
                    id: notificationId,
                    title,
                    message,
                    type,
                    timestamp: now.toISOString(),
                    read: false,
                    relatedId: uniqueId,
                    targetView,
                    targetUrl: getNotificationUrl(targetView, notificationId),
                });
            }
        };

        if (prayerTimes) {
            ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach(prayer => {
                const timeStr = prayerTimes[prayer];
                if (timeStr) {
                    const [h, m] = timeStr.split(':').map(Number);
                    const prayerTimeVal = h * 60 + m;
                    const diff = prayerTimeVal - currentTimeVal;
                    
                    // Check if this prayer is during a fixed event
                    const event = state.lessons.find(l => {
                        if (l.day !== currentDay || !l.isFixed) return false;
                        const [lh, lm] = l.time.split(':').map(Number);
                        const start = lh * 60 + lm;
                        const end = start + l.duration;
                        return prayerTimeVal >= start && prayerTimeVal < end;
                    });

                    if (event) {
                        // Prayer is during a fixed event. 
                        // Notify only when the event ends.
                        const [lh, lm] = event.time.split(':').map(Number);
                        const endTimeVal = lh * 60 + lm + event.duration;
                        
                        if (currentTimeVal === endTimeVal) {
                            pushNotify('Missed Prayer', `Your ${event.studentName} session just ended. Don't forget to pray ${prayer} which was during your class.`, 'prayer', `missed-prayer-${prayer}-${currentDateStr}`, 'muslim');
                        }
                    } else {
                        // Normal notification logic
                        if (diff <= 15 && diff > 0) {
                             pushNotify('Prayer Approaching', `${prayer} is in ${diff} minutes. Time to make wudu.`, 'prayer', `prayer-${prayer}-${currentDateStr}`, 'muslim');
                        }
                    }
                }
            });
        }

        if (currentDay === 'Friday' && currentHours >= 10 && currentHours < 14) {
             pushNotify('Jumu\'ah Mubarak', 'Don\'t forget to read Surah Al-Kahf today.', 'prayer', `kahf-${currentDateStr}`, 'muslim');
        }

        if ((currentDay === 'Sunday' || currentDay === 'Wednesday') && currentHours === 20) {
            const nextDay = currentDay === 'Sunday' ? 'Monday' : 'Thursday';
            pushNotify('Sunnah Fasting', `Tomorrow is ${nextDay}. Intend to fast?`, 'prayer', `fast-remind-${currentDateStr}`, 'muslim');
        }

        if (currentHours === 22) {
             const sunnahLog = state.sunnahs[currentDateStr];
             if (!sunnahLog || !sunnahLog.witr) {
                 pushNotify('End Your Day', 'Have you prayed Witr yet?', 'prayer', `witr-${currentDateStr}`, 'muslim');
             }
        }

        if (currentHours === 8 && currentMinutes < 30) {
            const todayClasses = state.lessons.filter(l => l.day === currentDay).length;
            const activeTasks = state.tasks.filter(t => !t.completed).length;
            pushNotify('Good Morning', `You have ${todayClasses} classes and ${activeTasks} tasks today. Bismillah!`, 'work', `morning-brief-${currentDateStr}`, 'dashboard');
        }

        const expiredSchedules = state.tasks.some(
            t => t.scheduledDate && t.scheduledDate < currentDateStr
        );
        if (expiredSchedules) {
            updateState(prev => ({
                ...prev,
                tasks: prev.tasks.map(t =>
                    t.scheduledDate && t.scheduledDate < currentDateStr
                        ? { ...t, scheduledDay: undefined, scheduledTime: undefined, scheduledDuration: undefined, scheduledDate: undefined }
                        : t
                )
            }));
        }

        state.lessons.filter(l => l.day === currentDay).forEach(lesson => {
            const [h, m] = lesson.time.split(':').map(Number);
            const lessonTimeVal = h * 60 + m;
            const diff = lessonTimeVal - currentTimeVal;

            if (diff <= 15 && diff > 0) {
                pushNotify('Upcoming Class', `Class with ${lesson.studentName} starts in ${diff} mins.`, 'work', `lesson-${lesson.id}-${currentDateStr}`, 'teacher');
            }
        });

        state.tasks
          .filter(task => {
            if (task.completed || !task.scheduledTime) return false;
            if (task.scheduledDate) return task.scheduledDate === currentDateStr;
            return task.scheduledDay === currentDay;
          })
          .forEach(task => {
            const [h, m] = task.scheduledTime!.split(':').map(Number);
            const taskTimeVal = h * 60 + m;
            const diff = taskTimeVal - currentTimeVal;

            if (diff <= 15 && diff > 0) {
              pushNotify('Planned Task', `${task.title} starts in ${diff} mins.`, 'work', `task-${task.id}-${currentDateStr}`, 'dashboard');
            }
          });

        if (currentDay === 'Sunday' && currentHours === 19) {
            pushNotify('Weekly Review', 'Take 10 mins to plan your classes for the upcoming week.', 'work', `weekly-plan-${currentDateStr}`, 'teacher');
        }

        if (currentHours === 14) {
            const water = state.waterIntake[currentDateStr] || 0;
            if (water < 4) {
                pushNotify('Hydration Alert', 'You haven\'t drunk much water today. Grab a glass!', 'habit', `water-check-1-${currentDateStr}`, 'lifestyle');
            }
        }
        
        if (currentHours === 19) {
            const water = state.waterIntake[currentDateStr] || 0;
            if (water < 6) {
                pushNotify('Hydration Check', 'Try to hit your water goal before bed.', 'habit', `water-check-2-${currentDateStr}`, 'lifestyle');
            }
        }

        if (currentHours === 18) {
            const steps = state.steps[currentDateStr] || 0;
            if (steps < 3000) {
                pushNotify('Get Moving', 'Your step count is low today. Go for a short walk?', 'habit', `steps-check-${currentDateStr}`, 'lifestyle');
            }
        }

        if (currentHours === 23) {
            pushNotify('Sleep Routine', 'Time to wind down. Recite Surah Mulk and 3 Quls.', 'habit', `sleep-${currentDateStr}`, 'lifestyle');
        }
        
        if (currentHours === 21) {
             const highPriorityPending = state.tasks.filter(t => !t.completed && t.priority === 'high').length;
             if (highPriorityPending > 0) {
                 pushNotify('Pending Tasks', `You have ${highPriorityPending} high priority tasks left. Reschedule or do them now?`, 'work', `tasks-pending-${currentDateStr}`, 'dashboard');
             }
        }

        if (newNotifications.length > 0) {
            soundService.play('notification');
            setState(prev => ({
                ...prev,
                notifications: [ ...newNotifications, ...prev.notifications ]
            }));
          if (state.notificationPreferences.systemEnabled && (document.hidden || !document.hasFocus())) {
            newNotifications.forEach((notification) => {
              showSystemNotification(notification).catch((error) => {
                console.error('System notification failed:', error);
              });
            });
            }
        }
    };

      checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [user, state.lessons, state.tasks, state.notifications, state.waterIntake, state.steps, state.sunnahs, prayerTimes, state.notificationPreferences]);

  const updateState = (newState: AppState | ((prev: AppState) => AppState)) => {
    if (typeof newState === 'function') {
      setState(prev => normalizeAppState(newState(prev)));
    } else {
      setState(normalizeAppState(newState));
    }
  };

  const markNotificationsRead = (id?: string) => {
      setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => 
            (id && n.id !== id) ? n : { ...n, read: true }
          )
      }));
  };

  const clearNotifications = () => {
      setState(prev => ({ ...prev, notifications: [] }));
  };

  const renderView = () => {
    if (enabledViews.length === 0) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">{t('features')}</div>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{t('noFeaturesEnabled')}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t('openSettingsToEnable')}</p>
          </div>
        </div>
      );
    }

    switch (view) {
      case 'dashboard':
        return <Dashboard state={state} updateState={updateState} prayerTimes={prayerTimes} setView={setView} />;
      case 'teacher':
        return <TeacherSchedule state={state} updateState={updateState} prayerTimes={prayerTimes} />;
      case 'muslim':
        return <MuslimModule state={state} updateState={updateState} prayerTimes={prayerTimes} />;
      case 'lifestyle':
        return <LifestyleModule state={state} updateState={updateState} />;
      case 'finance':
        return <FinanceModule state={state} updateState={updateState} />;
      case 'meals':
        return <MealPlanner state={state} updateState={updateState} />;
      default:
        return <Dashboard state={state} updateState={updateState} prayerTimes={prayerTimes} setView={setView} />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <Auth />
      </ErrorBoundary>
    );
  }

  if (!state.onboardingCompleted) {
    return (
      <ErrorBoundary>
        <Onboarding state={state} updateState={updateState} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Layout 
          currentView={view} 
          setView={setView} 
          state={state}
          updateState={updateState}
          notifications={state.notifications}
          markAsRead={markNotificationsRead}
          clearNotifications={clearNotifications}
      >
        <Suspense fallback={
          <div className="h-full w-full flex items-center justify-center text-slate-400">
             <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        }>
          {renderView()}
        </Suspense>
      </Layout>
    </ErrorBoundary>
  );
};

export default App;
