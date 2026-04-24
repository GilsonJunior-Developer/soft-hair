# Handoff → @data-engineer Dara — Autonomia Supabase via MCP

**Data:** 2026-04-21  
**De:** Tech Leader (Sonnet)  
**Para:** @data-engineer Dara  
**Assunto:** Acesso direto aos bancos Supabase — sem mais dependência do Founder para SQL

---

## Contexto

O Supabase MCP está conectado ao Cowork do Founder. A partir de agora, toda operação de banco que antes exigia intervenção manual no SQL Editor do Supabase Dashboard deve ser executada via MCP diretamente por você.

---

## Projetos disponíveis

| Projeto | project_id | Região | Uso |
|---|---|---|---|
| **softhair-dev** | `oywizkjldmxhatvftmho` | us-east-2 | Dev / testes / iterações livres |
| **softhair-prod** | `zqubqygagvtmvvljbstc` | sa-east-1 (São Paulo) | Produção — gate obrigatório |

---

## Suas permissões por ambiente

### softhair-dev → Autonomia total
Você pode executar sem pedir aprovação:
- `execute_sql` — queries de leitura e escrita
- `apply_migration` — migrations novas ou rollbacks
- `list_tables`, `list_migrations`, `list_extensions` — inspeção do schema
- `generate_typescript_types` — após qualquer alteração de schema, gerar e commitar os tipos atualizados em `packages/database/types.ts`
- `get_logs` — diagnóstico de erros em funções ou queries lentas
- `get_advisors` — verificação de índices e performance

### softhair-prod → Execução após aprovação
Fluxo obrigatório antes de qualquer `apply_migration` em prod:

```
1. Desenvolver e validar migration em softhair-dev
2. Abrir PR no GitHub com o arquivo de migration em supabase/migrations/
3. Aguardar LGTM do Founder no PR
4. Após merge → apply_migration em softhair-prod
```

Queries de **leitura** em prod para diagnóstico são liberadas sem aprovação.

---

## Convenção de migrations

Nomenclatura obrigatória:
```
supabase/migrations/YYYYMMDDHHMMSS_descricao_curta.sql
```

Toda migration deve:
1. Ser idempotente (`IF NOT EXISTS`, `IF EXISTS`, `ON CONFLICT DO NOTHING`)
2. Incluir RLS explícito para qualquer nova tabela (`salon_id` como chave de isolamento)
3. Ter rollback comentado no final do arquivo para referência

---

## O que você não precisa mais fazer

- Pedir ao Founder para abrir o Supabase Dashboard e colar SQL manualmente
- Pedir validação de queries simples de inspeção
- Aguardar janela de disponibilidade do Founder para tarefas de banco em dev

---

## Referência de ferramentas disponíveis

| Ferramenta MCP | Uso |
|---|---|
| `execute_sql` | Executar qualquer SQL — selects, inserts, updates, DDL |
| `apply_migration` | Aplicar arquivo de migration em um projeto |
| `list_migrations` | Ver histórico de migrations aplicadas |
| `list_tables` | Listar tabelas e schemas |
| `generate_typescript_types` | Regenerar types TypeScript do schema atual |
| `get_logs` | Logs da Postgres Function / Edge Function |
| `get_advisors` | Recomendações de índices e segurança |
| `get_project_url` | URL pública do projeto para uso nos testes |
| `get_publishable_keys` | Anon key e outras chaves publicáveis |

---

## Primeira ação recomendada

Execute em **softhair-dev** para validar conectividade e documentar o estado atual do schema:

```sql
SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
```

Registre o resultado como snapshot de baseline no Change Log do Epic 2.
