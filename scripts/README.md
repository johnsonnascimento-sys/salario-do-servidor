# Scripts do Projeto

Scripts utilitários para automação de tarefas no projeto Salário do Servidor.

---

## 📊 audit-project.cjs

**Comando:** `npm run audit`

### O que faz

Script de auditoria automática que analisa o estado completo do projeto e gera relatórios detalhados.

### Saída

Gera 2 arquivos em `reports/`:
- **audit-report.json** - Dados estruturados (útil para parsing automático)
- **audit-report.md** - Relatório legível em Markdown

### O que analisa

✅ **Arquivos principais:**
- AgencyCalculationEngine.ts (linhas, validação)
- useCalculator.ts (linhas, validação)
- ConfigService.ts (existência, linhas)
- data.ts (linhas, status de depreciação)
- Calculator.tsx (linhas)

✅ **Diretórios e módulos:**
- 9 módulos do motor em `engine/modules/`
- 4 hooks calculator em `hooks/calculator/`
- 7+ componentes UI em `components/ui/`
- 15 componentes Calculator
- 4 arquivos ConfigService

✅ **Métricas de redução:**
- AgencyCalculationEngine: 801 → 141 linhas (-82.4%)
- useCalculator: 398 → 100 linhas (-74.9%)

✅ **Validação de fases:**
- Fase 1.1: Modularizar AgencyCalculationEngine
- Fase 1.2: Modularizar useCalculator
- Fase 1.3: Componentes UI reutilizáveis
- Fase 3.1: ConfigService
- Fase 3.3: Migração data.ts

✅ **Informações Git:**
- Branch atual
- Último commit (hash + mensagem)
- Git status (arquivos modificados/não-versionados)

### Quando usar

✅ **Início de cada sessão** - Obter snapshot instantâneo do projeto
✅ **Após mudanças estruturais** - Validar que tudo está correto
✅ **Para economizar tokens** - Em vez de ler múltiplos arquivos manualmente
✅ **Gerar relatórios de progresso** - Para documentação

### Exemplo de uso

```bash
# Executar auditoria
npm run audit

# Ver relatório
cat reports/audit-report.md

# Ver dados estruturados
cat reports/audit-report.json
```

### Exit codes

- **0** - Todas as validações críticas passaram
- **1** - Alguma validação crítica falhou

Validações críticas:
- AgencyCalculationEngine ≤ 200 linhas
- useCalculator ≤ 200 linhas
- 9 módulos do motor presentes
- 4 hooks calculator presentes

---

## 🎨 audit-design-system.cjs

**Comando:** `npm run audit:design`

### O que faz

Script de auditoria visual que escaneia o código-fonte em busca de violações do Design System, como cores hardcoded, valores arbitrários, dark mode faltando, etc.

### Saída

Gera 2 arquivos em `reports/`:
- **design-audit-report.json** - Dados estruturados das violações
- **design-audit-report.md** - Relatório legível em Markdown com sugestões

### O que detecta

✅ **Cores hardcoded:**
- Uso de cores diretas (e.g., `text-blue-600`) em vez de tokens (`text-secondary`)
- Cores fora do design system (indigo, purple, etc.)

✅ **Valores arbitrários:**
- Classes com valores hardcoded (e.g., `text-[14px]`) em vez de tokens semânticos (`text-body`)

✅ **Border-radius inconsistente:**
- Cards usando `rounded-md` ou `rounded-lg` em vez do padrão `rounded-2xl`

✅ **Dark mode faltando:**
- Backgrounds sem variante `dark:`
- Textos sem variante `dark:`
- Bordas sem variante `dark:`

✅ **Classes não-semânticas:**
- Uso de `text-lg` em vez de `text-h3`, `text-body`, etc.

✅ **Cores deprecated:**
- Uso de `slate-*` em vez de `neutral-*` (novo padrão)

### Health Score

O script calcula um score de saúde (0-100) baseado em:
- Número de violações encontradas
- Severidade de cada tipo de violação
- Proporção de arquivos com problemas

**Interpretação:**
- **90-100:** ✅ Excelente - Design system bem mantido
- **70-89:** ⚠️ Bom - Algumas melhorias recomendadas
- **50-69:** ⚠️ Regular - Múltiplas violações
- **0-49:** ❌ Ruim - Precisa de atenção imediata

### Quando usar

✅ **Antes de commits importantes** - Garantir consistência visual
✅ **Após refatorações de UI** - Validar que segue o design system
✅ **Code reviews** - Verificar padrões de design
✅ **Onboarding de novos devs** - Identificar áreas que precisam ajustes

### Exemplo de uso

```bash
# Executar auditoria visual
npm run audit:design

# Ver relatório com sugestões
cat reports/design-audit-report.md

# Ver dados estruturados
cat reports/design-audit-report.json
```

### Exemplo de saída

```
🎨 Design System Audit

Scanning codebase for design system violations...

Found 45 component files

✅ JSON report saved: reports/design-audit-report.json
✅ Markdown report saved: reports/design-audit-report.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 AUDIT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files Scanned:         45
Files with Violations: 8
Total Violations:      23
Health Score:          85.3/100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Status: GOOD - Some improvements recommended
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

View detailed report: reports/design-audit-report.md
```

### Referências

- [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) - Guia completo do design system
- [tailwind.config.js](../tailwind.config.js) - Configuração de tokens

---

## 🏷️ generate-version.js

**Comando:** `npm run prebuild` (executa automaticamente antes de `npm run build`)

### O que faz

Gera arquivo `public/version.json` com informações da versão atual do projeto baseado em Git.

### Saída

Arquivo `public/version.json`:
```json
{
  "version": "1.0.0",
  "commit": "3fbf7ba",
  "branch": "main",
  "buildDate": "2026-01-24T23:45:00.000Z"
}
```

### Quando executar

✅ **Automaticamente no build** - Hook `prebuild` já configurado
✅ **Manualmente para debug** - `node scripts/generate-version.js`

### Usado por

- **VersionBadge.tsx** - Mostra badge de versão no footer

---

## 📝 Adicionando novos scripts

### Convenções

1. **Extensão:**
   - `.cjs` para CommonJS (require/module.exports)
   - `.mjs` para ES Modules (import/export)
   - `.js` segue o `"type"` do package.json (atualmente "module")

2. **Shebang:**
   ```javascript
   #!/usr/bin/env node
   ```

3. **Documentação:**
   - Cabeçalho com descrição e uso
   - Comentários em seções principais
   - Adicionar ao package.json scripts
   - Documentar neste README

4. **Outputs:**
   - Relatórios em `reports/` (gitignored)
   - Arquivos temporários em `.cache/` ou `.tmp/` (gitignored)
   - Assets gerados em `public/` (comitados se necessário)

### Exemplo de template

```javascript
#!/usr/bin/env node

/**
 * Nome do Script
 *
 * Descrição do que faz
 *
 * Uso:
 *   node scripts/nome-do-script.cjs [args]
 *   npm run script-name
 */

const fs = require('fs');
const path = require('path');

function main() {
  try {
    // Lógica aqui
    console.log('✅ Script executado com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { /* exports */ };
```

---

**Última atualização:** 25/01/2026
