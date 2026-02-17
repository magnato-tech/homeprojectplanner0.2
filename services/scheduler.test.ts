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
});