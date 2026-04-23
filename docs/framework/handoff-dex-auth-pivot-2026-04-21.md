# Handoff → @dev Dex — Pivot Auth: Magic Link → Email + Senha

**Data:** 2026-04-21  
**De:** Tech Leader (Sonnet)  
**Para:** @dev Dex  
**ADR:** `docs/architecture/ADR-0003-auth-email-password.md`  
**Story reaberta:** Story 1.3 — Magic Link Auth (status: 🔁 In Progress)  
**Severidade:** MEDIUM — bloqueante para Story 1.4 re-validação e Epic 2

---

## Decisão do Founder

Após validação real, magic link como login primário gera atrito excessivo em uso diário. Pivot para **email + senha** como método de login. Magic link mantido **somente** para recuperação de senha — funciona como camada de segurança adicional.

---

## Escopo do trabalho

### 1. Supabase Dashboard — configuração (softhair-dev e softhair-prod)

Em Authentication → Providers:
- ✅ Habilitar **Email** com opção `Confirm email` e `Secure password change`
- Manter **Magic Link** ativo (será usado pelo fluxo de reset de senha nativo do Supabase)
- Desabilitar `Email OTP` se estiver habilitado separadamente

Em Authentication → Email Templates:
- Revisar template de "Reset Password" — deve ser claro que o link serve para redefinir senha

### 2. Tela de Login — reescrita (`/auth/login` ou `/login`)

**Antes (magic link):**
```
[Campo: Email]
[Botão: Enviar link de acesso]
→ Mensagem: "Verifique seu email"
```

**Depois (email + senha):**
```
[Campo: Email]
[Campo: Senha]  ← novo
[Botão: Entrar]
[Link: Esqueci minha senha]  ← novo
```

Usar `supabase.auth.signInWithPassword({ email, password })`.

### 3. Fluxo "Esqueci minha senha"

Nova página `/auth/recuperar-senha`:
```
[Campo: Email]
[Botão: Enviar link de recuperação]
→ Mensagem: "Se o email estiver cadastrado, você receberá um link"
```

Chamar `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/nova-senha' })`.

Nova página `/auth/nova-senha` (destino do magic link de recuperação):
```
[Campo: Nova senha]
[Campo: Confirmar nova senha]
[Botão: Redefinir senha]
```

Chamar `supabase.auth.updateUser({ password: novaSenha })`.

### 4. Onboarding Wizard — Story 1.4

No step de criação de conta (signup), adicionar campos:
```
[Campo: Senha]           ← novo
[Campo: Confirmar senha] ← novo
```

Substituir `supabase.auth.signInWithOtp()` por `supabase.auth.signUp({ email, password })`.

### 5. Validações de UX obrigatórias

- Senha mínima: 8 caracteres (validação client-side + Supabase config)
- Mostrar/ocultar senha (ícone de olho no campo)
- Estado de loading no botão durante autenticação
- Mensagem de erro genérica em caso de credenciais inválidas: "Email ou senha incorretos" (não revelar qual dos dois falhou)
- Redirect para `/hoje` após login bem-sucedido (mantém o comportamento atual)

---

## Critério de aceite

- [ ] Login com email + senha funcionando em dev
- [ ] Fluxo completo de recuperação: solicitar link → receber email → redefinir senha → login
- [ ] Signup no onboarding wizard criando usuário com senha
- [ ] Sem regressão nos testes existentes de auth
- [ ] Supabase Dashboard configurado em softhair-dev e softhair-prod

---

## O que NÃO precisa mudar

- RLS — nenhuma alteração
- Schema do banco — nenhuma migration necessária
- Middleware de proteção de rotas — continua verificando `auth.uid()` igual
- Sessão / cookies — Supabase gerencia transparentemente

---

## Ao concluir

1. Abrir PR com label `auth-pivot` + referenciar ADR-0003
2. Solicitar validação do Founder no salão da esposa (teste real de login diário)
3. Após aprovação do Founder → apply em softhair-prod
