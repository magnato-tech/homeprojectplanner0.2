
import { Assignee, Milestone } from './types';

export const INITIAL_MILESTONES: Milestone[] = [
  {
    id: 'm1',
    name: 'Forberedelse Bad',
    tasks: [
      {
        id: 't1',
        name: 'Rive flis',
        estimateHours: 10,
        assignee: 'Meg selv',
        equipment: [
          { id: 'e1', name: 'Avfallssekk', unit: 'stk', unitPrice: 29, quantity: 10, category: 'material' },
          { id: 'e2', name: 'Støvmaske', unit: 'stk', unitPrice: 19, quantity: 6, category: 'equipment' },
        ],
      },
      {
        id: 't2',
        name: 'Pigge gulv',
        estimateHours: 6,
        assignee: 'Meg selv',
        equipment: [
          { id: 'e3', name: 'Meiselspiss', unit: 'stk', unitPrice: 149, quantity: 1, category: 'equipment' },
          { id: 'e4', name: 'Vernebriller', unit: 'stk', unitPrice: 89, quantity: 1, category: 'equipment' },
        ],
      },
    ],
  },
  {
    id: 'm2',
    name: 'Rørlegger og Membran',
    tasks: [
      {
        id: 't3',
        name: 'Legge rør',
        estimateHours: 8,
        assignee: 'Rørlegger',
        equipment: [
          { id: 'e5', name: 'PEX-rør', unit: 'm', unitPrice: 42, quantity: 18, category: 'material' },
          { id: 'e6', name: 'Rørdeler', unit: 'sett', unitPrice: 499, quantity: 1, category: 'material' },
        ],
      },
      {
        id: 't4',
        name: 'Smøremembran',
        estimateHours: 4,
        assignee: 'Meg selv',
        equipment: [
          { id: 'e7', name: 'Membran', unit: 'l', unitPrice: 179, quantity: 6, category: 'material' },
          { id: 'e8', name: 'Primer', unit: 'l', unitPrice: 119, quantity: 2, category: 'material' },
        ],
      },
    ],
  },
  {
    id: 'm3',
    name: 'Elektriker og Lys',
    tasks: [
      {
        id: 't5',
        name: 'Legge varmekabler',
        estimateHours: 5,
        assignee: 'Elektriker',
        equipment: [
          { id: 'e9', name: 'Varmekabel', unit: 'm', unitPrice: 89, quantity: 35, category: 'material' },
          { id: 'e10', name: 'Termostat', unit: 'stk', unitPrice: 1299, quantity: 1, category: 'material' },
        ],
      },
      {
        id: 't6',
        name: 'Montere spotter',
        estimateHours: 4,
        assignee: 'Elektriker',
        equipment: [
          { id: 'e11', name: 'Spotlight', unit: 'stk', unitPrice: 249, quantity: 6, category: 'material' },
          { id: 'e12', name: 'Kabel', unit: 'm', unitPrice: 18, quantity: 25, category: 'material' },
          { id: 'e13', name: 'Leie kabeltrekker', unit: 'dag', unitPrice: 550, quantity: 1, category: 'rental' },
        ],
      },
    ],
  }
];

export const DEFAULT_CAPACITIES: Record<number, number> = {
  1: 8, // Mon
  2: 8, // Tue
  3: 8, // Wed
  4: 8, // Thu
  5: 8, // Fri
  6: 4, // Sat
  0: 0, // Sun
};

export const DEFAULT_LABOR_RATES: Record<Assignee, number> = {
  'Meg selv': 0,
  'Snekker': 950,
  'Rørlegger': 1200,
  'Elektriker': 1250,
  'Maler': 850,
};
