import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppState, Lesson, ClassTemplate } from '../types';
import { useTranslation } from '../lib/translations';
import { exportToCSV } from '../lib/exportUtils';
import { Plus, Trash2, MapPin, Settings, X, GripVertical, Maximize2, Download, Minimize2, Palette, Clock, FileText, Edit2, Calendar } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: AppState) => void;
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#64748b', // Slate
];

const TeacherSchedule: React.FC<Props> = ({ state, updateState }) => {
  const { t } = useTranslation(state.language);
  const [showSettings, setShowSettings] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
    const [showTableOverlay, setShowTableOverlay] = useState(false);
  const [placingTemplate, setPlacingTemplate] = useState<ClassTemplate | null>(null);
  const [movingLessonId, setMovingLessonId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Template State
    const [editingTemplate, setEditingTemplate] = useState<Partial<ClassTemplate> | null>(null);

  const settings = state.scheduleSettings || {
    startHour: 8,
    endHour: 20,
    interval: 60,
    daysToShow: ALL_DAYS
  };
    const [mobileDay, setMobileDay] = useState(settings.daysToShow[0] || ALL_DAYS[0]);

  const updateSettings = (newSettings: any) => {
    updateState({ ...state, scheduleSettings: { ...settings, ...newSettings } });
  };

    const getEmptyTemplate = (): Partial<ClassTemplate> => ({
        title: '',
        subject: '',
        duration: settings.interval,
        color: COLORS[5],
        location: '',
        notes: ''
    });

    useEffect(() => {
        if (!settings.daysToShow.includes(mobileDay)) {
            setMobileDay(settings.daysToShow[0] || ALL_DAYS[0]);
        }
    }, [settings.daysToShow, mobileDay]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const mobileLessons = useMemo(() => {
        return state.lessons
            .filter((lesson) => lesson.day === mobileDay)
            .sort((left, right) => left.time.localeCompare(right.time));
    }, [mobileDay, state.lessons]);

    const createLessonFromTemplate = (template: ClassTemplate, day: string, time: string): Lesson => ({
        id: Date.now().toString(),
        studentName: template.title,
        subject: template.subject,
        day,
        time,
        duration: template.duration,
        color: template.color,
        location: template.location || '',
        notes: template.notes || '',
        isFixed: false,
    });

    const openTemplateAsLesson = (template: ClassTemplate) => {
        setEditingLesson({
            studentName: template.title,
            subject: template.subject,
            day: mobileDay,
            time: `${settings.startHour.toString().padStart(2, '0')}:00`,
            duration: template.duration,
            color: template.color,
            location: template.location || '',
            notes: template.notes || '',
            isFixed: false,
        });
    };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
  };

  const openTableView = () => {
      if (window.innerWidth < 768) {
          setShowTableOverlay(true);
          return;
      }
      toggleFullscreen();
  };

  const handlePrint = () => {
      window.print();
  };

  const handleExportCSV = () => {
    if (state.lessons.length === 0) {
      alert("No lessons to export.");
      return;
    }
    const filename = `schedule_export_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(state.lessons, filename);
  };

  const timeSlots: string[] = [];
  for (let i = settings.startHour; i < settings.endHour; i++) {
    for (let j = 0; j < 60; j += settings.interval) {
      const hour = i.toString().padStart(2, '0');
      const min = j.toString().padStart(2, '0');
      timeSlots.push(`${hour}:${min}`);
    }
  }

  // --- Drag and Drop Logic ---

  const handleDragStart = (e: React.DragEvent, type: 'lesson' | 'template', id: string) => {
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
        // Move existing lesson
        updateState({
            ...state,
            lessons: state.lessons.map(l => l.id === id ? { ...l, day, time } : l)
        });
    } else if (type === 'template') {
        // Create new from template
        const template = state.classTemplates.find(t => t.id === id);
        if (template) {
            const newLesson = createLessonFromTemplate(template, day, time);
            updateState({ ...state, lessons: [...state.lessons, newLesson] });
        }
    }
  };

  const saveLesson = () => {
    if (!editingLesson?.studentName || !editingLesson.time) return;
    
    const newLesson: Lesson = {
      id: editingLesson.id || Date.now().toString(),
      studentName: editingLesson.studentName,
      subject: editingLesson.subject || '',
      day: editingLesson.day || 'Monday',
      time: editingLesson.time,
      duration: editingLesson.duration || settings.interval,
      color: editingLesson.color || COLORS[5],
      location: editingLesson.location || '',
      notes: editingLesson.notes || '',
      isFixed: editingLesson.isFixed || false
    };

    if (editingLesson.id) {
        updateState({ ...state, lessons: state.lessons.map(l => l.id === newLesson.id ? newLesson : l)});
    } else {
        updateState({ ...state, lessons: [...state.lessons, newLesson] });
    }
    setEditingLesson(null);
  };

  const deleteLesson = (id: string) => {
      updateState({ ...state, lessons: state.lessons.filter(l => l.id !== id) });
      setEditingLesson(null);
  };

  const saveTemplate = () => {
      if (!editingTemplate?.title?.trim()) return;

      const nextTemplate: ClassTemplate = {
          id: editingTemplate.id || Date.now().toString(),
          title: editingTemplate.title.trim(),
          subject: editingTemplate.subject?.trim() || 'General',
          color: editingTemplate.color || COLORS[5],
          duration: editingTemplate.duration || settings.interval,
          location: editingTemplate.location?.trim() || '',
          notes: editingTemplate.notes?.trim() || '',
      };

      if (editingTemplate.id) {
          updateState({
            ...state,
            classTemplates: state.classTemplates.map((template) => template.id === nextTemplate.id ? nextTemplate : template)
          });
      } else {
          updateState({ ...state, classTemplates: [...state.classTemplates, nextTemplate] });
      }

      setEditingTemplate(null);
  };

  const deleteTemplate = (id: string) => {
      updateState({...state, classTemplates: state.classTemplates.filter(t => t.id !== id)});
  };

  const renderScheduleTable = (wrapperClassName: string) => (
      <div className={wrapperClassName}>
        <div className="min-w-[850px]">
            <div className="grid border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-20 shadow-sm" style={{ gridTemplateColumns: `70px repeat(${settings.daysToShow.length}, 1fr)` }}>
                <div className="p-4 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center flex items-center justify-center">{t('time')}</div>
                {settings.daysToShow.map(day => (
                    <div key={day} className="p-4 border-r border-slate-100 dark:border-slate-800 text-center font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wider">{t(day.toLowerCase() as any)}</div>
                ))}
            </div>

            <div className="relative">
                {timeSlots.map((time) => (
                    <div key={time} className="grid group" style={{ gridTemplateColumns: `70px repeat(${settings.daysToShow.length}, 1fr)` }}>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-600 text-center -mt-2.5 bg-white dark:bg-slate-900 relative z-10 pr-3 transition-colors group-hover:text-indigo-500">{time}</div>
                        {settings.daysToShow.map(day => (
                            <div 
                                key={`${day}-${time}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, day, time)}
                                onClick={() => {
                                    if (placingTemplate) {
                                        const newLesson = createLessonFromTemplate(placingTemplate, day, time);
                                        updateState({ ...state, lessons: [...state.lessons, newLesson] });
                                        setPlacingTemplate(null);
                                    } else if (movingLessonId) {
                                        updateState({
                                            ...state,
                                            lessons: state.lessons.map(l => l.id === movingLessonId ? { ...l, day, time } : l)
                                        });
                                        setMovingLessonId(null);
                                    } else {
                                        setEditingLesson({ day, time, duration: settings.interval, color: COLORS[5] });
                                    }
                                }}
                                className={`border-r border-b border-slate-100 dark:border-slate-800 h-14 md:h-20 transition-all cursor-pointer relative ${(placingTemplate || movingLessonId) ? 'bg-indigo-50/30 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'}`}
                            >
                                {state.lessons
                                .filter(l => l.day === day && l.time === time)
                                .map(l => {
                                    const slots = l.duration / settings.interval;
                                    return (
                                        <div 
                                            key={l.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, 'lesson', l.id)}
                                            onClick={(e) => { e.stopPropagation(); setEditingLesson(l); }}
                                            className="absolute top-0 left-0 right-1 m-1.5 p-3 rounded-2xl text-[11px] text-white shadow-lg z-10 overflow-hidden hover:brightness-95 hover:scale-[1.01] transition-all cursor-move flex flex-col print:shadow-none print:border print:border-slate-200"
                                            style={{ 
                                                backgroundColor: l.color, 
                                                height: `calc(${slots * 100}% - 12px)`,
                                                minHeight: '2.5rem',
                                                boxShadow: `0 4px 12px -2px ${l.color}40`
                                            }}
                                        >
                                            <div className="flex justify-between items-start mb-1 gap-2">
                                                <span className="font-bold leading-tight line-clamp-2 break-words">{l.studentName}</span>
                                                {l.isFixed && <div className="bg-white/30 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest shrink-0">{t('fixedEvent')}</div>}
                                            </div>
                                            {l.duration >= settings.interval && (
                                                <div className="flex flex-col h-full">
                                                    <div className="line-clamp-2 break-words opacity-90 font-medium mb-1">{l.subject}</div>
                                                    <div className="mt-auto flex items-center gap-1.5 opacity-80 font-bold text-[9px] uppercase tracking-wider">
                                                        {l.location ? <><MapPin className="w-2.5 h-2.5 shrink-0" /> <span className="truncate">{l.location}</span></> : <><Clock className="w-2.5 h-2.5 shrink-0" /> {l.duration}m</>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
      </div>
  );

  return (
    <div ref={containerRef} className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 md:p-6 rounded-3xl overflow-x-hidden md:overflow-hidden print:p-0 print:bg-white animate-fade-in">
      {/* Header Controls (Hidden on Print) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 print:hidden px-4 md:px-0 pt-4 md:pt-0">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <Clock className="w-7 h-7 md:w-8 md:h-8 text-indigo-500" /> {t('teacher')}
           </h1>
           <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{t('classes')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button onClick={handleExportCSV} className="p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors" title="Export CSV">
               <FileText className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button onClick={handlePrint} className="p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors" title="Download PDF">
               <Download className="w-4 h-4 md:w-5 md:h-5" />
            </button>
                <button onClick={openTableView} className="p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors" title={t('viewFullTable')}>
               {isFullscreen ? <Minimize2 className="w-4 h-4 md:w-5 md:h-5" /> : <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />}
            </button>
          </div>
          
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all font-medium text-sm ${showSettings ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
          >
             <Settings className="w-4 h-4" /> <span className="hidden sm:inline">{t('settings')}</span>
          </button>
          
          <button 
                        onClick={() => setEditingLesson({ day: mobileDay, time: `${settings.startHour.toString().padStart(2,'0')}:00`, duration: settings.interval, color: COLORS[5] })}
            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> <span>{t('addEvent')}</span>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 mx-4 md:mx-0 animate-fade-in text-slate-800 dark:text-slate-100 print:hidden">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">{t('scheduleSettings')}</h3>
                  <button onClick={() => setShowSettings(false)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t('startHour')}</label>
                      <input type="number" min="0" max="23" className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" value={settings.startHour} onChange={e => updateSettings({ startHour: parseInt(e.target.value) })} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t('endHour')}</label>
                      <input type="number" min="1" max="24" className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" value={settings.endHour} onChange={e => updateSettings({ endHour: parseInt(e.target.value) })} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t('intervalMins')}</label>
                      <select className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" value={settings.interval} onChange={e => updateSettings({ interval: parseInt(e.target.value) })}>
                          <option value={15}>15 {t('minutes')}</option>
                          <option value={30}>30 {t('minutes')}</option>
                          <option value={60}>60 {t('minutes')}</option>
                      </select>
                  </div>
              </div>
              <div className="mt-4">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t('daysToShow')}</label>
                  <div className="flex flex-wrap gap-2">
                      {ALL_DAYS.map(day => (
                          <button 
                            key={day}
                            onClick={() => {
                                const newDays = settings.daysToShow.includes(day) 
                                    ? settings.daysToShow.filter(d => d !== day)
                                    : [...settings.daysToShow, day];
                                updateSettings({ daysToShow: newDays.sort((a,b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b)) });
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${settings.daysToShow.includes(day) ? 'bg-slate-900 dark:bg-slate-700 text-white border-slate-900 dark:border-slate-700' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600'}`}
                          >
                              {t(day.toLowerCase() as any)}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

            <div className="md:hidden space-y-4 px-4 pb-4 print:hidden">
                    {/* Header with day selector */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                    <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100">{t('teacher')}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{mobileLessons.length} {t('classes')} • {t(mobileDay.toLowerCase() as any)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={openTableView}
                                            className="p-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300"
                                            title={t('viewFullTable')}
                                        >
                                            <Maximize2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setEditingLesson({ day: mobileDay, time: `${settings.startHour.toString().padStart(2,'0')}:00`, duration: settings.interval, color: COLORS[5] })}
                                            className="p-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                            </div>
                            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                                    {settings.daysToShow.map((day) => {
                                        const dayLessons = state.lessons.filter(l => l.day === day);
                                        return (
                                            <button
                                                key={day}
                                                onClick={() => setMobileDay(day)}
                                                className={`flex flex-col items-center px-3 py-2 rounded-xl whitespace-nowrap border transition-all min-w-[3.5rem] ${mobileDay === day ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-[0.1em]">{t(day.toLowerCase() as any).slice(0, 3)}</span>
                                                {dayLessons.length > 0 && (
                                                    <span className={`text-[8px] font-bold mt-0.5 ${mobileDay === day ? 'text-indigo-200' : 'text-slate-400'}`}>{dayLessons.length}</span>
                                                )}
                                            </button>
                                        );
                                    })}
                            </div>
                    </div>

                    {/* Templates Bank - Collapsible */}
                    <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm group/tpl">
                        <summary className="p-4 cursor-pointer flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                                <Palette className="w-4 h-4 text-indigo-500" /> {t('classBank')} <span className="text-[10px] font-bold text-slate-400">({state.classTemplates.length})</span>
                            </h3>
                            <button
                                onClick={(e) => { e.preventDefault(); setEditingTemplate(getEmptyTemplate()); }}
                                className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400"
                            >
                                + {t('newTemplate')}
                            </button>
                        </summary>
                        <div className="px-4 pb-4">
                            <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-1 px-1">
                                {state.classTemplates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => openTemplateAsLesson(template)}
                                        className="min-w-[10rem] snap-start text-left p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                                        style={{ borderLeft: `4px solid ${template.color}` }}
                                    >
                                        <div className="font-bold text-slate-800 dark:text-slate-100 text-xs mb-0.5 truncate">{template.title}</div>
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{template.subject} • {template.duration}m</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </details>

                    {/* Timeline View */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                            <div className="relative">
                                {mobileLessons.length > 0 ? (
                                    <div className="relative ml-12">
                                        {/* Timeline line */}
                                        <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700"></div>

                                        {mobileLessons.map((lesson, idx) => {
                                            const [h, m] = lesson.time.split(':').map(Number);
                                            const endMins = h * 60 + m + lesson.duration;
                                            const endH = Math.floor(endMins / 60);
                                            const endM = endMins % 60;
                                            const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

                                            return (
                                                <div key={lesson.id} className="relative pb-4 last:pb-0">
                                                    {/* Time label - absolute left */}
                                                    <div className="absolute -left-12 top-0 w-10 text-right">
                                                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 tabular-nums">{lesson.time}</div>
                                                        <div className="text-[9px] font-bold text-slate-400 tabular-nums">{endTime}</div>
                                                    </div>
                                                    
                                                    {/* Timeline dot */}
                                                    <div className="absolute -left-[5px] top-1.5 w-[10px] h-[10px] rounded-full border-2 border-white dark:border-slate-900 shadow-sm z-10" style={{ backgroundColor: lesson.color }}></div>

                                                    {/* Event card */}
                                                    <button
                                                        onClick={() => setEditingLesson(lesson)}
                                                        className="w-full text-left ml-4 p-3.5 rounded-2xl border transition-all hover:shadow-md active:scale-[0.98]"
                                                        style={{ borderLeft: `4px solid ${lesson.color}`, borderColor: `${lesson.color}30`, backgroundColor: `${lesson.color}08` }}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-bold text-slate-800 dark:text-slate-100 text-sm line-clamp-1">{lesson.studentName}</div>
                                                                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{lesson.subject}</div>
                                                            </div>
                                                            <div className="shrink-0 flex items-center gap-1.5">
                                                                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg text-white" style={{ backgroundColor: lesson.color }}>{lesson.duration}m</span>
                                                            </div>
                                                        </div>
                                                        {(lesson.location || lesson.notes) && (
                                                            <div className="mt-2 flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                                {lesson.location && <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {lesson.location}</span>}
                                                                {lesson.notes && <span className="flex items-center gap-1 truncate"><FileText className="w-2.5 h-2.5" /> {lesson.notes}</span>}
                                                            </div>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setEditingLesson({ day: mobileDay, time: `${settings.startHour.toString().padStart(2,'0')}:00`, duration: settings.interval, color: COLORS[5] })}
                                        className="w-full p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400 dark:text-slate-500"
                                    >
                                        <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                        <div className="text-[10px] font-black uppercase tracking-[0.18em] mb-1">{t('noClasses')}</div>
                                        <div className="text-xs font-medium">Tap to add an event for {t(mobileDay.toLowerCase() as any)}</div>
                                    </button>
                                )}
                            </div>
                    </div>
            </div>

      {showTableOverlay && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col print:hidden">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-4 text-white">
                  <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('teacher')}</div>
                      <div className="text-lg font-bold">{t('viewFullTable')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                      <button onClick={handlePrint} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-200">PDF</button>
                      <button onClick={() => setShowTableOverlay(false)} className="rounded-xl bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-900">{t('closeTableView')}</button>
                  </div>
              </div>
              <div className="flex-1 overflow-hidden p-4">
                  {renderScheduleTable('h-full overflow-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm custom-scrollbar')}
              </div>
          </div>
      )}

      {/* Main Content Area - Table + Sidebar */}
            <div className="hidden md:flex flex-col md:flex-row gap-6 h-full overflow-hidden px-4 md:px-0 pb-4">
          
          {/* Sidebar - Class Templates */}
          <div className="w-full md:w-72 flex flex-col gap-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm md:h-full overflow-y-auto print:hidden max-h-64 md:max-h-full shrink-0 order-2 md:order-1">
              <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-indigo-500" /> {t('classBank')}
                  </h3>
                  {(placingTemplate || movingLessonId) && (
                    <button 
                      onClick={() => { setPlacingTemplate(null); setMovingLessonId(null); }}
                      className="text-[10px] font-bold bg-red-50 dark:bg-red-900/20 text-red-600 px-2.5 py-1 rounded-full hover:bg-red-100 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                  )}
              </div>
              
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-relaxed">
                {placingTemplate || movingLessonId ? t('tapToPlace') : t('dragTemplates')}
              </p>
              
              <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  {state.classTemplates.map(tpl => (
                      <div 
                        key={tpl.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'template', tpl.id)}
                        onClick={() => {
                            if (placingTemplate?.id === tpl.id) {
                                setPlacingTemplate(null);
                            } else {
                                setPlacingTemplate(tpl);
                            }
                        }}
                        className={`p-4 rounded-2xl border transition-all relative group cursor-pointer ${
                            placingTemplate?.id === tpl.id 
                            ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg scale-[1.02]' 
                            : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-md'
                        }`}
                        style={{borderLeft: `5px solid ${tpl.color}`}}
                      >
                          <div className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">{tpl.title}</div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tpl.subject}</span>
                             <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tpl.duration}m</span>
                                                         {tpl.location && (
                                                             <>
                                                                 <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                                                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tpl.location}</span>
                                                             </>
                                                         )}
                          </div>
                                                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingTemplate({ ...tpl });
                                                            }}
                                                            className="text-slate-300 hover:text-indigo-500 transition-colors"
                                                            title={t('edit')}
                                                        >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); deleteTemplate(tpl.id); }}
                                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                      </div>
                  ))}

                                    <button 
                                        onClick={() => setEditingTemplate(getEmptyTemplate())}
                                        className="w-full py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 transition-all"
                                    >
                                            + {t('newTemplate')}
                                    </button>
              </div>
          </div>

          {/* Main Grid */}
          {renderScheduleTable('flex-1 overflow-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm relative print:border-0 custom-scrollbar order-1 md:order-2')}
      </div>

      {/* Edit Modal (Copied from previous step, kept for functionality) */}
      {editingLesson && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold">{editingLesson.id ? t('edit') : t('addNew')}</h3>
                      <button onClick={() => setEditingLesson(null)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                  </div>
                  <div className="space-y-5">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('description')}</label>
                          <input className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50" value={editingLesson.studentName || ''} onChange={e => setEditingLesson({...editingLesson, studentName: e.target.value})} placeholder={t('description')} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('subject')}</label>
                              <input className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50" value={editingLesson.subject || ''} onChange={e => setEditingLesson({...editingLesson, subject: e.target.value})} placeholder={t('subject')} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('location')}</label>
                              <input className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50" value={editingLesson.location || ''} onChange={e => setEditingLesson({...editingLesson, location: e.target.value})} placeholder="Room 101" />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('day')}</label>
                              <select className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50" value={editingLesson.day} onChange={e => setEditingLesson({...editingLesson, day: e.target.value})}>
                                  {ALL_DAYS.map(d => <option key={d} value={d}>{t(d.toLowerCase() as any)}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('time')}</label>
                              <input type="time" className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50" value={editingLesson.time} onChange={e => setEditingLesson({...editingLesson, time: e.target.value})} />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('duration')}</label>
                              <input type="number" step={15} inputMode="numeric" className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50" value={editingLesson.duration} onChange={e => setEditingLesson({...editingLesson, duration: parseInt(e.target.value)})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('fixedEvent')}</label>
                              <button 
                                onClick={() => setEditingLesson({...editingLesson, isFixed: !editingLesson.isFixed})}
                                className={`w-full p-3 rounded-xl border transition-all font-bold text-xs ${editingLesson.isFixed ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                              >
                                {editingLesson.isFixed ? t('yesFixed') : t('noFlexible')}
                              </button>
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('color')}</label>
                          <div className="flex gap-2 flex-wrap bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                              {COLORS.map(c => (
                                  <button 
                                    key={c} 
                                    onClick={() => setEditingLesson({...editingLesson, color: c})}
                                    className={`w-6 h-6 rounded-full border-2 ${editingLesson.color === c ? 'ring-2 ring-offset-1 ring-slate-400 border-white dark:border-slate-900' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                  />
                              ))}
                          </div>
                      </div>
                      <div className="flex gap-3 mt-8">
                          <button onClick={saveLesson} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30">{t('saveEvent')}</button>
                          {editingLesson.id && (
                              <>
                                <button 
                                    onClick={() => { setMovingLessonId(editingLesson.id!); setEditingLesson(null); }} 
                                    className="px-5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30"
                                    title={t('moveLesson')}
                                >
                                    <GripVertical className="w-5 h-5" />
                                </button>
                                <button onClick={() => deleteLesson(editingLesson.id!)} className="px-5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30"><Trash2 className="w-5 h-5" /></button>
                              </>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

            {editingTemplate && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden backdrop-blur-sm">
                            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 animate-fade-in">
                                    <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h3 className="text-xl font-bold">{editingTemplate.id ? `${t('edit')} ${t('newTemplate')}` : t('newTemplate')}</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Set what this template is for and how it should look when you place it.</p>
                                            </div>
                                            <button onClick={() => setEditingTemplate(null)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                                    </div>

                                    <div className="space-y-5">
                                            <div>
                                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('templateName')}</label>
                                                    <input
                                                        autoFocus
                                                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                                                        value={editingTemplate.title || ''}
                                                        onChange={e => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                                                        placeholder={t('templateName')}
                                                    />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('subject')}</label>
                                                            <input
                                                                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                                                                value={editingTemplate.subject || ''}
                                                                onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                                                                placeholder="Math tutoring, staff meeting, grading block"
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('location')}</label>
                                                            <input
                                                                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                                                                value={editingTemplate.location || ''}
                                                                onChange={e => setEditingTemplate({ ...editingTemplate, location: e.target.value })}
                                                                placeholder="Room 101"
                                                            />
                                                    </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('duration')}</label>
                                                            <input
                                                                type="number"
                                                                min={15}
                                                                step={15}
                                                                inputMode="numeric"
                                                                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                                                                value={editingTemplate.duration || settings.interval}
                                                                onChange={e => setEditingTemplate({ ...editingTemplate, duration: parseInt(e.target.value) || settings.interval })}
                                                            />
                                                    </div>
                                                    <div>
                                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t('color')}</label>
                                                            <div className="flex gap-2 flex-wrap bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[50px] items-center">
                                                                    {COLORS.map(c => (
                                                                            <button 
                                                                                key={c}
                                                                                onClick={() => setEditingTemplate({ ...editingTemplate, color: c })}
                                                                                className={`w-6 h-6 rounded-full border-2 ${editingTemplate.color === c ? 'ring-2 ring-offset-1 ring-slate-400 border-white dark:border-slate-900' : 'border-transparent'}`}
                                                                                style={{ backgroundColor: c }}
                                                                            />
                                                                    ))}
                                                            </div>
                                                    </div>
                                            </div>

                                            <div>
                                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Notes</label>
                                                    <textarea
                                                        rows={3}
                                                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 resize-none"
                                                        value={editingTemplate.notes || ''}
                                                        onChange={e => setEditingTemplate({ ...editingTemplate, notes: e.target.value })}
                                                        placeholder="Add default instructions or reminders for this template."
                                                    />
                                            </div>

                                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
                                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3">Preview</div>
                                                    <div
                                                        className="rounded-2xl p-4 text-white shadow-lg"
                                                        style={{ backgroundColor: editingTemplate.color || COLORS[5] }}
                                                    >
                                                        <div className="font-bold text-sm leading-tight">{editingTemplate.title || 'Template title'}</div>
                                                        <div className="text-xs opacity-90 mt-1">{editingTemplate.subject || 'Purpose or subject'}</div>
                                                        <div className="mt-3 flex items-center gap-2 flex-wrap text-[10px] font-bold uppercase tracking-wider opacity-90">
                                                            <span>{editingTemplate.duration || settings.interval}m</span>
                                                            {(editingTemplate.location || '').trim() && <span>• {editingTemplate.location}</span>}
                                                        </div>
                                                    </div>
                                            </div>

                                            <div className="flex gap-3 mt-8">
                                                    <button onClick={saveTemplate} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30">{editingTemplate.id ? t('save') : t('add')}</button>
                                                    <button onClick={() => setEditingTemplate(null)} className="px-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">{t('cancel')}</button>
                                            </div>
                                    </div>
                            </div>
                    </div>
            )}
    </div>
  );
};

export default TeacherSchedule;