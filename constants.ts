
import { Assignee, Milestone } from './types';

export const INITIAL_MILESTONES: Milestone[] = [
  {
    id: 'm1',
    name: 'Uke 8 - Forberedelser',
    startDate: new Date('2026-02-16'),
    tasks: [
      {
        id: 't1',
        name: 'Forberedelser: Flytt utstyr inn',
        estimateHours: 5,
        assignee: 'Meg selv',
        hardStartDate: new Date('2026-02-16'),
      },
      {
        id: 't2',
        name: 'Monter utstyr pa vegg',
        estimateHours: 5,
        assignee: 'Meg selv',
      },
      {
        id: 't3',
        name: 'Riv eksisterende plater',
        estimateHours: 5,
        assignee: 'Meg selv',
      },
      {
        id: 't4',
        name: 'Kjore plater pa miljo-stasjon',
        estimateHours: 5,
        assignee: 'Meg selv',
      },
      {
        id: 't5',
        name: 'Planlegging med elektriker',
        estimateHours: 2,
        assignee: 'Elektriker',
      },
    ],
  },
  {
    id: 'm2',
    name: 'Uke 9 - Innkjop, rivning og merking',
    startDate: new Date('2026-02-23'),
    tasks: [
      {
        id: 't6',
        name: 'Innkjop av vindu 100x60',
        estimateHours: 2,
        assignee: 'Meg selv',
      },
      {
        id: 't7',
        name: 'Linjesluk og rist',
        estimateHours: 2,
        assignee: 'Rørlegger',
      },
      {
        id: 't8',
        name: 'Flytesparkel 112 sekker',
        estimateHours: 2,
        assignee: 'Meg selv',
      },
      {
        id: 't9',
        name: 'Isopor',
        estimateHours: 1,
        assignee: 'Meg selv',
      },
      {
        id: 't10',
        name: 'Trelast, stendere og skruer',
        estimateHours: 2,
        assignee: 'Snekker',
      },
      {
        id: 't11',
        name: 'Merk opp nyaktig hvor slisse',
        estimateHours: 1,
        assignee: 'Meg selv',
      },
      {
        id: 't12',
        name: 'Se pa avlop og rorlegger',
        estimateHours: 1,
        assignee: 'Rørlegger',
      },
      {
        id: 't13',
        name: 'Fa estimert pris rorlegger',
        estimateHours: 1,
        assignee: 'Rørlegger',
      },
      {
        id: 't14',
        name: 'Fa tak pa bukk til avfelling av fall innendors',
        estimateHours: 1,
        assignee: 'Meg selv',
      },
    ],
  },
  {
    id: 'm3',
    name: 'Uke 10-11 - Riving og klargjoring',
    startDate: new Date('2026-03-02'),
    tasks: [
      {
        id: 't15',
        name: 'Riving og merking',
        estimateHours: 16,
        assignee: 'Meg selv',
      },
      {
        id: 't16',
        name: 'Bore opp masse til deponi utenfor',
        estimateHours: 8,
        assignee: 'Meg selv',
      },
      {
        id: 't17',
        name: 'Planere ut fall i gulvet',
        estimateHours: 6,
        assignee: 'Meg selv',
      },
      {
        id: 't18',
        name: 'Skjere ut spor ut av huset',
        estimateHours: 6,
        assignee: 'Meg selv',
      },
      {
        id: 't19',
        name: 'Bolte fast bunnsviller',
        estimateHours: 5,
        assignee: 'Snekker',
      },
      {
        id: 't20',
        name: 'Bygge stenderverk mot murvegg',
        estimateHours: 10,
        assignee: 'Snekker',
      },
    ],
  },
  {
    id: 'm4',
    name: 'Uke 12 - Rorlegger',
    startDate: new Date('2026-03-16'),
    tasks: [
      {
        id: 't21',
        name: 'Rorlegger legger stenderverk, sluk og kryssforskaling',
        estimateHours: 12,
        assignee: 'Rørlegger',
      },
      {
        id: 't22',
        name: 'Montere linje-sluk med veggbraketter',
        estimateHours: 8,
        assignee: 'Rørlegger',
      },
      {
        id: 't23',
        name: 'Montere kryss',
        estimateHours: 3,
        assignee: 'Rørlegger',
      },
      {
        id: 't24',
        name: 'Forskale og stotte',
        estimateHours: 4,
        assignee: 'Snekker',
      },
      {
        id: 't25',
        name: 'Elektriker trekker elektriker',
        estimateHours: 4,
        assignee: 'Elektriker',
      },
    ],
  },
  {
    id: 'm5',
    name: 'Uke 13-14 - EPS og klargjoring',
    startDate: new Date('2026-03-23'),
    tasks: [
      {
        id: 't26',
        name: 'Legge EPS pa kjokkenet',
        estimateHours: 8,
        assignee: 'Snekker',
      },
      {
        id: 't27',
        name: 'Legge EPS pa badet',
        estimateHours: 8,
        assignee: 'Snekker',
      },
      {
        id: 't28',
        name: 'Tetting og logstikk',
        estimateHours: 6,
        assignee: 'Snekker',
      },
      {
        id: 't29',
        name: 'Byggeskum i alle overganger',
        estimateHours: 5,
        assignee: 'Snekker',
      },
      {
        id: 't30',
        name: 'Siste sjekk av kantband og stengelister',
        estimateHours: 4,
        assignee: 'Meg selv',
      },
    ],
  },
  {
    id: 'm6',
    name: 'Uke 15-16 - Pastop og varmekabler',
    startDate: new Date('2026-04-06'),
    tasks: [
      {
        id: 't31',
        name: 'Pastaop 2',
        estimateHours: 6,
        assignee: 'Meg selv',
      },
      {
        id: 't32',
        name: 'Sjekke alle boksehoyder',
        estimateHours: 3,
        assignee: 'Meg selv',
      },
      {
        id: 't33',
        name: 'Stepe topp-laget',
        estimateHours: 8,
        assignee: 'Snekker',
      },
      {
        id: 't34',
        name: 'Montere rirst pa linjesluk',
        estimateHours: 2,
        assignee: 'Rørlegger',
      },
      {
        id: 't35',
        name: 'Kantband og varmekabler',
        estimateHours: 10,
        assignee: 'Elektriker',
      },
      {
        id: 't36',
        name: 'Legge armering i siksakk',
        estimateHours: 4,
        assignee: 'Snekker',
      },
      {
        id: 't37',
        name: 'Montere alle elektriker',
        estimateHours: 4,
        assignee: 'Elektriker',
      },
      {
        id: 't38',
        name: 'Legge varmekabler',
        estimateHours: 6,
        assignee: 'Elektriker',
      },
    ],
  },
  {
    id: 'm7',
    name: 'Uke 17-18 - Membran og veggplater',
    startDate: new Date('2026-04-20'),
    tasks: [
      {
        id: 't39',
        name: 'Lime fast stengelisten for nedsenket dusjsone',
        estimateHours: 4,
        assignee: 'Meg selv',
      },
      {
        id: 't40',
        name: 'Veggplater',
        estimateHours: 8,
        assignee: 'Snekker',
      },
      {
        id: 't41',
        name: 'Montere Litex/Tetti-plater',
        estimateHours: 8,
        assignee: 'Snekker',
      },
      {
        id: 't42',
        name: 'Membran',
        estimateHours: 10,
        assignee: 'Maler',
      },
      {
        id: 't43',
        name: 'Mur og membran rundt sluk',
        estimateHours: 6,
        assignee: 'Maler',
      },
    ],
  },
  {
    id: 'm8',
    name: 'Uke 20-21 - Flislegging',
    startDate: new Date('2026-05-11'),
    tasks: [
      {
        id: 't44',
        name: 'Flislegge baderomsgulv',
        estimateHours: 12,
        assignee: 'Maler',
      },
      {
        id: 't45',
        name: 'Fuging',
        estimateHours: 6,
        assignee: 'Maler',
      },
      {
        id: 't46',
        name: 'Silikonering av hjorner',
        estimateHours: 4,
        assignee: 'Maler',
      },
      {
        id: 't47',
        name: 'Grunning og overflate vegger',
        estimateHours: 6,
        assignee: 'Maler',
      },
    ],
  },
  {
    id: 'm9',
    name: 'Uke 22-23 - Montering og finish',
    startDate: new Date('2026-05-25'),
    tasks: [
      {
        id: 't48',
        name: 'Reis 198 mm stendere pa fundament-hyllen',
        estimateHours: 8,
        assignee: 'Snekker',
      },
      {
        id: 't49',
        name: 'Vinduer og skjermhull i gammelvegg',
        estimateHours: 7,
        assignee: 'Snekker',
      },
      {
        id: 't50',
        name: 'Ute-finish, isoler, vindsperre og ny kledning',
        estimateHours: 12,
        assignee: 'Snekker',
      },
      {
        id: 't51',
        name: 'JUNI',
        estimateHours: 1,
        assignee: 'Meg selv',
      },
    ],
  },
  {
    id: 'm10',
    name: 'Uke 24 - Sluttmontasje',
    startDate: new Date('2026-06-08'),
    tasks: [
      {
        id: 't52',
        name: 'Montere kjokkenmoduler og servant',
        estimateHours: 10,
        assignee: 'Snekker',
      },
      {
        id: 't53',
        name: 'Rorlegger og elektriker sluttmontasje',
        estimateHours: 8,
        assignee: 'Rørlegger',
      },
      {
        id: 't54',
        name: 'Kople pa ror',
        estimateHours: 4,
        assignee: 'Rørlegger',
      },
      {
        id: 't55',
        name: 'Grave groft',
        estimateHours: 4,
        assignee: 'Meg selv',
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
