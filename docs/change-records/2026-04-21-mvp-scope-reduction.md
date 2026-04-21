# Change Record: MVP Scope Reduction (WhatsApp + NFS-e → Phase 2)

**Data:** 2026-04-21
**Tipo:** Change-heavy (scope reduction)
**Owner:** Founder (GilsonJunior-Developer)
**Facilitator:** Pax (PO)
**Status:** APPROVED — execution in progress

---

## Decision

**Remover do MVP:** WhatsApp Business API integration + NFS-e emission.
**Manter em Phase 2:** ambas features reaparecem após PMF validado com design-partners.
**Substituir auth por:** Email Magic Link (Supabase nativo).

---

## Motivation (founder rationale)

> "Focar o MVP funcional para a etapa de gestão. Depois de validado em cliente em produção, aí sim, trabalhamos a evolução envolvendo WhatsApp e NFS-e."

**Tradução operacional:**
- Priorizar **validação funcional** do core (agenda + comissão + CRM + onboarding) com design-partners reais
- Reduzir **risco de execução** (Meta Business Account approval, Chatwoot deploy, Nuvem Fiscal complexity)
- Reduzir **custo operacional** do MVP (~R$ 150-300/mês economizados)
- Reduzir **time-to-first-design-partner** (~1 mês)
- Post-PMF: retomar features com dados reais do que salões efetivamente pedem

---

## Scope impact

### Features REMOVED from MVP (move to Post-MVP Vision)

| Feature | Original epic | Scope |
|---|---|---|
| WhatsApp Business API integration | Epic 3 | Remove entire Epic 3 |
| WhatsApp auth (magic link) | Story 1.3 | Replace with email magic link |
| WhatsApp confirmation 24h | Epic 3 | Phase 2 |
| WhatsApp reminder 2h | Epic 3 | Phase 2 |
| WhatsApp status update from response | Epic 3 | Phase 2 |
| Chatwoot self-hosted orchestration | Architecture | Remove |
| NFS-e emission integration | Stories 4.5, 4.6, 4.7 | Phase 2 |
| NFS-e client delivery via WhatsApp | Story 4.7 | Phase 2 |

### Features KEPT in MVP (unchanged or minor adjustment)

- Salon onboarding (Story 1.4)
- Professional profile (1.5)
- Service catalog (1.6)
- Dashboard "Hoje" (1.7)
- Calendar/agenda (2.1)
- Manual appointment creation (2.2)
- Public booking link (2.3)
- Client self-booking (2.4) — confirmação vira email-only
- Client history (2.5)
- Appointment status lifecycle (2.6)
- Client-side mgmt via link (2.7) — `cancel_token` continua, acessado via URL email
- Commission rule engine (4.1)
- Commission calculation (4.2)
- Monthly commission report (4.3)
- Basic financial dashboard (4.4)
- Indicação C2C (5.x) — notificações via email, link copiável via share button

### Auth replacement (Story 1.3 refactor)

**Escolha aprovada:** Email magic link via Supabase Auth nativo (`signInWithOtp`)

- Owner/recepcionista: email + magic link → session
- No password, no SMS cost, no WhatsApp BSP dependency
- Supabase Auth já tem isso built-in (~10 linhas de código)
- Email é canal natural para owner (recibos, notas, reports)

---

## Business impact

### Novo MVP differentiator (vs Trinks/Avec/caderno)

**Antes:** "Bundle completo sem gating — NFS-e + WhatsApp + comissão no plano base"
**Agora:** **Simplicidade + UX moderna + Preço agressivo**

- Trinks = complicado + add-ons + R$ 76/mês
- Avec = gating agressivo + admin "horrível" (reviews) + R$ 89,90/mês
- SoftHair = gestão **simples e bonita** + **zero gating** + **R$ 40-60/mês** (estimativa — a validar)

### Pricing hypothesis (update)

**Antes:** R$ 60-80/mês (absorvendo WhatsApp cost + Nuvem Fiscal fee)
**Agora:** **R$ 40-60/mês** (sem custos variáveis → margem permite preço mais baixo)

⚠️ **Validação necessária:** pricing final deve ser testado com design-partners antes de lockar.

### Competitor positioning (update)

- Blue oceans originais (voice booking, indicação C2C, rentabilidade granular) continuam válidos
- WhatsApp automation sai como diferencial — **concorrentes têm isso, nós não teremos** (aceitável no MVP, salão continua usando WhatsApp manual como antes)
- Indicação C2C ainda é whitespace — funciona sem WhatsApp (link copiável + email)

---

## Architectural impact

### Components REMOVED

- **Chatwoot self-hosted** (Railway) — não precisa deploy
- **WhatsApp BSP** (Meta Cloud API direto — ADR-0001) — obsoleto
- **Nuvem Fiscal** (ADR-0002) — obsoleto
- **Inngest workers** para confirm/remind WhatsApp — mantém Inngest mas escopo reduzido (só cron cleanup + referral confirmation)

### Components ADDED

- **Supabase Auth email magic link** (nativo — já instalado)
- Opcional futuro: transactional email provider (Resend, Postmark) — não bloqueador

### Components KEPT

- Next.js 15 + Supabase Postgres + RLS + Tailwind + shadcn/ui
- Vercel deploy
- packages/core (booking, commission, referral engines)
- packages/db (schema já aplicado — tables whatsapp_templates/messaging_log viram dead code, **não removemos** — zero harm, zero refactor cost)

### Schema impact

- **Não remover** tabelas `whatsapp_templates`, `messaging_log`, `invoices` — zero data, zero referências ativas, remoção exigiria nova migration + rollback review
- **Aceitar dead tables** até Phase 2 quando voltam a ser usadas
- Isso simplifica a refatoração significativamente

---

## Documentation impact

| Doc | Ação |
|---|---|
| `docs/prd.md` | Move FRs + stories de WhatsApp/NFS-e para "Post-MVP Vision". Atualiza Goals + Business Objectives + KPIs. Atualiza differentiator. |
| `docs/architecture.md` | Remove Chatwoot do stack. ADR-0001 + ADR-0002 status=DEFERRED. Remove sequence diagram de messaging loop. |
| `docs/brief.md` | Atualiza differentiators (simplicidade+UX+preço). Atualiza pricing (R$ 40-60). Move WhatsApp/NFS-e para "Expansion Opportunities". |
| `docs/front-end-spec.md` | Nenhuma mudança imediata (telas de WhatsApp config seriam só em Epic 3 — nunca foram desenhadas) |
| `docs/competitor-analysis.md` | Anotar no apêndice que "WhatsApp bundling" é Phase 2, não MVP |
| `docs/stories/1.3.magic-link-auth.md` | **Refatorar** — WhatsApp → email magic link |
| `docs/stories/2.7.*` | Ajustar — cancel_token link enviado por email, não WhatsApp |
| `docs/stories/5.3.*` | Ajustar — referral_success notification via email |
| Stories Epic 3 (3.x) | Movidas para Phase 2 no backlog (stories ainda não foram formalizadas em `docs/stories/`) |
| Stories 4.5, 4.6, 4.7 | Movidas para Phase 2 no backlog (idem) |
| `packages/db/README.md` | Nota sobre tabelas dormentes até Phase 2 |

---

## MVP scope — novo total

| Antes | Agora |
|---|:-:|
| 5 epics, 31 stories | **4 epics ativos, ~22 stories** |
| Epic 3 inteiro + 3 stories do 4 removidos | -30% scope |
| ~12 semanas | **~8-9 semanas** estimadas |

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|---|:-:|---|
| Differentiator fraco vs Trinks/Avec sem WhatsApp bundle | MEDIUM | Focar em UX + preço agressivo + indicação C2C; validar com design-partners cedo |
| Salão acha "faltam features" e não paga | MEDIUM | Design-partner discovery — entrevistar 5 salões ANTES de vender; ajustar pitch |
| Dead tables no schema causam confusão | LOW | Comentar com `COMMENT ON TABLE ... IS 'dormant — Phase 2 feature'` |
| Re-introduzir WhatsApp/NFS-e em Phase 2 requer trabalho repetido | LOW | Stories originais preservadas no PRD (movidas, não deletadas). Architecture ADRs ficam como "DEFERRED" não "REJECTED" |
| Post-MVP revisão do diferencial pode mudar estratégia | LOW | Aceitável — MVP é para aprender, não para finalizar |

---

## Action plan (order of operations)

### Imediato (antes de Story 1.3 restart)

1. **Eu (Pax)** — este Change Record ✅ (você está lendo)
2. **@pm (Morgan)** — atualizar `docs/prd.md` + shards:
   - Mover Epic 3 inteiro para "Post-MVP Vision"
   - Mover Stories 4.5-4.7 para "Post-MVP Vision"
   - Ajustar FR8, FR9, FR10 (WhatsApp confirmation/reminder) → Phase 2 notes
   - Ajustar FR13, FR14 (NFS-e) → Phase 2 notes
   - Ajustar FR19 (WhatsApp magic link) → email magic link
   - Atualizar Business Objectives + KPIs (sem cota de mensageria, sem taxa NFS-e)
   - Atualizar MVP Success Criteria (remove "100% design-partners usam WhatsApp+NFS-e")
3. **@architect (Aria)** — atualizar `docs/architecture.md`:
   - ADR-0001 + ADR-0002: status ACCEPTED → **DEFERRED (Phase 2)**
   - Remove Chatwoot do Platform diagram
   - Remove workflow 2 (WhatsApp messaging loop)
   - Atualiza Tech Stack table (Chatwoot + WhatsApp API → Phase 2)
4. **@analyst (Atlas)** — atualizar `docs/brief.md`:
   - Differentiators: simplicidade + UX + preço agressivo
   - Pricing hypothesis: R$ 40-60/mês
   - Post-MVP Vision: adiciona WhatsApp automation + NFS-e como Phase 2 features
5. **@sm (River)** — refatorar stories afetadas:
   - Story 1.3: rewrite completo (WhatsApp → email magic link)
   - Story 2.7: cancel_token via email
   - Story 5.3: referral_success via email
6. **Eu (Pax)** — re-validar as 3 stories refatoradas (change-checklist)

### Post-MVP (quando voltarem Epic 3 + NFS-e)

- Retomar stories originais do PRD (ainda em `docs/prd/epic-3-*` + `docs/prd/epic-4-finance-commission-nfs-e.md`)
- Reativar ADRs originais (mudar DEFERRED → ACCEPTED)
- Revalidar necessidade baseado em feedback de design-partners

---

## Approval

- [x] Founder: "auth=1, diferencial=simplicidade+UX+preço" (2026-04-21)
- [x] PO (Pax): Change Record drafted + action plan mapeado

**Execution authorized.**
