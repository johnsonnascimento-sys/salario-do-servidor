# Proposta de Redesign UX - Calculadora

## 📊 Análise Comparativa

### Site Legado (Pontos Fortes)
✅ **Layout 3 Colunas (Desktop):** Visão holística sem scroll excessivo  
✅ **Agrupamento Lógico:** Campos relacionados juntos  
✅ **Accordions:** Esconde complexidade (Férias, HE, Substituição)  
✅ **Feedback Imediato:** Resultado sempre visível  

### Site Legado (Pontos Fracos)
❌ **Visual Datado:** Cores fortes, bordas pesadas  
❌ **Mobile Ruim:** 3 colunas não funciona em telas pequenas  
❌ **Manutenção:** Hardcoded (você já resolveu isso!)  

### Site Atual (Pontos Fortes)
✅ **Visual Moderno:** Design limpo, sombras suaves  
✅ **Data-Driven:** ConfigService (escalável)  
✅ **Responsivo:** Grid adaptativo  

### Site Atual (Pontos Fracos)
❌ **Cards Fragmentados:** Muito scroll vertical  
❌ **Resultado no Final:** Usuário perde contexto  
❌ **Sem Hierarquia Visual:** Tudo tem mesmo peso  

---

## 💡 Proposta: "Hybrid Dashboard"

### Conceito
Combinar o melhor dos dois mundos:
- **Visual moderno** do site atual
- **Organização eficiente** do site legado
- **Sidebar de resultados** (novo!)

### Layout Desktop (≥1024px)

```
┌─────────────────────────────────────────┬──────────────────┐
│ INPUTS (70%)                            │ SIDEBAR (30%)    │
│                                         │ ┌──────────────┐ │
│ ┌─────────────────────────────────────┐ │ │ LÍQUIDO      │ │
│ │ 📋 Dados Funcionais                 │ │ │ R$ 11.467,99 │ │
│ │ ┌──────────┬──────────┬──────────┐  │ │ └──────────────┘ │
│ │ │ Cargo    │ Classe   │ Função   │  │ │                  │
│ │ └──────────┴──────────┴──────────┘  │ │ Bruto: 16.035    │
│ │ ┌──────────────────────────────────┐ │ │ PSS: -1.919      │
│ │ │ AQ: Doutorado (5.0x VR)          │ │ │ IRRF: -2.647     │
│ │ └──────────────────────────────────┘ │ │                  │
│ └─────────────────────────────────────┘ │ [PDF] [Excel]    │
│                                         │                  │
│ ▼ Rendimentos Adicionais (Accordion)    │ (Sticky/Fixed)   │
│ ▼ Configurações de Tributação           │                  │
│                                         │                  │
└─────────────────────────────────────────┴──────────────────┘
```

### Layout Mobile (<1024px)

```
┌─────────────────────────┐
│ LÍQUIDO: R$ 11.467,99   │ ← Fixed Top
├─────────────────────────┤
│                         │
│ 📋 Dados Funcionais     │
│ ┌─────────────────────┐ │
│ │ Cargo (1 col)       │ │
│ │ Classe (1 col)      │ │
│ │ Função (1 col)      │ │
│ └─────────────────────┘ │
│                         │
│ ▼ Adicionais (Accordion)│
│                         │
│ [Detalhamento ▼]        │
└─────────────────────────┘
```

---

## 🎨 Estrutura de Cards Proposta

### Card 1: Dados Funcionais (Sempre Visível)
**Conteúdo:**
- Cargo, Classe, Função (grid 3 colunas desktop, 1 mobile)
- AQ (Títulos + Treinamento)
- Abono de Permanência (toggle)

**Justificativa:** São os dados que 90% dos usuários preenchem. Devem estar sempre acessíveis.

---

### Card 2: Rendimentos Adicionais (Accordion)
**Seções Expansíveis:**
- 🏖️ **Férias** (1/3 constitucional, abono)
- ⏰ **Horas Extras** (quantidade, percentual)
- 🔄 **Substituição** (dias, função)
- 📅 **Licença Compensatória** (valor)
- 💰 **Gratificações** (GAE/GAS)
- 🎁 **VPNI e Outros** (valores manuais)

**Justificativa:** Nem todo mundo usa. Accordion economiza espaço.

---

### Card 3: Configurações de Tributação (Accordion)
**Conteúdo:**
- Regime de Previdência (Integral/Teto+Funpresp/Migrado)
- Dependentes IR
- Tabelas de Vigência (PSS, IR)
- PSS sobre FC/CJ (checkbox)

**Justificativa:** Configuração avançada. Maioria usa valores padrão.

---

### Sidebar (Desktop) / Top Bar (Mobile): Resumo Dinâmico
**Conteúdo:**
- **Líquido** (destaque, grande)
- Bruto (menor)
- PSS (menor)
- IRRF (menor)
- Botões PDF/Excel

**Comportamento:**
- Desktop: Sticky à direita
- Mobile: Fixed no topo (colapsável com "Ver Detalhes")

---

## 🔧 Implementação Técnica

### Vantagens da Proposta
1. **Menos Scroll:** Accordion esconde complexidade
2. **Feedback Imediato:** Sidebar sempre visível
3. **Manutenível:** Continua data-driven (ConfigService)
4. **Responsivo:** Layout muda inteligentemente

### Componentes Necessários
- `<Accordion>` (já existe em libs como Radix UI)
- `<Sidebar>` (novo componente)
- Refatorar cards existentes em seções lógicas

---

## 🎯 Decisão

**Opção A (Recomendada):** Implementar Hybrid Dashboard completo  
**Opção B (Conservadora):** Apenas adicionar Accordions aos cards atuais  
**Opção C (Mínima):** Manter cards, só melhorar espaçamento/responsividade  

**Minha recomendação:** **Opção A**. O esforço é médio mas o ganho de UX é enorme. O site legado prova que funciona.

---

**Quer que eu implemente a Opção A (Hybrid Dashboard)?**
