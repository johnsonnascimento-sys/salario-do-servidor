# Plano de Correções e Melhorias - Salário do Servidor

**Data:** 23 de Janeiro de 2026  
**Projeto:** Calculadora de Salários do Poder Judiciário da União  
**Objetivo:** Refatorar, padronizar e otimizar o projeto para escalabilidade e manutenibilidade

---

## 🎯 Visão Geral

Este plano aborda os principais problemas identificados no projeto:

1. **Código desorganizado** - Arquivos muito grandes (JmuService.ts com 801 linhas, useCalculator.ts com 398 linhas)
2. **Hierarquia de configuração quebrada** - Valores hardcoded ao invés de usar `global_config` → `power_config` → `org_config`
3. **Design inconsistente** - Falta de padronização de fontes, tamanhos e estilos
4. **UX da calculadora** - Interface precisa de melhorias de usabilidade
5. **Limitação de tokens** - Arquivos grandes estouram o contexto das IAs
6. **Escalabilidade** - Dificultar criar novos órgãos facilmente

---

## 📊 Análise Técnica Atual

### Arquivos Problemáticos (Muito Grandes)

| Arquivo | Linhas | Problema | Solução Proposta |
|---------|--------|----------|------------------|
| `JmuService.ts` | 801 | Lógica de cálculo monolítica | Dividir em módulos por domínio |
| `useCalculator.ts` | 398 | Hook gigante com muitas responsabilidades | Extrair hooks especializados |
| `Calculator.tsx` | 154 | Orquestração complexa | Já modularizado, mas pode melhorar |

### Hierarquia de Configuração

**Problema Atual:**
- Valores hardcoded em `data.ts` (BASES_2025, HISTORICO_PSS, etc.)
- `JmuService.ts` importa constantes ao invés de buscar do banco
- Alterações sendo feitas em `org_config` quando deveriam estar em `power_config`

**Exemplo do Problema:**
```typescript
// ❌ ATUAL (Hardcoded)
import { BASES_2025, HISTORICO_PSS } from '../../../data';

// ✅ DESEJADO (Data-Driven)
const config = await configService.getEffectiveConfig('jmu');
const bases = config.salary_bases;
```

### Design System

**Problemas Identificados:**
- `DESIGN_SYSTEM.md` existe mas não é seguido consistentemente
- Fontes e tamanhos variam entre componentes
- Falta de componentes reutilizáveis (botões, inputs, cards)

---

## 🚀 Plano de Implementação por Fases

---

## FASE 1: Refatoração e Modularização do Código

**Objetivo:** Quebrar arquivos grandes em módulos menores e mais gerenciáveis

**Duração Estimada:** 2-3 dias

### 1.1. Modularizar JmuService.ts (801 linhas → ~150 linhas)

#### Estrutura Proposta:

```
src/services/agency/implementations/jmu/
├── JmuService.ts                    # Orquestrador principal (~150 linhas)
├── modules/
│   ├── baseCalculations.ts          # Cálculos de base salarial
│   ├── benefitsCalculations.ts      # Auxílios e benefícios
│   ├── vacationCalculations.ts      # Férias
│   ├── thirteenthCalculations.ts    # 13º salário
│   ├── overtimeCalculations.ts      # Hora extra
│   ├── substitutionCalculations.ts  # Substituição
│   ├── dailiesCalculations.ts       # Diárias
│   ├── leaveCalculations.ts         # Licença compensatória
│   └── deductionsCalculations.ts    # PSS, IRRF, Funpresp
└── types.ts                          # Tipos específicos da JMU
```

#### Arquivos a Criar:

**[NEW]** [baseCalculations.ts](src/services/agency/implementations/jmu/modules/baseCalculations.ts)
- `calculateBase()`
- `calculateBaseComponents()`
- `getDataForPeriod()`

**[NEW]** [benefitsCalculations.ts](src/services/agency/implementations/jmu/modules/benefitsCalculations.ts)
- `calculateBenefits()`
- Lógica de Auxílio Alimentação e Pré-Escolar

**[NEW]** [vacationCalculations.ts](src/services/agency/implementations/jmu/modules/vacationCalculations.ts)
- `calculateVacation()`

**[NEW]** [thirteenthCalculations.ts](src/services/agency/implementations/jmu/modules/thirteenthCalculations.ts)
- `calculateThirteenth()`

**[NEW]** [overtimeCalculations.ts](src/services/agency/implementations/jmu/modules/overtimeCalculations.ts)
- `calculateOvertime()`

**[NEW]** [substitutionCalculations.ts](src/services/agency/implementations/jmu/modules/substitutionCalculations.ts)
- `calculateSubstitution()`

**[NEW]** [dailiesCalculations.ts](src/services/agency/implementations/jmu/modules/dailiesCalculations.ts)
- `calculateDailies()`

**[NEW]** [leaveCalculations.ts](src/services/agency/implementations/jmu/modules/leaveCalculations.ts)
- `calculateCompensatoryLeave()`

**[NEW]** [deductionsCalculations.ts](src/services/agency/implementations/jmu/modules/deductionsCalculations.ts)
- `calculateDeductions()`

#### Arquivos a Modificar:

**[MODIFY]** [JmuService.ts](src/services/agency/implementations/JmuService.ts)
- Transformar em orquestrador que importa e usa os módulos
- Manter apenas a interface pública e delegação

---

### 1.2. Modularizar useCalculator.ts (398 linhas → ~150 linhas)

#### Estrutura Proposta:

```
src/hooks/
├── useCalculator.ts              # Hook principal (~150 linhas)
├── calculator/
│   ├── useCalculatorState.ts     # Gerenciamento de estado
│   ├── useCalculatorConfig.ts    # Carregamento de configuração
│   ├── useCalculatorExport.ts    # Lógica de exportação
│   └── useCalculatorResults.ts   # Cálculo de resultados
```

#### Arquivos a Criar:

**[NEW]** [useCalculatorState.ts](src/hooks/calculator/useCalculatorState.ts)
- Gerenciamento do estado da calculadora
- Funções `update`, `updateSubstDays`, `setState`
- Gerenciamento de rubricas extras

**[NEW]** [useCalculatorConfig.ts](src/hooks/calculator/useCalculatorConfig.ts)
- Carregamento de configuração do órgão
- `loadAgency()`, `fetchConfig()`
- Estados de loading

**[NEW]** [useCalculatorExport.ts](src/hooks/calculator/useCalculatorExport.ts)
- Lógica de exportação PDF/Excel
- Modal de doação
- `initiateExportPDF()`, `initiateExportExcel()`

**[NEW]** [useCalculatorResults.ts](src/hooks/calculator/useCalculatorResults.ts)
- Cálculo de resultados
- Geração de `resultRows`

#### Arquivos a Modificar:

**[MODIFY]** [useCalculator.ts](src/hooks/useCalculator.ts)
- Importar e compor os hooks especializados
- Manter apenas a interface pública

---

### 1.3. Criar Componentes Reutilizáveis de UI

#### Arquivos a Criar:

**[NEW]** [src/components/ui/Button.tsx](src/components/ui/Button.tsx)
- Componente de botão padronizado
- Variantes: primary, secondary, ghost, danger
- Tamanhos: sm, md, lg

**[NEW]** [src/components/ui/Input.tsx](src/components/ui/Input.tsx)
- Componente de input padronizado
- Suporte a label, error, helper text

**[NEW]** [src/components/ui/Select.tsx](src/components/ui/Select.tsx)
- Componente de select padronizado

**[NEW]** [src/components/ui/Card.tsx](src/components/ui/Card.tsx)
- Componente de card padronizado
- Variantes com e sem header

---

### Verificação da Fase 1:

- [ ] `JmuService.ts` tem menos de 200 linhas
- [ ] `useCalculator.ts` tem menos de 200 linhas
- [ ] Todos os módulos têm responsabilidade única e clara
- [ ] Componentes de UI são reutilizados em pelo menos 3 lugares
- [ ] Testes unitários passam
- [ ] Build funciona sem erros

---

## FASE 2: Sistema de Design Consistente

**Objetivo:** Aplicar o `DESIGN_SYSTEM.md` de forma consistente em todo o projeto

**Duração Estimada:** 2 dias

### 2.1. Auditoria de Design

#### Criar Script de Auditoria:

**[NEW]** [scripts/audit-design.ts](scripts/audit-design.ts)

Script que verifica:
- [ ] Uso de fontes não padronizadas
- [ ] Cores hardcoded (não usando tokens)
- [ ] Tamanhos de fonte inconsistentes
- [ ] Border-radius inconsistente
- [ ] Uso de Material Symbols ao invés de Lucide

---

### 2.2. Criar Design Tokens

#### Arquivos a Modificar:

**[MODIFY]** [tailwind.config.js](tailwind.config.js)

Adicionar tokens completos:
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#14b8a6',
        secondary: '#2563eb',
        'navy-dark': '#0f172a',
        // ... todos os tokens do DESIGN_SYSTEM.md
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      fontSize: {
        // Padronizar tamanhos
        'h1': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '800' }],
        'h2': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        'h3': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '700' }],
        // ...
      },
      borderRadius: {
        'card': '1rem',
        'input': '0.75rem',
        // ...
      }
    }
  }
}
```

---

### 2.3. Refatorar Componentes para Usar Design System

#### Componentes a Modificar:

**[MODIFY]** Todos os componentes em `src/components/Calculator/`
- Substituir classes hardcoded por tokens
- Usar componentes de UI reutilizáveis
- Garantir consistência de espaçamento

**Exemplo de Mudança:**

```tsx
// ❌ ANTES
<div className="bg-white rounded-lg border border-gray-200 p-4">
  <h3 className="text-base font-semibold mb-3">Título</h3>
  {/* ... */}
</div>

// ✅ DEPOIS
<Card>
  <Card.Header>
    <h3 className="text-h3">Título</h3>
  </Card.Header>
  <Card.Content>
    {/* ... */}
  </Card.Content>
</Card>
```

---

### 2.4. Documentar Componentes

**[NEW]** [src/components/ui/README.md](src/components/ui/README.md)

Documentação de uso de cada componente com exemplos.

---

### Verificação da Fase 2:

- [ ] Script de auditoria não reporta inconsistências
- [ ] Todos os componentes usam tokens do Tailwind
- [ ] Fonte `Plus Jakarta Sans` aplicada em todo o projeto
- [ ] Lucide React usado exclusivamente (sem Material Symbols)
- [ ] Border-radius consistente (`rounded-2xl` para cards)
- [ ] Espaçamento padronizado

---

## FASE 3: Correção da Hierarquia de Configuração

**Objetivo:** Implementar sistema data-driven usando `global_config` → `power_config` → `org_config`

**Duração Estimada:** 3-4 dias

### 3.1. Criar ConfigService

#### Arquivos a Criar:

**[NEW]** [src/services/config/ConfigService.ts](src/services/config/ConfigService.ts)

```typescript
export class ConfigService {
  /**
   * Busca configuração efetiva para um órgão
   * Aplica hierarquia: org_config > power_config > global_config
   */
  async getEffectiveConfig(orgSlug: string): Promise<EffectiveConfig> {
    // 1. Buscar global_config
    const globalConfig = await this.fetchGlobalConfig();
    
    // 2. Buscar org_config e descobrir power_name
    const orgConfig = await this.fetchOrgConfig(orgSlug);
    
    // 3. Buscar power_config
    const powerConfig = await this.fetchPowerConfig(orgConfig.power_name);
    
    // 4. Deep merge: global < power < org
    return this.deepMerge(globalConfig, powerConfig, orgConfig.configuration);
  }
}
```

**[NEW]** [src/services/config/types.ts](src/services/config/types.ts)

Tipos para configuração efetiva.

**[NEW]** [src/services/config/mergeConfig.ts](src/services/config/mergeConfig.ts)

Lógica de deep merge com prioridade.

---

### 3.2. Refatorar JmuService para Usar ConfigService

#### Arquivos a Modificar:

**[MODIFY]** [JmuService.ts](src/services/agency/implementations/JmuService.ts)

```typescript
// ❌ REMOVER
import { BASES_2025, HISTORICO_PSS, HISTORICO_IR } from '../../../data';

// ✅ ADICIONAR
export class JmuService implements IAgencyCalculator {
  constructor(private configService: ConfigService) {}
  
  async calculateBase(params: IJmuCalculationParams): Promise<number> {
    const config = await this.configService.getEffectiveConfig('jmu');
    const bases = this.getSalaryBasesForPeriod(
      config.salary_bases,
      config.adjustment_schedule,
      params.periodo
    );
    // ...
  }
}
```

---

### 3.3. Migrar Dados Hardcoded para o Banco

#### Análise de Dados a Migrar:

**[MODIFY]** Banco de Dados Supabase

Migrar de `data.ts` para `power_config`:

| Constante | Destino | Tabela | config_key |
|-----------|---------|--------|------------|
| `BASES_2025` | power_config | PJU | `salary_bases` |
| `HISTORICO_PSS` | global_config | - | `pss_tables` |
| `HISTORICO_IR` | global_config | - | `ir_deduction` |
| `CJ1_INTEGRAL_BASE` | power_config | PJU | `cj1_integral_base` |
| `AQ_MULTIPLIERS` | power_config | PJU | `aq_rules` |

**[NEW]** [migrations/002_migrate_hardcoded_data.sql](migrations/002_migrate_hardcoded_data.sql)

Script SQL para migrar todos os dados hardcoded.

---

### 3.4. Corrigir Problema da JMU (Tabela de Cargos)

> **Problema Identificado:** JMU não está puxando corretamente a tabela de cargos do Poder Judiciário. Alterações estão sendo feitas em `org_config` quando deveriam estar em `power_config`.

#### Solução:

**[MODIFY]** Banco de Dados - `power_config`

Garantir que a tabela de cargos esteja em `power_config` para PJU:

```sql
-- Verificar se existe
SELECT * FROM power_config 
WHERE power_name = 'PJU' 
AND config_key = 'salary_bases';

-- Se não existir ou estiver incorreto, inserir/atualizar
INSERT INTO power_config (power_name, config_key, config_value, valid_from)
VALUES ('PJU', 'salary_bases', '{
  "analista": {
    "A1-1": 10990.74,
    "A1-2": 11440.37,
    ...
  },
  "tecnico": { ... }
}', '2025-01-01');
```

**[MODIFY]** Banco de Dados - `org_config`

Remover duplicações em `org_config` da JMU:

```sql
-- Limpar configurações que deveriam estar em power_config
UPDATE org_config 
SET configuration = configuration - 'salary_bases'
WHERE org_slug = 'jmu';
```

---

### 3.5. Deprecar data.ts

#### Arquivos a Modificar:

**[MODIFY]** [data.ts](src/data.ts)

Adicionar avisos de depreciação:

```typescript
/**
 * @deprecated Este arquivo está sendo descontinuado.
 * Use ConfigService.getEffectiveConfig() para buscar dados do banco.
 */
export const BASES_2025 = { /* ... */ };
```

---

### Verificação da Fase 3:

- [ ] `ConfigService` implementado e testado
- [ ] JMU puxa dados de `power_config` corretamente
- [ ] Nenhum import de `data.ts` em código de produção
- [ ] Hierarquia global → power → org funciona corretamente
- [ ] Testes de integração passam
- [ ] Criar novo órgão requer apenas inserção no banco (sem código)

---

## FASE 4: Melhorias de UX da Calculadora

**Objetivo:** Melhorar usabilidade e experiência do usuário

**Duração Estimada:** 2-3 dias

### 4.1. Auditoria de UX

#### Problemas a Identificar:

- [ ] Campos com labels pouco claras
- [ ] Falta de feedback visual (loading, success, error)
- [ ] Inputs sem validação
- [ ] Fluxo confuso
- [ ] Falta de tooltips explicativos
- [ ] Responsividade em mobile

---

### 4.2. Melhorias de Formulário

#### Componentes a Criar:

**[NEW]** [src/components/ui/FormField.tsx](src/components/ui/FormField.tsx)

Componente que encapsula label + input + error + helper:

```tsx
<FormField
  label="Cargo"
  helperText="Selecione seu cargo atual"
  error={errors.cargo}
>
  <Select {...} />
</FormField>
```

**[NEW]** [src/components/ui/Tooltip.tsx](src/components/ui/Tooltip.tsx)

Tooltip para explicações contextuais.

---

### 4.3. Validação de Inputs

**[NEW]** [src/utils/validation.ts](src/utils/validation.ts)

Funções de validação:
- Validar valores numéricos
- Validar ranges
- Validar dependências entre campos

---

### 4.4. Feedback Visual

#### Melhorias:

- [ ] Loading states em todos os carregamentos
- [ ] Animações de transição suaves
- [ ] Feedback de sucesso ao exportar
- [ ] Mensagens de erro claras
- [ ] Skeleton loaders

---

### 4.5. Responsividade Mobile

#### Componentes a Modificar:

**[MODIFY]** Todos os componentes da calculadora

- Testar em viewport mobile (375px)
- Ajustar grid para 1 coluna em mobile
- Garantir touch targets de 44px mínimo
- Testar inputs em teclados mobile

---

### Verificação da Fase 4:

- [ ] Todos os campos têm labels claras
- [ ] Tooltips explicativos onde necessário
- [ ] Validação em tempo real funciona
- [ ] Feedback visual em todas as ações
- [ ] Responsivo em mobile (testado em 375px, 768px, 1024px)
- [ ] Acessibilidade básica (tab navigation, aria-labels)

---

## FASE 5: Segurança e Qualidade

**Objetivo:** Garantir segurança e qualidade do código

**Duração Estimada:** 2 dias

### 5.1. Auditoria de Segurança

#### Verificações:

- [ ] Variáveis de ambiente não expostas
- [ ] RLS (Row Level Security) configurado no Supabase
- [ ] Sanitização de inputs
- [ ] Proteção contra XSS
- [ ] Validação server-side (se aplicável)

---

### 5.2. Testes Automatizados

#### Arquivos a Criar:

**[NEW]** [src/services/config/ConfigService.test.ts](src/services/config/ConfigService.test.ts)

Testes unitários para `ConfigService`:
- Merge de configurações
- Hierarquia correta
- Fallbacks

**[NEW]** [src/services/agency/implementations/jmu/modules/baseCalculations.test.ts](src/services/agency/implementations/jmu/modules/baseCalculations.test.ts)

Testes para cálculos de base.

**[NEW]** [src/hooks/calculator/useCalculatorState.test.ts](src/hooks/calculator/useCalculatorState.test.ts)

Testes para hooks.

---

### 5.3. Linting e Formatação

#### Arquivos a Criar:

**[NEW]** [.eslintrc.json](.eslintrc.json)

Configuração de ESLint com regras estritas.

**[NEW]** [.prettierrc](.prettierrc)

Configuração de Prettier.

---

### 5.4. CI/CD

**[NEW]** [.github/workflows/ci.yml](.github/workflows/ci.yml)

Pipeline de CI:
- Lint
- Type check
- Tests
- Build

---

### Verificação da Fase 5:

- [ ] Auditoria de segurança sem issues críticos
- [ ] Cobertura de testes > 70%
- [ ] ESLint sem erros
- [ ] TypeScript sem erros
- [ ] CI/CD configurado e funcionando

---

## FASE 6: Escalabilidade e Manutenibilidade

**Objetivo:** Facilitar criação de novos órgãos e manutenção futura

**Duração Estimada:** 2-3 dias

### 6.1. Documentação de Arquitetura

#### Arquivos a Criar/Atualizar:

**[MODIFY]** [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)

Atualizar com:
- Nova estrutura de pastas
- Fluxo de dados
- Hierarquia de configuração
- Como adicionar novo órgão

**[NEW]** [docs/ADDING_NEW_AGENCY.md](docs/ADDING_NEW_AGENCY.md)

Guia passo-a-passo para adicionar novo órgão:

1. Inserir em `org_config`
2. Configurar `power_config` (se novo poder)
3. Criar service específico (se regras únicas)
4. Testar

---

### 6.2. Criar Template de Órgão

**[NEW]** [src/services/agency/implementations/GenericAgencyService.ts](src/services/agency/implementations/GenericAgencyService.ts)

Service genérico que funciona apenas com configuração do banco, sem código customizado.

---

### 6.3. Painel de Administração

**[NEW]** [src/pages/Admin/ConfigManager.tsx](src/pages/Admin/ConfigManager.tsx)

Interface para gerenciar configurações:
- CRUD de `global_config`
- CRUD de `power_config`
- CRUD de `org_config`
- Preview de merge

---

### 6.4. Scripts de Manutenção

**[NEW]** [scripts/validate-config.ts](scripts/validate-config.ts)

Script para validar integridade das configurações no banco.

**[NEW]** [scripts/sync-config.ts](scripts/sync-config.ts)

Script para sincronizar configurações entre ambientes (dev → prod).

---

### Verificação da Fase 6:

- [ ] Documentação completa e atualizada
- [ ] Criar novo órgão leva < 30 minutos
- [ ] `GenericAgencyService` funciona para órgãos simples
- [ ] Painel de admin permite gerenciar configurações
- [ ] Scripts de validação e sync funcionam
