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

