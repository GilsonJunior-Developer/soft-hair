import { z } from 'zod';

export const CATEGORY_OPTIONS = [
  'cabelo',
  'unha',
  'barba',
  'estetica',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  cabelo: 'Cabelo',
  unha: 'Unha',
  barba: 'Barbearia',
  estetica: 'Estética',
};

/**
 * Service schema.
 *
 * Constraints:
 *  - duration_minutes: positive integer, multiple of 15
 *  - price_brl: numeric ≥ 0
 *  - commission_override_percent: optional, 0-100
 *  - category: may be one of CATEGORY_OPTIONS or custom string
 */
export const serviceSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto').max(120),
  category: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Categoria obrigatória')
    .max(40)
    .regex(
      /^[a-zà-úA-ZÀ-Ú0-9-]+$/,
      'Categoria só pode conter letras, números e hífen',
    ),
  duration_minutes: z
    .number()
    .int('Duração deve ser inteira')
    .positive('Duração deve ser positiva')
    .min(15, 'Mínimo 15 minutos')
    .max(480, 'Máximo 480 minutos')
    .refine((v) => v % 15 === 0, 'Duração deve ser múltiplo de 15 minutos'),
  price_brl: z
    .number()
    .nonnegative('Preço não pode ser negativo')
    .max(100000, 'Valor muito alto'),
  commission_override_percent: z
    .number()
    .min(0, 'Entre 0 e 100')
    .max(100, 'Entre 0 e 100')
    .optional()
    .nullable(),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

export const DURATION_OPTIONS = Array.from(
  { length: 32 },
  (_, i) => (i + 1) * 15,
);

export function formatPrice(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function parsePrice(raw: string): number | null {
  const normalized = raw.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Number(n.toFixed(2));
}
