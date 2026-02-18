
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { format, getISOWeek, getYear } from 'date-fns';
import { nb } from 'date-fns/locale';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Hammer, 
  Settings2, 
  LayoutDashboard, 
  Calculator,
  Clock, 
  ChevronRight,
  Plus,
  ChevronDown,
  CalendarDays,
  GripVertical
} from 'lucide-react';
import SettingsView from './components/SettingsView';
import BudgetView from './components/BudgetView';
import { Assignee, BudgetActuals, Milestone, ProjectConfig, DaySchedule, Task } from './types';
import { INITIAL_MILESTONES, DEFAULT_CAPACITIES, DEFAULT_LABOR_RATES } from './constants';
import { calculateSchedule } from './services/scheduler';
import { detectConflicts } from './services/conflictDetector';
import TaskCard from './components/TaskCard';
import TaskDetailView from './components/TaskDetailView';

const LOCAL_STORAGE_KEY = 'home-project-planner:v1';

interface PersistedAppState {
  milestones: Milestone[];
  config: ProjectConfig;
  laborRates: Record<string, number>;
  actualCosts: BudgetActuals;
}

const parseDateOrUndefined = (value: unknown): Date | undefined => {
  if (!value || typeof value !== 'string') return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const parseDateOrDefault = (value: unknown, fallback: Date): Date => {
  const parsed = parseDateOrUndefined(value);
  return parsed ?? fallback;
};

const normalizeMilestonesFromStorage = (value: unknown): Milestone[] => {
  if (!Array.isArray(value)) return INITIAL_MILESTONES;
  return value.map((milestone): Milestone => {
    const safeMilestone = (milestone ?? {}) as Milestone;
    return {
      ...safeMilestone,
      startDate: parseDateOrUndefined((safeMilestone as { startDate?: unknown }).startDate),
      tasks: Array.isArray(safeMilestone.tasks)
        ? safeMilestone.tasks.map((task) => ({
            ...task,
            hardStartDate: parseDateOrUndefined((task as { hardStartDate?: unknown }).hardStartDate),
          }))
        : [],
    };
  });
};

interface WeekGroup {
  weekId: string;
  weekNumber: number;
  days: DaySchedule[];
  totalHours: number;
}

const MILESTONE_THEME_RING = [
  'border-l-sky-400',
  'border-l-emerald-400',
  'border-l-violet-400',
  'border-l-amber-400',
  'border-l-rose-400',
];

const MILESTONE_THEME_BADGE = [
  'bg-sky-50 text-sky-700 border-sky-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-rose-50 text-rose-700 border-rose-200',
];

interface SortableTaskRowProps {
  id: string;
  name: string;
  assignee: Assignee;
  estimateHours: number;
}

const SortableTaskRow: React.FC<SortableTaskRowProps> = ({ id, name, assignee, estimateHours }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded border border-slate-200 bg-white px-2.5 py-2"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">{name}</p>
        <p className="text-[11px] text-slate-500">
          {assignee} • {estimateHours}t
        </p>
      </div>
      <button
        type="button"
        className="ml-3 inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
        aria-label="Dra for aa endre rekkefolge"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>(INITIAL_MILESTONES);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());
  const [activeTaskForDetail, setActiveTaskForDetail] = useState<{ taskId: string; milestoneId: string } | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Sidebar starts closed
  const [activeView, setActiveView] = useState<'timeline' | 'budget'>('timeline');
  const [laborRates, setLaborRates] = useState<Record<Assignee, number>>(DEFAULT_LABOR_RATES);
  const [actualCosts, setActualCosts] = useState<BudgetActuals>({
    labor: 0,
    material: 0,
    rental: 0,
  });
  const [isStorageHydrated, setIsStorageHydrated] = useState(false);
  const [activeMilestoneForAdd, setActiveMilestoneForAdd] = useState<string | null>(null);
  const [activeMilestoneForDate, setActiveMilestoneForDate] = useState<string | null>(null);
  const [activeMilestoneForSort, setActiveMilestoneForSort] = useState<string | null>(null);
  const [draggedTimelineTask, setDraggedTimelineTask] = useState<{ taskId: string; milestoneId: string } | null>(null);
  const [timelineDropTarget, setTimelineDropTarget] = useState<{ taskId: string; position: 'before' | 'after' } | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskHours, setNewTaskHours] = useState(4);
  const [newTaskAssignee, setNewTaskAssignee] = useState<Assignee>('Meg selv');
  const [milestoneStartDateInput, setMilestoneStartDateInput] = useState('');
  const [config, setConfig] = useState<ProjectConfig>({
    startDate: new Date(),
    dayCapacities: DEFAULT_CAPACITIES,
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) {
        setIsStorageHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<PersistedAppState>;
      if (parsed.milestones) {
        setMilestones(normalizeMilestonesFromStorage(parsed.milestones));
      }
      if (parsed.config) {
        setConfig({
          startDate: parseDateOrDefault(parsed.config.startDate, new Date()),
          dayCapacities: parsed.config.dayCapacities ?? DEFAULT_CAPACITIES,
        });
      }
      if (parsed.laborRates) {
        setLaborRates((parsed.laborRates as Record<Assignee, number>) ?? DEFAULT_LABOR_RATES);
      }
      if (parsed.actualCosts) {
        setActualCosts(parsed.actualCosts);
      }
    } catch {
      // Ignore broken localStorage payload and continue with defaults.
    } finally {
      setIsStorageHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isStorageHydrated) return;
    const payload: PersistedAppState = {
      milestones,
      config,
      laborRates,
      actualCosts,
    };
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota/availability errors.
    }
  }, [milestones, config, laborRates, actualCosts, isStorageHydrated]);

  const assignees: Assignee[] = ['Meg selv', 'Snekker', 'Rørlegger', 'Elektriker', 'Maler'];
  const milestoneById = useMemo(
    () => new Map(milestones.map((milestone, index) => [milestone.id, { milestone, index }])),
    [milestones]
  );
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

  const toggleDay = (dayKey: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayKey)) next.delete(dayKey);
      else next.add(dayKey);
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

  const handleToggleTaskCompleted = useCallback((taskId: string, completed: boolean) => {
    setMilestones((prev) =>
      prev.map((milestone) => ({
        ...milestone,
        tasks: milestone.tasks.map((task) =>
          task.id === taskId ? { ...task, completed } : task
        ),
      }))
    );
  }, []);

  const handleUpdateTaskAssignee = useCallback((taskId: string, assignee: Assignee) => {
    setMilestones((prev) =>
      prev.map((milestone) => ({
        ...milestone,
        tasks: milestone.tasks.map((task) =>
          task.id === taskId ? { ...task, assignee } : task
        ),
      }))
    );
  }, []);

  const handleEditTask = useCallback((taskId: string) => {
    for (const milestone of milestones) {
      if (milestone.tasks.some(t => t.id === taskId)) {
        setActiveTaskForDetail({ taskId, milestoneId: milestone.id });
        return;
      }
    }
  }, [milestones]);

  const handleUpdateTask = useCallback((updatedTask: Task) => {
    setMilestones(prev =>
      prev.map(m => ({
        ...m,
        tasks: m.tasks.map(t => t.id === updatedTask.id ? updatedTask : t),
      }))
    );
    setActiveTaskForDetail(null);
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

  const handleResetStoredData = useCallback(() => {
    const firstConfirm = window.confirm(
      'Advarsel: Dette vil slette alle lagrede prosjektdata i nettleseren. Vil du fortsette?'
    );
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      'Siste sjekk: Er du helt sikker på at du vil nullstille alt? Dette kan ikke angres.'
    );
    if (!secondConfirm) return;

    setMilestones(INITIAL_MILESTONES);
    setConfig({
      startDate: new Date(),
      dayCapacities: DEFAULT_CAPACITIES,
    });
    setLaborRates(DEFAULT_LABOR_RATES);
    setActualCosts({
      labor: 0,
      material: 0,
      rental: 0,
    });
    try {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const openAddTaskDialog = (milestoneId: string) => {
    setActiveMilestoneForAdd(milestoneId);
    setNewTaskName('');
    setNewTaskHours(4);
    setNewTaskAssignee('Meg selv');
  };

  const openMilestoneDateDialog = (milestoneId: string) => {
    const selected = milestones.find((m) => m.id === milestoneId);
    const inputValue = selected?.startDate ? format(selected.startDate, 'yyyy-MM-dd') : '';
    setMilestoneStartDateInput(inputValue);
    setActiveMilestoneForDate(milestoneId);
  };

  const handleAddTask = () => {
    if (!activeMilestoneForAdd) return;
    const trimmedName = newTaskName.trim();
    if (!trimmedName) return;

    const task: Task = {
      id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedName,
      estimateHours: Math.max(1, newTaskHours),
      assignee: newTaskAssignee,
      equipment: [],
      completed: false,
    };

    setMilestones((prev) =>
      prev.map((milestone) =>
        milestone.id === activeMilestoneForAdd
          ? { ...milestone, tasks: [task, ...milestone.tasks] }
          : milestone
      )
    );
    setActiveMilestoneForAdd(null);
  };

  const handleSaveMilestoneStartDate = () => {
    if (!activeMilestoneForDate) return;
    const parsed = milestoneStartDateInput ? new Date(milestoneStartDateInput) : undefined;

    setMilestones((prev) =>
      prev.map((milestone) =>
        milestone.id === activeMilestoneForDate
          ? { ...milestone, startDate: parsed }
          : milestone
      )
    );
    setActiveMilestoneForDate(null);
  };

  const handleSortTaskDragEnd = (event: DragEndEvent) => {
    if (!activeMilestoneForSort) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setMilestones((prev) =>
      prev.map((milestone) => {
        if (milestone.id !== activeMilestoneForSort) return milestone;
        const oldIndex = milestone.tasks.findIndex((task) => task.id === active.id);
        const newIndex = milestone.tasks.findIndex((task) => task.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return milestone;
        return { ...milestone, tasks: arrayMove(milestone.tasks, oldIndex, newIndex) };
      })
    );
  };

  const handleTimelineTaskDragStart = (taskId: string, milestoneId: string) => {
    setDraggedTimelineTask({ taskId, milestoneId });
  };

  const handleTimelineTaskDrop = (targetTaskId: string, targetMilestoneId: string) => {
    if (!draggedTimelineTask) return;
    if (draggedTimelineTask.milestoneId !== targetMilestoneId) {
      setDraggedTimelineTask(null);
      setTimelineDropTarget(null);
      return;
    }
    if (draggedTimelineTask.taskId === targetTaskId) {
      setDraggedTimelineTask(null);
      setTimelineDropTarget(null);
      return;
    }

    setMilestones((prev) =>
      prev.map((milestone) => {
        if (milestone.id !== draggedTimelineTask.milestoneId) return milestone;
        const sourceIndex = milestone.tasks.findIndex((task) => task.id === draggedTimelineTask.taskId);
        const targetIndex = milestone.tasks.findIndex((task) => task.id === targetTaskId);
        if (sourceIndex < 0 || targetIndex < 0) return milestone;

        const next = [...milestone.tasks];
        const [movedTask] = next.splice(sourceIndex, 1);
        const dropPosition = timelineDropTarget?.position ?? 'before';
        let insertIndex = targetIndex + (dropPosition === 'after' ? 1 : 0);
        if (sourceIndex < targetIndex) {
          insertIndex -= 1;
        }
        next.splice(Math.max(0, Math.min(next.length, insertIndex)), 0, movedTask);
        return { ...milestone, tasks: next };
      })
    );

    setDraggedTimelineTask(null);
    setTimelineDropTarget(null);
  };

  const clearTimelineDragState = useCallback(() => {
    setDraggedTimelineTask(null);
    setTimelineDropTarget(null);
  }, []);

  useEffect(() => {
    if (!draggedTimelineTask) return;

    const handleGlobalDragStop = () => {
      setDraggedTimelineTask(null);
      setTimelineDropTarget(null);
    };

    window.addEventListener('dragend', handleGlobalDragStop);
    window.addEventListener('drop', handleGlobalDragStop);
    window.addEventListener('blur', handleGlobalDragStop);

    return () => {
      window.removeEventListener('dragend', handleGlobalDragStop);
      window.removeEventListener('drop', handleGlobalDragStop);
      window.removeEventListener('blur', handleGlobalDragStop);
    };
  }, [draggedTimelineTask]);

  const getTaskEstimate = (taskId: string) => {
    for (const m of milestones) {
      const t = m.tasks.find(tk => tk.id === taskId);
      if (t) return t.estimateHours;
    }
    return 0;
  };

  const getTaskCompleted = (taskId: string) => {
    for (const milestone of milestones) {
      const task = milestone.tasks.find((tk) => tk.id === taskId);
      if (task) return task.completed ?? false;
    }
    return false;
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

  // Per-task metadata: conflict, pinned status, first/last scheduled date.
  const taskMetaMap = useMemo(() => {
    const firstScheduledDate: Record<string, Date> = {};
    const lastScheduledDate: Record<string, Date> = {};

    schedule.forEach(day => {
      day.parts.forEach(p => {
        if (!firstScheduledDate[p.taskId]) firstScheduledDate[p.taskId] = day.date;
        lastScheduledDate[p.taskId] = day.date;
      });
    });

    // Conflict detection is handled by the pure detectConflicts() service so it
    // can be independently unit-tested. The result is merged with the rest of
    // the per-task metadata below.
    const conflictMap = detectConflicts(schedule, milestones, config);

    // --- Build the per-task metadata map ---
    const map: Record<string, {
      isConflicted: boolean;
      isTimedConflict: boolean;
      conflictingAppointmentTime?: string;
      isPinned: boolean;
      pinnedHasNoTime: boolean;
      isUnconfirmedPro: boolean;
      startTime?: string;
      scheduledDate?: Date;
    }> = {};

    milestones.forEach(m => m.tasks.forEach(task => {
      const isPinned = !!task.hardStartDate;
      const conflict = conflictMap[task.id] ?? { isConflicted: false, isTimedConflict: false };
      map[task.id] = {
        isPinned,
        isConflicted: conflict.isConflicted,
        isTimedConflict: conflict.isTimedConflict,
        conflictingAppointmentTime: conflict.conflictingAppointmentTime,
        pinnedHasNoTime: isPinned && !task.startTime,
        isUnconfirmedPro: !isPinned && task.assignee !== 'Meg selv',
        startTime: task.startTime,
        scheduledDate: firstScheduledDate[task.id],
      };
    }));

    return map;
  }, [schedule, milestones, config]);

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
            onResetStoredData={handleResetStoredData}
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
              <div className="space-y-4">
                {groupedSchedule.map((group) => {
                  const isCollapsed = collapsedWeeks.has(group.weekId);
                  const milestoneWeekSummary = (() => {
                    const summaryMap = new Map<string, { id: string; name: string; parts: number; hours: number; index: number; startDate?: Date }>();
                    group.days.forEach((day) => {
                      day.parts.forEach((part) => {
                        const existing = summaryMap.get(part.milestoneId);
                        if (existing) {
                          existing.parts += 1;
                          existing.hours += part.hoursSpent;
                        } else {
                          const milestoneMeta = milestoneById.get(part.milestoneId);
                          summaryMap.set(part.milestoneId, {
                            id: part.milestoneId,
                            name: part.milestoneName,
                            parts: 1,
                            hours: part.hoursSpent,
                            index: milestoneMeta?.index ?? 9999,
                            startDate: milestoneMeta?.milestone.startDate,
                          });
                        }
                      });
                    });
                    return Array.from(summaryMap.values()).sort((a, b) => a.index - b.index);
                  })();

                  return (
                    <section key={group.weekId} className="relative">
                      {/* Compact two-liner week header — line 1: week info, line 2: milestone badges */}
                      <div className="sticky top-0 z-10 mb-2 bg-slate-100/95 rounded-md border border-slate-200/60">
                        {/* Line 1: week number + month + summary + chevron */}
                        <div
                          onClick={() => toggleWeek(group.weekId)}
                          className="flex cursor-pointer items-center justify-between px-2.5 py-1.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="px-2.5 py-0.5 bg-white border border-slate-200 rounded flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Uke</span>
                              <span className="text-sm font-bold text-slate-700 leading-none">{group.weekNumber}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                {format(group.days[0].date, 'MMM yyyy', { locale: nb })}
                              </span>
                              <span className="text-[11px] text-slate-400">•</span>
                              <span className="text-[11px] font-medium text-slate-500">
                                {group.days.length} dager • {group.totalHours}t arbeid
                              </span>
                            </div>
                          </div>
                          <div className={`p-0.5 rounded-full bg-slate-200 text-slate-500 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}>
                            <ChevronDown size={14} />
                          </div>
                        </div>

                        {/* Line 2: milestone badges — always visible */}
                        {milestoneWeekSummary.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 border-t border-slate-200/70 px-2.5 py-1.5">
                            {milestoneWeekSummary.map((milestoneSummary) => {
                              const badgeClass =
                                MILESTONE_THEME_BADGE[milestoneSummary.index % MILESTONE_THEME_BADGE.length];
                              return (
                                <div
                                  key={milestoneSummary.id}
                                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5"
                                >
                                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}>
                                    {milestoneSummary.name}
                                  </span>
                                  <span className="text-[10px] font-medium text-slate-400">
                                    {milestoneSummary.parts} deler • {milestoneSummary.hours}t
                                  </span>
                                  {milestoneSummary.startDate && (
                                    <span className="text-[10px] text-slate-400">
                                      Start: {format(milestoneSummary.startDate, 'd. MMM', { locale: nb })}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setActiveMilestoneForSort(milestoneSummary.id); }}
                                    className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-slate-100"
                                    title="Endre oppgaverekkefolge i milepael"
                                  >
                                    <GripVertical size={9} />
                                    Rekkefolge
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); openMilestoneDateDialog(milestoneSummary.id); }}
                                    className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-slate-100"
                                    title="Sett startdato for milepael"
                                  >
                                    <CalendarDays size={9} />
                                    Dato
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); openAddTaskDialog(milestoneSummary.id); }}
                                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition-all hover:border-slate-800 hover:bg-slate-800 hover:text-white"
                                    title="Legg til oppgave i milepael"
                                    aria-label="Legg til oppgave i milepael"
                                    >
                                      <Plus size={10} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                      </div>{/* end sticky two-liner header */}

                      {/* Day List */}
                      {!isCollapsed && (
                        <div className="relative ml-4 space-y-3 border-l border-slate-300 pb-1 pl-4 sm:ml-5 sm:pl-5">
                          {group.days.map((day, idx) => {
                            const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                            const isToday = format(day.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                            const dayKey = format(day.date, 'yyyy-MM-dd');
                            const isDayExpanded = expandedDays.has(dayKey);
                            const dayEquipment = day.parts.flatMap(p =>
                              (p.equipment ?? []).map(eq => ({ ...eq, taskName: p.taskName }))
                            );

                            return (
                              <div key={idx} className="relative">
                                {/* Timeline Node */}
                                <div className={`absolute -left-[21px] top-1 w-4 h-4 rounded-full border border-white flex items-center justify-center ${
                                  isWeekend ? 'bg-slate-300 text-slate-500' : 'bg-slate-600 text-white'
                                } ${isToday ? 'ring-2 ring-slate-300' : ''}`}>
                                  <Clock size={8} />
                                </div>

                                {/* Day Header — klikkbart for å ekspandere utstyrspanel */}
                                <div
                                  className="mb-1.5 flex flex-col justify-between sm:flex-row sm:items-center cursor-pointer select-none"
                                  onClick={() => toggleDay(dayKey)}
                                >
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
                                    <ChevronDown
                                      size={13}
                                      className={`text-slate-400 transition-transform duration-200 ${isDayExpanded ? 'rotate-180' : ''}`}
                                    />
                                  </div>
                                </div>

                                {/* Tasks for the Day */}
                                <div className="grid grid-cols-1 gap-1.5">
                                  {day.parts.map((part) => {
                                    const milestoneMeta = milestoneById.get(part.milestoneId);
                                    const milestoneIndex = milestoneMeta?.index ?? 0;
                                    const ringClass =
                                      MILESTONE_THEME_RING[milestoneIndex % MILESTONE_THEME_RING.length];
                                    const isPrimaryTaskCard = part.partIndex === 1;
                                    const dropMarkerPosition =
                                      timelineDropTarget?.taskId === part.taskId
                                        ? timelineDropTarget.position
                                        : null;
                                    const canTimelineDrop =
                                      isPrimaryTaskCard &&
                                      !!draggedTimelineTask &&
                                      draggedTimelineTask.milestoneId === part.milestoneId &&
                                      draggedTimelineTask.taskId !== part.taskId;

                                    return (
                                      <React.Fragment key={`${part.taskId}-${part.partIndex}`}>
                                        <TaskCard 
                                          part={part} 
                                          onEstimateChange={handleUpdateEstimate}
                                          onEditTask={handleEditTask}
                                          onToggleCompleted={handleToggleTaskCompleted}
                                          onAssigneeChange={handleUpdateTaskAssignee}
                                          assigneeOptions={assignees}
                                          isCompleted={getTaskCompleted(part.taskId)}
                                          currentEstimate={getTaskEstimate(part.taskId)}
                                          milestoneRingClass={ringClass}
                                          draggableTask={isPrimaryTaskCard}
                                          dropMarkerPosition={dropMarkerPosition}
                                          isConflicted={taskMetaMap[part.taskId]?.isConflicted ?? false}
                                          isTimedConflict={taskMetaMap[part.taskId]?.isTimedConflict ?? false}
                                          conflictingAppointmentTime={taskMetaMap[part.taskId]?.conflictingAppointmentTime}
                                          isPinned={taskMetaMap[part.taskId]?.isPinned ?? false}
                                          startTime={taskMetaMap[part.taskId]?.startTime}
                                          isUnconfirmedPro={taskMetaMap[part.taskId]?.isUnconfirmedPro ?? false}
                                          onTaskDragStart={() => handleTimelineTaskDragStart(part.taskId, part.milestoneId)}
                                          onTaskDragEnd={clearTimelineDragState}
                                          onTaskDragOver={(event) => {
                                            if (!canTimelineDrop) return;
                                            event.preventDefault();
                                            const cardRect = event.currentTarget.getBoundingClientRect();
                                            const offsetY = event.clientY - cardRect.top;
                                            const position: 'before' | 'after' =
                                              offsetY < cardRect.height / 2 ? 'before' : 'after';
                                            if (
                                              timelineDropTarget?.taskId !== part.taskId ||
                                              timelineDropTarget.position !== position
                                            ) {
                                              setTimelineDropTarget({ taskId: part.taskId, position });
                                            }
                                          }}
                                          onTaskDrop={() => handleTimelineTaskDrop(part.taskId, part.milestoneId)}
                                        />
                                      </React.Fragment>
                                    );
                                  })}
                                  {day.parts.length === 0 && (
                                    <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-md flex items-center justify-center">
                                      <p className="text-xs italic text-slate-400">Ingen oppgaver planlagt</p>
                                    </div>
                                  )}
                                </div>

                                {/* Ekspandert utstyrspanel */}
                                {isDayExpanded && (
                                  <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                      Utstyr og materiell denne dagen
                                    </p>
                                    {dayEquipment.length === 0 ? (
                                      <p className="text-xs italic text-slate-400">Ingen utstyr registrert på oppgavene denne dagen.</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {day.parts
                                          .filter(p => (p.equipment ?? []).length > 0)
                                          .map(p => (
                                            <div key={p.taskId}>
                                              <p className="text-[11px] font-semibold text-slate-600 mb-1">{p.taskName}</p>
                                              <div className="space-y-0.5">
                                                {(p.equipment ?? []).map(eq => (
                                                  <div key={eq.id} className="flex items-center justify-between text-[11px] text-slate-500">
                                                    <span>• {eq.name}</span>
                                                    <span className="font-medium text-slate-600">{eq.quantity} {eq.unit}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ))
                                        }
                                      </div>
                                    )}
                                  </div>
                                )}
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

      {activeMilestoneForAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ny oppgave</p>
              <h3 className="text-sm font-semibold text-slate-900">
                {milestoneById.get(activeMilestoneForAdd)?.milestone.name}
              </h3>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Oppgavenavn</label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="Eks: Montere servant"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Estimat (timer)</label>
                  <input
                    type="number"
                    min="1"
                    value={newTaskHours}
                    onChange={(e) => setNewTaskHours(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Ansvarlig</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value as Assignee)}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    {assignees.map((assignee) => (
                      <option key={assignee} value={assignee}>
                        {assignee}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Ny oppgave legges inn forst i valgt milepael. Deretter kan du dra den til riktig plassering.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                type="button"
                onClick={() => setActiveMilestoneForAdd(null)}
                className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleAddTask}
                className="rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
              >
                Legg til
              </button>
            </div>
          </div>
        </div>
      )}

      {activeMilestoneForDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Milepælstart</p>
              <h3 className="text-sm font-semibold text-slate-900">
                {milestoneById.get(activeMilestoneForDate)?.milestone.name}
              </h3>
            </div>
            <div className="p-4">
              <label className="mb-1 block text-xs font-semibold text-slate-500">Startdato (valgfri)</label>
              <input
                type="date"
                value={milestoneStartDateInput}
                onChange={(e) => setMilestoneStartDateInput(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <p className="mt-2 text-[11px] text-slate-500">
                Hvis datoen settes tidligere enn mulig, bruker motoren første lovlige dato etter forrige milepæl.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                type="button"
                onClick={() => setActiveMilestoneForDate(null)}
                className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleSaveMilestoneStartDate}
                className="rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
              >
                Lagre
              </button>
            </div>
          </div>
        </div>
      )}

      {activeMilestoneForSort && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Drag and drop</p>
              <h3 className="text-sm font-semibold text-slate-900">
                Oppgaverekkefolge: {milestoneById.get(activeMilestoneForSort)?.milestone.name}
              </h3>
            </div>
            <div className="p-4">
              <p className="mb-2 text-xs text-slate-500">
                Dra i handtaket for aa endre rekkefolge. Tidsplanen oppdateres umiddelbart.
              </p>
              <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleSortTaskDragEnd}>
                <SortableContext
                  items={(milestoneById.get(activeMilestoneForSort)?.milestone.tasks ?? []).map((task) => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {(milestoneById.get(activeMilestoneForSort)?.milestone.tasks ?? []).map((task) => (
                      <SortableTaskRow
                        key={task.id}
                        id={task.id}
                        name={task.name}
                        assignee={task.assignee}
                        estimateHours={task.estimateHours}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                type="button"
                onClick={() => setActiveMilestoneForSort(null)}
                className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Oppgave-detaljmodal */}
      {activeTaskForDetail && (() => {
        const milestone = milestones.find(m => m.id === activeTaskForDetail.milestoneId);
        const task = milestone?.tasks.find(t => t.id === activeTaskForDetail.taskId);
        if (!task || !milestone) return null;
        return (
          <TaskDetailView
            task={task}
            milestoneName={milestone.name}
            assigneeOptions={assignees}
            scheduledDate={taskMetaMap[task.id]?.scheduledDate}
            isConflicted={taskMetaMap[task.id]?.isConflicted ?? false}
            isTimedConflict={taskMetaMap[task.id]?.isTimedConflict ?? false}
            conflictingAppointmentTime={taskMetaMap[task.id]?.conflictingAppointmentTime}
            pinnedHasNoTime={taskMetaMap[task.id]?.pinnedHasNoTime ?? false}
            onSave={handleUpdateTask}
            onClose={() => setActiveTaskForDetail(null)}
          />
        );
      })()}

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
