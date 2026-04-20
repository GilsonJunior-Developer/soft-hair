# Competitive Analysis Report: SaaS para Salão de Beleza (BR)

**Data:** 2026-04-20
**Autor:** Atlas (Analyst Agent)
**Projeto:** project-squad — SaaS para salões de beleza 2-10 profissionais (BR)
**Template:** competitor-analysis v2.0

---

## Executive Summary

O mercado brasileiro de SaaS para salão é **dominado por dois players entrincheirados** (Trinks e Avec), ambos com marketplaces B2C próprios gerando efeitos de rede. Apesar disso, existem **whitespaces competitivos relevantes** para um novo entrante focado em salões pequeno-médios (2-10 profissionais):

**Principais insights estratégicos:**

1. **Gating agressivo do Avec é a maior vulnerabilidade competitiva**: tier 1-2 profissionais fica sem estoque, comissão, WhatsApp e NFS-e. Salões em crescimento (3-10 pros) precisam pagar tier superior.
2. **NFS-e como add-on pago no Trinks** gera insatisfação recorrente no Reclame Aqui — oportunidade de bundling no plano base.
3. **4 whitespaces técnicos** não cobertos por nenhum concorrente: (a) baixa automática de estoque por serviço, (b) rentabilidade por profissional/horário, (c) voice booking via IA, (d) programa de indicação cliente→cliente.
4. **Marketplace B2C é moat inatingível no MVP**: Trinks tem 100K+ usuários finais, Avec tem 700K+. Estratégia recomendada: competir em excelência B2B, não tentar replicar marketplace.

**Ações estratégicas recomendadas:**
- **Posicionamento:** "Tudo incluído para salões 2-10 pros — sem gating, sem add-ons"
- **MVP:** focar em table stakes + 2-3 diferenciadores de whitespace
- **Preço-alvo:** entre R$ 60-80/mês para 2-10 profissionais (abaixo do Avec 3-5+, competitivo com Trinks)

---

## Analysis Scope & Methodology

### Analysis Purpose
**Feature Gap Analysis** — identificar features presentes (ou ausentes) nos concorrentes para informar escopo do MVP do produto.

### Competitor Categories Analyzed
- **Direct Competitors** (Priority 1): Trinks, Avec (ex-SalãoVIP)
- **Substitutes** (Priority 4): Google Calendar + WhatsApp, Excel/caderno de papel

### Research Methodology
- **Fontes:** sites oficiais, páginas de pricing, páginas de ajuda, Reclame Aqui, Capterra, imprensa brasileira (Correio Braziliense, Gazeta do Povo, Revista Fórum)
- **Timeframe:** abril 2026
- **Confidence level:** Alto para pricing e features documentadas; Médio para features tier-gated (Avec usa "sob consulta" em tiers intermediários); Médio para UX (baseado em reviews públicos)
- **Limitações:** Sem acesso a trial hands-on; dados de market share são estimativas baseadas em claims públicos dos fornecedores

---

## Competitive Landscape Overview

### Market Structure
- **Concentração:** Moderadamente consolidado — Trinks e Avec juntos dominam a mente do mercado BR
- **Concorrentes ativos:** 5-10 players relevantes; Trinks e Avec são os únicos com escala nacional comprovada (40K+ estabelecimentos cada)
- **Dinâmica:** Consolidação via fintech (Avec = pivô de SalãoVIP) e aquisição estratégica (Trinks adquirido pelo Grupo Stone)
- **Entradas recentes:** Players globais (Booksy, Fresha) tentando entrar — baixa penetração atual

### Competitor Prioritization Matrix

| Priority | Players | Rationale |
|---|---|---|
| **P1 — Core Competitors** | Trinks, Avec | Alto market share + Alta ameaça direta |
| **P2 — Emerging Threats** | Booksy, Fresha | Baixo share BR + Alta ameaça (capital global) |
| **P3 — Established Players** | — | — |
| **P4 — Substitutes** | Google Calendar + WhatsApp, Excel + caderno | Alto uso na realidade (especialmente salões sub-3 pros) + Baixa ameaça tecnológica |

---

## Individual Competitor Profiles

### Trinks — Priority 1

#### Company Overview
- **Founded:** ~2011 (origem: Perlink)
- **Headquarters:** Brasil
- **Company Size:** Não divulgado; "TrinkSouls" team, GPTW-certified
- **Funding:** Subsidiária do **Grupo Stone** (pós-aquisição)
- **Leadership:** Equipe integrada ao Stone

#### Business Model & Strategy
- **Revenue Model:** SaaS assinatura mensal/anual + add-ons pagos
- **Target Market:** Salões, barbearias, esmalterias, clínicas estética, estúdios, franquias — todos os tamanhos
- **Value Proposition:** "Plataforma completa para o negócio de beleza" + marketplace B2C integrado
- **Go-to-Market:** Inbound (SEO/conteúdo) + parcerias Stone + marketplace consumidor B2C gerando leads B2B
- **Strategic Focus:** Expansão de features fintech (pagamentos nativos via Stone), retenção via ecossistema

#### Product/Service Analysis
- **Core Offerings:** Agenda, CRM, comissão, estoque, financeiro, app para salão + app consumidor
- **Key Features:** Marketplace B2C (100K+ usuários), Rotina de Mensagens WhatsApp, integração Stone nativa
- **User Experience:** Mobile e desktop; admin reportado como "complicado" em reviews
- **Pricing:**
  - 1-2 profissionais: R$ 76/mês (anual: ~R$ 65/mês)
  - 3-4 profissionais: R$ 110/mês
  - 5-10 e 11+: sob consulta
  - Trial: 5 dias
- **Add-ons pagos:** App exclusivo, Clube de Assinaturas, NFS-e, loyalty, self-service portal

#### Strengths & Weaknesses

**Strengths:**
- Market leader com network effects (100K+ usuários B2C gerando leads B2B)
- Respaldo financeiro Stone — pagamentos/conta digital nativos
- Reclame Aqui 8.9/10, resolução 97%
- Feature set mais completo do mercado BR
- Escala: 44K+ estabelecimentos, 5.5K+ cidades

**Weaknesses:**
- NFS-e como add-on pago → complaints recorrentes no Reclame Aqui
- Instabilidade reportada (agendamentos deletados, duplicidade de invoices)
- Trial curto (5 dias) vs concorrentes (30+ dias)
- Pricing mid-high para salões pequenos
- Admin UI percebido como complexo

#### Market Position & Performance
- **Market Share:** Estimativa top-2 BR
- **Customer Base:** 44K+ estabelecimentos, 100K+ usuários finais, 460M+ agendamentos processados
- **Growth Trajectory:** Maturidade — foco em retenção e expansão de ARPU via add-ons
- **Recent Developments:** Integração aprofundada com ecossistema Stone

---

### Avec (ex-SalãoVIP) — Priority 1

#### Company Overview
- **Founded:** 2013 (como SalãoVIP); rebrand para Avec
- **Headquarters:** Brasil (CNPJ 18.285.421/0001-71)
- **Company Size:** Não divulgado; funded por Lanx Capital
- **Funding:** Lanx Capital (valor não divulgado)
- **Leadership:** Fernanda Greggio, Victor Sorroche, Feres Baladi, Robson Teles

#### Business Model & Strategy
- **Revenue Model:** SaaS assinatura + **fintech** (AvecPay, split de pagamentos, conta digital)
- **Target Market:** Salões, barbearias, clínicas estética, tattoo, espaços infantis
- **Value Proposition:** "Sistema + fintech para o setor de beleza"
- **Go-to-Market:** Marketplace B2C (700K+ usuários) + vendas diretas
- **Strategic Focus:** Monetização financeira (AvecPay é core do modelo)

#### Product/Service Analysis
- **Core Offerings:** Agenda, CRM, financeiro + AvecPay (fintech diferencial)
- **Key Features:** Maior base B2C (700K+), split de pagamentos, conta digital
- **User Experience:** Mobile-first heritage; admin reportado como "horrível/muito complicado" em reviews
- **Pricing:**
  - 1-2 pessoas: R$ 89,90/mês (anual: R$ 77,90)
  - 3-5 pessoas: sob consulta
  - 6-10 pessoas: sob consulta
  - 11-20: sob consulta
  - 21+ (Premium): a partir de R$ 369,90/mês
- **Gating crítico:**
  - Tier 1-2: SEM estoque, SEM comissão, SEM WhatsApp, SEM NFS-e
  - Tier 3-5: +comissão, +estoque, +financeiro, +loyalty
  - Tier 6-10: +WhatsApp scheduling, +NFS-e

#### Strengths & Weaknesses

**Strengths:**
- Fintech integrada (AvecPay, split, conta digital) — stack financeiro mais profundo
- Maior base B2C do mercado (700K+ usuários Avec app)
- Presença consolidada em múltiplos verticais (tattoo, infantil, barber)
- Desconto anual relevante (~13%)

**Weaknesses:**
- Gating agressivo inviabiliza salões pequenos em crescimento
- Reclame Aqui NÃO verificado (reviews insuficientes)
- Complaints específicos: erro de cálculo de comissão (10% virou 60%, R$ 1.867 de overpayment), débitos incorretos
- Admin UI percebido como "horrível"
- Pricing opaco (mid-tiers "sob consulta" criam fricção)

#### Market Position & Performance
- **Market Share:** Estimativa top-2 BR
- **Customer Base:** ~40K estabelecimentos B2B, ~700K consumidores B2C
- **Growth Trajectory:** Crescimento via fintech (AvecPay)
- **Recent Developments:** Pivô completo para fintech (rebrand SalãoVIP → Avec)

---

### Substitutos (Priority 4)

#### Google Calendar + WhatsApp
- **Uso:** Muito comum em salões sub-3 pros
- **Strengths:** Grátis, familiar, WhatsApp é canal nativo BR
- **Weaknesses:** Zero CRM, zero financeiro, zero estoque, agendamento 100% manual
- **Switching cost para nosso SaaS:** Baixo se onboarding for < 10min

#### Excel + Caderno de papel
- **Uso:** Realidade de milhares de salões BR (especialmente interior)
- **Strengths:** Zero custo, zero aprendizado
- **Weaknesses:** Zero automação, dados perdidos, impossível escalar
- **Switching cost:** Médio — depende de migração assistida

---

## Comparative Analysis

### Feature Comparison Matrix

| Feature | project-squad (MVP planejado) | Trinks | Avec | GCal + WhatsApp | Excel |
|---|---|---|---|---|---|
| **Booking & Agenda** | | | | | |
| Online booking self-service | ✅ | ✅ | ✅ | ❌ | ❌ |
| Calendário nativo | ✅ | ✅ | ✅ | ✅ | ❌ |
| Link público por profissional (Calendly-style) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Self-service de cliente (sem cadastro longo) | ✅ | ⚠️ | ⚠️ | ❌ | ❌ |
| **Comunicação** | | | | | |
| WhatsApp confirmação automática | ✅ | ✅ | ⚠️ gated 6-10+ | ❌ manual | ❌ |
| WhatsApp lembrete 24h | ✅ | ✅ | ⚠️ gated 6-10+ | ❌ manual | ❌ |
| Voice booking IA | 🟢 Fase 2 | ❌ | ❌ | ❌ | ❌ |
| **CRM & Retenção** | | | | | |
| Cadastro mínimo (só telefone) | ✅ | ⚠️ | ⚠️ | ❌ | ❌ |
| Histórico + sugestão de serviço | ✅ | ✅ | ✅ | ❌ | ❌ |
| Campanha aniversário automática | ✅ fast-follow | ✅ | ⚠️ gated | ❌ | ❌ |
| Reativação cliente inativo | ✅ fast-follow | ✅ | ⚠️ gated | ❌ | ❌ |
| Indicação cliente→cliente (crédito automático) | ✅ | ❌ (só partner-referral) | ❌ | ❌ | ❌ |
| Streak/lembrete manutenção | 🟢 Fase 2 | ❌ | ❌ | ❌ | ❌ |
| **Financeiro & Comissão** | | | | | |
| Comissão automática | ✅ | ✅ | ⚠️ gated 3-5+ | ❌ | ❌ |
| Margem ultra-detalhada (serviço/produto/pro/horário) | 🟢 Fase 3 | ⚠️ | ⚠️ | ❌ | ❌ |
| Rentabilidade por profissional/horário | ⚠️ fast-follow | ❓ | ❓ | ❌ | ❌ |
| **Estoque** | | | | | |
| Controle de estoque | ✅ fast-follow | ✅ | ⚠️ gated 3-5+ | ❌ | ❌ |
| Baixa automática por serviço executado | ✅ fast-follow | ❓ | ❓ | ❌ | ❌ |
| **Operação** | | | | | |
| Catálogo pronto 200+ serviços | ✅ | ✅ | ✅ | ❌ | ❌ |
| NFS-e | ✅ via integração externa | 💰 add-on pago | ⚠️ gated 6-10+ | ❌ | ❌ |
| Multi-unidade | 🟢 Fase 3 | ✅ | ❓ | ❌ | ❌ |
| **Plataforma** | | | | | |
| Web-only (sem app cliente) | ✅ (constraint) | ❌ (tem app cliente) | ❌ (tem app cliente) | N/A | N/A |
| App mobile para salão | 🟢 Fase 3 | ✅ | ✅ | N/A | N/A |
| **Pricing** | | | | | |
| Preço inicial (1-2 pros) | ~R$ 60-80/mês (alvo) | R$ 76/mês | R$ 89,90/mês | Grátis | Grátis |
| Trial | 14 dias (planejado) | 5 dias | Não documentado | N/A | N/A |

**Legenda:** ✅ presente | ⚠️ parcial/gated | ❌ ausente | ❓ não documentado | 💰 add-on pago | 🟢 fase futura

### SWOT Comparison

#### project-squad (Your Solution)

- **Strengths:** Web-only (sem custo de app), bundle completo sem gating, catálogo pronto, indicação C2C automática (whitespace), voice booking planejado (whitespace), foco cirúrgico em 2-10 pros
- **Weaknesses:** Zero brand recognition, zero marketplace B2C, zero ecossistema fintech, time enxuto
- **Opportunities:** Gating Avec deixa milhares de salões 3-5 pros pagando caro por tier 6-10 features; Trinks add-ons irritam base; whitespaces técnicos (estoque auto, rentabilidade granular, IA)
- **Threats:** Trinks/Avec podem remover gating; Booksy/Fresha podem entrar BR com capital; salões resistentes a trocar

#### vs. Trinks (main competitor)

- **Competitive Advantages:** Bundle NFS-e (eles cobram extra), preço potencialmente menor, UX anti-fricção, zero app do cliente (ambos os lados navegam só web)
- **Competitive Disadvantages:** Sem marketplace B2C (eles têm lead-gen nativo), sem integração Stone nativa (eles têm pagamentos embutidos), feature-set menor no MVP
- **Differentiation Opportunities:** "Plano único sem add-ons surpresa" / "NFS-e incluída" / "Indicação automática com crédito" / "Voice booking"

#### vs. Avec

- **Competitive Advantages:** Zero gating (tudo no plano base), preço potencialmente menor, admin mais simples (ataque direto à crítica #1 deles)
- **Competitive Disadvantages:** Sem fintech (eles têm AvecPay), sem marketplace B2C 700K (eles têm)
- **Differentiation Opportunities:** "Salão 2-10 pros paga por salão, não por feature"

### Positioning Map

**Dimensões sugeridas:** Price (baixo→alto) vs. Feature-completeness (básico→completo)

```
Feature-completeness
         ↑
         │
  COMPLETO│  Trinks ●           ● Avec (tiers altos)
         │
         │            [project-squad MVP] ← posicionamento alvo
         │                  ●
  BÁSICO │  GCal+WA ●           ● Avec (tier 1-2)
         │  Excel ●
         └─────────────────────────→ Price
           BAIXO              ALTO
```

**Posicionamento alvo:** Feature-completo (table stakes + whitespaces) @ Preço médio-baixo — sweet spot que nenhum concorrente ocupa.

---

## Strategic Analysis

### Sustainable Advantages (Moats potenciais)

- **Switching costs:** Migração assistida a partir de concorrentes (importador automático do Trinks/Avec) — gera lock-in via dados históricos
- **Brand strength:** A ser construído — invistir em conteúdo BR, Reclame Aqui responsivo
- **Technology barriers:** IA de voice booking + baixa automática de estoque por serviço (whitespaces técnicos)
- **Network effects:** NÃO perseguir marketplace B2C no MVP — é moat inatingível; focar em excelência B2B

### Vulnerable Points (onde atacar)

- **Trinks:** NFS-e add-on (cobrado à parte), trial curto (5 dias), instabilidade reportada
- **Avec:** Gating agressivo para 1-5 pros, admin percebido como complicado, Reclame Aqui não verificado

### Blue Ocean Opportunities

1. **Salões 3-5 pros** que não cabem no tier 1-2 do Avec (sem features core) nem pagam o tier 6-10 (caro demais) — segmento desatendido
2. **Indicação cliente→cliente automatizada** (whitespace absoluto no BR)
3. **Rentabilidade granular por horário/cadeira** (nenhum concorrente entrega)
4. **Voice booking via WhatsApp + IA** (absolutely uncontested)
5. **Preço dinâmico por ocupação** (Uber-style, nenhum concorrente testou)

---

## Strategic Recommendations

### Differentiation Strategy

**Value Propositions a enfatizar:**
1. "Tudo incluso, sem gating — NFS-e, WhatsApp e comissão no plano base"
2. "Indicação automática: cliente indica, ganha crédito, sem intervenção manual"
3. "Só web — seu cliente agenda sem baixar app nenhum"

**Features para priorizar no MVP (camada 1):**
- Agenda + link público por profissional
- WhatsApp confirmação + lembrete automáticos
- Comissão automática
- NFS-e integrada (via parceiro externo — ex. Nuvem Fiscal)
- Cadastro mínimo + catálogo pronto
- Indicação C2C com crédito automático ← **diferencial**

**Segmentos-alvo (em ordem):**
1. Salões 3-5 pros insatisfeitos com gating Avec
2. Salões 2-4 pros que pagam Trinks e reclamam de NFS-e extra
3. Salões usando GCal + WhatsApp manual (upgrade path)

### Competitive Response Planning

#### Offensive Strategies (ganhar market share)
- **Importador Trinks/Avec:** migração em 1 clique (ataque ao switching cost dos incumbentes)
- **Campanha "Zero add-ons":** landing page comparativa "plano base do project-squad vs tiers do Avec"
- **Trial 30 dias:** 6x o trial do Trinks (5 dias) — reduz fricção de experimentação
- **Garantia de migração:** "Não gostou em 30 dias? Reembolso + exportação dos dados"

#### Defensive Strategies (proteger posição)
- **Fortalecer switching cost:** backups automáticos, export CSV sempre disponível (paradoxalmente reduz churn por sensação de segurança)
- **Deep customer relationships:** onboarding humano nos primeiros 30 salões (NPS baseline)
- **Moat de dados:** histórico completo do cliente (indicações, preferências, frequência) vira caro de sair

### Partnership & Ecosystem Strategy

**Parceiros complementares:**
- **NFS-e:** Nuvem Fiscal, Focus NFe, eNotas (não reinventar fiscal)
- **Pagamentos:** Stone/Mercado Pago/Asaas (não competir com AvecPay)
- **WhatsApp Business API:** Meta oficial ou broker (Zenvia, Take)

**Canais de distribuição:**
- Parceria com distribuidores de produtos de beleza (L'Oréal Pro, Wella) — incentivo B2B
- Integração com Instagram Business (link direto de agenda em bio)

**Integrações estratégicas:**
- Google Calendar (sincronização bidirecional — facilita migração)
- iFood Benefícios / Gympass (pacotes de beleza corporativos — Fase 3)

---

## Monitoring & Intelligence Plan

### Key Competitors to Track

| Prioridade | Player | Razão |
|---|---|---|
| 1 | Trinks | Leader BR, benchmark de features |
| 1 | Avec | Segundo maior, ameaça direta no segmento-alvo |
| 2 | Booksy, Fresha | Entrada potencial com capital global |
| 3 | Novos entrantes BR | Monitorar Product Hunt BR, ABF (franquias) |

### Monitoring Metrics

- **Product updates:** Changelog/release notes de Trinks e Avec (mensal)
- **Pricing changes:** Snapshot de páginas de pricing (trimestral)
- **Customer wins/losses:** Reclame Aqui (busca semanal por "mudei para", "cancelei")
- **Funding/M&A:** Pitchbook, CrunchBase, TechCrunch BR (trimestral)
- **Market messaging:** LinkedIn e Instagram oficiais (mensal)

### Intelligence Sources

- **Company sites:** trinks.com, avec.app, negocios.trinks.com, negocios.avec.app
- **Customer reviews:** Reclame Aqui, Capterra BR, G2 (categorias: salon software, appointment scheduling BR)
- **Industry:** Cosmética em Foco, Revista Negócios Estética, ABF (franquias de beleza)
- **Social:** LinkedIn dos founders, Instagram oficiais, YouTube (reviews de donos de salão)
- **Patent filings:** INPI (busca por "agendamento + salão")

### Update Cadence

- **Semanal:** Buscas ativas em Reclame Aqui (menções de migração, bugs críticos)
- **Mensal:** Product updates e social media dos dois concorrentes P1
- **Trimestral:** Snapshot completo de pricing + SWOT refresh
- **Anual:** Reexecução completa desta análise + reavaliação de Priority Matrix

---

## Apêndice: Fontes Consultadas

- [Trinks — Site oficial](https://www.trinks.com/)
- [Trinks — Pricing](https://negocios.trinks.com/planos/)
- [Trinks — Quem somos](https://negocios.trinks.com/quem-somos/)
- [Trinks — Rotina de Mensagens WhatsApp](https://ajuda.trinks.com/o-que-%C3%A9-a-rotina-de-mensagens)
- [Trinks no Reclame Aqui](https://www.reclameaqui.com.br/empresa/trinks/)
- [Trinks — Problemas NFS-e no RA](https://www.reclameaqui.com.br/trinks/problemas-com-emissao-de-nfse-e-falta-de-suporte-da-trinks-apos-atualizacao-do-sistema_Z1Dn6iMVdFlpxLkr/)
- [Trinks no Capterra](https://www.capterra.com/p/252863/Trinks/)
- [Avec — Site oficial](https://www.avec.app/)
- [Avec — Pricing](https://negocios.avec.app/planos)
- [Avec/SalãoVIP no Reclame Aqui](https://www.reclameaqui.com.br/hyperlocal/avec-salao-vip_oXe4o7OU1lvBpGa8/)
- [SalãoVIP — Lista de reclamações](https://www.reclameaqui.com.br/empresa/salao-vip/lista-reclamacoes/)
- [Correio Braziliense — Avec fintech](https://www.correiobraziliense.com.br/app/noticia/economia/2019/08/15/internas_economia,777227/avec-fintech-do-setor-de-beleza-agora-entra-no-segmento-de-cartoes.shtml)
- [Gazeta do Povo — Avec founders](https://www.gazetadopovo.com.br/economia/empreender-pme/aos-27-anos-empresaria-a-frente-da-beauty-week-fatura-milhoes-no-setor-de-beleza-acek2rpzoeiqohlk4hr5uwoy3/)
- [Revista Fórum — Trinks preço anual](https://revistaforum.com.br/cupom/trinks/plano-trinks-anual-a-partir-de-r-65-mes)

---

**Próximos passos sugeridos:**
1. `*create-project-brief` (Atlas) — consolida brainstorming + competitor analysis num Project Brief
2. Handoff para `@pm` (Morgan) — iniciar PRD com base no Project Brief
3. `*perform-market-research` (opcional) — TAM/SAM/SOM e tendências do setor BR
