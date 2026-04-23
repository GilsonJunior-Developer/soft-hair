# Requirements

## Functional

- **FR1:** O sistema deve permitir cadastro de salão em fluxo único com ≤ 5 campos obrigatórios (nome do salão, cidade, telefone do dono, email, senha). Senha mínima: 8 caracteres. Ver ADR-0003 para rationale.
- **FR2:** O sistema deve pré-popular o catálogo de serviços do salão com ≥ 200 serviços padrão do setor (cabelo, unha, barbearia, estética), permitindo ao dono customizar preço, duração e disponibilidade sem ter que criar serviços do zero.
- **FR3:** O sistema deve suportar cadastro de profissional com perfil individual (nome, especialidades, foto opcional, horários disponíveis, percentual de comissão ou tabela por serviço).
- **FR4:** O sistema deve oferecer uma agenda visual (dia/semana/mês) por profissional e consolidada por salão, com drag-and-drop para reagendamento e bloqueio manual de horários.
- **FR5:** O sistema deve gerar um link público único por profissional (formato `softhair.com.br/{salao}/{profissional}`), compartilhável no Instagram bio e WhatsApp status.
- **FR6:** O cliente final deve conseguir agendar pelo link público fornecendo apenas número de WhatsApp + selecionando serviço e horário, sem necessidade de login ou app nativo.
- **FR7:** O sistema deve manter histórico do cliente (serviços anteriores, profissional, data, observações do atendimento) recuperável por telefone.
- **FR8:** O sistema deve enviar confirmação automática via WhatsApp Business API oficial 24h antes do agendamento, usando template utility pré-aprovado pela Meta.
- **FR9:** O sistema deve enviar lembrete automático via WhatsApp 2h antes do agendamento, com template utility distinto do de confirmação.
- **FR10:** O sistema deve atualizar automaticamente o status do agendamento com base na resposta do cliente ao template WhatsApp (CONFIRMADO, CANCELADO, SEM RESPOSTA).
- **FR11:** O sistema deve calcular comissão automaticamente por profissional ao final de cada atendimento, aplicando regras configuráveis (% fixa ou tabela por serviço).
- **FR12:** O sistema deve gerar relatório mensal de comissão por profissional, exportável em PDF/CSV, pronto para pagamento.
- **FR13:** O sistema deve emitir NFS-e pós-atendimento em 1 clique via integração com parceiro externo (Nuvem Fiscal ou Focus NFe), suportando inicialmente ≥ 5 municípios prioritários.
- **FR14:** O sistema deve implementar retry automático em caso de falha de emissão NFS-e, com notificação ao dono do salão se falhar após 3 tentativas.
- **FR15:** O sistema deve exibir dashboard financeiro básico com faturamento do dia/semana/mês, receita por profissional e comissão a pagar no período.
- **FR16:** O sistema deve gerar um link único de indicação por cliente, compartilhável em WhatsApp/Instagram.
- **FR17:** Quando uma nova cliente agenda pela primeira vez via link de indicação, o sistema deve registrar a indicação e atribuir crédito configurável (R$ em valor absoluto ou % do serviço) à cliente indicadora.
- **FR18:** O sistema deve aplicar automaticamente o crédito acumulado da indicadora no próximo agendamento dela, sem necessidade de input manual do salão.
- **FR19:** O sistema deve permitir autenticação do dono/recepcionista via email + senha. Recuperação de senha via magic link enviado ao email cadastrado (mecanismo de recovery secundário, não primário). Ver ADR-0003.
- **FR20:** O sistema deve suportar múltiplos usuários por salão com papéis distintos (Dono, Recepcionista, Profissional) e permissões diferenciadas.
- **FR21:** O cliente final deve conseguir cancelar ou reagendar seu agendamento via link único recebido por WhatsApp, dentro da janela permitida pelo salão (configurável, default 24h).
- **FR22:** O sistema deve permitir ao salão configurar janelas de horário de funcionamento, intervalos (almoço), e bloqueios recorrentes (folga semanal de cada profissional).

## Non Functional

- **NFR1:** A aplicação deve ser PWA web-responsive com suporte a Chrome/Edge/Safari/Firefox (últimas 2 versões), Android 10+ e iOS 15+ (Safari).
- **NFR2:** Time to Interactive (TTI) deve ser ≤ 3 segundos em conexão 4G para páginas públicas (link de agendamento) e ≤ 4s para dashboard do salão.
- **NFR3:** A criação de agendamento (end-to-end) deve completar em ≤ 500ms (servidor) em condições normais.
- **NFR4:** O sistema deve estar em conformidade com LGPD: consentimento explícito no cadastro do cliente final, direito de exclusão de dados, política de privacidade clara pré-disponibilizada.
- **NFR5:** Multi-tenancy deve ser implementada via Row-Level Security (RLS) no Supabase, garantindo isolamento completo de dados entre salões a nível de banco.
- **NFR6:** O sistema deve emitir NFS-e com taxa de sucesso ≥ 95% em municípios suportados; falhas devem ser logadas, notificadas e reprocessadas automaticamente.
- **NFR7:** Backup de banco de dados deve ocorrer diariamente com retenção mínima de 30 dias (Point-in-Time Recovery via Supabase).
- **NFR8:** Uso de WhatsApp Business API oficial deve ser 100% compliant com ToS da Meta — nenhuma API não-oficial (Evolution, Baileys, Venom-Bot) pode ser utilizada em qualquer hipótese.
- **NFR9:** Custo médio de mensageria por salão não deve exceder R$ 15/mês na cota base (~500 mensagens/mês), garantindo margem unitária positiva no plano base.
- **NFR10:** A aplicação deve atender WCAG 2.1 AA em todas as telas do dono/recepcionista e no link público de agendamento do cliente final.
- **NFR11:** Infraestrutura mensal total (Vercel + Supabase + Chatwoot host + BSP WhatsApp + Nuvem Fiscal) deve caber em orçamento de R$ 500-1.500/mês durante a fase MVP (até 20 salões).
- **NFR11a:** A entrega de email transacional (recuperação de senha, notificações de agendamento, relatórios) deve usar SMTP custom de provedor com domain verification (SPF/DKIM/DMARC). Taxa de entrega ≥ 95% em Gmail/Outlook (não built-in Supabase service). Ver Story 1.8.
- **NFR12:** Logs de acesso a dados financeiros (faturamento, comissão, NFS-e) devem ser mantidos com trilha de auditoria (quem, quando, qual salão).
- **NFR13:** O link público de agendamento deve suportar ≥ 100 acessos simultâneos por salão sem degradação (load test como parte do Definition of Done).
- **NFR14:** Emissão de templates WhatsApp deve passar por aprovação prévia da Meta; templates não-aprovados não podem ser enviados em produção.

---
