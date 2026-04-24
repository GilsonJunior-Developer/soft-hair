# Bug Report: INP Crítico — 1.440ms no clique da agenda ✅ RESOLVIDO

**Data:** 2026-04-21  
**Reportado por:** Founder  
**Resolvido por:** @devops (Gage) — PR #11  
**Severidade:** HIGH → ✅ FECHADO  
**Tipo:** Performance / Rendering

---

## Evidência

Screenshot do Chrome DevTools → Interaction Timing:

| Métrica | Valor | Benchmark |
|---|---|---|
| **INP (Interaction to Next Paint)** | **1.440ms** ❌ | Bom ≤ 200ms |
| click | 129,2ms | — |
| **render (culpado)** | **1.309,3ms** ❌ | — |
| input delay | 0,6ms | ✅ |

**Elemento culpado:**  
`span.flex.items-center.justify-between.gap-2`  
→ render de 1.309ms disparado por click

**Elemento secundário (OK):**  
`button.inline-flex.items-center...` → 32,8ms ✅

---

## Hipóteses (prioridade de investigação)

1. **Re-render desnecessário do componente pai** — click num `span` dispara re-render de lista/calendário inteiro sem `React.memo` ou `useMemo`
2. **Server Action síncrono na thread principal** — action bloqueando o render antes de retornar
3. **Supabase Realtime trigger** — update de canal disparando re-render pesado da agenda ao receber evento
4. **Componente de calendário sem virtualização** — renderizando todos os slots do dia/semana de uma vez

---

## Passos para reproduzir

1. Abrir `/agenda` (ou `/hoje`) no Chrome
2. DevTools → Performance → Interactions
3. Clicar em qualquer item da lista ou slot da agenda
4. Observar INP > 500ms

---

## Critério de aceite para o fix

- [ ] INP ≤ 200ms no click dos elementos da agenda
- [ ] Lighthouse Performance ≥ 85 mobile (gate obrigatório Story 1.7)
- [ ] Sem regressão nos 27 testes unitários existentes

---

## Ações esperadas do @dev (Dex)

1. Identificar o componente exato via React DevTools Profiler
2. Aplicar `React.memo` / `useMemo` / `useCallback` onde necessário
3. Se for Server Action: mover para `startTransition` para não bloquear UI
4. Se for Realtime: verificar se o canal está sendo subscrito no nível certo (não no root)
5. Reportar root cause + fix no Change Log desta issue

---

## Referência

- Story relacionada: `docs/stories/1.7.empty-dashboard-hoje.md` (gate: Lighthouse ≥ 85 mobile)
- Arquitetura Realtime: `docs/architecture.md` §Realtime
