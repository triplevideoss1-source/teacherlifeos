import React, { useState, useRef, useEffect } from 'react';
import { View, Notification, AppState, Language } from '../types';
import { soundService } from '../services/sounds';
import { useTranslation } from '../lib/translations';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Home, Calendar, Moon, Heart, DollarSign, Utensils, Sun, Bell, X, Check, Trash2, Menu, LogOut, Info, Settings, Briefcase, Activity, User, Globe } from 'lucide-react';

interface Props {
  currentView: View;
  setView: (v: View) => void;
  children: React.ReactNode;
  state: AppState;
  updateState: (newState: AppState) => void;
  notifications: Notification[];
  markAsRead: (id?: string) => void;
  clearNotifications: () => void;
}

const Layout: React.FC<Props> = ({ currentView, setView, children, state, updateState, notifications, markAsRead, clearNotifications }) => {
  const { theme, language } = state;
  const { t, isRTL } = useTranslation(language);
  const setTheme = (nextTheme: AppState['theme']) => updateState({ ...state, theme: nextTheme });
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;
  const languageOptions: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Francais' },
    { code: 'ar', label: 'العربية' },
  ];
  
  // Toast State
  const [activeToast, setActiveToast] = useState<Notification | null>(null);
  const prevNotifLength = useRef(notifications.length);

  const allNavItems: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t('dashboard'), icon: <Home className="w-5 h-5" /> },
    { id: 'teacher', label: t('teacher'), icon: <Calendar className="w-5 h-5" /> },
    { id: 'muslim', label: t('muslim'), icon: <Moon className="w-5 h-5" /> },
    { id: 'finance', label: t('finance'), icon: <DollarSign className="w-5 h-5" /> },
    { id: 'lifestyle', label: t('lifestyle'), icon: <Heart className="w-5 h-5" /> },
    { id: 'meals', label: t('meals'), icon: <Utensils className="w-5 h-5" /> },
  ];
  const visibleNavItems = allNavItems.filter((item) => state.featureToggles.views[item.id]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowSettingsMenu(false);
      setIsSidebarOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateLanguage = (nextLanguage: Language) => {
    updateState({ ...state, language: nextLanguage });
  };

  const toggleFeature = (feature: View) => {
    updateState({
      ...state,
      featureToggles: {
        ...state.featureToggles,
        views: {
          ...state.featureToggles.views,
          [feature]: !state.featureToggles.views[feature],
        },
      },
    });
  };

  const enableAllFeatures = () => {
    updateState({
      ...state,
      featureToggles: {
        ...state.featureToggles,
        views: Object.fromEntries(allNavItems.map((item) => [item.id, true])) as AppState['featureToggles']['views'],
      },
    });
  };

  const ensureViewEnabled = (targetView: View) => {
    if (state.featureToggles.views[targetView]) {
      return;
    }

    updateState({
      ...state,
      featureToggles: {
        ...state.featureToggles,
        views: {
          ...state.featureToggles.views,
          [targetView]: true,
        },
      },
    });
  };

  const updateNotificationPreferences = (updater: (current: AppState['notificationPreferences']) => AppState['notificationPreferences']) => {
    updateState({
      ...state,
      notificationPreferences: updater(state.notificationPreferences),
    });
  };

  const openSettingsMenu = () => {
    setShowNotifications(false);
    setShowSettingsMenu(true);
  };

  // Audio Unlocker: Initialize audio engine on first interaction
  useEffect(() => {
      const unlockAudio = () => {
          soundService.initialize();
          // Remove listeners after first interaction
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('keydown', unlockAudio);
          window.removeEventListener('touchstart', unlockAudio);
      };

      window.addEventListener('click', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
      window.addEventListener('touchstart', unlockAudio);

      return () => {
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('keydown', unlockAudio);
          window.removeEventListener('touchstart', unlockAudio);
      };
  }, []);

  // Toast Logic: Detect new notifications
  useEffect(() => {
      if (notifications.length > prevNotifLength.current) {
          const newNotif = notifications[0]; // Assuming new ones are unshifted to front
          if (!newNotif.read) {
              setActiveToast(newNotif);
              const timer = setTimeout(() => setActiveToast(null), 5000); // Hide after 5s
              return () => clearTimeout(timer);
          }
      }
      prevNotifLength.current = notifications.length;
  }, [notifications]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle Mobile Nav Click (Closes drawer if open)
  const handleNavClick = (view: View) => {
      setView(view);
      setIsSidebarOpen(false);
  };

  const openNotification = (notification: Notification) => {
    markAsRead(notification.id);

    const targetView = notification.targetView || 'dashboard';
    ensureViewEnabled(targetView);
    setView(targetView);

    if (notification.targetUrl) {
      window.history.replaceState({}, '', notification.targetUrl);
    }

    setShowNotifications(false);
    setActiveToast(null);
    setIsSidebarOpen(false);
  };

  const Logo = () => (
      <div className="flex items-center gap-3">
          <img 
            src="https://res.cloudinary.com/dy1zfsiwp/image/upload/v1765454170/Logo_am1fwm.png" 
            alt="Younesslifehub Logo" 
            className="h-8 w-auto object-contain"
          />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-400">
            Younesslifehub
          </span>
      </div>
  );

  const SidebarContent = () => {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 h-full shadow-2xl md:shadow-none">
          <div className="px-4 py-6 flex justify-between items-center">
             <Logo />
             {/* Close button for Mobile Drawer */}
             <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                 <X className="w-5 h-5" />
             </button>
          </div>

          <div className="px-4 py-2">
               <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-100 dark:border-indigo-500/20 mb-4">
                   <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">{t('focus')}</p>
                   <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{t('consistencyIsKey')}"</p>
               </div>
          </div>
          
          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar py-4">
            {visibleNavItems.map(item => (
                <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm duration-300 group ${
                    currentView === item.id 
                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                >
                <div className={`transition-transform duration-300 group-hover:scale-110 ${currentView === item.id ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-500'}`}>
                  {item.icon}
                </div>
                {item.label}
                </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
             <button 
                onClick={() => {
                  openSettingsMenu();
                  setIsSidebarOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
             >
                <div className="flex items-center gap-3 min-w-0">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{t('settings')}</div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {user?.displayName || user?.email?.split('@')[0]}
                    </div>
                  </div>
                </div>
                <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
             </button>
          </div>
      </div>
    );
  };

  // --- Notification Styling Helpers ---

  const getNotificationItemStyles = (n: Notification) => {
      const base = "p-4 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all relative group border-l-[3px]";
      
      if (n.read) {
          return `${base} border-l-transparent opacity-60 hover:opacity-100 bg-white dark:bg-slate-900`;
      }
      
      switch(n.type) {
          case 'prayer': return `${base} border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-900/10`;
          case 'work': return `${base} border-l-blue-500 bg-blue-50/40 dark:bg-blue-900/10`;
          case 'habit': return `${base} border-l-rose-500 bg-rose-50/40 dark:bg-rose-900/10`;
          default: return `${base} border-l-slate-400 bg-slate-50 dark:bg-slate-800`;
      }
  };

  const getBadgeStyles = (type: Notification['type']) => {
    switch(type) {
        case 'prayer': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
        case 'work': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
        case 'habit': return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-800';
        default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
    }
  };

  const getToastStyles = (type: Notification['type']) => {
      const base = "fixed bottom-24 md:bottom-6 right-6 z-50 max-w-sm w-[90%] md:w-full mx-auto md:mx-0 p-4 rounded-xl shadow-2xl border flex items-start gap-3 animate-fade-in-up transition-all duration-500 bg-white dark:bg-slate-900 border-l-4";
      switch(type) {
          case 'prayer': return `${base} border-l-emerald-500 border-slate-100 dark:border-slate-800`;
          case 'work': return `${base} border-l-blue-500 border-slate-100 dark:border-slate-800`;
          case 'habit': return `${base} border-l-rose-500 border-slate-100 dark:border-slate-800`;
          default: return `${base} border-l-slate-500 border-slate-100 dark:border-slate-800`;
      }
  };

  const getToastIcon = (type: Notification['type']) => {
      const cls = "w-5 h-5";
      switch(type) {
          case 'prayer': return <Moon className={cls} />;
          case 'work': return <Briefcase className={cls} />;
          case 'habit': return <Activity className={cls} />;
          default: return <Info className={cls} />;
      }
  }

  const getToastIconBg = (type: Notification['type']) => {
      switch(type) {
          case 'prayer': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
          case 'work': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
          case 'habit': return 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
          default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      }
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200 overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 z-20">
          <SidebarContent />
      </aside>

      {/* Mobile Drawer (Hamburger Content) */}
      {isSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-slate-900/20 dark:bg-black/50 backdrop-blur-sm animate-fade-in"
                onClick={() => setIsSidebarOpen(false)}
              ></div>
              {/* Sidebar Panel */}
              <div className="absolute inset-y-0 left-0 w-[80%] max-w-xs animate-slide-in-right h-full">
                  <SidebarContent />
              </div>
          </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
          
          {/* Top Header */}
          <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md sticky top-0 z-30">
             
             {/* Mobile Hamburger & Logo */}
             <div className="flex items-center gap-3 md:hidden">
                 <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 -ml-2 text-slate-600 dark:text-slate-300 rounded-lg active:bg-slate-100 dark:active:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                 >
                     <Menu className="w-6 h-6" />
                 </button>
                 <img 
                    src="https://res.cloudinary.com/dy1zfsiwp/image/upload/v1765454170/Logo_am1fwm.png" 
                    alt="Logo" 
                    className="h-8 w-auto"
                 />
             </div>

             {/* Desktop Title */}
             <div className="hidden md:block">
                 <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 capitalize">
                    {allNavItems.find(i => i.id === currentView)?.label || t('settings')}
                 </h2>
             </div>

             {/* Right Actions */}
             <div className="flex items-center gap-2">
                <div className="relative" ref={notificationRef}>
                   <button 
                    onClick={() => {
                      setShowSettingsMenu(false);
                      setShowNotifications(!showNotifications);
                    }}
                    className="p-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all border border-slate-200 dark:border-slate-800 shadow-sm relative"
                   >
                     <Bell className="w-5 h-5" />
                     {unreadCount > 0 && (
                         <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                     )}
                   </button>
                   
                   {/* Notification Dropdown */}
                   {showNotifications && (
                       <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden animate-fade-in origin-top-right">
                           <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                               <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">{t('notifications')}</h3>
                               <div className="flex gap-1">
                                   <button onClick={() => markAsRead()} title={t('markAllRead')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-indigo-500 transition-colors"><Check className="w-4 h-4" /></button>
                                   <button onClick={() => { clearNotifications(); setShowNotifications(false); }} title={t('clearAll')} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                               </div>
                           </div>
                           <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                               {notifications.length === 0 ? (
                                   <div className="p-12 text-center flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
                                       <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full">
                                            <Bell className="w-6 h-6 opacity-30" />
                                       </div>
                                       <span className="text-sm font-medium">{t('allCaughtUp')}</span>
                                   </div>
                               ) : (
                                   notifications.map(n => (
                                       <button
                                           key={n.id}
                                           type="button"
                                           onClick={() => openNotification(n)}
                                           className={`${getNotificationItemStyles(n)} w-full text-left`}
                                       >
                                           <div className="flex justify-between items-start mb-1.5">
                                               <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${getBadgeStyles(n.type)}`}>
                                                   {n.type}
                                               </span>
                                               <span className="text-[10px] text-slate-400 font-mono">{new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                           </div>
                                           <h4 className={`text-sm font-bold mb-0.5 ${!n.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{n.title}</h4>
                                           <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{n.message}</p>
                                           {!n.read && (
                                               <span className="absolute right-4 bottom-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Unread">
                                                   <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                                               </span>
                                           )}
                                       </button>
                                   ))
                               )}
                           </div>
                       </div>
                   )}
                </div>
                <div className="relative" ref={settingsRef}>
                   <button 
                    onClick={() => {
                      setShowNotifications(false);
                      setShowSettingsMenu(prev => !prev);
                    }}
                    className="p-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
                    title={t('settings')}
                   >
                     <Settings className="w-5 h-5" />
                   </button>

                   {showSettingsMenu && (
                     <div className="absolute right-0 top-full mt-3 w-[min(42rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden animate-fade-in origin-top-right max-h-[calc(100vh-5rem)] overflow-y-auto custom-scrollbar">
                       <div className="relative overflow-hidden">
                         <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.18),_transparent_55%),radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_45%)]"></div>

                         {/* Compact header with profile + quick actions */}
                         <div className="relative p-4 md:p-6 border-b border-slate-100 dark:border-slate-800">
                           <div className="flex items-center gap-3 md:gap-4">
                             {user?.photoURL ? (
                               <img src={user.photoURL} alt="Profile" className="w-10 h-10 md:w-12 md:h-12 rounded-2xl shadow-sm shrink-0" referrerPolicy="no-referrer" />
                             ) : (
                               <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm">
                                 <User className="w-5 h-5" />
                               </div>
                             )}
                             <div className="min-w-0 flex-1">
                               <div className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 truncate">{user?.displayName || user?.email?.split('@')[0]}</div>
                               <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</div>
                             </div>
                             <button 
                               onClick={handleLogout}
                               className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors font-semibold text-xs"
                             >
                               <LogOut className="w-3.5 h-3.5" />
                               <span className="hidden sm:inline">{t('logout')}</span>
                             </button>
                           </div>
                         </div>

                         <div className="relative p-4 md:p-6 space-y-4">
                           {/* Row 1: Theme + Language side by side */}
                           <div className="grid grid-cols-2 gap-3">
                             {/* Theme */}
                             <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 md:p-4 dark:border-slate-800 dark:bg-slate-950/40">
                               <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500 mb-2.5">
                                 <Sun className="w-3 h-3" /> {t('theme')}
                               </div>
                               <div className="grid grid-cols-2 gap-1.5">
                                 <button
                                   onClick={() => setTheme('light')}
                                   className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${theme === 'light' ? 'border-indigo-200 bg-white text-slate-900 shadow-sm dark:border-indigo-900/40 dark:bg-slate-900 dark:text-white' : 'border-slate-200 bg-white/70 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300'}`}
                                 >
                                   <Sun className="w-3.5 h-3.5" />
                                   {t('light')}
                                 </button>
                                 <button
                                   onClick={() => setTheme('dark')}
                                   className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${theme === 'dark' ? 'border-indigo-200 bg-white text-slate-900 shadow-sm dark:border-indigo-900/40 dark:bg-slate-900 dark:text-white' : 'border-slate-200 bg-white/70 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300'}`}
                                 >
                                   <Moon className="w-3.5 h-3.5" />
                                   {t('dark')}
                                 </button>
                               </div>
                             </div>

                             {/* Language */}
                             <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 md:p-4 dark:border-slate-800 dark:bg-slate-950/40">
                               <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500 mb-2.5">
                                 <Globe className="w-3 h-3" /> {t('language')}
                               </div>
                               <div className="grid grid-cols-3 gap-1.5">
                                 {languageOptions.map((option) => (
                                   <button
                                     key={option.code}
                                     onClick={() => updateLanguage(option.code)}
                                     className={`px-1.5 py-2 rounded-xl border text-[10px] font-bold transition-colors text-center ${language === option.code ? 'bg-white text-indigo-600 border-indigo-200 shadow-sm dark:bg-slate-900 dark:text-indigo-400 dark:border-indigo-900/40' : 'bg-white/70 text-slate-500 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-700'}`}
                                   >
                                     {option.label}
                                   </button>
                                 ))}
                               </div>
                             </div>
                           </div>

                           <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 md:p-4 dark:border-slate-800 dark:bg-slate-950/40">
                             <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500 mb-3">
                               <Bell className="w-3 h-3" /> Notification Settings
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                               <button
                                 onClick={() => updateNotificationPreferences(current => ({ ...current, enabled: !current.enabled }))}
                                 className={`rounded-xl border px-3 py-3 text-left transition-all ${state.notificationPreferences.enabled ? 'border-indigo-200 bg-white shadow-sm dark:border-indigo-900/40 dark:bg-slate-900/80' : 'border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/50 opacity-70'}`}
                               >
                                 <div className="text-xs font-bold text-slate-800 dark:text-slate-200">In-app notifications</div>
                                 <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Store alerts in the bell menu and show toast popups.</div>
                               </button>

                               <button
                                 onClick={() => updateNotificationPreferences(current => ({ ...current, systemEnabled: !current.systemEnabled }))}
                                 className={`rounded-xl border px-3 py-3 text-left transition-all ${state.notificationPreferences.systemEnabled ? 'border-indigo-200 bg-white shadow-sm dark:border-indigo-900/40 dark:bg-slate-900/80' : 'border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/50 opacity-70'}`}
                               >
                                 <div className="text-xs font-bold text-slate-800 dark:text-slate-200">System notifications</div>
                                 <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Show clickable browser notifications when the app is in the background.</div>
                               </button>
                             </div>

                             <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                               {([
                                 ['prayer', 'Prayer reminders'],
                                 ['work', 'Work and classes'],
                                 ['habit', 'Habits and health'],
                                 ['general', 'General alerts'],
                               ] as const).map(([type, label]) => {
                                 const isEnabled = state.notificationPreferences.types[type];
                                 return (
                                   <button
                                     key={type}
                                     onClick={() => updateNotificationPreferences(current => ({
                                       ...current,
                                       types: {
                                         ...current.types,
                                         [type]: !current.types[type],
                                       },
                                     }))}
                                     className={`rounded-xl border px-3 py-3 text-left transition-all ${isEnabled ? 'border-indigo-200 bg-white shadow-sm dark:border-indigo-900/40 dark:bg-slate-900/80' : 'border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/50 opacity-70'}`}
                                   >
                                     <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{label}</div>
                                     <div className={`mt-2 h-1.5 w-8 rounded-full ${isEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                   </button>
                                 );
                               })}
                             </div>
                           </div>

                           {/* Row 2: Feature toggles - compact grid */}
                           <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 md:p-4 dark:border-slate-800 dark:bg-slate-950/40">
                             <div className="flex items-center justify-between gap-2 mb-3">
                               <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                                 <Settings className="w-3 h-3" /> {t('featureVisibility')}
                               </div>
                               <button
                                 onClick={enableAllFeatures}
                                 className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-300"
                               >
                                 {t('restoreAllFeatures')}
                               </button>
                             </div>

                             <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                               {allNavItems.map((item) => {
                                 const isEnabled = state.featureToggles.views[item.id];
                                 return (
                                   <button
                                     key={item.id}
                                     onClick={() => toggleFeature(item.id)}
                                     className={`rounded-xl border px-2 py-2.5 text-center transition-all ${isEnabled ? 'border-indigo-200 bg-white shadow-sm dark:border-indigo-900/40 dark:bg-slate-900/80' : 'border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/50 opacity-60'}`}
                                   >
                                     <div className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl ${isEnabled ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                                       {React.cloneElement(item.icon as React.ReactElement, { className: 'w-3.5 h-3.5' })}
                                     </div>
                                     <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{item.label}</div>
                                     <div className={`mt-1 mx-auto h-1.5 w-6 rounded-full transition-colors ${isEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                   </button>
                                 );
                               })}
                             </div>

                             {visibleNavItems.length === 0 && (
                               <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                                 {t('noFeaturesEnabled')}
                               </p>
                             )}
                           </div>
                         </div>
                       </div>
                     </div>
                   )}
                </div>
             </div>
          </header>

           <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 md:p-8 custom-scrollbar pb-24 md:pb-10">
             <div className="max-w-7xl mx-auto w-full min-w-0">
                {children}
             </div>
          </main>
          
          {/* Mobile Bottom Navigation - Modern Floating Style */}
          <div className="md:hidden fixed bottom-6 inset-x-4 z-40">
            <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] px-2 py-2">
                <div className="flex items-center justify-around">
                    {visibleNavItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setView(item.id)}
                          className={`flex flex-col items-center justify-center py-2 px-3 gap-1 rounded-2xl transition-all duration-300 relative ${currentView === item.id ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        >
                            <div className={`transition-all duration-300 ${currentView === item.id ? 'scale-110' : 'scale-100'}`}>
                              {React.cloneElement(item.icon as React.ReactElement, { 
                                  className: `w-5 h-5 ${currentView === item.id ? 'stroke-[2.5px]' : 'stroke-[2px]'}` 
                              })}
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-tighter transition-all duration-300 ${currentView === item.id ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                              {item.label}
                            </span>
                            {currentView === item.id && (
                              <div className="absolute -bottom-1 w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.6)]"></div>
                            )}
                        </button>
                    ))}
                </div>
            </nav>
          </div>

          {/* TOAST NOTIFICATION - Refined */}
          {activeToast && (
              <div className={getToastStyles(activeToast.type)}>
                  <div className={`${getToastIconBg(activeToast.type)} p-2 rounded-full shrink-0`}>
                      {getToastIcon(activeToast.type)}
                  </div>
                  <button type="button" onClick={() => openNotification(activeToast)} className="flex-1 text-left">
                      <h4 className="font-bold text-sm mb-0.5 text-slate-900 dark:text-slate-100">{activeToast.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{activeToast.message}</p>
                  </button>
                  <button onClick={() => setActiveToast(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <X className="w-4 h-4" />
                  </button>
              </div>
          )}
      </div>
    </div>
  );
};

export default Layout;
