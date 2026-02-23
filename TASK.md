# Task - Salario do Servidor

**Status geral:** Em producao com melhorias incrementais  
**Atualizado em:** 23/02/2026

---

## Feito hoje

- [x] Ajustar heranca de configuracoes para fluxo global/power/org.
- [x] Consolidar orgao principal `jmu` e remover duplicidade `stm` no banco.
- [x] Corrigir selecao dinamica de referencia salarial.
- [x] Corrigir calculo `EA` para Substituicao e Hora Extra.
- [x] Adicionar `EA` em rubricas manuais.
- [x] Adicionar `PSS em competencia anterior` em rubricas manuais.
- [x] Separar `RPPS-EA` no detalhamento.
- [x] Atualizar tabela PSS 2026 em `global_config`.
- [x] Exibir resumo bruto calculado em todos os cards pre-definidos.

---

## Em aberto

- [ ] Confirmar no painel da Vercel o auto-deploy da branch `main`.
- [ ] Rodar validacao com mais holerites reais (minimo 3 cenarios adicionais).
- [ ] Definir se exportacao deve mostrar competencia explicita para rubricas retroativas.
- [ ] Criar testes automatizados de regressao para EA/PSS-EA.

---

## Referencias rapidas para retomar

- Regras do projeto: `CALCULATOR_RULES.md`
- Rule local da calculadora: `.cursor/rules/calculadora-data-driven.mdc`
- Resumo da sessao: `SESSION_SUMMARY.md`
- Status geral: `PROJECT_STATUS.md`

