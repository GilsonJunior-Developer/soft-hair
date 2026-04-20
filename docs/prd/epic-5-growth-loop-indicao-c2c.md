# Epic 5 — Growth Loop: Indicação C2C

**Epic Goal:** Ativar diferencial competitivo único no mercado BR — sistema de indicação cliente→cliente com crédito automático. Cada cliente do salão vira potencial canal de aquisição de novos clientes, criando growth loop orgânico que beneficia o salão (mais clientes) e o SoftHair (mais dados, mais lock-in).

## Story 5.1: Referral Link Generation per Client

Como **cliente do salão**, quero **um link único de indicação para compartilhar com amigas**, para que **eu ganhe crédito quando elas agendarem pela primeira vez**.

### Acceptance Criteria

1. Cada cliente tem URL canônica `softhair.com.br/indica/{token}`
2. Token único persistido em `referral_tokens`
3. Recepção pode enviar link ao cliente via WhatsApp pelo sistema (template `referral_link_v1` aprovado) OU cliente pode acessar pelo próprio perfil (futuro)
4. Página pública do link mostra: avatar do salão, breve copy ("Fulana te convidou a conhecer {Salão}. Agende sua primeira visita e ambas ganham crédito!"), CTA agendar
5. Página rastreia conversão (análise posterior)

## Story 5.2: Referral Attribution on First Booking

Como **sistema**, quero **atribuir a indicação à cliente indicadora quando a nova cliente agenda pelo link**, para que **o crédito possa ser aplicado posteriormente**.

### Acceptance Criteria

1. Agendamento via link de indicação é marcado com `referral_token` + `referrer_client_id`
2. Validação: nova cliente (telefone) não pode ter agendamento prévio no mesmo salão (senão não é indicação válida)
3. Regra contra fraude: 1 token só gera 1 indicação válida por par de telefones únicos
4. Atribuição aparece no perfil da cliente indicadora ("1 indicação pendente — confirmará quando amiga comparecer")
5. Passa unit test das regras de validação

## Story 5.3: Referral Confirmation on Attendance

Como **sistema**, quero **confirmar a indicação quando a nova cliente comparecer (status `COMPLETED`)**, para que **o crédito só seja efetivado em indicações reais**.

### Acceptance Criteria

1. Ao mudar status do agendamento da nova cliente para `COMPLETED`, sistema dispara validação da indicação
2. Se válida, valor do crédito é adicionado ao saldo da cliente indicadora (valor configurável pelo salão — default R$ 20 ou 15% do serviço)
3. Indicadora recebe WhatsApp de notificação (template `referral_success_v1` aprovado)
4. Dashboard do salão exibe "X indicações confirmadas este mês" com ROI estimado
5. Transação de crédito persistida em `client_credits_log` (auditoria)

## Story 5.4: Automatic Credit Application on Next Booking

Como **cliente indicadora**, quero **meu crédito aplicado automaticamente no próximo agendamento**, para que **eu não precise pedir desconto ao salão**.

### Acceptance Criteria

1. Quando cliente indicadora agenda novo serviço (via link público ou recepção), sistema verifica saldo de crédito
2. Se houver crédito, aplica automaticamente (até o limite do valor do serviço)
3. Cliente é notificada no fluxo de agendamento: "Você tem R$ X de crédito. Será aplicado neste agendamento."
4. Crédito parcial: se crédito > valor, saldo remanescente persiste
5. Comissão do profissional é calculada sobre valor ORIGINAL (não descontado) — salão absorve desconto
6. Nota fiscal emitida sobre valor efetivamente pago
7. Passa teste E2E cobrindo: crédito total ≥ serviço, crédito parcial, sem crédito

## Story 5.5: Referral Configuration per Salon

Como **dono do salão**, quero **configurar valor e regras da indicação**, para que **o programa se adapte à minha realidade financeira**.

### Acceptance Criteria

1. Tela "Configurações > Indicação" permite: valor do crédito (R$ fixo OU % do serviço da primeira visita da indicada), validade do crédito (default 90 dias), on/off master switch
2. Preview: "Se regra for 15%, uma amiga de Maria fazendo serviço de R$ 100 gerará R$ 15 de crédito a Maria"
3. Mudança de regra NÃO afeta indicações em curso (histórico preservado)

## Story 5.6: Referral Dashboard

Como **dono do salão**, quero **ver performance do programa de indicação**, para que **eu avalie o ROI do growth loop**.

### Acceptance Criteria

1. Tela "Indicação" exibe: indicações no mês (pendentes/confirmadas/expiradas), crédito total pago, novas clientes adquiridas via indicação, ROI estimado (receita da indicada − crédito pago)
2. Top 10 clientes-indicadoras (ranking)
3. Gráfico de indicações ao longo do tempo

## Story 5.7: LGPD Compliance for Referral Data

Como **sistema**, quero **garantir compliance LGPD na feature de indicação**, para que **não haja risco legal ao manipular telefones de terceiros**.

### Acceptance Criteria

1. Cliente indicadora consente explicitamente ao compartilhar seu link ("Ao enviar, você declara que a pessoa autorizou receber mensagem do salão")
2. Tela pública do link é acessada sem rastreamento invasivo (sem third-party trackers)
3. Nova cliente consente normalmente no fluxo de agendamento (mesmo de Story 2.4)
4. Documentação LGPD atualizada em `docs/compliance/lgpd.md`

---
