# packages/db — SoftHair Database

**Stack:** Supabase (Postgres 15) + RLS multi-tenant
**Versão:** v0.1.0 (MVP schema inicial)
**Owner:** @data-engineer (Dara)

Este pacote contém todo o estado de banco do SoftHair:
- Schema DDL (tabelas, enums, constraints, índices)
- RLS policies (multi-tenancy por `salon_id`)
- Functions + triggers (status log, credit ledger, conflict detection)
- Seed de dados iniciais (catálogo + templates WhatsApp)
- Scripts de rollback

---

## Estrutura

```
packages/db/
├── migrations/
│   ├── 20260420000000_initial_schema.sql        # 16 tabelas + enums + constraints
│   ├── 20260420000001_indexes.sql               # Índices críticos de performance
│   ├── 20260420000002_rls_policies.sql          # RLS multi-tenant
│   └── 20260420000003_functions_and_triggers.sql # Triggers + helpers
├── rollback/
│   └── 20260420000000_rollback.sql              # Drop tudo em emergência
├── seed.sql                                      # Catálogo placeholder + templates WA
└── README.md                                     # Este arquivo
```

---

## Aplicando migrations

### Local (Supabase CLI)

```bash
# 1. Iniciar Supabase local
pnpm supabase start

# 2. Aplicar migrations em ordem
pnpm supabase db push

# OU manualmente via psql
psql $SUPABASE_DB_URL -f migrations/20260420000000_initial_schema.sql
psql $SUPABASE_DB_URL -f migrations/20260420000001_indexes.sql
psql $SUPABASE_DB_URL -f migrations/20260420000002_rls_policies.sql
psql $SUPABASE_DB_URL -f migrations/20260420000003_functions_and_triggers.sql

# 3. Aplicar seed
psql $SUPABASE_DB_URL -f seed.sql
```

### Supabase Cloud (staging / prod)

**Gate:** apenas `@devops` (Gage) pode aplicar migrations em staging/prod.

```bash
# Link ao projeto
supabase link --project-ref <project-ref>

# Aplicar (faz snapshot automático antes)
supabase db push --include-seed

# Ou aplicar migration individual
supabase db push migrations/20260420000000_initial_schema.sql
```

---

## Rollback de emergência

```bash
psql $SUPABASE_DB_URL -f rollback/20260420000000_rollback.sql
```

**⚠️ ATENÇÃO:** deleta TODOS os dados. Em produção, preferir Supabase Point-in-Time Recovery (PITR) via dashboard.

---

## Modelo de dados (resumo)

**16 entidades** organizadas em 4 domínios:

| Domínio | Tabelas |
|---|---|
| **Identity & tenancy** | `users`, `salons`, `salon_members` |
| **Catálogo** | `service_catalog` (global), `services` (por salão), `professionals` |
| **Operação** | `clients`, `appointments`, `appointment_status_log`, `commission_entries` |
| **Monetização & compliance** | `invoices` (NFS-e), `referral_tokens`, `referrals`, `client_credits_log`, `messaging_log`, `whatsapp_templates` |

**Diagrama ER completo:** `docs/architecture.md` seção Data Models.

---

## Multi-tenancy & RLS

**Princípio:** toda tabela de domínio tem `salon_id` e é protegida por RLS.

- Helper: `current_user_salon_ids()` retorna set de salões do user autenticado
- Pattern padrão: `USING (salon_id IN (SELECT current_user_salon_ids()))`
- `service_catalog` + `whatsapp_templates` são públicos (read-only sem `salon_id`)
- Escritas sensíveis (comissão, ledger, status log) são bloqueadas via RLS — apenas triggers/workers (SECURITY DEFINER / service_role) podem inserir

**Teste de RLS:**
```sql
-- Simular user autenticado (supabase)
SELECT set_config('request.jwt.claims', '{"sub":"<user-uuid>"}', true);
-- Deveria retornar apenas rows do(s) salão(ões) desse user
SELECT * FROM clients;
```

---

## TODO pós-MVP setup

### Crítico (antes do design-partner #1)

- [ ] **Expandir seed `service_catalog` para 200+ serviços** (ver comentário em `seed.sql`)
- [ ] **Submeter 6 templates WhatsApp à Meta** via Business Manager
- [ ] **Atualizar `meta_status` para `APPROVED`** após Meta aprovar cada template
- [ ] **Executar `security-audit full`** — validação de RLS end-to-end
- [ ] **Smoke test** — `pnpm db:smoke-test` rodando cenários positivos+negativos
- [ ] **Criar primeiro usuário superadmin** (founder) manualmente em Supabase Dashboard:
  ```sql
  UPDATE public.users SET is_superadmin = TRUE WHERE phone_e164 = '+55119XXXXXXXX';
  ```

### Fast-follow (Fase 2)

- [ ] Adicionar `pg_trgm` extension para busca fuzzy em `clients.name`
- [ ] Criar materialized view para CalendarView month-view (agregação mensal pré-computada)
- [ ] Partitioning de `messaging_log` e `appointment_status_log` por mês (quando tabelas passarem de 10M rows)
- [ ] Backup verificado via restore test mensal

---

## Convenções adotadas

- **Naming:** `snake_case` para tables/columns; enums em `SCREAMING_SNAKE_CASE`
- **PKs:** sempre UUID (`uuid_generate_v4()`)
- **Timestamps:** `created_at` + `updated_at` (trigger auto) + `deleted_at` (soft delete onde aplicável)
- **FKs:** `ON DELETE CASCADE` para tabelas-filhas; `ON DELETE RESTRICT` para entidades que precisam preservar histórico (appointments, clients)
- **Decimais de dinheiro:** `NUMERIC(10,2)` exceto custo de mensageria que usa `NUMERIC(10,4)` (fracionário)
- **Enums:** Postgres nativos (não CHECK constraints)
- **Idempotência:** todos os CREATE são `IF NOT EXISTS`; todos os inserts de seed usam `ON CONFLICT DO NOTHING`

---

## Queries críticas (performance reference)

### CalendarView (dashboard /agenda)

```sql
-- Todos os agendamentos do dia, por profissional
SELECT a.*, c.name AS client_name, p.name AS professional_name, s.name AS service_name
  FROM appointments a
  JOIN clients c ON c.id = a.client_id
  JOIN professionals p ON p.id = a.professional_id
  JOIN services s ON s.id = a.service_id
 WHERE a.salon_id = $1
   AND a.scheduled_at >= $2::date
   AND a.scheduled_at < $2::date + INTERVAL '1 day'
   AND a.deleted_at IS NULL
 ORDER BY a.scheduled_at;
```

Índice usado: `idx_appointments_salon_date` (partial, deleted_at IS NULL).

### Conflict detection

```sql
SELECT public.check_appointment_conflict(
  p_salon_id := $1,
  p_professional_id := $2,
  p_scheduled_at := $3,
  p_duration_minutes := $4
);
```

Complexidade: O(log n) via índice `idx_appointments_professional_time`.

### Dashboard de custo de mensageria

```sql
SELECT public.salon_messaging_cost_month($salon_id, 2026, 4);
```

---

## Links

- Architecture: `docs/architecture.md`
- Front-end spec: `docs/front-end-spec.md`
- Supabase docs: https://supabase.com/docs
- Nuvem Fiscal API (ADR-0002): https://api.nuvemfiscal.com.br/docs
