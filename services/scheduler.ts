
import { addDays, isBefore, isSameDay, startOfDay } from 'date-fns';
import { Milestone, DaySchedule, ProjectConfig, TaskPart } from '../types';

/**
 * Calculates a sequential schedule based on daily capacities and task estimates.
 * Tasks are split across days if they exceed daily capacity.
 * New milestones start at the earliest on the day after the previous milestone finishes.
 *
 * Hard-date (pinned) tasks jump to their hardStartDate; they can land on non-working
 * days (e.g. a Saturday appointment). Upstream tasks are NOT truncated — the user
 * decides how to handle any overlap. Conflict warnings are computed in App.tsx.
 */
export const calculateSchedule = (
  milestones: Milestone[],
  config: ProjectConfig
): DaySchedule[] => {
  const schedule: DaySchedule[] = [];
  let currentDate = startOfDay(config.startDate);
  let previousMilestoneEndDate: Date | null = null;

  // Find or create a day entry. pinnedCapacity overrides the weekday default
  // so that pinned tasks can land on non-working days.
  const getOrCreateDay = (date: Date, pinnedCapacity?: number): DaySchedule => {
    let day = schedule.find((d) => isSameDay(d.date, date));
    if (!day) {
      const cap = pinnedCapacity ?? (config.dayCapacities[date.getDay()] ?? 0);
      day = {
        date: new Date(date),
        parts: [],
        remainingCapacity: cap,
        totalCapacity: cap,
      };
      schedule.push(day);
    }
    return day;
  };

  // Skip non-working days (capacity 0).
  const moveToNextWorkingDay = (date: Date): Date => {
    let next = date;
    while (config.dayCapacities[next.getDay()] === 0) {
      next = addDays(next, 1);
    }
    return next;
  };

  for (const milestone of milestones) {
    const milestoneMinStart = previousMilestoneEndDate
      ? addDays(startOfDay(previousMilestoneEndDate), 1)
      : startOfDay(config.startDate);
    const milestoneRequestedStart = milestone.startDate
      ? startOfDay(milestone.startDate)
      : milestoneMinStart;
    const rawMilestoneStart =
      milestoneRequestedStart.getTime() > milestoneMinStart.getTime()
        ? milestoneRequestedStart
        : milestoneMinStart;

    currentDate = moveToNextWorkingDay(rawMilestoneStart);
    let milestoneLastScheduledDate: Date | null = null;

    for (let taskIndex = 0; taskIndex < milestone.tasks.length; taskIndex++) {
      const task = milestone.tasks[taskIndex];
      let remainingTaskHours = task.estimateHours;
      let partIndex = 1;
      const taskPartsRefs: TaskPart[] = [];

      // --- GJØREMÅL: 0-timersoppgave — plasser som markør, ingen kapasitetsbruk ---
      if (task.estimateHours === 0) {
        const targetDate = task.hardStartDate ? startOfDay(task.hardStartDate) : new Date(currentDate);
        let markerDay = schedule.find(d => isSameDay(d.date, targetDate));
        if (!markerDay) {
          const cap = config.dayCapacities[targetDate.getDay()] ?? 0;
          markerDay = { date: new Date(targetDate), parts: [], remainingCapacity: cap, totalCapacity: cap };
          schedule.push(markerDay);
        }
        markerDay.parts.push({
          taskId: task.id,
          taskName: task.name,
          assignee: task.assignee,
          equipment: task.equipment,
          hoursSpent: 0,
          partIndex: 1,
          totalParts: 1,
          milestoneName: milestone.name,
          milestoneId: milestone.id,
        });
        continue;
      }

      // --- PINNED TASK: jump directly to hardStartDate ---
      if (task.hardStartDate) {
        const pinned = startOfDay(task.hardStartDate);

        // Always jump to the hard date — even if upstream tasks have overflowed
        // past it. The appointment is fixed regardless of what came before.
        currentDate = pinned;

        // Schedule on the pinned date. If that day already exists in the schedule
        // (filled by upstream tasks), boost its capacity so the pinned task fits.
        // This reflects reality: the electrician arrives regardless of capacity.
        while (remainingTaskHours > 0) {
          let day = schedule.find(d => isSameDay(d.date, currentDate));
          if (!day) {
            const baseCap = config.dayCapacities[currentDate.getDay()] ?? 0;
            const cap = Math.max(baseCap, remainingTaskHours);
            day = { date: new Date(currentDate), parts: [], remainingCapacity: cap, totalCapacity: cap };
            schedule.push(day);
          } else if (day.remainingCapacity < remainingTaskHours) {
            // Boost: pinned task overrides capacity on its date.
            const extra = remainingTaskHours - day.remainingCapacity;
            day.remainingCapacity += extra;
            day.totalCapacity += extra;
          }

          const hoursToday = Math.min(remainingTaskHours, day.remainingCapacity);
          if (hoursToday <= 0) {
            currentDate = addDays(currentDate, 1);
            continue;
          }

          const part: TaskPart = {
            taskId: task.id,
            taskName: task.name,
            assignee: task.assignee,
            equipment: task.equipment ?? [],
            hoursSpent: hoursToday,
            partIndex,
            totalParts: 0,
            milestoneId: milestone.id,
            milestoneName: milestone.name,
          };

          day.parts.push(part);
          taskPartsRefs.push(part);
          milestoneLastScheduledDate = day.date;
          day.remainingCapacity -= hoursToday;
          remainingTaskHours -= hoursToday;
          partIndex++;

          if (remainingTaskHours > 0) {
            currentDate = moveToNextWorkingDay(addDays(currentDate, 1));
          }
        }

        const total = taskPartsRefs.length;
        taskPartsRefs.forEach(p => (p.totalParts = total));
        continue;
      }

      // --- NORMAL TASK: schedule sequentially, no wall enforcement ---
      // Upstream tasks are never truncated. If they overlap with a downstream
      // pinned task's date the conflict is surfaced visually in App.tsx.
      while (remainingTaskHours > 0) {
        currentDate = moveToNextWorkingDay(currentDate);

        let day = getOrCreateDay(currentDate);

        if (day.remainingCapacity <= 0) {
          currentDate = addDays(currentDate, 1);
          continue;
        }

        const hoursToDoToday = Math.min(remainingTaskHours, day.remainingCapacity);

        const part: TaskPart = {
          taskId: task.id,
          taskName: task.name,
          assignee: task.assignee,
          equipment: task.equipment ?? [],
          hoursSpent: hoursToDoToday,
          partIndex,
          totalParts: 0,
          milestoneId: milestone.id,
          milestoneName: milestone.name,
        };

        day.parts.push(part);
        taskPartsRefs.push(part);
        milestoneLastScheduledDate = day.date;
        day.remainingCapacity -= hoursToDoToday;
        remainingTaskHours -= hoursToDoToday;
        partIndex++;

        if (remainingTaskHours > 0 && day.remainingCapacity <= 0) {
          currentDate = addDays(currentDate, 1);
        }
      }

      const total = taskPartsRefs.length;
      taskPartsRefs.forEach(p => (p.totalParts = total));
    }

    if (milestoneLastScheduledDate) {
      previousMilestoneEndDate = milestoneLastScheduledDate;
    }
  }

  return schedule.sort((a, b) => a.date.getTime() - b.date.getTime());
};
