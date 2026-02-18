
import React from 'react';
import { Clock, GripVertical } from 'lucide-react';
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
  onTaskDragStart?: () => void;
  onTaskDragEnd?: () => void;
  onTaskDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onTaskDrop?: () => void;
}

const getAssigneeColors = (assignee: Assignee) => {
  switch (assignee) {
    case 'Meg selv':  return 'text-slate-700';
    case 'Snekker':   return 'text-blue-700';
    case 'Rørlegger': return 'text-emerald-700';
    case 'Elektriker':return 'text-violet-700';
    case 'Maler':     return 'text-rose-700';
    default:          return 'text-slate-700';
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
  onTaskDragStart,
  onTaskDragEnd,
  onTaskDragOver,
  onTaskDrop,
}) => {
  const assigneeColor = getAssigneeColors(part.assignee);

  return (
    <div
      className={`relative flex items-center gap-2 rounded border border-slate-200 border-l-4 bg-white px-2 py-1.5 transition-colors duration-200 hover:border-slate-300 ${
        dropMarkerPosition ? 'ring-1 ring-slate-300' : ''
      } ${milestoneRingClass} ${isCompleted ? 'opacity-60' : ''}`}
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

      {/* Drag handle */}
      {draggableTask && (
        <div
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', part.taskId);
            onTaskDragStart?.();
          }}
          onDragEnd={() => onTaskDragEnd?.()}
          className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-400 cursor-grab active:cursor-grabbing hover:bg-slate-100"
          title="Dra for å endre rekkefølge"
          aria-label="Dra for å endre rekkefølge"
        >
          <GripVertical size={12} />
        </div>
      )}

      {/* Ferdig-avkryssing */}
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={(e) => onToggleCompleted(part.taskId, e.target.checked)}
        className="shrink-0 h-3.5 w-3.5 rounded border-slate-300 accent-emerald-600"
        title="Ferdig"
      />

      {/* Oppgavenavn — tar all ledig plass, klikkbart for å åpne detaljvisning */}
      <span
        className={`flex-1 min-w-0 truncate text-sm font-semibold leading-tight cursor-pointer hover:underline hover:text-slate-600 ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}
        onClick={() => onEditTask(part.taskId)}
        title="Åpne oppgavedetaljer"
      >
        {part.taskName}
      </span>

      {/* Del X av Y — vises kun ved flerdelte oppgaver */}
      {part.totalParts > 1 && (
        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
          {part.partIndex}/{part.totalParts}
        </span>
      )}

      {/* Ansvarlig-dropdown */}
      <select
        value={part.assignee}
        onChange={(e) => onAssigneeChange(part.taskId, e.target.value as Assignee)}
        className={`shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium ${assigneeColor} focus:outline-none focus:ring-1 focus:ring-slate-300`}
        title="Velg ansvarlig"
      >
        {assigneeOptions.map((assignee) => (
          <option key={assignee} value={assignee}>{assignee}</option>
        ))}
      </select>

      {/* Timer brukt i dag */}
      <span className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-slate-500">
        <Clock size={11} className="opacity-50" />
        {part.hoursSpent}t
      </span>

      {/* Totalt estimat — kun på første del av oppgaven */}
      {part.partIndex === 1 && (
        <div className="shrink-0 flex items-center gap-1">
          <input
            type="number"
            min="1"
            value={currentEstimate}
            onChange={(e) => onEstimateChange(part.taskId, parseInt(e.target.value) || 0)}
            className="w-12 px-1.5 py-0.5 text-[11px] font-semibold bg-white border border-slate-300 rounded focus:ring-1 focus:ring-slate-300 focus:outline-none text-center"
            title="Totalt estimat (timer)"
          />
          <span className="text-[11px] text-slate-400">t tot</span>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
