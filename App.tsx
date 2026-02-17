
import React, { useState, useMemo, useCallback } from 'react';
import { format, getISOWeek, getYear } from 'date-fns';
import { nb } from 'date-fns/locale';
import { 
  Hammer, 
  Settings2, 
  LayoutDashboard, 
  Calculator,
  Clock, 
  ChevronRight,
  Plus,
  ChevronDown
} from 'lucide-react';
import SettingsView from './components/SettingsView';
import BudgetView from './components/BudgetView';
import { Assignee, BudgetActuals, Milestone, ProjectConfig, DaySchedule } from './types';
import { INITIAL_MILESTONES, DEFAULT_CAPACITIES, DEFAULT_LABOR_RATES } from './constants';
import { calculateSchedule } from './services/scheduler';
import TaskCard from './components/TaskCard';

interface WeekGroup {
  weekId: string;
  weekNumber: number;
  days: DaySchedule[];
  totalHours: number;
}

const App: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>(INITIAL_MILESTONES);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Sidebar starts closed
  const [activeView, setActiveView] = useState<'timeline' | 'budget'>('timeline');
  const [laborRates, setLaborRates] = useState<Record<Assignee, number>>(DEFAULT_LABOR_RATES);
  const [actualCosts, setActualCosts] = useState<BudgetActuals>({
    labor: 0,
    material: 0,
    rental: 0,
  });
  const [config, setConfig] = useState<ProjectConfig>({
    startDate: new Date(),
    dayCapacities: DEFAULT_CAPACITIES,
  });

  const schedule = useMemo(() => {
    return calculateSchedule(milestones, config);
  }, [milestones, config]);

  // Grouping schedule by ISO week
  const groupedSchedule = useMemo(() => {
    const groups: WeekGroup[] = [];
    schedule.forEach(day => {
      const weekNum = getISOWeek(day.date);
      const year = getYear(day.date);
      const weekId = `${year}-W${weekNum}`;
      
      let group = groups.find(g => g.weekId === weekId);
      if (!group) {
        group = { weekId, weekNumber: weekNum, days: [], totalHours: 0 };
        groups.push(group);
      }
      
      group.days.push(day);
      group.totalHours += day.parts.reduce((sum, p) => sum + p.hoursSpent, 0);
    });
    return groups;
  }, [schedule]);

  const toggleWeek = (weekId: string) => {
    setCollapsedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekId)) next.delete(weekId);
      else next.add(weekId);
      return next;
    });
  };

  const handleUpdateEstimate = useCallback((taskId: string, newHours: number) => {
    setMilestones(prev => 
      prev.map(m => ({
        ...m,
        tasks: m.tasks.map(t => 
          t.id === taskId ? { ...t, estimateHours: Math.max(0, newHours) } : t
        )
      }))
    );
  }, []);

  const handleUpdateCapacity = (day: number, hours: number) => {
    setConfig(prev => ({
      ...prev,
      dayCapacities: {
        ...prev.dayCapacities,
        [day]: Math.max(0, Math.min(24, hours))
      }
    }));
  };

  const getTaskEstimate = (taskId: string) => {
    for (const m of milestones) {
      const t = m.tasks.find(tk => tk.id === taskId);
      if (t) return t.estimateHours;
    }
    return 0;
  };

  const budgetBreakdown = useMemo(() => {
    const laborByAssignee: Record<Assignee, number> = {
      'Meg selv': 0,
      'Snekker': 0,
      'Rørlegger': 0,
      'Elektriker': 0,
      'Maler': 0,
    };
    let materialEstimate = 0;
    let rentalEstimate = 0;
    let excludedEquipmentEstimate = 0;

    milestones.forEach((milestone) => {
      milestone.tasks.forEach((task) => {
        laborByAssignee[task.assignee] += task.estimateHours * (laborRates[task.assignee] ?? 0);

        (task.equipment ?? []).forEach((item) => {
          const lineTotal = item.unitPrice * item.quantity;
          if (item.category === 'rental') {
            rentalEstimate += lineTotal;
          } else if (item.category === 'equipment') {
            excludedEquipmentEstimate += lineTotal;
          } else {
            materialEstimate += lineTotal;
          }
        });
      });
    });

    const laborEstimate = laborByAssignee['Snekker'] + laborByAssignee['Rørlegger'] + laborByAssignee['Elektriker'] + laborByAssignee['Maler'];
    const totalEstimate = laborEstimate + materialEstimate + rentalEstimate;

    return {
      laborByAssignee,
      laborEstimate,
      materialEstimate,
      rentalEstimate,
      excludedEquipmentEstimate,
      totalEstimate,
    };
  }, [milestones, laborRates]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* LEFT SIDEBAR: Functionality & Logic Controls */}
      <aside className={`fixed top-0 right-0 w-full md:w-80 bg-white border-l border-slate-200 h-screen z-40 transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out flex flex-col`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Hammer size={20} />
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Prosjekt-Motor Innstillinger</h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg"
            aria-label="Lukk innstillinger"
          >
            <ChevronRight />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SettingsView 
            config={config}
            onUpdateStartDate={(date) => setConfig(prev => ({ ...prev, startDate: date }))}
            onUpdateCapacity={handleUpdateCapacity}
            scheduleLength={schedule.length}
            lastScheduleDate={schedule.length > 0 ? schedule[schedule.length - 1].date : null}
          />
        </div>
      </aside>

      {/* MAIN CANVAS: Timeline Visualization */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
              <ChevronRight size={14} className="text-slate-300" />
              <span className="text-slate-900 font-bold">Hovedprosjekt: Bad 2024</span>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1">
              <button
                onClick={() => setActiveView('timeline')}
                className={`px-2.5 py-1 text-xs rounded ${activeView === 'timeline' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Tidsplan
              </button>
              <button
                onClick={() => setActiveView('budget')}
                className={`px-2.5 py-1 text-xs rounded inline-flex items-center gap-1 ${activeView === 'budget' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Calculator size={12} />
                Budsjett
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button
               onClick={() => setIsSidebarOpen(true)}
               className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
               aria-label="Åpne innstillinger"
             >
               <Settings2 size={20} />
             </button>
             <div className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold border border-slate-200">
               Live Oppdatering: PÅ
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4">
            {activeView === 'timeline' && (
            <div className="max-w-6xl mx-auto">
              {/* The Actual Timeline with Week Groups */}
              <div className="space-y-5">
                {groupedSchedule.map((group) => {
                  const isCollapsed = collapsedWeeks.has(group.weekId);

                  return (
                    <section key={group.weekId} className="relative">
                      {/* Week Header / Toggle */}
                      <div 
                        onClick={() => toggleWeek(group.weekId)}
                        className="sticky top-0 z-10 flex items-center justify-between bg-slate-100/95 py-2 mb-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="px-3 py-1 bg-white border border-slate-200 rounded-md flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Uke</span>
                            <span className="text-sm font-semibold text-slate-700 leading-none">{group.weekNumber}</span>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                              {format(group.days[0].date, 'MMM yyyy', { locale: nb })}
                            </p>
                            {isCollapsed && (
                              <p className="text-[11px] font-medium text-slate-500">
                                {group.days.length} dager • {group.totalHours}t arbeid
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isCollapsed && (
                             <span className="hidden md:inline text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                               {group.totalHours}t planlagt
                             </span>
                          )}
                          <div className={`p-1 rounded-full bg-slate-200 text-slate-500 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}>
                            <ChevronDown size={16} />
                          </div>
                        </div>
                      </div>

                      {/* Day List */}
                      {!isCollapsed && (
                        <div className="relative border-l border-slate-300 ml-4 sm:ml-5 pl-4 sm:pl-5 space-y-4 pb-1">
                          {group.days.map((day, idx) => {
                            const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                            const isToday = format(day.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                            
                            return (
                              <div key={idx} className="relative">
                                {/* Timeline Node */}
                                <div className={`absolute -left-[21px] top-1 w-4 h-4 rounded-full border border-white flex items-center justify-center ${
                                  isWeekend ? 'bg-slate-300 text-slate-500' : 'bg-slate-600 text-white'
                                } ${isToday ? 'ring-2 ring-slate-300' : ''}`}>
                                  <Clock size={8} />
                                </div>

                                {/* Day Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                                  <div>
                                    <h4 className={`text-sm font-semibold capitalize ${isWeekend ? 'text-slate-500' : 'text-slate-900'}`}>
                                      {format(day.date, 'EEEE d. MMMM', { locale: nb })}
                                      {isToday && <span className="ml-2 text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded uppercase tracking-wide">I dag</span>}
                                    </h4>
                                  </div>

                                  <div className="mt-1 sm:mt-0 flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-slate-200">
                                     <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-slate-600 transition-all duration-500" 
                                          style={{ width: `${((day.totalCapacity - day.remainingCapacity) / day.totalCapacity) * 100}%` }}
                                        />
                                     </div>
                                     <span className="text-[10px] text-slate-500 font-semibold uppercase whitespace-nowrap">
                                       {day.totalCapacity - day.remainingCapacity} / {day.totalCapacity}t brukt
                                     </span>
                                  </div>
                                </div>

                                {/* Tasks for the Day */}
                                <div className="grid grid-cols-1 gap-2">
                                  {day.parts.map((part) => (
                                    <TaskCard 
                                      key={`${part.taskId}-${part.partIndex}`} 
                                      part={part} 
                                      onEstimateChange={handleUpdateEstimate}
                                      currentEstimate={getTaskEstimate(part.taskId)}
                                    />
                                  ))}
                                  {day.parts.length === 0 && (
                                    <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-md flex items-center justify-center">
                                      <p className="text-xs italic text-slate-400">Ingen oppgaver planlagt</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Collapsed Placeholder Spacer */}
                      {isCollapsed && <div className="h-2" />}
                  </section>
                );
              })}

              <div className="pt-1">
                <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white text-slate-700 rounded-md font-medium text-sm border border-slate-300 hover:bg-slate-50 transition-colors">
                  <Plus size={16} /> Legg til Milepæl
                </button>
              </div>

              {/* Empty state */}
              {groupedSchedule.length === 0 && (
                <div className="text-center py-10 bg-white rounded-md border border-dashed border-slate-200">
                  <p className="text-sm text-slate-400">Velg en startdato eller juster kapasitet for å se tidslinjen</p>
                </div>
              )}
              </div>
            </div>
            )}
            {activeView === 'budget' && (
              <BudgetView
                laborRates={laborRates}
                onLaborRateChange={(assignee, value) =>
                  setLaborRates((prev) => ({ ...prev, [assignee]: Math.max(0, value) }))
                }
                actuals={actualCosts}
                onActualChange={(key, value) =>
                  setActualCosts((prev) => ({ ...prev, [key]: Math.max(0, value) }))
                }
                breakdown={budgetBreakdown}
              />
            )}
          </div>
      </main>

      {/* Floating chain reaction hint */}
      <div className="fixed bottom-6 right-6 z-50 pointer-events-none hidden md:block">
        <div className="bg-slate-800/90 text-white px-3 py-2 rounded-md shadow-lg flex items-center gap-2 border border-white/10">
          <div className="w-2 h-2 rounded-full bg-slate-300" />
          <span className="text-xs font-semibold">Motor: Kjedereaksjon aktiv</span>
        </div>
      </div>
    </div>
  );
};

export default App;
