# User Interface Design Goals

## Overall UX Vision

SoftHair é construído sobre o princípio de **anti-fricção radical** — cada clique que pode ser eliminado deve ser eliminado. A interface prioriza mobile-first para todas as superfícies (dono gerencia o salão do celular durante o expediente; cliente final agenda do celular em ≤ 60 segundos). Design deve evocar confiança (salão guarda dados sensíveis financeiros e de clientes) + leveza (setor beauty valoriza estética). Nenhuma tela do MVP pode exigir mais de 3 cliques para ação principal. Feedback visual imediato em todas as operações (toast de sucesso, estado de loading claro, mensagem de erro com ação de recuperação).

## Key Interaction Paradigms

- **Drag-and-drop** na agenda (reagendamento visual em <2s)
- **Swipe actions** no mobile para cancelar/confirmar agendamento rapidamente
- **Long-press** em card de cliente para ver histórico completo sem abrir outra tela
- **Magic link WhatsApp** como padrão de autenticação (não senha)
- **Self-service via link público** para cliente final (zero login, zero cadastro, só telefone no checkout)
- **Toast + inline actions** em vez de modais pesados sempre que possível
- **PWA installable** opcional — salão pode "instalar" ícone na home screen mas não é obrigatório

## Core Screens and Views

**Para o dono/recepcionista do salão (autenticado):**
1. Onboarding Wizard (3 passos, ≤ 10min até primeiro agendamento)
2. Dashboard "Hoje" (tela inicial — próximos agendamentos + status operacional + 3 métricas-chave)
3. Agenda Visual (dia/semana/mês por profissional e consolidada)
4. Tela de Agendamento (criar/editar — vem com cliente, serviço e profissional pré-selecionáveis)
5. Cliente Detalhe (histórico, preferências, agendamentos futuros, crédito de indicação)
6. Gestão de Profissionais (perfil, comissão, disponibilidade)
7. Gestão de Serviços (catálogo customizado, preços, durações)
8. Financeiro (dashboard + fechamento mensal + NFS-e emitidas)
9. Comissão (relatório por profissional + exportação)
10. Configurações (dados do salão, usuários, templates WhatsApp, janela de cancelamento)

**Para o cliente final (público, sem login):**
11. Link público de Agendamento (3 passos: serviço → profissional+horário → telefone → confirmado)
12. Página de Gerenciamento do Agendamento (via link WhatsApp — pode cancelar/reagendar)

**Para o profissional (futuro, Phase 2):**
13. Agenda Individual Simplificada (próximos atendimentos + comissão acumulada)

## Accessibility: WCAG AA

Todas as telas — tanto dashboard do salão quanto link público do cliente — devem atender WCAG 2.1 AA, incluindo:
- Contraste mínimo 4.5:1 para texto regular, 3:1 para texto large
- Navegação completa por teclado em todas as funcionalidades
- Labels semânticos em formulários
- Suporte a screen readers (VoiceOver iOS + TalkBack Android prioritários)
- Respeito a `prefers-reduced-motion`

## Branding

Branding inicial a ser definido (decisão pendente com founder). Premissas iniciais para o design architect:

- **Paleta sugerida:** tons quentes + neutros sofisticados (rosa nude, off-white, preto suave, dourado como accent) — evita clichês de "salão feminino rosa pink" mas mantém conexão com setor beauty
- **Tipografia:** sans-serif moderna + humana (ex. Inter para UI + display serif light para headlines)
- **Iconografia:** outline fino, consistente (ex. Lucide ou Phosphor)
- **Fotografia/ilustração:** autêntica (fotos reais de trabalho de salão, diversidade étnica e etária), evitar stock photos genéricos
- **Tom de voz:** direto, empático, anti-jargão técnico — fala a linguagem da dona do salão, não do desenvolvedor

## Target Device and Platforms: Web Responsive (PWA)

- **Primary:** Mobile web (iOS Safari + Android Chrome) — ≥ 70% do uso esperado
- **Secondary:** Desktop web (Chrome/Edge/Safari) para recepção com computador fixo
- **Not supported in MVP:** Apps nativos iOS/Android (PWA substitui)

---
