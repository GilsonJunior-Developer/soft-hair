'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { serviceSchema } from './types';

/* ----------------------------------------------------------
 * Shared types
 * ----------------------------------------------------------*/

export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/* ----------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------*/

async function getCurrentSalonId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('default_salon_id')
    .eq('id', user.id)
    .maybeSingle();

  return data?.default_salon_id ?? null;
}

function parseFieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !out[key]) {
      out[key] = issue.message;
    }
  }
  return out;
}

/* ----------------------------------------------------------
 * createCustomService (catalog_id = null)
 * ----------------------------------------------------------*/

export async function createCustomService(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Dados inválidos',
      fieldErrors: parseFieldErrors(parsed.error.issues),
    };
  }

  const salonId = await getCurrentSalonId();
  if (!salonId) return { ok: false, error: 'Salão não encontrado' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('services')
    .insert({
      salon_id: salonId,
      catalog_id: null,
      name: parsed.data.name,
      category: parsed.data.category,
      duration_minutes: parsed.data.duration_minutes,
      price_brl: parsed.data.price_brl,
      commission_override_percent: parsed.data.commission_override_percent ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[createCustomService] insert:', error?.message);
    return { ok: false, error: 'Erro ao criar serviço' };
  }

  revalidatePath('/servicos');
  return { ok: true, data: { id: data.id } };
}

/* ----------------------------------------------------------
 * updateService (partial update — all fields replaced)
 * ----------------------------------------------------------*/

export async function updateService(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Dados inválidos',
      fieldErrors: parseFieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('services')
    .update({
      name: parsed.data.name,
      category: parsed.data.category,
      duration_minutes: parsed.data.duration_minutes,
      price_brl: parsed.data.price_brl,
      commission_override_percent: parsed.data.commission_override_percent ?? null,
    })
    .eq('id', id);

  if (error) {
    console.error('[updateService]:', error.message);
    return { ok: false, error: 'Erro ao atualizar serviço' };
  }

  revalidatePath('/servicos');
  revalidatePath(`/servicos/${id}`);
  return { ok: true };
}

/* ----------------------------------------------------------
 * toggleServiceActive
 * ----------------------------------------------------------*/

export async function toggleServiceActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('services')
    .update({ is_active: active })
    .eq('id', id);

  if (error) {
    return { ok: false, error: 'Erro ao atualizar status' };
  }

  revalidatePath('/servicos');
  return { ok: true };
}

/* ----------------------------------------------------------
 * softDeleteService
 * ----------------------------------------------------------*/

export async function softDeleteService(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('services')
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false,
    })
    .eq('id', id);

  if (error) {
    return { ok: false, error: 'Erro ao remover serviço' };
  }

  revalidatePath('/servicos');
  return { ok: true };
}

/* ----------------------------------------------------------
 * addServicesFromCatalog — add catalog entries (with custom prices)
 * ----------------------------------------------------------*/

const catalogEntrySchema = z.array(
  z.object({
    catalogId: z.string().uuid(),
    priceBrl: z
      .number()
      .nonnegative('Preço não pode ser negativo')
      .max(100000, 'Valor muito alto'),
  }),
);

export async function addServicesFromCatalog(
  entries: unknown,
): Promise<ActionResult<{ count: number }>> {
  const parsed = catalogEntrySchema.safeParse(entries);
  if (!parsed.success) {
    return { ok: false, error: 'Entradas inválidas' };
  }
  if (parsed.data.length === 0) {
    return { ok: true, data: { count: 0 } };
  }

  const salonId = await getCurrentSalonId();
  if (!salonId) return { ok: false, error: 'Salão não encontrado' };

  const supabase = await createClient();

  // Fetch catalog rows (name, category, duration)
  const catalogIds = parsed.data.map((e) => e.catalogId);
  const { data: catalogRows, error: catalogError } = await supabase
    .from('service_catalog')
    .select('id, name, category, default_duration_minutes')
    .in('id', catalogIds);

  if (catalogError || !catalogRows) {
    return { ok: false, error: 'Erro ao carregar catálogo' };
  }

  // Filter out entries already in salon (dedup by catalog_id)
  const { data: existing } = await supabase
    .from('services')
    .select('catalog_id')
    .eq('salon_id', salonId)
    .in('catalog_id', catalogIds)
    .is('deleted_at', null);

  const existingSet = new Set(
    (existing ?? []).map((e) => e.catalog_id).filter((v) => v !== null),
  );

  const priceByCatalog = new Map(
    parsed.data.map((e) => [e.catalogId, e.priceBrl]),
  );

  const servicesToInsert = catalogRows
    .filter((row) => !existingSet.has(row.id))
    .map((row) => ({
      salon_id: salonId,
      catalog_id: row.id,
      name: row.name,
      category: row.category,
      duration_minutes: row.default_duration_minutes,
      price_brl: priceByCatalog.get(row.id) ?? 0,
    }));

  if (servicesToInsert.length === 0) {
    return { ok: true, data: { count: 0 } };
  }

  const { error: insertError } = await supabase
    .from('services')
    .insert(servicesToInsert);

  if (insertError) {
    console.error('[addServicesFromCatalog]:', insertError.message);
    return { ok: false, error: 'Erro ao adicionar serviços' };
  }

  revalidatePath('/servicos');
  return { ok: true, data: { count: servicesToInsert.length } };
}
