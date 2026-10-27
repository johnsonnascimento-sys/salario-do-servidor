# Validação da evolução de diárias

Data: 26/10/2026. Branch: `codex/evolucao-diarias`.

## Base preservada

Alterações locais anteriores de folha/previdência foram preservadas no commit `37a85d7`, separado da implementação de diárias. Antes das alterações passaram TypeScript e 51 testes de carregamento, snapshots e previdência. Foi guardado também patch da base no diretório temporário do sistema, sem modificar a branch principal.

## Verificações executadas

| Comando / procedimento | Resultado |
| --- | --- |
| `npm run test:diarias` | 32 cenários temporais, 8 testes de interface/admin e 10 integrações aprovados |
| `npm run test:loading` | 4 testes aprovados |
| `npm run test:payslip` | 19 testes aprovados |
| `npm run test:pension` | 24 testes de cálculo e 4 integrações aprovados |
| `npm run test:pension-form` | 35 testes aprovados; aviso preexistente no SSR sobre URL relativa de version.json, sem falha |
| `npm run test:sorting` | 4 testes aprovados |
| `npm run typecheck` | Aprovado |
| `npm run build` | Aprovado; avisos de Browserslist antigo, bundle grande e import estático/dinâmico de exportações |
| Duas migrations em PostgreSQL 17 descartável | Aprovadas; 24 expectativas negativas e 16 asserts diretos |
| Duas publicações concorrentes | 3 asserts aprovados: exatamente um commit e uma rejeição por sobreposição |
| Revisão visual com fixture isolada | Desktop e largura de celular; campos legíveis, memória expansível e sem overflow horizontal do documento |

Os 90 testes existentes e 50 cenários novos de aplicação foram executados. As verificações SQL são adicionais. Testes fictícios ficam exclusivamente em `tests/` e `supabase/tests/`; nenhum valor fictício foi cadastrado nos rascunhos normativos.

## Aceite funcional com dados sintéticos

- A interface administrativa clona uma versão, altera valor, compara resultados e exige confirmação antes de publicar com predecessor explícito. Outro teste altera percentual, divisor e limite e verifica efeitos somente a partir da vigência nova.
- Motor e banco verificam início/fim inclusivos, lacunas, sobreposições, versões futuras, fonte fora de vigência, ciclos, mistura de moedas, regras nacionais obrigatórias e concorrência.
- Viagens entre meses exigem benefícios por competência; alterações no meio do período disponibilizam os campos correspondentes. No modo quantidade, múltiplas vigências exigem data; teto diário incluindo adicionais exige datas para evitar agregação incorreta.
- Somatórios preservam a precisão de parcelas já fixadas; aplicação de teto não pode arredondar crédito para cima do saldo disponível.
- Integrações usam motor, adaptador JMU, serialização, jsPDF e XLSX reais. Apenas acesso ao serviço externo e download do navegador são substituídos. Arquivos XLSX são reabertos e PDFs têm conteúdo/páginas verificados; holerite e diárias ficam separados, com memória e moeda identificadas.
- Snapshots preservam parâmetros e versões após alterações posteriores. A consulta usa os valores originais; recálculo e novo salvamento são explícitos.

## Reprodução segura do banco

Foi utilizado exclusivamente `127.0.0.1:55436`, com cluster inicializado no TEMP e bancos descartáveis separados. O último aceite independente usou `dailies_acceptance`:

```powershell
# Somente em cluster descartável, com banco recém-criado e vazio.
createdb -h 127.0.0.1 -p 55436 -U postgres dailies_acceptance
psql -h 127.0.0.1 -p 55436 -U postgres -d dailies_acceptance -f supabase/tests/dailies_versioning.sql
node supabase/tests/dailies_concurrency.mjs dailies_acceptance
```

O fixture cria dependências de autenticação e configuração sintéticas: não executar em banco existente. Não utiliza `.env` nem a conexão de produção.

## Limites da entrega

A validação técnica não certifica tabelas jurídicas. Nenhum período oficial é ativado pelos dados iniciais: faltam fechar fontes e vigências indicadas em `DIARIAS_NORMAS.md`. Os fluxos integrados de publicação/salvamento contra a instância real do Supabase não foram exercitados, pois isso escreveria no ambiente do usuário. RLS/RPC foram executados no PostgreSQL local, e a interface foi testada com I/O isolado.

A branch desabilita seu próprio deploy automático da Vercel via `git.deploymentEnabled`; a configuração das demais branches é preservada. Não foi solicitado deploy, merge nem aplicação de migrations em produção.

## Integração com a branch principal

Na conferência remota, a `main` contém `59a1ce3` (competência/veto salarial) e `de8fd08` (TRT-2), posteriores à base local `f114013`. O PR permanece em rascunho: `git merge-tree` identificou conflitos em `CHANGELOG.md`, `GlobalSettings.tsx`, `mapEffectiveConfig.ts`, `services/config/types.ts` e `types.ts`, sem alterar a árvore de trabalho.

O conflito é também semântico: o trabalho local preservado usa `salaryScenario` e classificação `enacted/hypothetical`; a principal usa `promulgated/vetoed/projected`. Uma resolução automática poderia alterar regras salariais fora do escopo de diárias. Não foi feito merge/rebase nem descartado o trabalho local. Antes de integrar o PR à principal, será necessário conciliar essas alterações de folha, preservar o cadastro TRT-2 e repetir suas regressões. A implementação de diárias pode ser revisada separadamente no commit `7e1324a`, acima do snapshot local `37a85d7`.
