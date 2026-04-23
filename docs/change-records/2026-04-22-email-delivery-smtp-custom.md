# Sprint Change Proposal — Entrega de Email Transacional via SMTP Custom

**Data:** 2026-04-22
**Tipo:** Change-heavy (technical constraint + missing requirement + PRD drift)
**Owner:** Founder (GilsonJunior-Developer)
**Facilitator:** Orion (aiox-master) via `*correct-course` (YOLO mode)
**Status:** PARTIALLY APPROVED — doc corrections aplicadas; Story 1.8 (SMTP custom) deferida para backlog por decisão do Founder (ver Section 11)
**Change checklist completude:** Sections 1–5 analisadas
**Gatilho técnico:** `docs/qa/bug-inp-performance-2026-04-21.md` é não-relacionado; ver Section 1 abaixo

---

## 1. Identified Issue Summary

### O que aconteceu (evidência factual via Supabase MCP em `softhair-prod`)

Teste manual do pivot ADR-0003 (magic link → email+senha) falhou no passo de recuperação de senha em produção:

1. **23:53:15 UTC** (20:53 SP): `POST /recover` status `200` OK — Supabase aceitou, setou `recovery_sent_at` no banco, disparou email via built-in service.
2. **00:12:04 UTC** (21:12 SP): `POST /recover` status `429` — `error: "email rate limit exceeded"`.
3. **00:13:32 UTC** (21:13 SP): `POST /recover` status `429` — idem.

Usuário em prod: `contato.uralabs@gmail.com` com `has_password: true`. **Email das 23:53 não chegou à caixa do Founder** (nem no spam, segundo validação do Founder).

### Análise de causa-raiz

**Camada 1 — Rate limit:** Supabase built-in email service tem limite **4 emails/hora por destinatário**. Tentativas 2 e 3 bateram nesse limite.

**Camada 2 — Entrega (causa dominante):** o primeiro email (que PASSOU o rate limit) também não chegou. Isso implica falha de entrega do Supabase built-in email service, cujas características são **públicas e conhecidas**:

- IP compartilhado de baixa reputação
- Sem domain verification (SPF/DKIM/DMARC no domínio do usuário)
- Classificado como "promocional" ou "spam" pela maioria dos MTAs modernos (Gmail, Outlook 365)
- Documentação oficial do Supabase recomenda **NÃO usar em produção**: https://supabase.com/docs/guides/auth/auth-smtp

### Classificação (checklist Section 1)

| Pergunta | Resposta |
|---|---|
| Technical limitation/dead-end? | **Sim** — limite técnico/comercial do serviço built-in |
| Newly discovered requirement? | **Sim** — necessidade de SMTP custom não estava explicitada na Story 1.3 (apenas menção em "Known gotchas" como *"não crítico no MVP"*) |
| Fundamental misunderstanding? | **Parcial** — o time assumiu que built-in SMTP era aceitável para MVP com 20 design-partners; a realidade de entrega provou que não |
| Pivot baseado em feedback real? | **Sim** — feedback: Founder testou em prod, não recebeu email |
| Failed/abandoned story? | **Não** — pivot da Story 1.3 permanece válido; o que falhou é a camada de entrega |

### Assumption incorreta identificada

Documentada na Story 1.3, Dev Notes → "Known gotchas":
> *"Para produção com alto volume, configurar custom SMTP (Resend, Postmark) — **não crítico no MVP**."*

Essa assumption se provou falsa. **Sem SMTP custom, o MVP não é operável em produção** — usuários não conseguem recuperar senha, e Epic 2 Story 2.7 (cliente gerenciando agendamento via link por email) também ficará inviável.

---

## 2. Epic Impact Summary

### Current epic (Epic 1 — Foundation & Salon Onboarding)

| Pergunta | Resposta |
|---|---|
| Current epic completável? | **Sim**, com adição de uma story nova (1.8 — SMTP Custom) |
| Epic precisa de modificação? | **Sim** — adição de Story 1.8 (new) + revisão de Story 1.3 Dev Notes |
| Epic precisa ser redefinido? | **Não** — o goal do Epic 1 ("base técnica do produto + primeiro fluxo de valor") está preservado |

### Future epics

| Epic | Status | Impacto |
|---|---|---|
| Epic 2 — Core Booking Loop | Em execução (Sprint 2.A entregue) | **Depende de SMTP:** Story 2.7 envia URL de gestão por email; Story 2.4 captura email do cliente. Precisa Story 1.8 antes de Sprint 2.C validar 2.7 em prod |
| Epic 3 — WhatsApp Messaging | Phase 2 (pós-MVP) | Sem impacto direto (SMTP custom não conflita com WhatsApp futuro) |
| Epic 4 — Finance + NFS-e | Phase 2 | Provavelmente dependerá de SMTP para envio de recibos/relatórios — já coberto pela mesma infra |
| Epic 5 — Growth Loop/C2C | Planejado | Envio de notificação de crédito de indicação pode usar SMTP — coberto |

### Summary

Adição de **1 story nova** (Story 1.8) no Epic 1 + atualização de Dev Notes da Story 1.3 + remoção da assumption falsa da technical-assumptions.md. Ordem dos epics preservada; nenhum epic abandonado ou redefinido.

---

## 3. Artifact Conflict & Impact Analysis

### PRD — drift maior que o gatilho imediato

A análise revelou que o PRD **ainda contém referências a WhatsApp magic link** (pivot 1, já executado em 2026-04-21) E **a magic link como método de login** (pivot 2, ADR-0003). **Dois pivots consecutivos não foram propagados ao PRD.** Corrigir junto com este change record para evitar acúmulo de dívida documental.

#### 3.1 `docs/prd/requirements.md`

| Requisito | Conteúdo atual (DESATUALIZADO) | Conflito |
|---|---|---|
| **FR1** | "senha via magic link WhatsApp" | Duplamente desatualizado (1. WhatsApp → email; 2. magic link → senha) |
| **FR19** | "magic link enviado por WhatsApp" | Duplamente desatualizado |

#### 3.2 `docs/prd/technical-assumptions.md`

| Seção | Conteúdo atual | Conflito |
|---|---|---|
| Linha 41 — Auth | "Supabase Auth customizado para magic link via WhatsApp (implementação de OTP pré-compartilhada com cliente via BSP + validação customizada)" | Duplamente desatualizado. Também precisa adicionar SMTP vendor ao stack |
| Additional Assumptions | Não menciona SMTP | **Gap crítico** — necessidade descoberta agora |

#### 3.3 `docs/prd/epic-1-foundation-salon-onboarding.md`

| Seção | Conteúdo atual | Conflito |
|---|---|---|
| Story 1.3 título | "Magic Link Authentication via WhatsApp" | Desatualizado (pivot 1 + pivot 2) |
| Story 1.3 AC 1–9 | Fluxo OTP + BSP WhatsApp | Todos desatualizados |
| Story 1.7 (lista) | Não inclui 1.8 SMTP | Gap — precisa de nova story |

#### 3.4 `docs/stories/1.3.magic-link-auth.md`

| Seção | Conteúdo atual | Conflito |
|---|---|---|
| Status | "Ready for Review (implementation complete pending founder Task 9)" | Desatualizado — implementação do pivot 2 (c8a2a48, afb33cd) já ocorreu em branch separada |
| Change Log | Última entry em v1.2 (2026-04-21) | Faltam entries v1.3 (pivot senha), v1.4 (descoberta SMTP) |
| Dev Notes → Known gotchas | "custom SMTP ... não crítico no MVP" | **Assumption falsa** — remover |
| File List | Lista arquivos do pivot 1 | Faltam `recuperar-senha/*`, `nova-senha/*`, `login/*` reescrito |

#### 3.5 `docs/stories/1.4.salon-signup-onboarding.md`

| Seção | Conteúdo atual | Conflito |
|---|---|---|
| Acceptance Criteria | Não menciona senha no signup | Gap — signup pós-pivot precisa de password + confirm-password com validação 8+ chars |
| Dev Notes | Não referencia pivot | Gap — adicionar cross-reference com ADR-0003 |

#### 3.6 `docs/architecture/ADR-0003-auth-email-password.md`

| Seção | Conteúdo atual | Conflito |
|---|---|---|
| "Consequências → O que muda no código" | Não menciona necessidade de SMTP custom | Adicionar bullet: infra de entrega de email precisa ser custom SMTP em prod |

#### 3.7 Novo artefato necessário

- `docs/stories/1.8.custom-smtp-transactional-email.md` (NEW) — story dedicada para Resend + domain verification + config em ambos os projetos Supabase.

#### 3.8 Sem impacto nos seguintes artefatos

- Schema DB — Supabase Auth não muda
- RLS policies — não afetadas
- Frontend code — action `requestPasswordReset` continua idêntica (apenas o backend de entrega muda)
- Middleware — não afetado
- Deployment pipeline — Vercel não muda

---

## 4. Path Forward Evaluation

### Option 1 — Direct Adjustment (RECOMMENDED)

**Scope:** Adicionar Story 1.8 (SMTP custom via Resend) no Epic 1, atualizar PRD, corrigir ADR-0003, completar Change Log das Stories 1.3/1.4. **Branch atual `feature/auth-pivot-email-password` NÃO é afetada** (código de app não muda).

**Esforço:** ~4–6h de trabalho divido entre:
- @pm (Morgan) — atualizar FR1/FR19 + technical-assumptions.md + Epic 1 list (≈1h)
- @sm (River) — draft Story 1.8 (≈1h)
- @po (Pax) — validar Story 1.8 draft (≈30min)
- @dev (Dex) — implementar Story 1.8: config Resend + patchar `scripts/supabase-auth-setup.ts` para aplicar SMTP via Management API em dev + prod (≈2h)
- @architect (Aria) — aprovar ADR-0003 amendment (≈30min)
- @devops (Gage) — apply em softhair-dev, smoke test, apply em softhair-prod pós-LGTM Founder (≈30min)

**Trabalho descartado:** Zero. A branch de pivot permanece válida e segue para PR após Story 1.8 (ou em paralelo — ver Agent Handoff Plan abaixo).

**Risco:** Baixo. Resend domain verification depende de acesso DNS do domínio `soft-hair.com.br` (ou domínio que o Founder usar) — Founder precisa adicionar 3 registros DNS (SPF/DKIM/DMARC).

**Timeline:** 1–2 dias úteis para completar (Founder availability é a variável dominante: DNS + LGTM em PRs).

### Option 2 — Rollback

**Scope:** Reverter pivot ADR-0003, voltar ao magic link (que teve comportamento parecido — também usa built-in email).

**Avaliação:** Rollback **não resolve o problema raiz** — magic link pelo built-in SMTP tem a MESMA taxa de entrega. O bug real não é o método (senha vs. link) mas a camada de transporte de email. **Opção descartada.**

### Option 3 — PRD MVP Re-scoping

**Scope:** Remover auth por email do MVP; adiar para Phase 2; migrar a entrada atual para OAuth Google-only.

**Avaliação:** Sem atratividade — OAuth Google adiciona dependência externa e atrito que o pivot ADR-0003 justamente tentou evitar. **Opção descartada.**

### Recomendação

**Option 1 — Direct Adjustment.** Simples, baixo risco, preserva 100% do trabalho já feito, resolve causa-raiz de forma duradoura (toda necessidade futura de email — confirmações de agendamento, créditos de indicação, recibos — herdará a mesma infra).

**Vendor selection:** **Resend** como primeira escolha.
- Free tier: 100 emails/dia + 3.000/mês (mais do que suficiente para 20 design-partners no MVP)
- Domain verification via DNS (SPF/DKIM/DMARC) em ~5 min
- Compatível SMTP nativo com Supabase (`smtp.resend.com:587`, usuário `resend`, senha = API key)
- Dashboard com analytics de entrega/abertura
- Upgrade path claro: Pro $20/mês = 50.000/mês quando escalar

**Alternativas avaliadas:**
- **Postmark** — excelente reputação, mais caro ($15/mês mínimo, sem free tier útil); preferível em Phase 2 se Resend apresentar problemas
- **AWS SES** — mais barato em escala mas requer setup de IAM + sandbox escape + mais overhead operacional
- **SendGrid** — rejeitado (reputação de deliverability piorou nos últimos 2 anos)

---

## 5. PRD MVP Impact

| Dimensão | Impacto |
|---|---|
| Core MVP goals | **Nenhum** — "onboard salão em ≤ 10 min + primeiro agendamento" permanece |
| Scope features | **+1 story** (1.8 SMTP custom), **0 features removidas** |
| Timeline | **+1–2 dias** para implementação Story 1.8 |
| Custo operacional | **+R$ 0/mês** (Resend free tier cobre os 20 design-partners) |
| Orçamento NFR11 (R$ 500–1.500/mês) | **Preservado** |
| MVP achievability | **Preservada** |

---

## 6. High-Level Action Plan

### Sequência proposta (ordered)

1. **[Founder]** Aprovar esta Sprint Change Proposal
2. **[@pm Morgan]** Atualizar PRD: FR1, FR19, technical-assumptions.md, Epic 1 list (update + add Story 1.8 entry)
3. **[@architect Aria]** Amendment no ADR-0003 (bullet de SMTP custom em "Consequências")
4. **[@sm River]** Draft Story 1.8 usando template padrão
5. **[@po Pax]** Validate Story 1.8 → GO (≥7/10)
6. **[Founder]** Criar conta Resend + verificar domínio (DNS TXT records)
7. **[@dev Dex]** Implementar: patchar `scripts/supabase-auth-setup.ts` para aplicar SMTP via Management API; rodar em `softhair-dev` + smoke test
8. **[@qa]** QA gate na Story 1.8 (config validation + smoke test de envio real em dev)
9. **[@devops Gage]** Apply em `softhair-prod` via script após LGTM Founder; retomar PR do pivot ADR-0003 (`feature/auth-pivot-email-password` → main) com Story 1.8 dependendo-disso documented
10. **[@sm River]** Atualizar Story 1.3 Change Log (remover "known gotcha" falsa + entry v1.4 refletindo essa iteração); atualizar Story 1.4 AC para incluir campos senha; atualizar status de ambas

### Paralelização possível

- Passos 2, 3, 4, 6 podem ocorrer em paralelo (Founder configura DNS enquanto agentes atualizam docs)
- Passos 7 e 10 são independentes — @dev implementa enquanto @sm atualiza stories
- O PR da branch `feature/auth-pivot-email-password` pode ser aberto por @devops **em paralelo** com Story 1.8, desde que o merge em `main` só ocorra após SMTP custom aplicado em prod (senão merge entrega fluxo quebrado em produção)

---

## 7. Specific Proposed Edits (draft-ready)

### 7.1 `docs/prd/requirements.md`

**FR1 — substituir integralmente por:**
```markdown
- **FR1:** O sistema deve permitir cadastro de salão em fluxo único com ≤ 5 campos
  obrigatórios (nome do salão, cidade, telefone do dono, email, senha).
  Senha mínima: 8 caracteres. Ver ADR-0003 para rationale.
```

**FR19 — substituir integralmente por:**
```markdown
- **FR19:** O sistema deve permitir autenticação do dono/recepcionista via email +
  senha. Recuperação de senha via magic link enviado ao email cadastrado
  (mecanismo de recovery secundário, não primário). Ver ADR-0003.
```

**NFR adicional (inserir após NFR11):**
```markdown
- **NFR11a:** A entrega de email transacional (recuperação de senha, notificações
  de agendamento, relatórios) deve usar SMTP custom de provedor com domain
  verification (SPF/DKIM/DMARC). Taxa de entrega ≥ 95% em Gmail/Outlook
  (não built-in Supabase service). Ver Story 1.8.
```

### 7.2 `docs/prd/technical-assumptions.md`

**Linha 41 — substituir:**
```diff
- - **Auth:** Supabase Auth customizado para magic link via WhatsApp (implementação
-   de OTP pré-compartilhada com cliente via BSP + validação customizada)
+ - **Auth:** Supabase Auth com email + senha como método primário; magic link via
+   email apenas para recuperação de senha. Ver ADR-0003.
```

**Adicionar novo bullet em "Additional Technical Assumptions and Requests" (antes de Hosting):**
```markdown
- **Transactional email (SMTP):** Resend configurado como SMTP custom em ambos
  projetos Supabase (softhair-dev + softhair-prod). Free tier (100/dia +
  3.000/mês) suficiente para 20 design-partners no MVP. Domain verification
  obrigatória (SPF/DKIM/DMARC). Built-in Supabase email service NÃO é aceitável
  em produção (reputação de IP, rate limits agressivos). Ver Story 1.8.
```

### 7.3 `docs/prd/epic-1-foundation-salon-onboarding.md`

**Story 1.3 título — substituir:**
```diff
- ## Story 1.3: Magic Link Authentication via WhatsApp
+ ## Story 1.3: Email + Password Authentication (with magic link recovery)
```

**Story 1.3 AC — substituir bloco integralmente por:**
```markdown
1. Tela de login aceita email + senha
2. Ao submeter, autenticação via `supabase.auth.signInWithPassword`
3. Sessão expira após 30 dias de inatividade (auto-refresh < 24h)
4. Rate limit de autenticação: seguir defaults do Supabase
5. Logout limpa sessão e redireciona para tela de login
6. Fluxo "Esqueci minha senha" envia magic link via email
   (`supabase.auth.resetPasswordForEmail`) que rota via `/auth/callback` → `/auth/nova-senha`
7. Mensagens de erro genéricas (não revelar existência de email)
8. Schema: `public.users.email` NOT NULL UNIQUE; `phone_e164` NULLABLE (Phase 2)
9. Trigger `on_auth_user_created` popula `public.users` automaticamente
10. Full flow passa E2E (Playwright): login, logout, reset password, nova senha
```

**Adicionar após Story 1.7, antes do `---` final:**
```markdown
## Story 1.8: Custom SMTP for Transactional Email

Como **dono do salão**, quero **receber emails de recuperação de senha e notificações
com alta confiabilidade (≥ 95% inbox em Gmail/Outlook)**, para que **eu não perca
acesso à plataforma e clientes recebam confirmações de agendamento**.

### Acceptance Criteria

1. Conta Resend criada, domínio `<dominio-softhair>` verificado via DNS
   (SPF/DKIM/DMARC passam em mxtoolbox.com)
2. SMTP custom aplicado em `softhair-dev` via Management API
   (patch `mailer.secure_password_change`, `smtp_*` via script)
3. SMTP custom aplicado em `softhair-prod` via mesma API
4. Script `scripts/supabase-auth-setup.ts` atualizado para incluir campos
   `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_sender_email`,
   `smtp_sender_name`, `smtp_max_frequency`
5. Secrets (Resend API key) armazenados fora do repo (Vercel env vars OR
   Supabase Vault); rotação documentada
6. Smoke test em dev: enviar reset password para conta de teste, confirmar
   chegada em Gmail (inbox, não spam) em ≤ 2 min
7. Smoke test em prod (pós-apply): idem, com Founder validando recebimento real
8. Change Log de `softhair-prod` registrado em
   `docs/ops/prod-smtp-config-<data>.md`
```

### 7.4 `docs/architecture/ADR-0003-auth-email-password.md`

**Adicionar novo bloco antes de "Alternativas descartadas":**
```markdown
## Amendment 2026-04-22 — SMTP custom obrigatório em prod

Teste em produção revelou que o serviço built-in de email do Supabase
não atende requisitos de entrega (IP compartilhado, reputação ruim,
rate limit agressivo de 4 emails/hora). Para o pivot email+senha
funcionar end-to-end em prod, é necessário SMTP custom.

**Decisão adicional:** Resend como provedor SMTP em softhair-dev e
softhair-prod, configurado via Management API (Story 1.8).

**Consequência:** adiciona dependência externa (Resend) — considerado
aceitável dado o free tier suficiente para MVP e o upgrade path claro.
```

### 7.5 `docs/stories/1.3.magic-link-auth.md`

**Dev Notes → Known gotchas — substituir bullet:**
```diff
- - Supabase remote (softhair-dev, softhair-prod) usa SMTP padrão (limite
-   gratuito ~4 emails/hour)
- - Para produção com alto volume, configurar custom SMTP (Resend, Postmark) —
-   **não crítico no MVP**
+ - Supabase built-in email service NÃO é aceitável em produção — entrega
+   falha + rate limit 4/hora. Story 1.8 endereça isso via Resend SMTP custom.
+   Story 1.3 depende de 1.8 estar aplicada em `softhair-prod` antes de merge
+   do pivot em `main`.
```

**Change Log — adicionar entries:**
```markdown
| 2026-04-22 | 1.3 | Pivot ADR-0003 implementado em branch feature/auth-pivot-email-password (commits c8a2a48, e6f22b7, afb33cd). Pendente: merge após Story 1.8 aplicada em prod. | Dex (Dev) |
| 2026-04-22 | 1.4 | Known gotcha "SMTP não crítico" removido — provou-se crítico em teste prod. Story 1.8 criada para endereçar. Ref: change-records/2026-04-22-email-delivery-smtp-custom.md | Orion (aiox-master) |
```

### 7.6 `docs/stories/1.4.salon-signup-onboarding.md`

**Acceptance Criteria — adicionar após AC existente:**
```markdown
N+1. Campo de senha (tipo password) obrigatório no passo de dados do salão,
     com confirmação (segundo campo). Validação: ≥ 8 caracteres.
     Usar `supabase.auth.signUp({ email, password })` para criar conta.
N+2. Ícone de mostrar/ocultar senha em ambos os campos.
```

### 7.7 Files novos

1. `docs/stories/1.8.custom-smtp-transactional-email.md` — a ser draftada por @sm River a partir do template story
2. `docs/ops/prod-smtp-config-<data-aplicacao>.md` — a ser criada por @devops Gage após apply em prod

---

## 8. Agent Handoff Plan

| Agente | Responsabilidade | Trigger |
|---|---|---|
| **Founder** | Aprovar esta proposta; criar conta Resend; configurar DNS | Imediato |
| **@pm Morgan** | Executar edits 7.1–7.3 (PRD updates) | Após Founder approval |
| **@architect Aria** | Executar edit 7.4 (ADR-0003 amendment) | Após Founder approval, paralelo com @pm |
| **@sm River** | Draft Story 1.8 (file novo em 7.7); executar edits em Change Logs das Stories 1.3/1.4 | Após 7.3 (Epic 1 atualizado) |
| **@po Pax** | Validate Story 1.8 draft (≥ 7/10); executar edits 7.5, 7.6 nos AC | Após Story 1.8 draftada |
| **@dev Dex** | Implementar Story 1.8: patchar `scripts/supabase-auth-setup.ts`; aplicar em softhair-dev; smoke test | Após Story 1.8 GO + Founder DNS done |
| **@qa** | QA gate Story 1.8 — smoke test de envio real em dev | Após @dev completar |
| **@devops Gage** | Apply em softhair-prod após LGTM; retomar PR do pivot ADR-0003 | Após @qa PASS + Founder LGTM |

### Rollback plan

Se SMTP custom falhar em produção:
1. Reverter config via `scripts/supabase-auth-setup.ts` revert (campos SMTP → null)
2. Supabase volta ao built-in service automaticamente
3. Impacto: rate limit 4/hora, entrega questionável — **mesmo estado de hoje**
4. Custo de rollback: 5 min de execução do script

---

## 9. Success Criteria

Esta Sprint Change é **considerada bem-sucedida** quando:

- [ ] Founder consegue recuperar senha em produção recebendo email no Gmail inbox (não spam) em ≤ 2 minutos
- [ ] Smoke test do Story 2.4/2.7 (cliente final) envia email de confirmação de agendamento com sucesso
- [ ] Branch `feature/auth-pivot-email-password` mergeada em `main` com deploy em produção sem regressão
- [ ] PRD, ADR-0003, Stories 1.3/1.4 alinhadas com realidade do código
- [ ] `docs/ops/prod-smtp-config-*.md` documenta credenciais + rotação

---

## 10. References

- **Gatilho técnico:** logs auth de `softhair-prod` em 2026-04-22 (rate_limit 429 + entrega falha)
- **Change record anterior relacionado:** `docs/change-records/2026-04-21-mvp-scope-reduction.md`
- **ADR relacionado:** `docs/architecture/ADR-0003-auth-email-password.md`
- **Handoffs envolvidos:**
  - `docs/framework/handoff-dex-auth-pivot-2026-04-21.md` (pivot implementation)
  - `docs/framework/handoff-gage-auth-pivot-pr-2026-04-22.md` (PR flow — a ser atualizado com dep de Story 1.8)
- **Docs oficiais Supabase:**
  - SMTP config: https://supabase.com/docs/guides/auth/auth-smtp
  - Rate limits: https://supabase.com/docs/guides/auth/rate-limits
- **Resend docs:** https://resend.com/docs/send-with-supabase-smtp

---

## 11. MVP Deferral Decision (2026-04-23)

**Decisão do Founder:** durante a fase MVP com apenas **1 salão em produção**, o rate limit do built-in Supabase email service (4/hora por recipient) é operacionalmente tolerável. A descoberta técnica (Sections 1–10 acima) permanece válida e os doc updates já foram aplicados (FR1, FR19, NFR11a, technical-assumptions, ADR-0003 Amendment, Stories 1.3/1.4 Change Logs, Story 1.8 draft). A **implementação** de SMTP custom (Story 1.8 Tasks 1–8) fica **no backlog**, a ser priorizada quando:

- Segundo design-partner for onboardado, OU
- For observada qualquer falha de entrega recorrente em prod (monitorar manualmente), OU
- Epic 2 Story 2.7 (cliente final recebendo link de gestão por email) entrar no sprint

**Escopo do que MUDA com essa decisão:**
- Story 1.8 status: `Draft` → `Backlog`
- Handoff `handoff-gage-auth-pivot-pr-2026-04-22.md`: dependência de Story 1.8 removida — PR do pivot pode ser mergeado sem SMTP custom
- PR `feature/auth-pivot-email-password` → `main` é retomado e mergeado assim que CI + LGTM do Founder concluírem

**Escopo do que NÃO muda:**
- Doc corrections aplicadas permanecem (PRD agora reflete email+senha corretamente)
- NFR11a permanece como requisito registrado (apenas não-blocker para MVP 1-salão)
- Amendment do ADR-0003 permanece válido (trail histórico da descoberta)

**Risco aceito pelo Founder:**
- Até ~4 tentativas/hora de reset de senha por email; emails podem cair em spam do Gmail
- Mitigação disponível: Founder orienta o único usuário de prod (ele mesmo) a checar spam

---

*Orion (aiox-master) — orquestrando o sistema 🎯*
*Sprint Change Proposal v1.1 — MVP Deferral aprovado 2026-04-23*
