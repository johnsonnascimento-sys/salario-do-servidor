# 🐛 Bugs Conhecidos - Salário do Servidor

**Data:** 23 de Janeiro de 2026  
**Status:** Documentado para correção futura

---

## Erros de Cálculo - Simulador JMU

### ⚠️ Descrição
O usuário identificou erros de cálculo no simulador da JMU. Os valores calculados não correspondem aos valores esperados em alguns cenários.

### 📊 Cenários Afetados
- **A definir:** Aguardando detalhes específicos do usuário sobre:
  - Cargo/Classe afetados
  - Valores esperados vs obtidos
  - Período de referência

### 🔍 Investigação Necessária
- [ ] Identificar cenários específicos com erro
- [ ] Comparar com holerites oficiais
- [ ] Verificar se é erro de dados no banco ou lógica de cálculo
- [ ] Validar tabelas de PSS e IRRF
- [ ] Verificar cálculo de benefícios (Auxílios)

### 🎯 Prioridade
**MÉDIA** - Sistema em desenvolvimento, sem usuários afetados

### 📝 Notas
- Bug reportado após correção do "NaN" (property mismatch)
- Migração para PROD será feita antes da correção
- Correção será feita na FASE 4 (Testes e Validação) do TASK.md

---

## Histórico de Bugs Corrigidos

### ✅ Bug "NaN" - Cálculo de PSS (23/01/2026)
**Problema:** Todos os cálculos retornavam "R$ NaN"  
**Causa:** Property mismatch (`aliq` vs `rate`) em `deductionsCalculations.ts`  
**Solução:** Corrigido mapeamento de `pssTableConfig.rates` para usar `rate: rate.rate`  
**Status:** ✅ RESOLVIDO

### ✅ Tabelas de Configuração Vazias (23/01/2026)
**Problema:** Banco de dados sem tabelas `global_config`, `power_config`, `org_config`  
**Causa:** Migração inicial não executada  
**Solução:** Criado e executado `MANUAL_MIGRATE.sql`  
**Status:** ✅ RESOLVIDO (DEV)

---

**Última Atualização:** 23/01/2026 23:06
