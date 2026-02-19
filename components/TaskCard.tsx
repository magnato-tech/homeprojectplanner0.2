
import React, { useState } from 'react';
import { Clock, GripVertical, Lock, LockOpen, AlertTriangle, CheckSquare } from 'lucide-react';
import { TaskPart, Assignee } from '../types';

interface TaskCardProps {
  part: TaskPart;
  onEstimateChange: (taskId: string, newHours: number) => void;
  onEditTask: (taskId: string) => void;
  onToggleCompleted: (taskId: string, completed: boolean) => void;
  onAssigneeChange: (taskId: string, assignee: Assignee) => void;
  assigneeOptions: Assignee[];
  isCompleted: boolean;
  currentEstimate: number;
  milestoneRingClass?: string;
  draggableTask?: boolean;
  dropMarkerPosition?: 'before' | 'after' | null;
  isConflicted?: boolean;
  isTimedConflict?: boolean;
  conflictingAppointmentTime?: string;
  isPinned?: boolean;
  startTime?: string;
  isUnconfirmedPro?: boolean;
  onTaskDragStart?: () => void;
  onTaskDragEnd?: () => void;
  onTaskDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onTaskDrop?: () => void;
}

const getAssigneeColors = (assignee: Assignee) => {
  switch (assignee) {
    case 'Meg selv':   return 'text-slate-700';
    case 'Snekker':    return 'text-blue-700';
    case 'Rørlegger':  return 'text-emerald-700';
    case 'Elektriker': return 'text-violet-700';
    case 'Maler':      return 'text-rose-700';
    default:           return 'text-slate-700';
  }
};

const TaskCard: React.FC<TaskCardProps> = ({
  part,
  onEstimateChange,
  onEditTask,
  onToggleCompleted,
  onAssigneeChange,
  assigneeOptions,
  isCompleted,
  currentEstimate,
  milestoneRingClass = 'border-l-slate-300',
  draggableTask = false,
  dropMarkerPosition = null,
  isConflicted = false,
  isTimedConflict = false,
  conflictingAppointmentTime,
  isPinned = false,
  startTime,
  isUnconfirmedPro = false,
  onTaskDragStart,
  onTaskDragEnd,
  onTaskDragOver,
  onTaskDrop,
}) => {
  const [showStatusHint, setShowStatusHint] = useState(false);
  const assigneeColor = getAssigneeColors(part.assignee);

  const borderClass = isConflicted
    ? 'border-l-amber-500'
    : isTimedConflict
    ? 'border-l-yellow-400'
    : milestoneRingClass;

  // Conflict message — used for AlertTriangle icon (timing/overflow conflicts only)
  const conflictMessage = isConflicted
    ? 'Oppgaven strekker seg forbi avtaledagen. Vurder å jobbe ekstra timer, få hjelp, eller flytte avtaledatoen.'
    : isTimedConflict
    ? `Avtalen starter kl. ${conflictingAppointmentTime} samme dag. Sjekk at oppgaven rekker å bli ferdig i tide.`
    : null;

  const conflictIconColor = isConflicted ? 'text-amber-500' : 'text-yellow-500';
  const hasConflictIcon = isConflicted || isTimedConflict;
  const hasUnconfirmedPro = !isPinned && isUnconfirmedPro;

  return (
    <div
      className={`relative rounded border border-slate-200 border-l-4 bg-white transition-colors duration-200 hover:border-slate-300 ${
        dropMarkerPosition ? 'ring-1 ring-slate-300' : ''
      } ${borderClass} ${isCompleted ? 'opacity-60' : ''}`}
      onDragOver={onTaskDragOver}
      onDrop={() => onTaskDrop?.()}
    >
      {/* Drop position markers */}
      {dropMarkerPosition === 'before' && (
        <>
          <div className="pointer-events-none absolute -top-[8px] left-2 right-2 h-1.5 rounded-full border border-indigo-100 bg-indigo-600 shadow-md shadow-indigo-500/40" />
          <div className="pointer-events-none absolute -top-[11px] left-1.5 h-3 w-3 rounded-full border-2 border-white bg-indigo-700 shadow-md shadow-indigo-500/40" />
        </>
      )}
      {dropMarkerPosition === 'after' && (
        <>
          <div className="pointer-events-none absolute -bottom-[8px] left-2 right-2 h-1.5 rounded-full border border-indigo-100 bg-indigo-600 shadow-md shadow-indigo-500/40" />
          <div className="pointer-events-none absolute -bottom-[11px] left-1.5 h-3 w-3 rounded-full border-2 border-white bg-indigo-700 shadow-md shadow-indigo-500/40" />
        </>
      )}

      {/* ── Primary row (both mobile and desktop) ── */}
      <div className="flex items-center gap-2 px-2 py-2">

        {/* Drag handle — hidden on mobile (HTML5 DnD unreliable on touch) */}
        {draggableTask && (
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', part.taskId);
              onTaskDragStart?.();
            }}
            onDragEnd={() => onTaskDragEnd?.()}
            className="hidden sm:inline-flex shrink-0 h-5 w-5 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-400 cursor-grab active:cursor-grabbing hover:bg-slate-100"
            aria-label="Dra for å endre rekkefølge"
          >
            <GripVertical size={12} />
          </div>
        )}

        {/* Checkbox — large touch target on mobile */}
        <label className="shrink-0 flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto -m-1 sm:m-0 cursor-pointer">
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={(e) => onToggleCompleted(part.taskId, e.target.checked)}
            className="h-4 w-4 sm:h-3.5 sm:w-3.5 rounded border-slate-300 accent-emerald-600 cursor-pointer"
          />
        </label>

        {/* Task name — tappable to open detail */}
        <button
          type="button"
          onClick={() => onEditTask(part.taskId)}
          className={`flex-1 min-w-0 text-left text-sm font-semibold leading-tight hover:underline ${
            isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'
          }`}
        >
          <span className="block truncate">
            {part.taskName}
            {/* Part badge inline on mobile */}
            {part.totalParts > 1 && (
              <span className="sm:hidden ml-1.5 text-[10px] font-normal text-slate-400">
                {part.partIndex}/{part.totalParts}
              </span>
            )}
          </span>
        </button>

        {/* Part badge — desktop only */}
        {part.totalParts > 1 && (
          <span className="hidden sm:inline-flex shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            {part.partIndex}/{part.totalParts}
          </span>
        )}

        {/* Assignee dropdown — desktop only */}
        <select
          value={part.assignee}
          onChange={(e) => onAssigneeChange(part.taskId, e.target.value as Assignee)}
          className={`hidden sm:block shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium ${assigneeColor} focus:outline-none focus:ring-1 focus:ring-slate-300`}
          title="Velg ansvarlig"
        >
          {assigneeOptions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* Hours today — desktop only */}
        {part.hoursSpent === 0 ? (
          <span className="hidden sm:flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-400 italic">
            <CheckSquare size={11} className="text-slate-400" />
            Gjøremål
          </span>
        ) : (
          <span className="hidden sm:flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-500">
            <Clock size={11} className="opacity-50" />
            {part.hoursSpent}t
          </span>
        )}

        {/* Estimate input — desktop only, first part */}
        {part.partIndex === 1 && (
          <div className="hidden sm:flex shrink-0 items-center gap-1">
            <input
              type="number"
              min="0"
              value={currentEstimate}
              onChange={(e) => onEstimateChange(part.taskId, parseInt(e.target.value) || 0)}
              className="w-12 px-1.5 py-0.5 text-[11px] font-semibold bg-white border border-slate-300 rounded focus:ring-1 focus:ring-slate-300 focus:outline-none text-center"
              title="Totalt estimat (timer) — 0 = gjøremål"
            />
            <span className="text-[11px] text-slate-400">t tot</span>
          </div>
        )}

        {/* Pinned indicator — red closed lock = hard appointment, won't move */}
        {isPinned && (
          <span
            className="shrink-0 flex items-center gap-0.5 cursor-help"
            title="Fast avtale — flyttes ikke automatisk av systemet."
          >
            <Lock size={12} className="text-red-500" />
            {startTime && (
              <span className="text-[11px] font-semibold text-red-500">{startTime}</span>
            )}
          </span>
        )}

        {/* Unconfirmed pro — green open lock */}
        {hasUnconfirmedPro && (
          <button
            type="button"
            className="shrink-0"
            title="Åpen fagpersonavtale — dato ikke bekreftet, kan flyttes automatisk. Åpne oppgaven og sett fast dato for å låse den."
            aria-label="Åpen fagpersonavtale"
            onClick={() => setShowStatusHint(p => !p)}
          >
            <LockOpen size={13} className="text-emerald-500" />
          </button>
        )}

        {/* Conflict icon — triangle for timing/overflow conflicts */}
        {hasConflictIcon && (
          <button
            type="button"
            className="shrink-0"
            title={conflictMessage ?? undefined}
            aria-label="Vis konfliktvarsel"
            onClick={() => setShowStatusHint(p => !p)}
          >
            <AlertTriangle size={13} className={conflictIconColor} />
          </button>
        )}
      </div>

      {/* ── Secondary row — mobile only ── */}
      <div className="flex sm:hidden items-center gap-2 px-2 pb-2 -mt-1">
        {/* Spacer to align with checkbox column */}
        <div className="w-7 shrink-0" />

        <select
          value={part.assignee}
          onChange={(e) => onAssigneeChange(part.taskId, e.target.value as Assignee)}
          className={`shrink-0 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium ${assigneeColor} focus:outline-none focus:ring-1 focus:ring-slate-300`}
        >
          {assigneeOptions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {part.hoursSpent === 0 ? (
          <span className="flex items-center gap-0.5 text-[11px] text-slate-400 italic">
            <CheckSquare size={10} />
            Gjøremål
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
            <Clock size={10} className="opacity-60" />
            {part.hoursSpent}t i dag
          </span>
        )}

        {part.partIndex === 1 && (
          <div className="flex items-center gap-1 ml-auto">
            <input
              type="number"
              min="0"
              value={currentEstimate}
              onChange={(e) => onEstimateChange(part.taskId, parseInt(e.target.value) || 0)}
              className="w-14 px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded focus:ring-1 focus:ring-slate-300 focus:outline-none text-center"
            />
            <span className="text-[11px] text-slate-400">t tot</span>
          </div>
        )}
      </div>

      {/* ── Status hint — mobile tap-to-reveal ── */}
      {showStatusHint && (conflictMessage || hasUnconfirmedPro) && (
        <div className="sm:hidden px-2 pb-2">
          <p className={`text-[11px] rounded px-2 py-1.5 border ${
            isConflicted
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : isTimedConflict
              ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            {conflictMessage ?? 'Åpen fagpersonavtale — dato ikke bekreftet, kan flyttes automatisk. Åpne oppgaven og sett fast dato for å låse den.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
