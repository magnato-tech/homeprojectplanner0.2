
import { startOfDay } from 'date-fns';
import { DaySchedule, Milestone, ProjectConfig, Task } from '../types';

export interface ConflictInfo {
  isConflicted: boolean;       // amber — hours overflow or date overflow past appointment
  isTimedConflict: boolean;    // yellow — non-pinned work exceeds hours before a timed appointment
  conflictingAppointmentTime?: string; // HH:MM of the conflicting pinned appointment
}

export type ConflictMap = Record<string, ConflictInfo>;

// Work-day assumed to start at 08:00 for timed-conflict calculations.
const WORK_START_HOUR = 8;

const parseTimeHours = (s: string): number => {
  const [h, m] = s.split(':').map(Number);
  return h + (m ?? 0) / 60;
};

/**
 * Determines which non-pinned tasks are in conflict with pinned appointments.
 *
 * Two kinds of conflict are detected:
 *
 * HOURS-BASED (primary):
 *   For each schedule day that contains both pinned and non-pinned tasks:
 *   - If the pinned task has a startTime:
 *       availableHours = startTime − WORK_START_HOUR
 *       nonPinnedHours > availableHours  →  isTimedConflict  (yellow)
 *   - Without startTime:
 *       availableHours = baseCapacity − pinnedHours
 *       nonPinnedHours > availableHours  →  isConflicted     (amber)
 *
 * DATE-OVERFLOW (fallback):
 *   A non-pinned task whose last scheduled day is strictly AFTER a downstream
 *   pinned task's hard date (within the same milestone) → isConflicted.
 *
 * Pinned tasks are never themselves marked as conflicted.
 * isConflicted takes precedence over isTimedConflict.
 */
export function detectConflicts(
  schedule: DaySchedule[],
  milestones: Milestone[],
  config: ProjectConfig,
): ConflictMap {
  // --- Build first/last scheduled date per task (needed for date-overflow check) ---
  const lastScheduledDate: Record<string, Date> = {};
  schedule.forEach(day => {
    day.parts.forEach(p => {
      lastScheduledDate[p.taskId] = day.date;
    });
  });

  // --- Build pinned-task info lookup (across all milestones) ---
  const pinnedTaskInfo = new Map<string, { startTime?: string }>();
  milestones.forEach(m => m.tasks.forEach(t => {
    if (t.hardStartDate) pinnedTaskInfo.set(t.id, { startTime: t.startTime });
  }));

  // --- Hours-based conflict detection (per schedule day) ---
  const conflictedIds    = new Set<string>();
  const timedConflictIds = new Set<string>();
  const conflictTimes    = new Map<string, string>(); // taskId → HH:MM

  schedule.forEach(day => {
    const baseCapacity = config.dayCapacities[day.date.getDay()] ?? 0;
    // For pinned tasks on non-working days (e.g. Saturday appointment) the base
    // capacity is 0, but other tasks can't be scheduled there anyway — skip.
    if (baseCapacity === 0) return;

    let pinnedHours = 0;
    let nonPinnedHours = 0;
    let earliestPinnedTime: string | undefined;
    const nonPinnedIds: string[] = [];

    day.parts.forEach(p => {
      const info = pinnedTaskInfo.get(p.taskId);
      if (info !== undefined) {
        pinnedHours += p.hoursSpent;
        if (info.startTime && (!earliestPinnedTime || info.startTime < earliestPinnedTime)) {
          earliestPinnedTime = info.startTime;
        }
      } else {
        nonPinnedHours += p.hoursSpent;
        nonPinnedIds.push(p.taskId);
      }
    });

    if (pinnedHours === 0 || nonPinnedIds.length === 0) return;

    // Hours available for non-pinned work before the appointment.
    const availableHours = earliestPinnedTime
      ? Math.max(0, parseTimeHours(earliestPinnedTime) - WORK_START_HOUR)
      : baseCapacity - pinnedHours;

    if (nonPinnedHours > availableHours) {
      nonPinnedIds.forEach(id => {
        if (earliestPinnedTime) {
          timedConflictIds.add(id);
          if (!conflictTimes.has(id)) conflictTimes.set(id, earliestPinnedTime);
        } else {
          conflictedIds.add(id);
        }
      });
    }
  });

  // --- Date-overflow fallback ---
  const isDateOverflow = (task: Task, milestoneId: string): boolean => {
    if (task.hardStartDate) return false;
    const lastDate = lastScheduledDate[task.id];
    if (!lastDate) return false;
    for (const m of milestones) {
      if (m.id !== milestoneId) continue;
      let found = false;
      for (const t of m.tasks) {
        if (t.id === task.id) { found = true; continue; }
        if (found && t.hardStartDate) {
          const wall = startOfDay(t.hardStartDate);
          if (lastDate.getTime() > wall.getTime()) return true;
        }
      }
    }
    return false;
  };

  // --- Build and return the conflict map ---
  const map: ConflictMap = {};
  milestones.forEach(m => m.tasks.forEach(task => {
    if (task.hardStartDate) {
      // Pinned tasks are never conflicted.
      map[task.id] = { isConflicted: false, isTimedConflict: false };
      return;
    }
    const isConflicted = conflictedIds.has(task.id) || isDateOverflow(task, m.id);
    const isTimedConflict = !isConflicted && timedConflictIds.has(task.id);
    map[task.id] = {
      isConflicted,
      isTimedConflict,
      conflictingAppointmentTime: conflictTimes.get(task.id),
    };
  }));

  return map;
}
