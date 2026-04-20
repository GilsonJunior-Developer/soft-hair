# Project Brief: SoftHair

**Data:** 2026-04-20
**Autor:** Atlas (Analyst Agent)
**Versão:** 1.0
**Status:** Aprovado para handoff ao @pm
**Template:** project-brief v2.0

---

## Executive Summary

**SoftHair** é uma plataforma SaaS de gestão operacional para salões de beleza brasileiros de pequeno-médio porte (2-10 profissionais). Resolve a fricção crônica de agendamento manual, confirmações via WhatsApp feitas à mão e cálculo de comissão em planilhas — problemas que custam horas semanais de trabalho administrativo e geram no-shows por falhas de comunicação. Diferente dos incumbentes (Trinks, Avec), o SoftHair entrega **pacote completo sem gating de features** (NFS-e, WhatsApp e comissão automática no plano base), posicionando-se no sweet spot ignorado pelos concorrentes: salões 3-5 pros que não cabem no tier mínimo do Avec nem pagam add-ons do Trinks.

---

## Problem Statement

**Estado atual:** Salões brasileiros pequeno-médios operam com um mosaico de ferramentas desarticuladas — caderno de agenda na recepção, WhatsApp solto para confirmação manual, Excel para comissão, ficha de papel para cadastro de cliente. O resultado é fricção operacional que consome 5-10 horas semanais da recepção e gera no-shows por falhas humanas na confirmação.

**Impacto quantificado:**
- No-show médio no setor: 15-25% dos agendamentos
- Tempo gasto em tarefas administrativas manuais: ~30% da jornada da recepção
- Retrabalho mensal em fechamento de comissão: 4-8 horas por salão

**Por que as soluções existentes falham:**

- **Trinks:** cobra NFS-e como add-on (complaints recorrentes no Reclame Aqui); trial de 5 dias insuficiente; admin percebido como complicado.
- **Avec:** gating agressivo — salões 1-2 pros ficam sem estoque, comissão, WhatsApp e NFS-e; salões 3-5 pros precisam saltar para tier "6-10" para ter WhatsApp/NFS-e; admin percebido como "horrível" em reviews.
- **Google Calendar + WhatsApp manual:** zero automação, zero CRM, impossível escalar além de 2 profissionais.
- **Excel + caderno:** padrão da maioria dos salões BR do interior; zero visibilidade financeira.

**Urgência:** A janela de entrada é de 12-18 meses antes de Booksy/Fresha consolidarem presença BR. O ecossistema de mensageria amadureceu: **WhatsApp Business API oficial** (via Meta + Business Solution Providers como Zenvia, Take Blip, 360dialog) agora tem preços razoáveis (~R$ 0,05-0,15 por mensagem utility template), viabilizando bundling de confirmações/lembretes no plano base do SaaS. Chatwoot (open-source) como camada de orquestração permite multi-canal (WhatsApp + email + SMS fallback) sem custo de licença.

---

## Proposed Solution

**Core concept:** Plataforma web-only (zero app nativo exigido do cliente final), entregando gestão completa do salão em interface única, com onboarding em <10 minutos via catálogo pronto de 200+ serviços padrão do setor.

### Diferenciadores-chave vs concorrentes

1. **Bundle completo no plano base** — NFS-e, WhatsApp (com cota mensal generosa) e comissão incluídos (sem add-ons, sem gating)
2. **Indicação cliente→cliente automatizada** — cliente indica amiga, ganha crédito automático (whitespace absoluto: nenhum concorrente BR oferece C2C referral)
3. **Anti-fricção radical** — cadastro só com telefone, catálogo pronto, confirmação WhatsApp 100% automática
4. **Preço transparente e único** — R$ 60-80/mês para salões 2-10 pros, sem "sob consulta"
5. **Arquitetura omnichannel via Chatwoot** — orquestração open-source de mensagens (fallback automático para email/SMS se WhatsApp falhar, histórico unificado de atendimento)

### Arquitetura de mensageria (decisão crítica)

- **Primary (padrão):** **WhatsApp Business API oficial** via Business Solution Provider (candidatos: Zenvia, Take Blip, 360dialog ou Meta Cloud API direto)
- **Camada de orquestração:** **Chatwoot self-hosted** (open-source) — unifica WhatsApp + email + SMS, gerencia templates aprovados, mantém histórico
- **Trade-off assumido:** custo marginal de ~R$ 0,05-0,15 por mensagem utility template (absorvido no plano; cota mensal definida por tier). Em troca: **zero risco de ban do número do salão**, compliance total com ToS da Meta, credibilidade enterprise.
- **NÃO usaremos API não-oficial** (Evolution API, Baileys, Venom-Bot): risco de banimento do número é incompatível com a criticidade operacional do salão.

### Pricing model — cota de WhatsApp por plano (a calibrar)

- Plano base (2-5 pros): ~500 msgs/mês (suficiente para ~250 agendamentos com confirmação + lembrete)
- Plano pro (6-10 pros): ~1.500 msgs/mês
- Excedente: cobrado com margem mínima (~R$ 0,10/msg) ou upsell de plano

### Por que essa solução vai ganhar onde as outras não ganharam

- O segmento 3-5 pros é **desatendido** — Avec obriga a saltar de tier; Trinks cobra add-ons; SoftHair ocupa o espaço vago.
- Incumbentes têm incentivo financeiro em manter o gating (ARPU); SoftHair nasce sem esse legacy constraint.
- Whitespaces técnicos (indicação C2C, voice booking futuro, rentabilidade granular) criam moat próprio.

### Visão de longo prazo

Ser o padrão operacional de salões pequeno-médios no Brasil, com 2.000+ salões pagantes em 24 meses, habilitando marketplace B2B secundário (distribuidores de cosméticos → salões) como camada 3 de monetização.

---

## Target Users

### Primary User Segment: Dono(a) de Salão (2-10 profissionais)

**Perfil demográfico/firmográfico:**
- Idade: 30-55 anos, 70% mulheres (baseline do setor beauty BR)
- Localização: capitais + cidades médias (100K+ habitantes)
- Porte: salão próprio com 2-10 profissionais, faturamento mensal R$ 30K-150K
- Formação: maioria sem background tech; gestão aprendida na prática
- Estrutura: recepção própria ou recepção híbrida (profissional sênior assume duplo papel)

**Comportamento e fluxo atual:**
- Agenda em caderno/papel ou Excel + WhatsApp manual para confirmação
- Comissão calculada na calculadora ou planilha no final do mês (3-8h/mês de retrabalho)
- Cadastro de cliente em ficha de papel; recuperação de histórico = pedir pra recepcionista lembrar
- WhatsApp pessoal da recepcionista é o ponto único de comunicação

**Dores específicas:**
- No-show de 15-25% (dinheiro perdido direto, cadeira ociosa)
- Erro recorrente em cálculo de comissão (fonte #1 de conflito com profissionais)
- Incapaz de identificar clientes inativos para reativar
- Fecha o mês sem saber quanto margem cada serviço/profissional gerou
- Troca de recepcionista = perda total de histórico operacional

**Goals:**
- Reduzir no-show e estabilizar receita mensal
- Liberar 5-10h/semana da recepção para atendimento ao cliente
- Ter visibilidade financeira real (margem, não só faturamento)
- Escalar de forma confiável quando adicionar mais 1-2 profissionais

### Secondary User Segment: Cliente final do salão

**Perfil:**
- Idade: 25-55, majoritariamente mulheres
- Frequência de uso: 1-3x/mês (corte, coloração, manicure, etc.)
- Comportamento digital: usa WhatsApp, Instagram; resistente a baixar apps de estabelecimentos individuais
- Canal preferido de agendamento: 60%+ via WhatsApp (não site, não app)

**Comportamento atual:**
- Manda "oi, tem horário?" pro WhatsApp do salão
- Aguarda resposta manual da recepcionista (pode demorar horas)
- Confirma presença por WhatsApp manual 1 dia antes
- Paga no local (dinheiro, PIX, cartão)

**Dores:**
- Demora para confirmar horário (quando não está na hora comercial)
- Falta de memória do que foi feito da última vez (cor, técnica, preferências)
- Sem controle sobre reagendamento/cancelamento (tudo depende do salão)

**Goals:**
- Agendar em <1min sem precisar instalar app
- Ter histórico do que fez no salão (data, serviço, profissional)
- Confirmar presença com 1 clique

---

## Goals & Success Metrics

### Business Objectives — Pré-MVP (3 meses)

- **Validar PMF com 20 salões design-partners** que usem SoftHair como sistema principal por 60+ dias consecutivos (métrica: DAU >= 1/dia, 5 dias/semana)
- **Atingir NPS >= 50** entre os 20 salões design-partners até o fim dos 3 meses
- **Reduzir no-show médio dos 20 salões em >= 30%** (de ~20% baseline para <= 14%) via confirmação WhatsApp automática
- **Provar thesis de bundling:** 100% dos design-partners usam WhatsApp + comissão + NFS-e (módulos que concorrentes gatinham ou cobram extra)

### Business Objectives — Pós-validação (12 meses)

- **100 salões pagantes** com ARR anualizado de R$ 90K+
- **Churn mensal <= 3%** (benchmark SaaS BR)
- **CAC < 3 meses de LTV** (unit economics saudáveis)

### User Success Metrics — Dono do salão

- **Tempo de onboarding:** <= 10min até primeiro agendamento lançado
- **Tempo poupado semanalmente:** >= 5h/semana (baseline via pesquisa com design-partners)
- **Satisfação com fechamento mensal:** >= 4/5 na pesquisa pós-fechamento (vs planilha atual)
- **Taxa de retorno de clientes inativos:** incremento de 15%+ via reativação automática

### User Success Metrics — Cliente final

- **Tempo de agendamento:** <= 60 segundos do clique no link ao "agendado"
- **Taxa de agendamento self-service:** >= 50% dos agendamentos via link público (vs WhatsApp manual)
- **Taxa de confirmação automática WhatsApp:** >= 85% respondem o template

### Key Performance Indicators (KPIs)

- **DAU/MAU ratio (salão):** >= 0.5 (uso quase diário do sistema)
- **Agendamentos/mês/salão:** >= 150 (proxy de atividade operacional)
- **Taxa de self-service agendamento:** >= 50% até fim do mês 3
- **Tempo médio de confirmação WhatsApp:** <= 4h após envio do template
- **NFS-e emitidas com sucesso:** >= 95% (sem erro de integração)
- **Custo médio de mensageria por salão:** <= R$ 15/mês (garantir margem no bundle)
- **NPS dos 20 design-partners:** >= 50 no mês 3

---

## MVP Scope

### Core Features (Must Have) — Camada 1

- **Agenda digital com calendário:** visualização diária/semanal/mensal por profissional; drag-and-drop de agendamentos; bloqueio de horários. **Rationale:** sem isso não há produto.
- **Cadastro mínimo de cliente (só telefone):** enriquecimento progressivo no histórico; zero fricção de onboarding. **Rationale:** remove barreira de entrada, diferencial vs concorrentes que exigem CPF/email/endereço.
- **Catálogo de serviços pré-preenchido (200+ padrão do setor):** dono só customiza preço; zero configuração manual obrigatória. **Rationale:** viabiliza onboarding <10min.
- **Link público de agendamento por profissional (Calendly-style):** URL compartilhável no Instagram bio, WhatsApp status; cliente agenda sem login/app. **Rationale:** self-service 50%+ dos agendamentos.
- **Confirmação WhatsApp automática** (template oficial): enviada 24h antes; resposta do cliente atualiza status. **Rationale:** redução de no-show é métrica-chave do MVP.
- **Lembrete WhatsApp automático** 2h antes: template distinto de confirmação.
- **Cálculo automático de comissão:** regras configuráveis por profissional (% fixa ou tabela por serviço); relatório mensal pronto para pagamento.
- **NFS-e integrada via parceiro externo** (Nuvem Fiscal/Focus NFe): emissão com 1 clique pós-atendimento, retry automático em caso de falha.
- **Histórico do cliente:** últimos serviços, profissional, data, observações.
- **Indicação cliente→cliente com crédito automático:** cliente recebe link de indicação; amiga agenda primeira vez; crédito em R$ aplicado automaticamente na próxima visita. **Rationale:** whitespace competitivo + growth loop orgânico.
- **Dashboard financeiro básico:** faturamento do dia/semana/mês, receita por profissional, comissão a pagar.
- **Web-only (zero app nativo):** PWA com manifest para "instalação" opcional. **Rationale:** reduz custo de desenvolvimento + remove barreira de adoção do cliente final.
- **Autenticação:** magic link por WhatsApp para dono/recepcionista; cliente final sem login (acessa via link de agendamento).

### Out of Scope for MVP

- App mobile nativo (iOS/Android) — PWA substitui
- Marketplace B2C (busca pública de salões) — ignorado: moat inatingível
- Voice booking via IA — Post-MVP
- Baixa automática de estoque por serviço — Fase 2 (fast-follow)
- Dashboard de rentabilidade por profissional/horário — Fase 2
- Multi-unidade / franquia — Fase 3
- Reativação automática de clientes inativos — Fase 2 (fast-follow)
- Campanhas de aniversário automatizadas — Fase 2 (fast-follow)
- Streak/lembrete de manutenção gamificado — Fase 3
- Integração fiscal completa (SPED, livros contábeis) — nunca (parceria com contador do salão)
- Emissão de cartão/pagamento próprio — nunca (parceria com Stone/MP/Asaas)

### MVP Success Criteria

O MVP é considerado validado quando:

1. **20 salões design-partners** usam SoftHair como sistema principal por 60+ dias consecutivos
2. **NPS >= 50** dos 20 design-partners no mês 3
3. **>= 70%** dos design-partners aceitariam pagar R$ 60-80/mês ao fim do período
4. **No-show médio** dos design-partners cai **>= 30%** vs baseline pré-SoftHair
5. **>= 50%** dos agendamentos ocorrem via link público (self-service)
6. **Zero incidentes críticos** de emissão NFS-e ou envio WhatsApp que tenham causado perda de receita ao salão

---

## Post-MVP Vision

### Phase 2 Features (meses 4-6, fast-follow pós-MVP)

- Baixa automática de estoque por serviço executado
- Controle de estoque com alertas de reposição
- Dashboard de rentabilidade por profissional/horário/cadeira
- Reativação automática de clientes inativos (>60 dias sem retorno)
- Campanhas de aniversário automatizadas
- Importador de dados Trinks/Avec (CSV) — ataque direto a switching cost
- Relatórios fiscais básicos (fechamento mensal exportável para contador)
- Integração com Google Calendar (sincronização bidirecional)

### Long-term Vision (12-24 meses)

SoftHair se consolida como **sistema operacional padrão de salões pequeno-médios no Brasil**, com 2.000+ estabelecimentos pagantes. Expansão vertical incremental: adiciona módulos de estética (clínicas), barbearia, nail designer — preservando o core de agendamento + WhatsApp + comissão. Desenvolve camada de inteligência preditiva (no-show prediction, preço dinâmico por ocupação) como moat técnico real, não imitável por incumbentes sem reescrita.

### Expansion Opportunities

- **Marketplace B2B de produtos de beleza:** distribuidores vendem direto aos salões via SoftHair (comissão 5-10% na transação)
- **Escola online integrada:** cursos de técnicas + gestão vendidos no app aos profissionais (ticket recorrente)
- **Antecipação de recebíveis** via parceria fintech (baseado no histórico de faturamento do salão)
- **Voice booking via IA:** cliente agenda por áudio no WhatsApp, IA interpreta e confirma (diferenciação técnica forte)
- **Expansão LATAM** (México, Colômbia) a partir do mês 18 — mesmos problemas, mesmas dores

---

## Technical Considerations

### Platform Requirements

- **Target Platforms:** Web (responsive PWA) — desktop e mobile
- **Browser/OS Support:** Chrome/Edge/Safari/Firefox últimas 2 versões; Android 10+ (PWA); iOS 15+ (PWA Safari)
- **Performance Requirements:**
  - TTI (Time to Interactive) <= 3s em 4G
  - Agendamento criado <= 500ms end-to-end
  - Link público de agendamento <= 2s de carregamento inicial

### Technology Preferences

- **Frontend:** **Next.js 15** (App Router, RSC), **Tailwind CSS v4**, **shadcn/ui** para componentes base
- **Backend:** Server Actions do Next.js + edge functions Supabase quando necessário (low-latency paths)
- **Database:** **Supabase (PostgreSQL)** com Row-Level Security (RLS) — multi-tenancy via schema/salão_id
- **Hosting/Infrastructure:** **Vercel** (Next.js) + **Supabase Cloud** (DB, Auth, Storage, Realtime)
- **Messaging layer:** **Chatwoot self-hosted** (Railway/Fly.io) + **WhatsApp Business API oficial** via Business Solution Provider (candidatos: 360dialog, Zenvia, ou Meta Cloud API direto)
- **Queue/Jobs:** Inngest ou Trigger.dev para confirmações/lembretes agendados
- **NFS-e:** Nuvem Fiscal ou Focus NFe (decisão em Phase 1)

### Architecture Considerations

- **Repository Structure:** Monorepo (Turborepo) com apps: `web` (Next.js), `workers` (jobs agendados), `docs`
- **Service Architecture:** Majoritariamente monolítica dentro do Next.js; serviços separados só para workers de mensagem e Chatwoot (self-hosted). Evitar microserviços prematuros.
- **Integration Requirements:**
  - WhatsApp Business API (via BSP)
  - Chatwoot REST API + webhooks
  - NFS-e (Nuvem Fiscal ou similar)
  - Eventual integração Google Calendar (Phase 2)
- **Security/Compliance:**
  - LGPD compliance (dados pessoais de clientes finais)
  - Supabase RLS como primeira linha de isolamento multi-tenant
  - Backup diário automatizado (Supabase PITR)
  - Auditoria de acesso a dados financeiros
  - Termos de uso + política de privacidade definidos antes do design-partner #1

---

## Constraints & Assumptions

### Constraints

- **Budget:** Bootstrap — zero capital externo. Gastos operacionais do MVP devem caber em R$ 500-1.500/mês (Vercel Pro, Supabase Pro, Chatwoot self-hosted em Railway, 360dialog starter).
- **Timeline:** 3 meses calendário para MVP operacional em 20 salões design-partners (de 2026-04-20 até 2026-07-20).
- **Resources:** Time = 1 founder + stack AIOX (agentes AI: @pm, @architect, @dev, @qa, @devops). Sem contratações externas no período MVP.
- **Technical:**
  - Dependência da aprovação de templates WhatsApp pela Meta (prazo típico 24-72h por template, podendo estourar)
  - NFS-e variável por município (SoftHair precisa focar inicialmente em 3-5 cidades com integração via Nuvem Fiscal)
  - PWA tem limitações de notificação push no iOS vs app nativo (aceitável para MVP)
  - Sem capital para marketing pago — aquisição de design-partners 100% via outbound/rede do founder

### Key Assumptions

- Salões 2-10 pros estão insatisfeitos o suficiente com Trinks/Avec para testar um novo player desconhecido (a validar com 20 design-partners)
- Bundle "tudo incluso" a R$ 60-80/mês é percebido como vantagem vs Avec (R$ 89,90 + gating) e Trinks (R$ 76 + NFS-e add-on)
- 60%+ dos clientes finais vão aceitar agendamento via link web sem instalar app (vs hábito WhatsApp manual)
- Meta vai aprovar templates utility (confirmação/lembrete) sem atrito significativo
- Custo médio de mensageria ficará <= R$ 15/mês/salão com a cota planejada (150 agendamentos/mês)
- Integração Nuvem Fiscal (ou equivalente) resolve NFS-e em >= 5 capitais BR sem customização
- Stack AIOX (agentes AI) conseguirá entregar dev + QA + ops em velocidade compatível com 3 meses de timeline
- Supabase RLS é suficiente para multi-tenancy no MVP (sem necessidade de schemas separados por salão)
- LGPD compliance atingível com políticas claras + consentimento explícito no cadastro do cliente final

---

## Risks & Open Questions

### Key Risks

- **Aquisição de design-partners (HIGH):** sem marketing pago, encontrar 20 salões dispostos a trocar de sistema é o maior risco. Mitigação: rede pessoal + parcerias com distribuidores de cosméticos + comunidades de donos de salão no Facebook/Instagram.
- **Aprovação de templates WhatsApp pela Meta (MEDIUM-HIGH):** rejeição de template crítico pode atrasar confirmação automática — feature central do MVP. Mitigação: submeter 5-7 templates variados early, ter SMS como fallback, acompanhar via 360dialog.
- **Custo de mensageria acima do planejado (MEDIUM):** se mensagens por salão superarem 500/mês de forma recorrente, margem unitária fica comprometida. Mitigação: cota com cobrança de excedente, monitorar desde o primeiro design-partner.
- **Resposta competitiva (MEDIUM):** Trinks ou Avec podem remover gating ou bundlar NFS-e ao observar tração do SoftHair. Mitigação: velocidade de aquisição + aprofundar whitespaces (indicação C2C, voice booking) que criam moat técnico.
- **Complexidade NFS-e por município (MEDIUM):** cada prefeitura tem nuances; 5 capitais cobrem ~40% do mercado mas cidades médias têm idiossincrasias. Mitigação: whitelist inicial de municípios suportados, roadmap claro de expansão.
- **Tech debt por velocidade solo (MEDIUM):** 3 meses solo + AI pode gerar dívida técnica que inviabiliza Fase 2. Mitigação: testes automatizados desde dia 1 via @qa (AIOX), code review via @qa em cada story.
- **LGPD / vazamento de dados (MEDIUM-HIGH):** salão guarda dados sensíveis de clientes (telefone, preferências, histórico). Incidente destrói reputação. Mitigação: RLS rigoroso, backup, auditoria, política de privacidade clara pré-lançamento.
- **Dependência de BSP (LOW-MEDIUM):** 360dialog/Zenvia podem aumentar preço ou mudar termos. Mitigação: arquitetura de mensageria abstraída na Chatwoot, permitindo swap de provider.

### Open Questions

- Onde estão os 20 primeiros design-partners? Cidade, rede de contatos, canais de abordagem definidos?
- Qual BSP escolher (360dialog, Zenvia, Take Blip, Meta Cloud API direto)? Critérios: custo, tempo de aprovação, suporte PT-BR, templates
- Pricing final: R$ 60 ou R$ 80? Testar dois preços em cohort?
- Período de trial: 14 dias (planejado) ou 30 dias (atrativo, mas consome caixa)?
- Política de indicação C2C: qual o valor do crédito (R$ 10? 15% do próximo serviço?) para maximizar conversão sem canibalizar margem?
- Multi-unidade mínimo viável: um salão com 2 endereços entra no MVP ou espera Fase 3?
- Como lidar com salão que quer personalizar templates WhatsApp além dos pré-aprovados pela Meta?

### Areas Needing Further Research

- **TAM/SAM/SOM do mercado brasileiro de salões 2-10 pros** (rodar `*perform-market-research` antes do lançamento)
- **Benchmark real de no-show por segmento** (cabelo vs unha vs estética) — base para calibrar metas
- **Pesquisa qualitativa com 10 donos de salão:** validar hipóteses de preço, gating competitivo, features mais valorizadas
- **Regulamentação LGPD específica para dados de saúde/estética** (tratamentos capilares podem tangenciar ANVISA)
- **Viabilidade técnica Nuvem Fiscal** em 10 municípios prioritários antes de fechar roadmap geográfico
- **Padrões WhatsApp template** aprovados pela Meta em concorrentes (via scraping/observação) — evitar reinventar
- **Unit economics detalhado:** CAC, LTV, payback por canal de aquisição

---

## Appendices

### A. Research Summary

Este Project Brief é o consolidado de duas fases prévias de análise executadas pelo agente Atlas:

**1. Brainstorming Session (SCAMPER)** — 2026-04-20
24 ideias geradas em 7 rodadas (Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse), categorizadas em 6 temas e priorizadas por Value/Effort/ROI. MVP de 3 camadas extraído da sessão.

**2. Competitor Analysis Report** — 2026-04-20 (ver `docs/competitor-analysis.md`)
Análise detalhada de Trinks e Avec (Priority 1) + substitutos (Google Calendar + WhatsApp, Excel). Feature matrix de 28 features × 5 colunas. Identificação de 5 blue ocean opportunities. Positioning map textual mostrando sweet spot não ocupado.

### B. References

- Brainstorming completo: registros da sessão de 2026-04-20 (histórico conversacional)
- Análise competitiva: `docs/competitor-analysis.md`
- Sites consultados: trinks.com, avec.app, reclameaqui.com.br, capterra.com, belliata.com
- Imprensa: Correio Braziliense (Avec fintech), Gazeta do Povo (Avec founders), Revista Fórum (Trinks pricing)

---

## Next Steps

### Immediate Actions

1. Rodar `*perform-market-research` (Atlas) — validar TAM/SAM/SOM BR
2. Pesquisa qualitativa com 10 donos de salão (via rede do founder) — validar pricing + features
3. Decidir BSP WhatsApp (candidatos: 360dialog vs Meta Cloud API direto) — critério: custo + tempo de aprovação
4. Handoff formal para @pm (Morgan) — iniciar PRD baseado neste brief
5. @architect (Aria) — review técnico do stack (Next.js + Supabase + Chatwoot) antes do início do desenvolvimento
6. Definir 5 municípios prioritários para NFS-e inicial
7. Recrutar 3-5 design-partners candidatos (before-code) — feedback loop começa antes do MVP

### PM Handoff

Este Project Brief fornece o contexto completo para **SoftHair**. @pm (Morgan), favor iniciar em **'PRD Generation Mode'**, revisar o brief integralmente e trabalhar com o usuário na criação do PRD seção por seção conforme o template indicar, pedindo clarificações ou sugerindo melhorias quando necessário.
