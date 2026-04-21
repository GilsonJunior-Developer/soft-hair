'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { CITY_OPTIONS, type CategoryId } from './constants';

/* ----------------------------------------------------------
 * Schemas (Zod)
 * ----------------------------------------------------------*/

const salonStepSchema = z.object({
  name: z.string().trim().min(1, 'Nome do salão é obrigatório').max(120),
  city: z.enum(CITY_OPTIONS).optional(),
  cnpj: z
    .string()
    .trim()
    .regex(
      /^(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})?$/,
      'CNPJ em formato XX.XXX.XXX/XXXX-XX',
    )
    .optional()
    .or(z.literal('')),
});

const categoriesStepSchema = z.object({
  categories: z.array(z.enum(['cabelo', 'unha', 'barba', 'estetica'])).min(0),
});

const pricesStepSchema = z.object({
  entries: z
    .array(
      z.object({
        catalogId: z.string().uuid(),
        priceBrl: z
          .number()
          .nonnegative('Preço não pode ser negativo')
          .max(100000, 'Valor muito alto'),
      }),
    )
    .min(0),
});

/* ----------------------------------------------------------
 * Result types
 * ----------------------------------------------------------*/

export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/* ----------------------------------------------------------
 * Wizard state cookie (sh_wizard)
 * ----------------------------------------------------------*/

type WizardState = {
  salonId?: string;
  categories?: CategoryId[];
};

const WIZARD_COOKIE = 'sh_wizard';
const ONBOARDED_COOKIE = 'sh_onboarded';

async function readWizardState(): Promise<WizardState> {
  const jar = await cookies();
  const raw = jar.get(WIZARD_COOKIE)?.value;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as WizardState;
  } catch {
    return {};
  }
}

async function writeWizardState(state: WizardState): Promise<void> {
  const jar = await cookies();
  jar.set(WIZARD_COOKIE, JSON.stringify(state), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60, // 1 hour
  });
}

async function clearWizardState(): Promise<void> {
  const jar = await cookies();
  jar.delete(WIZARD_COOKIE);
}

export async function getWizardState(): Promise<WizardState> {
  return readWizardState();
}

/* ----------------------------------------------------------
 * Action: createSalon (Step 1 submit)
 * ----------------------------------------------------------*/

export async function createSalon(
  formData: FormData,
): Promise<ActionResult<{ salonId: string }>> {
  const parsed = salonStepSchema.safeParse({
    name: formData.get('name'),
    city: formData.get('city') ?? undefined,
    cnpj: formData.get('cnpj') || undefined,
  });

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Sessão expirada. Entre novamente.' };
  }

  const { data, error } = await supabase.rpc('create_salon_bootstrap', {
    p_name: parsed.data.name,
    p_city: parsed.data.city ?? undefined,
    p_cnpj: parsed.data.cnpj || undefined,
  });

  if (error || !data) {
    console.error('[createSalon] RPC error:', error?.message);
    if (error?.message?.includes('slug_conflict')) {
      return {
        ok: false,
        error: 'Já existe um salão com nome parecido. Tente um nome mais específico.',
      };
    }
    return {
      ok: false,
      error: 'Não foi possível criar o salão. Tente novamente em instantes.',
    };
  }

  await writeWizardState({ salonId: data.id });
  return { ok: true, data: { salonId: data.id } };
}

/* ----------------------------------------------------------
 * Action: saveCategories (Step 2 submit)
 * ----------------------------------------------------------*/

export async function saveCategories(
  formData: FormData,
): Promise<ActionResult> {
  const categories = formData.getAll('category') as string[];
  const parsed = categoriesStepSchema.safeParse({ categories });

  if (!parsed.success) {
    return { ok: false, error: 'Categorias inválidas' };
  }

  const current = await readWizardState();
  await writeWizardState({
    ...current,
    categories: parsed.data.categories,
  });

  return { ok: true };
}

/* ----------------------------------------------------------
 * Action: addServicesFromCatalog (Step 3 submit)
 * ----------------------------------------------------------*/

export async function addServicesFromCatalog(
  entries: Array<{ catalogId: string; priceBrl: number }>,
): Promise<ActionResult<{ count: number }>> {
  const parsed = pricesStepSchema.safeParse({ entries });

  if (!parsed.success) {
    return { ok: false, error: 'Dados de preço inválidos' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Sessão expirada' };
  }

  const wizard = await readWizardState();
  if (!wizard.salonId) {
    return { ok: false, error: 'Salão não encontrado. Volte ao passo 1.' };
  }

  if (parsed.data.entries.length === 0) {
    return { ok: true, data: { count: 0 } };
  }

  // Fetch catalog rows to get name/category/duration
  const catalogIds = parsed.data.entries.map((e) => e.catalogId);
  const { data: catalogRows, error: catalogError } = await supabase
    .from('service_catalog')
    .select('id, name, category, default_duration_minutes')
    .in('id', catalogIds);

  if (catalogError || !catalogRows) {
    console.error('[addServicesFromCatalog] catalog fetch:', catalogError?.message);
    return { ok: false, error: 'Erro ao carregar catálogo' };
  }

  const priceByCatalog = new Map(
    parsed.data.entries.map((e) => [e.catalogId, e.priceBrl]),
  );

  // Build services rows
  const servicesToInsert = catalogRows
    .map((row) => {
      const price = priceByCatalog.get(row.id);
      if (price === undefined) return null;
      return {
        salon_id: wizard.salonId,
        catalog_id: row.id,
        name: row.name,
        category: row.category,
        duration_minutes: row.default_duration_minutes,
        price_brl: price,
      };
    })
    .filter(Boolean);

  const { error: insertError } = await supabase
    .from('services')
    .insert(servicesToInsert as never)
    .select('id');

  if (insertError) {
    console.error('[addServicesFromCatalog] insert:', insertError.message);
    return { ok: false, error: 'Erro ao salvar serviços' };
  }

  return { ok: true, data: { count: servicesToInsert.length } };
}

/* ----------------------------------------------------------
 * Action: finishOnboarding (redirect to /hoje + set onboarded cookie)
 * ----------------------------------------------------------*/

export async function finishOnboarding(): Promise<never> {
  const jar = await cookies();
  jar.set(ONBOARDED_COOKIE, 'true', {
    path: '/',
    httpOnly: false, // read by middleware + client
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  await clearWizardState();
  redirect('/hoje');
}
