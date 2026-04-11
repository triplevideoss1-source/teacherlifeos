import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AppState, Lesson, ClassTemplate, Task } from '../types';
import { useTranslation } from '../lib/translations';
import { exportToCSV } from '../lib/exportUtils';
import { Plus, Trash2, MapPin, Settings, X, GripVertical, Maximize2, Download, Minimize2, Palette, Clock, FileText, Edit2, Calendar, Pin, ListChecks, ChevronLeft, ChevronRight } from 'lucide-react';
import { soundService } from '../services/sounds';

interface Props {
  state: AppState;
  updateState: (s: AppState) => void;
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#d946ef', '#64748b',
];

type ScheduledItem = {
  id: string;
  type: 'lesson' | 'task';
  day: string;
  time: string;
  duration: number;
  color: string;
  title: string;
  subtitle: string;
  location?: string;
  notes?: string;
  isFixed?: boolean;
  priority?: Task['priority'];
};

type LayoutItem = ScheduledItem & { col: number; totalCols: number };

const HOUR_HEIGHT = 64;

const toLocalDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getTaskColor = (p: Task['priority']) =>
  p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#3b82f6';

const timeToMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const minToTime = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
};

const layoutEvents = (items: ScheduledItem[]): LayoutItem[] => {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
  const clusters: ScheduledItem[][] = [];
  let currentCluster: ScheduledItem[] = [];
  let clusterEnd = 0;
  for (const item of sorted) {
    const start = timeToMin(item.time);
    const end = start + Math.max(item.duration, 15);
    if (currentCluster.length === 0 || start < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = end;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);
  const result: LayoutItem[] = [];
  for (const cluster of clusters) {
    const columns: ScheduledItem[][] = [];
    for (const item of cluster) {
      const start = timeToMin(item.time);
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        const colEnd = Math.max(...columns[c].map(i => timeToMin(i.time) + Math.max(i.duration, 15)));
        if (start >= colEnd) {
          columns[c].push(item);
          result.push({ ...item, col: c, totalCols: 0 });
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([item]);
        result.push({ ...item, col: columns.length - 1, totalCols: 0 });
      }
    }
    const totalCols = columns.length;
    for (const r of result) {
      if (cluster.some(g => g.id === r.id && g.type === r.type) && r.totalCols === 0) {
        r.totalCols = totalCols;
      }
    }
  }
  return result;
};

const getCurrentDayName = () => ALL_DAYS[(new Date().getDay() + 6) % 7];

const TeacherSchedule: React.FC<Props> = ({ state, updateState }) => {
  const { t } = useTranslation(state.language);
  const [showSettings, setShowSettings] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTableOverlay, setShowTableOverlay] = useState(false);
  const [placingTemplate, setPlacingTemplate] = useState<ClassTemplate | null>(null);
  const [movingLessonId, setMovingLessonId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ClassTemplate> | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didScrollRef = useRef(false);

  const settings = state.scheduleSettings || { startHour: 8, endHour: 20, interval: 60, daysToShow: ALL_DAYS };
  const [mobileDay, setMobileDay] = useState(() => {
    const today = getCurrentDayName();
    return settings.daysToShow.includes(today) ? today : settings.daysToShow[0] || ALL_DAYS[0];
  });

  const startHour = Math.max(0, Math.min(23, settings.startHour));
  const endHour = Math.max(startHour + 1, Math.min(24, settings.endHour));
  const totalHours = endHour - startHour;
  const totalHeight = totalHours * HOUR_HEIGHT;
  const daysToShow = settings.daysToShow.length > 0 ? settings.daysToShow : ALL_DAYS;
  const startMin = startHour * 60;
  const endMin = endHour * 60;

  const updateSettings = (ns: Partial<typeof settings>) => updateState({ ...state, scheduleSettings: { ...settings, ...ns } });
  const getEmptyTemplate = (): Partial<ClassTemplate> => ({ title: '', subject: '', duration: settings.interval, color: COLORS[5], location: '', notes: '' });

  useEffect(() => {
    if (!daysToShow.includes(mobileDay)) {
      const today = getCurrentDayName();
      setMobileDay(daysToShow.includes(today) ? today : daysToShow[0] || ALL_DAYS[0]);
    }
  }, [daysToShow, mobileDay]);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (didScrollRef.current || !scrollRef.current) return;
    const now = new Date();
    const curMin = now.getHours() * 60 + now.getMinutes();
    if (curMin >= startMin && curMin <= endMin) {
      scrollRef.current.scrollTop = Math.max(0, ((curMin - startMin) / 60) * HOUR_HEIGHT - 100);
      didScrollRef.current = true;
    }
  }, [startMin, endMin]);

  const scheduledItems = useMemo<ScheduledItem[]>(() => {
    const now = new Date();
    const dayIndex = (now.getDay() + 6) % 7;
    const weekStart = new Date(now); weekStart.setHours(0,0,0,0); weekStart.setDate(now.getDate() - dayIndex);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23,59,59,999);
    const isInWeek = (task: Task) => { if (!task.scheduledDate) return true; const d = toLocalDate(task.scheduledDate); return d >= weekStart && d <= weekEnd; };
    const lessons: ScheduledItem[] = state.lessons.map(l => ({ id: l.id, type: 'lesson', day: l.day, time: l.time, duration: l.duration, color: l.color, title: l.studentName, subtitle: l.subject, location: l.location, notes: l.notes, isFixed: l.isFixed }));
    const tasks: ScheduledItem[] = state.tasks.filter(t => !t.completed && t.scheduledDay && t.scheduledTime && isInWeek(t)).map(t => ({ id: t.id, type: 'task', day: t.scheduledDay!, time: t.scheduledTime!, duration: t.scheduledDuration || 30, color: getTaskColor(t.priority), title: t.title, subtitle: `${t.priority} priority`, location: t.category, priority: t.priority }));
    return [...lessons, ...tasks].sort((a, b) => { const dd = ALL_DAYS.indexOf(a.day) - ALL_DAYS.indexOf(b.day); return dd !== 0 ? dd : a.time.localeCompare(b.time); });
  }, [state.lessons, state.tasks]);

  const itemsByDay = useMemo(() => {
    const m: Record<string, ScheduledItem[]> = {};
    for (const d of daysToShow) m[d] = [];
    for (const i of scheduledItems) { if (m[i.day]) m[i.day].push(i); }
    return m;
  }, [scheduledItems, daysToShow]);

  const layoutByDay = useMemo(() => {
    const m: Record<string, LayoutItem[]> = {};
    for (const d of daysToShow) m[d] = layoutEvents(itemsByDay[d] || []);
    return m;
  }, [itemsByDay, daysToShow]);

  const mobileScheduleItems = useMemo(() => scheduledItems.filter(i => i.day === mobileDay).sort((a, b) => a.time.localeCompare(b.time)), [mobileDay, scheduledItems]);

  const createLessonFromTemplate = (tpl: ClassTemplate, day: string, time: string): Lesson => ({ id: Date.now().toString(), studentName: tpl.title, subject: tpl.subject, day, time, duration: tpl.duration, color: tpl.color, location: tpl.location || '', notes: tpl.notes || '', isFixed: false });
  const openTemplateAsLesson = (tpl: ClassTemplate) => setEditingLesson({ studentName: tpl.title, subject: tpl.subject, day: mobileDay, time: `${startHour.toString().padStart(2,'0')}:00`, duration: tpl.duration, color: tpl.color, location: tpl.location || '', notes: tpl.notes || '', isFixed: false });

  const saveLesson = () => {
    if (!editingLesson?.studentName || !editingLesson.time) return;
    const nl: Lesson = { id: editingLesson.id || Date.now().toString(), studentName: editingLesson.studentName, subject: editingLesson.subject || '', day: editingLesson.day || 'Monday', time: editingLesson.time, duration: editingLesson.duration || settings.interval, color: editingLesson.color || COLORS[5], location: editingLesson.location || '', notes: editingLesson.notes || '', isFixed: editingLesson.isFixed || false };
    if (editingLesson.id) updateState({ ...state, lessons: state.lessons.map(l => l.id === nl.id ? nl : l) });
    else updateState({ ...state, lessons: [...state.lessons, nl] });
    soundService.play('success');
    setEditingLesson(null);
  };

  const deleteLesson = (id: string) => { soundService.play('delete'); updateState({ ...state, lessons: state.lessons.filter(l => l.id !== id) }); setEditingLesson(null); };

  const saveTemplate = () => {
    if (!editingTemplate?.title?.trim()) return;
    const tpl: ClassTemplate = { id: editingTemplate.id || Date.now().toString(), title: editingTemplate.title.trim(), subject: editingTemplate.subject?.trim() || 'General', color: editingTemplate.color || COLORS[5], duration: editingTemplate.duration || settings.interval, location: editingTemplate.location?.trim() || '', notes: editingTemplate.notes?.trim() || '' };
    if (editingTemplate.id) updateState({ ...state, classTemplates: state.classTemplates.map(t => t.id === tpl.id ? tpl : t) });
    else updateState({ ...state, classTemplates: [...state.classTemplates, tpl] });
    setEditingTemplate(null);
  };

  const deleteTemplate = (id: string) => updateState({ ...state, classTemplates: state.classTemplates.filter(t => t.id !== id) });

  const toggleFullscreen = () => { if (!document.fullscreenElement) containerRef.current?.requestFullscreen(); else document.exitFullscreen(); };
  const openTableView = () => { if (window.innerWidth < 768) { setShowTableOverlay(true); return; } toggleFullscreen(); };
  const handlePrint = () => window.print();
  const handleExportCSV = () => { if (state.lessons.length === 0) { alert('No lessons to export.'); return; } exportToCSV(state.lessons, `schedule_export_${new Date().toISOString().split('T')[0]}.csv`); };

  const handleDragStart = (e: React.DragEvent, type: 'lesson' | 'template', id: string) => { e.dataTransfer.setData('type', type); e.dataTransfer.setData('id', id); e.dataTransfer.effectAllowed = 'copyMove'; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  const handleCellAction = useCallback((day: string, time: string) => {
    if (placingTemplate) { updateState({ ...state, lessons: [...state.lessons, createLessonFromTemplate(placingTemplate, day, time)] }); setPlacingTemplate(null); }
    else if (movingLessonId) { updateState({ ...state, lessons: state.lessons.map(l => l.id === movingLessonId ? { ...l, day, time } : l) }); setMovingLessonId(null); }
    else setEditingLesson({ day, time, duration: settings.interval, color: COLORS[5] });
  }, [placingTemplate, movingLessonId, state, settings.interval]);

  const handleDrop = (e: React.DragEvent, day: string, time: string) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    const id = e.dataTransfer.getData('id');
    if (type === 'lesson') updateState({ ...state, lessons: state.lessons.map(l => l.id === id ? { ...l, day, time } : l) });
    else if (type === 'template') { const tpl = state.classTemplates.find(t => t.id === id); if (tpl) updateState({ ...state, lessons: [...state.lessons, createLessonFromTemplate(tpl, day, time)] }); }
  };

  const [now, setNow] = useState(new Date());
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(iv); }, []);
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const showTimeIndicator = currentMin >= startMin && currentMin <= endMin;
  const timeIndicatorTop = ((currentMin - startMin) / 60) * HOUR_HEIGHT;
  const todayName = getCurrentDayName();
  const hours: number[] = [];
  for (let h = startHour; h < endHour; h++) hours.push(h);

  const renderGridEvent = (item: LayoutItem) => {
    const itemStart = timeToMin(item.time);
    const clampedStart = Math.max(itemStart, startMin);
    const clampedEnd = Math.min(itemStart + Math.max(item.duration, 15), endMin);
    if (clampedEnd <= clampedStart) return null;
    const top = ((clampedStart - startMin) / 60) * HOUR_HEIGHT;
    const height = Math.max(26, ((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT);
    const isShort = height < 48;
    const leftPct = (item.col / item.totalCols) * 100;
    const widthPct = (1 / item.totalCols) * 100;
    return (
      <button key={`${item.type}-${item.id}`} draggable={item.type === 'lesson'} onDragStart={item.type === 'lesson' ? (e) => handleDragStart(e, 'lesson', item.id) : undefined}
        onClick={(e) => { e.stopPropagation(); if (item.type === 'lesson') { const l = state.lessons.find(x => x.id === item.id); if (l) setEditingLesson(l); } }}
        className={`absolute rounded-lg text-left text-white overflow-hidden transition-all hover:brightness-110 hover:shadow-xl hover:z-[35] pointer-events-auto ${item.type === 'lesson' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
        style={{ top, height, left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`, backgroundColor: item.color, boxShadow: `0 2px 8px -2px ${item.color}50`, zIndex: 10 + item.col }}
        title={`${item.title} — ${item.time} (${item.duration}m)`}
      >
        {isShort ? (
          <div className="flex items-center gap-1.5 px-2 h-full min-w-0">
            <span className="font-semibold text-[11px] truncate flex-1">{item.title}</span>
            <span className="text-[9px] opacity-75 shrink-0">{item.time}</span>
          </div>
        ) : (
          <div className="p-2 flex flex-col h-full min-w-0">
            <div className="flex items-start justify-between gap-1 mb-0.5">
              <span className="font-bold text-[12px] leading-tight line-clamp-2">{item.title}</span>
              {item.isFixed && <Pin className="w-3 h-3 shrink-0 opacity-70 mt-0.5" />}
              {item.type === 'task' && <ListChecks className="w-3 h-3 shrink-0 opacity-70 mt-0.5" />}
            </div>
            <span className="text-[10px] opacity-85 line-clamp-1 font-medium">{item.subtitle}</span>
            <div className="mt-auto flex items-center gap-1.5 text-[9px] font-semibold opacity-75">
              <Clock className="w-2.5 h-2.5 shrink-0" /><span>{item.duration}m</span>
              {item.location && <><span className="opacity-50">·</span><MapPin className="w-2.5 h-2.5 shrink-0" /><span className="truncate">{item.location}</span></>}
            </div>
          </div>
        )}
      </button>
    );
  };

  const renderWeekGrid = (wrapperClass: string, isForOverlay = false) => {
    const dayCount = daysToShow.length;
    return (
      <div className={wrapperClass} ref={isForOverlay ? undefined : scrollRef}>
        <div style={{ minWidth: Math.max(700, dayCount * 120 + 56) }}>
          <div className="grid sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800" style={{ gridTemplateColumns: `56px repeat(${dayCount}, 1fr)` }}>
            <div className="py-3 px-1" />
            {daysToShow.map(day => {
              const isToday = day === todayName;
              const count = (itemsByDay[day] || []).length;
              return (
                <div key={day} className={`py-3 px-2 text-center border-l border-slate-100 dark:border-slate-800 ${isToday ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : ''}`}>
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>{t(day.toLowerCase() as any)}</div>
                  {count > 0 && <div className={`text-[9px] font-semibold mt-0.5 ${isToday ? 'text-indigo-400' : 'text-slate-400'}`}>{count}</div>}
                </div>
              );
            })}
          </div>
          <div className="relative" style={{ height: totalHeight }}>
            {hours.map(h => {
              const top = (h - startHour) * HOUR_HEIGHT;
              return (
                <div key={h} className="absolute left-0 right-0" style={{ top }}>
                  <div className="grid" style={{ gridTemplateColumns: `56px repeat(${dayCount}, 1fr)` }}>
                    <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 text-right pr-2 -mt-2 select-none tabular-nums">{h.toString().padStart(2,'0')}:00</div>
                    {daysToShow.map(day => (<div key={`${day}-${h}`} className={`border-l border-t border-slate-100 dark:border-slate-800/60 ${day === todayName ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''}`} style={{ height: HOUR_HEIGHT }} />))}
                  </div>
                  <div className="absolute left-14 right-0 border-t border-dashed border-slate-100/80 dark:border-slate-800/30" style={{ top: HOUR_HEIGHT / 2 }} />
                </div>
              );
            })}
            <div className="absolute inset-0 z-10" style={{ left: 56 }}>
              <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${dayCount}, 1fr)` }}>
                {daysToShow.map(day => (
                  <div key={day} className="relative">
                    {hours.flatMap(h => [0, 30].map(m => {
                      const time = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
                      const slotTop = (h - startHour) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
                      return (<div key={time} className={`absolute left-0 right-0 cursor-pointer transition-colors ${(placingTemplate || movingLessonId) ? 'hover:bg-indigo-100/40 dark:hover:bg-indigo-900/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/20'}`} style={{ top: slotTop, height: HOUR_HEIGHT / 2 }} onDragOver={handleDragOver} onDrop={e => handleDrop(e, day, time)} onClick={() => handleCellAction(day, time)} />);
                    }))}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute inset-0 z-20 pointer-events-none" style={{ left: 56 }}>
              <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${dayCount}, 1fr)` }}>
                {daysToShow.map(day => (<div key={day} className="relative border-l border-slate-100 dark:border-slate-800/60">{(layoutByDay[day] || []).map(item => renderGridEvent(item))}</div>))}
              </div>
            </div>
            {showTimeIndicator && (
              <div className="absolute left-0 right-0 pointer-events-none" style={{ top: timeIndicatorTop, zIndex: 25 }}>
                <div className="flex items-center" style={{ marginLeft: 48 }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/40 shrink-0" />
                  <div className="flex-1 h-[2px] bg-red-500/60" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 rounded-3xl overflow-hidden print:p-0 print:bg-white animate-fade-in">
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden px-4 md:px-6 pt-4 md:pt-5 pb-3 ${isFullscreen ? 'sticky top-0 z-40 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md' : ''}`}>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5"><Calendar className="w-6 h-6 text-indigo-500" /> {t('teacher')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{scheduledItems.length} items · {daysToShow.length} days</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {isFullscreen && <button onClick={toggleFullscreen} className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"><Minimize2 className="w-4 h-4" /> Exit</button>}
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button onClick={handleExportCSV} className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="Export CSV"><FileText className="w-4 h-4" /></button>
            <button onClick={handlePrint} className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="Print / PDF"><Download className="w-4 h-4" /></button>
            <button onClick={openTableView} className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title={t('viewFullTable')}>{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${showSettings ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'}`}><Settings className="w-4 h-4" /> <span className="hidden sm:inline">{t('settings')}</span></button>
          <button onClick={() => setEditingLesson({ day: mobileDay, time: `${startHour.toString().padStart(2,'0')}:00`, duration: settings.interval, color: COLORS[5] })} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-95"><Plus className="w-4 h-4" /> {t('addEvent')}</button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mx-4 md:mx-6 mb-4 animate-fade-in text-slate-800 dark:text-slate-100 print:hidden">
          <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-sm">{t('scheduleSettings')}</h3><button onClick={() => setShowSettings(false)}><X className="w-4 h-4 text-slate-400" /></button></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('startHour')}</label><input type="number" min="0" max="23" className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm" value={settings.startHour} onChange={e => updateSettings({ startHour: parseInt(e.target.value) })} /></div>
            <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('endHour')}</label><input type="number" min="1" max="24" className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm" value={settings.endHour} onChange={e => updateSettings({ endHour: parseInt(e.target.value) })} /></div>
            <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('intervalMins')}</label><select className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm" value={settings.interval} onChange={e => updateSettings({ interval: parseInt(e.target.value) })}><option value={15}>15 {t('minutes')}</option><option value={30}>30 {t('minutes')}</option><option value={60}>60 {t('minutes')}</option></select></div>
          </div>
          <div className="mt-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('daysToShow')}</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map(day => (<button key={day} onClick={() => { const nd = settings.daysToShow.includes(day) ? settings.daysToShow.filter(d => d !== day) : [...settings.daysToShow, day]; updateSettings({ daysToShow: nd.sort((a,b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b)) }); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${settings.daysToShow.includes(day) ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-900 dark:border-slate-200' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>{t(day.toLowerCase() as any)}</button>))}
            </div>
          </div>
        </div>
      )}

      {(placingTemplate || movingLessonId) && (
        <div className="mx-4 md:mx-6 mb-3 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between print:hidden animate-fade-in">
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{placingTemplate ? t('tapToPlace') : t('moveLesson')}</span>
          <button onClick={() => { setPlacingTemplate(null); setMovingLessonId(null); }} className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-lg">{t('cancel')}</button>
        </div>
      )}

      <div className="md:hidden flex flex-col gap-3 px-4 pb-4 print:hidden flex-1">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {daysToShow.map(day => {
              const count = (itemsByDay[day] || []).length;
              const isToday = day === todayName;
              return (<button key={day} onClick={() => setMobileDay(day)} className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[3.2rem] transition-all border ${mobileDay === day ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' : isToday ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-transparent'}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider">{t(day.toLowerCase() as any).slice(0, 3)}</span>
                {count > 0 && <span className={`text-[8px] font-bold mt-0.5 ${mobileDay === day ? 'text-indigo-200' : 'text-slate-400'}`}>{count}</span>}
              </button>);
            })}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{t(mobileDay.toLowerCase() as any)}</h3>
            <div className="flex gap-1.5">
              <span className="text-[9px] font-bold uppercase bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-md">{mobileScheduleItems.filter(i => i.type === 'lesson').length} classes</span>
              <span className="text-[9px] font-bold uppercase bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-md">{mobileScheduleItems.filter(i => i.type === 'task').length} tasks</span>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[60vh]" style={{ minHeight: 200 }}>
            {mobileScheduleItems.length > 0 ? (
              <div className="p-3 space-y-2">
                {mobileScheduleItems.map(item => {
                  const endTime = minToTime(timeToMin(item.time) + item.duration);
                  return (
                    <button key={`${item.type}-${item.id}`} onClick={() => { if (item.type === 'lesson') { const l = state.lessons.find(x => x.id === item.id); if (l) setEditingLesson(l); } }}
                      className="w-full text-left flex gap-3 p-3 rounded-xl transition-all hover:shadow-md active:scale-[0.98] border border-slate-100 dark:border-slate-800" style={{ borderLeftWidth: 4, borderLeftColor: item.color }}>
                      <div className="w-12 shrink-0 pt-0.5"><div className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">{item.time}</div><div className="text-[9px] text-slate-400 tabular-nums">{endTime}</div></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1"><span className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{item.title}</span><span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: item.color }}>{item.duration}m</span></div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">{item.subtitle}</div>
                        {item.location && <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400"><MapPin className="w-2.5 h-2.5" /> {item.location}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <button onClick={() => setEditingLesson({ day: mobileDay, time: `${startHour.toString().padStart(2,'0')}:00`, duration: settings.interval, color: COLORS[5] })} className="w-full p-10 text-center text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" /><div className="text-[10px] font-bold uppercase tracking-widest mb-1">{t('noClasses')}</div><div className="text-xs">Tap to add an event</div>
              </button>
            )}
          </div>
        </div>
        <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <summary className="p-3 cursor-pointer flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm"><Palette className="w-4 h-4 text-indigo-500" /> {t('classBank')} <span className="text-[10px] font-bold text-slate-400">({state.classTemplates.length})</span></h3>
            <button onClick={e => { e.preventDefault(); setEditingTemplate(getEmptyTemplate()); }} className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">+ {t('newTemplate')}</button>
          </summary>
          <div className="px-3 pb-3"><div className="flex gap-2 overflow-x-auto no-scrollbar">
            {state.classTemplates.map(tpl => (<button key={tpl.id} onClick={() => openTemplateAsLesson(tpl)} className="min-w-[9rem] text-left p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shrink-0" style={{ borderLeft: `4px solid ${tpl.color}` }}><div className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate">{tpl.title}</div><div className="text-[9px] font-bold uppercase text-slate-400">{tpl.subject} · {tpl.duration}m</div></button>))}
          </div></div>
        </details>
        <button onClick={() => setShowTableOverlay(true)} className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2"><Maximize2 className="w-4 h-4" /> {t('viewFullTable')}</button>
      </div>

      {showTableOverlay && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col print:hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 text-white shrink-0">
            <div className="text-sm font-bold">{t('viewFullTable')}</div>
            <div className="flex gap-2"><button onClick={handlePrint} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200">PDF</button><button onClick={() => setShowTableOverlay(false)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900">{t('closeTableView')}</button></div>
          </div>
          <div className="flex-1 overflow-hidden p-3">{renderWeekGrid('h-full overflow-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-700 custom-scrollbar', true)}</div>
        </div>
      )}

      <div className="hidden md:flex gap-4 flex-1 overflow-hidden px-6 pb-5 print:px-0">
        <div className={`flex flex-col gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden print:hidden shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-12' : 'w-64'}`}>
          {sidebarCollapsed ? (
            <button onClick={() => setSidebarCollapsed(false)} className="p-3 text-slate-400 hover:text-indigo-500 transition-colors h-full flex items-start justify-center pt-5" title={t('classBank')}><ChevronRight className="w-5 h-5" /></button>
          ) : (<>
            <div className="flex items-center justify-between p-4 pb-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm"><Palette className="w-4 h-4 text-indigo-500" /> {t('classBank')}</h3>
              <button onClick={() => setSidebarCollapsed(true)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            </div>
            <p className="text-[10px] font-medium text-slate-400 px-4 leading-relaxed">{t('dragTemplates')}</p>
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 custom-scrollbar">
              {state.classTemplates.map(tpl => (
                <div key={tpl.id} draggable onDragStart={e => handleDragStart(e, 'template', tpl.id)}
                  onClick={() => { if (placingTemplate?.id === tpl.id) setPlacingTemplate(null); else setPlacingTemplate(tpl); }}
                  className={`p-3 rounded-xl border transition-all relative group cursor-grab active:cursor-grabbing ${placingTemplate?.id === tpl.id ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'}`}
                  style={{ borderLeft: `4px solid ${tpl.color}` }}>
                  <div className="font-bold text-slate-800 dark:text-slate-100 text-[12px] mb-0.5 truncate">{tpl.title}</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{tpl.subject}</span><span className="text-[9px] text-slate-300 dark:text-slate-600">·</span><span className="text-[9px] font-bold text-slate-400">{tpl.duration}m</span>
                    {tpl.location && <><span className="text-[9px] text-slate-300 dark:text-slate-600">·</span><span className="text-[9px] font-bold text-slate-400 truncate">{tpl.location}</span></>}
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); setEditingTemplate({ ...tpl }); }} className="text-slate-300 hover:text-indigo-500 p-0.5" title={t('edit')}><Edit2 className="w-3 h-3" /></button>
                    <button onClick={e => { e.stopPropagation(); deleteTemplate(tpl.id); }} className="text-slate-300 hover:text-red-500 p-0.5"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
              <button onClick={() => setEditingTemplate(getEmptyTemplate())} className="w-full py-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">+ {t('newTemplate')}</button>
            </div>
          </>)}
        </div>
        {renderWeekGrid('flex-1 overflow-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm custom-scrollbar print:border-0')}
      </div>

      {editingLesson && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden backdrop-blur-sm" onClick={() => setEditingLesson(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5"><h3 className="text-lg font-bold">{editingLesson.id ? t('edit') : t('addNew')}</h3><button onClick={() => setEditingLesson(null)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <div className="space-y-4">
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('description')}</label><input className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm" value={editingLesson.studentName || ''} onChange={e => setEditingLesson({ ...editingLesson, studentName: e.target.value })} placeholder={t('description')} autoFocus /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('subject')}</label><input className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm" value={editingLesson.subject || ''} onChange={e => setEditingLesson({ ...editingLesson, subject: e.target.value })} placeholder={t('subject')} /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('location')}</label><input className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm" value={editingLesson.location || ''} onChange={e => setEditingLesson({ ...editingLesson, location: e.target.value })} placeholder="Room 101" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Day</label><select className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm" value={editingLesson.day} onChange={e => setEditingLesson({ ...editingLesson, day: e.target.value })}>{ALL_DAYS.map(d => <option key={d} value={d}>{t(d.toLowerCase() as any)}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('time')}</label><input type="time" className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm" value={editingLesson.time} onChange={e => setEditingLesson({ ...editingLesson, time: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('duration')}</label><input type="number" step={15} inputMode="numeric" className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm" value={editingLesson.duration} onChange={e => setEditingLesson({ ...editingLesson, duration: parseInt(e.target.value) })} /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('fixedEvent')}</label><button onClick={() => setEditingLesson({ ...editingLesson, isFixed: !editingLesson.isFixed })} className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-all ${editingLesson.isFixed ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500'}`}>{editingLesson.isFixed ? t('yesFixed') : t('noFlexible')}</button></div>
              </div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('color')}</label><div className="flex gap-2 flex-wrap bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700">{COLORS.map(c => (<button key={c} onClick={() => setEditingLesson({ ...editingLesson, color: c })} className={`w-6 h-6 rounded-full border-2 transition-transform ${editingLesson.color === c ? 'ring-2 ring-offset-1 ring-slate-400 border-white dark:border-slate-900 scale-110' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />))}</div></div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveLesson} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30">{t('saveEvent')}</button>
                {editingLesson.id && (<>
                  <button onClick={() => { setMovingLessonId(editingLesson.id!); setEditingLesson(null); }} className="px-4 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30" title={t('moveLesson')}><GripVertical className="w-5 h-5" /></button>
                  <button onClick={() => deleteLesson(editingLesson.id!)} className="px-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30"><Trash2 className="w-5 h-5" /></button>
                </>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {editingTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden backdrop-blur-sm" onClick={() => setEditingTemplate(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <div><h3 className="text-lg font-bold">{editingTemplate.id ? `${t('edit')} ${t('newTemplate')}` : t('newTemplate')}</h3><p className="text-xs text-slate-500 mt-0.5">Configure how this template appears when placed.</p></div>
              <button onClick={() => setEditingTemplate(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('templateName')}</label><input autoFocus className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm" value={editingTemplate.title || ''} onChange={e => setEditingTemplate({ ...editingTemplate, title: e.target.value })} placeholder={t('templateName')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('subject')}</label><input className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm" value={editingTemplate.subject || ''} onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })} placeholder="Math, English, etc." /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('location')}</label><input className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm" value={editingTemplate.location || ''} onChange={e => setEditingTemplate({ ...editingTemplate, location: e.target.value })} placeholder="Room 101" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('duration')}</label><input type="number" min={15} step={15} className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm" value={editingTemplate.duration || settings.interval} onChange={e => setEditingTemplate({ ...editingTemplate, duration: parseInt(e.target.value) || settings.interval })} /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('color')}</label><div className="flex gap-2 flex-wrap bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[44px] items-center">{COLORS.map(c => (<button key={c} onClick={() => setEditingTemplate({ ...editingTemplate, color: c })} className={`w-6 h-6 rounded-full border-2 transition-transform ${editingTemplate.color === c ? 'ring-2 ring-offset-1 ring-slate-400 border-white dark:border-slate-900 scale-110' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />))}</div></div>
              </div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Notes</label><textarea rows={2} className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm resize-none" value={editingTemplate.notes || ''} onChange={e => setEditingTemplate({ ...editingTemplate, notes: e.target.value })} placeholder="Default instructions or reminders" /></div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-3">
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Preview</div>
                <div className="rounded-xl p-3 text-white shadow-md" style={{ backgroundColor: editingTemplate.color || COLORS[5] }}>
                  <div className="font-bold text-sm">{editingTemplate.title || 'Template title'}</div>
                  <div className="text-[11px] opacity-90 mt-0.5">{editingTemplate.subject || 'Subject'}</div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold opacity-80"><span>{editingTemplate.duration || settings.interval}m</span>{(editingTemplate.location || '').trim() && <span>· {editingTemplate.location}</span>}</div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={saveTemplate} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30">{editingTemplate.id ? t('save') : t('add')}</button>
                <button onClick={() => setEditingTemplate(null)} className="px-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">{t('cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherSchedule;