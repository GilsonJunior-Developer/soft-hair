# ADR-0003 — Pivot Auth: Magic Link → Email + Senha

**Data:** 2026-04-21  
**Status:** ✅ Aceito  
**Decisor:** Founder (Gilson)  
**Impacto:** Story 1.3 reaberta — Dex responsável pelo re-trabalho

---

## Contexto

A Story 1.3 foi entregue com autenticação via magic link (Supabase nativo). Após validação com o Founder em uso real, identificou-se que o fluxo de magic link gera mais atrito do que email + senha para um SaaS de uso diário:

- Usuário informa email → aguarda link → abre cliente de e-mail → clica no link → retorna ao app
- Para uso diário (salão abre todo dia), esse fluxo é mais lento do que digitar email + senha diretamente

## Decisão

Substituir magic link como método primário de login por **email + senha**.

Manter magic link **exclusivamente** como mecanismo de recuperação de acesso (fluxo "esqueci minha senha"), o que adiciona uma camada de segurança: só quem tem acesso ao e-mail cadastrado consegue redefinir a senha.

## Fluxo após o pivot

```
Login (diário)
  → Email + Senha → Sessão ativa

Recuperação de acesso
  → "Esqueci minha senha" → Magic link enviado ao email
  → Usuário clica no link → Tela de redefinição de senha
  → Nova senha definida → Login normal
```

## Consequências

**Positivas:**
- Menor atrito no login diário — especialmente em mobile
- Credenciais memorizadas pelo browser/gerenciador de senhas
- Magic link como 2ª camada de segurança na recuperação

**O que muda no código:**
- Story 1.3: tela de login reescrita (email + senha em vez de "informe email e aguarde")
- Story 1.4: onboarding wizard precisa incluir campos de senha + confirmação no step de criação de conta
- Nova tela: `/auth/reset-password` para redefinição após clicar no link de recuperação
- Supabase Dashboard: habilitar provider `Email/Password`, manter `Magic Link` ativo apenas para reset

**O que NÃO muda:**
- RLS — baseado em `auth.uid()`, independente do método de auth
- Estrutura de sessão, cookies, tokens — Supabase gerencia igual
- Tabelas de banco — nenhuma alteração de schema necessária

## Amendment 2026-04-22 — SMTP custom obrigatório em prod

Teste em produção revelou que o serviço built-in de email do Supabase não atende requisitos de entrega (IP compartilhado, reputação ruim, rate limit agressivo de 4 emails/hora). Para o pivot email+senha funcionar end-to-end em prod, é necessário SMTP custom.

**Decisão adicional:** Resend como provedor SMTP em softhair-dev e softhair-prod, configurado via Management API (Story 1.8).

**Consequência:** adiciona dependência externa (Resend) — considerado aceitável dado o free tier suficiente para MVP e o upgrade path claro.

**Referência:** `docs/change-records/2026-04-22-email-delivery-smtp-custom.md`

## Alternativas descartadas

- **Manter magic link:** descartado após validação real com Founder — atrito identificado em uso diário
- **OAuth (Google/Apple):** descartado para MVP — adiciona dependência externa e complexidade de configuração para salões pequenos
- **OTP por SMS:** descartado — custo variável + dependência de operadora
