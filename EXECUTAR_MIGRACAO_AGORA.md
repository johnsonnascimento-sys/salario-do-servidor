# 🚀 EXECUTAR MIGRAÇÃO AGORA - Guia Rápido

**⏱️ Tempo estimado:** 5 minutos  
**📍 Ambiente:** DESENVOLVIMENTO (salario-do-servidor-dev)

---

## 📋 PASSO A PASSO

### 1️⃣ Abrir Supabase

1. Abra seu navegador
2. Acesse: **https://supabase.com**
3. Faça login:
   - **Email:** johnsonnascimento-sys
   - **Senha:** qgJOlmk3pEBr3XXo

---

### 2️⃣ Selecionar Projeto DEV

1. Na lista de projetos, clique em: **salario-do-servidor-dev**
2. ⚠️ **IMPORTANTE:** Certifique-se de estar no projeto DEV (não no de produção)

---

### 3️⃣ Abrir SQL Editor

1. No menu lateral esquerdo, clique em: **SQL Editor**
2. Você verá um editor de código vazio

---

### 4️⃣ Copiar o Script SQL

1. Abra o arquivo: `migrations/002_migrate_hardcoded_data.sql`
2. Selecione **TODO** o conteúdo (Ctrl+A)
3. Copie (Ctrl+C)

**Caminho completo:**
```
C:\Users\johnsontn\.gemini\antigravity\scratch\salario-do-servidor-remote\migrations\002_migrate_hardcoded_data.sql
```

---

### 5️⃣ Executar a Migração

1. Cole o SQL no editor do Supabase (Ctrl+V)
2. Clique no botão verde **"Run"** (ou pressione Ctrl+Enter)
3. Aguarde ~5 segundos

✅ **Sucesso:** Você verá "Success. No rows returned" com um checkmark verde

---

### 6️⃣ Verificar os Dados

Execute estas queries para confirmar que deu certo:

#### Verificar global_config (deve retornar 3 linhas):

```sql
SELECT config_key, valid_from, valid_to 
FROM global_config 
WHERE valid_to IS NULL
ORDER BY config_key;
```

**Resultado esperado:**
- dependent_deduction
- ir_deduction
- pss_tables

#### Verificar power_config (deve retornar 5 linhas):

```sql
SELECT config_key, valid_from, valid_to 
FROM power_config 
WHERE power_name = 'PJU' AND valid_to IS NULL
ORDER BY config_key;
```

**Resultado esperado:**
- aq_rules
- benefits
- cj1_integral_base
- gratification_percentages
- salary_bases

---

## ✅ CHECKLIST

- [ ] Login no Supabase realizado
- [ ] Projeto **salario-do-servidor-dev** selecionado
- [ ] SQL Editor aberto
- [ ] Script SQL colado e executado
- [ ] Mensagem "Success" apareceu
- [ ] Query de verificação retornou 3 linhas (global_config)
- [ ] Query de verificação retornou 5 linhas (power_config)

---

## 🎯 DEPOIS DA MIGRAÇÃO

Quando terminar, me avise que vou:

1. ✅ Testar a aplicação localmente (`npm run dev`)
2. ✅ Verificar se os cálculos estão funcionando
3. ✅ Confirmar que não há erros
4. ✅ Preparar para migração em PRODUÇÃO

---

## ❓ Problemas?

### "Erro: relation does not exist"
As tabelas não foram criadas. Execute primeiro:

```sql
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

### "Erro: duplicate key"
Os dados já existem. Isso é OK! O script usa `ON CONFLICT DO UPDATE`.

---

**Última atualização:** 23/01/2026 19:17  
**Status:** Pronto para executar
