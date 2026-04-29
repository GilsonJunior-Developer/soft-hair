export type ClientRow = {
  id: string;
  name: string;
  phone_e164: string;
  email: string | null;
  notes: string | null;
  credit_balance_brl: number;
  created_at: string;
};

export type ClientWithStats = ClientRow & {
  visit_count: number;
  last_appointment_at: string | null;
};

export type SortKey = 'last_visit' | 'name' | 'visits' | 'recent';

export const SORT_LABELS: Record<SortKey, string> = {
  last_visit: 'Última visita',
  name: 'Nome',
  visits: 'Total visitas',
  recent: 'Cadastro recente',
};

export const PAGE_SIZE = 25;
