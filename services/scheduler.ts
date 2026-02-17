
import { addDays, isSameDay, startOfDay } from 'date-fns';
import { Milestone, DaySchedule, ProjectConfig, TaskPart } from '../types';

/**
 * Calculates a sequential schedule based on daily capacities and task estimates.
 * Tasks are split across days if they exceed daily capacity.
 * New milestones start at the earliest on the day after the previous milestone finishes.
 */
export const calculateSchedule = (
  milestones: Milestone[],
  config: ProjectConfig
): DaySchedule[] => {
  const schedule: DaySchedule[] = [];
  let currentDate = startOfDay(config.startDate);
  
  // Helper to find or create a day in the schedule
  const getOrCreateDay = (date: Date): DaySchedule => {
    let day = schedule.find((d) => isSameDay(d.date, date));
    if (!day) {
      const dayOfWeek = date.getDay();
      const cap = config.dayCapacities[dayOfWeek] ?? 0;
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

  // Helper to skip non-working days (capacity 0)
  const moveToNextWorkingDay = (date: Date): Date => {
    let next = date;
    while (config.dayCapacities[next.getDay()] === 0) {
      next = addDays(next, 1);
    }
    return next;
  };

  for (const milestone of milestones) {
    // Milestone Gating: Must start at least one day after the last task of the previous milestone
    if (schedule.length > 0) {
      currentDate = addDays(currentDate, 1);
    }
    
    currentDate = moveToNextWorkingDay(currentDate);

    for (const task of milestone.tasks) {
      let remainingTaskHours = task.estimateHours;
      let partIndex = 1;
      
      // We don't know total parts yet, but we'll calculate it or update it later.
      // For simplicity in this logic, we'll store parts and update the totalParts at the end of the task.
      const taskPartsRefs: TaskPart[] = [];

      while (remainingTaskHours > 0) {
        currentDate = moveToNextWorkingDay(currentDate);
        let day = getOrCreateDay(currentDate);

        // If current day is full, move to next
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
          partIndex: partIndex,
          totalParts: 0, // Placeholder
          milestoneId: milestone.id,
          milestoneName: milestone.name,
        };

        day.parts.push(part);
        taskPartsRefs.push(part);
        
        day.remainingCapacity -= hoursToDoToday;
        remainingTaskHours -= hoursToDoToday;
        partIndex++;

        // If task isn't done but day is exhausted, move to next day
        if (remainingTaskHours > 0 && day.remainingCapacity <= 0) {
          currentDate = addDays(currentDate, 1);
        }
      }

      // Update total parts for the labels
      const total = taskPartsRefs.length;
      taskPartsRefs.forEach(p => p.totalParts = total);
    }
  }

  // Final pass: ensure any empty days at the very end of the array are removed (if any)
  // and sort by date just in case
  return schedule.sort((a, b) => a.date.getTime() - b.date.getTime());
};
