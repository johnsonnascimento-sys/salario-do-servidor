# Sessao de Encerramento - 23/02/2026

**Data:** 23/02/2026  
**Objetivo:** fechar migracao da calculadora para modelo dinamico/data-driven e alinhar calculos com holerite real.

---

## Entregas principais

1. Formulario dinamico consolidado
- Rubricas pre-definidas carregadas sob demanda (usuario escolhe o que incluir).
- Rubricas manuais com controles de base IR/PSS e marcacoes de EA.
- Resumo bruto calculado dentro de cada card pre-definido.

2. Hierarquia de configuracao aplicada
- Estrutura mantida: `global_config -> power_config -> org_config`.
- Ajustes de compatibilidade para orgao principal `jmu`.
- Dados de `stm` removidos do banco sem quebrar acesso legado no front.

3. Correcao de calculo EA
- `Exercicio Anterior (EA)` funcionando em Substituicao e Hora Extra.
- Rubrica manual com `EA` agora afeta trilha de IR-EA.
- Novo controle: `PSS em competencia anterior` para separar contribuicao previdenciaria retro.

4. Correcao previdenciaria global (sem hardcode)
- `global_config.pss_tables.2026` ajustado conforme Portaria Interministerial MPS/MF no 13, de 09/01/2026.
- Valores agora herdados por todos os poderes/orgaos via configuracao global.

5. Layout e UX da calculadora
- Alinhamento de cards (Global, Formulario e Detalhamento).
- Remocao de duplicacoes de blocos de resumo/exportacao.
- Padronizacao visual de labels/campos em cards principais.

---

## Commits desta janela

- `57e26e1` feat(admin): add unified control panel and align global settings layout
- `29e5107` feat: finalize jmu-only config, dynamic ref defaults, and calculator layout alignment
- `bc70b79` feat: support EA for manual rubrics and fix EA tax handling
- `d853fc0` fix: align PSS 2026 and support separate prior-period PSS for manual rubrics
- `cd0e17c` feat: show gross breakdown inside each predefined rubric card

---

## Estado atual

- Branch: `main`
- Ultimo commit: `cd0e17c`
- Build local: OK
- Push remoto: OK
- Deploy automatico: depende da integracao Vercel-GitHub no painel da Vercel.

---

## Pendencias para a proxima sessao

1. Confirmar no painel da Vercel se o auto-deploy da branch `main` esta ativo.
2. Validar 2 ou 3 holerites reais adicionais para fechar regressao de calculo.
3. Avaliar se `PSS em competencia anterior` precisa de campo de competencia (MM/AAAA) para exportacao.
4. Limpar artefatos locais nao versionados de comparacao (PDFs temporarios).

