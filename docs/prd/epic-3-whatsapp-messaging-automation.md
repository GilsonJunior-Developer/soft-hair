# Epic 3 — WhatsApp Messaging Automation

> ⏸️ **DEFERRED TO PHASE 2 — 2026-04-21 scope change.** Esta epic inteira foi movida para Phase 2 (pós-PMF validado com design-partners). Stories preservadas intactas para retomada futura. Ver [change record](../change-records/2026-04-21-mvp-scope-reduction.md).

**Epic Goal (Phase 2):** Automatizar o ciclo de comunicação com cliente via WhatsApp Business API oficial + Chatwoot, eliminando o trabalho manual da recepção e reduzindo no-show. Ao fim do epic, confirmações e lembretes acontecem sem intervenção humana, e o status do agendamento é atualizado automaticamente com base na resposta do cliente.

## Story 3.1: Chatwoot Self-Hosted Setup

Como **dev**, quero **Chatwoot self-hosted rodando em Railway/Fly.io conectado ao banco Supabase auxiliar**, para que **o produto tenha camada open-source de orquestração de mensagens**.

### Acceptance Criteria

1. Chatwoot deployed em Railway (ou Fly.io) com Postgres dedicado (managed)
2. Domínio `chat.softhair.com.br` apontando para Chatwoot via DNS
3. Integração webhook Chatwoot → app SoftHair (callbacks para eventos de mensagem)
4. Painel admin acessível apenas via IP allowlist + 2FA
5. Backup diário do DB Chatwoot
6. Monitoring: healthcheck + alerta Slack se Chatwoot cair
7. Documentação de operação em `docs/infrastructure/chatwoot.md`

## Story 3.2: WhatsApp Business API Integration

Como **dev**, quero **integração com BSP de WhatsApp (360dialog ou Meta Cloud API direto)**, para que **o SoftHair envie e receba mensagens via conta oficial**.

### Acceptance Criteria

1. BSP escolhido documentado com rationale (decisão em ADR: `docs/architecture/decisions/0001-whatsapp-bsp.md`)
2. Número de WhatsApp Business verificado na Meta (número dedicado, não pessoal)
3. Credenciais armazenadas em Supabase Vault / Vercel env
4. Wrapper `packages/messaging/whatsapp.ts` com métodos: `sendTemplate`, `sendText` (se permitido pelo BSP), `receiveWebhook`
5. Testes de integração com mock do BSP para CI
6. Health-check incluído na rota `/healthz`

## Story 3.3: Template Management & Meta Approval

Como **dono do produto**, quero **templates aprovados pela Meta disponíveis no sistema**, para que **confirmações e lembretes possam ser enviados em produção**.

### Acceptance Criteria

1. 5 templates utility iniciais submetidos à Meta:
   - `confirm_24h_v1` (confirmação 24h antes)
   - `remind_2h_v1` (lembrete 2h antes)
   - `otp_login_v1` (OTP para magic link)
   - `booking_confirmed_v1` (confirmação de agendamento realizado)
   - `cancellation_notice_v1` (aviso de cancelamento pelo salão)
2. Cada template com 2 variantes em PT-BR (neutra + informal) para testes A/B futuros
3. Aprovação da Meta confirmada para todos os 5 (SLA típico 24-72h)
4. Tabela `whatsapp_templates` persiste metadados (nome, idioma, status, placeholders)
5. Dashboard admin do SoftHair lista templates e seus status de aprovação
6. Template rejeitado gera alerta automático ao founder via Sentry/Slack

## Story 3.4: Automated 24h Confirmation

Como **dono do salão**, quero **confirmação automática enviada 24h antes do agendamento**, para que **o cliente confirme presença e reduza no-show**.

### Acceptance Criteria

1. Worker (Inngest/Trigger.dev) agenda job ao criar agendamento: disparar confirmação exatamente 24h antes (ajustado para horário comercial do salão — não manda às 3h da manhã)
2. Job busca template aprovado `confirm_24h_v1` e envia via BSP
3. Placeholder do template inclui: nome do cliente, nome do profissional, serviço, data/hora, nome do salão
4. Se agendamento foi criado com < 24h de antecedência, envia confirmação imediata
5. Se agendamento foi cancelado antes do job rodar, job é cancelado
6. Falha no envio (BSP down, número inválido) registra em log + retry automático (max 3 tentativas com backoff exponencial)
7. Dashboard do salão exibe status "Confirmação enviada" no card do agendamento
8. Passa teste E2E com mock do BSP

## Story 3.5: Automated 2h Reminder

Como **dono do salão**, quero **lembrete automático enviado 2h antes do agendamento**, para que **o cliente lembre do compromisso mesmo sem ter confirmado antes**.

### Acceptance Criteria

1. Worker agenda job: disparar lembrete 2h antes
2. Envia template `remind_2h_v1` (distinto do de confirmação)
3. Só envia se status atual não for `CANCELED` nem `COMPLETED`
4. Retry e logging idênticos à Story 3.4
5. Dashboard mostra status "Lembrete enviado"

## Story 3.6: Client Response Handling & Status Update

Como **dono do salão**, quero **o status do agendamento atualizado automaticamente com base na resposta do cliente**, para que **eu não gaste tempo atualizando manualmente**.

### Acceptance Criteria

1. Webhook recebe resposta do cliente ao template de confirmação
2. Parsing da resposta: "SIM/CONFIRMO/OK/👍" → status `CONFIRMED`; "NÃO/CANCELO/NAO POSSO" → status `CANCELED`
3. Respostas ambíguas/diferentes são roteadas para Chatwoot (não fazem update automático; recepção responde manual)
4. Atualização do status dispara notificação realtime para o dashboard do salão
5. Cliente recebe template de acknowledgement ("Agendamento confirmado! Até amanhã ✨" ou "Cancelamento recebido. Esperamos você em outra oportunidade")
6. Logs completos de cada update para auditoria
7. Passa teste E2E com simulação de mensagens inbound

## Story 3.7: Cost Monitoring & Budget Alerts

Como **founder**, quero **dashboard de custo de mensageria por salão**, para que **eu garanta margem unitária positiva (<= R$ 15/mês/salão)**.

### Acceptance Criteria

1. Cada mensagem enviada registrada em `messaging_log` com custo estimado (baseado em preço do BSP por tipo de template)
2. Dashboard admin interno exibe: custo total do mês, custo médio por salão, salões acima do threshold (R$ 15/mês)
3. Alerta automático (Slack/email) quando salão ultrapassa 500 mensagens/mês
4. Agregação mensal exportável em CSV para reconciliação

---
