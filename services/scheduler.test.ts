import { calculateSchedule } from './scheduler';
import { Milestone, ProjectConfig, Assignee, Task } from '../types';
import { parseISO, addDays, startOfDay } from 'date-fns';

describe('calculateSchedule', () => {
  const defaultProjectConfig: ProjectConfig = {
    startDate: parseISO('2026-03-03T00:00:00.000Z'), // A Tuesday
    dayCapacities: {
      0: 0, // Sunday
      1: 8, // Monday
      2: 8, // Tuesday
      3: 8, // Wednesday
      4: 8, // Thursday
      5: 8, // Friday
      6: 0, // Saturday
    },
  };

  const createMilestone = (id: string, name: string, tasks: Task[]): Milestone => ({
    id,
    name,
    tasks,
  });

  const createTask = (id: string, name: string, estimateHours: number, assignee: Assignee): Task => ({
    id,
    name,
    estimateHours,
    assignee,
  });

  it('should schedule a single task that fits within a day', () => {
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createTask('t1', 'Task 1', 4, 'Meg selv'),
      ]),
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);

    expect(schedule.length).toBe(1);
    expect(schedule[0].date).toEqual(startOfDay(parseISO('2026-03-03T00:00:00.000Z')));
    expect(schedule[0].parts.length).toBe(1);
    expect(schedule[0].parts[0].taskName).toBe('Task 1');
    expect(schedule[0].parts[0].hoursSpent).toBe(4);
    expect(schedule[0].remainingCapacity).toBe(4);
  });

  it('should split a task across multiple days if it exceeds daily capacity', () => {
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createTask('t1', 'Task 1', 10, 'Meg selv'), // 10 hours, daily capacity 8
      ]),
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);

    expect(schedule.length).toBe(2);
    // Day 1
    expect(schedule[0].date).toEqual(startOfDay(parseISO('2026-03-03T00:00:00.000Z')));
    expect(schedule[0].parts.length).toBe(1);
    expect(schedule[0].parts[0].taskName).toBe('Task 1');
    expect(schedule[0].parts[0].hoursSpent).toBe(8);
    expect(schedule[0].parts[0].partIndex).toBe(1);
    expect(schedule[0].parts[0].totalParts).toBe(2);
    expect(schedule[0].remainingCapacity).toBe(0);

    // Day 2
    expect(schedule[1].date).toEqual(startOfDay(parseISO('2026-03-04T00:00:00.000Z')));
    expect(schedule[1].parts.length).toBe(1);
    expect(schedule[1].parts[0].taskName).toBe('Task 1');
    expect(schedule[1].parts[0].hoursSpent).toBe(2);
    expect(schedule[1].parts[0].partIndex).toBe(2);
    expect(schedule[1].parts[0].totalParts).toBe(2);
    expect(schedule[1].remainingCapacity).toBe(6);
  });

  it('should handle milestone gating (new milestone starts day after previous ends)', () => {
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createTask('t1', 'Task 1', 8, 'Meg selv'), // Finishes on Day 1 (March 3)
      ]),
      createMilestone('m2', 'Milestone 2', [
        createTask('t2', 'Task 2', 8, 'Meg selv'),
      ]),
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);

    expect(schedule.length).toBe(2); // Changed from 3 to 2, as there won't be an empty day for the gap

    // Milestone 1 finishes on March 3
    expect(schedule[0].date).toEqual(startOfDay(parseISO('2026-03-03T00:00:00.000Z')));
    expect(schedule[0].parts[0].milestoneName).toBe('Milestone 1');

    // Milestone 2 starts on March 4 (day after milestone 1 finishes)
    expect(schedule[1].date).toEqual(startOfDay(parseISO('2026-03-04T00:00:00.000Z')));
    expect(schedule[1].parts[0].milestoneName).toBe('Milestone 2');
  });

  it('should use milestone startDate when later than the gated start date', () => {
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createTask('t1', 'Task 1', 8, 'Meg selv'),
      ]),
      {
        ...createMilestone('m2', 'Milestone 2', [
          createTask('t2', 'Task 2', 8, 'Meg selv'),
        ]),
        startDate: parseISO('2026-03-10T00:00:00.000Z'),
      },
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);

    expect(schedule[0].date).toEqual(startOfDay(parseISO('2026-03-03T00:00:00.000Z')));
    expect(schedule[1].date).toEqual(startOfDay(parseISO('2026-03-10T00:00:00.000Z')));
    expect(schedule[1].parts[0].milestoneName).toBe('Milestone 2');
  });

  it('should not allow milestone startDate to overlap previous milestone', () => {
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createTask('t1', 'Task 1', 16, 'Meg selv'), // Mar 3 + Mar 4
      ]),
      {
        ...createMilestone('m2', 'Milestone 2', [
          createTask('t2', 'Task 2', 8, 'Meg selv'),
        ]),
        startDate: parseISO('2026-03-04T00:00:00.000Z'), // Earlier than allowed
      },
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);

    expect(schedule[0].date).toEqual(startOfDay(parseISO('2026-03-03T00:00:00.000Z')));
    expect(schedule[1].date).toEqual(startOfDay(parseISO('2026-03-04T00:00:00.000Z')));
    // Milestone 2 must start the day after m1 is done (March 5)
    expect(schedule[2].date).toEqual(startOfDay(parseISO('2026-03-05T00:00:00.000Z')));
    expect(schedule[2].parts[0].milestoneName).toBe('Milestone 2');
  });

  it('should skip non-working days (Sundays and Saturdays)', () => {
    const config: ProjectConfig = {
      startDate: parseISO('2026-03-06T00:00:00.000Z'), // A Friday
      dayCapacities: {
        0: 0, // Sunday
        1: 8, // Monday
        2: 8, // Tuesday
        3: 8, // Wednesday
        4: 8, // Thursday
        5: 8, // Friday
        6: 0, // Saturday
      },
    };

    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createTask('t1', 'Task 1', 10, 'Meg selv'), // 10 hours starting Friday
      ]),
    ];

    const schedule = calculateSchedule(milestones, config);

    expect(schedule.length).toBe(2);
    expect(schedule[0].date).toEqual(startOfDay(parseISO('2026-03-06T00:00:00.000Z'))); // Friday
    expect(schedule[0].parts[0].hoursSpent).toBe(8);

    expect(schedule[1].date).toEqual(startOfDay(parseISO('2026-03-09T00:00:00.000Z'))); // Monday (skips Saturday and Sunday)
    expect(schedule[1].parts[0].hoursSpent).toBe(2);
  });

  it('should handle multiple tasks in a single day', () => {
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createTask('t1', 'Task 1', 3, 'Meg selv'),
        createTask('t2', 'Task 2', 5, 'Meg selv'),
      ]),
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);

    expect(schedule.length).toBe(1);
    expect(schedule[0].date).toEqual(startOfDay(parseISO('2026-03-03T00:00:00.000Z')));
    expect(schedule[0].parts.length).toBe(2);
    expect(schedule[0].parts[0].taskName).toBe('Task 1');
    expect(schedule[0].parts[0].hoursSpent).toBe(3);
    expect(schedule[0].parts[1].taskName).toBe('Task 2');
    expect(schedule[0].parts[1].hoursSpent).toBe(5);
    expect(schedule[0].remainingCapacity).toBe(0);
  });

  it('should correctly assign remaining capacity', () => {
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createTask('t1', 'Task 1', 5, 'Meg selv'),
      ]),
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);
    expect(schedule[0].remainingCapacity).toBe(3);
  });

  it('should handle tasks that exactly fill a day', () => {
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createTask('t1', 'Task 1', 8, 'Meg selv'),
      ]),
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);
    expect(schedule.length).toBe(1);
    expect(schedule[0].remainingCapacity).toBe(0);
  });

  it('should handle tasks with zero estimate hours', () => {
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createTask('t1', 'Task 1', 0, 'Meg selv'),
      ]),
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);
    expect(schedule.length).toBe(0); // No schedule generated for zero-hour tasks
  });

  it('should update totalParts correctly for multi-day tasks', () => {
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createTask('t1', 'Task 1', 20, 'Meg selv'), // 20 hours, 8h/day = 3 days (8, 8, 4)
      ]),
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);

    expect(schedule.length).toBe(3);
    expect(schedule[0].parts[0].totalParts).toBe(3);
    expect(schedule[1].parts[0].totalParts).toBe(3);
    expect(schedule[2].parts[0].totalParts).toBe(3);
  });

  // ---------------------------------------------------------------------------
  // Pinned task (hardStartDate) tests
  // ---------------------------------------------------------------------------

  const createPinnedTask = (
    id: string,
    name: string,
    estimateHours: number,
    assignee: Assignee,
    hardStartDate: Date,
    startTime?: string,
  ): Task => ({
    id,
    name,
    estimateHours,
    assignee,
    hardStartDate,
    startTime,
  });

  it('pinned task lands on its exact hardStartDate', () => {
    // t1 is normal (4h), t2 is pinned to Wednesday March 5.
    // t1 fills Tuesday Mar 3, so t2 should jump directly to Mar 5.
    const pinnedDate = parseISO('2026-03-05T00:00:00.000Z'); // Wednesday
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createTask('t1', 'Task 1', 4, 'Meg selv'),
        createPinnedTask('t2', 'Elektriker', 2, 'Elektriker', pinnedDate),
      ]),
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);

    const day = schedule.find(d => d.date.getTime() === startOfDay(pinnedDate).getTime());
    expect(day).toBeDefined();
    expect(day!.parts.some(p => p.taskId === 't2')).toBe(true);
  });

  it('pinned task is NOT moved when upstream work fills the same day', () => {
    // t1 fills the entire day (8h) on Mar 3. t2 is pinned to Mar 3.
    // The pinned task must still land on Mar 3 (capacity boosted), not be pushed away.
    const pinnedDate = parseISO('2026-03-03T00:00:00.000Z'); // Tuesday
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createTask('t1', 'Task 1', 8, 'Meg selv'),
        createPinnedTask('t2', 'Elektriker', 2, 'Elektriker', pinnedDate),
      ]),
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);

    const pinnedDay = schedule.find(d => d.date.getTime() === startOfDay(pinnedDate).getTime());
    expect(pinnedDay).toBeDefined();
    expect(pinnedDay!.parts.some(p => p.taskId === 't2')).toBe(true);
  });

  it('capacity is boosted on the pinned day to fit the pinned task', () => {
    // t1 uses 8h (full day), t2 (pinned, 2h) lands same day.
    // totalCapacity must be boosted to at least 10.
    const pinnedDate = parseISO('2026-03-03T00:00:00.000Z');
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createTask('t1', 'Task 1', 8, 'Meg selv'),
        createPinnedTask('t2', 'Elektriker', 2, 'Elektriker', pinnedDate),
      ]),
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);

    const pinnedDay = schedule.find(d => d.date.getTime() === startOfDay(pinnedDate).getTime());
    expect(pinnedDay!.totalCapacity).toBeGreaterThanOrEqual(10);
  });

  it('pinned task on a non-working day (Saturday) is still scheduled there', () => {
    // Saturday has capacity 0 normally, but a confirmed appointment can fall on it.
    const saturday = parseISO('2026-03-07T00:00:00.000Z'); // Saturday
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createPinnedTask('t1', 'Leveranse', 2, 'Meg selv', saturday),
      ]),
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);

    const saturdaySlot = schedule.find(d => d.date.getTime() === startOfDay(saturday).getTime());
    expect(saturdaySlot).toBeDefined();
    expect(saturdaySlot!.parts.some(p => p.taskId === 't1')).toBe(true);
  });

  it('upstream non-pinned task is NOT truncated at the pinned wall', () => {
    // t1 is 12h — it must get all 12h scheduled even though t2 is pinned to Mar 4.
    // The scheduler must not cut t1's hours; conflict is a UI concern only.
    const pinnedDate = parseISO('2026-03-04T00:00:00.000Z'); // Wednesday
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createTask('t1', 'Task 1', 12, 'Meg selv'), // will overflow past Mar 3
        createPinnedTask('t2', 'Rørlegger', 2, 'Rørlegger', pinnedDate),
      ]),
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);

    const totalT1Hours = schedule
      .flatMap(d => d.parts)
      .filter(p => p.taskId === 't1')
      .reduce((sum, p) => sum + p.hoursSpent, 0);

    expect(totalT1Hours).toBe(12);
  });

  it('normal tasks after a pinned task continue from the pinned date onward', () => {
    // t1 (pinned, 2h) on Mar 10 (Tuesday). t2 (normal, 4h) must start Mar 10 or later.
    const pinnedDate = parseISO('2026-03-10T00:00:00.000Z'); // Tuesday
    const milestones: Milestone[] = [
      createMilestone('m1', 'Milestone 1', [
        createPinnedTask('t1', 'Elektriker', 2, 'Elektriker', pinnedDate),
        createTask('t2', 'Task 2', 4, 'Meg selv'),
      ]),
    ];

    const schedule = calculateSchedule(milestones, defaultProjectConfig);

    const t2Parts = schedule.flatMap(d => d.parts).filter(p => p.taskId === 't2');
    expect(t2Parts.length).toBeGreaterThan(0);
    t2Parts.forEach(p => {
      const dayDate = schedule.find(d => d.parts.includes(p))!.date;
      expect(dayDate.getTime()).toBeGreaterThanOrEqual(startOfDay(pinnedDate).getTime());
    });
  });
});