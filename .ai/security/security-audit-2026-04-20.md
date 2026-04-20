# Security Audit — SoftHair Initial Schema

**Date:** 2026-04-20
**Scope:** full (RLS coverage + Schema quality + Integrity)
**Auditor:** Dara (Data Engineer Agent) — static review
**Target:** `packages/db/migrations/` + `packages/db/seed.sql`
**Method:** Static code review (DB not yet deployed)

---

## Executive Summary

| Indicator | Value |
|---|---|
| Total tables audited | 16 |
| Tables with RLS enabled | 16 / 16 ✅ |
| Tables with at least 1 policy | 16 / 16 ✅ |
| CRITICAL findings | 0 |
| HIGH findings | 3 |
| MEDIUM findings | 4 |
| LOW findings | 3 |
| **Overall risk score** | **4.2 / 10 (moderate — 3 HIGH issues must be fixed before deploy)** |

**Verdict:** Schema is **not ready for deploy** until the 3 HIGH findings are resolved. Fixes are small and local; ETA for remediation: ~30min of SQL work.

---

## Findings

### 🔴 HIGH-1: Chicken-and-egg em salon creation (bootstrap problem)

**File:** `migrations/20260420000002_rls_policies.sql`
**Tables impacted:** `salons`, `salon_members`

**Issue:**

```sql
-- Policy salons_insert:
CREATE POLICY salons_insert ON public.salons
  FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

-- Policy salon_members_insert (OWNER gate):
CREATE POLICY salon_members_insert ON public.salon_members
  FOR INSERT
  WITH CHECK (public.is_salon_owner(salon_id));
```

Quando o usuário cria um salão pela primeira vez:
1. `INSERT INTO salons` funciona (owner_user_id = auth.uid() passa)
2. `INSERT INTO salon_members (role=OWNER)` **falha** — `is_salon_owner()` verifica se user já está em salon_members com role OWNER, mas ele ainda não está (é o que estamos tentando criar)

**Impact:** Signup flow quebra. Nenhum salão pode ser criado.

**Recommendation:** Ajustar `salon_members_insert` policy para permitir o OWNER inicial quando ele é o `owner_user_id` do salão:

```sql
DROP POLICY salon_members_insert ON public.salon_members;

CREATE POLICY salon_members_insert ON public.salon_members
  FOR INSERT
  WITH CHECK (
    -- Caso 1: OWNER existente adicionando membro
    public.is_salon_owner(salon_id)
    -- Caso 2: Bootstrap — user adicionando a si mesmo como OWNER num salão que ele acabou de criar
    OR (
      user_id = auth.uid()
      AND role = 'OWNER'
      AND EXISTS (
        SELECT 1 FROM public.salons
        WHERE id = salon_id
          AND owner_user_id = auth.uid()
      )
    )
  );
```

---

### 🔴 HIGH-2: Cross-salon FK leak em appointments

**File:** `migrations/20260420000000_initial_schema.sql`
**Tables impacted:** `appointments`

**Issue:**

`appointments.salon_id`, `professional_id`, `service_id`, `client_id` são FKs independentes. RLS garante que user só grava em `appointments` do seu salão, mas não valida que **todas as FKs apontam para o mesmo salão**.

**Attack scenario:**
- Attacker controla salão A
- Se conhece (ou adivinha) UUIDs de professional/service/client do salão B, pode criar appointment com `salon_id=A` mas `professional_id=<B>`
- Não é exploit direto (UUIDs são aleatórios), mas viola defense-in-depth

**Recommendation:** Adicionar trigger `BEFORE INSERT OR UPDATE` validando consistência:

```sql
CREATE OR REPLACE FUNCTION public.validate_appointment_salon_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.salon_id <> (SELECT salon_id FROM public.professionals WHERE id = NEW.professional_id) THEN
    RAISE EXCEPTION 'professional_id não pertence ao salon_id' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.salon_id <> (SELECT salon_id FROM public.services WHERE id = NEW.service_id) THEN
    RAISE EXCEPTION 'service_id não pertence ao salon_id' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.salon_id <> (SELECT salon_id FROM public.clients WHERE id = NEW.client_id) THEN
    RAISE EXCEPTION 'client_id não pertence ao salon_id' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER appointments_validate_salon_consistency
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_salon_consistency();
```

Aplicar lógica análoga em `referrals` (referrer + referred + appointment devem ser do mesmo salão).

---

### 🔴 HIGH-3: salons_select não permite ler salão recém-criado

**File:** `migrations/20260420000002_rls_policies.sql`
**Tables impacted:** `salons`

**Issue:**

```sql
CREATE POLICY salons_select ON public.salons
  FOR SELECT
  USING (id IN (SELECT public.current_user_salon_ids()));
```

Depende de `salon_members`. Se app inserir salão mas ainda não inserir em salon_members (ou transação falhar no meio), user não consegue ler o próprio salão.

**Recommendation:** Adicionar fallback por `owner_user_id`:

```sql
DROP POLICY salons_select ON public.salons;

CREATE POLICY salons_select ON public.salons
  FOR SELECT
  USING (
    id IN (SELECT public.current_user_salon_ids())
    OR owner_user_id = auth.uid()  -- bootstrap + defense-in-depth
  );
```

---

### 🟡 MEDIUM-1: pg_trgm extension não criada automaticamente

**File:** `migrations/20260420000001_indexes.sql`

**Issue:** Índice `idx_clients_name_trgm` usa `gin_trgm_ops` mas a extensão `pg_trgm` não é criada no initial_schema. Migration falhará se extensão não existir.

**Recommendation:** Adicionar `CREATE EXTENSION IF NOT EXISTS pg_trgm;` no topo de `20260420000000_initial_schema.sql`, OR remover o índice fuzzy e deixar para Phase 2.

---

### 🟡 MEDIUM-2: `users_insert` policy dispensável + edge case

**File:** `migrations/20260420000002_rls_policies.sql`

**Issue:**

```sql
CREATE POLICY users_insert ON public.users
  FOR INSERT
  WITH CHECK (id = auth.uid());
```

Em produção Supabase, inserts em `public.users` são feitos via trigger `on_auth_user_created` (service_role), não via app. Policy atual pode conflitar se app tentar inserir por engano. Considerar remover policy inteiramente (RLS nega por padrão) ou usar via `service_role` com trigger.

**Recommendation:** Documentar que `public.users` é populada via trigger `on_auth_user_created` e remover a policy de INSERT (ou substituir por policy que nunca permite INSERT de role não-service).

Nota para o dev: criar trigger `on_auth_user_created` em Story 1.3:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.users (id, phone_e164, name)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
```

---

### 🟡 MEDIUM-3: Missing CHECK em subscription_plan

**File:** `migrations/20260420000000_initial_schema.sql`

**Issue:** `salons.subscription_plan` é TEXT livre. Deve ser validado contra valores conhecidos.

**Recommendation:** Adicionar CHECK ou converter para ENUM:

```sql
ALTER TABLE public.salons
  ADD CONSTRAINT salons_plan_check
  CHECK (subscription_plan IN ('trial', 'base', 'pro', 'enterprise'));
```

---

### 🟡 MEDIUM-4: `settings_jsonb` sem validação de schema

**File:** `migrations/20260420000000_initial_schema.sql`

**Issue:** `salons.settings_jsonb` aceita qualquer JSON. Mudanças de schema não têm migration.

**Recommendation:** Validar schema via função + CHECK constraint OU confiar em validação app-layer com documentação clara. Para MVP solo, app-layer é aceitável. Documentar schema em `packages/core/types/salon-settings.ts` com Zod.

---

### 🟢 LOW-1: DROP EXTENSION comentado no rollback

**File:** `rollback/20260420000000_rollback.sql`

**Issue:** Extensions não são dropadas no rollback. Intencional, mas pode deixar estado intermediário em caso de re-aplicação.

**Recommendation:** Aceitável. Documentado como decisão deliberada. Low priority.

---

### 🟢 LOW-2: Comentários mínimos em algumas policies

**Files:** `migrations/20260420000002_rls_policies.sql`

**Issue:** Policies `*_all` (FOR ALL) não têm COMMENT ON POLICY explicando a intenção.

**Recommendation:** Adicionar `COMMENT ON POLICY` em policies críticas. Não-bloqueante.

---

### 🟢 LOW-3: `phone_e164` format check permite números internacionais

**File:** `migrations/20260420000000_initial_schema.sql`

**Issue:** CHECK `'^\+[1-9][0-9]{10,14}$'` aceita números de qualquer país. Para MVP BR-only, poderia ser mais estrito (`'^\+55[0-9]{10,11}$'`).

**Recommendation:** Manter permissivo (E.164 global standard). Quando expandir para LATAM (brief menciona México/Colômbia), já está pronto. Documentar app-layer que UI só aceita BR inicialmente.

---

## Schema Quality — Positive Findings ✅

Itens validados e **aprovados**:

- ✅ RLS habilitada em todas as 16 tabelas
- ✅ Todas as tabelas de domínio têm `salon_id` NOT NULL
- ✅ Helper `current_user_salon_ids()` corretamente SECURITY DEFINER + `search_path`
- ✅ Ledger imutável (`client_credits_log`, `appointment_status_log`) via trigger
- ✅ Race condition em credit sync mitigada via `SELECT ... FOR UPDATE`
- ✅ Idempotência: todas CREATE usam `IF NOT EXISTS`; enums usam DO $$ ... EXCEPTION WHEN duplicate_object
- ✅ Soft delete implementado onde necessário (clients, professionals, services, appointments)
- ✅ Índices cobrem os access patterns críticos (conflict detection, dashboard hoje)
- ✅ CHECK constraints em campos críticos (%, valores monetários >= 0, duração múltiplo de 15min)
- ✅ Unique constraints protegem integridade (slug por salão, phone por salão)
- ✅ `ends_at` generated column elimina inconsistência entre scheduled_at e duração
- ✅ `deleted_at` soft delete com partial indexes (`WHERE deleted_at IS NULL`)
- ✅ FK policies ponderadas: CASCADE para rows filhas; RESTRICT para entidades com histórico
- ✅ Auditoria completa: status_log + credits_log + messaging_log
- ✅ Rollback script completo e documentado

## Performance Validation ✅

- ✅ `idx_appointments_professional_time` — conflict detection O(log n)
- ✅ `idx_appointments_salon_date` — dashboard /hoje <50ms esperado
- ✅ `idx_clients_name_trgm` — busca fuzzy (pending extension pg_trgm — ver MEDIUM-1)
- ✅ Partial indexes reduzem overhead de soft-deleted rows

## LGPD Compliance ✅

- ✅ `lgpd_consent_at` em `clients` (timestamp de consentimento)
- ✅ `deleted_at` permite soft-delete mantendo trilha de auditoria (LGPD art. 16)
- ✅ Triggers de imutabilidade em ledgers garantem audit trail
- ✅ Messaging log não persiste PII no `payload_jsonb` (a garantir no app-layer)

## Action Plan

### Imediato (bloqueia deploy)

- [ ] **Fix HIGH-1:** ajustar `salon_members_insert` policy (bootstrap OWNER)
- [ ] **Fix HIGH-2:** adicionar trigger `validate_appointment_salon_consistency` em appointments + referrals
- [ ] **Fix HIGH-3:** ajustar `salons_select` policy (fallback owner_user_id)
- [ ] **Fix MEDIUM-1:** adicionar `CREATE EXTENSION pg_trgm` OR remover índice fuzzy

### Antes do design-partner #1

- [ ] **Fix MEDIUM-2:** criar trigger `on_auth_user_created` + remover `users_insert` policy
- [ ] **Fix MEDIUM-3:** CHECK constraint em `salons.subscription_plan`
- [ ] Rodar smoke tests RLS com `test-as-user` simulando:
  - User A tentando SELECT dados do salão B → deve falhar
  - User A tentando INSERT em tabela do salão B → deve falhar
  - User A sem salon_members tentando qualquer coisa → deve falhar
  - User A (OWNER) removendo a si mesmo como OWNER → deve funcionar (app-layer valida regra de "último OWNER")

### Nice-to-have (pós-MVP)

- [ ] **Fix MEDIUM-4:** validação estrutural de `settings_jsonb` via função
- [ ] **Fix LOW-2:** COMMENT ON POLICY em policies críticas

---

## Recommendation

**NÃO APLICAR EM STAGING/PROD** sem resolver os 3 HIGH findings. Os 3 fixes são pontuais, ~30min de trabalho, e eu posso gerar uma nova migration `20260420000004_security_fixes.sql` corrigindo tudo se quiser.

Alternativa: corrigir diretamente os arquivos `20260420000000_initial_schema.sql` e `20260420000002_rls_policies.sql` antes do primeiro commit — preferível enquanto o repo não tem nada mergeado.

---

## Remediation Status (update 2026-04-20)

**Decisão tomada:** correção inline nos arquivos (opção escolhida pelo founder).

| Finding | Status | File affected |
|---|---|---|
| HIGH-1 (bootstrap OWNER) | ✅ **FIXED** | `migrations/20260420000002_rls_policies.sql` — `salon_members_insert` policy ajustada |
| HIGH-2 (cross-salon FK leak) | ✅ **FIXED** | `migrations/20260420000003_functions_and_triggers.sql` — 2 novos triggers (`appointments` + `referrals`) |
| HIGH-3 (salons_select bootstrap) | ✅ **FIXED** | `migrations/20260420000002_rls_policies.sql` — fallback `owner_user_id = auth.uid()` |
| MEDIUM-1 (pg_trgm extension) | ✅ **FIXED** | `migrations/20260420000000_initial_schema.sql` — `CREATE EXTENSION pg_trgm` adicionado |
| MEDIUM-2 (auth user trigger) | ⏳ Aguardando Story 1.3 implementar `on_auth_user_created` trigger |
| MEDIUM-3 (subscription_plan CHECK) | ⏳ Pendente — não-bloqueante |
| MEDIUM-4 (settings_jsonb schema) | ⏳ Pós-MVP (validação app-layer suficiente) |

**Rollback script** também atualizado para dropar os novos triggers/functions.

**Nova verdict:** schema **pronto para deploy em staging** após Story 1.1/1.2 completas.

— Dara, arquitetando dados 🗄️
