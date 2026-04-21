// Shared constants for the onboarding wizard.
// Lives outside actions.ts because 'use server' files can only export
// async functions — re-importing constants from a non-server module
// keeps both client and server code happy.

export const CITY_OPTIONS = [
  'São Paulo',
  'Rio de Janeiro',
  'Belo Horizonte',
  'Brasília',
  'Curitiba',
  'Porto Alegre',
  'Salvador',
  'Fortaleza',
  'Recife',
  'Manaus',
  'Goiânia',
  'Outra',
] as const;

export const CATEGORY_OPTIONS = [
  { id: 'cabelo', label: 'Cabelo' },
  { id: 'unha', label: 'Unha' },
  { id: 'barba', label: 'Barbearia' },
  { id: 'estetica', label: 'Estética' },
] as const;

export type CategoryId = (typeof CATEGORY_OPTIONS)[number]['id'];
