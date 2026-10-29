# Entrega das correções JMU e Justiça Federal — 29/10/2026

As regras canônicas continuam em `PROJECT_RULES.md`. Este documento registra execução, verificação e implantação das correções auditadas; não substitui as regras do produto.

## Estado e contratos

- Código corrigido e migration preparada; nenhuma alteração aplicada em produção nesta tarefa.
- `ICalculationResult.calculationMemory` contém `thirteenth`, `substitutions` e `dailies`, fora do `breakdown` numérico. Os campos agregados anteriores permanecem disponíveis.
- A memória de 13º distingue demonstrações das parcelas de `payroll`, que representa o lançamento efetivo na folha. O adiantamento de um componente acertado na segunda parcela é informativo; os dois demonstrativos não devem ser somados.
- As linhas de substituição preservam a instância e as incidências. Diárias distinguem descontos calculados e efetivamente aplicados; o excesso que ultrapassaria o saldo bruto fica informativo, preservando líquido mínimo zero e a ordem de aplicação existente: teto, glosas, alimentação e transporte.
- `dailies_rules.branch_id` e `assisted_authorities` são dados de configuração. Cada autoridade contém `code`, `label` e `rate_key` ou `percentage`, referentes à base de Ministro do STF configurada. A assistência usa `assistance_percentage` explícito. Rótulos normativos não decidem cálculos.
- `ConfigNotFoundError` distingue ausência de cadastro de `ConfigLoadError`, que indica falha operacional. O único fallback é o cadastro legado de `courts`; ele também exige status explícito para os reajustes.
- Consultar holerite salvo continua usando seus resultados persistidos. A edição/reabertura para cálculo usa o motor corrigido e pode exigir revisão das entradas; nenhuma rotina altera holerites salvos em massa.

## Validação reproduzível

Resultado local desta entrega: **138 testes aprovados**, **46 verificações SQL aprovadas**, TypeScript e build de produção aprovados; revisão independente sem bloqueadores funcionais. O gate público foi executado somente para leitura e reprovou o estado anterior à migration: JMU sem status explícito nas parcelas 0–4 e sem catálogo estrutural, e CJF/TRF1–6 sem cadastro hierárquico. Isso confirma a dependência de preparar os dados antes de publicar; não houve tentativa de corrigir esses registros remotamente.

O build emitiu avisos de tamanho de bundle, importação estática/dinâmica de exportação e base Browserslist antiga. O teste de formulário em Node emitiu aviso de `version.json` relativo. Esses avisos não impediram as verificações; não houve alteração do bundle de entrega versionado.

Com Node e dependências do projeto disponíveis:

```powershell
npm run typecheck
npm run test:compliance
npm run build
```

A suíte de conformidade executa regressões novas e as suítes anteriores em processos separados. A revisão de IR por faixas não faz parte desta entrega.

A verificação SQL usa PostgreSQL em memória via PGlite 0.5.13, instalado fora do projeto. Não usa credenciais nem banco remoto:

```powershell
$validationDirectory = Join-Path $env:TEMP 'jmu-migration-validation'
npm install --prefix $validationDirectory --no-save --ignore-scripts @electric-sql/pglite@0.5.13
$env:PGLITE_MODULE_PATH = Join-Path $validationDirectory 'node_modules/@electric-sql/pglite/dist/index.js'
npm run test:config-migration
```

O teste cria o schema mínimo, aplica as políticas de segurança existentes e a nova migration, confere histórico, catálogos, overrides, idempotência, rollback por colisão de data e rejeições das RPCs. Testa pedidos sucessivos sobre versão obsoleta. PGlite serializa as operações: contenção real entre múltiplos backends deve ser verificada no PostgreSQL de homologação antes da publicação.

## Ordem de aplicação

1. Exportar as configurações atuais de global, poder e órgãos para backup administrativo. Guardar a versão do frontend anterior.
2. Aplicar em homologação somente `supabase/migrations/20261029_calculator_config_compliance.sql`. Não reaplicar as migrations antigas 013–015 como substituto.
3. Conferir CJF e TRF1–TRF6 vinculados a PJU, os dois catálogos de autoridades, os overrides preservados e os dois registros de diárias PJU: anterior encerrado e novo ativo.
4. Revisar administrativamente o `adjustment_schedule`. O cadastro consultado na auditoria não tinha status em todas as parcelas. Cada parcela exige `status` explícito (`promulgated`, `vetoed` ou `projected`), ou flag `vetoed` explícita compatível. Registrar fundamento das parcelas vetadas; não preencher por inferência do ano. A migration de diárias não inventa esses status nem altera valores do cronograma.
5. Executar `npm run check:calculator-config`, que consulta somente dados públicos e deve terminar com código zero. O comando lê o ambiente de produção local; para homologação, fornecer o ambiente correspondente em uma cópia separada de execução. Ele não realiza escrita.
6. Testar concorrência com duas sessões administrativas sobre o mesmo `previous_id`: apenas uma cria a versão; a outra deve receber versão encerrada, sem inserir outro registro. Testar também usuário não administrador.
7. Depois da revisão, repetir backup e aplicação da configuração no ambiente de produção autorizado. Publicar o frontend/motor somente após o cadastro completo e o gate aprovado.
8. Verificar JMU e CJF: 13º só vencimento/FC, modo manual pendente, viagem com feriado marcado, todos os valores de assessoramento da seção 11 e exportação com créditos menos descontos iguais ao líquido.

As RPCs usam início de vigência em data, não instante. Não há duas versões da mesma chave iniciadas no mesmo dia nem agendamento futuro. Se houver colisão com registro legítimo em 29/10/2026, a migration aborta; não apagar esse registro para forçar a aplicação. Preparar uma versão de migration com data posterior, preservando o histórico e revisando novamente a alteração.

## Reversão e limites

Se a validação falhar antes da publicação, não publicar o novo frontend. Após publicação, reverter primeiro o frontend para a versão guardada. Não apagar versões ou holerites; eventual reversão de configuração exige uma nova versão revisada, respeitando as restrições de datas.

Sem revisão normativa externa nesta tarefa. As referências e valores de aceite são os definidos no projeto. Os testes locais não comprovam aplicação das migrations no ambiente publicado, políticas efetivas desse ambiente ou a revisão administrativa dos status ausentes.

## Rastreabilidade da auditoria

Os oito achados foram tratados no código: componentes do 13º, assessoramento JMU, configuração CJF, PSS do 13º no detalhamento, substituições por instância, feriados no resumo, versionamento administrativo e entradas negativas. Também foram tratados status de reajuste explícitos e a divergência textual de assessoramento. O relatório original local de auditoria permanece como registro do estado anterior; a comprovação de entrega está nos testes e no diff desta alteração.

Agentes da implementação: principal Codex (modelo e esforço não informados pelo runtime); Calc Engine Specialist, Supabase and Data Specialist e Rules Guardian (GPT-6.1 Sol/esforço alto configurados); Frontend Calculator Specialist (GPT-6.1 Terra/esforço médio configurados). As configurações dos papéis não constituem telemetria independente de execução.
