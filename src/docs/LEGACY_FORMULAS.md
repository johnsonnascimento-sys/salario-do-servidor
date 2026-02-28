# LEGACY FORMULAS - JMU Calculator
# ===================================
# BACKUP COMPLETO DAS FÓRMULAS MATEMÁTICAS
# Data: 2026-01-19
# Origem: src/utils/calculations.ts (INTACTO - 457 linhas)
# ===================================

> ⚠️ **AVISO CRÍTICO**: Este documento preserva TODAS as fórmulas matemáticas
> do sistema de produção. NÃO DELETAR até a Fase 7 estar concluída.

---

## STATUS DE PRESERVAÇÃO

| Funcionalidade | Preservado? | Arquivo | Linhas |
|----------------|-------------|---------|--------|
| Base de Cálculo | ✅ SIM | calculations.ts | 83-109 |
| PSS/INSS | ✅ SIM | calculations.ts | 45-58 |
| IRRF Mensal | ✅ SIM | calculations.ts | 60-65 |
| IRRF Progressivo | ✅ SIM | calculations.ts | 68-80 |
| Hora Extra | ✅ SIM | calculations.ts | 147-173 |
| Substituição | ✅ SIM | calculations.ts | 175-185 |
| Férias 1/3 | ✅ SIM | calculations.ts | 312-317 |
| 13º Salário | ✅ SIM | calculations.ts | 227-265 |
| Diárias | ✅ SIM | calculations.ts | 368-409 |
| Licença | ✅ SIM | calculations.ts | 187-199 |
| Funpresp | ✅ SIM | calculations.ts | 220-223 |

---

## 1. CÁLCULO BASE FIXA (L83-109)

```typescript
export const calculateBaseFixa = (
    state: CalculatorState, 
    funcoes: FuncoesTable, 
    salario: SalaryTable, 
    valorVR: number
): { baseSemFC: number; totalComFC: number; funcaoValor: number } => {
    
    const baseVencimento = salario[state.cargo][state.padrao] || 0;
    const gaj = baseVencimento * 1.40;  // GAJ = 140% do vencimento
    const funcaoValor = state.funcao === '0' ? 0 : (funcoes[state.funcao] || 0);

    // Adicional de Qualificação
    let aqTituloVal = 0;
    let aqTreinoVal = 0;
    if (state.periodo >= 1) {
        // Novo AQ por Valor de Referência
        aqTituloVal = valorVR * state.aqTituloVR;
        aqTreinoVal = valorVR * state.aqTreinoVR;
    } else {
        // AQ antigo por percentual
        aqTituloVal = baseVencimento * state.aqTituloPerc;
        aqTreinoVal = baseVencimento * state.aqTreinoPerc;
    }

    // Gratificação Específica (GAE/GAS = 35%)
    let gratVal = state.gratEspecificaValor;
    if (state.gratEspecificaTipo === 'gae' || state.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * 0.35;
    } else {
        gratVal = 0;
    }

    // Base sem FC
    const baseSemFC = baseVencimento + gaj + aqTituloVal + aqTreinoVal + 
                      gratVal + state.vpni_lei + state.vpni_decisao + state.ats;
    
    // Total com FC
    const totalComFC = baseSemFC + funcaoValor;

    return { baseSemFC, totalComFC, funcaoValor };
};
```

---

## 2. PSS/INSS PROGRESSIVO (L45-58)

```typescript
export const calcPSS = (base: number, tabelaKey: string, config?: CourtConfig) => {
    let total = 0;
    const HIST_PSS = config?.historico_pss || DEFAULT_PSS;
    const table: TaxTable = HIST_PSS[tabelaKey];
    if (!table) return 0;

    // Cálculo por faixas progressivas
    for (let f of table.faixas) {
        if (base > f.min) {
            let teto = Math.min(base, f.max);
            if (teto > f.min) {
                total += (teto - f.min) * f.rate;
            }
        }
    }
    return total;
};
```

**Faixas PSS 2026 (Portaria MPS/MF 13/26):**
| Faixa | Mínimo | Máximo | Alíquota |
|-------|--------|--------|----------|
| 1 | 0 | 1.518,00 | 7,5% |
| 2 | 1.518,00 | 2.793,88 | 9% |
| 3 | 2.793,88 | 4.190,83 | 12% |
| 4 | 4.190,83 | 8.157,41 | 14% |
| 5 | 8.157,41 | ∞ | 14% |

---

## 3. IRRF MENSAL (L60-65)

```typescript
export const calcIR = (base: number, deductionKey: string, config?: CourtConfig) => {
    const HIST_IR = config?.historico_ir || DEFAULT_IR;
    const deduction = HIST_IR[deductionKey] || 896.00;
    
    // Fórmula: (Base * 27,5%) - Dedução
    let val = (base * 0.275) - deduction;
    return val > 0 ? val : 0;
};
```

---

## 4. IRRF PROGRESSIVO (L68-80)

```typescript
export const calcIR_Progressivo = (baseCalculo: number) => {
    if (baseCalculo <= 2259.20) {
        return 0.00;  // Isento
    } else if (baseCalculo <= 2826.65) {
        return (baseCalculo * 0.075) - 169.44;  // 7,5%
    } else if (baseCalculo <= 3751.05) {
        return (baseCalculo * 0.150) - 381.44;  // 15%
    } else if (baseCalculo <= 4664.68) {
        return (baseCalculo * 0.225) - 662.77;  // 22,5%
    } else {
        return (baseCalculo * 0.275) - 896.00;  // 27,5%
    }
};
```

---

## 5. HORA EXTRA (L147-173)

```typescript
// Base para HE inclui todos os rendimentos + abono se aplicável
let baseHE = baseVencimento + gaj + aqTituloVal + aqTreinoVal + 
             funcaoValor + gratVal + state.vpni_lei + state.vpni_decisao + state.ats;

// Se recebe abono, adiciona à base de HE
if (state.recebeAbono) {
    let baseForPSS = baseHE;
    baseForPSS -= aqTreinoVal;  // AQ Treino não entra na base PSS
    if (!state.pssSobreFC) baseForPSS -= funcaoValor;
    if (!state.incidirPSSGrat) baseForPSS -= gratVal;

    const teto = HIST_PSS[state.tabelaPSS].teto_rgps;
    const usaTeto = state.regimePrev === 'migrado' || state.regimePrev === 'rpc';

    if (usaTeto) {
        baseForPSS = Math.min(baseForPSS, teto);
    }
    const abonoEstimado = calcPSS(baseForPSS, state.tabelaPSS, config);
    baseHE += abonoEstimado;
}

// Valor da hora = Base / 175
const valorHora = baseHE / 175;

// HE 50% = hora * 1.5 * quantidade
const heVal50 = valorHora * 1.5 * state.heQtd50;

// HE 100% = hora * 2.0 * quantidade
const heVal100 = valorHora * 2.0 * state.heQtd100;

// Total HE
const heTotal = heVal50 + heVal100;
```

**Constantes:**
- Divisor base: **175 horas/mês**
- Multiplicador 50%: **1.5**
- Multiplicador 100%: **2.0**

---

## 6. SUBSTITUIÇÃO DE FUNÇÃO (L175-185)

```typescript
let substTotalCalc = 0;

// Base de abatimento = Função atual + Gratificação
const baseAbatimento = funcaoValor + gratVal;

// Para cada função substituída
for (const [funcKey, days] of Object.entries(state.substDias)) {
    if (days > 0 && funcoes[funcKey]) {
        const valDestino = funcoes[funcKey];  // Valor da função destino
        
        // Só paga diferença se destino > origem
        if (valDestino > baseAbatimento) {
            substTotalCalc += ((valDestino - baseAbatimento) / 30) * days;
        }
    }
}
```

**Fórmula:**
```
Substituição = (Função_Destino - Função_Atual - Gratificação) / 30 * Dias
```

---

## 7. FÉRIAS 1/3 (L312-317 + L284-292)

### Cálculo do Valor
```typescript
let ferias1_3 = state.ferias1_3;

if (!state.manualFerias) {
    if (state.tipoCalculo === 'jan' || ferias1_3 > 0) {
        // Férias = 1/3 da remuneração total COM função
        ferias1_3 = totalComFC / 3;
    }
}
ferias1_3 = Math.round(ferias1_3 * 100) / 100;
```

### IR sobre Férias
```typescript
let irFerias = 0;
if (state.ferias1_3 > 0) {
    if (state.feriasAntecipadas) {
        irFerias = 0;  // Não incide IR se antecipadas
    } else {
        const baseIRFerias = state.ferias1_3 - (state.dependentes * DEDUC_DEP);
        irFerias = calcIR(baseIRFerias, state.tabelaIR, config);
    }
}
```

**Fórmula:**
```
Férias 1/3 = (Vencimento + GAJ + AQ + Grat + VPNI + ATS + Função) / 3
```

---

## 8. 13º SALÁRIO / GRATIFICAÇÃO NATALINA (L227-265)

### Cálculo Completo (Novembro)
```typescript
if (state.tipoCalculo === 'nov') {
    // Base do 13º = Todos os rendimentos fixos
    let base13 = baseVencimento + gaj + aqTituloVal + aqTreinoVal + 
                 funcaoValor + gratVal + state.vpni_lei + state.vpni_decisao + state.ats;

    // Abono sobre 13º
    let abono13Estimado = 0;
    let base13PSS_Estimada = base13;
    
    base13PSS_Estimada -= aqTreinoVal;  // Remove AQ Treino
    if (!state.pssSobreFC) base13PSS_Estimada -= funcaoValor;

    if (state.recebeAbono) {
        if (usaTeto) {
            const baseLimitada = Math.min(base13PSS_Estimada, teto);
            abono13Estimado = calcPSS(baseLimitada, state.tabelaPSS, config);
        } else {
            abono13Estimado = calcPSS(base13PSS_Estimada, state.tabelaPSS, config);
        }
    }

    // Gratificação Natalina Total = Base + Abono
    gratNatalinaTotal = base13 + abono13Estimado;

    // PSS sobre 13º
    let baseParaPSS13 = base13;
    if (!state.pssSobreFC) baseParaPSS13 -= funcaoValor;
    baseParaPSS13 -= aqTreinoVal;

    if (usaTeto) {
        const baseLimitada13 = Math.min(baseParaPSS13, teto);
        pss13 = calcPSS(baseLimitada13, state.tabelaPSS, config);
    } else {
        pss13 = calcPSS(baseParaPSS13, state.tabelaPSS, config);
    }

    // IR sobre 13º
    const baseIR13 = gratNatalinaTotal - pss13 - valFunpresp - (state.dependentes * DEDUC_DEP);
    ir13 = calcIR(baseIR13, state.tabelaIR, config);
}
```

### Adiantamento do 13º (L319-331)
```typescript
if (!state.manualAdiant13) {
    if (state.tipoCalculo === 'jan' || state.tipoCalculo === 'jun' || state.tipoCalculo === 'nov') {
        adiant13Venc = baseSemFC / 2;  // Metade sem função
        adiant13FC = funcaoValor / 2;   // Metade da função
    }
}
adiant13Venc = Math.round(adiant13Venc * 100) / 100;
adiant13FC = Math.round(adiant13FC * 100) / 100;
```

---

## 9. LICENÇA COMPENSATÓRIA (L187-199)

```typescript
// Função usada na licença
let valFuncaoLicenca = 0;
if (state.baseLicenca === 'auto') 
    valFuncaoLicenca = funcaoValor;
else if (funcoes[state.baseLicenca]) 
    valFuncaoLicenca = funcoes[state.baseLicenca];

// Base da Licença
const baseLicencaTotal = baseVencimento + gaj + aqTituloVal + aqTreinoVal + 
                         gratVal + state.vpni_lei + state.vpni_decisao + 
                         state.ats + valFuncaoLicenca;

// Abono sobre licença (opcional)
let abonoEstimadoLicenca = 0;
if (state.incluirAbonoLicenca) {
    abonoEstimadoLicenca = calcPSS(baseLicencaTotal, state.tabelaPSS, config);
}

// Valor da Licença = (Base + Abono) / 30 * Dias
const licencaVal = ((baseLicencaTotal + abonoEstimadoLicenca) / 30) * state.licencaDias;
```

---

## 10. DIÁRIAS (L368-409)

### Valores por Cargo
```typescript
let valorDiaria = 0;
if (state.funcao && state.funcao.toLowerCase().startsWith('cj')) {
    valorDiaria = 880.17;  // Com função CJ
} else if (state.cargo === 'analista') {
    valorDiaria = 806.82;  // Analista
} else {
    valorDiaria = 660.13;  // Técnico
}
```

### Adicional de Embarque
```typescript
let adicionalEmbarque = 0;
if (state.diariasEmbarque === 'completo') adicionalEmbarque = 586.78;
else if (state.diariasEmbarque === 'metade') adicionalEmbarque = 293.39;
```

### Cálculo Bruto
```typescript
const diariasBruto = (state.diariasQtd * valorDiaria) + adicionalEmbarque;
```

### Glosa Externa
```typescript
let percentGlosa = 0;
if (state.diariasExtHospedagem) percentGlosa += 0.55;   // 55%
if (state.diariasExtAlimentacao) percentGlosa += 0.25;  // 25%
if (state.diariasExtTransporte) percentGlosa += 0.20;   // 20%
const glosaExterno = (state.diariasQtd * valorDiaria) * percentGlosa;
```

### Deduções
```typescript
let deducaoAlimentacao = 0;
if (state.diariasDescontarAlimentacao && totalDiasViagem > 0) {
    deducaoAlimentacao = (state.auxAlimentacao / 30) * totalDiasViagem;
}

let deducaoTransporte = 0;
if (state.diariasDescontarTransporte && totalDiasViagem > 0) {
    deducaoTransporte = (auxTranspCred / 30) * totalDiasViagem;
}
```

### Líquido
```typescript
const diariasLiquido = Math.max(0, diariasBruto - deducaoAlimentacao - 
                                   deducaoTransporte - glosaExterno);
```

---

## 11. FUNPRESP (L220-223)

```typescript
let valFunpresp = 0;

// Só calcula se usa teto RPPS E tem base excedente
if (usaTeto && baseFunpresp > 0) {
    // Alíquota padrão + Facultativa
    valFunpresp = baseFunpresp * state.funprespAliq + 
                  (baseFunpresp * (state.funprespFacul / 100));
}
```

**Onde:**
- `baseFunpresp = Math.max(0, basePSS - teto_rgps)`

---

## CONSTANTES CRÍTICAS

| Constante | Valor | Uso |
|-----------|-------|-----|
| GAJ | 140% | baseVencimento * 1.40 |
| VR | 6.5% do CJ1 | Cálculo AQ novo modelo |
| GAE/GAS | 35% | baseVencimento * 0.35 |
| Divisor HE | 175 | Horas/mês |
| HE 50% | x1.5 | Multiplicador |
| HE 100% | x2.0 | Multiplicador |
| Diária CJ | 880.17 | Valor diário |
| Diária Analista | 806.82 | Valor diário |
| Diária Técnico | 660.13 | Valor diário |
| Embarque Total | 586.78 | Adicional |
| Embarque Metade | 293.39 | Adicional |
| Glosa Hospedagem | 55% | Desconto externo |
| Glosa Alimentação | 25% | Desconto externo |
| Glosa Transporte | 20% | Desconto externo |
| DEDUC_DEP | 189.59 | Dedução por dependente |

---

## CONFIRMAÇÃO FINAL

> ✅ **TODAS AS FÓRMULAS MATEMÁTICAS ESTÃO PRESERVADAS**

1. **Arquivo `calculations.ts`**: INTACTO com 457 linhas
2. **Código no Hook**: Comentado mas NÃO deletado
3. **Tipos**: Todos os campos existem em `types.ts`
4. **UI**: Componentes de renderização existem

**RISCO DE PERDA: ZERO**

Para reativar na Fase 7, basta:
1. Chamar `calculateAll()` no hook OU
2. Migrar cada função para `AgencyCalculationEngine`

---

*Documento gerado em: 2026-01-19 21:18*
*Responsável pela auditoria: Agent*
