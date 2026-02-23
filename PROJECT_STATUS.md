# Status do Projeto - Salario do Servidor

**Ultima atualizacao:** 23/02/2026  
**Versao de trabalho:** 2.1.x  
**Ultimo commit:** `cd0e17c`  
**Branch principal:** `main`

---

## Resumo executivo

- Calculadora em modo dinamico e data-driven (sem calculos fixos em cards antigos).
- Hierarquia de regras ativa: `global_config -> power_config -> org_config`.
- Calculo EA e separacao de PSS retro implementados.
- Tabela previdenciaria global 2026 ajustada para o texto oficial da Portaria MPS/MF no 13/2026.

---

## O que esta pronto

1. Arquitetura de configuracao
- Merge hierarquico com heranca entre niveis.
- Painel administrativo unificado para manutencao de configuracoes.

2. Formulario dinamico
- Base obrigatoria + rubricas pre-definidas + rubricas manuais.
- Inclusao manual de rubricas com controles de incidencia fiscal/previdenciaria.
- Resumo bruto por card pre-definido (inclusive detalhamento por funcao na Substituicao).

3. Calculo e detalhamento
- `IR-EA` separado da trilha mensal.
- `RPPS-EA` separado quando rubrica for marcada como competencia anterior.
- Detalhamento final alinhado com layout e sem duplicacoes.

4. Dados e configuracao global
- Auxilio alimentacao PJU atualizado no banco.
- `pss_tables.2026` atualizado no `global_config` (efeito global).

---

## Riscos e pontos de atencao

1. Deploy automatico
- Push para `main` esta funcionando.
- Disparo automatico depende da integracao Vercel x GitHub no painel da Vercel.

2. Validacao funcional
- Recomendado validar sempre com holerites reais (casos com retroativos, EA e regimes diferentes).

3. Artefatos locais
- Existem arquivos locais nao versionados usados para comparacao de PDF.

---

## Proximas prioridades

1. Governanca de deploy
- Confirmar auto-deploy da `main` na Vercel e historico de builds.

2. Qualidade
- Adicionar testes de regressao para cenarios com EA, PSS-EA e rubricas retroativas.

3. Admin data-first
- Melhorar UX do painel para edicao de tabelas (faixas, vigencias, valores) sem deploy.

