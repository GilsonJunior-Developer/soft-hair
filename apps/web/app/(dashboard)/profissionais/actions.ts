'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { workingHoursSchema } from './types';

const MAX_PROFESSIONALS_PER_SALON = 20;

/* ----------------------------------------------------------
 * Professional schema
 * ----------------------------------------------------------*/

const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

const professionalSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto').max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(slugRegex, 'Slug apenas minúsculas, números e hífen')
    .min(2)
    .max(60),
  bio: z.string().max(500).optional().or(z.literal('')),
  specialties: z.array(z.string()).max(20),
  working_hours: workingHoursSchema,
  commission_mode: z.enum(['PERCENT_FIXED', 'TABLE']),
  commission_default_percent: z
    .number()
    .min(0, 'Deve ser entre 0 e 100')
    .max(100, 'Deve ser entre 0 e 100'),
});

export type ProfessionalInput = z.infer<typeof professionalSchema>;

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


/* ----------------------------------------------------------
 * createProfessional
 * ----------------------------------------------------------*/

export async function createProfessional(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = professionalSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string' && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, error: 'Dados inválidos', fieldErrors };
  }

  const salonId = await getCurrentSalonId();
  if (!salonId) {
    return { ok: false, error: 'Salão não encontrado' };
  }

  const supabase = await createClient();

  // Enforce 1-20 limit
  const { count } = await supabase
    .from('professionals')
    .select('*', { count: 'exact', head: true })
    .eq('salon_id', salonId)
    .is('deleted_at', null);

  if ((count ?? 0) >= MAX_PROFESSIONALS_PER_SALON) {
    return {
      ok: false,
      error: `Limite de ${MAX_PROFESSIONALS_PER_SALON} profissionais por salão atingido.`,
    };
  }

  // Dedup slug within salon
  let slug = parsed.data.slug;
  let suffix = 0;
  while (true) {
    const { data: existing } = await supabase
      .from('professionals')
      .select('id')
      .eq('salon_id', salonId)
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) break;
    suffix += 1;
    if (suffix > 20) {
      return { ok: false, error: 'Não foi possível gerar slug único' };
    }
    slug = `${parsed.data.slug}-${suffix}`;
  }

  const { data, error } = await supabase
    .from('professionals')
    .insert({
      salon_id: salonId,
      name: parsed.data.name,
      slug,
      bio: parsed.data.bio || null,
      specialties: parsed.data.specialties,
      working_hours_jsonb: parsed.data.working_hours,
      commission_mode: parsed.data.commission_mode,
      commission_default_percent: parsed.data.commission_default_percent,
    })
    .select('id, slug')
    .single();

  if (error || !data) {
    console.error('[createProfessional] insert:', error?.message);
    return { ok: false, error: 'Erro ao criar profissional' };
  }

  revalidatePath('/profissionais');
  return { ok: true, data: { id: data.id, slug: data.slug } };
}

/* ----------------------------------------------------------
 * updateProfessional
 * ----------------------------------------------------------*/

export async function updateProfessional(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = professionalSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string' && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, error: 'Dados inválidos', fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('professionals')
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      bio: parsed.data.bio || null,
      specialties: parsed.data.specialties,
      working_hours_jsonb: parsed.data.working_hours,
      commission_mode: parsed.data.commission_mode,
      commission_default_percent: parsed.data.commission_default_percent,
    })
    .eq('id', id);

  if (error) {
    console.error('[updateProfessional]:', error.message);
    return { ok: false, error: 'Erro ao atualizar profissional' };
  }

  revalidatePath('/profissionais');
  revalidatePath(`/profissionais/${id}`);
  return { ok: true };
}

/* ----------------------------------------------------------
 * toggleActiveProfessional
 * ----------------------------------------------------------*/

export async function toggleActiveProfessional(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('professionals')
    .update({ is_active: active })
    .eq('id', id);

  if (error) {
    return { ok: false, error: 'Erro ao atualizar status' };
  }

  revalidatePath('/profissionais');
  revalidatePath(`/profissionais/${id}`);
  return { ok: true };
}

/* ----------------------------------------------------------
 * softDeleteProfessional
 * ----------------------------------------------------------*/

export async function softDeleteProfessional(
  id: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('professionals')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id);

  if (error) {
    return { ok: false, error: 'Erro ao remover profissional' };
  }

  revalidatePath('/profissionais');
  return { ok: true };
}

/* ----------------------------------------------------------
 * Commission table entries — Story 4.1 AC1(b)
 * ----------------------------------------------------------*/

const percentSchema = z
  .number()
  .min(0, 'Deve ser entre 0 e 100')
  .max(100, 'Deve ser entre 0 e 100');

/**
 * Sets (or clears) a commission override for a (professional, service) pair.
 * percent=null → delete entry (falls back to service override or default per ADR-0004).
 * percent=number → upsert entry.
 */
export async function setCommissionTableEntry(
  professionalId: string,
  serviceId: string,
  percent: number | null,
): Promise<ActionResult> {
  const salonId = await getCurrentSalonId();
  if (!salonId) {
    return { ok: false, error: 'Salão não encontrado' };
  }

  const supabase = await createClient();

  if (percent === null) {
    const { error } = await supabase
      .from('professional_service_commissions')
      .delete()
      .eq('professional_id', professionalId)
      .eq('service_id', serviceId);

    if (error) {
      console.error('[setCommissionTableEntry] delete:', error.message);
      return { ok: false, error: 'Erro ao remover regra' };
    }
  } else {
    const parsed = percentSchema.safeParse(percent);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Valor inválido' };
    }

    const { error } = await supabase
      .from('professional_service_commissions')
      .upsert(
        {
          salon_id: salonId,
          professional_id: professionalId,
          service_id: serviceId,
          percent: parsed.data,
        },
        { onConflict: 'professional_id,service_id' },
      );

    if (error) {
      console.error('[setCommissionTableEntry] upsert:', error.message);
      return { ok: false, error: 'Erro ao salvar regra' };
    }
  }

  revalidatePath(`/profissionais/${professionalId}`);
  return { ok: true };
}

/**
 * Bulk-sets a commission percent for ALL services of a professional.
 * onlyEmpty=true → only inserts where no entry exists (safe default for "Aplicar X% a todos").
 * onlyEmpty=false → upserts everywhere (use only after explicit owner confirmation).
 */
export async function bulkSetProfessionalServiceCommissions(
  professionalId: string,
  percent: number,
  options: { onlyEmpty: boolean } = { onlyEmpty: true },
): Promise<ActionResult<{ inserted: number; updated: number }>> {
  const parsed = percentSchema.safeParse(percent);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Valor inválido' };
  }

  const salonId = await getCurrentSalonId();
  if (!salonId) {
    return { ok: false, error: 'Salão não encontrado' };
  }

  const supabase = await createClient();

  // Fetch active services for this salon
  const { data: services, error: svcErr } = await supabase
    .from('services')
    .select('id')
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .is('deleted_at', null);

  if (svcErr || !services) {
    console.error('[bulkSetCommissions] services fetch:', svcErr?.message);
    return { ok: false, error: 'Erro ao listar serviços' };
  }

  if (services.length === 0) {
    return { ok: true, data: { inserted: 0, updated: 0 } };
  }

  // If onlyEmpty, fetch existing entries to skip them
  let serviceIdsToTouch: string[] = services.map((s) => s.id);
  if (options.onlyEmpty) {
    const { data: existing } = await supabase
      .from('professional_service_commissions')
      .select('service_id')
      .eq('professional_id', professionalId);

    const existingIds = new Set((existing ?? []).map((e) => e.service_id));
    serviceIdsToTouch = serviceIdsToTouch.filter((id) => !existingIds.has(id));
  }

  if (serviceIdsToTouch.length === 0) {
    return { ok: true, data: { inserted: 0, updated: 0 } };
  }

  const rows = serviceIdsToTouch.map((service_id) => ({
    salon_id: salonId,
    professional_id: professionalId,
    service_id,
    percent: parsed.data,
  }));

  const { error: upsertErr } = await supabase
    .from('professional_service_commissions')
    .upsert(rows, { onConflict: 'professional_id,service_id' });

  if (upsertErr) {
    console.error('[bulkSetCommissions] upsert:', upsertErr.message);
    return { ok: false, error: 'Erro ao aplicar regras em massa' };
  }

  revalidatePath(`/profissionais/${professionalId}`);
  return options.onlyEmpty
    ? { ok: true, data: { inserted: rows.length, updated: 0 } }
    : { ok: true, data: { inserted: 0, updated: rows.length } };
}

