# Epic 4 — Finance & Commission (NFS-e deferred to Phase 2)

> ⚠️ **SCOPE CHANGE 2026-04-21:** NFS-e emission (**Stories 4.5, 4.6, 4.7**) foi **movida para Phase 2**. Stories 4.1-4.4 (Commission Rule Engine, Commission Calculation, Monthly Commission Report, Basic Financial Dashboard) permanecem no MVP. Ver [change record](../change-records/2026-04-21-mvp-scope-reduction.md).

**Epic Goal (MVP revised):** Cálculo automático de comissão + dashboard financeiro com visibilidade real de faturamento/margem. Salão fecha o mês com comissão pronta para pagamento. NFS-e emissão via sistema externo (contador do salão ou prefeitura) — integrada em Phase 2.

## Story 4.1: Commission Rule Engine

Como **dono do salão**, quero **configurar regras de comissão flexíveis por profissional**, para que **o cálculo automático reflita a realidade de contratos diferenciados**.

### Acceptance Criteria

1. Perfil do profissional suporta 2 modos: (a) % fixa sobre serviço; (b) tabela por serviço (overrides específicos)
2. Serviço pode ter comissão específica que sobrescreve a default do profissional
3. Validação: total (% profissional + % salão) = 100%
4. Simulador interativo: "Se eu fizer 10 cortes a R$ 50, profissional X ganha R$ Y"
5. Alteração de regra NÃO afeta comissões de atendimentos já realizados (histórico preservado)
6. Passa unit test extenso do engine de comissão

## Story 4.2: Commission Calculation on Service Completion

Como **sistema**, quero **calcular comissão automaticamente ao marcar serviço como atendido**, para que **o valor devido ao profissional seja registrado sem input manual**.

### Acceptance Criteria

1. Ao mudar status para `COMPLETED`, worker calcula comissão aplicando regra vigente
2. Registro persistido em `commission_entries` (agendamento_id, profissional_id, valor_servico, percentual_aplicado, valor_comissao, data_atendimento)
3. Comissão exibida no card do agendamento pós-conclusão
4. Se houver desconto aplicado no serviço, comissão é calculada sobre valor descontado (documentado em Definition of Done)
5. Testes unit cobrem: % fixa, tabela, override, desconto, múltiplos serviços no mesmo agendamento

## Story 4.3: Monthly Commission Report

Como **dono do salão**, quero **relatório mensal de comissão por profissional exportável**, para que **o pagamento seja rápido e livre de erro**.

### Acceptance Criteria

1. Tela "Comissão" com filtro por período (default: mês corrente)
2. Tabela agregada: profissional, total de atendimentos, faturamento gerado, comissão devida
3. Expansão por linha mostra atendimentos individuais (data, cliente, serviço, valor, comissão)
4. Exportação para PDF (formatado para impressão) e CSV (para folha de pagamento)
5. Agregação executa em ≤ 1s para salão com 500 atendimentos/mês

## Story 4.4: Basic Financial Dashboard

Como **dono do salão**, quero **dashboard financeiro simples mostrando faturamento e ocupação**, para que **eu saiba como o negócio está performando sem abrir planilha**.

### Acceptance Criteria

1. Tela "Financeiro" exibe: faturamento do dia/semana/mês, receita por profissional (bar chart), receita por serviço (top 10), taxa de ocupação (%), comissão total a pagar
2. Filtro de período (hoje, 7d, 30d, mês corrente, custom)
3. Gráficos renderizam em ≤ 800ms com 1000+ atendimentos no período
4. Tela é WCAG AA (cores acessíveis em gráficos, labels descritivos, alternativas textuais)

---

> ⏸️ **PHASE 2 — Stories 4.5, 4.6, 4.7 below were DEFERRED 2026-04-21.** Preserved intacta para retomada pós-PMF. MVP skip tudo isso.

---

## Story 4.5: NFS-e Integration — Nuvem Fiscal/Focus NFe Setup (PHASE 2)

Como **dev**, quero **integração com parceiro NFS-e escolhido**, para que **o salão emita notas fiscais eletronicamente**.

### Acceptance Criteria

1. Parceiro escolhido documentado em ADR (`docs/architecture/decisions/0002-nfse-partner.md`) com rationale (custo, cobertura de municípios, UX de API)
2. Municípios suportados no MVP: whitelist de 5 capitais (ex. São Paulo, Rio de Janeiro, Belo Horizonte, Curitiba, Porto Alegre) — validadas uma a uma
3. Credenciais + certificado digital armazenados com segurança (Supabase Vault)
4. Wrapper `packages/messaging/nfse.ts` ou similar com método `emitInvoice(appointmentId)`
5. Healthcheck valida conectividade com parceiro

## Story 4.6: NFS-e Emission on Demand (PHASE 2)

Como **recepcionista**, quero **emitir NFS-e com 1 clique pós-atendimento**, para que **o cliente receba nota fiscal sem eu ter que abrir outro sistema**.

### Acceptance Criteria

1. Card de agendamento `COMPLETED` exibe botão "Emitir NFS-e" (se salão está em município suportado)
2. Click dispara emissão síncrona (timeout 15s); se OK, exibe protocolo + link do PDF
3. Se timeout, dispara retry assíncrono (worker)
4. NFS-e persistida em `invoices` (appointment_id, numero, protocolo, pdf_url, status, municipio)
5. Falha após 3 retries envia notificação push/email ao salão
6. Dashboard financeiro exibe "NFS-e emitidas" / "Pendentes" / "Falhas"
7. Taxa de sucesso monitorada (alerta se cair abaixo de 95%)

## Story 4.7: Client Invoice Delivery (PHASE 2)

Como **cliente final**, quero **receber minha NFS-e por WhatsApp**, para que **eu tenha a nota para reembolso (ex. plano de saúde) sem precisar pedir**.

### Acceptance Criteria

1. Ao emissão NFS-e bem-sucedida, sistema envia template WhatsApp com link do PDF para o cliente
2. Template `invoice_delivered_v1` submetido e aprovado pela Meta
3. Cliente pode optar por não receber NFS-e automaticamente (configuração no perfil do cliente)
4. Logs de envio registrados

---
