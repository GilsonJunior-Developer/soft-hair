# Handoff → @devops Gage — PR do Pivot Auth + Deploy Produção

**Data:** 2026-04-22
**De:** Tech Leader (Opus)
**Para:** @devops Gage
**ADR:** `docs/architecture/ADR-0003-auth-email-password.md`
**Branch:** `feature/auth-pivot-email-password` (3 commits ahead de `main`, já pushada)
**Severidade:** HIGH — bloqueia re-validação da Story 1.4 e continuidade do Epic 2

**⚠️ NOTA 2026-04-23:** Dependência anterior de Story 1.8 (Custom SMTP via Resend) **suspensa pelo Founder** — MVP com 1 salão em produção tolera rate limit built-in (4/h por recipient). Story 1.8 parqueada em backlog, será ativada quando 2º design-partner onboardar OU Epic 2 Story 2.7 for executada. Este PR pode ser mergeado sem SMTP custom aplicado. Ref: `docs/change-records/2026-04-22-email-delivery-smtp-custom.md` Section 11.

---

## Contexto

O pivot magic link → email + senha foi implementado pelo @dev Dex e testado em dev. A branch já está pushada para o remote com 3 commits:

```
afb33cd fix(auth): route recovery email through /auth/callback to establish session
e6f22b7 chore(ops): add supabase-auth-setup script (ADR-0003 config)
c8a2a48 feat(auth): pivot magic link → email + password (ADR-0003)
```

Autoridade exclusiva de @devops (ver `.claude/rules/agent-authority.md`):
- `gh pr create` / `gh pr merge`
- `git push --force` (se necessário)
- Gestão de pipeline CI/CD
- Release management

---

## Escopo do trabalho

### 1. Pré-flight antes de abrir PR

**Arquivos untracked que PRECISAM entrar no PR** (atualmente não commitados):

```
docs/architecture/ADR-0003-auth-email-password.md    ← ADR referenciado pelos commits
docs/framework/handoff-dex-auth-pivot-2026-04-21.md  ← contexto do pivot
docs/framework/handoff-river-founder-actions-2026-04-21.md
docs/framework/handoff-dara-supabase-autonomy-2026-04-21.md
docs/framework/handoff-gage-auth-pivot-pr-2026-04-22.md  ← este arquivo
docs/ops/prod-bootstrap-2026-04-21.sql
docs/ops/sprint-2A-preflight-2026-04-21.sql
docs/ops/sprint-2A-rpcs-2026-04-21.sql
docs/qa/bug-inp-performance-2026-04-21.md
docs/sync-obsidian.py
```

**Ação:** delegar `git add` + `git commit` ao @dev Dex com mensagem:
```
docs(auth-pivot): ADR-0003 + handoffs + ops scripts + QA bug report
```

Não commitar via @devops — viola delegation matrix (commit local é autoridade do @dev).

### 2. Abrir PR `feature/auth-pivot-email-password` → `main`

**Título:**
```
feat(auth): pivot magic link → email + password (ADR-0003)
```

**Body (HEREDOC):**
```markdown
## Summary

- Pivot do método de login primário: magic link → email + senha
- Magic link preservado apenas para fluxo de recuperação de senha
- Nova página `/auth/recuperar-senha` + `/auth/nova-senha`
- Onboarding wizard agora coleta senha no signup
- Fix: rota de recovery passa por `/auth/callback` para estabelecer sessão antes do update

Ref: `docs/architecture/ADR-0003-auth-email-password.md`

## Test plan

- [ ] Login com email + senha (credenciais válidas) → redirect `/hoje`
- [ ] Login com credenciais inválidas → mensagem genérica "Email ou senha incorretos"
- [ ] Fluxo de recuperação: solicitar link → receber email → clicar → definir nova senha → login bem-sucedido
- [ ] Onboarding signup com senha < 8 chars → validação bloqueia
- [ ] Onboarding signup completo com senha válida → conta criada + login automático
- [ ] Mostrar/ocultar senha (ícone olho) funciona em todos os campos
- [ ] Sem regressão: RLS, middleware de rotas protegidas, cookies de sessão
- [ ] CI verde: lint, typecheck, testes unitários, E2E Playwright

## Validação do Founder

- [ ] Founder testou no salão da esposa (uso real diário) — aguardar LGTM antes de merge em prod
```

**Labels:** `auth-pivot`, `epic-1`
**Reviewers:** aguardar orientação do Founder
**Base:** `main`

### 3. Monitorar CI

Aguardar todas as verificações verdes antes de autorizar merge:
- Vercel Preview Deploy
- Lint + typecheck
- Playwright E2E (se configurado)

Se CI falhar → devolver para @dev Dex com output do job, não tentar fix direto.

### 4. Aprovação do Founder (gate obrigatório)

Conforme handoff do @dev (`docs/framework/handoff-dex-auth-pivot-2026-04-21.md`):
> "Solicitar validação do Founder no salão da esposa (teste real de login diário)"

**Não fazer merge sem LGTM explícito do Founder no PR.** Magic link quebrado em produção teria impacto direto em 20 design-partners.

### 5. Pós-merge — deploy em produção

Após merge em `main`:

1. Confirmar Vercel production deploy foi disparado automaticamente
2. Validar URL de produção (`/auth/login`, `/auth/recuperar-senha`) carregam sem erro
3. Confirmar variáveis de ambiente Vercel estão corretas (não houve mudança esperada, mas validar):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Verificar Supabase Dashboard `softhair-prod`:
   - Authentication → Providers → Email habilitado, `Confirm email` ativo
   - Redirect URLs inclui `https://soft-hair-web.vercel.app/auth/callback`
   - Template "Reset Password" em PT-BR customizado

Se configuração de `softhair-prod` ainda não tiver sido espelhada de `softhair-dev`, executar `docs/ops/supabase-auth-setup` (referenciado em `e6f22b7`) contra prod. Caso o script exija acesso ao Supabase Dashboard manual, abrir handoff ao Founder.

### 6. Smoke test pós-deploy

Em `https://soft-hair-web.vercel.app`:
- [ ] `/auth/login` renderiza formulário email + senha
- [ ] Fluxo completo de recuperação em prod com conta real de teste do Founder
- [ ] `/api/healthz` retorna 200
- [ ] Nenhum erro em Vercel logs nos 10 min seguintes ao deploy

---

## Critério de aceite

- [ ] Arquivos untracked commitados pelo @dev antes do PR
- [ ] PR aberto com título + body corretos, label `auth-pivot`, ADR referenciado
- [ ] CI verde (todas as checks)
- [ ] LGTM explícito do Founder no PR (não merge automático)
- [ ] Merge via `gh pr merge --squash` (manter histórico de main limpo)
- [ ] Deploy produção validado com smoke tests acima
- [ ] Atualizar `docs/stories/1.3.magic-link-auth.md` via @sm River com entry no Change Log referenciando merge

---

## O que NÃO é escopo deste handoff

- Mudanças de schema DB (não houve)
- Migrations Supabase (não houve)
- Configuração MCP ou Docker (nada mudou)
- Story file updates (autoridade do @sm / @po, não @devops)
- Autorizar hotfix em main diretamente (fluxo é sempre via PR)

---

## Escalação

- **CI vermelho após 2 iterações de @dev:** escalar ao @qa para quality gate antes de nova rodada
- **Founder indisponível > 48h para LGTM:** notificar @aiox-master para validação alternativa
- **Deploy prod falha:** rollback imediato (`vercel rollback`) + abrir incident report em `docs/incidents/`

---

## Referências

- ADR: `docs/architecture/ADR-0003-auth-email-password.md`
- Handoff original (@dev): `docs/framework/handoff-dex-auth-pivot-2026-04-21.md`
- Handoff founder actions (@sm): `docs/framework/handoff-river-founder-actions-2026-04-21.md`
- Agent authority matrix: `.claude/rules/agent-authority.md`
- Workflow execution: `.claude/rules/workflow-execution.md`
