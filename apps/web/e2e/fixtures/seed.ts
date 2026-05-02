import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TEST_SALON, TEST_USER } from './auth';

/**
 * Seed helpers for E2E specs.
 *
 * Uses the Supabase service-role key (server-side only, bypasses RLS) to
 * insert per-spec data and clean it up afterwards. Always operates against
 * `softhair-dev` only.
 *
 * Each spec receives a fresh `SeedHelpers` via the `seed` fixture; cleanup
 * runs automatically after the spec completes (see `fixtures/index.ts`).
 */

export type SeedHelpers = {
  /** Insert an appointment for the test salon and track it for cleanup. */
  appointment: (overrides?: Partial<AppointmentInput>) => Promise<AppointmentRow>;
  /** Insert a professional for the test salon and track it for cleanup. */
  professional: (overrides?: Partial<ProfessionalInput>) => Promise<ProfessionalRow>;
  /** Insert a service for the test salon and track it for cleanup. */
  service: (overrides?: Partial<ServiceInput>) => Promise<ServiceRow>;
  /** Insert a client for the test salon and track it for cleanup. */
  client: (overrides?: Partial<ClientInput>) => Promise<ClientRow>;
  /** Restore a soft-deleted client by clearing deleted_at. */
  restoreClient: (clientId: string) => Promise<void>;
  /** Direct service-role client for ad-hoc queries within a spec. */
  sb: () => SupabaseClient;
  /** Manually trigger cleanup (also called automatically by the fixture teardown). */
  cleanupAll: () => Promise<void>;
};

type AppointmentInput = {
  professional_id: string;
  service_id: string;
  client_id: string;
  scheduled_at: string;
  duration_minutes: number;
  price_brl_original: number;
  price_brl_final: number;
  status?: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELED';
};
type AppointmentRow = AppointmentInput & { id: string; salon_id: string };

type ProfessionalInput = {
  name: string;
  slug: string;
  specialties?: string[];
  commission_default_percent?: number;
};
type ProfessionalRow = ProfessionalInput & { id: string; salon_id: string };

type ServiceInput = {
  name: string;
  category: string;
  duration_minutes: number;
  price_brl: number;
  commission_override_percent?: number;
};
type ServiceRow = ServiceInput & { id: string; salon_id: string };

type ClientInput = {
  name: string;
  phone_e164: string;
  email?: string | null;
  lgpd_consent_text_hash?: string | null;
};
type ClientRow = ClientInput & { id: string; salon_id: string };

function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'seed fixture: missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var. ' +
        'Locally: copy from .env.example. CI: ensure secrets are exposed in the e2e job env block.',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createSeedHelpers(): SeedHelpers {
  const sb = createServiceRoleClient();
  const created = {
    appointments: [] as string[],
    professionals: [] as string[],
    services: [] as string[],
    clients: [] as string[],
    restoredClients: [] as string[],
  };

  const helpers: SeedHelpers = {
    sb: () => sb,

    async appointment(overrides = {}) {
      const scheduled =
        overrides.scheduled_at ??
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const payload = {
        salon_id: TEST_SALON.id,
        scheduled_at: scheduled,
        duration_minutes: overrides.duration_minutes ?? 30,
        price_brl_original: overrides.price_brl_original ?? 50,
        price_brl_final: overrides.price_brl_final ?? 50,
        status: overrides.status ?? ('PENDING_CONFIRMATION' as const),
        professional_id: overrides.professional_id,
        service_id: overrides.service_id,
        client_id: overrides.client_id,
      };
      if (!payload.professional_id || !payload.service_id || !payload.client_id) {
        throw new Error('seed.appointment requires professional_id, service_id, client_id');
      }
      const { data, error } = await sb
        .from('appointments')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(`seed.appointment: ${error.message}`);
      created.appointments.push(data.id);
      return data as AppointmentRow;
    },

    async professional(overrides = {}) {
      const slug = overrides.slug ?? `e2e-prof-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const payload = {
        salon_id: TEST_SALON.id,
        name: overrides.name ?? 'E2E Professional',
        slug,
        specialties: overrides.specialties ?? [],
        commission_default_percent: overrides.commission_default_percent ?? 50,
      };
      const { data, error } = await sb
        .from('professionals')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(`seed.professional: ${error.message}`);
      created.professionals.push(data.id);
      return data as ProfessionalRow;
    },

    async service(overrides = {}) {
      const payload = {
        salon_id: TEST_SALON.id,
        name: overrides.name ?? 'E2E Service',
        category: overrides.category ?? 'cabelo',
        duration_minutes: overrides.duration_minutes ?? 30,
        price_brl: overrides.price_brl ?? 50,
        commission_override_percent: overrides.commission_override_percent ?? null,
      };
      const { data, error } = await sb
        .from('services')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(`seed.service: ${error.message}`);
      created.services.push(data.id);
      return data as ServiceRow;
    },

    async client(overrides = {}) {
      const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const payload = {
        salon_id: TEST_SALON.id,
        name: overrides.name ?? `E2E Client ${suffix}`,
        phone_e164: overrides.phone_e164 ?? `+5511990${suffix.slice(-7)}`,
        email: overrides.email ?? null,
        lgpd_consent_text_hash: overrides.lgpd_consent_text_hash ?? null,
      };
      const { data, error } = await sb
        .from('clients')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(`seed.client: ${error.message}`);
      created.clients.push(data.id);
      return data as ClientRow;
    },

    async restoreClient(clientId) {
      const { error } = await sb
        .from('clients')
        .update({ deleted_at: null })
        .eq('id', clientId);
      if (error) throw new Error(`seed.restoreClient: ${error.message}`);
      if (!created.restoredClients.includes(clientId)) created.restoredClients.push(clientId);
    },

    async cleanupAll() {
      // Delete in FK reverse order to avoid violations.
      if (created.appointments.length > 0) {
        await sb.from('appointments').delete().in('id', created.appointments);
      }
      if (created.services.length > 0) {
        await sb.from('services').delete().in('id', created.services);
      }
      if (created.professionals.length > 0) {
        await sb.from('professionals').delete().in('id', created.professionals);
      }
      if (created.clients.length > 0) {
        await sb.from('clients').delete().in('id', created.clients);
      }
    },
  };
  // suppress unused warning for TEST_USER export-pass-through
  void TEST_USER;
  return helpers;
}
