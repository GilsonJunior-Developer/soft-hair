'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const NOTES_MAX_LENGTH = 2000;

const notesSchema = z
  .string()
  .max(NOTES_MAX_LENGTH, `Observações limitadas a ${NOTES_MAX_LENGTH} caracteres`);

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

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
 * softDeleteClient — Story 2.5 AC 5
 * ----------------------------------------------------------*/

export async function softDeleteClient(id: string): Promise<ActionResult> {
  const salonId = await getCurrentSalonId();
  if (!salonId) {
    return { ok: false, error: 'Salão não encontrado' };
  }

  const supabase = await createClient();

  // RLS já restringe ao tenant, mas reforçamos com .eq('salon_id') para
  // evitar UPDATE silencioso quando id pertencer a outro salão.
  const { error } = await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('salon_id', salonId);

  if (error) {
    console.error('[softDeleteClient]:', error.message);
    return { ok: false, error: 'Erro ao remover cliente' };
  }

  revalidatePath('/clientes');
  revalidatePath(`/clientes/${id}`);
  return { ok: true };
}

/* ----------------------------------------------------------
 * updateAppointmentNotes — Story 2.5 AC 4
 * ----------------------------------------------------------*/

export async function updateAppointmentNotes(
  appointmentId: string,
  rawNotes: string,
  clientIdForRevalidate?: string,
): Promise<ActionResult> {
  const parsed = notesSchema.safeParse(rawNotes);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Notas inválidas' };
  }

  const salonId = await getCurrentSalonId();
  if (!salonId) {
    return { ok: false, error: 'Salão não encontrado' };
  }

  const supabase = await createClient();
  const trimmed = parsed.data.trim();
  const value = trimmed.length === 0 ? null : trimmed;

  const { error } = await supabase
    .from('appointments')
    .update({ notes: value })
    .eq('id', appointmentId)
    .eq('salon_id', salonId);

  if (error) {
    console.error('[updateAppointmentNotes]:', error.message);
    return { ok: false, error: 'Erro ao salvar observações' };
  }

  if (clientIdForRevalidate) {
    revalidatePath(`/clientes/${clientIdForRevalidate}`);
  }
  return { ok: true };
}
