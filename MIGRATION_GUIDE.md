# Guia de Migração para Sistema Data-Driven

**Data:** 23 de Janeiro de 2026  
**Versão:** 1.0  
**Objetivo:** Migrar dados hardcoded para banco de dados Supabase

---

## 📋 Pré-requisitos

Antes de executar a migração, certifique-se de que:

- ✅ Você tem acesso ao painel do Supabase
- ✅ Você está no projeto correto (produção ou desenvolvimento)
- ✅ Você fez backup do banco de dados (recomendado)
- ✅ O código está atualizado com o ConfigService

---

## 🗂️ Estrutura de Tabelas

O sistema usa 3 níveis de configuração:

### 1. `global_config` - Regras Federais
Regras que se aplicam a **todos** os órgãos do Brasil.

**Colunas:**
- `id` (uuid) - Chave primária
- `config_key` (text) - Nome da configuração
- `config_value` (jsonb) - Valor da configuração
- `valid_from` (date) - Data de início de validade
- `valid_to` (date) - Data de fim de validade (NULL = ativo)

**Exemplos:**
- `pss_tables` - Tabelas de PSS (Previdência)
- `ir_deduction` - Tabelas de IR (Imposto de Renda)
- `dependent_deduction` - Dedução por dependente

---

### 2. `power_config` - Regras do Poder
Regras compartilhadas por um poder (ex: Poder Judiciário da União).

**Colunas:**
- `id` (uuid) - Chave primária
- `power_name` (text) - Nome do poder (ex: 'PJU')
- `config_key` (text) - Nome da configuração
- `config_value` (jsonb) - Valor da configuração
- `valid_from` (date) - Data de início de validade
- `valid_to` (date) - Data de fim de validade (NULL = ativo)

**Exemplos:**
- `salary_bases` - Tabelas salariais (analista, técnico, funções)
- `cj1_integral_base` - Base CJ1 para cálculo de VR
- `aq_rules` - Regras de AQ (Adicional de Qualificação)
- `gratification_percentages` - Percentuais de gratificações (GAJ, GAE, GAS)

---

### 3. `org_config` - Regras do Órgão
Regras específicas de um órgão (ex: JMU, STM).

**Colunas:**
- `id` (uuid) - Chave primária
- `org_slug` (text) - Slug do órgão (ex: 'jmu')
- `org_name` (text) - Nome do órgão
- `power_name` (text) - Nome do poder ao qual pertence
- `configuration` (jsonb) - Configurações específicas

**Nota:** Configurações em `org_config` sobrescrevem `power_config` e `global_config`.

---

## 🚀 Passo a Passo da Migração

### **Passo 1: Acessar o Supabase SQL Editor**

1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login na sua conta
3. Selecione o projeto correto
4. No menu lateral, clique em **"SQL Editor"**

---

### **Passo 2: Fazer Backup (Recomendado)**

Antes de executar a migração, faça backup:

1. No menu lateral, vá em **"Database"** → **"Backups"**
2. Clique em **"Create backup"**
3. Aguarde a conclusão

**Alternativa:** Exportar dados via SQL:

```sql
-- Backup de global_config
COPY global_config TO '/tmp/global_config_backup.csv' CSV HEADER;

-- Backup de power_config
COPY power_config TO '/tmp/power_config_backup.csv' CSV HEADER;

-- Backup de org_config
COPY org_config TO '/tmp/org_config_backup.csv' CSV HEADER;
```

---

### **Passo 3: Executar o Script de Migração**

1. Abra o arquivo `migrations/002_migrate_hardcoded_data.sql`
2. Copie **TODO** o conteúdo do arquivo
3. No SQL Editor do Supabase, cole o conteúdo
4. Clique em **"Run"** (ou pressione `Ctrl+Enter`)

**Aguarde a execução.** Você verá mensagens de sucesso para cada INSERT.

---

### **Passo 4: Verificar a Migração**

Execute as queries de verificação:

#### **4.1. Verificar global_config**

```sql
SELECT config_key, valid_from, valid_to 
FROM global_config 
WHERE valid_to IS NULL
ORDER BY config_key;
```

**Resultado esperado:** 3 linhas
- `dependent_deduction`
- `ir_deduction`
- `pss_tables`

---

#### **4.2. Verificar power_config**

```sql
SELECT config_key, valid_from, valid_to 
FROM power_config 
WHERE power_name = 'PJU' AND valid_to IS NULL
ORDER BY config_key;
```

**Resultado esperado:** 5 linhas
- `aq_rules`
- `benefits`
- `cj1_integral_base`
- `gratification_percentages`
- `salary_bases`

---

#### **4.3. Verificar Dados Específicos**

**Verificar bases salariais:**

```sql
SELECT 
  config_key,
  config_value->'analista'->>'C13' as analista_c13,
  config_value->'tecnico'->>'C13' as tecnico_c13
FROM power_config 
WHERE power_name = 'PJU' 
  AND config_key = 'salary_bases';
```

**Resultado esperado:**
- `analista_c13`: 9292.14
- `tecnico_c13`: 5663.47

---

**Verificar tabela PSS 2025:**

```sql
SELECT 
  config_key,
  config_value->'2025'->>'ceiling' as teto_2025
FROM global_config 
WHERE config_key = 'pss_tables';
```

**Resultado esperado:**
- `teto_2025`: 8157.41

---

### **Passo 5: Testar ConfigService**

Agora teste se o ConfigService está funcionando:

1. Abra o projeto localmente
2. Execute `npm run dev`
3. Acesse a calculadora da JMU
4. Faça um cálculo de teste

**O que verificar:**
- ✅ Calculadora carrega sem erros
- ✅ Valores de salário estão corretos
- ✅ Cálculos de PSS e IR funcionam
- ✅ Não há erros no console do navegador

---

## 🔧 Troubleshooting

### **Erro: "duplicate key value violates unique constraint"**

**Causa:** Os dados já existem no banco.

**Solução:** O script usa `ON CONFLICT DO UPDATE`, então isso não deveria acontecer. Se acontecer, delete os dados antigos:

```sql
DELETE FROM global_config WHERE config_key IN ('pss_tables', 'ir_deduction', 'dependent_deduction');
DELETE FROM power_config WHERE power_name = 'PJU';
```

Depois execute o script novamente.

---

### **Erro: "column does not exist"**

**Causa:** As tabelas não foram criadas.

**Solução:** Execute primeiro o script de criação de tabelas (se houver) ou crie manualmente:

```sql
-- Criar global_config
CREATE TABLE IF NOT EXISTS global_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key text NOT NULL,
  config_value jsonb NOT NULL,
  valid_from date NOT NULL,
  valid_to date,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(config_key, valid_from)
);

-- Criar power_config
CREATE TABLE IF NOT EXISTS power_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  power_name text NOT NULL,
  config_key text NOT NULL,
  config_value jsonb NOT NULL,
  valid_from date NOT NULL,
  valid_to date,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(power_name, config_key, valid_from)
);
```

---

### **Erro: "ConfigService não carrega dados"**

**Causa:** Variáveis de ambiente não configuradas ou RLS (Row Level Security) bloqueando.

**Solução 1 - Verificar .env:**

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

**Solução 2 - Desabilitar RLS temporariamente:**

```sql
ALTER TABLE global_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE power_config DISABLE ROW LEVEL SECURITY;
```

**Nota:** Em produção, configure RLS adequadamente ao invés de desabilitar.

---

## 📊 Hierarquia de Merge

O ConfigService faz merge automático na ordem:

```
global_config (menor prioridade)
    ↓
power_config (prioridade média)
    ↓
org_config (maior prioridade)
```

**Exemplo:**

Se `global_config` tem `pss_tables` e `power_config` também tem `pss_tables`, o valor de `power_config` será usado.

Se `org_config` da JMU sobrescrever algum valor, ele terá prioridade máxima.

---

## ✅ Checklist Final

Antes de considerar a migração completa:

- [ ] Script SQL executado sem erros
- [ ] Queries de verificação retornam dados corretos
- [ ] ConfigService carrega dados do banco
- [ ] Calculadora funciona corretamente
- [ ] Build passa sem erros (`npm run build`)
- [ ] Testes manuais realizados
- [ ] Backup do banco feito

---

## 🔄 Rollback (Se Necessário)

Se algo der errado, você pode reverter:

### **Opção 1: Restaurar Backup**

1. Vá em **Database** → **Backups**
2. Selecione o backup anterior
3. Clique em **"Restore"**

### **Opção 2: Deletar Dados Migrados**

```sql
-- Deletar dados da migração
DELETE FROM global_config 
WHERE config_key IN ('pss_tables', 'ir_deduction', 'dependent_deduction')
  AND valid_from >= '2024-01-01';

DELETE FROM power_config 
WHERE power_name = 'PJU'
  AND valid_from >= '2024-01-01';
```

### **Opção 3: Reverter Código**

Se o ConfigService não funcionar, você pode temporariamente voltar a usar `data.ts`:

1. Faça checkout do commit anterior
2. Ou comente as chamadas ao ConfigService
3. Descomente os imports de `data.ts`

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do navegador (F12 → Console)
2. Verifique os logs do Supabase (Logs → API)
3. Revise este guia novamente
4. Consulte a documentação do ConfigService

---

**Última Atualização:** 23/01/2026  
**Versão do Sistema:** Fase 3 Completa  
**Autor:** Equipe de Desenvolvimento
