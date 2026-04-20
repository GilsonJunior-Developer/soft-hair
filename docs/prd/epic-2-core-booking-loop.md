# Epic 2 — Core Booking Loop

**Epic Goal:** Habilitar o salão a receber e gerenciar agendamentos de fim a fim. Salão tem agenda visual funcional; cliente final consegue agendar via link público apenas com telefone; histórico do cliente é mantido. Ao fim do epic, os design-partners podem operar (mesmo que a confirmação WhatsApp ainda seja manual — Epic 3 automatiza).

## Story 2.1: Visual Calendar/Agenda View

Como **dono/recepcionista do salão**, quero **ver a agenda visual com filtros por profissional e período**, para que **eu tenha controle operacional do dia**.

### Acceptance Criteria

1. Visualização em 3 modos: Dia, Semana, Mês — selecionável via toggle
2. Filtro por profissional (all/um específico)
3. Agendamentos renderizados como blocks coloridos na grade de horário
4. Click no bloco abre modal com detalhes + ações (cancelar, reagendar, marcar como atendido)
5. Click em slot vazio abre fluxo de criar agendamento (Story 2.2)
6. Indicador visual de horário atual ("linha vermelha") no dia corrente
7. Navegação entre dias/semanas/meses via botões + (opcional) gesture swipe no mobile
8. Performance: renderiza semana com 100 agendamentos em ≤ 500ms

## Story 2.2: Manual Appointment Creation (by Salon Staff)

Como **recepcionista**, quero **criar um agendamento manualmente quando o cliente liga ou aparece presencialmente**, para que **nenhum agendamento seja perdido**.

### Acceptance Criteria

1. Botão "+ Novo agendamento" visível em todas as telas de agenda
2. Formulário: cliente (busca por telefone — se existir, carrega; se não, cria novo cliente), serviço (dropdown do catálogo ativo), profissional (dropdown com disponibilidade filtrada), data e hora (picker)
3. Sistema calcula automaticamente horário de término baseado na duração do serviço
4. Validação: não permite conflito de horário com outro agendamento do mesmo profissional
5. Ao confirmar, agendamento aparece imediatamente na agenda (realtime via Supabase Realtime, sem reload)
6. Se o cliente novo, registra em `clients` com telefone como identificador único
7. Passa teste E2E de criação completa

## Story 2.3: Public Booking Link per Professional

Como **dono do salão**, quero **um link público único por profissional compartilhável**, para que **clientes agendem via Instagram/WhatsApp sem fricção**.

### Acceptance Criteria

1. Cada profissional ativo tem URL canônica `softhair.com.br/{slug-salao}/{slug-profissional}`
2. Slug gerado automaticamente a partir do nome (lowercase, kebab-case, com deduplicação)
3. Tela de Profissionais exibe botão "Copiar link público" que copia para clipboard
4. Link renderiza página pública SSR (SEO-friendly) com: foto do profissional, serviços disponíveis, avaliações (futuro), CTA "Agendar agora"
5. Página carrega em ≤ 2s em 4G (validado via Lighthouse ≥ 90 em Performance)
6. Metadados Open Graph configurados para preview rico em WhatsApp/Instagram
7. Página é WCAG AA compliant

## Story 2.4: Client-Facing Self-Booking Flow

Como **cliente final**, quero **agendar pelo link público informando apenas meu WhatsApp**, para que **o agendamento leve ≤ 60 segundos sem baixar app**.

### Acceptance Criteria

1. Fluxo em 3 passos: (a) escolher serviço, (b) escolher data+horário disponível, (c) informar nome + WhatsApp → confirmar
2. Passo (b) mostra apenas slots realmente disponíveis (respeita horário de trabalho do profissional, duração do serviço, agendamentos existentes)
3. Validação de telefone BR (formato E.164)
4. Checkbox obrigatório de consentimento LGPD ("Concordo que meus dados sejam usados para confirmar o agendamento e histórico")
5. Ao confirmar, agendamento persiste em `appointments` com status `PENDING_CONFIRMATION`
6. Cliente recebe tela de sucesso com resumo + "instruções do que acontece agora" (confirmação virá por WhatsApp)
7. Fluxo completo passa teste E2E em ≤ 60 segundos (Playwright)
8. Tracking: evento `booking_completed` dispara no analytics

## Story 2.5: Client History & Profile

Como **dono/recepcionista**, quero **ver o histórico de cada cliente**, para que **eu personalize o atendimento (lembrar do que fez antes)**.

### Acceptance Criteria

1. Tela "Clientes" lista clientes do salão (ordenável por último agendamento, nome, quantidade de visitas)
2. Busca por nome OU telefone
3. Detalhe do cliente exibe: dados básicos, últimos 10 agendamentos (serviço, profissional, data, observações), próximos agendamentos agendados, crédito de indicação disponível (placeholder — Epic 5)
4. Campo "Observações do atendimento" editável pós-serviço (anotações livres)
5. Soft delete com confirmação
6. Performance: lista de 1000+ clientes renderiza em ≤ 1s com paginação

## Story 2.6: Appointment Status Lifecycle

Como **recepcionista**, quero **mudar o status do agendamento (confirmado, atendido, no-show, cancelado)**, para que **eu rastreie eventos operacionais e métricas de no-show**.

### Acceptance Criteria

1. Estados possíveis: `PENDING_CONFIRMATION`, `CONFIRMED`, `COMPLETED` (atendido), `NO_SHOW`, `CANCELED`
2. Transições válidas documentadas (state machine): PENDING → CONFIRMED | CANCELED; CONFIRMED → COMPLETED | NO_SHOW | CANCELED
3. Ação manual via menu do card de agendamento (confirmar, marcar atendido, marcar no-show, cancelar)
4. Cancelamento registra motivo (opcional — dropdown + texto livre)
5. Histórico de transições persistido em tabela `appointment_status_log` (auditoria)
6. Métrica de no-show calculável por período (agregação dos estados `NO_SHOW`/`COMPLETED`)
7. Passa teste E2E de cada transição

## Story 2.7: Client-Side Appointment Management

Como **cliente final**, quero **cancelar ou reagendar meu agendamento via link único**, para que **eu não precise ligar para o salão**.

### Acceptance Criteria

1. Cliente recebe URL única `softhair.com.br/agendamento/{token}` após confirmar (via WhatsApp — integração completa em Epic 3; nesta story, URL pode ser testada manualmente)
2. Token é JWT assinado com validade até data do agendamento
3. Página mostra resumo do agendamento + ações: "Cancelar" e "Reagendar"
4. Janela de cancelamento configurável pelo salão (default 24h antes)
5. Reagendar abre mesmo fluxo de Story 2.4 (novo slot dentro das disponibilidades)
6. Cancelamento atualiza status para `CANCELED` e libera o slot na agenda do salão em tempo real
7. Tela pós-ação confirma ao cliente + sugere reagendar se cancelou

---
