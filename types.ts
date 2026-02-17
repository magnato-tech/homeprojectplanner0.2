
export type Assignee = 'Meg selv' | 'Snekker' | 'Rørlegger' | 'Elektriker' | 'Maler';
export type EquipmentCategory = 'material' | 'equipment' | 'rental';

export interface EquipmentItem {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  category?: EquipmentCategory;
}

export interface Task {
  id: string;
  name: string;
  estimateHours: number;
  assignee: Assignee;
  equipment?: EquipmentItem[];
  hardStartDate?: Date;
}

export interface Milestone {
  id: string;
  name: string;
  tasks: Task[];
  startDate?: Date;
}

export interface TaskPart {
  taskId: string;
  taskName: string;
  assignee: Assignee;
  equipment?: EquipmentItem[];
  hoursSpent: number;
  partIndex: number;
  totalParts: number;
  milestoneName: string;
  milestoneId: string;
}

export interface DaySchedule {
  date: Date;
  parts: TaskPart[];
  remainingCapacity: number;
  totalCapacity: number;
}

export interface ProjectConfig {
  startDate: Date;
  dayCapacities: Record<number, number>; // 0 (Sun) to 6 (Sat)
}

export interface BudgetActuals {
  labor: number;
  material: number;
  rental: number;
}
