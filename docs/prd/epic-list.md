# Epic List

Proposta inicial de **5 épicos sequenciais** cobrindo o MVP. Cada epic entrega incremento deployável e testável.

1. **Epic 1 — Foundation & Salon Onboarding:** Estabelecer projeto Next.js + Supabase + CI/CD + auth via magic link WhatsApp, entregando onboarding completo do salão com catálogo pré-populado e primeiro profissional configurado.
2. **Epic 2 — Core Booking Loop:** Habilitar agenda visual, link público de agendamento por profissional, self-booking do cliente final (phone-only) e histórico de cliente — salão já recebe agendamentos reais.
3. **Epic 3 — WhatsApp Messaging Automation:** Integrar Chatwoot + WhatsApp Business API oficial, aprovar templates, automatizar confirmação 24h + lembrete 2h, e atualizar status do agendamento com base na resposta — reduz no-show.
4. **Epic 4 — Finance, Commission & NFS-e:** Implementar cálculo automático de comissão, dashboard financeiro básico e emissão NFS-e integrada via Nuvem Fiscal — salão fecha mês operacional completo.
5. **Epic 5 — Growth Loop: Indicação C2C:** Ativar sistema de indicação cliente→cliente com crédito automático — diferencial competitivo e growth loop orgânico para atrair próximos design-partners.

**Rationale da ordenação:**
- Epic 1 é a fundação obrigatória (infra + auth + primeira interação)
- Epic 2 entrega valor isolado (salão pode receber agendamentos mesmo sem mensageria automática, usando WhatsApp manual no intervalo)
- Epic 3 resolve a dor central do no-show — deployable assim que Epic 2 existir
- Epic 4 viabiliza monetização e compliance fiscal do salão
- Epic 5 é diferencial competitivo (pode ser priorizado antes de Epic 4 se aquisição for crítica, mas por default deixo no fim para garantir que o salão possa operar o financeiro antes de crescer base)

---
