# packages/db — SoftHair Database

**Stack:** Supabase (Postgres 15) + RLS multi-tenant
**Versão:** v0.2.1 (Story 1.2 applied; scope change 2026-04-21)
**Owner:** @data-engineer (Dara)

Estado de banco do SoftHair — migrations, RLS, types TypeScript gerados, smoke tests.

> ⚠️ **SCOPE CHANGE 2026-04-21:** Tables `whatsapp_templates`, `messaging_log`, `invoices` e o seed de WA templates são **dormant até Phase 2** (WhatsApp + NFS-e saíram do MVP). Schema preservado sem cost/harm. Ver [change record](../../docs/change-records/2026-04-21-mvp-scope-reduction.md).

---

## Estrutura

```
project-squad/
├── supabase/                                    # ← CLI Supabase aponta aqui (git root)
│   ├── config.toml                              # CLI config (project_id = soft-hair)
│   └── migrations/
│       ├── 20260420000000_initial_schema.sql    # 16 tabelas + 13 enums + constraints
│       ├── 20260420000001_indexes.sql           # 30+ índices de performance
│       ├── 20260420000002_rls_policies.sql      # RLS multi-tenant via current_user_salon_ids()
│       ├── 20260420000003_functions_and_triggers.sql  # Ledger, status log, FK consistency
│       └── 20260420000004_seed_catalog.sql      # Seed: 20 serviços + 6 templates WA (idempotent)
└── packages/db/
    ├── types/
    │   ├── database.ts                          # Types gerados (DO NOT EDIT — regen via script)
    │   └── index.ts                             # Re-exports + convenience aliases
    ├── tests/
    │   └── rls-smoke.test.ts                    # RLS + seed validation
    ├── rollback/
    │   └── 20260420000000_rollback.sql          # Emergency drop (todas as 5 migrations)
    ├── package.json                              # Scripts gen:types, push, test
    ├── tsconfig.json
    ├── vitest.config.mts
    └── README.md                                 # Este arquivo
```

---

## Comandos principais

```bash
# Aplicar migrations em softhair-dev (linked)
pnpm --filter @softhair/db push

# Dry run (ver o que seria aplicado, sem executar)
pnpm --filter @softhair/db push:dry

# Regerar types TypeScript a partir do DB linkado
pnpm --filter @softhair/db gen:types

# Rodar smoke tests RLS contra DB linkado
pnpm --filter @softhair/db test

# Typecheck do package
pnpm --filter @softhair/db typecheck
```

---

## Setup inicial (primeira vez)

### 1. Link ao projeto Supabase

```bash
# Garanta que SUPABASE_ACCESS_TOKEN esteja em .env.local
# Personal Access Token do dashboard: https://supabase.com/dashboard/account/tokens

export $(grep SUPABASE_ACCESS_TOKEN .env.local | head -1)
pnpm exec supabase link --project-ref <project-ref>
```

Project ref é o subdomain do seu URL Supabase (`https://<ref>.supabase.co`).

### 2. Aplicar migrations

```bash
pnpm --filter @softhair/db push
```

CLI vai pedir confirmação antes de aplicar no remote.

### 3. Gerar types

```bash
pnpm --filter @softhair/db gen:types
```

Output: `packages/db/types/database.ts` (1120 linhas, ~16 tabelas).

### 4. Rodar smoke tests

```bash
pnpm --filter @softhair/db test
```

Expected: **20 pass + 5 todo** (TODOs aguardam Story 1.3 auth).

---

## Modelo de dados (resumo)

**16 entidades** organizadas em 4 domínios:

| Domínio | Tabelas |
|---|---|
| **Identity & tenancy** | `users`, `salons`, `salon_members` |
| **Catálogo** | `service_catalog` (global), `services`, `professionals` |
| **Operação** | `clients`, `appointments`, `appointment_status_log`, `commission_entries` |
| **Monetização & compliance** | `invoices`, `referral_tokens`, `referrals`, `client_credits_log`, `messaging_log`, `whatsapp_templates` |

ER completo: `docs/architecture.md §Data Models`.

---

## Multi-tenancy & RLS

**Princípio:** toda tabela de domínio tem `salon_id` e é protegida por RLS.

- Helper: `current_user_salon_ids()` retorna set de salões do user autenticado (SECURITY DEFINER)
- Pattern: `USING (salon_id IN (SELECT current_user_salon_ids()))`
- `service_catalog` + `whatsapp_templates` são públicos/admin (RLS ENABLE com policies diferentes)
- Escritas sensíveis (comissão, credit ledger, status log) bloqueadas via RLS — apenas triggers (SECURITY DEFINER) ou service_role inserem

**Bootstrap fixes aplicados (HIGH-1 a HIGH-3 do security-audit):**
- `salon_members_insert`: aceita OWNER criando a si mesmo no salão recém-criado
- `salons_select`: fallback `owner_user_id = auth.uid()` permite ler salão antes de salon_members popular
- Cross-salon FK triggers: `appointments` e `referrals` validam que todas FKs apontam pro mesmo `salon_id`

---

## Supabase specifics (gotchas aplicados)

1. **Extensions em schema `extensions`**: usamos `extensions.citext`, `extensions.gin_trgm_ops` (prefixed) pois Supabase isola extensions do search_path padrão.

2. **`gen_random_uuid()` em vez de `uuid_generate_v4()`**: built-in Postgres 13+, evita dependência do `uuid-ossp` que é isolado.

3. **Trigger em vez de generated column**: `appointments.ends_at` é computed via BEFORE INSERT/UPDATE trigger porque Postgres rejeita `int * interval` como IMMUTABLE em generated columns.

4. **Index `idx_referral_tokens_expires` sem WHERE**: `NOW()` não é IMMUTABLE, partial index predicate rejeitado — index full funciona bem.

---

## TODO pós-Story 1.2

### Crítico (antes do design-partner #1)

- [ ] **Expandir `service_catalog` para 200+ serviços** (seed placeholder atual: 20)
- [ ] **Aplicar migrations em softhair-prod** (aguardando confirmação do founder)
- [ ] **Submeter 6 templates WhatsApp à Meta** via Business Manager (Story 3.3)
- [ ] **Rotacionar service_role_key de softhair-dev** (exposto em conversa anterior — best practice)
- [ ] **Criar primeiro user superadmin (founder)** via SQL direto:
  ```sql
  -- Após Story 1.3 estar deployed e você ter feito login
  UPDATE public.users SET is_superadmin = TRUE WHERE phone_e164 = '+55119XXXXXXXX';
  ```

### Fast-follow (Story 1.3+)

- [ ] Criar trigger `on_auth_user_created` para auto-inserir em public.users (MEDIUM-2 do security audit)
- [ ] Adicionar full impersonation tests (5 TODOs no rls-smoke.test.ts)
- [ ] CHECK constraint em `salons.subscription_plan` (MEDIUM-3)
- [ ] Zod validation de `salons.settings_jsonb` (MEDIUM-4)

### Fase 2

- [ ] Materialized view para CalendarView (mês com 600+ agendamentos)
- [ ] Partitioning de `messaging_log` e `appointment_status_log` (quando >10M rows)
- [ ] Backup verify via restore test mensal

---

## Rollback de emergência

```bash
# Conectar direto ao DB (precisa DB password):
psql "postgresql://postgres:$DB_PASSWORD@db.<ref>.supabase.co:5432/postgres" \
  -f packages/db/rollback/20260420000000_rollback.sql
```

⚠️ **ATENÇÃO:** deleta TODOS os dados. Em produção, preferir Supabase PITR via dashboard.

---

## Convenções

- **Naming:** `snake_case` tables/columns; enums `SCREAMING_SNAKE_CASE`
- **PKs:** UUID sempre (`gen_random_uuid()`)
- **Timestamps:** `created_at`/`updated_at` (trigger auto) + `deleted_at` (soft delete)
- **FKs:** CASCADE para rows filhas; RESTRICT para entidades com histórico
- **Decimais de dinheiro:** `NUMERIC(10,2)` (exceção: mensageria `NUMERIC(10,4)`)
- **Enums:** Postgres nativos
- **Idempotência:** `CREATE IF NOT EXISTS` + `ON CONFLICT DO NOTHING` em seeds

---

## Links

- Architecture: `docs/architecture.md`
- Front-end spec: `docs/front-end-spec.md`
- Security audit: `.ai/security/security-audit-2026-04-20.md`
- Supabase dashboard: https://supabase.com/dashboard/project/<ref>
- Supabase docs: https://supabase.com/docs
