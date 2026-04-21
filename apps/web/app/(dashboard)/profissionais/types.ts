import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const windowSchema = z.object({
  from: z.string().regex(timeRegex, 'HH:MM'),
  to: z.string().regex(timeRegex, 'HH:MM'),
});

export const workingHoursSchema = z.object({
  mon: z.array(windowSchema),
  tue: z.array(windowSchema),
  wed: z.array(windowSchema),
  thu: z.array(windowSchema),
  fri: z.array(windowSchema),
  sat: z.array(windowSchema),
  sun: z.array(windowSchema),
});

export type WorkingHours = z.infer<typeof workingHoursSchema>;

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  mon: [{ from: '09:00', to: '18:00' }],
  tue: [{ from: '09:00', to: '18:00' }],
  wed: [{ from: '09:00', to: '18:00' }],
  thu: [{ from: '09:00', to: '18:00' }],
  fri: [{ from: '09:00', to: '18:00' }],
  sat: [{ from: '09:00', to: '14:00' }],
  sun: [],
};

export const DAY_LABELS: Record<keyof WorkingHours, string> = {
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
  sun: 'Domingo',
};

export const DAY_KEYS: Array<keyof WorkingHours> = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

export const SPECIALTY_OPTIONS = [
  'cabelo',
  'unha',
  'barba',
  'estetica',
] as const;

export const SPECIALTY_LABELS: Record<string, string> = {
  cabelo: 'Cabelo',
  unha: 'Unha',
  barba: 'Barbearia',
  estetica: 'Estética',
};

export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
