import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AppState, Lesson, ClassTemplate, Task } from '../types';
import { useTranslation } from '../lib/translations';
import { exportToCSV } from '../lib/exportUtils';
import {
  Plus, Trash2, MapPin, Settings, X, GripVertical, Maximize2, Download,
  Minimize2, Palette, Clock, FileText, Edit2, Calendar, Pin, ListChecks,
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Copy, Eye,
  Layers, LayoutGrid, List,
} from 'lucide-react';
import { soundService } from '../services/sounds';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Props {
  state: AppState;
  updateState: (s: AppState) => void;
  prayerTimes?: Record<string, string> | null;
}

type ViewMode = 'week' | 'day';

type ScheduledItem = {
  id: string;
  type: 'lesson' | 'task' | 'prayer';
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

type PositionedItem = ScheduledItem & {
  start: number;
  end: number;
  colIdx: number;
  colCount: number;
};

// ─── Constants ──────────────────────────────────────────────────────────────
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#64748b'];
const SLOT_H = 64;
const TIME_COL_W = 56;
const MIN_H = 44;
const CARD_GAP = 2;
const PRAYER_COLOR = '#059669';

// ─── Helpers ────────────────────────────────────────────────────────────────
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmtTime = (m: number) => `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
const taskColor = (p: Task['priority']) => p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#3b82f6';
const todayName = () => {
  const d = new Date().getDay();
  return ALL_DAYS[(d + 6) % 7];
};
const toLocalDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

// Layout overlapping items into columns
const layoutItems = (items: ScheduledItem[]): PositionedItem[] => {
  const sorted = items
    .map(i => ({ ...i, start: toMin(i.time), end: toMin(i.time) + Math.max(i.duration, 10) }))
    .sort((a, b) => a.start - b.start || a.end - b.end) as (ScheduledItem & { start: number; end: number })[];

  const result: PositionedItem[] = [];
  let cluster: PositionedItem[] = [];
  let active: PositionedItem[] = [];
  let maxCols = 0;

  const flush = () => {
    if (!cluster.length) return;
    result.push(...cluster.map(c => ({ ...c, colCount: maxCols || 1 })));
    cluster = [];
    active = [];
    maxCols = 0;
  };

  for (const item of sorted) {
    active = active.filter(a => a.end > item.start);
    if (!active.length) flush();
    const used = new Set(active.map(a => a.colIdx));
    let col = 0;
    while (used.has(col)) col++;
    const pos: PositionedItem = { ...item, colIdx: col, colCount: 1 };
    active.push(pos);
    cluster.push(pos);
    maxCols = Math.max(maxCols, active.length);
  }
  flush();
  return result;
};

// ─── Component ──────────────────────────────────────────────────────────────
const TeacherSchedule: React.FC<Props> = ({ state, updateState, prayerTimes }) => {
  const { t } = useTranslation(state.language);
  const isRtl = state.language === 'ar';

  // ── State ──
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDay, setSelectedDay] = useState(todayName());
  const [showSettings, setShowSettings] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ClassTemplate> | null>(null);
  const [selectedItem, setSelectedItem] = useState<ScheduledItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullTable, setShowFullTable] = useState(false);
  const [placingTemplate, setPlacingTemplate] = useState<ClassTemplate | null>(null);
  const [movingLessonId, setMovingLessonId] = useState<string | null>(null);
  const [showTemplateBank, setShowTemplateBank] = useState(false);
  const [touchDragId, setTouchDragId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const settings = state.scheduleSettings || { startHour: 8, endHour: 20, interval: 60, daysToShow: ALL_DAYS };
  const visibleDays = viewMode === 'day' ? [selectedDay] : settings.daysToShow;

  // ── Fullscreen handling ──
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ── Scroll to current time on load ──
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const startMins = settings.startHour * 60;
      const slotsPerHour = 60 / settings.interval;
      const pos = ((mins - startMins) / 60) * slotsPerHour * SLOT_H - 100;
      scrollRef.current.scrollTop = Math.max(0, pos);
    }
  }, [settings.startHour, settings.interval]);

  // ── Build scheduled items ──
  const scheduledItems = useMemo<ScheduledItem[]>(() => {
    const now = new Date();
    const dayIdx = (now.getDay() + 6) % 7;
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - dayIdx);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const inWeek = (task: Task) => {
      if (!task.scheduledDate) return true;
      const d = toLocalDate(task.scheduledDate);
      return d >= weekStart && d <= weekEnd;
    };

    const lessons: ScheduledItem[] = state.lessons.map(l => ({
      id: l.id, type: 'lesson', day: l.day, time: l.time, duration: l.duration,
      color: l.color, title: l.studentName, subtitle: l.subject,
      location: l.location, notes: l.notes, isFixed: l.isFixed,
    }));

    const tasks: ScheduledItem[] = state.tasks
      .filter(t => !t.completed && t.scheduledDay && t.scheduledTime && inWeek(t))
      .map(t => ({
        id: t.id, type: 'task', day: t.scheduledDay!, time: t.scheduledTime!,
        duration: t.scheduledDuration || 30, color: taskColor(t.priority),
        title: t.title, subtitle: `${t.priority} priority`,
        location: t.category, priority: t.priority,
      }));

    return [...lessons, ...tasks].sort((a, b) => {
      const dd = ALL_DAYS.indexOf(a.day) - ALL_DAYS.indexOf(b.day);
      return dd !== 0 ? dd : a.time.localeCompare(b.time);
    });
  }, [state.lessons, state.tasks]);

  // ── Prayer time items for overlay ──
  const prayerItems = useMemo<Record<string, { name: string; time: string; min: number }[]>>(() => {
    if (!prayerTimes) return {};
    const result: Record<string, { name: string; time: string; min: number }[]> = {};
    for (const day of ALL_DAYS) {
      result[day] = PRAYER_NAMES.map(name => ({
        name,
        time: prayerTimes[name] || '',
        min: prayerTimes[name] ? toMin(prayerTimes[name]) : -1,
      })).filter(p => p.min >= 0);
    }
    return result;
  }, [prayerTimes]);

  // ── Prayer conflict detection ──
  const prayerConflicts = useMemo(() => {
    if (!prayerTimes) return [];
    const today = todayName();
    const conflicts: { prayer: string; prayerTime: string; event: Lesson }[] = [];
    for (const prayer of PRAYER_NAMES) {
      const pt = prayerTimes[prayer];
      if (!pt) continue;
      const pMin = toMin(pt);
      const conflict = state.lessons.find(l => {
        if (l.day !== today || !l.isFixed) return false;
        const s = toMin(l.time);
        return pMin >= s && pMin < s + l.duration;
      });
      if (conflict) conflicts.push({ prayer, prayerTime: pt, event: conflict });
    }
    return conflicts;
  }, [prayerTimes, state.lessons]);

  // ── Utils ──
  const updateSettings = (s: any) => updateState({ ...state, scheduleSettings: { ...settings, ...s } });

  const timeSlots: string[] = useMemo(() => {
    const slots: string[] = [];
    for (let h = settings.startHour; h < settings.endHour; h++) {
      for (let m = 0; m < 60; m += settings.interval) {
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, [settings.startHour, settings.endHour, settings.interval]);

  // ── Lesson CRUD ──
  const saveLesson = () => {
    if (!editingLesson?.studentName || !editingLesson.time) return;
    const l: Lesson = {
      id: editingLesson.id || Date.now().toString(),
      studentName: editingLesson.studentName,
      subject: editingLesson.subject || '',
      day: editingLesson.day || 'Monday',
      time: editingLesson.time,
      duration: editingLesson.duration || settings.interval,
      color: editingLesson.color || COLORS[5],
      location: editingLesson.location || '',
      notes: editingLesson.notes || '',
      isFixed: editingLesson.isFixed || false,
    };
    if (editingLesson.id) {
      updateState({ ...state, lessons: state.lessons.map(x => x.id === l.id ? l : x) });
    } else {
      updateState({ ...state, lessons: [...state.lessons, l] });
    }
    soundService.play('success');
    setEditingLesson(null);
  };

  const deleteLesson = (id: string) => {
    soundService.play('delete');
    updateState({ ...state, lessons: state.lessons.filter(l => l.id !== id) });
    setEditingLesson(null);
    setSelectedItem(null);
  };

  const duplicateLesson = (id: string) => {
    const orig = state.lessons.find(l => l.id === id);
    if (!orig) return;
    const clone = { ...orig, id: Date.now().toString() };
    updateState({ ...state, lessons: [...state.lessons, clone] });
    soundService.play('success');
    setSelectedItem(null);
  };

  // ── Template CRUD ──
  const emptyTemplate = (): Partial<ClassTemplate> => ({
    title: '', subject: '', duration: settings.interval, color: COLORS[5], location: '', notes: '',
  });

  const saveTemplate = () => {
    if (!editingTemplate?.title?.trim()) return;
    const t: ClassTemplate = {
      id: editingTemplate.id || Date.now().toString(),
      title: editingTemplate.title.trim(),
      subject: editingTemplate.subject?.trim() || '',
      color: editingTemplate.color || COLORS[5],
      duration: editingTemplate.duration || settings.interval,
      location: editingTemplate.location?.trim(),
      notes: editingTemplate.notes?.trim(),
    };
    if (editingTemplate.id) {
      updateState({ ...state, classTemplates: state.classTemplates.map(x => x.id === t.id ? t : x) });
    } else {
      updateState({ ...state, classTemplates: [...state.classTemplates, t] });
    }
    setEditingTemplate(null);
  };

  const deleteTemplate = (id: string) => {
    updateState({ ...state, classTemplates: state.classTemplates.filter(x => x.id !== id) });
  };

  const createFromTemplate = (tpl: ClassTemplate, day: string, time: string): Lesson => ({
    id: Date.now().toString(), studentName: tpl.title, subject: tpl.subject,
    day, time, duration: tpl.duration, color: tpl.color,
    location: tpl.location || '', notes: tpl.notes || '', isFixed: false,
  });

  // ── Drag & Drop (Desktop) ──
  const handleDragStart = (e: React.DragEvent, type: string, id: string) => {
    e.dataTransfer.setData('type', type);
    e.dataTransfer.setData('id', id);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, day: string, time: string) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    const id = e.dataTransfer.getData('id');
    if (type === 'lesson') {
      updateState({ ...state, lessons: state.lessons.map(l => l.id === id ? { ...l, day, time } : l) });
    } else if (type === 'template') {
      const tpl = state.classTemplates.find(x => x.id === id);
      if (tpl) updateState({ ...state, lessons: [...state.lessons, createFromTemplate(tpl, day, time)] });
    }
    setPlacingTemplate(null);
    setMovingLessonId(null);
  };

  // ── Tap-to-place (Mobile / Keyboard) ──
  const handleSlotClick = useCallback((day: string, time: string) => {
    if (placingTemplate) {
      updateState({ ...state, lessons: [...state.lessons, createFromTemplate(placingTemplate, day, time)] });
      setPlacingTemplate(null);
    } else if (movingLessonId) {
      updateState({ ...state, lessons: state.lessons.map(l => l.id === movingLessonId ? { ...l, day, time } : l) });
      setMovingLessonId(null);
    } else {
      setEditingLesson({ day, time, duration: settings.interval, color: COLORS[5] });
    }
  }, [placingTemplate, movingLessonId, state, settings.interval, updateState]);

  // ── Fullscreen toggle ──
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  const openFullTable = () => {
    if (window.innerWidth < 768) setShowFullTable(true);
    else toggleFullscreen();
  };

  // ── Export ──
  const handleExportCSV = () => {
    if (!state.lessons.length) return;
    exportToCSV(state.lessons, `schedule_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // ─────────────────── NOW-LINE calculation ──────────────────────────────────
  const nowLinePos = useMemo(() => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const startMins = settings.startHour * 60;
    const totalMins = (settings.endHour - settings.startHour) * 60;
    if (mins < startMins || mins > startMins + totalMins) return null;
    return ((mins - startMins) / totalMins) * timeSlots.length * SLOT_H;
  }, [settings.startHour, settings.endHour, timeSlots.length]);

  // ─────────────────── CALENDAR GRID (shared between desktop & fullscreen) ──
  const renderGrid = (containerClass: string) => {
    const startMins = settings.startHour * 60;
    const totalMins = Math.max((settings.endHour - settings.startHour) * 60, settings.interval);
    const totalH = timeSlots.length * SLOT_H;
    const days = visibleDays;
    const today = todayName();

    const itemsByDay: Record<string, PositionedItem[]> = {};
    for (const day of days) {
      itemsByDay[day] = layoutItems(scheduledItems.filter(i => i.day === day));
    }

    return (
      <div className={containerClass} ref={scrollRef}>
        <div style={{ minWidth: days.length > 1 ? Math.max(700, days.length * 140) : 320 }}>
          {/* Header row */}
          <div
            className="grid sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800"
            style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(${days.length}, 1fr)` }}
          >
            <div className="flex items-center justify-center border-r border-slate-100 dark:border-slate-800 py-3">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            {days.map(day => {
              const isToday = day === today;
              const count = scheduledItems.filter(i => i.day === day).length;
              return (
                <button
                  key={day}
                  onClick={() => { setSelectedDay(day); if (viewMode === 'week' && window.innerWidth < 768) setViewMode('day'); }}
                  className={`py-3 px-2 border-r border-slate-100 dark:border-slate-800 text-center transition-colors ${isToday ? 'bg-indigo-50/60 dark:bg-indigo-900/15' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                >
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {t(day.toLowerCase() as any)}
                  </div>
                  {count > 0 && (
                    <div className={`mt-0.5 text-[9px] font-bold ${isToday ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600'}`}>
                      {count} {count === 1 ? 'event' : 'events'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div className="relative" style={{ height: totalH }}>
            {/* Time slot rows (background grid) */}
            <div className="absolute inset-0">
              {timeSlots.map((time, idx) => (
                <div
                  key={time}
                  className="grid"
                  style={{
                    gridTemplateColumns: `${TIME_COL_W}px repeat(${days.length}, 1fr)`,
                    height: SLOT_H,
                  }}
                >
                  <div className="relative flex items-start justify-end pr-2 -mt-2 select-none">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                      {time}
                    </span>
                  </div>
                  {days.map(day => (
                    <div
                      key={`${day}-${time}`}
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, day, time)}
                      onClick={() => handleSlotClick(day, time)}
                      className={`border-r border-b border-slate-100 dark:border-slate-800/60 transition-colors cursor-pointer
                        ${(placingTemplate || movingLessonId) ? 'hover:bg-indigo-50/50 dark:hover:bg-indigo-900/15' : 'hover:bg-slate-50/40 dark:hover:bg-slate-800/20'}
                        ${idx % 2 === 0 ? '' : 'bg-slate-25 dark:bg-slate-900/30'}`}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Prayer time lines */}
            {days.map((day, dayIdx) => {
              const prayers = prayerItems[day] || [];
              return prayers.map(p => {
                if (p.min < startMins || p.min >= startMins + totalMins) return null;
                const top = ((p.min - startMins) / totalMins) * totalH;
                const left = `calc(${TIME_COL_W}px + (${dayIdx} * (100% - ${TIME_COL_W}px) / ${days.length}))`;
                const width = `calc((100% - ${TIME_COL_W}px) / ${days.length})`;
                return (
                  <div
                    key={`prayer-${day}-${p.name}`}
                    className="absolute z-10 pointer-events-none"
                    style={{ top, left, width }}
                  >
                    <div className="flex items-center gap-1 -mt-2.5 px-1">
                      <div className="h-px flex-1 bg-emerald-400/40 dark:bg-emerald-500/30" />
                      <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider whitespace-nowrap bg-white/80 dark:bg-slate-900/80 px-1 rounded">
                        {p.name} {p.time}
                      </span>
                    </div>
                  </div>
                );
              });
            })}

            {/* Now-line */}
            {nowLinePos !== null && (
              <div
                className="absolute z-20 pointer-events-none"
                style={{ top: nowLinePos, left: TIME_COL_W, right: 0 }}
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-sm shadow-red-500/50" />
                  <div className="h-[2px] flex-1 bg-red-500/70" />
                </div>
              </div>
            )}

            {/* Event cards */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {days.map((day, dayIdx) => (
                <div
                  key={day}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `calc(${TIME_COL_W}px + (${dayIdx} * (100% - ${TIME_COL_W}px) / ${days.length}))`,
                    width: `calc((100% - ${TIME_COL_W}px) / ${days.length})`,
                    padding: '0 2px',
                  }}
                >
                  {(itemsByDay[day] || []).map(item => {
                    if (item.end <= startMins || item.start >= startMins + totalMins) return null;
                    const top = Math.max(0, ((item.start - startMins) / totalMins) * totalH);
                    const height = Math.max(MIN_H, ((Math.min(item.end, startMins + totalMins) - Math.max(item.start, startMins)) / totalMins) * totalH);
                    const bw = 100 / item.colCount;
                    const left = `calc(${(bw * item.colIdx).toFixed(2)}% + ${CARD_GAP}px)`;
                    const width = `calc(${bw.toFixed(2)}% - ${CARD_GAP * 2}px)`;
                    const compact = height < 72;
                    const tiny = height < 50;

                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        draggable={item.type === 'lesson'}
                        onDragStart={item.type === 'lesson' ? e => handleDragStart(e, 'lesson', item.id) : undefined}
                        onClick={e => { e.stopPropagation(); setSelectedItem(item); }}
                        className="absolute rounded-xl text-left text-white overflow-hidden transition-all
                          hover:brightness-105 hover:shadow-lg active:scale-[0.98]
                          pointer-events-auto focus:outline-none focus:ring-2 focus:ring-white/40
                          print:shadow-none print:border print:border-slate-200"
                        style={{
                          top, height, left, width,
                          background: `linear-gradient(135deg, ${item.color}, ${item.color}dd)`,
                          boxShadow: `0 2px 8px -2px ${item.color}66`,
                        }}
                        title={`${item.title} — ${item.time} (${item.duration}m)`}
                      >
                        <div className={`h-full flex flex-col ${compact ? 'p-1.5' : 'p-2'}`}>
                          <div className="flex items-start justify-between gap-1 min-w-0">
                            <div className="min-w-0 flex-1">
                              <div className={`font-bold leading-tight break-words ${compact ? 'text-[10px] line-clamp-1' : 'text-[11px] line-clamp-2'}`}>
                                {item.title}
                              </div>
                              {!tiny && item.subtitle && (
                                <div className={`text-white/80 font-medium ${compact ? 'text-[8px] line-clamp-1' : 'text-[9px] line-clamp-1 mt-0.5'}`}>
                                  {item.subtitle}
                                </div>
                              )}
                            </div>
                            {!tiny && (
                              <div className="shrink-0">
                                {item.type === 'task' ? (
                                  <ListChecks className="w-3 h-3 text-white/70" />
                                ) : item.isFixed ? (
                                  <Pin className="w-3 h-3 text-white/70" />
                                ) : null}
                              </div>
                            )}
                          </div>
                          {!tiny && (
                            <div className="mt-auto flex items-center gap-1 text-white/80 font-semibold">
                              <span className={`inline-flex items-center gap-0.5 bg-black/15 rounded-full px-1.5 py-0.5 ${compact ? 'text-[7px]' : 'text-[8px]'}`}>
                                <Clock className="w-2 h-2" />{item.time}
                              </span>
                              <span className={`bg-black/15 rounded-full px-1.5 py-0.5 ${compact ? 'text-[7px]' : 'text-[8px]'}`}>
                                {item.duration}m
                              </span>
                              {!compact && item.location && (
                                <span className="bg-black/15 rounded-full px-1.5 py-0.5 text-[8px] truncate max-w-[60px]">
                                  {item.location}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────── MOBILE AGENDA VIEW ────────────────────────────────────
  const renderMobileAgenda = () => {
    const dayItems = scheduledItems.filter(i => i.day === selectedDay);
    const dayPrayers = prayerItems[selectedDay] || [];

    // Merge events & prayers into timeline
    type TimelineEntry = { type: 'event'; item: ScheduledItem } | { type: 'prayer'; name: string; time: string; min: number };
    const timeline: TimelineEntry[] = [
      ...dayItems.map(i => ({ type: 'event' as const, item: i })),
      ...dayPrayers.map(p => ({ type: 'prayer' as const, ...p })),
    ].sort((a, b) => {
      const aMin = a.type === 'event' ? toMin(a.item.time) : a.min;
      const bMin = b.type === 'event' ? toMin(b.item.time) : b.min;
      return aMin - bMin;
    });

    return (
      <div className="space-y-3">
        {/* Day selector */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-1 pb-1">
          {settings.daysToShow.map(day => {
            const count = scheduledItems.filter(i => i.day === day).length;
            const isToday = day === todayName();
            const isSelected = day === selectedDay;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex flex-col items-center px-3 py-2 rounded-xl whitespace-nowrap border transition-all min-w-[3.5rem] shrink-0
                  ${isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : isToday
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                      : 'bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {t(day.toLowerCase() as any).slice(0, 3)}
                </span>
                {count > 0 && (
                  <span className={`text-[8px] font-bold mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Prayer conflict warnings */}
        {selectedDay === todayName() && prayerConflicts.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold">Prayer Conflicts</span>
            </div>
            {prayerConflicts.map(c => (
              <div key={c.prayer} className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                <strong>{c.prayer}</strong> ({c.prayerTime}) overlaps with <strong>{c.event.studentName}</strong> — pray after it ends at {fmtTime(toMin(c.event.time) + c.event.duration)}
              </div>
            ))}
          </div>
        )}

        {/* Timeline */}
        {timeline.length > 0 ? (
          <div className="relative ml-14">
            <div className="absolute left-0 top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
            {timeline.map((entry, idx) => {
              if (entry.type === 'prayer') {
                return (
                  <div key={`prayer-${entry.name}`} className="relative pb-3">
                    <div className="absolute -left-14 top-0 w-12 text-right">
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{entry.time}</div>
                    </div>
                    <div className="absolute -left-[4px] top-1 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 z-10" />
                    <div className="ml-4 flex items-center gap-2 py-1.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200/50 dark:border-emerald-800/30">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                        🕌 {entry.name}
                      </span>
                    </div>
                  </div>
                );
              }

              const item = entry.item;
              const endMin = toMin(item.time) + item.duration;
              return (
                <div key={`${item.type}-${item.id}`} className="relative pb-3 last:pb-0">
                  <div className="absolute -left-14 top-0 w-12 text-right">
                    <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{item.time}</div>
                    <div className="text-[9px] text-slate-400 tabular-nums">{fmtTime(endMin)}</div>
                  </div>
                  <div
                    className="absolute -left-[5px] top-1.5 w-[10px] h-[10px] rounded-full border-2 border-white dark:border-slate-900 shadow-sm z-10"
                    style={{ backgroundColor: item.color }}
                  />
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="w-full text-left ml-4 p-3 rounded-xl border transition-all active:scale-[0.98] hover:shadow-md"
                    style={{ borderColor: `${item.color}30`, backgroundColor: `${item.color}06`, borderLeftWidth: '3px', borderLeftColor: item.color }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{item.title}</div>
                        {item.subtitle && <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{item.subtitle}</div>}
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        <span className="text-[9px] font-bold text-white px-2 py-0.5 rounded-md" style={{ backgroundColor: item.color }}>
                          {item.duration}m
                        </span>
                        {item.type === 'task' && (
                          <span className="text-[8px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded-md uppercase">
                            {t('todo')}
                          </span>
                        )}
                        {item.isFixed && <Pin className="w-3 h-3 text-slate-400" />}
                      </div>
                    </div>
                    {(item.location || item.notes) && (
                      <div className="mt-2 flex items-center gap-3 text-[9px] text-slate-400">
                        {item.location && <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{item.location}</span>}
                        {item.notes && <span className="flex items-center gap-1 truncate"><FileText className="w-2.5 h-2.5" />{item.notes}</span>}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <button
            onClick={() => setEditingLesson({ day: selectedDay, time: `${settings.startHour.toString().padStart(2, '0')}:00`, duration: settings.interval, color: COLORS[5] })}
            className="w-full p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400"
          >
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <div className="text-xs font-bold">{t('noClasses')}</div>
            <div className="text-[10px] mt-1">Tap to add an event</div>
          </button>
        )}
      </div>
    );
  };

  // ─────────────────── ITEM DETAIL MODAL ─────────────────────────────────────
  const renderDetailModal = () => {
    if (!selectedItem) return null;
    const endTime = fmtTime(toMin(selectedItem.time) + selectedItem.duration);
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
        <div
          className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[85vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Color header */}
          <div className="p-5 pb-4" style={{ background: `linear-gradient(135deg, ${selectedItem.color}15, ${selectedItem.color}05)` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: selectedItem.color }}>
                    {selectedItem.type === 'task' ? t('todo') : t('classes')}
                  </span>
                  {selectedItem.isFixed && (
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {t('fixedEvent')}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 break-words">{selectedItem.title}</h3>
                {selectedItem.subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{selectedItem.subtitle}</p>}
              </div>
              <button onClick={() => setSelectedItem(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="p-5 pt-2 space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('time')}</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t(selectedItem.day.toLowerCase() as any)} · {selectedItem.time} – {endTime}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('duration')}</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{selectedItem.duration} {t('minutes')}</span>
            </div>
            {selectedItem.location && (
              <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('location')}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{selectedItem.location}</span>
              </div>
            )}
            {selectedItem.notes && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes</div>
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedItem.notes}</div>
              </div>
            )}
            {selectedItem.priority && (
              <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('high')}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 capitalize">{selectedItem.priority}</span>
              </div>
            )}

            {/* Prayer conflict warn in detail */}
            {selectedItem.type === 'lesson' && selectedItem.isFixed && prayerConflicts.some(c => c.event.id === selectedItem.id) && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/30 px-4 py-2.5">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-bold mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Prayer Overlap
                </div>
                {prayerConflicts.filter(c => c.event.id === selectedItem.id).map(c => (
                  <div key={c.prayer} className="text-[11px] text-amber-600 dark:text-amber-400">
                    {c.prayer} ({c.prayerTime}) falls during this event. Pray after {fmtTime(toMin(c.event.time) + c.event.duration)}.
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-5 pt-0 flex items-center gap-2 flex-wrap">
            {selectedItem.type === 'lesson' && (
              <>
                <button
                  onClick={() => {
                    const lesson = state.lessons.find(l => l.id === selectedItem.id);
                    if (lesson) { setSelectedItem(null); setEditingLesson(lesson); }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> {t('edit')}
                </button>
                <button
                  onClick={() => duplicateLesson(selectedItem.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> {t('duplicate')}
                </button>
                <button
                  onClick={() => { setMovingLessonId(selectedItem.id); setSelectedItem(null); }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <GripVertical className="w-3.5 h-3.5" /> {t('moveLesson')}
                </button>
                <button
                  onClick={() => deleteLesson(selectedItem.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/30 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/15 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {t('delete')}
                </button>
              </>
            )}
            {selectedItem.type === 'task' && (
              <button
                onClick={() => {
                  updateState({
                    ...state,
                    tasks: state.tasks.map(t => t.id === selectedItem.id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t),
                  });
                  soundService.play('success');
                  setSelectedItem(null);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> {t('done')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────── EDIT LESSON MODAL ─────────────────────────────────────
  const renderEditModal = () => {
    if (!editingLesson) return null;
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={() => setEditingLesson(null)}>
        <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {editingLesson.id ? t('edit') : t('addNew')}
            </h3>
            <button onClick={() => setEditingLesson(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('description')}</label>
              <input
                autoFocus
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm"
                value={editingLesson.studentName || ''}
                onChange={e => setEditingLesson({ ...editingLesson, studentName: e.target.value })}
                placeholder="Event name..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('subject')}</label>
                <input
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                  value={editingLesson.subject || ''}
                  onChange={e => setEditingLesson({ ...editingLesson, subject: e.target.value })}
                  placeholder={t('subject')}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('location')}</label>
                <input
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                  value={editingLesson.location || ''}
                  onChange={e => setEditingLesson({ ...editingLesson, location: e.target.value })}
                  placeholder="Room 101"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Day</label>
                <select
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                  value={editingLesson.day}
                  onChange={e => setEditingLesson({ ...editingLesson, day: e.target.value })}
                >
                  {ALL_DAYS.map(d => <option key={d} value={d}>{t(d.toLowerCase() as any)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('time')}</label>
                <input
                  type="time"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                  value={editingLesson.time}
                  onChange={e => setEditingLesson({ ...editingLesson, time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('duration')}</label>
                <input
                  type="number"
                  step={15}
                  min={15}
                  inputMode="numeric"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                  value={editingLesson.duration}
                  onChange={e => setEditingLesson({ ...editingLesson, duration: parseInt(e.target.value) || 15 })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('fixedEvent')}</label>
                <button
                  onClick={() => setEditingLesson({ ...editingLesson, isFixed: !editingLesson.isFixed })}
                  className={`w-full p-2.5 rounded-lg border text-sm font-semibold transition-all ${editingLesson.isFixed
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                >
                  {editingLesson.isFixed ? t('yesFixed') : t('noFlexible')}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes</label>
              <textarea
                rows={2}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 resize-none"
                value={editingLesson.notes || ''}
                onChange={e => setEditingLesson({ ...editingLesson, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('color')}</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setEditingLesson({ ...editingLesson, color: c })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${editingLesson.color === c ? 'ring-2 ring-offset-2 ring-slate-400 border-white dark:border-slate-900 scale-110' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Prayer conflict preview */}
            {editingLesson.isFixed && editingLesson.time && editingLesson.duration && prayerTimes && (() => {
              const eStart = toMin(editingLesson.time!);
              const eEnd = eStart + (editingLesson.duration || 60);
              const conflicts = PRAYER_NAMES.filter(name => {
                const pt = prayerTimes[name];
                if (!pt) return false;
                const pMin = toMin(pt);
                return pMin >= eStart && pMin < eEnd;
              });
              if (!conflicts.length) return null;
              return (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/30 p-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    This event overlaps with: {conflicts.join(', ')}
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                    You'll be reminded to pray after the event ends.
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-2 pt-2">
              <button
                onClick={saveLesson}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors"
              >
                {t('saveEvent')}
              </button>
              {editingLesson.id && (
                <>
                  <button
                    onClick={() => { setMovingLessonId(editingLesson.id!); setEditingLesson(null); }}
                    className="px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title={t('moveLesson')}
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteLesson(editingLesson.id!)}
                    className="px-3 rounded-lg border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/15 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────── EDIT TEMPLATE MODAL ───────────────────────────────────
  const renderTemplateModal = () => {
    if (!editingTemplate) return null;
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={() => setEditingTemplate(null)}>
        <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {editingTemplate.id ? `${t('edit')} Template` : t('newTemplate')}
            </h3>
            <button onClick={() => setEditingTemplate(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('templateName')}</label>
              <input
                autoFocus
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                value={editingTemplate.title || ''}
                onChange={e => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('subject')}</label>
                <input className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100" value={editingTemplate.subject || ''} onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('location')}</label>
                <input className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100" value={editingTemplate.location || ''} onChange={e => setEditingTemplate({ ...editingTemplate, location: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('duration')}</label>
                <input type="number" min={15} step={15} className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100" value={editingTemplate.duration || settings.interval} onChange={e => setEditingTemplate({ ...editingTemplate, duration: parseInt(e.target.value) || settings.interval })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('color')}</label>
                <div className="flex gap-1.5 flex-wrap items-center p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setEditingTemplate({ ...editingTemplate, color: c })}
                      className={`w-5 h-5 rounded-full border-2 ${editingTemplate.color === c ? 'ring-2 ring-offset-1 ring-slate-400 border-white dark:border-slate-900' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes</label>
              <textarea rows={2} className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 resize-none" value={editingTemplate.notes || ''} onChange={e => setEditingTemplate({ ...editingTemplate, notes: e.target.value })} />
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-3">
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Preview</div>
              <div className="rounded-lg p-3 text-white text-sm" style={{ backgroundColor: editingTemplate.color || COLORS[5] }}>
                <div className="font-bold">{editingTemplate.title || 'Template title'}</div>
                <div className="text-xs opacity-80 mt-0.5">{editingTemplate.subject || 'Subject'}</div>
                <div className="text-[10px] opacity-70 mt-2">{editingTemplate.duration || settings.interval}m{editingTemplate.location ? ` · ${editingTemplate.location}` : ''}</div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={saveTemplate} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors">
                {editingTemplate.id ? t('save') : t('add')}
              </button>
              <button onClick={() => setEditingTemplate(null)} className="px-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2.5 rounded-lg font-semibold text-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────── SETTINGS PANEL ────────────────────────────────────────
  const renderSettings = () => {
    if (!showSettings) return null;
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 animate-fade-in print:hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{t('scheduleSettings')}</h3>
          <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('startHour')}</label>
            <input type="number" min="0" max="23" className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100" value={settings.startHour} onChange={e => updateSettings({ startHour: parseInt(e.target.value) })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('endHour')}</label>
            <input type="number" min="1" max="24" className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100" value={settings.endHour} onChange={e => updateSettings({ endHour: parseInt(e.target.value) })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('intervalMins')}</label>
            <select className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100" value={settings.interval} onChange={e => updateSettings({ interval: parseInt(e.target.value) })}>
              <option value={15}>15 {t('minutes')}</option>
              <option value={30}>30 {t('minutes')}</option>
              <option value={60}>60 {t('minutes')}</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('daysToShow')}</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_DAYS.map(day => (
              <button
                key={day}
                onClick={() => {
                  const next = settings.daysToShow.includes(day)
                    ? settings.daysToShow.filter(d => d !== day)
                    : [...settings.daysToShow, day];
                  updateSettings({ daysToShow: next.sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b)) });
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${settings.daysToShow.includes(day)
                  ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-900 dark:border-slate-200'
                  : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}
              >
                {t(day.toLowerCase() as any)}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────── TEMPLATE BANK SIDEBAR ─────────────────────────────────
  const renderTemplateBank = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-500" /> {t('classBank')}
          <span className="text-[10px] text-slate-400 font-normal">({state.classTemplates.length})</span>
        </h3>
        {(placingTemplate || movingLessonId) && (
          <button onClick={() => { setPlacingTemplate(null); setMovingLessonId(null); }} className="text-[10px] font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 px-2 py-0.5 rounded-md">
            {t('cancel')}
          </button>
        )}
      </div>

      {(placingTemplate || movingLessonId) && (
        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/15 rounded-lg px-3 py-2 border border-indigo-200/50 dark:border-indigo-800/30">
          {t('tapToPlace')}
        </div>
      )}

      <div className="space-y-2">
        {state.classTemplates.map(tpl => (
          <div
            key={tpl.id}
            draggable
            onDragStart={e => handleDragStart(e, 'template', tpl.id)}
            onClick={() => setPlacingTemplate(placingTemplate?.id === tpl.id ? null : tpl)}
            className={`p-3 rounded-lg border transition-all group cursor-pointer relative
              ${placingTemplate?.id === tpl.id
                ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/15'
                : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'}`}
            style={{ borderLeftWidth: '4px', borderLeftColor: tpl.color }}
          >
            <div className="font-semibold text-slate-800 dark:text-slate-100 text-xs truncate">{tpl.title}</div>
            <div className="text-[9px] text-slate-400 mt-0.5">{tpl.subject}{tpl.subject && ' · '}{tpl.duration}m</div>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={e => { e.stopPropagation(); setEditingTemplate({ ...tpl }); }} className="text-slate-300 hover:text-indigo-500">
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={e => { e.stopPropagation(); deleteTemplate(tpl.id); }} className="text-slate-300 hover:text-red-500">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => setEditingTemplate(emptyTemplate())}
          className="w-full py-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          + {t('newTemplate')}
        </button>
      </div>
    </div>
  );

  // ─────────────────── FULL-SCREEN TABLE OVERLAY (MOBILE) ────────────────────
  const renderFullTableOverlay = () => {
    if (!showFullTable) return null;
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col print:hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{t('teacher')}</div>
            <div className="text-base font-bold text-white">{t('viewFullTable')}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200">
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowFullTable(false)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900">
              {t('close')}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3">
          {renderGrid('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-auto')}
        </div>
      </div>
    );
  };

  // ═════════════════════════ MAIN RENDER ═════════════════════════════════════
  return (
    <div ref={containerRef} className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 animate-fade-in print:p-0 print:bg-white">

      {/* ── Header ── */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4 md:px-6 pt-4 md:pt-6 pb-4 print:hidden
        ${isFullscreen ? 'sticky top-0 z-40 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md' : ''}`}>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <Calendar className="w-5 h-5 md:w-6 md:h-6 text-indigo-500" /> {t('teacher')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {scheduledItems.length} events · {settings.daysToShow.length} days
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* View Mode Toggle */}
          <div className="flex bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-0.5">
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === 'week' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Week
            </button>
            <button
              onClick={() => { setViewMode('day'); setSelectedDay(todayName()); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === 'day' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List className="w-3.5 h-3.5" /> Day
            </button>
          </div>

          {/* Day navigation (day mode) */}
          {viewMode === 'day' && (
            <div className="flex items-center gap-1">
              <button onClick={() => {
                const idx = settings.daysToShow.indexOf(selectedDay);
                if (idx > 0) setSelectedDay(settings.daysToShow[idx - 1]);
              }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-[80px] text-center">
                {t(selectedDay.toLowerCase() as any)}
              </span>
              <button onClick={() => {
                const idx = settings.daysToShow.indexOf(selectedDay);
                if (idx < settings.daysToShow.length - 1) setSelectedDay(settings.daysToShow[idx + 1]);
              }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <button onClick={handleExportCSV} className="p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors" title="Export CSV">
              <FileText className="w-4 h-4" />
            </button>
            <button onClick={() => window.print()} className="p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors" title="Print">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={openFullTable} className="p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors" title={t('viewFullTable')}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg border transition-colors ${showSettings ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'}`}
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowTemplateBank(!showTemplateBank)}
            className={`p-2 rounded-lg border transition-colors md:hidden ${showTemplateBank ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'}`}
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={() => setEditingLesson({ day: selectedDay, time: `${settings.startHour.toString().padStart(2, '0')}:00`, duration: settings.interval, color: COLORS[5] })}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors active:scale-95"
          >
            <Plus className="w-4 h-4" /> {t('addEvent')}
          </button>

          {isFullscreen && (
            <button onClick={toggleFullscreen} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg text-sm font-semibold">
              <Minimize2 className="w-4 h-4" /> Exit
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col gap-3 px-4 md:px-6 pb-4 print:px-0 overflow-hidden">

        {/* Settings panel */}
        {renderSettings()}

        {/* Moving/placing indicator */}
        {(placingTemplate || movingLessonId) && (
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/15 border border-indigo-200 dark:border-indigo-800/30 rounded-lg px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 print:hidden">
            <GripVertical className="w-4 h-4" />
            {placingTemplate ? `Placing "${placingTemplate.title}" — click a time slot` : 'Moving event — click a time slot'}
            <button onClick={() => { setPlacingTemplate(null); setMovingLessonId(null); }} className="ml-auto text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 px-2 py-0.5 rounded">
              {t('cancel')}
            </button>
          </div>
        )}

        {/* Mobile template bank */}
        {showTemplateBank && (
          <div className="md:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 print:hidden animate-fade-in">
            {renderTemplateBank()}
          </div>
        )}

        {/* Prayer conflict banner (today only) */}
        {prayerConflicts.length > 0 && (
          <div className="hidden md:flex items-start gap-3 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/30 rounded-xl px-4 py-3 print:hidden">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-amber-700 dark:text-amber-300">Prayer Time Conflicts Today</div>
              {prayerConflicts.map(c => (
                <div key={c.prayer} className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  <strong>{c.prayer}</strong> ({c.prayerTime}) overlaps with "{c.event.studentName}" — remember to pray after {fmtTime(toMin(c.event.time) + c.event.duration)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">

          {/* Desktop template sidebar */}
          <div className="hidden md:block w-56 lg:w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 overflow-y-auto print:hidden">
            {renderTemplateBank()}
          </div>

          {/* Calendar area */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {/* Mobile: agenda view */}
            <div className="md:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              {renderMobileAgenda()}
            </div>

            {/* Desktop: grid view */}
            <div className="hidden md:block h-full">
              {renderGrid('h-full overflow-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl print:border-0')}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {renderDetailModal()}
      {renderEditModal()}
      {renderTemplateModal()}
      {renderFullTableOverlay()}
    </div>
  );
};

export default TeacherSchedule;
