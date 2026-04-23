/**
 * supabase-auth-setup.ts
 *
 * One-shot script to configure Supabase Auth settings for SoftHair
 * (dev + prod) via the Management API, per ADR-0003 (email + password
 * pivot from magic link).
 *
 * Reads SUPABASE_ACCESS_TOKEN from env (Personal Access Token, scope:
 * management API). Creates one at https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   export SUPABASE_ACCESS_TOKEN=sbp_xxx
 *   pnpm tsx scripts/supabase-auth-setup.ts
 *
 * The script is idempotent and interactive — it shows the diff before
 * applying and asks for confirmation per project.
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

type ProjectTarget = {
  label: string;
  ref: string;
  siteUrl: string;
};

// Project refs already known from earlier memory + dashboard URLs.
// Prod ref will be asked interactively if missing.
const TARGETS: ProjectTarget[] = [
  {
    label: 'softhair-dev',
    ref: 'oywizkjldmxhatvftmho',
    siteUrl: 'http://localhost:3000',
  },
  {
    label: 'softhair-prod',
    ref: process.env.SOFTHAIR_PROD_REF ?? '',
    siteUrl: 'https://soft-hair-web.vercel.app',
  },
];

type AuthConfigPatch = {
  mailer_secure_password_change?: boolean;
  password_min_length?: number;
  mailer_autoconfirm?: boolean;
  mailer_subjects_recovery?: string;
  mailer_templates_recovery_content?: string;
  mailer_subjects_confirmation?: string;
  mailer_templates_confirmation_content?: string;
  site_url?: string;
};

const RECOVERY_SUBJECT_PTBR = 'SoftHair — Redefina sua senha';
const RECOVERY_TEMPLATE_PTBR = `<h2>Redefinir senha</h2>
<p>Olá,</p>
<p>Recebemos um pedido para redefinir a senha da sua conta no SoftHair.</p>
<p>
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;padding:12px 24px;background-color:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
    Criar nova senha
  </a>
</p>
<p style="color:#78716c;font-size:13px;">
  Se você não solicitou a redefinição, ignore este email — sua senha continua segura.
  Este link expira em 1 hora.
</p>
<p style="color:#a8a29e;font-size:12px;">— Equipe SoftHair</p>`;

const CONFIRMATION_SUBJECT_PTBR = 'SoftHair — Confirme seu email';
const CONFIRMATION_TEMPLATE_PTBR = `<h2>Bem-vindo(a) ao SoftHair!</h2>
<p>Olá,</p>
<p>Para ativar sua conta, confirme seu email clicando no botão abaixo:</p>
<p>
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;padding:12px 24px;background-color:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
    Confirmar email
  </a>
</p>
<p style="color:#78716c;font-size:13px;">
  Depois disso você poderá fazer login com o email e senha que cadastrou.
</p>
<p style="color:#a8a29e;font-size:12px;">— Equipe SoftHair</p>`;

const DESIRED_CONFIG: AuthConfigPatch = {
  mailer_secure_password_change: true,
  password_min_length: 8,
  // mailer_autoconfirm left unset so the script does not flip it — per-env
  // decision (recommend OFF in dev, ON in prod) the founder toggles in Dashboard.
  mailer_subjects_recovery: RECOVERY_SUBJECT_PTBR,
  mailer_templates_recovery_content: RECOVERY_TEMPLATE_PTBR,
  mailer_subjects_confirmation: CONFIRMATION_SUBJECT_PTBR,
  mailer_templates_confirmation_content: CONFIRMATION_TEMPLATE_PTBR,
};

async function managementFetch<T = unknown>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `https://api.supabase.com${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Supabase Management API ${res.status} ${res.statusText} on ${path}\n${body}`,
    );
  }
  return (await res.json()) as T;
}

async function getAuthConfig(token: string, ref: string) {
  return managementFetch<Record<string, unknown>>(
    token,
    `/v1/projects/${ref}/config/auth`,
  );
}

async function patchAuthConfig(
  token: string,
  ref: string,
  patch: AuthConfigPatch,
) {
  return managementFetch(token, `/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

function diff(
  current: Record<string, unknown>,
  desired: AuthConfigPatch,
): AuthConfigPatch {
  const out: AuthConfigPatch = {};
  for (const [key, value] of Object.entries(desired)) {
    if (current[key] !== value) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

function truncate(v: unknown, max = 80): string {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (!s) return '<empty>';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error('❌ SUPABASE_ACCESS_TOKEN not set.');
    console.error(
      '   Create one at https://supabase.com/dashboard/account/tokens then:',
    );
    console.error('     export SUPABASE_ACCESS_TOKEN=sbp_...');
    console.error('     pnpm tsx scripts/supabase-auth-setup.ts');
    process.exit(1);
  }

  const rl = createInterface({ input, output });

  console.log('\n🔐 SoftHair — Supabase Auth config (ADR-0003 email+password pivot)');
  console.log('================================================================\n');

  for (const target of TARGETS) {
    if (!target.ref) {
      const ref = (
        await rl.question(
          `Project ref for ${target.label} (ex: abcdefghij...): `,
        )
      ).trim();
      if (!ref) {
        console.log(`  Skipping ${target.label} (no ref).\n`);
        continue;
      }
      target.ref = ref;
    }

    console.log(`\n→ ${target.label} (${target.ref})`);
    let current: Record<string, unknown>;
    try {
      current = await getAuthConfig(token, target.ref);
    } catch (err) {
      console.error(`  ✗ Failed to read auth config: ${(err as Error).message}`);
      continue;
    }

    const pendingDiff = diff(current, DESIRED_CONFIG);
    const keys = Object.keys(pendingDiff);
    if (keys.length === 0) {
      console.log('  ✓ Already in desired state. Nothing to do.');
      continue;
    }

    console.log('  Changes to apply:');
    for (const k of keys) {
      const before = truncate(current[k]);
      const after = truncate((pendingDiff as Record<string, unknown>)[k]);
      console.log(`    • ${k}`);
      console.log(`        before: ${before}`);
      console.log(`        after : ${after}`);
    }

    const ans = (
      await rl.question(`  Apply to ${target.label}? [y/N] `)
    )
      .trim()
      .toLowerCase();
    if (ans !== 'y' && ans !== 'yes') {
      console.log('  Skipped.');
      continue;
    }

    try {
      await patchAuthConfig(token, target.ref, pendingDiff);
      console.log('  ✓ Applied.');
    } catch (err) {
      console.error(`  ✗ Apply failed: ${(err as Error).message}`);
    }
  }

  await rl.close();
  console.log('\n✅ Done.\n');
  console.log(
    'Next steps (manual in Dashboard, if you want):\n' +
      '  • Authentication → Email: toggle "Confirm email" OFF in dev / ON in prod\n' +
      '    (script does not flip this — environment-specific decision)\n' +
      '  • Authentication → URL Configuration: already set by previous sprint\n',
  );
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
