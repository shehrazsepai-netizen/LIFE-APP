import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, Plus, X, Trash2, CalendarDays, BarChart2, Settings, Edit3, MessageSquare, ChevronLeft, ChevronRight, Target, Flame, CheckCircle2, Circle } from 'lucide-react';

const DEFAULT_HABITS = [
  { id: 'fajr', icon: '🌅', label: 'Fajr', type: 'boolean' },
  { id: 'dhuhr', icon: '☀️', label: 'Dhuhr', type: 'boolean' },
  { id: 'asr', icon: '🌤️', label: 'Asr', type: 'boolean' },
  { id: 'maghrib', icon: '🌇', label: 'Maghrib', type: 'boolean' },
  { id: 'isha', icon: '🌙', label: 'Isha', type: 'boolean' },
  { id: 'screentime', icon: '📱', label: 'Screen (h)', type: 'numeric' },
  { id: 'reading', icon: '📖', label: 'Read (m)', type: 'numeric' },
];

const generateDays = (count: number) => {
  const result = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result.push(d);
  }
  return result;
};

const getStorageKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function App() {
  const [data, setData] = useState<Record<string, Record<string, string | boolean>>>({});
  const [reflections, setReflections] = useState<Record<string, string>>({});
  const [days, setDays] = useState<Date[]>([]);
  
  const [habits, setHabits] = useState<any[]>(DEFAULT_HABITS);
  const [prayerTimes, setPrayerTimes] = useState({ fajr: '04:31', dhuhr: '12:21', asr: '15:48', maghrib: '18:43', isha: '20:13' });
  const [settings, setSettings] = useState({ showPrayers: true, eyeCare: true });
  
  // Tabs: 'today', 'history', 'report', 'settings'
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'report' | 'settings'>('today');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const [reportDate, setReportDate] = useState(new Date());
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(getStorageKey(new Date()));

  const [newIcon, setNewIcon] = useState('🎨');
  const [newLabel, setNewLabel] = useState('Hobby');
  const [newType, setNewType] = useState('boolean');

  useEffect(() => {
    setDays(generateDays(30));

    try {
      const storedData = localStorage.getItem('atomic-24-data');
      if (storedData) setData(JSON.parse(storedData));
      
      const storedReflections = localStorage.getItem('atomic-24-reflections');
      if (storedReflections) setReflections(JSON.parse(storedReflections));
      
      const storedSettings = localStorage.getItem('atomic-24-settings');
      if (storedSettings) setSettings(JSON.parse(storedSettings));

      const storedHabits = localStorage.getItem('atomic-24-habits');
      if (storedHabits) {
        let parsed = JSON.parse(storedHabits);
        // Migration: inject screentime if it doesn't exist
        if (!parsed.some((h: any) => h.id === 'screentime' || h.type === 'numeric')) {
           parsed.push({ id: 'screentime', icon: '📱', label: 'Screen (h)', type: 'numeric' });
           localStorage.setItem('atomic-24-habits', JSON.stringify(parsed));
        }
        setHabits(parsed);
      }
    } catch(e) { console.error(e) }

    fetch('https://api.aladhan.com/v1/timingsByCity?city=Dubai&country=AE&method=8')
      .then(res => res.json())
      .then(json => {
        if (json?.data?.timings) {
          const t = json.data.timings;
          setPrayerTimes({ fajr: t.Fajr, dhuhr: t.Dhuhr, asr: t.Asr, maghrib: t.Maghrib, isha: t.Isha });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (settings.eyeCare) document.body.classList.add('eyecare');
    else document.body.classList.remove('eyecare');
  }, [settings.eyeCare]);

  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    localStorage.setItem('atomic-24-settings', JSON.stringify(newSettings));
  };

  const setHabitValue = (dateKey: string, habitId: string, value: any) => {
    setData(prev => {
      const dateData = prev[dateKey] || {};
      const nextState = { ...prev, [dateKey]: { ...dateData, [habitId]: value } };
      setTimeout(() => localStorage.setItem('atomic-24-data', JSON.stringify(nextState)), 0);
      return nextState;
    });
  };

  const toggleHabit = (dateKey: string, habitId: string) => {
    const isTicked = !!(data[dateKey] || {})[habitId];
    setHabitValue(dateKey, habitId, !isTicked);
  };

  const updateReflection = (dateKey: string, text: string) => {
    setReflections(prev => {
      const nextState = { ...prev, [dateKey]: text };
      setTimeout(() => localStorage.setItem('atomic-24-reflections', JSON.stringify(nextState)), 0);
      return nextState;
    });
  };

  const addHabit = () => {
    if (!newLabel.trim()) return;
    const newH = { id: Date.now().toString(), icon: newIcon.trim() || '📌', label: newLabel.trim(), type: newType };
    const nextHabits = [...habits, newH];
    setHabits(nextHabits);
    localStorage.setItem('atomic-24-habits', JSON.stringify(nextHabits));
    setNewIcon('🎨');
    setNewLabel('Hobby');
    setNewType('boolean');
  };

  const removeHabit = (id: string) => {
    const nextHabits = habits.filter(h => h.id !== id);
    setHabits(nextHabits);
    localStorage.setItem('atomic-24-habits', JSON.stringify(nextHabits));
  };

  // Gamification Metrics
  const calculateStreak = () => {
    let streak = 0;
    for (let i = 0; i < 30; i++) {
       const d = new Date(); d.setDate(d.getDate() - i);
       const k = getStorageKey(d);
       const dayData = data[k] || {};
       
       // Logged if there is at least one habit marked/entered
       const hasAny = habits.some(h => {
           if (h.type === 'numeric') return dayData[h.id] !== undefined && dayData[h.id] !== '';
           return !!dayData[h.id];
       });
       
       if (hasAny) streak++;
       else if (i === 0) continue; // Skip strictly today if not filled yet so streak doesn't break at 8AM
       else break; 
    }
    return streak;
  };

  const todayKey = getStorageKey(new Date());
  const todayData = data[todayKey] || {};
  let completedToday = 0;
  habits.forEach(h => {
     if (h.type === 'numeric') {
        if (todayData[h.id] !== undefined && todayData[h.id] !== '') completedToday++;
     } else {
        if (todayData[h.id]) completedToday++;
     }
  });
  const todayProgress = habits.length === 0 ? 0 : Math.round((completedToday / habits.length) * 100);

  const getWeeklyStats = () => {
    const weeklyDays = days.slice(0, 7);
    let totalPossible = weeklyDays.length * habits.length;
    let totalCompleted = 0;
    
    weeklyDays.forEach(day => {
      const dateKey = getStorageKey(day);
      if (data[dateKey]) {
        habits.forEach(h => {
           if (h.type === 'numeric') {
               if (data[dateKey][h.id] !== undefined && data[dateKey][h.id] !== '') totalCompleted++;
           } else {
               if (data[dateKey][h.id]) totalCompleted++; 
           }
        });
      }
    });
    
    return totalPossible === 0 ? 0 : Math.round((totalCompleted / totalPossible) * 100);
  };

  // Calendar setup
  const currentReportMonth = reportDate.getMonth();
  const currentReportYear = reportDate.getFullYear();
  const firstDayOfMonth = new Date(currentReportYear, currentReportMonth, 1).getDay();
  const daysInMonth = new Date(currentReportYear, currentReportMonth + 1, 0).getDate();
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => setReportDate(new Date(currentReportYear, currentReportMonth - 1, 1));
  const nextMonth = () => setReportDate(new Date(currentReportYear, currentReportMonth + 1, 1));

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `minmax(80px, 120px) repeat(${habits.length}, minmax(60px, 1fr))`,
    gap: '8px'
  };

  return (
    <div className="min-h-[100dvh] bg-theme-bg text-theme-text-main relative flex flex-col font-sans selection:bg-theme-accent/30 overflow-x-hidden">
      
      {/* Header */}
      <header className="px-5 py-4 border-b border-theme-border bg-theme-bg flex flex-col gap-3 sticky top-0 z-40">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight uppercase leading-none">Atomic 24</h1>
            <p className="text-[10px] sm:text-[11px] text-theme-text-muted tracking-[0.1em] uppercase mt-1">Lifestyle & Habit Tracker</p>
          </div>
          
          <div className="flex items-center gap-1.5 text-orange-500 font-bold bg-orange-500/10 px-3 py-1.5 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.2)]">
            <Flame size={16} className="fill-orange-500" />
            <span className="text-xs sm:text-sm">{calculateStreak()} Day{calculateStreak() !== 1 ? 's' : ''}</span>
          </div>
        </div>
        
        {settings.showPrayers && (
          <div className="flex gap-4 sm:gap-6 w-full overflow-x-auto pb-1 scrollbar-hide">
            {[
              {l: 'Fajr', t: prayerTimes.fajr}, 
              {l: 'Dhuhr', t: prayerTimes.dhuhr}, 
              {l: 'Asr', t: prayerTimes.asr}, 
              {l: 'Maghrib', t: prayerTimes.maghrib}, 
              {l: 'Isha', t: prayerTimes.isha}
            ].map(p => (
              <div key={p.l} className="shrink-0 bg-theme-surface/50 px-3 py-1.5 rounded border border-theme-border flex gap-2 items-center">
                <span className="text-[9px] uppercase text-theme-text-muted tracking-[0.05em]">{p.l}</span>
                <span className="text-[12px] font-semibold text-theme-accent">{p.t}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto pb-24">
        
        {/* VIEW: TODAY */}
        {activeTab === 'today' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4 pt-6 px-4 sm:px-8 max-w-2xl mx-auto w-full">
            <div className="flex flex-col gap-3 mb-2">
              <h2 className="text-2xl font-bold tracking-tight">Today's Focus</h2>
              
              <div className="w-full bg-theme-surface h-2 sm:h-3 rounded-full overflow-hidden border border-theme-border relative">
                <div className="bg-theme-accent h-full transition-all duration-500 ease-out absolute left-0" style={{ width: `${todayProgress}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-theme-text-muted font-medium tracking-wider uppercase">
                 <span>Progress</span>
                 <span>{todayProgress}% Completed</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {habits.map(habit => {
                const val = todayData[habit.id] as string | boolean | undefined;
                const isNumeric = habit.type === 'numeric';
                const isDone = isNumeric ? (val !== undefined && val !== '') : !!val;

                return (
                  <div key={habit.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${isDone ? 'bg-theme-accent/10 border-theme-accent/50 scale-[1.01]' : 'bg-theme-surface border-theme-border hover:border-zinc-500'}`}>
                     <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${isDone ? 'bg-theme-accent text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-theme-bg border border-theme-border'}`}>
                          {habit.icon}
                        </div>
                        <span className={`font-bold tracking-wide ${isDone ? 'text-theme-accent' : 'text-theme-text-main'}`}>{habit.label}</span>
                     </div>
                     
                     {isNumeric ? (
                        <div className="flex items-center gap-2">
                           <input 
                             type="number" 
                             value={val?.toString() || ''}
                             onChange={(e) => setHabitValue(todayKey, habit.id, e.target.value)}
                             className={`w-20 bg-theme-bg border rounded-lg p-2.5 text-center font-bold focus:outline-none transition-colors ${isDone ? 'border-theme-accent text-theme-accent' : 'border-theme-border text-white focus:border-theme-text-muted'}`}
                             placeholder="0"
                             step="0.1"
                           />
                        </div>
                     ) : (
                        <button onClick={() => toggleHabit(todayKey, habit.id)} className="p-2 mr-1 transition-transform active:scale-90" aria-label={`Toggle ${habit.label}`}>
                          {isDone ? 
                            <CheckCircle2 size={32} className="text-theme-accent" /> : 
                            <Circle size={32} className="text-theme-border hover:text-white transition-colors" />
                          }
                        </button>
                     )}
                  </div>
                )
              })}
            </div>
            
            {/* Today's Reflection Prominently Placed */}
            <div className="bg-theme-surface border border-theme-border rounded-2xl p-4 mt-6 flex flex-col gap-3 shadow-inner">
               <div className="text-[11px] text-theme-text-muted uppercase tracking-widest font-semibold flex items-center gap-1.5"><MessageSquare size={14}/> Today's Reflection Log</div>
               <textarea 
                  value={reflections[todayKey] || ""}
                  onChange={(e) => updateReflection(todayKey, e.target.value)}
                  placeholder="Review your day. How did you feel? What did you achieve?"
                  className="w-full bg-theme-bg border border-theme-border rounded-xl p-4 text-[14px] text-theme-text-main focus:border-theme-accent focus:outline-none placeholder:text-theme-text-muted/50 min-h-[120px] transition-colors resize-y"
               />
            </div>
          </motion.div>
        )}

        {/* VIEW: HISTORY GRID */}
        {activeTab === 'history' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2 pt-4 px-2 sm:px-5">
            <h2 className="text-xl font-bold tracking-tight px-3 mb-2">History Grid</h2>
            
            <div className="w-full overflow-x-auto pb-6 scrollbar-hide">
              <div className="min-w-max flex flex-col gap-2">
                <div style={gridStyle} className="px-2 sm:px-5 pb-2 border-b border-theme-border mb-2 text-center items-center">
                  <div className="text-[10px] text-theme-text-muted uppercase tracking-[0.1em] text-left ml-2">Date</div>
                  {habits.map(h => (
                    <div key={h.id} className="text-[10px] text-theme-text-muted uppercase tracking-[0.1em]">{h.label}</div>
                  ))}
                </div>

                {days.map((day, idx) => {
                  const dateKey = getStorageKey(day);
                  const dateData = data[dateKey] || {};
                  const isToday = idx === 0;
                  const dateNum = day.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
                  const dateSub = isToday ? 'Today' : (idx === 1 ? 'Yesterday' : day.toLocaleDateString('en-US', { weekday: 'short' }));

                  return (
                    <div key={dateKey} className="flex flex-col gap-2">
                      <div style={gridStyle} className={`items-center px-2 sm:px-5 py-3 rounded-xl border transition-colors ${isToday ? 'border-theme-accent bg-[#0D0D08]' : 'border-transparent bg-theme-surface'}`}>
                        <div 
                          className="flex flex-col text-left cursor-pointer group"
                          onClick={() => setExpandedDay(expandedDay === dateKey ? null : dateKey)}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-[12px] sm:text-[16px] font-bold tracking-tight">{dateNum}</span>
                            <Edit3 size={11} className="text-theme-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="text-[9px] sm:text-[11px] text-theme-text-muted truncate mt-0.5">{dateSub}</span>
                        </div>
                        
                        {habits.map(habit => {
                          const val = dateData[habit.id];
                          const isNumeric = habit.type === 'numeric';
                          const isDone = isNumeric ? (val !== undefined && val !== '') : !!val;
                          return (
                            <div key={habit.id} className="flex justify-center flex-col items-center">
                              <button
                                onClick={() => !isNumeric && toggleHabit(dateKey, habit.id)}
                                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border flex flex-col items-center justify-center transition-all duration-200 ${isDone ? 'bg-theme-accent border-theme-accent shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-transparent border-theme-border'}`}
                                aria-label={`${habit.label} Status`}
                              >
                                {isNumeric && isDone ? (
                                   <span className="text-[11px] sm:text-[14px] font-extrabold text-black">{val as string}</span>
                                ) : (
                                   <span className={`text-[16px] sm:text-[18px] transition-all duration-200 leading-none ${isDone && !isNumeric ? 'brightness-[0.2] contrast-200' : ''}`}>
                                      {habit.icon}
                                   </span>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* History Reflection Dropdown Area */}
                      <AnimatePresence>
                        {expandedDay === dateKey && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden px-1"
                          >
                            <div className="bg-theme-bg border border-theme-border rounded-xl p-3 flex flex-col gap-2 shadow-inner">
                              <div className="text-[10px] text-theme-text-muted uppercase tracking-widest flex items-center gap-1.5"><MessageSquare size={12}/> Daily Reflection Note</div>
                              <textarea 
                                value={reflections[dateKey] || ""}
                                onChange={(e) => updateReflection(dateKey, e.target.value)}
                                placeholder="Edit past reflection..."
                                className="w-full bg-theme-surface border border-theme-border rounded-lg p-3 text-[13px] text-theme-text-main focus:border-theme-accent focus:outline-none placeholder:text-theme-text-muted min-h-[80px]"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* VIEW: REPORT */}
        {activeTab === 'report' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 pt-6 px-4 sm:px-8 max-w-2xl mx-auto w-full">
            <h2 className="text-xl font-semibold tracking-tight">Reflection & Activity Report</h2>
            
            <div className="bg-theme-surface border border-theme-border p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
              <span className="text-[11px] text-theme-text-muted uppercase tracking-[0.1em]">Last 7 Days Tracker Efficiency</span>
              <div className="text-5xl font-bold tracking-tighter text-theme-accent">
                {getWeeklyStats()}%
              </div>
            </div>

            {/* Monthly Calendar View */}
            <div className="bg-theme-surface border border-theme-border p-4 sm:p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex justify-between items-center px-1">
                 <button onClick={prevMonth} className="p-2 bg-theme-bg border border-theme-border hover:border-theme-accent transition-colors rounded-full text-theme-text-main"><ChevronLeft size={16}/></button>
                 <h3 className="text-sm font-bold uppercase tracking-widest">{reportDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                 <button onClick={nextMonth} className="p-2 bg-theme-bg border border-theme-border hover:border-theme-accent transition-colors rounded-full text-theme-text-main"><ChevronRight size={16}/></button>
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-1">
                 {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                   <div key={d} className="text-[10px] text-theme-text-muted font-semibold">{d}</div>
                 ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
                 {blanks.map(b => <div key={`blank-${b}`} className="p-1 sm:p-2" />)}
                 {monthDays.map(d => {
                    const dateObj = new Date(currentReportYear, currentReportMonth, d);
                    const dKey = getStorageKey(dateObj);
                    const hasRef = !!reflections[dKey];
                    const isSelected = selectedCalDate === dKey;
                    const isToday = getStorageKey(new Date()) === dKey;
                    
                    return (
                      <button 
                        key={d} 
                        onClick={() => setSelectedCalDate(dKey)}
                        className={`relative p-2 sm:py-3 rounded-xl flex flex-col items-center justify-center transition-all min-h-[44px] ${
                          isSelected ? 'bg-theme-accent text-black font-bold shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 
                          isToday ? 'border border-theme-accent text-theme-accent bg-theme-bg/50' : 
                          'bg-theme-bg border border-theme-border hover:border-zinc-500 text-theme-text-main'
                        }`}
                      >
                        <span className={`text-[12px] sm:text-sm ${isSelected ? 'font-bold' : ''}`}>{d}</span>
                        {hasRef && (
                          <div className={`absolute bottom-1 sm:bottom-1.5 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-theme-accent'}`} />
                        )}
                      </button>
                    );
                 })}
              </div>
              
              {/* Selected Day Reflection */}
              <div className="mt-4 border-t border-theme-border pt-4 min-h-[140px] flex flex-col">
                <h4 className="text-[11px] text-theme-text-muted uppercase tracking-[0.1em] mb-3">
                  {selectedCalDate ? (() => {
                     const [y, m, d] = selectedCalDate.split('-');
                     return new Date(Number(y), Number(m)-1, Number(d)).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                  })() : 'Select a date'}
                </h4>
                {selectedCalDate && reflections[selectedCalDate] ? (
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-theme-text-main p-4 bg-theme-bg rounded-xl border border-theme-border grow">
                    {reflections[selectedCalDate]}
                  </p>
                ) : (
                  <div className="flex flex-col grow justify-center text-center p-6 border-2 border-dashed border-theme-border rounded-xl bg-theme-bg/50">
                    <p className="text-[12px] text-theme-text-muted italic">
                      No reflection logged for this date.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* VIEW: SETTINGS */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 pt-6 px-4 sm:px-8 max-w-2xl mx-auto">
            
            <div className="flex flex-col gap-4">
              <h3 className="text-[11px] text-theme-text-muted uppercase tracking-[0.1em] border-b border-theme-border pb-2">Appearance & Features</h3>
              
              <label className="flex items-center justify-between p-4 bg-theme-surface border border-theme-border rounded-xl cursor-pointer hover:bg-theme-bg transition-colors">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">Eye-Care Mode (Recommended)</span>
                  <span className="text-[11px] text-theme-text-muted">Uses warmer earth tones and reduces blue light.</span>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${settings.eyeCare ? 'bg-theme-accent' : 'bg-theme-border'}`}>
                  <div className={`w-4 h-4 bg-black rounded-full transition-transform ${settings.eyeCare ? 'translate-x-6' : 'translate-x-0'}`}/>
                </div>
                <input type="checkbox" className="hidden" checked={settings.eyeCare} onChange={(e) => saveSettings({...settings, eyeCare: e.target.checked})} />
              </label>

              <label className="flex items-center justify-between p-4 bg-theme-surface border border-theme-border rounded-xl cursor-pointer hover:bg-theme-bg transition-colors">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">Show Islamic Prayer Times</span>
                  <span className="text-[11px] text-theme-text-muted">Shows live prayer schedules in the top header.</span>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${settings.showPrayers ? 'bg-theme-accent' : 'bg-theme-border'}`}>
                  <div className={`w-4 h-4 bg-black rounded-full transition-transform ${settings.showPrayers ? 'translate-x-6' : 'translate-x-0'}`}/>
                </div>
                <input type="checkbox" className="hidden" checked={settings.showPrayers} onChange={(e) => saveSettings({...settings, showPrayers: e.target.checked})} />
              </label>

              <div className="p-4 bg-theme-surface border border-theme-border text-theme-accent/80 rounded-xl mt-2">
                <h4 className="text-[11px] uppercase tracking-widest font-semibold mb-1 flex items-center gap-1.5"><Info size={12}/> About Screen Time</h4>
                <p className="text-[11px] leading-relaxed text-theme-text-muted/80">
                  Web apps cannot natively read your device's exact Screen Time. Check your phone's digital wellbeing settings and manually type the total hours tracked into the 'Screen' input card each day!
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
               <div className="flex justify-between items-center border-b border-theme-border pb-2">
                 <h3 className="text-[11px] text-theme-text-muted uppercase tracking-[0.1em]">Manage Custom Habits</h3>
               </div>
               
               {/* Add New Form - Allows Choice of Metric Type */}
               <div className="flex flex-col sm:flex-row gap-2">
                  <input type="text" maxLength={4} value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="Emoji (🎨)" className="bg-theme-surface border border-theme-border p-3 rounded-lg text-sm focus:border-theme-accent focus:outline-none w-full sm:w-24 text-center"/>
                  <input type="text" maxLength={12} value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label (Hobby)" className="bg-theme-surface border border-theme-border p-3 rounded-lg text-sm focus:border-theme-accent focus:outline-none flex-1"/>
                  <select value={newType} onChange={e => setNewType(e.target.value)} className="bg-theme-surface border border-theme-border p-3 rounded-lg text-sm focus:border-theme-accent focus:outline-none text-theme-text-main w-full sm:w-40">
                     <option value="boolean">Tick (Yes/No)</option>
                     <option value="numeric">Number Measure</option>
                  </select>
                  <button onClick={addHabit} className="bg-theme-accent text-black font-semibold px-4 py-3 rounded-lg hover:brightness-110 active:scale-95 transition-all text-sm shrink-0 flex items-center justify-center gap-1 whitespace-nowrap">
                    <Plus size={16}/> Add
                  </button>
               </div>

               {/* Current Habits List */}
               <div className="flex flex-col gap-2 mt-2">
                 {habits.map(h => (
                    <div key={h.id} className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-theme-border flex flex-col items-center justify-center bg-theme-surface">
                           <span className="text-lg">{h.icon}</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-bold tracking-wide">{h.label}</span>
                           <span className="text-[10px] text-theme-text-muted uppercase tracking-widest">{h.type === 'numeric' ? 'Measurement Tracking' : 'Yes / No Toggle'}</span>
                        </div>
                      </div>
                      <button onClick={() => removeHabit(h.id)} className="p-3 text-theme-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors group" aria-label="Delete habit">
                         <Trash2 size={16} className="opacity-50 group-hover:opacity-100" />
                      </button>
                    </div>
                 ))}
               </div>
            </div>

          </motion.div>
        )}
      </main>

      {/* Floating Bottom Nav for Mobile Philosophy */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-theme-bg/80 backdrop-blur-lg border-t border-theme-border pb-safe">
         <div className="max-w-md mx-auto flex justify-between items-center text-theme-text-muted">
           <button 
             onClick={() => setActiveTab('today')}
             className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${activeTab === 'today' ? 'text-theme-accent' : 'hover:text-theme-text-main'}`}
           >
             <Target size={22} className={activeTab === 'today' ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]' : ''}/>
             <span className="text-[10px] uppercase font-semibold tracking-wider">Today</span>
           </button>
           <button 
             onClick={() => setActiveTab('history')}
             className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${activeTab === 'history' ? 'text-theme-accent' : 'hover:text-theme-text-main'}`}
           >
             <CalendarDays size={22} className={activeTab === 'history' ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]' : ''}/>
             <span className="text-[10px] uppercase font-semibold tracking-wider">History</span>
           </button>
           <button 
             onClick={() => setActiveTab('report')}
             className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${activeTab === 'report' ? 'text-theme-accent' : 'hover:text-theme-text-main'}`}
           >
             <BarChart2 size={22} className={activeTab === 'report' ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]' : ''}/>
             <span className="text-[10px] uppercase font-semibold tracking-wider">Report</span>
           </button>
           <button 
             onClick={() => setActiveTab('settings')}
             className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${activeTab === 'settings' ? 'text-theme-accent' : 'hover:text-theme-text-main'}`}
           >
             <Settings size={22} className={activeTab === 'settings' ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]' : ''}/>
             <span className="text-[10px] uppercase font-semibold tracking-wider">Settings</span>
           </button>
         </div>
      </footer>
    </div>
  );
}
