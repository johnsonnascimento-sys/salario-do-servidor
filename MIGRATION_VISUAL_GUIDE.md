# 🎯 Guia Visual de Migração - Passo a Passo

**Tempo Estimado:** 5 minutos  
**Dificuldade:** ⭐ Muito Fácil  
**Ambiente:** Desenvolvimento (salario-do-servidor-dev)

---

## 📋 Antes de Começar

**Você vai precisar de:**
- ✅ Acesso ao Supabase (você já tem!)
- ✅ Arquivo `migrations/002_migrate_hardcoded_data.sql` (já criado!)
- ✅ 5 minutos do seu tempo

**Credenciais:**
- **Usuário:** johnsonnascimento-sys
- **Senha:** qgJOlmk3pEBr3XXo
- **Projeto:** salario-do-servidor-dev

---

## 🚀 PASSO 1: Fazer Login no Supabase

### 1.1. Acesse o Supabase

Abra seu navegador e vá para: **https://supabase.com**

### 1.2. Faça Login

![Tela de Login do Supabase](C:/Users/johnsontn/.gemini/antigravity/brain/af01898f-1ead-423e-ba60-f44a4937df9d/supabase_login_screen_1769205263489.png)

**Preencha:**
- **Email:** `johnsonnascimento-sys`
- **Password:** `qgJOlmk3pEBr3XXo`

Clique no botão verde **"Sign in"**

---

## 📂 PASSO 2: Selecionar o Projeto

### 2.1. Escolha o Projeto de Desenvolvimento

Após o login, você verá a lista de projetos:

![Seleção de Projeto](C:/Users/johnsontn/.gemini/antigravity/brain/af01898f-1ead-423e-ba60-f44a4937df9d/supabase_project_selection_1769205277068.png)

**Clique no card:** **"salario-do-servidor-dev"** (com borda verde)

> ⚠️ **IMPORTANTE:** Escolha o projeto de **DESENVOLVIMENTO** primeiro para testar!

---

## 💻 PASSO 3: Abrir o SQL Editor

### 3.1. Navegue até o SQL Editor

No menu lateral esquerdo, procure e clique em: **"SQL Editor"**

![SQL Editor](C:/Users/johnsontn/.gemini/antigravity/brain/af01898f-1ead-423e-ba60-f44a4937df9d/supabase_sql_editor_1769205293185.png)

Você verá uma interface de editor de código com tema escuro.

---

## 📝 PASSO 4: Colar o Script de Migração

### 4.1. Abrir o Arquivo de Migração

No seu computador, abra o arquivo:

```
migrations/002_migrate_hardcoded_data.sql
```

**Localização:** `C:\Users\johnsontn\.gemini\antigravity\scratch\salario-do-servidor-remote\migrations\002_migrate_hardcoded_data.sql`

### 4.2. Copiar TODO o Conteúdo

1. Abra o arquivo no VS Code ou Bloco de Notas
2. Selecione tudo: **Ctrl + A**
3. Copie: **Ctrl + C**

### 4.3. Colar no SQL Editor

1. Volte para o Supabase SQL Editor
2. Clique na área de edição (onde tem os números de linha)
3. Cole o conteúdo: **Ctrl + V**

Você verá o script SQL completo com:
- Comentários explicativos
- INSERT statements para `global_config`
- INSERT statements para `power_config`

---

## ▶️ PASSO 5: Executar a Migração

### 5.1. Clicar em Run

No canto superior direito, clique no botão verde **"Run"**

Ou pressione: **Ctrl + Enter**

### 5.2. Aguardar Execução

A migração levará cerca de **5 segundos**.

### 5.3. Verificar Sucesso

Você verá uma mensagem de sucesso na parte inferior:

![Sucesso na Execução](C:/Users/johnsontn/.gemini/antigravity/brain/af01898f-1ead-423e-ba60-f44a4937df9d/supabase_sql_success_1769205306376.png)

✅ **"Success. No rows returned"** com checkmark verde

> **Nota:** "No rows returned" é normal! Os INSERT statements não retornam linhas, apenas inserem dados.

---

## ✅ PASSO 6: Verificar os Dados

### 6.1. Criar Nova Query

No SQL Editor, **limpe** o conteúdo atual e cole esta query de verificação:

```sql
-- Verificar global_config
SELECT config_key, valid_from, valid_to 
FROM global_config 
WHERE valid_to IS NULL
ORDER BY config_key;
```

Clique em **Run**.

### 6.2. Resultado Esperado

Você deve ver **3 linhas**:

| config_key | valid_from | valid_to |
|------------|------------|----------|
| dependent_deduction | 2024-01-01 | NULL |
| ir_deduction | 2024-01-01 | NULL |
| pss_tables | 2024-01-01 | NULL |

✅ Se você vê essas 3 linhas, **global_config está OK!**

---

### 6.3. Verificar power_config

Agora execute esta query:

```sql
-- Verificar power_config
SELECT config_key, valid_from, valid_to 
FROM power_config 
WHERE power_name = 'PJU' AND valid_to IS NULL
ORDER BY config_key;
```

### 6.4. Resultado Esperado

Você deve ver **5 linhas**:

| config_key | valid_from | valid_to |
|------------|------------|----------|
| aq_rules | 2025-01-01 | NULL |
| benefits | 2024-01-01 | NULL |
| cj1_integral_base | 2025-01-01 | NULL |
| gratification_percentages | 2025-01-01 | NULL |
| salary_bases | 2025-01-01 | NULL |

✅ Se você vê essas 5 linhas, **power_config está OK!**

---

## 🎯 PASSO 7: Verificar Dados Específicos

### 7.1. Testar Bases Salariais

Execute esta query para ver se os valores estão corretos:

```sql
SELECT 
  config_key,
  config_value->'analista'->>'C13' as analista_c13,
  config_value->'tecnico'->>'C13' as tecnico_c13,
  config_value->'funcoes'->>'fc1' as funcao_fc1
FROM power_config 
WHERE power_name = 'PJU' 
  AND config_key = 'salary_bases';
```

### 7.2. Resultado Esperado

| config_key | analista_c13 | tecnico_c13 | funcao_fc1 |
|------------|--------------|-------------|------------|
| salary_bases | 9292.14 | 5663.47 | 1215.34 |

✅ **Se os valores estão corretos, a migração foi um SUCESSO!**

---

## 🎊 PARABÉNS! Migração Concluída

### ✅ Checklist Final

- [x] Login no Supabase realizado
- [x] Projeto de desenvolvimento selecionado
- [x] Script SQL executado com sucesso
- [x] global_config verificado (3 linhas)
- [x] power_config verificado (5 linhas)
- [x] Valores específicos conferidos

---

## 🔄 Próximos Passos

### 1. Testar Localmente

Agora teste se o ConfigService funciona:

```bash
cd C:\Users\johnsontn\.gemini\antigravity\scratch\salario-do-servidor-remote
npm run dev
```

Acesse a calculadora e faça um cálculo de teste.

### 2. Migrar para Produção

Quando estiver tudo funcionando no desenvolvimento, repita o processo para produção:

- **Projeto:** johnsonnascimento-sys's Project
- **Mesmo script SQL**
- **Mesmas verificações**

---

## ❓ Problemas Comuns

### "Erro: relation global_config does not exist"

**Solução:** As tabelas não foram criadas. Execute primeiro:

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

### "Erro: duplicate key value"

**Solução:** Os dados já existem. Isso é OK! O script usa `ON CONFLICT DO UPDATE`, então os dados serão atualizados.

### ConfigService não carrega dados

**Solução:** Verifique o arquivo `.env.local`:

```
VITE_SUPABASE_URL=https://fdzuykiwqzzmlzjtnbfi.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

---

## 📞 Precisa de Ajuda?

Se algo der errado:

1. Verifique os logs do navegador (F12 → Console)
2. Revise este guia novamente
3. Consulte `MIGRATION_GUIDE.md` para troubleshooting avançado

---

**Última Atualização:** 23/01/2026  
**Versão:** 1.0  
**Autor:** Equipe de Desenvolvimento
