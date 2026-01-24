# 🚀 Guia de Deploy para Produção

**Data:** 23 de Janeiro de 2026  
**Objetivo:** Migrar código e banco de dados para ambiente de produção

---

## ✅ Pré-requisitos

- [x] Código testado localmente (DEV)
- [x] Migração executada no banco DEV
- [x] Build sem erros
- [x] Calculadora funcionando (valores não-zero)

---

## 📋 Checklist de Deploy

### 1. Commit e Push do Código

```bash
# No diretório do projeto
cd c:\Users\jtnas\.gemini\antigravity\scratch\salario-do-servidor

# Verificar status
git status

# Adicionar arquivos modificados
git add .

# Commit com mensagem descritiva
git commit -m "feat: Implement ConfigService and database-driven calculations

- Created ConfigService with hierarchical config (global > power > org)
- Migrated all hardcoded data to database tables
- Fixed NaN bug in PSS calculation (property mismatch)
- Modularized JmuService into specialized calculation modules
- Created MANUAL_MIGRATE.sql for database setup

BREAKING CHANGE: Requires database migration before deployment"

# Push para GitHub
git push origin main
```

### 2. Deploy Automático via Vercel

**Vercel detectará automaticamente o push e iniciará o deploy.**

- Acesse: https://vercel.com/dashboard
- Verifique o status do deploy
- Aguarde conclusão (~2-3 minutos)

### 3. Migração do Banco de Dados PROD

#### 3.1. Acessar Supabase PROD

1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto de **PRODUÇÃO** (johnsonnascimento-sys's Project)
3. Vá em **SQL Editor**

#### 3.2. Executar Migration

1. Clique em **"New Query"**
2. Copie TODO o conteúdo de `MANUAL_MIGRATE.sql`
3. Cole no editor
4. Clique em **"Run"**
5. Aguarde confirmação de sucesso

#### 3.3. Verificar Dados

Execute as queries de verificação:

```sql
-- Verificar global_config (deve retornar 3 linhas)
SELECT config_key, valid_from 
FROM global_config 
WHERE valid_to IS NULL
ORDER BY config_key;

-- Verificar power_config (deve retornar 5 linhas)
SELECT config_key, valid_from 
FROM power_config 
WHERE power_name = 'PJU' AND valid_to IS NULL
ORDER BY config_key;

-- Verificar org_config (deve retornar 3 linhas)
SELECT org_slug, org_name, power_name 
FROM org_config;
```

**Resultado Esperado:**
- `global_config`: 3 registros (dependent_deduction, pss_tables, ir_deduction)
- `power_config`: 5 registros (cj1_integral_base, salary_bases, aq_rules, gratification_percentages, benefits)
- `org_config`: 3 registros (pju, jmu, stm)

### 4. Testar Aplicação em Produção

1. Acesse a URL de produção (Vercel)
2. Navegue até `/simulador/jmu`
3. Selecione **Analista** e **A1**
4. Verifique se o resultado é **> R$ 15.000,00** (não zero, não NaN)
5. Teste exportação PDF/Excel

---

## 🔄 Rollback (Se Necessário)

### Se o deploy falhar:

1. **Reverter código:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Reverter banco:**
   ```sql
   -- No Supabase PROD SQL Editor
   DROP TABLE IF EXISTS global_config CASCADE;
   DROP TABLE IF EXISTS power_config CASCADE;
   DROP TABLE IF EXISTS org_config CASCADE;
   ```

---

## 📊 Monitoramento Pós-Deploy

- [ ] Verificar logs do Vercel (erros de runtime)
- [ ] Testar todos os simuladores disponíveis
- [ ] Verificar performance (tempo de carregamento)
- [ ] Monitorar erros no console do navegador

---

## 🐛 Bugs Conhecidos (Não Bloqueantes)

Consulte `BUGS_CONHECIDOS.md` para lista de erros de cálculo identificados que serão corrigidos na Fase 4.

---

**Última Atualização:** 23/01/2026 23:06
